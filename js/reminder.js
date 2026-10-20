/* BillsZilla payment reminder generator — all local; only network call is an anonymous usage-count ping (see js/track.js). */
(function(){
"use strict";
var $ = function(id){ return document.getElementById(id); };

/* ---------- helpers ---------- */
function fmtDate(iso){
  if(!iso) return "—";
  var d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {year:"numeric", month:"long", day:"numeric"});
}
function daysOverdue(dueIso){
  if(!dueIso) return 0;
  var due = new Date(dueIso + "T12:00:00");
  var now = new Date(); now.setHours(0,0,0,0);
  return Math.max(0, Math.round((now - due) / 86400000));
}
function money(amount, cur){
  var sym = "$", code = cur || "USD";
  try{
    if(typeof CURRENCIES !== "undefined"){
      for(var i=0;i<CURRENCIES.length;i++){
        if(CURRENCIES[i][0]===cur){ sym = CURRENCIES[i][1]; break; }
      }
    }
  }catch(e){}
  var n = parseFloat(amount);
  var val = isNaN(n) ? "0.00" : n.toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
  return sym + val + " " + code;
}
function toast(msg){
  var t = $("bz-toast");
  if(!t){ t = document.createElement("div"); t.id = "bz-toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(function(){ t.classList.remove("show"); }, 2200);
}
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}

/* ---------- usage tracking (anonymous aggregate counts only) ---------- */
var BZ_SLUG = "payment-reminder";
function bzStart(){ try{ if(window.bzStarted) window.bzStarted(BZ_SLUG); }catch(e){} }
function bzDone(){ try{ if(window.bzPing) window.bzPing(BZ_SLUG, "completed"); }catch(e){} }

/* ---------- letter templates ---------- */
function buildLetter(d){
  var subject, body;
  if(d.tone === "firm"){
    subject = "Overdue: Invoice " + d.inv + " — " + d.days + " days past due";
    body =
      "Dear " + d.client + ",\n\n" +
      "I'm following up on Invoice " + d.inv + " for " + d.amount + ", issued on " + d.issued + " with a due date of " + d.due + ". It is now " + d.days + " days overdue, and I have not yet received payment.\n\n" +
      "Please arrange payment within the next 7 days:\n\n" + d.pay + "\n\n" +
      "If payment has already been made, please share the transaction reference so I can reconcile it right away. If you're facing difficulties, just let me know — I'm happy to discuss a short payment plan.\n\n" +
      (d.note ? d.note + "\n\n" : "") +
      "Regards,\n" + d.sender;
  } else if(d.tone === "final"){
    subject = "FINAL NOTICE: Invoice " + d.inv + " — " + d.days + " days overdue";
    body =
      "Dear " + d.client + ",\n\n" +
      "This is a final notice regarding Invoice " + d.inv + " for " + d.amount + ", issued on " + d.issued + " and due on " + d.due + " — now " + d.days + " days overdue despite previous reminders.\n\n" +
      "I require payment in full within 7 days of this notice:\n\n" + d.pay + "\n\n" +
      "If I do not receive payment or a written payment agreement within this period, I will have no choice but to pursue further action, which may include late fees and referral to a collections process.\n\n" +
      "I would much prefer to resolve this directly — please contact me immediately.\n\n" +
      (d.note ? d.note + "\n\n" : "") +
      "Regards,\n" + d.sender;
  } else {
    subject = "Friendly reminder: Invoice " + d.inv + " (" + d.amount + ") was due " + d.due;
    body =
      "Hi " + d.client + ",\n\n" +
      "I hope you're doing well. Just a friendly reminder that Invoice " + d.inv + " for " + d.amount + ", issued on " + d.issued + ", was due on " + d.due + " and appears to be unpaid.\n\n" +
      "If you've already sent the payment, please ignore this note — and thank you! Otherwise, I'd appreciate it if you could arrange payment at your earliest convenience:\n\n" + d.pay + "\n\n" +
      "If there's an issue with the invoice or you need anything from me, just reply to this message.\n\n" +
      (d.note ? d.note + "\n\n" : "") +
      "Thanks so much,\n" + d.sender;
  }
  return {subject: subject, body: body};
}

/* ---------- state ---------- */
var manualTone = false;
function collect(){
  var dueIso = $("r-due").value;
  var days = daysOverdue(dueIso);
  var tone = document.querySelector('input[name="tone"]:checked');
  tone = tone ? tone.value : "gentle";
  return {
    sender: $("r-sender").value.trim() || "Your Name",
    client: $("r-client").value.trim() || "Client",
    inv: $("r-inv").value.trim() || "INV-0001",
    amount: money($("r-amount").value, $("r-currency").value),
    issued: fmtDate($("r-issued").value),
    due: fmtDate(dueIso),
    days: days,
    pay: $("r-pay").value.trim() || "[your payment details]",
    note: $("r-note").value.trim(),
    tone: tone
  };
}
function toneName(t){ return t==="final" ? "Final notice" : t==="firm" ? "Firm follow-up" : "Friendly nudge"; }

function render(){
  var d = collect();
  var L = buildLetter(d);
  /* overdue badge */
  var badge = $("r-overdue");
  if(d.days > 0){ badge.textContent = d.days + (d.days===1?" day":" days") + " overdue"; badge.style.display = ""; }
  else { badge.style.display = "none"; }
  /* letter preview */
  var html =
    '<div class="letter-subject"><span>Subject:</span> ' + esc(L.subject) + '</div>' +
    '<div class="letter-body">' + esc(L.body).replace(/\n/g, "<br>") + '</div>' +
    '<div class="letter-meta"><span class="tone-tag tone-' + d.tone + '">' + toneName(d.tone) + '</span>' +
    '<span class="letter-date">' + esc(new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})) + '</span></div>';
  $("letter-sheet").innerHTML = html;
  return L;
}

/* ---------- actions ---------- */
function doCopy(){
  bzDone(); /* "completed" = reminder letter copied for sending */
  var L = render();
  var text = "Subject: " + L.subject + "\n\n" + L.body;
  function done(){ toast("Reminder copied — paste it into your email"); }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done, function(){ fallbackCopy(text); done(); });
  } else { fallbackCopy(text); done(); }
}
function fallbackCopy(text){
  var ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); }catch(e){}
  document.body.removeChild(ta);
}
function doEmail(){
  bzDone(); /* "completed" = reminder opened in email */
  var L = render();
  var href = "mailto:?subject=" + encodeURIComponent(L.subject) + "&body=" + encodeURIComponent(L.body);
  window.location.href = href;
}
function doPrint(){ bzDone(); window.print(); } /* "completed" = reminder printed */

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", function(){
  /* mobile menu */
  var t = document.querySelector(".menu-toggle"), nl = document.querySelector(".nav-links");
  if(t && nl){ t.addEventListener("click", function(){ nl.classList.toggle("open"); }); }

  /* currency select */
  var cur = $("r-currency");
  try{
    if(typeof CURRENCIES !== "undefined"){
      cur.innerHTML = CURRENCIES.map(function(c){
        return '<option value="' + c[0] + '"' + (c[0]==="USD"?" selected":"") + '>' + c[0] + " " + c[1] + " — " + c[2] + "</option>";
      }).join("");
    }
  }catch(e){}

  /* sensible defaults: issued 30 days ago, due 14 days ago */
  var today = new Date();
  function iso(d){ return d.toISOString().slice(0,10); }
  var issued = new Date(today); issued.setDate(issued.getDate() - 30);
  var due = new Date(today); due.setDate(due.getDate() - 14);
  $("r-issued").value = iso(issued);
  $("r-due").value = iso(due);

  /* auto-pick tone from overdue days until user picks manually */
  $("r-due").addEventListener("change", function(){
    if(manualTone) return;
    var days = daysOverdue($("r-due").value);
    var v = days >= 45 ? "final" : days >= 15 ? "firm" : "gentle";
    var r = document.querySelector('input[name="tone"][value="' + v + '"]');
    if(r) r.checked = true;
    render();
  });
  var tones = document.querySelectorAll('input[name="tone"]');
  tones.forEach(function(r){
    r.addEventListener("change", function(){ manualTone = true; bzStart(); render(); });
  });

  /* live re-render — first edit also counts the tool as "started" (once) */
  ["r-sender","r-client","r-inv","r-amount","r-currency","r-issued","r-due","r-pay","r-note"].forEach(function(id){
    var el = $(id);
    if(el) el.addEventListener("input", function(){ bzStart(); render(); });
  });

  $("btn-copy").addEventListener("click", doCopy);
  $("btn-email").addEventListener("click", doEmail);
  $("btn-print").addEventListener("click", doPrint);

  render();
});
})();
