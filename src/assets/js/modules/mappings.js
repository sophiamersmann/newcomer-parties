function getFamily(familyID) {
  return {
    2: {
      name: 'Agrarian',
      color: 'brown',
      position: 5,
    },
    3: {
      name: 'Christian democracy',
      color: 'orange',
      position: 5,
    },
    6: {
      name: 'Liberal',
      color: 'yellow',
      position: 2,
    },
    11: {
      name: 'Social democracy',
      color: 'red',
      position: 7,
    },
    12: {
      name: 'no family',
      color: 'lightgray',
      position: 10,
    },
    14: {
      name: 'Communist/Socialist',
      color: 'purple',
      position: 8,
    },
    16: {
      name: 'Special issue',
      color: 'gray',
      position: 9,
    },
    19: {
      name: 'Green/Ecologist',
      color: 'green',
      position: 6,
    },
    26: {
      name: 'Conservative',
      color: 'black',
      position: 3,
    },
    40: {
      name: 'Right-wing',
      color: 'blue',
      position: 1,
    },
  }[+familyID];
}

function getCountry(countryID) {
  return {
    33: { name: 'Australia' },
    59: { name: 'Austria' },
    64: { name: 'Belgium' },
    10: { name: 'Bulgaria' },
    29: { name: 'Canada' },
    62: { name: 'Croatia' },
    51: { name: 'Cyprus' },
    68: { name: 'Czech Republic' },
    21: { name: 'Denmark' },
    75: { name: 'Estonia' },
    67: { name: 'Finland' },
    43: { name: 'France' },
    54: { name: 'Germany' },
    41: { name: 'Greece' },
    39: { name: 'Hungary' },
    56: { name: 'Iceland' },
    37: { name: 'Ireland' },
    34: { name: 'Israel' },
    26: { name: 'Italy' },
    5: { name: 'Japan' },
    55: { name: 'Latvia' },
    15: { name: 'Lithuania' },
    7: { name: 'Luxembourg' },
    72: { name: 'Malta' },
    8: { name: 'Netherlands' },
    11: { name: 'New Zealand' },
    9: { name: 'Norway' },
    74: { name: 'Poland' },
    63: { name: 'Portugal' },
    23: { name: 'Romania' },
    1: { name: 'Slovakia' },
    60: { name: 'Slovenia' },
    27: { name: 'Spain' },
    35: { name: 'Sweden' },
    40: { name: 'Switzerland' },
    20: { name: 'Turkey' },
    44: { name: 'United Kingdom' },
  }[+countryID];
}
