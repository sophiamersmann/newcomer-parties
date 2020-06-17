const HalfDonutChart = {
  svg: {
    selector: null,
    width: 300,
    height: 500,
    g: null,
  },
  margin: {
    top: 60,
    right: 40,
    bottom: 40,
    left: 60,
  },
  data: null,
  initialValues: {
    timeRange: { start: 2010, end: 2020 },
  },
  donut: {
    radius: 100,
    thickness: 80,
  },
};

function loadDatum(d) {
  return {
    countryID: +d.country_id_from_elections,
    country: d.country_name_from_elections,
    countryShort: d.country_name_short_from_elections,

    partyID: +d.party_id,
    party: d.party_name_english_from_elections,
    partyShort: d.party_name_short_from_elections,
    partyOrig: d.party_name_from_elections,
    partyOrigAscii: d.party_name_ascii,

    familyID: +d.family_id,
    familyName: d.family_name,
    familyNameShort: d.family_name_short,

    electionID: +d.election_id,
    electionDate: d3.timeParse('%Y-%m-%d')(d.election_date),
    voteShare: +d.voteShare,
  };
}

HalfDonutChart.setUpSVG = function setUpSVG() {
  this.svg.g = d3.select(this.svg.selector)
    .append('svg')
    .attr('class', 'svg-content')
    .attr('viewBox', `0 0 ${this.svg.width} ${this.svg.height}`)
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .append('g')
    .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
};

HalfDonutChart.drawDonut = function drawDonut(timeRange) {
  const { radius, thickness } = this.donut;

  const data = this.data.filter((d) => d.electionDate.getFullYear() >= timeRange.start
    && d.electionDate.getFullYear() < timeRange.end);
  const n = data.length;

  const familyData = d3.nest()
    .key((d) => d.familyID)
    .rollup((v) => (v.length / n) * 100)
    .entries(data)
    .map((d) => ({ familyID: d.key, share: d.value }));

  const pie = d3.pie()
    .value((d) => d.share)
    .sort(null) // TODO: sort
    .startAngle(-0.5 * Math.PI)
    .endAngle(0.5 * Math.PI);

  const arc = d3.arc()
    .outerRadius(radius)
    .innerRadius(radius - thickness);

  this.svg.g.append('g')
    .attr('class', 'donut')
    // FIX: magic transform
    .attr('transform', `translate(${radius / 2}, ${radius})`)
    .selectAll('path')
    .data(pie(familyData))
    .join('path')
    .attr('d', arc)
    .attr('fill', 'white')
    .attr('stroke', 'black')
    .style('stroke-width', 2);
};

HalfDonutChart.draw = function draw() {
  this.setUpSVG();

  this.drawDonut(this.initialValues.timeRange);
};

HalfDonutChart.prepareData = function prepareData(data, region = null) {
  if (region) {
    // TODO
  } else {
    this.data = data;
  }
};

HalfDonutChart.init = function init(selector, region = null) {
  this.svg.selector = selector;

  const filename = d3.select(selector).attr('data-src');
  d3.csv(filename, loadDatum).then((data) => {
    HalfDonutChart.prepareData(data, region);
    HalfDonutChart.draw();
  });
};
