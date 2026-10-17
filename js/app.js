/* ============================================================
   BILLZILLA app.js — 100% client-side invoice generator.
   No network calls. Draft autosaves to localStorage.
   ============================================================ */
(function(){
"use strict";

/* ---------- state ---------- */
const _docParam=String((window.BILLZILLA_DOC||new URLSearchParams(location.search).get("doc")||"invoice")).toLowerCase();
const DOC=(typeof DOC_TYPES!=="undefined"&&DOC_TYPES[_docParam])?_docParam:"invoice";
const LS_DRAFT="billzilla_draft_v1_"+DOC, LS_HIST="billzilla_history_v1", LS_COUNT="billzilla_counter_v1";

function blankItem(){return {desc:"",qty:1,rate:0,tax:0}}
function defaultState(){
  return {
    business:{name:"",address:"",email:"",phone:"",taxId:"",logo:""},
    client:{name:"",address:"",email:""},
    meta:{doc:DOC,number:nextNumber(true,DOC),date:today(),due:today(14),showDue:true,paid:false,terms:"",currency:"USD",lang:"en",template:"t-modern"},
    items:[blankItem()],
    taxMode:"none", flatTax:0, gstType:"intrastate",
    discountType:"percent", discountVal:0, shipping:0,
    notes:"", payment:""
  };
}
let S = loadDraft() || defaultState();

function today(plusDays){
  const d=new Date(); if(plusDays) d.setDate(d.getDate()+plusDays);
  return d.toISOString().slice(0,10);
}
function nextNumber(bump,doc){
  const d=(doc&&DOC_TYPES[doc])?doc:DOC, key=LS_COUNT+"_"+d, pfx=DOC_TYPES[d].prefix;
  let n=parseInt(localStorage.getItem(key)||"0",10);
  if(bump===undefined||bump){ n+=1; localStorage.setItem(key,String(n)); }
  return pfx+String(n).padStart(4,"0");
}
function loadDraft(){
  try{ const raw=localStorage.getItem(LS_DRAFT); if(!raw) return null;
    const s=JSON.parse(raw); if(!s||!Array.isArray(s.items)) return null; return s;
  }catch(e){ return null; }
}
function saveDraft(){ try{ localStorage.setItem(LS_DRAFT,JSON.stringify(S)); }catch(e){} }
let saveT=null;
function autosave(){ clearTimeout(saveT); saveT=setTimeout(saveDraft,400); }

/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function cur(){ const c=CURRENCIES.find(c=>c[0]===S.meta.currency); return c?c[1]:"$"; }
function fmt(n){ n=Number(n)||0; return cur()+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function L(){ return LANGUAGES[S.meta.lang]||LANGUAGES.en; }

/* ---------- totals ---------- */
function calc(){
  let sub=0, taxTotal=0, cgst=0, sgst=0, igst=0;
  const lines=S.items.map(it=>{
    const qty=Number(it.qty)||0, rate=Number(it.rate)||0;
    const amt=qty*rate; sub+=amt;
    let t=0;
    if(S.taxMode==="perline"){ t=amt*(Number(it.tax)||0)/100; taxTotal+=t; }
    else if(S.taxMode==="gst"){
      const g=amt*(Number(it.tax)||0)/100;
      if(S.gstType==="intrastate"){ cgst+=g/2; sgst+=g/2; } else { igst+=g; }
      taxTotal+=g; t=g;
    }
    return {it,amt,t};
  });
  if(S.taxMode==="flat"){ taxTotal=sub*(Number(S.flatTax)||0)/100; }
  let disc=0;
  if(S.discountType==="percent") disc=sub*(Number(S.discountVal)||0)/100;
  else disc=Number(S.discountVal)||0;
  const ship=Number(S.shipping)||0;
  const total=Math.max(0,sub-disc+taxTotal+ship);
  return {lines,sub,taxTotal,cgst,sgst,igst,disc,ship,total};
}

/* ---------- preview render ---------- */
function renderPreview(){
  const sheet=$("invoice-sheet"); if(!sheet) return;
  const t=L(), c=calc(), tpl=S.meta.template;
  const doc=(S.meta.doc&&DOC_TYPES[S.meta.doc])?S.meta.doc:"invoice";
  const docTitle=doc==="invoice"?t.invoice:(t[doc]||t.invoice);
  const docNo=doc==="invoice"?t.invoiceNo:(t[doc+"No"]||t.invoiceNo);
  sheet.className="invoice-sheet "+tpl;
  sheet.dir=t.rtl?"rtl":"ltr";
  const logo=S.business.logo?`<div class="inv-logo"><img src="${esc(S.business.logo)}" alt="logo"></div>`:"";
  const rows=c.lines.map(({it,amt})=>{
    const taxCell=(S.taxMode==="perline"||S.taxMode==="gst")?`<td class="num">${esc(it.tax||0)}%</td>`:"";
    return `<tr><td>${esc(it.desc)||"—"}</td><td class="num">${esc(it.qty)}</td><td class="num">${fmt(it.rate)}</td>${taxCell}<td class="num">${fmt(amt)}</td></tr>`;
  }).join("");
  const taxHead=(S.taxMode==="perline"||S.taxMode==="gst")?`<th class="num">${t.tax} %</th>`:"";
  let taxRows="";
  if(S.taxMode==="gst"&&S.gstType==="intrastate"&&(c.cgst>0)){
    taxRows=`<div class="trow"><span>CGST</span><span>${fmt(c.cgst)}</span></div><div class="trow"><span>SGST</span><span>${fmt(c.sgst)}</span></div>`;
  }else if(S.taxMode==="gst"&&S.gstType!=="intrastate"&&(c.igst>0)){
    taxRows=`<div class="trow"><span>IGST</span><span>${fmt(c.igst)}</span></div>`;
  }else if(c.taxTotal>0){
    const lbl=S.taxMode==="flat"?`${t.taxTotal} (${esc(S.flatTax)}%)`:t.taxTotal;
    taxRows=`<div class="trow"><span>${lbl}</span><span>${fmt(c.taxTotal)}</span></div>`;
  }
  const b=S.business, cl=S.client;
  sheet.innerHTML=`
    ${(doc==="invoice"&&S.meta.paid)?`<div class="inv-paid-stamp">PAID</div>`:""}
    <div class="inv-topbar">
    <div class="inv-head">
      <div>${logo}<div class="inv-title">${docTitle}</div></div>
      <div class="inv-meta">
        <div><strong>${docNo}</strong> ${esc(S.meta.number)}</div>
        <div><strong>${t.date}:</strong> ${esc(S.meta.date)}</div>
        ${S.meta.showDue!==false?`<div><strong>${t.dueDate}:</strong> ${esc(S.meta.due)}</div>`:""}
      </div>
    </div>
    </div>
    <div class="inv-parties">
      <div class="inv-party"><h4>${t.from}</h4>
        <div class="pname">${esc(b.name)||"Your Business"}</div>
        <div>${esc(b.address).replace(/\n/g,"<br>")}</div>
        ${b.email?`<div>${esc(b.email)}</div>`:""}${b.phone?`<div>${esc(b.phone)}</div>`:""}${b.taxId?`<div>${esc(b.taxId)}</div>`:""}
      </div>
      <div class="inv-party"><h4>${t.billTo}</h4>
        <div class="pname">${esc(cl.name)||"Client"}</div>
        <div>${esc(cl.address).replace(/\n/g,"<br>")}</div>
        ${cl.email?`<div>${esc(cl.email)}</div>`:""}
      </div>
    </div>
    <table class="inv-table">
      <thead><tr><th>${t.description}</th><th class="num">${t.qty}</th><th class="num">${t.rate}</th>${taxHead}<th class="num">${t.amount}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="inv-totals">
      <div class="trow"><span>${t.subtotal}</span><span>${fmt(c.sub)}</span></div>
      ${c.disc>0?`<div class="trow"><span>${t.discount}</span><span>−${fmt(c.disc)}</span></div>`:""}
      ${c.ship>0?`<div class="trow"><span>${t.shipping}</span><span>${fmt(c.ship)}</span></div>`:""}
      ${taxRows}
      <div class="trow grand"><span>${t.totalDue}</span><span>${fmt(c.total)}</span></div>
    </div>
    ${S.meta.terms?`<div class="inv-notes"><h4>${t.paymentTerms}</h4><div>${esc(S.meta.terms).replace(/\n/g,"<br>")}</div></div>`:""}
    ${S.notes?`<div class="inv-notes"><h4>${t.notes}</h4><div>${esc(S.notes).replace(/\n/g,"<br>")}</div></div>`:""}
    ${S.payment?`<div class="inv-pay"><h4>${t.paymentDetails}</h4><div>${esc(S.payment).replace(/\n/g,"<br>")}</div></div>`:""}
    <div class="inv-foot">${t.thankYou} · ${esc(b.name)}</div>`;
}

/* ---------- form render ---------- */
function toggleDueInput(){
  const sd=$("m-show-due"), di=$("m-due");
  if(sd&&di){ di.style.display=sd.checked?"":"none"; }
}
function renderItems(){
  const box=$("items-box"); if(!box) return;
  const showTax=(S.taxMode==="perline"||S.taxMode==="gst");
  box.innerHTML="";
  S.items.forEach((it,i)=>{
    const row=document.createElement("div");
    row.className="item-row";
    row.innerHTML=`
      <div class="field"><label>Description</label><input data-k="desc" data-i="${i}" value="${esc(it.desc)}" placeholder="Service or product"></div>
      <div class="field"><label>Qty</label><input data-k="qty" data-i="${i}" type="number" min="0" step="any" value="${esc(it.qty)}"></div>
      <div class="field"><label>Rate</label><input data-k="rate" data-i="${i}" type="number" min="0" step="any" value="${esc(it.rate)}"></div>
      ${showTax?`<div class="field"><label>Tax %</label><input data-k="tax" data-i="${i}" type="number" min="0" step="any" value="${esc(it.tax)}"></div>`:""}
      <button class="icon-btn" data-del="${i}" title="Remove">×</button>`;
    box.appendChild(row);
  });
  box.querySelectorAll("input").forEach(inp=>{
    inp.addEventListener("input",e=>{
      const i=+e.target.dataset.i, k=e.target.dataset.k;
      S.items[i][k]=e.target.value; autosave(); renderPreview();
    });
  });
  box.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();
      if(S.items.length>1) S.items.splice(+btn.dataset.del,1);
      autosave(); renderItems(); renderPreview();
    });
  });
}

function renderTaxControls(){
  const box=$("tax-controls"); if(!box) return;
  let html="";
  if(S.taxMode==="flat"){
    html=`<div class="frow single"><div class="field"><label>Flat tax rate %</label><input id="flat-tax" type="number" min="0" step="any" value="${esc(S.flatTax)}"></div></div>`;
  }else if(S.taxMode==="gst"){
    html=`<div class="frow"><div class="field"><label>GST type</label><select id="gst-type">
      <option value="intrastate" ${S.gstType==="intrastate"?"selected":""}>Intra-state (CGST + SGST)</option>
      <option value="interstate" ${S.gstType==="interstate"?"selected":""}>Inter-state (IGST)</option></select></div>
      <div class="field"><label>&nbsp;</label><div class="hint">Enter GST % per line item above.</div></div></div>`;
  }
  box.innerHTML=html;
  const ft=$("flat-tax"); if(ft) ft.addEventListener("input",e=>{S.flatTax=e.target.value;autosave();renderPreview();});
  const gt=$("gst-type"); if(gt) gt.addEventListener("change",e=>{S.gstType=e.target.value;autosave();renderPreview();});
}

function renderTemplates(){
  const box=$("template-pick"); if(!box) return;
  box.innerHTML="";
  TEMPLATES.forEach(tpl=>{
    const d=document.createElement("div");
    d.className="tpl-option"+(S.meta.template===tpl.id?" sel":"");
    d.innerHTML=`<div class="swatch" style="background:${tpl.swatch}"></div><span>${tpl.name}</span>`;
    d.addEventListener("click",()=>{S.meta.template=tpl.id;autosave();renderTemplates();renderPreview();});
    box.appendChild(d);
  });
}

function fillForm(){
  const set=(id,val)=>{const el=$(id); if(el) el.value=val==null?"":val;};
  set("b-name",S.business.name); set("b-addr",S.business.address); set("b-email",S.business.email);
  set("b-phone",S.business.phone); set("b-taxid",S.business.taxId);
  set("c-name",S.client.name); set("c-addr",S.client.address); set("c-email",S.client.email);
  set("m-number",S.meta.number); set("m-date",S.meta.date); set("m-due",S.meta.due); set("m-terms",S.meta.terms);
  const sd=$("m-show-due"); if(sd){ sd.checked=S.meta.showDue!==false; toggleDueInput(); }
  const pd=$("m-paid"); if(pd){ pd.checked=!!S.meta.paid; }
  set("tax-mode",S.taxMode); set("disc-type",S.discountType); set("disc-val",S.discountVal); set("ship",S.shipping);
  set("notes",S.notes); set("pay",S.payment);
  const lp=$("logo-prev"); if(lp&&S.business.logo){lp.src=S.business.logo;lp.style.display="block";}
  const cur=$("m-currency"), lang=$("m-lang");
  if(cur){cur.innerHTML=CURRENCIES.map(c=>`<option value="${c[0]}" ${S.meta.currency===c[0]?"selected":""}>${c[0]} (${c[1]}) — ${c[2]}</option>`).join("");}
  if(lang){lang.innerHTML=Object.keys(LANGUAGES).map(k=>`<option value="${k}" ${S.meta.lang===k?"selected":""}>${LANGUAGES[k].name}</option>`).join("");}
}

function bindForm(){
  const bind=(id,fn)=>{const el=$(id); if(el) el.addEventListener("input",e=>{fn(e.target.value);autosave();renderPreview();});};
  bind("b-name",v=>S.business.name=v); bind("b-addr",v=>S.business.address=v);
  bind("b-email",v=>S.business.email=v); bind("b-phone",v=>S.business.phone=v); bind("b-taxid",v=>S.business.taxId=v);
  bind("c-name",v=>S.client.name=v); bind("c-addr",v=>S.client.address=v); bind("c-email",v=>S.client.email=v);
  bind("m-number",v=>S.meta.number=v); bind("m-date",v=>S.meta.date=v); bind("m-due",v=>S.meta.due=v); bind("m-terms",v=>S.meta.terms=v);
  bind("disc-val",v=>S.discountVal=v); bind("ship",v=>S.shipping=v);
  bind("notes",v=>S.notes=v); bind("pay",v=>S.payment=v);
  const tm=$("tax-mode"); if(tm) tm.addEventListener("change",e=>{S.taxMode=e.target.value;autosave();renderItems();renderTaxControls();renderPreview();});
  const dt=$("disc-type"); if(dt) dt.addEventListener("change",e=>{S.discountType=e.target.value;autosave();renderPreview();});
  const cu=$("m-currency"); if(cu) cu.addEventListener("change",e=>{S.meta.currency=e.target.value;autosave();renderPreview();});
  const lg=$("m-lang"); if(lg) lg.addEventListener("change",e=>{S.meta.lang=e.target.value;autosave();renderPreview();});
  const sd2=$("m-show-due"); if(sd2) sd2.addEventListener("change",e=>{S.meta.showDue=e.target.checked;toggleDueInput();autosave();renderPreview();});
  const pd2=$("m-paid"); if(pd2) pd2.addEventListener("change",e=>{S.meta.paid=e.target.checked;autosave();renderPreview();});
  const add=$("add-item"); if(add) add.addEventListener("click",e=>{e.preventDefault();S.items.push(blankItem());autosave();renderItems();renderPreview();});
  const logo=$("b-logo");
  if(logo) logo.addEventListener("change",e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{S.business.logo=ev.target.result;const lp=$("logo-prev");if(lp){lp.src=S.business.logo;lp.style.display="block";}autosave();renderPreview();};
    r.readAsDataURL(f);
  });
  const dl=$("btn-download"); if(dl) dl.addEventListener("click",()=>window.print());
  const em=$("btn-email"); if(em) em.addEventListener("click",emailInvoice);
  const sv=$("btn-save"); if(sv) sv.addEventListener("click",saveToHistory);
  const nw=$("btn-new"); if(nw) nw.addEventListener("click",()=>{ if(confirm("Start a new invoice? Your current draft will be cleared.")){ S=defaultState(); saveDraft(); fillForm(); renderItems(); renderTaxControls(); renderTemplates(); renderPreview(); renderHistory(); }});
}

/* ---------- history ---------- */
function getHist(){ try{return JSON.parse(localStorage.getItem(LS_HIST)||"[]");}catch(e){return [];} }
function setHist(h){ try{localStorage.setItem(LS_HIST,JSON.stringify(h));}catch(e){} }
function saveToHistory(){
  const h=getHist();
  h.unshift({id:Date.now(),saved:new Date().toISOString().slice(0,10),number:S.meta.number,client:S.client.name||"—",total:calc().total,currency:S.meta.currency,data:JSON.parse(JSON.stringify(S))});
  setHist(h.slice(0,50)); renderHistory();
  const b=$("btn-save"); if(b){const t=b.textContent;b.textContent="Saved ✓";setTimeout(()=>b.textContent=t,1500);}
}
function renderHistory(){
  const box=$("history-list"); if(!box) return;
  const h=getHist();
  if(!h.length){box.innerHTML=`<div class="empty-note">No saved invoices yet. Your invoices are stored only in this browser — nothing is uploaded anywhere.</div>`;return;}
  box.innerHTML="";
  h.forEach(rec=>{
    const c=CURRENCIES.find(x=>x[0]===rec.currency); const sym=c?c[1]:"$";
    const row=document.createElement("div"); row.className="hist-row";
    row.innerHTML=`<div><strong>${esc(rec.number)}</strong> · ${esc(rec.client)} <span class="hmeta">· ${esc(rec.saved)} · ${sym}${Number(rec.total).toLocaleString("en-US",{minimumFractionDigits:2})}</span></div>
      <div class="hbtns"><button class="link-btn" data-act="load">Open</button><button class="link-btn" data-act="dup">Duplicate</button><button class="link-btn red" data-act="del">Delete</button></div>`;
    row.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
      const act=b.dataset.act, hh=getHist(), ix=hh.findIndex(x=>x.id===rec.id); if(ix<0) return;
      if(act==="load"){ S=JSON.parse(JSON.stringify(hh[ix].data)); }
      else if(act==="dup"){ S=JSON.parse(JSON.stringify(hh[ix].data)); S.meta.number=nextNumber(true,S.meta.doc); }
      else if(act==="del"){ if(!confirm("Delete this saved invoice?")) return; hh.splice(ix,1); setHist(hh); renderHistory(); return; }
      saveDraft(); fillForm(); renderItems(); renderTaxControls(); renderTemplates(); renderPreview();
      document.getElementById("app").scrollIntoView({behavior:"smooth"});
    }));
    box.appendChild(row);
  });
}

/* ---------- site chrome (all pages) ---------- */
function initChrome(){
  const t=document.querySelector(".menu-toggle"), nl=document.querySelector(".nav-links");
  if(t&&nl) t.addEventListener("click",()=>nl.classList.toggle("open"));
  document.querySelectorAll(".faq-q").forEach(q=>q.addEventListener("click",()=>q.parentElement.classList.toggle("open")));
  document.querySelectorAll('[data-scroll]').forEach(a=>a.addEventListener("click",e=>{
    const el=document.querySelector(a.getAttribute("href")); if(el){e.preventDefault();el.scrollIntoView({behavior:"smooth"});}
  }));
  /* contact email: always copy on tap (mailto may do nothing if no mail app is set), let mailto proceed too */
  const ce=document.getElementById("contact-email");
  if(ce) ce.addEventListener("click",()=>{
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText("hello@billszilla.com").catch(()=>{});
    toast("Email address copied to clipboard");
  });
  /* affiliate links: single source of truth in AFFILIATE_LINKS (js/data.js) */
  window.wireAffiliateLinks=function(root){
    (root||document).querySelectorAll("a[data-aff]").forEach(function(a){
      var k=a.getAttribute("data-aff");
      if(window.AFFILIATE_LINKS&&AFFILIATE_LINKS[k]){a.href=AFFILIATE_LINKS[k];a.target="_blank";a.rel="sponsored noopener";}
    });
  };
  wireAffiliateLinks(document);
}
function toast(msg){
  let t=document.getElementById("bz-toast");
  if(!t){t=document.createElement("div");t.id="bz-toast";document.body.appendChild(t);}
  t.textContent=msg;t.classList.add("show");
  clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),2200);
}

/* ---------- email invoice via mailto ---------- */
function emailInvoice(){
  const c=calc();
  const to=(S.client.email||"").trim();
  const biz=(S.business.name||"").trim();
  const num=(S.meta.number||"").trim();
  const due=(S.meta.showDue!==false&&S.meta.due)?new Date(S.meta.due+"T12:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}):"";
  const paid=!!S.meta.paid;
  const subject="Invoice "+num+(biz?" from "+biz:"")+(paid?" — PAID":" — "+fmt(c.total)+(due?" (due "+due+")":""));
  let body="Hi "+((S.client.name||"").trim()||"there")+",\n\n";
  body+= paid
    ? "This invoice "+num+" for "+fmt(c.total)+" has been paid in full — thank you!\n"
    : "Please find attached invoice "+num+" for "+fmt(c.total)+(due?", due on "+due:"")+".\n";
  if((S.payment||"").trim()) body+="\nPayment details:\n"+S.payment.trim()+"\n";
  body+="\nThank you,\n"+(biz||"");
  window.location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  toast("Email draft opened — attach the PDF you downloaded");
}

/* ---------- "invoices generated" all-time counter ----------
   SEED MODE: shows a seeded all-time total that grows day by day and ticks up
   while the page is open, until real backend stats exist. To switch to real
   data later, replace seedAllTimeTotal() with a fetch() to your stats endpoint. */
var COUNTER_SEED_BASE = 8000; /* all-time starting number — adjust anytime */
var COUNTER_LAUNCH = new Date(2026, 9, 15); /* site launch date */
function seedAllTimeTotal(){
  var now = new Date();
  var days = Math.max(0, Math.floor((now - COUNTER_LAUNCH) / 86400000));
  var h = 0, k = "bz" + days;
  for (var i = 0; i < k.length; i++) h = ((h * 31) + k.charCodeAt(i)) >>> 0;
  var total = COUNTER_SEED_BASE + (days * 50) + (h % 180); /* grows ~50/day */
  var live = parseInt(localStorage.getItem("bz-alltime-extra") || "0", 10) || 0;
  return total + live;
}
function tickInvoiceCounter(){
  var el = document.getElementById("invoices-total");
  if (!el) return;
  el.textContent = seedAllTimeTotal().toLocaleString("en-US");
  setTimeout(function(){
    var cur = parseInt(localStorage.getItem("bz-alltime-extra") || "0", 10) || 0;
    localStorage.setItem("bz-alltime-extra", String(cur + 1 + Math.floor(Math.random() * 3)));
    tickInvoiceCounter();
  }, 5000 + Math.random() * 5000);
}

/* ---------- time tracker import ---------- */
function importTimeEntries(){
  let imp=null;
  try{ imp=JSON.parse(localStorage.getItem("billzilla_time_import_v1")||"null"); }catch(e){}
  if(!imp || !imp.length) return;
  try{ localStorage.removeItem("billzilla_time_import_v1"); }catch(e){}
  imp.forEach(function(e, i){
    var item={desc:String(e.desc||"Work"), qty:Number(e.hours)||0, rate:Number(e.rate)||0, tax:0};
    var firstBlank = S.items.length===1 && !(S.items[0].desc||"").trim() && !(Number(S.items[0].rate)||0);
    if(i===0 && firstBlank){ S.items[0]=item; }
    else { S.items.push(item); }
  });
  if(imp[0].client && !(S.client.name||"").trim()) S.client.name=String(imp[0].client);
  saveDraft(); fillForm(); renderItems(); renderPreview();
  toast("Imported "+imp.length+" time "+(imp.length===1?"entry":"entries")+" from the time tracker");
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  initChrome();
  tickInvoiceCounter();
  if(!$("invoice-sheet")) return; /* not the generator page */
  fillForm(); bindForm(); renderItems(); renderTaxControls(); renderTemplates(); renderPreview(); renderHistory();
  importTimeEntries();
});
})();
