const COUNTRY_IDS = [7, 60, 23, 10, 37, 64, 39, 35, 72, 67, 59, 54, 26, 44, 9,
  62, 63, 1, 56, 74, 40, 51, 8, 43, 21, 41, 55, 15, 20, 27, 75, 68]; // 5,11,29,33,34

function country(countryID) {
  return {
    33: 'Australia',
    59: 'Austria',
    64: 'Belgium',
    10: 'Bulgaria',
    29: 'Canada',
    62: 'Croatia',
    51: 'Cyprus',
    68: 'Czech Republic',
    21: 'Denmark',
    75: 'Estonia',
    67: 'Finland',
    43: 'France',
    54: 'Germany',
    41: 'Greece',
    39: 'Hungary',
    56: 'Iceland',
    37: 'Ireland',
    34: 'Israel',
    26: 'Italy',
    5: 'Japan',
    55: 'Latvia',
    15: 'Lithuania',
    7: 'Luxembourg',
    72: 'Malta',
    8: 'Netherlands',
    11: 'New Zealand',
    9: 'Norway',
    74: 'Poland',
    63: 'Portugal',
    23: 'Romania',
    1: 'Slovakia',
    60: 'Slovenia',
    27: 'Spain',
    35: 'Sweden',
    40: 'Switzerland',
    20: 'Turkey',
    44: 'United Kingdom',
  }[+countryID];
}

$(document).ready(() => {
  // draw overall chart
  new DonutChart('#chart-container-all', 0.35);

  // draw country-specific charts
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
    new DonutChart(selector, 0.5, false);
  });
});
