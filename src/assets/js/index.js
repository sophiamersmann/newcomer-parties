$(document).ready(() => {
  const inputVoteShare = $("#input-vote-share");
  const minVoteShare = +inputVoteShare.val();

  renderMinVoteShare = renderMinVoteShare.bind(inputVoteShare);
  renderMinVoteShare();

  new Promise(function (resolve) {
    resolve(new MainChart("#main-chart", minVoteShare));
  }).then(function (mainChart) {
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