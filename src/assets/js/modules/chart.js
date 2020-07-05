class MainChart {
  constructor(selector) {
    this.svg = {
      selector,
      width: 920,
      height: 650,
      margin: {
        top: 40,
        right: 20,
        bottom: 40,
        left: 20,
      },
    };

    this.parties = {
      selector: ".party",
      radiusRange: [1, 8],
      padding: 1.5,
      transparent: 0.25,
      alive: {
        selector: ".party-alive",
      },
      dead: {
        selector: ".party-dead",
      },
    };

    this.labels = {
      xOffset: 5,
      yOffset: 5,
      yOffsetPlus: 20,
    };

    this.brush = {
      initialDates: [new Date(1980, 0, 1), new Date(2020, 0, 1)],
      maxDate: new Date(2017, 0, 1),
    };

    this.state = {
      year: this.brush.initialDates[0],
      minVoteShare: null,
      country: null,
    };

    this.templates = {
      year: {
        template: "year.mustache",
        target: "#year",
        view: { year: this.state.year.getFullYear() },
      },
    };

    this.time = {
      formatYear: d3.timeFormat("%Y"),
      formatDecade: d3.timeFormat("%Ys"),
    };
  }

  async init({ minVoteShare = 0.05, country = "" } = {}) {
    // TODO: should the state be manipulated from here?
    this.state.minVoteShare = minVoteShare;
    this.state.country = country;

    const filename = d3.select(this.svg.selector).attr("data-src");
    return d3.csv(filename, MainChart.loadDatum).then((data) => {
      this.prepareData(data);
      this.draw();
      this.renderTemplates();
    });
  }

  prepareData(data) {
    const raw = data.map((d) => {
      d.isAlive = d.currentShare > 0;
      return d;
    });

    const families = [
      "right",
      "lib",
      "con",
      "chr",
      "agr",
      "eco",
      "soc",
      "com",
      "spec",
      "",
    ];

    const countries = d3
      .map(data, (d) => d.country)
      .keys()
      .sort(d3.ascending);
    countries.push("");

    const mappings = MainChart.createMappings(data);

    this.data = { raw, families, countries, mappings };
  }

  draw() {
    this.setUpSVG();
    this.createDefs();

    this.setUpScales();
    this.drawAxes();

    this.computeBeeswarmPositions();
    this.drawBeeswarms();

    this.addBrush();
  }

  setUpSVG() {
    const { selector, width, height, margin } = this.svg;

    this.svg.g = d3
      .select(selector)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    this.svg.bg = this.svg.g.append("g").attr("class", "background");
  }

  createDefs() {
    const radialGradient = this.svg.g
      .append("defs")
      .append("radialGradient")
      .attr("id", "radial-gradient");

    radialGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "lightgray");

    radialGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#fff");
  }

  setUpScales() {
    const { width, height, margin } = this.svg;

    const x = d3
      .scaleBand()
      .domain(this.data.families)
      .range([margin.left, width - margin.right])
      .paddingInner(1)
      .paddingOuter(0.5);

    const dates = this.data.raw.map((d) => d.electionDate).sort(d3.ascending);
    const y = d3
      .scaleTime()
      .domain([dates[0], dates[dates.length - 1]])
      .nice()
      .range([margin.top, height - margin.bottom]);

    const r = d3
      .scaleSqrt()
      .domain(d3.extent(this.data.raw, (d) => d.share))
      .range(this.parties.radiusRange);

    this.scales = { x, y, r };
  }

  drawAxes() {
    const { width, margin } = this.svg;
    const { x, y } = this.scales;
    const { xOffset, yOffset, yOffsetPlus } = this.labels;

    this.svg.g
      .append("g")
      .attr("class", "axis x-axis")
      .selectAll(".family-label")
      .data(this.data.families)
      .join("text")
      .attr("class", "family-label")
      .attr("x", (familyId) => x(familyId))
      .attr("y", (_, i) =>
        i % 2 == 0 ? margin.top - yOffset : margin.top - yOffset - yOffsetPlus
      )
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "hanging")
      .text((familyId) => this.data.mappings.family.get(familyId).familyName);

    this.svg.g
      .append("g")
      .attr("class", "grid grid-y")
      .selectAll(".grid-line")
      .data(y.ticks().slice(1, -1))
      .join("line")
      .attr("class", "grid-line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke-width", 2)
      .attr("stroke", "whitesmoke");

    this.svg.g
      .append("g")
      .attr("class", "axis axis-y")
      .attr("transform", `translate(${margin.left})`)
      .call(d3.axisLeft(y).tickValues(y.ticks().slice(1, -1)));
  }

  computeBeeswarmPositions() {
    const dodge = (data) =>
      MainChart.dodge(
        data,
        this.parties.padding,
        { pos: "electionDate", size: "share" },
        this.scales
      );

    this.data.beeswarms = d3
      .nest()
      .key((d) => d.familyId)
      .entries(this.data.raw)
      .map(({ key: familyId, values: parties }) => ({
        familyId,
        family: parties[0].family,
        parties: dodge(parties.filter((e) => e.isAlive))
          .concat(dodge(parties.filter((e) => !e.isAlive)))
          .sort((a, b) => d3.descending(a.data.share, b.data.share)),
      }));
  }

  drawBeeswarms() {
    const { x } = this.scales;
    const { height, margin } = this.svg;

    // TODO: Random colors for now
    const color = d3
      .scaleOrdinal()
      .domain(this.data.families)
      .range(d3.schemeTableau10);
    this.parties.color = color;

    const beeswarmPair = this.svg.g
      .selectAll(".beeswarm-pair")
      .data(this.data.beeswarms)
      .join("g")
      .attr("class", "beeswarm-pair")
      .attr("fill", (d) => color(d.familyId))
      .attr("stroke", (d) => color(d.familyId));

    beeswarmPair
      .selectAll(".beeswarm-separator")
      .data(this.data.families)
      .join("line")
      .attr("class", "beeswarm-separator")
      .attr("x1", (family) => x(family))
      .attr("x2", (family) => x(family))
      .attr("y1", (_, i) =>
        i % 2 == 0 ? margin.top : margin.top - this.labels.yOffsetPlus
      )
      .attr("y2", height - margin.bottom)
      .attr("stroke-width", 0.2)
      .attr("stroke", (family) => color(family));

    this.svg.bg
      .selectAll(".beeswarm-pair")
      .data(this.data.beeswarms)
      .join("g")
      .attr("class", "beeswarm-pair");

    this.drawBees();
  }

  drawBees() {
    const { x, y, r } = this.scales;
    const { selector, padding, transparent, alive, dead } = this.parties;

    this.svg.bg
      .selectAll(".beeswarm-pair")
      .selectAll(`${selector}-highlight`)
      .data(({ parties }) =>
        parties.filter(
          ({ data: d }) => d.share >= this.state.minVoteShare * 100
        )
      )
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", `${selector.slice(1)}-highlight`)
            .attr(
              "cx",
              (d) =>
                x(d.data.familyId) +
                (d.data.isAlive ? -padding - d.x : padding + d.x)
            )
            .attr("cy", (d) => d.y)
            .attr("r", ({ data: d }) => r(d.share) * 4)
            .attr("stroke-width", 0)
            .attr("fill", "url(#radial-gradient)")
            .attr("opacity", ({ data: d }) =>
              d.country === this.state.country ? 1 : 0
            ),
        (update) =>
          update.attr("opacity", ({ data: d }) =>
            d.country === this.state.country ? 1 : 0
          ),
        (exit) => exit.remove()
      );

    this.svg.g
      .selectAll(".beeswarm-pair")
      .selectAll(selector)
      .data(({ parties }) =>
        parties.filter(
          ({ data: d }) => d.share >= this.state.minVoteShare * 100
        )
      )
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr(
              "class",
              ({ data: d }) =>
                `${selector.slice(1)} ${(d.isAlive
                  ? alive
                  : dead
                ).selector.slice(1)}`
            )
            .attr(
              "cx",
              (d) =>
                x(d.data.familyId) +
                (d.data.isAlive ? -padding - d.x : padding + d.x)
            )
            .attr("cy", (d) => d.y)
            .attr("r", ({ data: d }) => r(d.share))
            .attr("stroke-width", 1)
            .attr("fill", ({ data: d }) =>
              d.isAlive ? this.parties.color(d.familyId) : "transparent"
            )
            .attr("opacity", (d) =>
              y(this.state.year) <= d.y ? 1 : transparent
            )
            .call((enter) =>
              enter
                .append("title")
                .text(
                  ({ data: d }) =>
                    `${d.party} winning ${
                      d.share
                    }% of votes in ${this.time.formatYear(d.electionDate)} (${
                      d.country
                    }) - now, ${d.currentShare}%`
                )
            ),
        (update) => update,
        (exit) => exit.remove()
      );
  }

  addBrush() {
    const { width, height, margin } = this.svg;
    const { y } = this.scales;
    const { initialDates, maxDate } = this.brush;

    function brushed(opacity) {
      const selection = d3.event.selection;
      if (!selection) return;
      const y0 = selection[0];
      d3.selectAll(".party").attr("opacity", (_, i, n) =>
        y0 <= +d3.select(n[i]).attr("cy") ? 1 : opacity
      );
    }

    function brushened(year, initialDates) {
      if (!d3.event.sourceEvent) return;
      d3.select(".brush")
        .transition()
        .call(brush.move, [year, initialDates[1]].map(y));
    }

    function getYear(y, initialDates) {
      const sel = d3.event.selection;
      return sel ? d3.timeYear.round(y.invert(sel[0])) : initialDates[1];
    }

    function adjustHandleHeight(svg) {
      svg
        .select(".brush .handle--n")
        .attr("height", 1)
        .attr("transform", "translate(0, 3)"); // TODO: Magic value
    }

    const brush = d3
      .brushY()
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ])
      .on("start", () => {
        brushed(this.parties.transparent);
        adjustHandleHeight(this.svg.g);
      })
      .on("brush", () => {
        const year = getYear(y, initialDates);
        if (year) this.updateState({ year });
        brushed(this.parties.transparent);
        adjustHandleHeight(this.svg.g);
      })
      .on("end", () => {
        let year = getYear(y, initialDates);
        if (year) {
          year = d3.min([year, maxDate]);
          this.updateState({ year });
          brushened(year, initialDates);
        }
      });

    this.svg.g
      .append("g")
      .attr("class", "brush")
      .call(brush)
      .call(brush.move, initialDates.map(y));

    this.svg.g.select(".overlay").remove();
    adjustHandleHeight(this.svg.g);
  }

  updateState({ year, minVoteShare, country } = {}) {
    if (year != null && year !== this.state.year) {
      this.state.year = year;
      this.templates.year.view = { year: year.getFullYear() };
      renderTemplate(this.templates.year);
    }

    if (minVoteShare != null && minVoteShare !== this.state.minVoteShare) {
      this.state.minVoteShare = minVoteShare;
      this.drawBees();
    }

    if (country != null && country !== this.state.country) {
      this.state.country = country;
      this.drawBees();
    }
  }

  renderTemplates() {
    renderTemplate(this.templates.year);
  }

  static loadDatum(d) {
    let { family_name_short: familyId, family_name: family } = d;
    if (["", "none", "code"].includes(familyId)) {
      familyId = "";
      family = "Other";
    }

    return {
      countryId: +d.country_id,
      country: d.country_name,

      partyId: +d.party_id,
      party: d.party_name_english,

      electionId: +d.election_id,
      electionDate: d3.timeParse("%Y-%m-%d")(d.election_date),

      familyId: familyId,
      family: family,

      share: +d.vote_share,
      currentShare: +d.most_recent_vote_share,
    };
  }

  static createMappings(data) {
    return {
      family: d3.map(
        data.map(({ familyId, family: familyName }) => ({
          familyId,
          familyName,
        })),
        (d) => d.familyId
      ),
    };
  }

  // Adapted from https://observablehq.com/@d3/beeswarm and https://observablehq.com/@tomwhite/beeswarm-bubbles
  static dodge(data, padding, properties, scales) {
    const { pos, size } = properties;
    const { y, r } = scales;

    const circles = data
      .map((d) => ({ y: y(d[pos]), r: r(d[size]), data: d }))
      .sort((a, b) => b.r - a.r);
    const epsilon = 1e-3;
    let head = null,
      tail = null;

    // Returns true if circle ⟨x,y⟩ intersects with any circle in the queue.
    function intersects(x, y, r) {
      let a = head;
      while (a) {
        const radius2 = (a.r + r + padding) ** 2;
        if (radius2 - epsilon > (a.x - x) ** 2 + (a.y - y) ** 2) {
          return true;
        }
        a = a.next;
      }
      return false;
    }

    // Place each circle sequentially.
    for (const b of circles) {
      // Remove circles from the queue that can’t intersect the new circle b.
      // while (head && head.y < b.y - radius2) head = head.next;

      // Choose the minimum non-intersecting tangent.
      if (intersects((b.x = b.r), b.y, b.r)) {
        let a = head;
        b.x = Infinity;
        do {
          let x =
            a.x + Math.sqrt((a.r + b.r + padding) ** 2 - (a.y - b.y) ** 2);
          if (x < b.x && !intersects(x, b.y, b.r)) b.x = x;
          a = a.next;
        } while (a);
      }

      // Add b to the queue.
      b.next = null;
      if (head === null) head = tail = b;
      else tail = tail.next = b;
    }

    return circles;
  }
}
