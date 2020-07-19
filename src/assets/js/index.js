$(document).ready(() => {
  const inputVoteShare = $("#input-vote-share");
  const minVoteShare = +inputVoteShare.val();

  const countryGroupButton = $(".group-buttons > button");
  const countryGroup = countryGroupButton.filter(".active").data("group");

  renderMinVoteShare = renderMinVoteShare.bind(inputVoteShare);
  renderMinVoteShare();

  const mainChart = new MainChart("#main-chart");
  mainChart.init({ countryGroup, minVoteShare }).then(() => {
    renderCountryButtons(mainChart.data.mappings.countryGroups);

    countryGroupButton.click(() => {
      countryGroupButton.removeClass("active");
      $(event.target).toggleClass("active");

      const countryGroup = $(event.target).data("group");
      mainChart.updateState({ countryGroup });

      $(".country-buttons").addClass("hide");
      if (countryGroup !== "all") {
        $(`#country-buttons-${countryGroup}`).removeClass("hide");
      }
    });

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

function renderParties(parties) {
  renderTemplate({
    template: "parties.mustache",
    target: "#party-list",
    view: { parties },
  });
}

function renderCountryButtons(countryGroups) {
  renderTemplate({
    template: "country-buttons.mustache",
    target: "#country-buttons",
    view: { countryGroups },
  });
}
