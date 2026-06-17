/* deck-progress.js — custom progress bar + section/position indicator for reveal.js.
   Works for both flat and vertically-stacked (2D) decks. Offline, no dependencies. */
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }

  function update() {
    var R = window.Reveal;
    if (!R) return;
    try {
      var total = (typeof R.getTotalSlides === "function" && R.getTotalSlides()) ||
                  (typeof R.getSlides === "function" && R.getSlides().length) || 1;
      var past = (typeof R.getSlidePastCount === "function") ? R.getSlidePastCount() : 0;
      var current = past + 1;
      var frac = (typeof R.getProgress === "function") ? R.getProgress() : (current / total);

      var fill = el("deckProgressFill");
      if (fill) fill.style.width = Math.max(0, Math.min(1, frac)) * 100 + "%";

      var count = el("deckCount");
      if (count) count.textContent = current + " / " + total;

      var sectionEl = el("deckSection");
      if (sectionEl) {
        var label = "";
        var slide = (typeof R.getCurrentSlide === "function") ? R.getCurrentSlide() : null;
        if (slide) {
          label = slide.getAttribute("data-section") || "";
          if (!label && slide.closest) {
            var anc = slide.closest("section[data-section]");
            if (anc) label = anc.getAttribute("data-section") || "";
          }
        }
        sectionEl.textContent = label || "—";
      }
    } catch (e) { /* defensive: never break the deck */ }
  }

  function attach() {
    var R = window.Reveal;
    try { R.on("slidechanged", update); R.on("ready", update); } catch (e) {}
    update();
  }

  // reveal sets window.Reveal inside an async .then(); poll until it exists.
  var tries = 0;
  (function waitForReveal() {
    if (window.Reveal && typeof window.Reveal.on === "function") { attach(); }
    else if (tries++ < 100) { setTimeout(waitForReveal, 50); }
  })();
})();
