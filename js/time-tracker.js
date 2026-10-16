/* BillsZilla time tracker — all local, no network calls. */
(function(){
"use strict";
var $ = function(id){ return document.getElementById(id); };
var LS_ENTRIES = "billzilla_time_entries_v1";
var LS_RUNNING = "billzilla_time_running_v1";
var LS_IMPORT = "billzilla_time_import_v1";

function load(k, fb){ try{ var v = JSON.parse(localStorage.getItem(k)); return v==null?fb:v; }catch(e){ return fb; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
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
function money(n, code){
  return sym(code) + Number(n).toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtDur(sec){
  sec = Math.max(0, Math.floor(sec));
  var h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  function p(n){ return (n<10?"0":"")+n; }
  return p(h)+":"+p(m)+":"+p(s);
}
function fmtDurShort(sec){
  sec = Math.max(0, Math.round(sec));
  var h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
  if(h===0) return m + "m";
  return h + "h " + (m<10?"0":"")+m + "m";
}
function fmtDate(iso){
  return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
function toast(msg){
  var t = $("bz-toast");
  if(!t){ t = document.createElement("div"); t.id = "bz-toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(function(){ t.classList.remove("show"); }, 2200);
}

var running = load(LS_RUNNING, null); /* {start, client, desc, rate} */
var tickTimer = null;

function currentElapsed(){
  if(!running) return 0;
  return (Date.now() - running.start) / 1000;
}

function renderTimer(){
  var btn = $("tt-toggle");
  if(running){
    btn.textContent = "⏹ Stop";
    btn.classList.add("stop");
    $("tt-elapsed").textContent = fmtDur(currentElapsed());
    $("tt-status").textContent = "Recording" + (running.client ? " — " + running.client : "");
    $("tt-status").classList.add("on");
  } else {
    btn.textContent = "▶ Start timer";
    btn.classList.remove("stop");
    $("tt-elapsed").textContent = "00:00:00";
    $("tt-status").textContent = "Timer stopped";
    $("tt-status").classList.remove("on");
  }
}

function renderEntries(){
  var entries = load(LS_ENTRIES, []);
  var code = $("tt-currency").value;
  var wrap = $("tt-entries");
  var totalSec = 0, totalAmt = 0;

  if(entries.length === 0){
    wrap.innerHTML = '<div class="tt-empty">No time logged yet. Start the timer above — your entries will appear here.</div>';
  } else {
    var html = '<div class="tt-row tt-head"><span>Date</span><span>Client / Task</span><span>Time</span><span>Amount</span><span></span></div>';
    entries.slice().reverse().forEach(function(e){
      var hrs = e.seconds/3600;
      var amt = hrs * e.rate;
      totalSec += e.seconds; totalAmt += amt;
      var label = (e.client ? e.client + " — " : "") + (e.desc || "Work");
      html += '<div class="tt-row"><span>' + esc(fmtDate(e.date)) + '</span>' +
        '<span class="tt-label">' + esc(label) + '</span>' +
        '<span>' + esc(fmtDurShort(e.seconds)) + '</span>' +
        '<span>' + esc(money(amt, code)) + '</span>' +
        '<span><button class="tt-del" data-id="' + e.id + '" aria-label="Delete">✕</button></span></div>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll(".tt-del").forEach(function(b){
      b.addEventListener("click", function(){
        var id = b.getAttribute("data-id");
        save(LS_ENTRIES, load(LS_ENTRIES, []).filter(function(e){ return String(e.id) !== String(id); }));
        renderEntries();
      });
    });
  }

  $("tt-total-time").textContent = fmtDurShort(totalSec);
  $("tt-total-amount").textContent = money(totalAmt, code);
  $("btn-invoice").disabled = entries.length === 0;
}

function startTick(){
  stopTick();
  tickTimer = setInterval(function(){
    if(running){ $("tt-elapsed").textContent = fmtDur(currentElapsed()); }
    else stopTick();
  }, 1000);
}
function stopTick(){ if(tickTimer){ clearInterval(tickTimer); tickTimer = null; } }

function toggleTimer(){
  if(running){
    /* stop & save entry */
    var sec = currentElapsed();
    if(sec >= 1){
      var entries = load(LS_ENTRIES, []);
      entries.push({
        id: Date.now(),
        date: new Date().toISOString(),
        client: (running.client||"").trim(),
        desc: (running.desc||"").trim(),
        seconds: Math.round(sec),
        rate: parseFloat(running.rate)||0
      });
      save(LS_ENTRIES, entries);
      toast("Logged " + fmtDurShort(sec));
    }
    running = null;
    save(LS_RUNNING, null);
    stopTick();
  } else {
    var rate = parseFloat($("tt-rate").value);
    if(isNaN(rate) || rate < 0){ toast("Enter an hourly rate first"); $("tt-rate").focus(); return; }
    running = {
      start: Date.now(),
      client: $("tt-client").value,
      desc: $("tt-desc").value,
      rate: rate
    };
    save(LS_RUNNING, running);
    save("billzilla_time_defaults_v1", {client: running.client, rate: rate, currency: $("tt-currency").value});
    startTick();
  }
  renderTimer();
  renderEntries();
}

function sendToInvoice(){
  var entries = load(LS_ENTRIES, []);
  if(!entries.length) return;
  var items = entries.map(function(e){
    var label = (e.client ? e.client + " — " : "") + (e.desc || "Work");
    return { desc: label, client: e.client || "", hours: Math.round((e.seconds/3600)*100)/100, rate: e.rate };
  });
  save(LS_IMPORT, items);
  window.location.href = "/#app";
}

document.addEventListener("DOMContentLoaded", function(){
  var t = document.querySelector(".menu-toggle"), nl = document.querySelector(".nav-links");
  if(t && nl){ t.addEventListener("click", function(){ nl.classList.toggle("open"); }); }

  var cur = $("tt-currency");
  try{
    if(typeof CURRENCIES !== "undefined"){
      cur.innerHTML = CURRENCIES.map(function(c){
        return '<option value="' + c[0] + '"' + (c[0]==="USD"?" selected":"") + '>' + c[0] + " " + c[1] + " — " + c[2] + "</option>";
      }).join("");
    }
  }catch(e){}

  /* restore defaults + running timer */
  var defs = load("billzilla_time_defaults_v1", null);
  if(defs){
    if(defs.client) $("tt-client").value = defs.client;
    if(defs.rate != null) $("tt-rate").value = defs.rate;
    if(defs.currency) cur.value = defs.currency;
  }
  if(running){
    /* resume after reload */
    $("tt-client").value = running.client || "";
    $("tt-desc").value = running.desc || "";
    $("tt-rate").value = running.rate || "";
    startTick();
    toast("Timer resumed — it kept running");
  }

  cur.addEventListener("change", renderEntries);
  $("tt-toggle").addEventListener("click", toggleTimer);
  $("btn-invoice").addEventListener("click", sendToInvoice);
  $("btn-clear").addEventListener("click", function(){
    if(load(LS_ENTRIES, []).length === 0) return;
    if(confirm("Delete all logged time entries?")){
      save(LS_ENTRIES, []);
      renderEntries();
    }
  });

  renderTimer();
  renderEntries();
});
})();
