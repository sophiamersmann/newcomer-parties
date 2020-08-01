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

function slide(element) {
  const newHeight =
    element.style("height") === "0px" ? element.property("scrollHeight") : 0;
  element.style("height", `${newHeight}px`);
}
