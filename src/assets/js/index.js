const COUNTRY_IDS = [7, 60, 23, 10, 37, 64, 39, 35, 72, 67, 59, 54, 26, 44, 9,
  62, 63, 1, 56, 74, 40, 51, 8, 43, 21, 41, 55, 15, 20, 27, 75, 68]; // 5,11,29,33,34

$(document).ready(() => {
  // draw overall chart
  const donut = new DonutChart('#chart-container-all', 0.35);

  // draw country-specific charts
  const countryDonuts = [];
  COUNTRY_IDS.forEach((countryID) => {
    const selector = `#chart-container-${countryID}`;
    const elem = $('<div>/', {
      class: 'chart-and-caption',
    }).append($('<div/>', {
      id: selector.slice(1),
      class: 'chart-container-country',
      'data-src': 'data/parlgov.csv',
      'data-country-id': countryID,
    })).append(`<div>${country(countryID)}</div>`);
    $('.panel-right').append(elem);

    countryDonuts.push(new DonutChart(selector, 0.5, false));
  });

  // slider logic
  $('input').on('input', (e) => {
    const t1 = e.target;
    $(t1).parent().css(`--${t1.id}`, +t1.value);

    const t2 = $(`#${t1.id === 'a' ? 'b' : 'a'}`).get(0);

    const timeRange = +t1.value < +t2.value
      ? { start: +t1.value, end: +t2.value }
      : { start: +t2.value, end: +t1.value };

    donut.update(timeRange);
    countryDonuts.forEach((d) => d.update(timeRange));
  });
});
