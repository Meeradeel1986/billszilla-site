/* BillsZilla funeral cost estimator — all local, no network calls.
   Figures: NFDA 2023 General Price List Study medians (verified) plus
   published 2026 state averages. Every result is a planning RANGE, never
   a quote, and no figure here is guessed. */
(function(){
"use strict";
var FC_DATA = {"nfda": {"burial": 8300, "burialVault": 9995, "cremation": 6280, "directFamily": 2645, "directHome": 2750, "immediateFamily": 2995, "immediateHome": 3720}, "comp": {"basic": 2495, "transfer": 395, "embalming": 845, "prep": 295, "viewing": 475, "ceremony": 550, "hearse": 375, "car": 175, "memorial": 195, "casket": 2500, "vault": 1695, "urn": 295, "basicCasket": 1000}, "cemetery": {"low": 3000, "high": 8000}, "states": {"alabama": {"name": "Alabama", "burial": 8428, "cremation": 6137, "dcGpl": 2395, "dcGplN": 3, "dcGplThin": false, "dcAlt": 2032}, "alaska": {"name": "Alaska", "burial": 8272, "cremation": 6336, "dcGpl": 1795, "dcGplN": 1, "dcGplThin": true, "dcAlt": 1972}, "arizona": {"name": "Arizona", "burial": 7784, "cremation": 5367, "dcGpl": 945, "dcGplN": 6, "dcGplThin": false, "dcAlt": 1486}, "arkansas": {"name": "Arkansas", "burial": 7671, "cremation": 5489, "dcGpl": 1333, "dcGplN": 4, "dcGplThin": false, "dcAlt": 1679}, "california": {"name": "California", "burial": 8050, "cremation": 5524, "dcGpl": 1808, "dcGplN": 24, "dcGplThin": false, "dcAlt": 1641}, "colorado": {"name": "Colorado", "burial": 8158, "cremation": 5825, "dcGpl": 695, "dcGplN": 7, "dcGplThin": false, "dcAlt": 1721}, "connecticut": {"name": "Connecticut", "burial": 9609, "cremation": 7156, "dcGpl": 1350, "dcGplN": 5, "dcGplThin": false, "dcAlt": 3108}, "delaware": {"name": "Delaware", "burial": 9166, "cremation": 6830, "dcGpl": 4073, "dcGplN": 2, "dcGplThin": true, "dcAlt": 2603}, "district-of-columbia": {"name": "District of Columbia", "burial": 9028, "cremation": 6462, "dcGpl": 1978, "dcGplN": 4, "dcGplThin": false, "dcAlt": 2206}, "florida": {"name": "Florida", "burial": 8399, "cremation": 5957, "dcGpl": 1440, "dcGplN": 6, "dcGplThin": false, "dcAlt": 1698}, "georgia": {"name": "Georgia", "burial": 8551, "cremation": 6338, "dcGpl": 2500, "dcGplN": 5, "dcGplThin": false, "dcAlt": 1939}, "hawaii": {"name": "Hawaii", "burial": 9583, "cremation": 7351, "dcGpl": 1990, "dcGplN": 3, "dcGplThin": false, "dcAlt": 1632}, "idaho": {"name": "Idaho", "burial": 7745, "cremation": 5437, "dcGpl": 1298, "dcGplN": 4, "dcGplThin": false, "dcAlt": 1706}, "illinois": {"name": "Illinois", "burial": 9184, "cremation": 6721, "dcGpl": 2398, "dcGplN": 10, "dcGplThin": false, "dcAlt": 2564}, "indiana": {"name": "Indiana", "burial": 8705, "cremation": 6385, "dcGpl": 2323, "dcGplN": 6, "dcGplThin": false, "dcAlt": 2295}, "iowa": {"name": "Iowa", "burial": 9382, "cremation": 7244, "dcGpl": 2827, "dcGplN": 5, "dcGplThin": false, "dcAlt": 2991}, "kansas": {"name": "Kansas", "burial": 8640, "cremation": 6452, "dcGpl": 1995, "dcGplN": 3, "dcGplThin": false, "dcAlt": 2553}, "kentucky": {"name": "Kentucky", "burial": 8393, "cremation": 6114, "dcGpl": 1573, "dcGplN": 2, "dcGplThin": true, "dcAlt": 2031}, "louisiana": {"name": "Louisiana", "burial": 8659, "cremation": 6388, "dcGpl": 2690, "dcGplN": 6, "dcGplThin": false, "dcAlt": 2311}, "maine": {"name": "Maine", "burial": 8594, "cremation": 6265, "dcGpl": 1395, "dcGplN": 5, "dcGplThin": false, "dcAlt": 2372}, "maryland": {"name": "Maryland", "burial": 9188, "cremation": 6866, "dcGpl": 3140, "dcGplN": 8, "dcGplThin": false, "dcAlt": 2425}, "massachusetts": {"name": "Massachusetts", "burial": 9545, "cremation": 7109, "dcGpl": 3195, "dcGplN": 5, "dcGplThin": false, "dcAlt": 2720}, "michigan": {"name": "Michigan", "burial": 8955, "cremation": 6551, "dcGpl": 1300, "dcGplN": 5, "dcGplThin": false, "dcAlt": 2268}, "minnesota": {"name": "Minnesota", "burial": 9697, "cremation": 7517, "dcGpl": 1875, "dcGplN": 3, "dcGplThin": false, "dcAlt": 2955}, "mississippi": {"name": "Mississippi", "burial": 7984, "cremation": 5837, "dcGpl": 1054, "dcGplN": 4, "dcGplThin": false, "dcAlt": 1994}, "missouri": {"name": "Missouri", "burial": 8295, "cremation": 5973, "dcGpl": 1495, "dcGplN": 7, "dcGplThin": false, "dcAlt": 1852}, "montana": {"name": "Montana", "burial": 7742, "cremation": 5697, "dcGpl": 2215, "dcGplN": 4, "dcGplThin": false, "dcAlt": 2476}, "nebraska": {"name": "Nebraska", "burial": 8620, "cremation": 6530, "dcGpl": 3100, "dcGplN": 1, "dcGplThin": true, "dcAlt": 2958}, "nevada": {"name": "Nevada", "burial": 8538, "cremation": 6095, "dcGpl": 1015, "dcGplN": 4, "dcGplThin": false, "dcAlt": 1467}, "new-hampshire": {"name": "New Hampshire", "burial": 8793, "cremation": 6409, "dcGpl": 2390, "dcGplN": 3, "dcGplThin": false, "dcAlt": 2190}, "new-jersey": {"name": "New Jersey", "burial": 9451, "cremation": 6858, "dcGpl": 2345, "dcGplN": 9, "dcGplThin": false, "dcAlt": 2511}, "new-mexico": {"name": "New Mexico", "burial": 7829, "cremation": 5588, "dcGpl": 2405, "dcGplN": 3, "dcGplThin": false, "dcAlt": 1935}, "new-york": {"name": "New York", "burial": 8836, "cremation": 6289, "dcGpl": 1929, "dcGplN": 7, "dcGplThin": false, "dcAlt": 2395}, "north-carolina": {"name": "North Carolina", "burial": 8136, "cremation": 5888, "dcGpl": 1800, "dcGplN": 8, "dcGplThin": false, "dcAlt": 1933}, "north-dakota": {"name": "North Dakota", "burial": 8868, "cremation": 6791, "dcGpl": 1408, "dcGplN": 2, "dcGplThin": true, "dcAlt": 3183}, "ohio": {"name": "Ohio", "burial": 8018, "cremation": 5660, "dcGpl": 2293, "dcGplN": 4, "dcGplThin": false, "dcAlt": 2057}, "oklahoma": {"name": "Oklahoma", "burial": 7966, "cremation": 5692, "dcGpl": 1765, "dcGplN": 3, "dcGplThin": false, "dcAlt": 2159}, "oregon": {"name": "Oregon", "burial": 7554, "cremation": 5144, "dcGpl": 1405, "dcGplN": 6, "dcGplThin": false, "dcAlt": 1319}, "pennsylvania": {"name": "Pennsylvania", "burial": 8820, "cremation": 6536, "dcGpl": 1828, "dcGplN": 4, "dcGplThin": false, "dcAlt": 2460}, "rhode-island": {"name": "Rhode Island", "burial": 9213, "cremation": 6765, "dcGpl": 3515, "dcGplN": 3, "dcGplThin": false, "dcAlt": 2619}, "south-carolina": {"name": "South Carolina", "burial": 8270, "cremation": 5987, "dcGpl": 1550, "dcGplN": 4, "dcGplThin": false, "dcAlt": 1926}, "south-dakota": {"name": "South Dakota", "burial": 8614, "cremation": 6689, "dcGpl": null, "dcGplN": null, "dcGplThin": false, "dcAlt": 2826}, "tennessee": {"name": "Tennessee", "burial": 8167, "cremation": 5922, "dcGpl": 1295, "dcGplN": 9, "dcGplThin": false, "dcAlt": 1935}, "texas": {"name": "Texas", "burial": 8796, "cremation": 6461, "dcGpl": 2250, "dcGplN": 11, "dcGplThin": false, "dcAlt": 2134}, "utah": {"name": "Utah", "burial": 8028, "cremation": 5803, "dcGpl": 1525, "dcGplN": 4, "dcGplThin": false, "dcAlt": 1627}, "vermont": {"name": "Vermont", "burial": 8213, "cremation": 5918, "dcGpl": 1803, "dcGplN": 2, "dcGplThin": true, "dcAlt": 2297}, "virginia": {"name": "Virginia", "burial": 8321, "cremation": 6128, "dcGpl": 2925, "dcGplN": 6, "dcGplThin": false, "dcAlt": 2515}, "washington": {"name": "Washington", "burial": 7664, "cremation": 5302, "dcGpl": 1700, "dcGplN": 5, "dcGplThin": false, "dcAlt": 1531}, "west-virginia": {"name": "West Virginia", "burial": 8074, "cremation": 5878, "dcGpl": 2225, "dcGplN": 3, "dcGplThin": false, "dcAlt": 2289}, "wisconsin": {"name": "Wisconsin", "burial": 9004, "cremation": 6735, "dcGpl": 3200, "dcGplN": 7, "dcGplThin": false, "dcAlt": 2908}, "wyoming": {"name": "Wyoming", "burial": 8070, "cremation": 6043, "dcGpl": 2490, "dcGplN": 3, "dcGplThin": false, "dcAlt": 2550}}};
var $ = function(id){ return document.getElementById(id); };
var arrangement = "burial";

function fmt(n){
  return "$" + Number(n).toLocaleString("en-US",{minimumFractionDigits:0, maximumFractionDigits:0});
}
function fmt2(n){
  return "$" + Number(n).toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
}
function stateData(){
  var el = $("fc-state");
  if(!el) return null;
  var v = el.value;
  if(!v || v === "national") return null;
  return FC_DATA.states[v] || null;
}
function isChecked(id){
  var el = $(id);
  return !!(el && el.checked);
}
function escHtml(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function setVisible(id, show){
  var el = $(id);
  if(el) el.style.display = show ? "" : "none";
}

function updateVisibility(){
  var svc = arrangement === "burial" || arrangement === "cremation";
  setVisible("fc-service-wrap", svc);
  setVisible("fc-casket-wrap", arrangement === "burial");
  setVisible("fc-container-wrap", arrangement === "immediate");
  setVisible("fc-vault-wrap", arrangement === "burial" || arrangement === "immediate");
  setVisible("fc-cemetery-wrap", arrangement !== "direct");
  var grave = $("fc-graveside");
  if(grave && grave.checked && svc){
    $("fc-viewing").checked = false;
    $("fc-ceremony").checked = false;
    $("fc-viewing").disabled = true;
    $("fc-ceremony").disabled = true;
  } else if(svc){
    $("fc-viewing").disabled = false;
    $("fc-ceremony").disabled = false;
  }
}

function calc(){
  var st = stateData();
  var stateName = st ? st.name : "the United States";
  var c = FC_DATA.comp, nf = FC_DATA.nfda;
  var lines = [], notes = [];
  var low, high, typical, typicalNote = "", formula = "";
  var viewing = isChecked("fc-viewing"), ceremony = isChecked("fc-ceremony");
  var vault = $("fc-vault") ? $("fc-vault").value : "unknown";
  var cemetery = isChecked("fc-cemetery");

  function pushLine(label, amount, basis){
    lines.push({label: label, amount: amount, basis: basis});
  }

  if(arrangement === "burial" || arrangement === "cremation"){
    var isBurial = arrangement === "burial";
    var baseTotal = isBurial ? nf.burial : nf.cremation;
    pushLine("Basic services fee (non-declinable)", c.basic, "NFDA 2023 median");
    pushLine("Transfer of remains", c.transfer, "NFDA 2023 median");
    pushLine("Embalming", c.embalming, "NFDA 2023 median");
    pushLine("Other preparation (dressing, cosmetology)", c.prep, "NFDA 2023 median");
    if(viewing) pushLine("Use of facilities and staff for viewing", c.viewing, "NFDA 2023 median");
    if(ceremony) pushLine("Use of facilities and staff for ceremony", c.ceremony, "NFDA 2023 median");
    pushLine("Hearse", c.hearse, "NFDA 2023 median");
    pushLine("Service car / van", c.car, "NFDA 2023 median");
    pushLine("Printed memorial package", c.memorial, "NFDA 2023 median");
    var delta = 0;
    if(isBurial){
      var ck = $("fc-casket") ? $("fc-casket").value : "metal";
      if(ck === "metal") pushLine("Metal casket", c.casket, "NFDA 2023 median");
      else if(ck === "basic"){ pushLine("Basic casket", c.basicCasket, "Funeral Consumers Alliance, about $1,000"); }
      else { pushLine("Own casket (bought elsewhere)", 0, "Your FTC right — the funeral home must accept it"); }
    } else {
      pushLine("Alternative container and urn", 480, "NFDA 2023 median, combined (total minus the other listed items)");
    }
    var itemized = 0;
    for(var i = 0; i < lines.length; i++) itemized += lines[i].amount || 0;
    delta += itemized - baseTotal;
    if(vault === "yes" && isBurial){ pushLine("Burial vault", c.vault, "NFDA 2023 median"); delta += c.vault; }
    else if(vault === "unknown" && isBurial){ notes.push("Add $1,695 for a burial vault if your cemetery requires one (NFDA 2023 median)."); }
    var anchor = st ? (isBurial ? st.burial : st.cremation) : baseTotal;
    low = Math.min(anchor, baseTotal) + delta;
    high = Math.max(anchor, baseTotal) + delta;
    typical = anchor + delta;
    typicalNote = st ? ("Published average in " + stateName + " (Funeralocity 2026)") : "NFDA 2023 national median";
    formula = st ? ("State average: Funeralocity 2026 · National median: NFDA 2023 General Price List Study")
                 : "National medians: NFDA 2023 General Price List Study";
  }
  else if(arrangement === "direct"){
    if(st){
      if(st.dcGpl !== null){
        var gplBasis = "2026 GPL study (median of " + st.dcGplN + " published price lists)" + (st.dcGplThin ? " — small sample, indicative only" : "");
        pushLine("Direct cremation — published median", st.dcGpl, gplBasis);
      }
      pushLine("Direct cremation — second estimate", st.dcAlt, "LegalClarity, based on NFDA price-list surveys");
      var vals = st.dcGpl !== null ? [st.dcGpl, st.dcAlt] : [st.dcAlt];
      low = Math.min.apply(null, vals);
      high = Math.max.apply(null, vals);
      typical = st.dcGpl !== null ? st.dcGpl : st.dcAlt;
      typicalNote = st.dcGpl !== null ? "Median of published price lists (2026 GPL study)"
                                       : "Single-source estimate (LegalClarity) — no GPL-study median for South Dakota";
      formula = "Direct cremation figures: 2026 GPL study + LegalClarity";
    } else {
      pushLine("Direct cremation — family provides container", nf.directFamily, "NFDA 2023 median");
      pushLine("Direct cremation — funeral home provides container", nf.directHome, "NFDA 2023 median");
      low = nf.directFamily; high = nf.directHome; typical = nf.directFamily;
      typicalNote = "NFDA 2023 national median (family provides container)";
      formula = "National medians: NFDA 2023 General Price List Study";
    }
  }
  else { /* immediate burial */
    pushLine("Immediate burial — family provides container", nf.immediateFamily, "NFDA 2023 median");
    pushLine("Immediate burial — funeral home provides container", nf.immediateHome, "NFDA 2023 median");
    low = nf.immediateFamily; high = nf.immediateHome;
    typical = ($("fc-container") && $("fc-container").value === "home") ? nf.immediateHome : nf.immediateFamily;
    typicalNote = "NFDA 2023 national median";
    formula = "National medians: NFDA 2023 General Price List Study";
    if(vault === "yes"){
      pushLine("Burial vault", c.vault, "NFDA 2023 median");
      low += c.vault; high += c.vault; typical += c.vault;
    } else if(vault === "unknown"){
      notes.push("Add $1,695 for a burial vault if your cemetery requires one (NFDA 2023 median).");
    }
  }

  if(cemetery && arrangement !== "direct"){
    pushLine("Cemetery (plot, opening/closing, marker)", null, "Funeral Consumers Alliance range $3,000–$8,000");
    low += FC_DATA.cemetery.low;
    high += FC_DATA.cemetery.high;
    notes.push("Cemetery costs are a second bill, on top of the funeral home — typically $3,000–$8,000. The typical figure below is before cemetery costs.");
  }

  var extras = [["fc-ex-flowers","Flowers"],["fc-ex-obit","Obituary"],
                ["fc-ex-certs","Death certificates"],["fc-ex-reception","Reception"]];
  var exOn = [];
  for(var e = 0; e < extras.length; e++) if(isChecked(extras[e][0])) exOn.push(extras[e][1]);
  if(exOn.length) notes.push(exOn.join(", ") + " — prices vary by provider and are not included in this estimate; ask the funeral home for its price list.");

  /* render */
  var html = "";
  for(var j = 0; j < lines.length; j++){
    var L = lines[j];
    var val = (L.amount === null || L.amount === undefined) ? "range" : fmt2(L.amount);
    html += '<div class="rate-row"><span>' + escHtml(L.label) +
            '<br><small style="color:#64748b">' + escHtml(L.basis) + '</small></span><b>' + val + '</b></div>';
  }
  $("fc-lines").innerHTML = html;
  if(low === high){
    $("fc-big").textContent = fmt(typical);
    $("fc-big-label").textContent = "typical estimate";
  } else {
    $("fc-big").textContent = fmt(low) + " – " + fmt(high);
    $("fc-big-label").textContent = "planning range";
  }
  $("fc-formula").textContent = formula;
  $("fc-typical").textContent = "Typical in " + stateName + ": " + fmt(typical) + " — " + typicalNote + ".";
  $("fc-notes").textContent = notes.join(" ");
}

function setArr(a){
  arrangement = a;
  var btns = document.querySelectorAll("#fc-arr button");
  for(var i = 0; i < btns.length; i++){
    btns[i].classList.toggle("active", btns[i].getAttribute("data-arr") === a);
  }
  updateVisibility();
  calc();
}

document.addEventListener("DOMContentLoaded", function(){
  var btns = document.querySelectorAll("#fc-arr button");
  for(var i = 0; i < btns.length; i++){
    btns[i].addEventListener("click", function(){ setArr(this.getAttribute("data-arr")); });
  }
  var ids = ["fc-state","fc-casket","fc-container","fc-vault"];
  for(var k = 0; k < ids.length; k++){
    var el = $(ids[k]);
    if(el) el.addEventListener("change", function(){ updateVisibility(); calc(); });
  }
  var boxes = ["fc-viewing","fc-ceremony","fc-graveside","fc-cemetery",
               "fc-ex-flowers","fc-ex-obit","fc-ex-certs","fc-ex-reception"];
  for(var b = 0; b < boxes.length; b++){
    var bx = $(boxes[b]);
    if(bx) bx.addEventListener("change", function(){ updateVisibility(); calc(); });
  }
  /* FAQ accordion (app.js is not loaded on calculator pages). */
  var qs = document.querySelectorAll(".faq-q");
  for(var q = 0; q < qs.length; q++){
    qs[q].addEventListener("click", function(){ this.parentElement.classList.toggle("open"); });
  }
  updateVisibility();
  calc();
});
})();
