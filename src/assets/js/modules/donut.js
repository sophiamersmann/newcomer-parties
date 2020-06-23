function updateInfoField(active) {
  d3.select('.party-name').text(active.party);
  d3.select('.party-country').text(active.country);
  d3.select('.party-vote').text(active.voteShare);
}

function clearInfoField() {
  d3.select('.party-name').text('');
  d3.select('.party-country').text('');
  d3.select('.party-vote').text('');
}

class DonutChart {
  constructor(selector, radius = 0.5, drawLabels = true) {
    const div = d3.select(selector);

    this.svg = {
      selector,
      width: 100,
      height: 100,
      g: null,
    };

    this.data = {
      filename: div.attr('data-src'),
      countryID: div.attr('data-country-id'),
      raw: null,
    };
    this.initialValues = { timeRange: { start: 2010, end: 2020 } };
    this.active = { data: null, slice: null, timeRange: this.initialValues.timeRange };

    this.donut = {};
    this.donut.pieSize = 0.75;
    this.donut.radius = radius * this.svg.width;
    this.donut.thickness = 0.8 * this.donut.radius;
    this.donut.arc = d3.arc()
      .outerRadius(this.donut.radius)
      .innerRadius(this.donut.radius - this.donut.thickness);

    this.labels = {
      draw: drawLabels,
      offset: 2.5,
    };

    this.init();
  }

  init() {
    d3.csv(this.data.filename, DonutChart.loadDatum).then((data) => {
      this.prepareData(data);
      this.draw();
    });
  }

  prepareData(data) {
    if (this.data.countryID) {
      this.data.raw = data.filter((d) => d.countryID === +this.data.countryID);
    } else {
      this.data.raw = data;
    }
  }

  draw() {
    this.setUpSVG();

    this.drawDonut(this.initialValues.timeRange);

    if (this.labels.draw) {
      this.drawLabels();
    }

    this.enableInteractions();
  }

  setUpSVG() {
    const { width, height } = this.svg;
    this.svg.g = d3.select(this.svg.selector)
      .append('svg')
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .append('g')
      .attr('class', 'donut');

    // TODO: remove; just for debugging
    this.svg.g.append('circle')
      .attr('r', 5)
      .attr('fill', 'lightgray');
  }

  drawDonut() {
    this.active.data = this.data.raw.filter(
      (d) => d.electionDate.getFullYear() >= this.active.timeRange.start
          && d.electionDate.getFullYear() < this.active.timeRange.end,
    );

    this.donut.pie = d3.pie()
      .value((d) => d.voteShare)
      .sort((a, b) => d3.ascending(getFamily(a.familyID).position, getFamily(b.familyID).position)
        || d3.descending(a.voteShare, b.voteShare))
      .startAngle(-this.donut.pieSize * Math.PI)
      .endAngle(this.donut.pieSize * Math.PI);

    this.svg.g.append('g')
      .attr('class', 'pie')
      .selectAll('path')
      .data(this.donut.pie(this.active.data))
      .join('path')
      .attr('class', 'donut-slice')
      .attr('data-party-id', (d) => d.data.partyID)
      .attr('d', this.donut.arc)
      .attr('fill', (d) => getFamily(d.data.familyID).color);
  }

  drawLabels() {
    const { arc } = this.donut;

    const familyData = d3.nest()
      .key((d) => d.familyID)
      .rollup((v) => d3.sum(v, (d) => d.voteShare))
      .entries(this.active.data)
      .map((d) => ({ familyID: d.key, share: d.value }));

    const pie = d3.pie()
      .value((d) => d.share)
      .sort((a, b) => d3.ascending(getFamily(a.familyID).position, getFamily(b.familyID).position))
      .startAngle(-this.donut.pieSize * Math.PI)
      .endAngle(this.donut.pieSize * Math.PI);

    this.svg.g.append('g')
      .attr('class', 'donut-labels')
      .selectAll('text')
      .data(pie(familyData))
      .join('text')
      .attr('class', 'label')
      .attr('transform', (d) => {
        const r = (arc.outerRadius()(d)) + this.labels.offset;
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
      .text((d) => getFamily(d.data.familyID).name);
  }

  clearLabels() {
    this.svg.g.select('.donut-labels').selectAll('*').remove();
    this.svg.g.select('.donut-labels').remove();
  }

  clearDonut() {
    this.svg.g.select('.pie').selectAll('*').remove();
    this.svg.g.select('.pie').remove();
  }

  // TODO: Naive implementation
  update(timeRange) {
    this.active.timeRange = timeRange;

    this.clearDonut();
    this.drawDonut();

    if (this.labels.draw) {
      this.clearLabels();
      this.drawLabels();
    }

    this.enableInteractions();
  }

  enableInteractions() {
    this.svg.g.selectAll('.donut-slice')
      .on('mouseover', (d, i) => {
        d3.selectAll(`.donut-slice:not([data-party-id='${d.data.partyID}'])`)
          .attr('fill-opacity', 0.25);
        this.active.slice = d.data;
        updateInfoField(this.active.slice);
      }).on('mouseout', (d, i) => {
        d3.selectAll(`.donut-slice:not([data-party-id='${d.data.partyID}'])`)
          .attr('fill-opacity', 1);
        this.active.slice = null;
        clearInfoField();
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
}
