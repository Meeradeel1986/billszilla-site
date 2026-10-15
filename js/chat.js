/* BillsZilla Assistant — free rule-based FAQ chat widget. No backend, no tracking. */
(function(){
"use strict";
var EMAIL="hello@billszilla.com";

var KB=[
 {k:["free","cost","price","charge","pay","subscription"],q:"Is BillsZilla really free?",
  a:"Yes — BillsZilla is 100% free. No signup, no watermark, no limits on invoices."},
 {k:["pdf","download","save as pdf","print"],q:"How do I download my invoice as PDF?",
  a:"Click <b>Download PDF</b> in the toolbar, then choose <b>Save as PDF</b> in the print dialog that opens."},
 {k:["private","privacy","data","safe","secure","server","upload"],q:"Is my data private?",
  a:"Yes. Everything you type stays in your own browser — there are no servers and no accounts, so your data never leaves your device."},
 {k:["tax","vat","gst","cgst","sgst","igst"],q:"How do I add tax?",
  a:"In the Totals section you can add a flat tax rate, per-line tax rates, or a CGST+SGST / IGST split."},
 {k:["discount"],q:"How do I add a discount?",
  a:"Set a percentage discount in the Totals section — it applies to the subtotal before tax. You can also add a shipping charge there."},
 {k:["logo"],q:"How do I add my business logo?",
  a:"Under Business details, use the logo upload — your logo appears at the top of the invoice."},
 {k:["save","history","draft","autosave","auto-save"],q:"Does it save my work?",
  a:"Yes — your draft auto-saves in this browser as you type, and every invoice you save is kept in History under the preview."},
 {k:["number","numbering","inv-"],q:"How does invoice numbering work?",
  a:"Numbering starts at INV-0001 (QUO-0001 for quotes, RCP-0001 for receipts, PRO-0001 for proformas) and increments automatically each time you create a new one."},
 {k:["quote","estimate"],q:"What is a quote?",
  a:"A quote (estimate) tells a client the expected price <i>before</i> work starts. Try the <a href=\"/quote.html\">free quote generator</a>."},
 {k:["receipt"],q:"What is a receipt?",
  a:"A receipt confirms payment was received <i>after</i> the client pays. Try the <a href=\"/receipt.html\">free receipt generator</a>."},
 {k:["proforma"],q:"What is a proforma invoice?",
  a:"A proforma is a preliminary bill sent before work is done or payment is due — common for customs and advance payments. Try the <a href=\"/proforma.html\">free proforma generator</a>."},
 {k:["difference","vs","invoice vs"],q:"Invoice vs quote vs receipt — what's the difference?",
  a:"Quote = price before work. Invoice = request for payment after work. Receipt = proof of payment. <a href=\"/blog/invoice-vs-quote-vs-receipt.html\">Read the full guide</a>."},
 {k:["currency","currencies","dollar","euro","pound"],q:"Which currencies are supported?",
  a:"50+ currencies — change it in the invoice settings at any time."},
 {k:["language","languages","urdu","arabic","rtl","spanish","french"],q:"Which languages are supported?",
  a:"8 languages, including Urdu and Arabic with full right-to-left layout. Change it in the invoice settings."},
 {k:["template","design","theme","look"],q:"Can I change the invoice design?",
  a:"Yes — pick from 6 professional templates (Modern, Classic, Minimal, Bold, Fresh, Mono) in the Templates row above the preview."},
 {k:["watermark"],q:"Is there a watermark?",
  a:"No watermark, ever — not even on the free plan, because there is no paid plan."},
 {k:["signup","sign up","account","login","register"],q:"Do I need an account?",
  a:"No accounts, no signup, no login — everything works instantly in your browser."},
 {k:["mobile","phone","android","iphone"],q:"Does it work on my phone?",
  a:"Yes — BillsZilla is fully mobile-friendly. You can create and download invoices right from your phone's browser."},
 {k:["lost","deleted","disappeared","gone","clear","cleared"],q:"My saved invoices disappeared!",
  a:"Invoices live only in your browser — clearing browser data or switching devices erases them. Tip: download important invoices as PDF for backup."},
 {k:["internet","offline","connection"],q:"Do I need the internet?",
  a:"Yes, you need an internet connection to load and use BillsZilla."},
 {k:["human","person","support","contact","email","help me"],q:"How do I contact support?",
  a:"Email us at <a href=\"mailto:"+EMAIL+"\">"+EMAIL+"</a> — we aim to reply within 2 business days."},
 {k:["accounting","software","freshbooks","quickbooks","xero","bookkeeping"],q:"Which accounting software do you recommend?",
  a:"For full accounting beyond invoicing, we recommend <a data-aff=\"freshbooks\" href=\"#\">FreshBooks</a> and <a data-aff=\"quickbooks\" href=\"#\">QuickBooks</a> — see our <a href=\"/#recommended\">recommended tools</a>."},
 {k:["hello","hi","salam","hey"],q:"Hello!",
  a:"Hello! Ask me anything about creating invoices, quotes, receipts, or proformas with BillsZilla."},
 {k:["thank","thanks","shukriya"],q:"Thanks!",
  a:"You're welcome! Good luck with your invoicing."}
];

var CHIPS=["Is it really free?","How do I save as PDF?","Is my data private?"];

var css=[
"#bz-chat-btn{position:fixed;right:18px;bottom:18px;width:56px;height:56px;border-radius:50%;border:0;background:#059669;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 6px 20px rgba(5,150,105,.4);z-index:9990;display:flex;align-items:center;justify-content:center}",
"#bz-chat-btn:hover{background:#047857}",
"#bz-chat-panel{position:fixed;right:18px;bottom:86px;width:min(360px,calc(100vw - 36px));height:min(520px,calc(100vh - 120px));background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);z-index:9990;display:none;flex-direction:column;overflow:hidden;font-family:inherit}",
"#bz-chat-panel.open{display:flex}",
".bz-chat-head{background:#059669;color:#fff;padding:12px 14px;display:flex;justify-content:space-between;align-items:center}",
".bz-chat-head strong{display:block;font-size:15px}.bz-chat-head span{font-size:12px;opacity:.85}",
"#bz-chat-close{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}",
"#bz-chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;background:#f8fafc}",
".bz-msg{max-width:85%;padding:9px 12px;border-radius:12px;font-size:14px;line-height:1.45}",
".bz-msg.bot{background:#fff;border:1px solid #e2e8f0;color:#0f172a;border-bottom-left-radius:4px;align-self:flex-start}",
".bz-msg.bot a{color:#059669}",
".bz-msg.user{background:#059669;color:#fff;border-bottom-right-radius:4px;align-self:flex-end}",
"#bz-chat-chips{display:flex;gap:6px;padding:8px 12px;flex-wrap:wrap;background:#f8fafc;border-top:1px solid #e2e8f0}",
"#bz-chat-chips button{background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;font-size:12px;border-radius:20px;padding:6px 10px;cursor:pointer}",
".bz-chat-input{display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid #e2e8f0}",
"#bz-chat-text{flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:9px 12px;font-size:14px;outline:none}",
"#bz-chat-send{background:#059669;color:#fff;border:0;border-radius:10px;padding:0 16px;font-size:16px;cursor:pointer}",
"@media print{#bz-chat-btn,#bz-chat-panel{display:none!important}}"
].join("\n");

function answerFor(text){
  var t=text.toLowerCase(),best=null,bestScore=0;
  for(var i=0;i<KB.length;i++){
    var s=0,ks=KB[i].k;
    for(var j=0;j<ks.length;j++){ if(t.indexOf(ks[j])!==-1) s+=ks[j].length>4?2:1; }
    if(s>bestScore){bestScore=s;best=KB[i];}
  }
  if(best&&bestScore>0) return best.a;
  return "I can answer questions about using BillsZilla — try one of the suggestions, or email <a href=\"mailto:"+EMAIL+"\">"+EMAIL+"</a> for anything else.";
}

function addMsg(html,who){
  var box=document.getElementById("bz-chat-msgs");
  var d=document.createElement("div");
  d.className="bz-msg "+who;d.innerHTML=html;
  box.appendChild(d);box.scrollTop=box.scrollHeight;
  if(window.wireAffiliateLinks) wireAffiliateLinks(d);
}
function botSay(html){ setTimeout(function(){addMsg(html,"bot");},350); }
function ask(text){
  if(!text.trim())return;
  addMsg(text.replace(/</g,"&lt;"),"user");
  document.getElementById("bz-chat-text").value="";
  botSay(answerFor(text));
}

function init(){
  if(document.getElementById("bz-chat-btn"))return;
  var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
  var btn=document.createElement("button");btn.id="bz-chat-btn";btn.setAttribute("aria-label","Chat with BillsZilla Assistant");btn.innerHTML="💬";
  var panel=document.createElement("div");panel.id="bz-chat-panel";
  panel.innerHTML='<div class="bz-chat-head"><div><strong>BillsZilla Assistant</strong><span>Instant answers</span></div><button id="bz-chat-close" aria-label="Close">×</button></div>'+
    '<div id="bz-chat-msgs"></div><div id="bz-chat-chips"></div>'+
    '<div class="bz-chat-input"><input id="bz-chat-text" placeholder="Ask a question…" autocomplete="off"><button id="bz-chat-send" aria-label="Send">➤</button></div>';
  document.body.appendChild(btn);document.body.appendChild(panel);
  var greeted=false;
  function toggle(force){
    var open=typeof force==="boolean"?force:!panel.classList.contains("open");
    panel.classList.toggle("open",open);
    if(open&&!greeted){greeted=true;botSay("Hi! I'm the BillsZilla Assistant. Ask me anything about invoices, quotes, receipts, or proformas.");}
    if(open)setTimeout(function(){document.getElementById("bz-chat-text").focus();},100);
  }
  btn.addEventListener("click",function(){toggle();});
  panel.querySelector("#bz-chat-close").addEventListener("click",function(){toggle(false);});
  var chips=document.getElementById("bz-chat-chips");
  CHIPS.forEach(function(c){var b=document.createElement("button");b.textContent=c;b.addEventListener("click",function(){ask(c);});chips.appendChild(b);});
  function send(){ask(document.getElementById("bz-chat-text").value);}
  panel.querySelector("#bz-chat-send").addEventListener("click",send);
  panel.querySelector("#bz-chat-text").addEventListener("keydown",function(e){if(e.key==="Enter")send();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
