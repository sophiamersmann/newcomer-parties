const DonutChart = {
  svg: {
    selector: null,
    width: 200,
    height: 200,
    g: null,
  },
  data: {
    raw: null,
    init: {
      timeRange: { start: 2010, end: 2020 },
    },
  },
  donut: {
    pie: null,
    arc: null,
    radius: null,
    thickness: null,
    labelOffset: 10,
  },
  active: {
    data: null,
  },
};

DonutChart.donut.radius = DonutChart.svg.width / 2;
DonutChart.donut.thickness = 0.8 * DonutChart.donut.radius;

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
    family: d.family_name,
    familyShort: d.family_name_short,

    electionID: +d.election_id,
    electionDate: d3.timeParse('%Y-%m-%d')(d.election_date),
    voteShare: +d.voteShare,
  };
}

function familyName(familyID) {
  return {
    2: 'Agrarian',
    3: 'Christian democracy',
    6: 'Liberal',
    11: 'Social democracy',
    12: 'no family',
    14: 'Communist/Socialist',
    16: 'Special issue',
    19: 'Green/Ecologist',
    26: 'Conservative',
    40: 'Right-wing',
  }[+familyID];
}

function familyColor(familyID) {
  return {
    2: 'brown',
    3: 'orange',
    6: 'yellow',
    11: 'red',
    12: 'lightgray',
    14: 'purple',
    16: 'gray',
    19: 'green',
    26: 'black',
    40: 'blue',
  }[+familyID];
}

function familyPosition(familyID) {
  return {
    2: 5,
    3: 4,
    6: 2,
    11: 7,
    12: 10,
    14: 8,
    16: 9,
    19: 6,
    26: 3,
    40: 1,
  }[+familyID];
}

DonutChart.setUpSVG = function setUpSVG() {
  const { width, height } = this.svg;
  this.svg.g = d3.select(this.svg.selector)
    .append('svg')
    .attr('class', 'svg-content')
    .attr('viewBox', [-width / 2, -height / 2, width, height])
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .append('g');
};

DonutChart.drawDonut = function drawDonut(timeRange) {
  const { radius, thickness } = this.donut;

  this.active.data = this.data.raw.filter(
    (d) => d.electionDate.getFullYear() >= timeRange.start
        && d.electionDate.getFullYear() < timeRange.end,
  );

  this.donut.pie = d3.pie()
    .value(1)
    .sort((a, b) => d3.ascending(familyPosition(a.familyID), familyPosition(b.familyID)))
    .startAngle(-0.5 * Math.PI)
    .endAngle(0.5 * Math.PI);

  this.donut.arc = d3.arc()
    .outerRadius(radius)
    .innerRadius(radius - thickness);

  this.svg.g.append('g')
    .attr('class', 'donut')
    .selectAll('path')
    .data(this.donut.pie(this.active.data))
    .join('path')
    .attr('d', this.donut.arc)
    .attr('fill', (d) => familyColor(d.data.familyID))
    .attr('stroke', 'white')
    .style('stroke-width', 0.25)
    .append('title')
    .text((d) => d.data.party);
};

DonutChart.drawLabels = function drawLabels() {
  const { arc, labelOffset } = this.donut;

  const n = this.active.data.length;
  const familyData = d3.nest()
    .key((d) => d.familyID)
    .rollup((v) => (v.length / n) * 100)
    .entries(this.active.data)
    .map((d) => ({ familyID: d.key, share: d.value }));

  const pie = d3.pie()
    .value((d) => d.share)
    .sort((a, b) => d3.ascending(familyPosition(a.familyID), familyPosition(b.familyID)))
    .startAngle(-0.5 * Math.PI)
    .endAngle(0.5 * Math.PI);

  if (!d3.select('g.donut-labels').empty()) {
    d3.select('g.donut-labels').selectAll('*').remove();
  }

  d3.select('.donut').append('g')
    .attr('class', 'donut-labels')
    .selectAll('text')
    .data(pie(familyData))
    .join('text')
    .attr('class', 'label')
    .attr('transform', (d) => {
      const r = (arc.outerRadius()(d)) + labelOffset;
      const a = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
      const translateXY = [Math.cos(a) * r, Math.sin(a) * r];
      return `translate(${translateXY})`;
    })
    .attr('alignment-baseline', 'middle')
    .attr('text-anchor', (d) => {
      const a = (d.startAngle + d.endAngle) / 2;
      if (a > -Math.PI / 30 && a < Math.PI / 30) return 'middle';
      if (a < 0) return 'end';
      return 'start';
    })
    .text((d) => familyName(d.data.familyID));
};

DonutChart.draw = function draw() {
  this.setUpSVG();

  this.drawDonut(this.data.init.timeRange);
  this.drawLabels();
};

DonutChart.prepareData = function prepareData(data, region = null) {
  if (region) {
    // TODO
  } else {
    this.data.raw = data;
  }
};

DonutChart.init = function init(selector, region = null) {
  this.svg.selector = selector;

  const filename = d3.select(selector).attr('data-src');
  d3.csv(filename, loadDatum).then((data) => {
    DonutChart.prepareData(data, region);
    DonutChart.draw();
  });
};
