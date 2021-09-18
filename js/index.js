var currScreen = "code";

function switchScreen(name) {
  document.querySelector("#" + currScreen + "-screen").style.display = "none";
  document.querySelector("#" + name + "-screen").style.display = "block";
}
