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
      // brushY: null,
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
      keys: ["stateMarket", "libertyAuthority", "leftRight", "euProAnti"],
      labels: {
        leftRight: ["left", "right"],
        libertyAuthority: ["libertarian", "authoritarian"],
        stateMarket: ["state", "market"],
        euProAnti: ["pro-EU", "EU-sceptic"],
      },
      threshold: 1,
    };

    this.templates = {
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

  async init({ countryGroup = "", minVoteShare = 0, country = null } = {}) {
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

      d.positions.map((e) => {
        e.valueOrig = e.value;
        e.isUpper = null;
        e.label = null;
        if (e.valueOrig !== null) {
          e.value = e.valueOrig - 1;
          e.isUpper = e.value >= 4.5;
          e.value = e.isUpper ? e.value - 4.5 : Math.abs(e.value - 4.5);
          e.label = this.partyProfile.labels[e.key][+e.isUpper];
        }
        return e;
      });

      const pos = d3.map(d.positions, (e) => e.key);
      d.info =
        `got into parliament with ${d3.format(".1%")(
          d.share / 100
        )} of the votes<br>` +
        [
          pos.get("leftRight").value > this.partyProfile.threshold
            ? `on the political <span class="party-pos-left-right">${
                pos.get("leftRight").label
              }</span>`
            : "",
          pos.get("libertyAuthority").value > this.partyProfile.threshold
            ? `<span class="party-pos-lib-auth">${
                pos.get("libertyAuthority").label
              }</span>`
            : "",
          pos.get("stateMarket").value > this.partyProfile.threshold
            ? `<span class="party-pos-state-marekt">${
                pos.get("stateMarket").label
              }-led regulation of the economy</span>`
            : "",
          pos.get("euProAnti").value > this.partyProfile.threshold
            ? `<span class="party-pos-eu">${pos.get("euProAnti").label}</span>`
            : "",
        ]
          .filter((item) => item)
          .join(" &#183; ");

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
      .attr("class", "radial-gradient");

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
        : !this.state.countryGroup ||
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

    const onClick = (d) => {
      if (!isActive(d.data) || this.scales.y(this.state.year) < d.y) return;

      slide(
        d3
          .select(`#party-list-item-${d.data.partyId}`)
          .select(".party-hidden-info-wrapper")
      );
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
            .attr("class", selector.slice(1))
            .classed(alive.selector.slice(1), ({ data: d }) => d.isAlive)
            .classed(dead.selector.slice(1), ({ data: d }) => !d.isAlive)
            .classed("active", ({ data: d }) => isActive(d))
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
            .on("mouseout", onMouseout)
            .on("click", onClick),
        (update) =>
          update
            .classed("active", ({ data: d }) => isActive(d))
            .on("mouseover", onMouseover)
            .on("mouseout", onMouseout)
            .on("click", onClick)
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

    // this.brush.brushY = brush;
  }

  // moveBrush(year) {
  //   const { y } = this.scales;
  //   const { brushY: brush, initialDates } = this.brush;
  //   d3.select(".brush")
  //     .transition()
  //     // TODO: think about this transition
  //     .duration(1200)
  //     .ease(d3.easeCubicInOut)
  //     .call(brush.move, [initialDates[0], year].map(y));
  // }

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

      if (this.state.countryGroup) {
        this.state.parties = this.data.raw.filter(
          (d) => d.countryGroup === this.state.countryGroup
        );
      }

      if (action) this.drawBees();
    }

    if (
      year !== undefined &&
      year.getFullYear() !== this.state.year.getFullYear()
    ) {
      this.state.year = year;
      if (action) this.renderYear();
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
        (!this.state.countryGroup ||
          d.countryGroup === this.state.countryGroup) &&
        d.electionDate >= this.state.year &&
        d.share >= this.state.minVoteShare * 100 &&
        (!this.state.country || d.country === this.state.country)
    );
    this.state.panelParties = d3
      .nest()
      .key((d) => [d.country, d.electionYear].join(";"))
      .sortKeys((a, b) => {
        const [countryA, yearA] = a.split(";");
        const [countryB, yearB] = b.split(";");
        return (
          d3.descending(+yearA, +yearB) || d3.ascending(countryA, countryB)
        );
      })
      .sortValues((a, b) =>
        d3.ascending(
          this.data.families.indexOf(a.familyId),
          this.data.families.indexOf(b.familyId)
        )
      )
      .entries(this.state.panelParties);

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
    const height = width;
    const margin = 2;

    const radialScale = d3
      .scaleLinear()
      .domain([0, 4.5])
      .range([0, width / 2 - margin]);

    const labels = [];
    for (let index of d3.range(2)) {
      this.partyProfile.keys.forEach((key) =>
        labels.push(this.partyProfile.labels[key][index])
      );
    }

    this.state.panelParties
      .map((d) => d.values)
      .flat()
      .forEach((d) => {
        const currLabels = d.positions
          .filter((e) => e.value > this.partyProfile.threshold)
          .map((e) => e.label);

        const svgContainer = d3.select(
          `#party-list-item-${d.partyId} .party-position-chart`
        );

        const svg = svgContainer
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [-width / 2, -height / 2, width, height]);

        svg
          .append("g")
          .attr("class", "grid")
          .selectAll("circle")
          .data([0.5, 1.5, 2.5, 3.5, 4.5])
          .join("circle")
          .attr("r", (d) => radialScale(d))
          .attr("fill", "transparent")
          .attr("stroke", "lightgray")
          .attr("stroke-width", 0.5);

        svg
          .append("g")
          .attr("class", "web")
          .attr("opacity", 0)
          .selectAll(".web-line")
          .data(d3.range(4))
          .join("line")
          .attr("class", "web-line")
          .attr("transform", (d) => `rotate(${d * 45})`)
          .attr("y1", -(radialScale.range()[1] + margin))
          .attr("y2", radialScale.range()[1] + margin)
          .attr("stroke-width", 1)
          .attr("stroke", "lightgray");

        svg
          .append("g")
          .attr("class", "labels")
          .attr("opacity", 0)
          .selectAll("text")
          .data(labels)
          .join("text")
          .attr("y", radialScale.range()[1] + margin)
          .attr(
            "transform",
            (_, i) =>
              `rotate(${i * 45}) rotate(90 0 ${
                radialScale.range()[1] + margin
              })`
          )
          .attr("dominant-baseline", "middle")
          .attr("font-size", "8px")
          .attr("fill", (d) => (currLabels.includes(d) ? "black" : "lightgray"))
          .text((d) => d);

        const g = svg
          .selectAll(".g-pos")
          .data(d.positions.filter((e) => e.value !== null))
          .join("g")
          .attr("class", "g-pos")
          .attr(
            "transform",
            (e, i) => `rotate(${(e.isUpper ? 4 * 45 : 0) + i * 45})`
          );

        g.append("line")
          .attr("y2", (e) => radialScale(e.value))
          .attr("stroke-width", 2)
          .attr("stroke-linecap", "round")
          .attr("stroke", "black");

        const annotations = svg.selectAll(".web, .labels");
        svg
          .on("mouseenter", () => annotations.attr("opacity", 1))
          .on("mouseleave", () => annotations.attr("opacity", 0));
      });
  }

  renderTemplates() {
    this.renderYear();
    this.renderPanelParties();
  }

  renderYear() {
    document.getElementById("input-year").value = this.state.year.getFullYear();
  }

  renderPanelParties() {
    // TODO: create once, then only change display value
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
        })
        .on("click", (_, i, n) =>
          slide(d3.select(n[i]).select(".party-hidden-info-wrapper"))
        );

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

      positions: [
        {
          key: "stateMarket",
          value: isNull(d.state_market) ? null : +d.state_market,
        },
        {
          key: "libertyAuthority",
          value: isNull(d.liberty_authority) ? null : +d.liberty_authority,
        },
        {
          key: "leftRight",
          value: isNull(d.left_right) ? null : +d.left_right,
        },
        {
          key: "euProAnti",
          value: isNull(d.eu_anti_pro) ? null : 10 - d.eu_anti_pro,
        },
      ],
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
        countries: [...new Set(value)].sort(d3.ascending).map((country) => ({
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
