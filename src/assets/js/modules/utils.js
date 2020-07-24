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
