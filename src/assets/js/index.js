$(document).ready(() => {
  const inputVoteShare = $("#input-vote-share");
  const minVoteShare = +inputVoteShare.val();

  const countryGroupButton = $(".country-groups > button");
  const countryGroup = countryGroupButton.filter(".active").data("group");

  renderMinVoteShare = renderMinVoteShare.bind(inputVoteShare);
  renderMinVoteShare();

  const chartWrapper = $("#chart-wrapper");

  const mainChart = new MainChart(
    "#main-chart",
    chartWrapper.width() - 100,
    chartWrapper.height() - 100
  );
  mainChart
    .init({ countryGroup, minVoteShare })
    .then(() => renderCountryButtons(mainChart.data.mappings.countryGroups))
    .then(() => {
      const divCountries = $("#countries > div");
      const countryButton = $("#countries button");

      divCountries.each((i) => {
        const item = $(divCountries[i]);
        const group = item.data("group");
        const groupButton = countryGroupButton.filter(`[data-group=${group}]`);
        item.css(
          "margin-left",
          groupButton.position().left -
            parseFloat($(".overview").css("padding-left"))
        );
      });

      countryGroupButton.click((event) => {
        const target = $(event.target);
        const countryGroup = target.data("group");

        countryButton.removeClass("active");

        if (!target.hasClass("active")) {
          countryGroupButton.removeClass("active");
          target.toggleClass("active");
        }

        divCountries.addClass("hide");
        if (countryGroup !== "all") {
          $(`#countries-${countryGroup}`).removeClass("hide");
        }

        mainChart.updateState({ countryGroup, country: null });
      });

      countryButton.click((event) => {
        const target = $(event.target);
        const country = target.data("country");

        countryButton.removeClass("active");
        target.toggleClass("active");

        mainChart.updateState({ country });
      });

      inputVoteShare.on("input", (event) => {
        renderMinVoteShare();
        mainChart.updateState({ minVoteShare: +$(event.target).val() });
      });
    });
});

function renderMinVoteShare() {
  return renderTemplate({
    template: "input-vote-share.mustache",
    target: "#input-vote-share-label",
    view: { minVoteShare: this.val() },
  });
}

function renderCountryButtons(countryGroups) {
  return renderTemplate({
    template: "country-buttons.mustache",
    target: "#countries",
    view: { countryGroups },
  });
}
