$(document).ready(() => {
  const inputVoteShare = $("#input-vote-share");
  const minVoteShare = +inputVoteShare.val();

  renderMinVoteShare = renderMinVoteShare.bind(inputVoteShare);
  renderMinVoteShare();

  const mainChart = new MainChart("#main-chart");
  mainChart.init(minVoteShare).then(() => {
    renderCountries(mainChart.data.countries);
    inputVoteShare.on("input", () => {
      renderMinVoteShare();
      mainChart.updateState({ minVoteShare: +$(event.currentTarget).val() });
    });
  });
});

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
