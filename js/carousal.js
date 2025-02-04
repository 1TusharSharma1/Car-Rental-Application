document.addEventListener("DOMContentLoaded", function () {
  const track1 = document.getElementById("track1");
  const track2 = document.getElementById("track2");
  track1.onclick = function () {
    window.location.href = "./login.html";
  };
  track2.onclick = function () {
    window.location.href = "./login.html";
  };
  function duplicateSlides(track) {
    const items = track.innerHTML;
    track.innerHTML += items;
  }

  duplicateSlides(track1);
  duplicateSlides(track2);

  track1.style.animation = "scrollLeft 56s linear infinite";
  track2.style.animation = "scrollLeft 50s linear infinite";

  function addHoverEffect(track) {
    track.addEventListener(
      "mouseover",
      () => (track.style.animationPlayState = "paused")
    );
    track.addEventListener(
      "mouseleave",
      () => (track.style.animationPlayState = "running")
    );
  }

  addHoverEffect(track1);
  addHoverEffect(track2);
});
function scrollToCarousel() {
  document
    .querySelector(".carousel-section")
    .scrollIntoView({ behavior: "smooth" });
}
