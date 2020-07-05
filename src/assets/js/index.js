$(document).ready(() => {
  const inputVoteShare = $("#input-vote-share");
  const minVoteShare = +inputVoteShare.val();

  const selectCountry = $("#select-country");
  const country = selectCountry.val();

  renderMinVoteShare = renderMinVoteShare.bind(inputVoteShare);
  renderMinVoteShare();

  const mainChart = new MainChart("#main-chart");
  mainChart.init({ minVoteShare, country }).then(() => {
    renderCountries(mainChart.data.countries);

    inputVoteShare.on("input", () => {
      renderMinVoteShare();
      mainChart.updateState({ minVoteShare: +$(event.currentTarget).val() });
    });

    selectCountry.on("keydown", (event) => {
      if (event.keyCode === 13) {
        const country = $(event.target).val();
        if (validateCountry(country, mainChart.data.countries)) {
          console.log("Country valid:", country);
          mainChart.updateState({ country });
        } else {
          console.log("Country invalid:", country);
        }
      }
    });
  });
});

function validateCountry(country, countries) {
  return country && countries.includes(country);
}

function renderMinVoteShare() {
  renderTemplate({
    template: "input-vote-share.mustache",
    target: "#input-vote-share-label",
    view: { minVoteShare: this.val() },
  });
}

function renderCountries(countries) {
  renderTemplate({
    template: "countries.mustache",
    target: "#countries",
    view: { countries },
  });
}
