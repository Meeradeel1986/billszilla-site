/* BillsZilla header dropdowns — click / Escape / outside-click handling and
   mobile expand-collapse. Desktop hover + keyboard focus are CSS-driven
   (:hover / :focus-within in style.css). Loaded on every page. */
(function () {
  "use strict";

  function closeAll(except) {
    document.querySelectorAll(".nav-dd.open").forEach(function (dd) {
      if (dd !== except) {
        dd.classList.remove("open");
        var b = dd.querySelector(".nav-dd-toggle");
        if (b) b.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll(".nav-dd").forEach(function (dd) {
    var btn = dd.querySelector(".nav-dd-toggle");
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      dd.classList.remove("suppress");
      var willOpen = !dd.classList.contains("open");
      closeAll(dd);
      dd.classList.toggle("open", willOpen);
      btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
    dd.addEventListener("mouseleave", function () { dd.classList.remove("suppress"); });
    dd.querySelectorAll(".nav-dd-menu a").forEach(function (a) {
      a.addEventListener("click", function () { closeAll(null); });
    });
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest || !e.target.closest(".nav-dd")) closeAll(null);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var focusTarget = null;
    document.querySelectorAll(".nav-dd").forEach(function (dd) {
      var engaged = dd.classList.contains("open") || dd.matches(":hover") || dd.contains(document.activeElement);
      if (engaged) {
        /* CSS :hover / :focus-within would instantly re-show the menu, so
           suppress it until the pointer leaves the dropdown */
        dd.classList.add("suppress");
        if (dd.classList.contains("open") || dd.contains(document.activeElement)) {
          focusTarget = dd.querySelector(".nav-dd-toggle");
        }
      }
    });
    closeAll(null);
    if (focusTarget) focusTarget.focus();
  });
})();
