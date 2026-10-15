/* Billszilla install prompt: registers the installability-only service worker
   and shows an "Install app" banner when the browser fires beforeinstallprompt. */
(function () {
"use strict";
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}
var css = [
"#bz-install{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:9989;background:#0f172a;color:#fff;border-radius:14px;padding:10px 10px 10px 16px;display:flex;align-items:center;gap:10px;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.3);max-width:calc(100vw - 36px)}",
"#bz-install-go{background:#059669;color:#fff;border:0;border-radius:10px;padding:8px 14px;font-size:14px;cursor:pointer;white-space:nowrap}",
"#bz-install-x{background:none;border:0;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;padding:4px 6px}",
"@media print{#bz-install{display:none!important}}"
].join("\n");
var deferredPrompt = null;
function showBanner() {
  if (document.getElementById("bz-install")) return;
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  var d = document.createElement("div"); d.id = "bz-install";
  d.innerHTML = "<span>📲 Install Billszilla as an app</span>";
  var go = document.createElement("button"); go.id = "bz-install-go"; go.textContent = "Install";
  var x = document.createElement("button"); x.id = "bz-install-x"; x.setAttribute("aria-label", "Dismiss"); x.textContent = "×";
  d.appendChild(go); d.appendChild(x); document.body.appendChild(d);
  go.addEventListener("click", function () {
    d.remove();
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(function () { deferredPrompt = null; }); }
  });
  x.addEventListener("click", function () {
    d.remove();
    try { localStorage.setItem("bz-install-dismissed", "1"); } catch (e) {}
  });
}
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  deferredPrompt = e;
  try { if (localStorage.getItem("bz-install-dismissed")) return; } catch (err) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showBanner);
  else showBanner();
});
window.addEventListener("appinstalled", function () {
  var d = document.getElementById("bz-install"); if (d) d.remove();
});
})();
