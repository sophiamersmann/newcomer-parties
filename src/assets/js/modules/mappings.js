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
