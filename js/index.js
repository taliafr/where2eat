var currScreen = "welcome";

function switchScreen(name) {
  document.querySelector("#" + currScreen + "-screen").style.display = "none";
  document.querySelector("#" + name + "-screen").style.display = "block";
  currScreen = name;
}

function checkToggle(id) {
  var checkbox = document.querySelector("#check-" + id);
  checkbox.checked = !checkbox.checked;
  if(checkbox.checked) {
    checkbox.parentElement.classList.add("selected");
  } else {
    checkbox.parentElement.classList.remove("selected");
  }
}

function getCheck(id) {
  console.log(id);
  var checkbox = document.querySelector("#check-" + id);
  return checkbox.checked;
}
