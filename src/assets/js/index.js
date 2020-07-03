$(document).ready(() => {
  const inputVoteShare = $("#input-vote-share");
  renderMinVoteShare = renderMinVoteShare.bind(inputVoteShare);

  const minVoteShare = +inputVoteShare.val();
  const mainChart = new MainChart("#main-chart", minVoteShare);

  renderMinVoteShare();
  inputVoteShare.on("input", () => {
    renderMinVoteShare();
    mainChart.updateState({ minVoteShare: +$(event.currentTarget).val() });
  });
});

function renderMinVoteShare() {
  renderTemplate({
    template: "input-vote-share.mustache",
    target: "#input-vote-share-label",
    view: { minVoteShare: this.val() },
  });
}
