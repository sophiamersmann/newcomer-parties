function renderTemplate({ template, target, view }) {
  fetch(`src/templates/${template}`)
    .then((response) => response.text())
    .then((template) => {
      $(target).html(Mustache.render(template, view));
    });
}
