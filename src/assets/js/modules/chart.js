class MainChart {
  constructor(selector) {
    this.svg = {
      selector,
      width: 750,
      height: 500,
      margin: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
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
    this.data = data;
  }

  draw() {
    this.setUpSVG();
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

  static loadDatum(d) {
    let { family_id: familyId, family_name: family } = d;
    if ([0, 12, 28].includes(+familyId)) {
      familyId = 0;
      family = "Other";
    }

    return {
      countryId: +d.country_id,
      country: d.country_name,

      partyId: +d.party_id,
      party: d.party_name_english,

      electionId: +d.election_id,
      electionDate: d3.timeParse("%Y-%m-%d")(d.election_date),

      familyId: +familyId,
      family: family,

      share: +d.vote_share,
      currentShare: +d.most_recent_vote_share,
    };
  }
}
