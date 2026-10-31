/* BillsZilla hourly rate calculator — all local; only network call is an anonymous usage-count ping (see js/track.js). */
(function(){
"use strict";
var $ = function(id){ return document.getElementById(id); };

function sym(code){
  try{
    if(typeof CURRENCIES !== "undefined"){
      for(var i=0;i<CURRENCIES.length;i++){
        if(CURRENCIES[i][0]===code) return CURRENCIES[i][1];
      }
    }
  }catch(e){}
  return "$";
}
function num(id, fallback){
  var v = parseFloat(($(id).value || "").replace(/,/g,""));
  return (isNaN(v) || v < 0) ? fallback : v;
}
function money(n, code){
  return sym(code) + Number(n).toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
}

/* ---------- usage tracking (anonymous aggregate counts only) ---------- */
var BZ_SLUG = "hourly-rate-calculator";
var _bzDone = false;
function bzStart(){ try{ if(window.bzStarted) window.bzStarted(BZ_SLUG); }catch(e){} }
function bzDone(){
  if(_bzDone) return; _bzDone = true;
  try{ if(window.bzPing) window.bzPing(BZ_SLUG, "completed"); }catch(e){}
}

function calc(){
  var code = $("rc-currency").value;
  var income = num("rc-income", 0);
  var expenses = num("rc-expenses", 0);
  var hrsWeek = num("rc-hours", 30);
  var weeksOff = num("rc-weeks-off", 4);
  if(weeksOff > 52) weeksOff = 52;

  var billableWeeks = 52 - weeksOff;
  var billableHrs = hrsWeek * billableWeeks;
  var rate = billableHrs > 0 ? (income + expenses) / billableHrs : 0;

  /* "completed" = a real result produced: target income entered and a rate calculated (once per page) */
  if(income > 0 && rate > 0) bzDone();
  $("rc-rate").textContent = money(rate, code);
  $("rc-per-day").textContent = money(rate * 8, code);
  $("rc-per-week").textContent = money(rate * hrsWeek, code);
  $("rc-formula").textContent =
    "(" + money(income, code) + " + " + money(expenses, code) + ") ÷ " +
    billableHrs.toLocaleString("en-US") + " hrs";
}

document.addEventListener("DOMContentLoaded", function(){

  var cur = $("rc-currency");
  try{
    if(typeof CURRENCIES !== "undefined"){
      cur.innerHTML = CURRENCIES.map(function(c){
        return '<option value="' + c[0] + '"' + (c[0]==="USD"?" selected":"") + '>' + c[0] + " " + c[1] + " — " + c[2] + "</option>";
      }).join("");
    }
  }catch(e){}

  ["rc-currency","rc-income","rc-expenses","rc-hours","rc-weeks-off"].forEach(function(id){
    $(id).addEventListener("input", function(){ bzStart(); calc(); });
  });
  calc();
});
})();
