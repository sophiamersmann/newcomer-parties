const mapCountryNameToISOCode = new Map();
$.getJSON("data/iso-3166-1-alpha-2-en.json", (data) => {
  data.forEach(({ Code: code, Name: name }) =>
    mapCountryNameToISOCode.set(name, code)
  );
});

async function renderTemplate({ template, target, view }) {
  return fetch(`src/templates/${template}`)
    .then((response) => response.text())
    .then((template) => {
      $(target).html(Mustache.render(template, view));
    });
}

function isNull(value) {
  return value == null || value.length === 0;
}
