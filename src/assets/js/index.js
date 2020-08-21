$(document).ready(() => {
  const inputVoteShare = $("#input-vote-share");
  const minVoteShare = +inputVoteShare.val();

  const countryGroupButton = $(".select-region > button");
  const countryGroup = getActiveCountryGroup(countryGroupButton);

  renderMinVoteShare = renderMinVoteShare.bind(inputVoteShare);
  renderMinVoteShare();

  const width = Math.min($("#chart-wrapper").width(), 1400);
  const height = Math.min(
    $(window).height() -
      $(".header").outerHeight(true) -
      $(".selection").outerHeight(true),
    700
  );

  const mainChart = new MainChart("#main-chart", width, height);
  mainChart
    .init({ countryGroup, minVoteShare })
    .then(() => renderCountryButtons(mainChart.data.mappings.countryGroups))
    .then(() => {
      const divCountries = $("#select-country > div");
      const countryButton = $("#select-country button");
      const selectYear = $("#input-year");

      divCountries.each((i) => {
        const item = $(divCountries[i]);
        const group = item.data("group");
        const groupButton = countryGroupButton.filter(`[data-group=${group}]`);
        item.css(
          "margin-left",
          groupButton.position().left -
            parseFloat($(".selection").css("margin-left"))
        );
      });

      countryGroupButton.click((event) => {
        const target = $(event.target);
        const others = countryGroupButton.not(target);

        others.removeClass("active");
        target.toggleClass("active");
        const countryGroup = getActiveCountryGroup(countryGroupButton);

        divCountries.addClass("hide");
        countryButton.removeClass("active");
        if (countryGroup) {
          $(`#countries-${countryGroup}`).removeClass("hide");
        }

        mainChart.updateState({ countryGroup, country: null });
      });

      countryButton.click((event) => {
        const target = $(event.target);
        const others = countryButton.not(target);

        others.removeClass("active");
        target.toggleClass("active");

        const country = target.hasClass("active")
          ? target.data("country")
          : null;

        mainChart.updateState({ country });
      });

      inputVoteShare.on("input", (event) => {
        renderMinVoteShare();
        mainChart.updateState({ minVoteShare: +$(event.target).val() });
      });

      selectYear
        .on("input", (event) => {
          const target = $(event.target);
          const year = +target.val();

          if (1945 <= year && year <= 2020) {
            const date = new Date(year, 1, 1);
            mainChart.updateState({ year: date, action: false });
            mainChart.moveBrush(date);
          }
        })
        .on("keydown", (event) => {
          if (event.which === 38 || event.which === 40) {
            event.preventDefault();
          }
        })
        .on("focusout", (event) => {
          const target = $(event.target);
          target.val(mainChart.state.year.getFullYear());
        });
    });
});

function getActiveCountryGroup(buttons) {
  const activeButton = buttons.filter(".active");
  return activeButton.length > 0 ? activeButton.data("group") : "";
}

function renderMinVoteShare() {
  return renderTemplate({
    template: "input-vote-share.mustache",
    target: "#input-vote-share-label",
    view: { minVoteShare: d3.format(".0%")(this.val()) },
  });
}

function renderCountryButtons(countryGroups) {
  return renderTemplate({
    template: "country-buttons.mustache",
    target: "#select-country",
    view: { countryGroups },
  });
}
