/* BillsZilla late fee calculator — all local, no network calls.
   Modes: "month" = fixed % per month (30-day month),
          "year"  = fixed % per annum (365-day year),
          "flat"  = one fixed amount, regardless of days overdue. */
(function(){
"use strict";
var $ = function(id){ return document.getElementById(id); };
var mode = "month";

function val(id, fallback){
  var v = parseFloat(($(id).value || "").replace(/,/g,""));
  return (isNaN(v) || v < 0) ? fallback : v;
}
function fmt(n){
  return Number(n).toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
}

function calc(){
  var amount = val("lf-amount", 0);
  var days = val("lf-days", 0);
  var rate = val("lf-rate", 0);
  var fee, formula;
  if(mode === "month"){
    fee = amount * rate / 100 * (days / 30);
    formula = fmt(amount) + " × " + rate + "% per month × " + days +
      " days ÷ 30 = " + fmt(fee) + " late fee";
  } else if(mode === "year"){
    fee = amount * rate / 100 * (days / 365);
    formula = fmt(amount) + " × " + rate + "% per year × " + days +
      " days ÷ 365 = " + fmt(fee) + " late fee";
  } else {
    fee = rate;
    formula = "Flat late fee of " + fmt(fee) + " — charged once, " +
      "however many days the invoice is overdue";
  }
  var total = amount + fee;
  $("lf-amount-out").textContent = fmt(amount);
  $("lf-fee").textContent = fmt(fee);
  $("lf-total").textContent = fmt(total);
  $("lf-big").textContent = fmt(total);
  $("lf-formula").textContent = formula;
  /* highlight the preset chip matching the current mode + rate */
  var chips = document.querySelectorAll(".chip[data-rate]");
  for(var i = 0; i < chips.length; i++){
    chips[i].classList.toggle("active",
      chips[i].getAttribute("data-mode") === mode &&
      parseFloat(chips[i].getAttribute("data-rate")) === rate);
  }
}

function setMode(m){
  mode = m;
  $("lf-mode-month").classList.toggle("active", m === "month");
  $("lf-mode-year").classList.toggle("active", m === "year");
  $("lf-mode-flat").classList.toggle("active", m === "flat");
  $("lf-rate-label").textContent = m === "month" ? "Rate % per month"
    : m === "year" ? "Rate % per year" : "Flat fee amount";
  $("lf-days-wrap").style.display = m === "flat" ? "none" : "";
  $("lf-rate").value = m === "month" ? 1.5 : m === "year" ? 12 : 25;
  calc();
}

document.addEventListener("DOMContentLoaded", function(){
  var t = document.querySelector(".menu-toggle"), nl = document.querySelector(".nav-links");
  if(t && nl){ t.addEventListener("click", function(){ nl.classList.toggle("open"); }); }

  $("lf-mode-month").addEventListener("click", function(){ setMode("month"); });
  $("lf-mode-year").addEventListener("click", function(){ setMode("year"); });
  $("lf-mode-flat").addEventListener("click", function(){ setMode("flat"); });
  $("lf-amount").addEventListener("input", calc);
  $("lf-days").addEventListener("input", calc);
  $("lf-rate").addEventListener("input", calc);

  var chips = document.querySelectorAll(".chip[data-rate]");
  for(var i = 0; i < chips.length; i++){
    chips[i].addEventListener("click", function(){
      setMode(this.getAttribute("data-mode"));
      $("lf-rate").value = this.getAttribute("data-rate");
      calc();
    });
  }
  calc();
});
})();
