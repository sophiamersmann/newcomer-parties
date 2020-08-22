import Mustache from "mustache";

export async function renderTemplate({ template, target, view }) {
  return fetch(`src/templates/${template}`)
    .then((response) => response.text())
    .then((template) => {
      const rendered = Mustache.render(template, view);
      document.getElementById(target.slice(1)).innerHTML = rendered;
    });
}

export function isNull(value) {
  return value == null || value.length === 0;
}

export function slide(element) {
  const newHeight =
    element.style("height") === "0px" ? element.property("scrollHeight") : 0;
  element.style("height", `${newHeight}px`);
}
