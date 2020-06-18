const COUNTRY_IDS = [7, 60, 23, 10, 29, 37, 64, 39, 35, 72, 67, 59, 54, 26, 44, 9,
  62, 63, 1, 34, 56, 74, 40, 51, 8, 43, 21, 33, 41, 55, 11, 15, 20, 27, 75, 5, 68];

$(document).ready(() => {
  // draw overall chart
  new DonutChart('#chart-container-all');

  // draw country-specific charts
  COUNTRY_IDS.forEach((countryID) => {
    const selector = `#chart-container-${countryID}`;
    $('<div>/', {
      id: selector.slice(1),
      class: 'chart-container-country',
      'data-src': 'data/parlgov.csv',
      'data-country-id': countryID,
    }).appendTo('.panel-right');
    new DonutChart(selector, false);
  });
});
