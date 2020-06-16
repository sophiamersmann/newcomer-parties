const HalfDonutChart = {
  svg: {
    selector: null,
    width: 300,
    height: 500,
  },
  margin: {
    top: 60,
    right: 40,
    bottom: 40,
    left: 60,
  },
};

// TODO: Load data
function loadDatum(d) {
  return d;
}

HalfDonutChart.init = function init(selector) {
  this.svg.selector = selector;

  const filename = d3.select(selector).attr('data-src');
  d3.csv(filename, loadDatum).then((data) => {
    console.log(data);
    // HalfDonutChart.prepareData(data);
    // HalfDonutChart.draw();
  });
};
