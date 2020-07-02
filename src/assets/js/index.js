$(document).ready(() => {
  const mainChart = new MainChart("#main-chart");

  const inputVoteShare = $("#input-vote-share");
  renderMinVoteShare.call(inputVoteShare);
  inputVoteShare.on("input", renderMinVoteShare);
});

function renderMinVoteShare() {
  renderTemplate({
    template: "input-vote-share.mustache",
    target: "#input-vote-share-label",
    view: { minVoteShare: $(this).val() },
  });
}
