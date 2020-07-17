// TODO: This will be importded from _global.scss
const colors = {
  black: "#212529",
  lightgray: "#f8f9fa",
  white: "#fff",
};

class MainChart {
  constructor(selector) {
    this.svg = {
      selector,
      width: 1080,
      height: 650,
      margin: {
        top: 40,
        right: 60,
        bottom: 60,
        left: 60,
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
      yOffset: 35,
    };

    this.brush = {
      initialDates: [new Date(2020, 0, 1), new Date(1980, 0, 1)],
    };

    this.state = {
      year: this.brush.initialDates[1],
      minVoteShare: null,
      country: null,
      parties: null,
    };

    this.templates = {
      year: {
        template: "year.mustache",
        target: "#year",
        view: { year: this.state.year.getFullYear() },
      },
      parties: {
        template: "parties.mustache",
        target: "#party-list",
        view: { parties: null },
      },
    };

    this.time = {
      formatYear: d3.timeFormat("%Y"),
      formatDecade: d3.timeFormat("%Ys"),
    };
  }

  async init({ minVoteShare = 0.05, country = "Europe" } = {}) {
    const filename = d3.select(this.svg.selector).attr("data-src");
    return d3.csv(filename, MainChart.loadDatum).then((data) => {
      this.prepareData(data);
      this.updateState({ minVoteShare, country, action: false });
      this.draw();
      this.renderTemplates();
    });
  }

  prepareData(data) {
    const raw = data.map((d) => {
      d.isAlive = d.currentShare > 0;
      return d;
    });

    const dates = raw.map((d) => d.electionYear).sort(d3.ascending);
    const dateRange = d3.range(dates[0], dates[dates.length - 1] + 1);
    let counts = d3
      .nest()
      .key((d) => d.country)
      .key((d) => d.electionYear)
      .sortKeys(d3.ascending)
      .rollup((v) => v.length)
      .entries(data)
      .map(({ key: country, values: vals }) => {
        const mapped = d3.map(vals, (d) => d.key);
        const values = dateRange.map((date) =>
          mapped.has(date) ? mapped.get(date).value : 0
        );
        return { country, values };
      });
    counts = d3.map(counts, (d) => d.country);

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
    countries.unshift("Europe");

    const mappings = MainChart.createMappings(data);

    this.data = { raw, counts, families, countries, mappings };
  }

  draw() {
    this.setUpSVG();
    this.createDefs();

    this.setUpScales();
    this.drawAxes();

    this.computeBeeswarmPositions();
    this.setUpBeeswarms();
    this.drawBees();

    this.addBrush();
  }

  setUpSVG() {
    const { selector, width, height, margin } = this.svg;

    this.svg.g = d3
      .select(selector)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left / 2},${margin.top})`);

    this.svg.bg = this.svg.g.append("g").attr("class", "background");
  }

  createDefs() {
    const defs = this.svg.g.append("defs");

    const radialGradient = defs
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

    const y = d3
      .scaleTime()
      .domain([new Date(1945, 0, 1), new Date(2025, 0, 1)])
      .range([height - margin.bottom, margin.top]);

    const r = d3
      .scaleSqrt()
      .domain(d3.extent(this.data.raw, (d) => d.share))
      .range(this.parties.radiusRange);

    this.scales = { x, y, r };
  }

  drawAxes() {
    const { width, margin } = this.svg;
    const { x, y } = this.scales;
    const { yOffset } = this.labels;

    // TODO: Random colors for now
    const color = d3
      .scaleOrdinal()
      .domain(this.data.families)
      .range(d3.schemeTableau10);
    this.parties.color = color;

    this.svg.bg
      .append("g")
      .attr("class", "axis x-axis x-axis-bg")
      .selectAll(".family-label-bg")
      .data(
        this.data.families.map((familyId) => ({
          familyId,
          l: this.data.mappings.family.get(familyId).familyName.length,
        }))
      )
      .join("rect")
      .attr("x", ({ familyId, l }) => x(familyId) - 4.5 * l)
      .attr("y", (_, i) => margin.top - 18 - (i % 2 === 0 ? 0 : yOffset))
      .attr("width", ({ l }) => 9 * l)
      .attr("height", 25)
      .attr("rx", 15)
      .attr("ry", 15)
      .attr("stroke", ({ familyId }) => color(familyId))
      .attr("stroke-width", 2)
      .attr("fill", "whitesmoke");

    this.svg.bg
      .append("g")
      .attr("class", "axis x-axis x-axis-labels")
      .selectAll(".family-label")
      .data(this.data.families)
      .join("text")
      .attr("class", "family-label")
      .attr("x", (familyId) => x(familyId))
      .attr("y", (_, i) => margin.top - (i % 2 === 0 ? 0 : yOffset))
      .attr("text-anchor", "middle")
      .text((familyId) => this.data.mappings.family.get(familyId).familyName);

    const yTicks = y.ticks();
    const yTickLabelDiff = y(yTicks[0]) - y(yTicks[1]);

    this.svg.bg
      .append("g")
      .attr("class", "grid y-grid y-grid-area")
      .selectAll(".y-grid-area-rect")
      .data(yTicks.filter((_, i) => i % 2 === 1))
      .join("rect")
      .attr("class", "y-grid-area-rect")
      .attr("x", 0)
      .attr("y", (d) => y(d))
      .attr("width", width - margin.right)
      .attr("height", yTickLabelDiff)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", colors.lightgray);

    this.svg.bg
      .append("g")
      .attr("class", "axis y-axis y-axis-labels")
      .selectAll(".year-label")
      .data(yTicks.slice(0, -1))
      .join("text")
      .attr("class", "year-label")
      .attr("x", margin.left - 10)
      .attr("y", (d) => y(d) - yTickLabelDiff / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text((d) => this.time.formatDecade(d));
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

  setUpBeeswarms() {
    const { x, y } = this.scales;
    const { height, margin } = this.svg;
    const { color } = this.parties;

    const beeswarmPair = this.svg.g
      .selectAll(".beeswarm-pair")
      .data(this.data.beeswarms)
      .join("g")
      .attr("class", "beeswarm-pair")
      .attr("fill", (d) => color(d.familyId))
      .attr("stroke", (d) => color(d.familyId));

    beeswarmPair
      .selectAll(".g-beeswarm-sep")
      .data(this.data.families)
      .join("g")
      .attr("class", "g-beeswarm-sep")
      .selectAll(".beeswarm-sep")
      .data((family, i) => [
        {
          family,
          even: i % 2 === 0,
          type: "transparent",
          y2: height - margin.bottom,
          opacity: 0.05,
        },
        {
          family,
          even: i % 2 === 0,
          type: "responsive",
          y2: y(this.brush.initialDates[1]),
          opacity: 1,
        },
      ])
      .join("line")
      .attr("class", (d) => `beeswarm-sep beeswarm-sep-${d.type}`)
      .attr("x1", (d) => x(d.family))
      .attr("x2", (d) => x(d.family))
      .attr("y1", (d) => margin.top + 7 - (d.even ? 0 : this.labels.yOffset))
      .attr("y2", (d) => d.y2)
      .attr("stroke-width", 2)
      .attr("stroke", (d) => color(d.family))
      .attr("stroke-opacity", (d) => d.opacity);

    this.svg.bg
      .selectAll(".beeswarm-pair")
      .data(this.data.beeswarms)
      .join("g")
      .attr("class", "beeswarm-pair");
  }

  drawBees() {
    const { y, r } = this.scales;
    const { selector, transparent, alive, dead } = this.parties;

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
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", ({ data: d }) => r(d.share) * 4)
            .attr("stroke-width", 0)
            .attr("fill", "url(#radial-gradient)")
            .attr("opacity", ({ data: d }) =>
              d.country === this.state.country &&
              d.electionDate >= this.state.year
                ? 1
                : 0
            ),
        (update) =>
          update.attr("opacity", ({ data: d }) =>
            d.country === this.state.country &&
            d.electionDate >= this.state.year
              ? 1
              : 0
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
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr("r", ({ data: d }) => r(d.share))
            .attr("stroke-width", 1)
            .attr("fill", ({ data: d }) =>
              d.isAlive ? this.parties.color(d.familyId) : "transparent"
            )
            .attr("opacity", (d) =>
              y(this.state.year) >= d.y ? 1 : transparent
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
    const { initialDates } = this.brush;

    const handleWidth = 60;
    const handleHeight = 30;
    const brushHandle = (g, selection) => {
      g.selectAll(".handle--custom")
        .data([{ type: "s" }])
        .join((enter) =>
          enter
            .append("rect")
            .attr("class", "handle handle--custom")
            .attr("fill", "white")
            .attr("stroke", colors.black)
            .attr("stroke-width", 1)
            .attr("cursor", "ns-resize")
        )
        .attr("display", selection === null ? "none" : null)
        .attr("width", handleWidth)
        .attr("height", handleHeight)
        .attr("x", 0)
        .attr(
          "y",
          selection === null ? null : selection[1] - handleHeight / 2 - 2
        ) // TODO: Magic value
        .attr("rx", 4)
        .attr("ry", 4);

      g.selectAll(".handle--custom-label")
        .data([{ type: "s" }])
        .join(
          (enter) =>
            enter
              .append("text")
              .attr("class", "handle--custom-label")
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .attr("stroke", colors.black)
              .attr("cursor", "ns-resize")
              .text(this.time.formatYear(this.state.year)),
          (update) => update.text(this.time.formatYear(this.state.year))
        )
        .attr("x", handleWidth / 2)
        .attr("y", selection === null ? null : selection[1]);
    };

    function brushed(opacity) {
      const selection = d3.event.selection;
      if (!selection) return;
      const y1 = selection[1];
      d3.selectAll(".party").attr("opacity", (_, i, n) =>
        y1 >= +d3.select(n[i]).attr("cy") ? 1 : opacity
      );
      d3.selectAll(".beeswarm-sep-responsive").attr("y2", y1);
      d3.select(".brush").call(brushHandle, selection);
    }

    function brushened(year, initialDates) {
      if (!d3.event.sourceEvent) return;
      d3.select(".brush")
        .transition()
        .call(brush.move, [initialDates[0], year].map(y));
    }

    function getYear(y, initialDates) {
      const sel = d3.event.selection;
      return sel ? d3.timeYear.round(y.invert(sel[1])) : initialDates[1];
    }

    function adjustHandleHeight(svg) {
      svg
        .select(".brush .handle--s")
        .attr("height", 1)
        .attr("transform", "translate(0, 3)"); // TODO: Magic value
    }

    const brush = d3
      .brushY()
      .extent([
        [margin.left + 3, margin.top], // TODO: Magiv value
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

  updateState({ year, minVoteShare, country, action = true } = {}) {
    if (year != null && year !== this.state.year) {
      this.state.year = year;
      this.templates.year.view = { year: year.getFullYear() };

      if (action) renderTemplate(this.templates.year);
    }

    if (minVoteShare != null && minVoteShare !== this.state.minVoteShare) {
      this.state.minVoteShare = minVoteShare;
    }

    if (country != null && country !== this.state.country) {
      this.state.country = country;
    }

    this.state.parties = this.data.raw.filter(
      (d) =>
        d.electionDate >= this.state.year &&
        d.share >= this.state.minVoteShare * 100 &&
        (this.state.country === "Europe"
          ? true
          : d.country === this.state.country)
    );
    this.state.parties = d3
      .nest()
      .key((d) => d.electionYear - (d.electionYear % 10))
      .sortKeys(d3.descending)
      .sortValues(
        (a, b) =>
          d3.ascending(
            this.data.families.indexOf(a.familyId),
            this.data.families.indexOf(b.familyId)
          ) || d3.descending(a.currentShare, b.currentShare)
      )
      .entries(this.state.parties)
      .map(({ key, values }) => ({ decade: key, values }));
    this.templates.parties.view = {
      parties: this.state.parties,
    };

    if (action) {
      renderTemplate(this.templates.parties).then(() =>
        this.injectShareCharts()
      );
      this.drawBees();
    }
  }

  injectShareCharts() {
    const pies = d3
      .map()
      .set("left", d3.pie().startAngle(-Math.PI).endAngle(0))
      .set("right", d3.pie().startAngle(Math.PI).endAngle(0));

    const r = d3
      .scaleSqrt()
      .domain(d3.extent(this.data.raw, (d) => d.share))
      .range([4, 10]);

    this.state.parties
      .map((d) => d.values)
      .flat()
      .forEach((d) => {
        const svgContainer = d3.select(
          `#party-list-item-${d.partyId} .party-share-chart`
        );

        const svg = svgContainer
          .append("svg")
          .attr("width", 20)
          .attr("height", 20)
          .attr("viewBox", [0, 0, 20, 20]);

        const radius = d3
          .map()
          .set("left", r(d.share))
          .set("right", r(d.currentShare));

        (d.isAlive ? ["left", "right"] : ["left"]).forEach((pos) => {
          svg
            .selectAll(`.semi-circle-${pos}`)
            .data(pies.get(pos)([1]))
            .join("path")
            .attr("class", `semi-circle-${pos}`)
            .attr("transform", `translate(${pos === "left" ? 9 : 10}, 8)`)
            .attr("d", d3.arc().outerRadius(radius.get(pos)).innerRadius(0))
            .attr(
              "fill",
              d.isAlive ? this.parties.color(d.familyId) : "transparent"
            )
            .attr("stroke", d.isAlive ? null : this.parties.color(d.familyId));
        });
      });
  }

  renderTemplates() {
    renderTemplate(this.templates.year);
    renderTemplate(this.templates.parties).then(() => this.injectShareCharts());
  }

  static loadDatum(d) {
    let { family_name_short: familyId, family_name: family } = d;
    if (["", "none", "code"].includes(familyId)) {
      familyId = "";
      family = "Other";
    }

    const date = d3.timeParse("%Y-%m-%d")(d.election_date);

    return {
      countryId: +d.country_id,
      country: d.country_name,

      partyId: +d.party_id,
      party: d.party_name_english,
      partyOrig: d.party_name_ascii,
      partyAbbr: d.party_name_short,

      electionId: +d.election_id,
      electionDate: date,
      electionYear: date.getFullYear(),

      familyId: familyId,
      family: family,

      share: +d.vote_share,
      currentShare: +d.most_recent_vote_share,

      posLeftRight: d.left_right,
      posStateMarket: d.state_market,
      posLibertyAuthority: d.liberty_authority,
      posEUAntiPro: d.eu_anti_pro,
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
    const { x, y, r } = scales;

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

    return circles.map((d) => {
      d.x =
        x(d.data.familyId) + (d.data.isAlive ? -padding - d.x : padding + d.x);
      return d;
    });
  }
}
