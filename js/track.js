/* BillsZilla first-party, privacy-safe usage ping.
   Counts tool starts/completions only — aggregate per-day totals.
   No invoice contents, names, amounts, file names, IPs or personal
   data are ever sent. Fire-and-forget: a failed ping must never
   break a tool, so everything is wrapped and errors are swallowed.
   Mirrors the proven PDFZippy pzPing pattern. */
(function(){
"use strict";
var TOOLS = {
  "invoice": 1,
  "quote": 1,
  "receipt": 1,
  "proforma": 1,
  "payment-reminder": 1,
  "hourly-rate-calculator": 1,
  "time-tracker": 1
};
window.bzPing = function(slug, action){
  try{
    if(!TOOLS[slug]) return;
    if(action !== "started" && action !== "completed") return;
    var payload = JSON.stringify({ t: slug, a: action });
    if(navigator.sendBeacon){
      navigator.sendBeacon("/api/event", new Blob([payload], { type: "text/plain" }));
    } else {
      fetch("/api/event", { method: "POST", body: payload, keepalive: true }).catch(function(){});
    }
  }catch(e){ /* analytics must never break the tools */ }
};
/* Once-per-page guard so "started" fires a single time per tool view,
   on the first meaningful interaction rather than on every keystroke. */
var _started = {};
window.bzStarted = function(slug){
  if(_started[slug]) return;
  _started[slug] = 1;
  window.bzPing(slug, "started");
};
})();
