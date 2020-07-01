class MainChart {
  constructor(selector) {
    this.svg = {
      selector,
      width: 920,
      height: 650,
      margin: {
        top: 40,
        right: 50,
        bottom: 40,
        left: 50,
      },
    };

    this.parties = {
      selector: ".party",
      radius: 3,
      padding: 1.5,
      alive: {
        selector: ".party-alive",
      },
      dead: {
        selector: ".party-dead",
      },
    };

    this.labels = {
      yOffset: 5,
      yOffsetPlus: 20,
    };

    const filename = d3.select(selector).attr("data-src");
    this.init(filename);
  }

  init(filename) {
    d3.csv(filename, MainChart.loadDatum).then((data) => {
      this.prepareData(data);
      this.draw();
    });
  }

  prepareData(data) {
    this.data = {
      raw: data,
      families: [
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
      ],
      mappings: MainChart.createMappings(data),
    };
  }

  draw() {
    this.setUpSVG();

    this.setUpScales();
    this.drawAxes();

    this.drawBeeswarms();
  }

  setUpSVG() {
    const { selector, width, height, margin } = this.svg;
    this.svg.g = d3
      .select(selector)
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  }

  setUpScales() {
    const { width, height, margin } = this.svg;

    const x = d3
      .scaleBand()
      .domain(this.data.families)
      .range([margin.left, width - margin.right])
      .padding(1);

    const dates = this.data.raw.map((d) => d.electionDate).sort(d3.ascending);
    const y = d3
      .scaleTime()
      .domain([dates[0], dates[dates.length - 1]])
      .nice()
      .range([margin.top, height - margin.bottom]);

    this.scales = { x: x, y: y };
  }

  drawAxes() {
    const { width, margin } = this.svg;
    const { x, y } = this.scales;
    const { yOffset, yOffsetPlus } = this.labels;

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

    const ticks = y.ticks();
    const tickSpacing = y(ticks[1]) - y(ticks[0]);
    const formatDecade = d3.timeFormat("%Ys");
    this.svg.g
      .append("g")
      .attr("class", "axis y-axis")
      .attr("transform", `translate(0, ${tickSpacing / 2})`)
      .selectAll(".time-label")
      .data(ticks.slice(0, -1))
      .join("text")
      .attr("class", "time-label")
      .attr("x", 0)
      .attr("y", (d) => y(d) + 6) // FIXME: magic value; not vertically centered
      .text((d) => formatDecade(d));

    this.svg.g
      .append("g")
      .attr("class", "grid grid-y")
      .selectAll(".grid-line")
      .data(ticks.slice(1, -1))
      .join("line")
      .attr("class", "grid-line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke-width", 2)
      .attr("stroke", "whitesmoke");
  }

  drawBeeswarms() {
    const { x, y } = this.scales;
    const { height, margin } = this.svg;
    const { selector: partySel, radius, padding, alive, dead } = this.parties;

    // TODO: Random colors for now
    const color = d3
      .scaleOrdinal()
      .domain(this.data.families)
      .range(d3.schemeTableau10);
    this.parties.color = color;

    const nested = d3
      .nest()
      .key((d) => d.familyId)
      .entries(this.data.raw)
      .map(({ key: familyId, values: parties }) => ({
        familyId,
        family: parties[0].family,
        parties,
      }));

    const beeswarmPair = this.svg.g
      .selectAll(".beeswarm-pair")
      .data(nested)
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

    beeswarmPair
      .selectAll(alive.selector)
      .data(({ parties }) =>
        MainChart.dodge(
          parties.filter((d) => d.currentShare),
          "electionDate",
          radius * 2 + padding,
          y
        )
      )
      .join("circle")
      .attr("class", `${partySel} ${alive.selector}`)
      .attr("r", radius)
      .attr("cx", (d) => x(d.data.familyId) - radius - padding - d.x)
      .attr("cy", (d) => d.y);

    beeswarmPair
      .selectAll(dead.selector)
      .data(({ parties }) =>
        MainChart.dodge(
          parties.filter((d) => !d.currentShare),
          "electionDate",
          radius * 2 + padding,
          y
        )
      )
      .join("circle")
      .attr("class", `${partySel} ${dead.selector}`)
      .attr("r", radius)
      .attr("cx", (d) => x(d.data.familyId) + radius + padding + d.x)
      .attr("cy", (d) => d.y)
      .attr("stroke-width", 1)
      .attr("fill", "transparent");
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

  // Adapted from https://observablehq.com/@d3/beeswarm
  static dodge(data, property, radius, y) {
    const radius2 = radius ** 2;
    const circles = data
      .map((d) => ({ y: y(d[property]), data: d }))
      .sort((a, b) => a.y - b.y);
    const epsilon = 1e-3;
    let head = null,
      tail = null;

    // Returns true if circle ⟨x,y⟩ intersects with any circle in the queue.
    function intersects(x, y) {
      let a = head;
      while (a) {
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
      while (head && head.y < b.y - radius2) head = head.next;

      // Choose the minimum non-intersecting tangent.
      if (intersects((b.x = 0), b.y)) {
        let a = head;
        b.x = Infinity;
        do {
          let x = a.x + Math.sqrt(radius2 - (a.y - b.y) ** 2);
          if (x < b.x && !intersects(x, b.y)) b.x = x;
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
