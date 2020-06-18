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

class DonutChart {
  constructor(selector, radius = 0.5, drawLabels = true) {
    const div = d3.select(selector);

    this.svg = {
      selector,
      width: 200,
      height: 100,
      g: null,
    };

    this.data = {
      filename: div.attr('data-src'),
      countryID: div.attr('data-country-id'),
      raw: null,
    };
    this.initialValues = { timeRange: { start: 2010, end: 2020 } };
    this.active = { data: null, slice: null };

    this.donut = { labelOffset: 10 };
    this.donut.radius = radius * this.svg.width;
    this.donut.thickness = 0.8 * this.donut.radius;
    this.donut.arc = d3.arc()
      .outerRadius(this.donut.radius)
      .innerRadius(this.donut.radius - this.donut.thickness);

    this.init(drawLabels);
  }

  init(drawLabels = true) {
    d3.csv(this.data.filename, DonutChart.loadDatum).then((data) => {
      this.prepareData(data);
      this.draw(drawLabels);
    });
  }

  prepareData(data) {
    if (this.data.countryID) {
      this.data.raw = data.filter((d) => d.countryID === +this.data.countryID);
    } else {
      this.data.raw = data;
    }
  }

  draw(drawLabels = true) {
    this.setUpSVG();

    this.drawDonut(this.initialValues.timeRange);

    if (drawLabels) {
      this.drawLabels();
    }

    this.enableInteractions();
  }

  setUpSVG() {
    const { width, height } = this.svg;
    this.svg.g = d3.select(this.svg.selector)
      .append('svg')
      .attr('class', 'svg-content')
      .attr('viewBox', [-width / 2, -height, width, height])
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .append('g')
      .attr('class', 'donut');
  }

  drawDonut(timeRange) {
    this.active.data = this.data.raw.filter(
      (d) => d.electionDate.getFullYear() >= timeRange.start
          && d.electionDate.getFullYear() < timeRange.end,
    );

    this.donut.pie = d3.pie()
      .value((d) => d.voteShare)
      .sort((a, b) => d3.ascending(familyPosition(a.familyID), familyPosition(b.familyID))
        || d3.descending(a.voteShare, b.voteShare))
      .startAngle(-0.5 * Math.PI)
      .endAngle(0.5 * Math.PI);

    this.svg.g.append('g')
      .selectAll('path')
      .data(this.donut.pie(this.active.data))
      .join('path')
      .attr('class', 'donut-slice')
      .attr('d', this.donut.arc)
      .attr('fill', (d) => familyColor(d.data.familyID))
      .attr('stroke', 'white')
      .style('stroke-width', 0.2);
  }

  drawLabels() {
    const { arc, labelOffset } = this.donut;

    const familyData = d3.nest()
      .key((d) => d.familyID)
      .rollup((v) => d3.sum(v, (d) => d.voteShare))
      .entries(this.active.data)
      .map((d) => ({ familyID: d.key, share: d.value }));

    const pie = d3.pie()
      .value((d) => d.share)
      .sort((a, b) => d3.ascending(familyPosition(a.familyID), familyPosition(b.familyID)))
      .startAngle(-0.5 * Math.PI)
      .endAngle(0.5 * Math.PI);

    if (!this.svg.g.select('g.donut-labels').empty()) {
      this.svg.g.select('g.donut-labels').selectAll('*').remove();
    }

    this.svg.g.append('g')
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
  }

  enableInteractions() {
    this.svg.g.selectAll('.donut-slice')
      .on('mouseover', (d, i) => {
        this.svg.g.selectAll('.donut-slice')
          .filter((_, j) => i !== j)
          .attr('fill-opacity', 0.25);
        // TODO: could be property that contains infoField logic
        this.active.slice = d.data;
        DonutChart.updateInfoField(this.active.slice);
      }).on('mouseout', (d, i) => {
        this.svg.g.selectAll('.donut-slice')
          .filter((_, j) => i !== j)
          .attr('fill-opacity', 1);
        this.active.slice = null;
        DonutChart.clearInfoField();
      });
  }

  static loadDatum(d) {
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
      voteShare: +d.vote_share,
    };
  }

  static updateInfoField(active) {
    d3.select('.party-name').text(active.party);
    d3.select('.party-country').text(active.country);
  }

  static clearInfoField() {
    d3.select('.party-name').text('');
    d3.select('.party-country').text('');
  }
}
