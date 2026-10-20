/* BillsZilla VAT / GST / sales tax calculator — all local, no network calls. */
(function(){
"use strict";
var $ = function(id){ return document.getElementById(id); };
var mode = "add"; /* "add": amount is net, add tax on top · "remove": amount is gross, extract the tax */

function val(id, fallback){
  var v = parseFloat(($(id).value || "").replace(/,/g,""));
  return (isNaN(v) || v < 0) ? fallback : v;
}
function fmt(n){
  return Number(n).toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
}

function calc(){
  var amount = val("tc-amount", 0);
  var rate = val("tc-rate", 0);
  var net, tax, gross;
  if(mode === "add"){
    net = amount;
    tax = amount * rate / 100;
    gross = amount + tax;
  } else {
    gross = amount;
    net = rate > -100 ? amount / (1 + rate / 100) : amount;
    tax = gross - net;
  }
  $("tc-net").textContent = fmt(net);
  $("tc-tax").textContent = fmt(tax);
  $("tc-gross").textContent = fmt(gross);
  $("tc-big").textContent = fmt(mode === "add" ? gross : net);
  $("tc-big-label").textContent = mode === "add" ? "total including tax" : "amount before tax";
  $("tc-formula").textContent = mode === "add"
    ? fmt(net) + " + " + fmt(tax) + " tax (" + rate + "%) = " + fmt(gross)
    : fmt(gross) + " includes " + fmt(tax) + " tax (" + rate + "%) — net is " + fmt(net);
  /* highlight the preset chip matching the current rate */
  var chips = document.querySelectorAll(".chip[data-rate]");
  for(var i = 0; i < chips.length; i++){
    chips[i].classList.toggle("active", parseFloat(chips[i].getAttribute("data-rate")) === rate);
  }
}

function setMode(m){
  mode = m;
  $("tc-mode-add").classList.toggle("active", m === "add");
  $("tc-mode-remove").classList.toggle("active", m === "remove");
  $("tc-amount-label").textContent = m === "add" ? "Amount (before tax)" : "Amount (tax included)";
  calc();
}

document.addEventListener("DOMContentLoaded", function(){
  var t = document.querySelector(".menu-toggle"), nl = document.querySelector(".nav-links");
  if(t && nl){ t.addEventListener("click", function(){ nl.classList.toggle("open"); }); }

  $("tc-mode-add").addEventListener("click", function(){ setMode("add"); });
  $("tc-mode-remove").addEventListener("click", function(){ setMode("remove"); });
  $("tc-amount").addEventListener("input", calc);
  $("tc-rate").addEventListener("input", calc);

  var chips = document.querySelectorAll(".chip[data-rate]");
  for(var i = 0; i < chips.length; i++){
    chips[i].addEventListener("click", function(){
      $("tc-rate").value = this.getAttribute("data-rate");
      calc();
    });
  }
  calc();
});
})();
