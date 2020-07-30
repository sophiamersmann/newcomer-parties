// TODO: This will be importded from _global.scss
const colors = {
  black: "#212529",
  lightgray: "#f8f9fa",
  white: "#fff",
};

class MainChart {
  constructor(selector, width, height) {
    this.svg = {
      selector,
      width: width,
      height: height,
      margin: {
        top: 40,
        right: 60,
        bottom: 60,
        left: 60,
      },
    };

    this.parties = {
      selector: ".party",
      radius: { active: 3.5, inactive: 0.5, selected: 5, highlight: 30 },
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
      countryGroup: null,
      parties: null,
      minVoteShare: null,
      country: null,
      panelParties: null,
    };

    this.partyProfile = {
      keys: ["leftRight", "libertyAuthority", "stateMarket", "euProAnti"],
    };

    this.templates = {
      year: {
        template: "year.mustache",
        target: "#year",
        view: { year: this.state.year.getFullYear() },
      },
      panelParties: {
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

  async init({ countryGroup = "all", minVoteShare = 0, country = null } = {}) {
    const filename = d3.select(this.svg.selector).attr("data-src");
    return d3.csv(filename, MainChart.loadDatum).then((data) => {
      this.prepareData(data);
      this.updateState({ countryGroup, minVoteShare, country, action: false });
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

    // TODO: Random colors for now
    this.parties.color = d3
      .scaleOrdinal()
      .domain(families)
      .range(d3.schemeTableau10);

    const countries = d3
      .map(data, (d) => d.country)
      .keys()
      .sort(d3.ascending);

    const mappings = MainChart.createMappings(data);

    this.data = { raw, counts, families, countries, mappings };
  }

  draw() {
    this.setUpSVG();
    this.createDefs();

    this.setUpScales();
    this.drawAxes();

    this.setUpBeeswarms();
    this.computeBeeswarms();
    this.drawBees();
    this.initBeeHighlight();

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
    const radialGradient = this.svg.g
      .append("defs")
      .selectAll(".radial-gradient")
      .data(this.data.families)
      .join("radialGradient")
      .attr("id", (familyId) => `radial-gradient-${familyId}`)
      .attr("class", ".radial-gradient");

    radialGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", (familyId) => this.parties.color(familyId));

    radialGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#fff")
      .attr("stop-opacity", 0);
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

    this.scales = { x, y };
  }

  drawAxes() {
    const { width, margin } = this.svg;
    const { x, y } = this.scales;
    const { yOffset } = this.labels;

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
      .attr("stroke", ({ familyId }) => this.parties.color(familyId))
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

  setUpBeeswarms() {
    const { x, y } = this.scales;
    const { height, margin } = this.svg;
    const { color } = this.parties;

    this.svg.bg
      .selectAll(".bg-beeswarm-pair")
      .data(this.data.families)
      .join("g")
      .attr("class", "bg-beeswarm-pair");

    this.svg.g
      .selectAll(".beeswarm-pair")
      .data(this.data.families)
      .join("g")
      .attr("class", "beeswarm-pair")
      .attr("fill", (d) => color(d.familyId))
      .append("g")
      .attr("class", "g-beeswarm-sep")
      .selectAll(".beeswarm-sep")
      .data((family, i) => [
        {
          family,
          even: i % 2 === 0,
          type: "transparent",
          y2: height - margin.bottom,
          opacity: this.parties.transparent,
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
  }

  computeBeeswarms() {
    const dodge = (data) =>
      MainChart.dodge(
        data,
        this.parties.padding,
        this.parties.radius.active,
        { pos: "electionDate", size: "share" },
        this.scales
      );

    this.state.beeswarms = d3
      .nest()
      .key((d) => d.familyId)
      .entries(this.state.parties)
      .map(({ key: familyId, values: parties }) => ({
        familyId,
        family: parties[0].family,
        parties: dodge(parties.filter((e) => e.isAlive))
          .concat(dodge(parties.filter((e) => !e.isAlive)))
          .sort((a, b) => d3.descending(a.data.share, b.data.share)),
      }));
  }

  drawBees() {
    const { y } = this.scales;
    const { selector, radius, color, transparent, alive, dead } = this.parties;

    const isActive = (d) =>
      this.state.country !== null
        ? this.state.country === d.country
        : this.state.countryGroup === "all" ||
          this.state.countryGroup === d.countryGroup;

    const isVisible = function (elem, container) {
      const elemTop = elem.offsetTop;
      const elemBottom = elemTop + elem.clientHeight;

      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;

      return elemTop >= containerTop && elemBottom <= containerBottom;
    };

    const onMouseover = (d, i, n) => {
      if (!isActive(d.data) || this.scales.y(this.state.year) < d.y) return;

      const party = d3.select(n[i]);
      this.highlightBee(party);

      const partyList = d3.select("#party-list").node();
      const partyInfo = d3.select(`#party-list-item-${d.data.partyId}`).node();

      partyInfo.classList.add("active");
      if (!isVisible(partyInfo, partyList)) {
        partyList.scrollTop = partyInfo.offsetTop - 50; // TODO: Magic value
      }
    };

    const onMouseout = (d, i, n) => {
      if (!isActive(d.data) || this.scales.y(this.state.year) < d.y) return;

      const party = d3.select(n[i]);
      this.removeBeeHighlight(party);

      const partyInfo = d3.select(`#party-list-item-${d.data.partyId}`).node();
      partyInfo.classList.remove("active");
    };

    this.svg.g
      .selectAll(".beeswarm-pair")
      .data(this.state.beeswarms)
      .selectAll(selector)
      .data(
        ({ parties }) =>
          parties.filter(
            ({ data: d }) => d.share >= this.state.minVoteShare * 100
          ),
        ({ data: d }) => d.partyId
      )
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("id", ({ data: d }) => `party-${d.partyId}`)
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
            .attr("r", ({ data: d }) =>
              isActive(d) ? radius.active : radius.inactive
            )
            .attr("stroke", ({ data: d }) => color(d.familyId))
            .attr("stroke-width", 1)
            .attr("fill", ({ data: d }) =>
              d.isAlive ? this.parties.color(d.familyId) : "transparent"
            )
            .attr("opacity", (d) =>
              y(this.state.year) >= d.y ? 1 : transparent
            )
            .on("mouseover", onMouseover)
            .on("mouseout", onMouseout),
        (update) =>
          update
            .on("mouseover", onMouseover)
            .on("mouseout", onMouseout)
            .transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .attr("r", ({ data: d }) =>
              isActive(d) ? radius.active : radius.inactive
            ),
        (exit) => exit.remove()
      );
  }

  initBeeHighlight() {
    this.svg.bg.append("circle").attr("id", "party-highlight");
  }

  highlightBee(selection) {
    selection
      .transition()
      .duration(400)
      .ease(d3.easeCubicOut)
      .attr("r", this.parties.radius.selected);

    this.svg.bg
      .select("#party-highlight")
      .datum(selection.datum())
      .join(
        (enter) => enter,
        (update) =>
          update
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y)
            .attr(
              "fill",
              ({ data: d }) => `url(#radial-gradient-${d.familyId})`
            )
            .call((update) =>
              update
                .transition()
                .duration(400)
                .ease(d3.easeCubicOut)
                .attr("r", this.parties.radius.highlight)
            ),
        (exit) => exit.remove()
      );
  }

  removeBeeHighlight(selection) {
    selection
      .transition()
      .duration(400)
      .ease(d3.easeCubicOut)
      .attr("r", this.parties.radius.active);

    this.svg.bg
      .select("#party-highlight")
      .transition()
      .duration(400)
      .ease(d3.easeCubicOut)
      .attr("r", 0);
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

  updateState({
    countryGroup,
    year,
    minVoteShare,
    country,
    action = true,
  } = {}) {
    if (
      countryGroup !== undefined &&
      countryGroup !== this.state.countryGroup
    ) {
      this.state.countryGroup = countryGroup;
      this.state.parties = this.data.raw;
      this.state.country = 0;

      if (this.state.countryGroup !== "all") {
        this.state.parties = this.data.raw.filter(
          (d) => d.countryGroup === this.state.countryGroup
        );
      }

      if (action) this.drawBees();
    }

    if (year !== undefined && year !== this.state.year) {
      this.state.year = year;
      this.templates.year.view = { year: year.getFullYear() };
      if (action) renderTemplate(this.templates.year);
    }

    if (
      minVoteShare !== undefined &&
      minVoteShare !== this.state.minVoteShare
    ) {
      this.state.minVoteShare = minVoteShare;
      if (action) this.drawBees();
    }

    if (country !== undefined && country !== this.state.country) {
      this.state.country = country;
      if (action) this.drawBees();
    }

    this.state.panelParties = this.data.raw.filter(
      (d) =>
        (this.state.countryGroup === "all" ||
          d.countryGroup === this.state.countryGroup) &&
        d.electionDate >= this.state.year &&
        d.share >= this.state.minVoteShare * 100 &&
        (!this.state.country || d.country === this.state.country)
    );
    this.state.panelParties = d3
      .nest()
      .key((d) => d.electionYear - (d.electionYear % 10))
      .sortKeys(d3.descending)
      .sortValues(
        (a, b) =>
          d3.ascending(
            this.data.families.indexOf(a.familyId),
            this.data.families.indexOf(b.familyId)
          ) ||
          d3.descending(a.isAlive, b.isAlive) ||
          d3.descending(a.electionYear, b.electionYear)
      )
      .entries(this.state.panelParties)
      .map(({ key, values }) => ({ decade: key, values }));
    this.templates.panelParties.view = {
      parties: this.state.panelParties,
    };

    if (action) {
      this.renderPanelParties();
    }
  }

  injectShareCharts() {
    const parties = this.state.panelParties.map((d) => d.values).flat();

    const svg = d3
      .selectAll(".party-share-chart")
      .data(parties)
      .append("svg")
      .attr("width", 16)
      .attr("height", 16)
      .attr("viewBox", [-8, -8, 16, 16]);

    svg
      .append("circle")
      .attr("r", this.parties.radius.active)
      .attr("fill", (d) =>
        d.isAlive ? this.parties.color(d.familyId) : "transparent"
      )
      .attr("stroke", (d) =>
        d.isAlive ? null : this.parties.color(d.familyId)
      );
  }

  injectPositionCharts() {
    const width = 32;
    const height = 32;
    const radius = 4;

    const x = d3
      .scaleLinear()
      .domain([0, 10])
      .range([radius, width - radius]);

    this.state.panelParties
      .map((d) => d.values)
      .flat()
      .forEach((d) => {
        const svgContainer = d3.select(
          `#party-list-item-${d.partyId} .party-position-chart`
        );

        const svg = svgContainer
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height]);

        svg
          .selectAll(".vertical-line")
          .data([width / 2])
          .join("line")
          .attr("class", "vertical-line")
          .attr("x1", (d) => d)
          .attr("y1", 0)
          .attr("x2", (d) => d)
          .attr("y2", height)
          .attr("stroke", "gray");

        svg
          .selectAll("circle")
          .data(
            this.partyProfile.keys
              .map((key) => ({ type: key, value: d[key] }))
              .filter((d) => d.value)
          )
          .join("circle")
          .attr("cx", (d) => x(d.value))
          .attr(
            "cy",
            (d) => radius + this.partyProfile.keys.indexOf(d.type) * 2 * radius
          )
          .attr("r", radius)
          .attr("fill", "black");
      });
  }

  renderTemplates() {
    renderTemplate(this.templates.year);
    this.renderPanelParties();
  }

  renderPanelParties() {
    renderTemplate(this.templates.panelParties).then(() => {
      d3.selectAll(".party-list-item")
        .on("mouseenter", (_, i, n) => {
          const partyId = d3.select(n[i]).attr("data-party-id");
          const party = d3.select(`#party-${partyId}`);
          this.highlightBee(party);
        })
        .on("mouseleave", (_, i, n) => {
          const partyId = d3.select(n[i]).attr("data-party-id");
          const party = d3.select(`#party-${partyId}`);
          this.removeBeeHighlight(party);
        });

      this.injectShareCharts();
      this.injectPositionCharts();
    });
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
      countryCode: d.country_code,
      countryGroup: d.country_group,

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

      leftRight: isNull(d.left_right) ? null : +d.left_right,
      stateMarket: isNull(d.state_market) ? null : +d.state_market,
      libertyAuthority: isNull(d.liberty_authority)
        ? null
        : +d.liberty_authority,
      euProAnti: isNull(d.eu_anti_pro) ? null : 10 - d.eu_anti_pro,
    };
  }

  static createMappings(data) {
    const family = d3.map(
      data.map(({ familyId, family: familyName }) => ({
        familyId,
        familyName,
      })),
      (d) => d.familyId
    );

    const countryCode = d3.map(
      data.map(({ country, countryCode }) => ({ country, countryCode })),
      (d) => d.country
    );

    const countryGroups = d3
      .nest()
      .key((d) => d.countryGroup)
      .rollup((v) => v.map((d) => d.country))
      .entries(data)
      .map(({ key, value }) => ({
        group: key,
        countries: [...new Set(value)].map((country) => ({
          country,
          countryCode: countryCode.get(country).countryCode,
        })),
      }));

    return { family, countryCode, countryGroups };
  }

  // Adapted from https://observablehq.com/@d3/beeswarm and https://observablehq.com/@tomwhite/beeswarm-bubbles
  // TODO: function can be simplified
  static dodge(data, padding, radius, properties, scales) {
    const { pos, size } = properties;
    const { x, y } = scales;

    const circles = data
      .map((d) => ({ y: y(d[pos]), data: d }))
      .sort((a, b) => b.data[size] - a.data[size]);
    const epsilon = 1e-3;
    let head = null,
      tail = null;

    // Returns true if circle ⟨x,y⟩ intersects with any circle in the queue.
    function intersects(x, y, r) {
      let a = head;
      while (a) {
        const radius2 = (radius + r + padding) ** 2;
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
      if (intersects((b.x = radius), b.y, radius)) {
        let a = head;
        b.x = Infinity;
        do {
          let x =
            a.x +
            Math.sqrt((radius + radius + padding) ** 2 - (a.y - b.y) ** 2);
          if (x < b.x && !intersects(x, b.y, radius)) b.x = x;
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
