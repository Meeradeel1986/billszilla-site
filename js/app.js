/* ============================================================
   BILLZILLA app.js — 100% client-side invoice generator.
   Invoice data never leaves the browser; the only network call
   is an anonymous usage-count ping (see js/track.js).
   Draft autosaves to localStorage.
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
    business:{name:"",address:"",email:"",phone:"",taxId:"",logo:"",signature:""},
    client:{name:"",address:"",email:""},
    meta:{doc:DOC,number:nextNumber(true,DOC),date:today(),due:today(14),showDue:true,paid:false,terms:"",currency:"USD",lang:"en",template:"t-classic",po:"",qr:false,qrText:""},
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

/* ---------- amount in words (English) ---------- */
const CURR_WORDS={
  USD:["Dollar","Dollars","Cent","Cents"],EUR:["Euro","Euros","Cent","Cents"],
  GBP:["Pound","Pounds","Penny","Pence"],PKR:["Rupee","Rupees","Paisa","Paise"],
  INR:["Rupee","Rupees","Paisa","Paise"],AED:["Dirham","Dirhams","Fils","Fils"],
  SAR:["Riyal","Riyals","Halala","Halalas"],BDT:["Taka","Takas","Paisa","Paise"],
  PHP:["Peso","Pesos","Centavo","Centavos"],CAD:["Dollar","Dollars","Cent","Cents"],
  AUD:["Dollar","Dollars","Cent","Cents"],NZD:["Dollar","Dollars","Cent","Cents"],
  CHF:["Franc","Francs","Centime","Centimes"],JPY:["Yen","Yen","Sen","Sen"],
  CNY:["Yuan","Yuan","Fen","Fen"],SGD:["Dollar","Dollars","Cent","Cents"],
  HKD:["Dollar","Dollars","Cent","Cents"],MYR:["Ringgit","Ringgits","Sen","Sen"]
};
function currWords(code){
  if(CURR_WORDS[code]) return CURR_WORDS[code];
  const c=(typeof CURRENCIES!=="undefined"?CURRENCIES.find(x=>x[0]===code):null);
  const nm=c?c[2]:"Dollar";
  return [nm,nm+"s","Cent","Cents"];
}
const _ONES=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const _TENS=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function _twoW(n){return n<20?_ONES[n]:_TENS[Math.floor(n/10)]+(n%10?" "+_ONES[n%10]:"");}
function _threeW(n){const h=Math.floor(n/100),r=n%100;return (h?_ONES[h]+" Hundred"+(r?" ":""):"")+(r?_twoW(r):"");}
function numToWords(n){
  n=Math.floor(Math.abs(n));
  if(n===0) return "Zero";
  const scales=[["Billion",1e9],["Million",1e6],["Thousand",1e3]];
  let out="";
  for(const [name,val] of scales){
    const q=Math.floor(n/val);
    if(q>0){ out+=(out?" ":"")+_threeW(q)+" "+name; n%=val; }
  }
  if(n>0) out+=(out?" ":"")+_threeW(n);
  return out;
}
function amountInWords(total,code){
  if(total==null||isNaN(total)) return "";
  const neg=total<0; total=Math.abs(Math.round(total*100)/100);
  const intP=Math.floor(total), fracP=Math.round((total-intP)*100);
  const [u,up,su,sup]=currWords(code);
  let s=numToWords(intP)+" "+(intP===1?u:up);
  if(fracP>0) s+=" and "+numToWords(fracP)+" "+(fracP===1?su:sup);
  return (neg?"Minus ":"")+s+" Only";
}

/* ---------- payment QR code ---------- */
function qrImg(t){
  if(!S.meta.qr||typeof qrcode==="undefined") return "";
  const txt=((S.meta.qrText||"").trim()||(S.payment||"").trim());
  if(!txt) return "";
  try{
    const q=qrcode(0,"M"); q.addData(txt); q.make();
    return `<div class="inv-qr"><img src="${q.createDataURL(4,6)}" alt="QR code"><div>${t.scanToPay}</div></div>`;
  }catch(e){ return ""; }
}
function toggleQrWrap(){
  const w=$("qr-text-wrap"); if(w) w.style.display=(S.meta.qr?"":"none");
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

/* ---------- usage tracking (anonymous aggregate counts only) ---------- */
function bzStart(){ try{ if(window.bzStarted) window.bzStarted(DOC); }catch(e){} }
function bzDone(){ try{ if(window.bzPing) window.bzPing(DOC,"completed"); }catch(e){} }

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
  if(tpl==="t-classic"){ renderZohoClassic(sheet); return; }
  const words=(S.meta.lang==="en")?amountInWords(c.total,S.meta.currency):"";
  const qr=qrImg(t);
  const sigHtml=S.business.signature?`<div class="inv-sig"><img src="${esc(S.business.signature)}" alt="signature"><div class="sig-cap">${t.authSig}</div></div>`:"";
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
    <div class="inv-topbar">
    <div class="inv-head">
      <div>${logo}<div class="inv-title">${docTitle}</div></div>
      <div class="inv-meta">
        <div><strong>${docNo}</strong> ${esc(S.meta.number)}</div>
        ${S.meta.po?`<div><strong>${t.poNo}:</strong> ${esc(S.meta.po)}</div>`:""}
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
      ${(doc==="invoice"&&S.meta.paid)?`<div class="inv-paid-wrap"><div class="inv-paid-stamp">PAID</div></div>`:""}
    </div>
    ${words?`<div class="inv-words"><strong>${t.amtWords}:</strong> ${esc(words)}</div>`:""}
    ${sigHtml}
    ${S.meta.terms?`<div class="inv-notes"><h4>${t.paymentTerms}</h4><div>${esc(S.meta.terms).replace(/\n/g,"<br>")}</div></div>`:""}
    ${S.notes?`<div class="inv-notes"><h4>${t.notes}</h4><div>${esc(S.notes).replace(/\n/g,"<br>")}</div></div>`:""}
    ${(S.payment||qr)?`<div class="inv-pay"><h4>${t.paymentDetails}</h4><div class="inv-pay-flex">${S.payment?`<div>${esc(S.payment).replace(/\n/g,"<br>")}</div>`:""}${qr}</div></div>`:""}
    <div class="inv-foot">${t.thankYou} · ${esc(b.name)}</div>`;
}

/* ---------- template: classic — clean Zoho-style layout ---------- */
function renderZohoClassic(sheet){
  const t=L(), c=calc();
  const doc=(S.meta.doc&&DOC_TYPES[S.meta.doc])?S.meta.doc:"invoice";
  const docTitle=(doc==="invoice"?t.invoice:(t[doc]||t.invoice)).toUpperCase();
  const docNoLbl=doc==="invoice"?t.invoiceNo:(t[doc+"No"]||t.invoiceNo);
  const b=S.business, cl=S.client;
  const logo=b.logo?`<div class="inv-zlogo"><img src="${esc(b.logo)}" alt=""></div>`:"";
  const bizLines=[b.address,b.email,b.phone,b.taxId].filter(x=>(x||"").trim()).map(x=>esc(x).replace(/\n/g,"<br>")).join("<br>");
  const clLines=[cl.address,cl.email].filter(x=>(x||"").trim()).map(x=>esc(x).replace(/\n/g,"<br>")).join("<br>");
  const taxHead=(S.taxMode==="perline"||S.taxMode==="gst")?`<th class="num">${t.tax}</th>`:"";
  const rows=c.lines.map(({it,amt},i)=>{
    const taxCell=(S.taxMode==="perline"||S.taxMode==="gst")?`<td class="num">${esc(it.tax||0)}%</td>`:"";
    return `<tr><td class="zn">${i+1}</td><td><div class="zitem">${esc(it.desc)||"—"}</div></td><td class="num">${esc(it.qty)}</td><td class="num">${fmt(it.rate)}</td>${taxCell}<td class="num">${fmt(amt)}</td></tr>`;
  }).join("");
  let taxRows="";
  if(S.taxMode==="gst"&&S.gstType==="intrastate"&&(c.cgst>0)){
    taxRows=`<div class="trow"><span>CGST</span><span>${fmt(c.cgst)}</span></div><div class="trow"><span>SGST</span><span>${fmt(c.sgst)}</span></div>`;
  }else if(S.taxMode==="gst"&&S.gstType!=="intrastate"&&(c.igst>0)){
    taxRows=`<div class="trow"><span>IGST</span><span>${fmt(c.igst)}</span></div>`;
  }else if(c.taxTotal>0){
    const lbl=S.taxMode==="flat"?`${t.taxTotal} (${esc(S.flatTax)}%)`:t.taxTotal;
    taxRows=`<div class="trow"><span>${lbl}</span><span>${fmt(c.taxTotal)}</span></div>`;
  }
  const balLbl=doc==="invoice"?t.balanceDue:t.total;
  const words=(S.meta.lang==="en")?amountInWords(c.total,S.meta.currency):"";
  const qr=qrImg(t);
  const sigHtml=S.business.signature?`<div class="inv-zsig"><img src="${esc(S.business.signature)}" alt="signature"><div class="sig-cap">${t.authSig}</div></div>`:"";
  sheet.innerHTML=`
    <div class="inv-zhead">
      <div class="inv-zbrand">${logo}<div class="inv-zbiz">${esc(b.name)||"Your Business"}</div>${bizLines?`<div class="inv-zaddr">${bizLines}</div>`:""}</div>
      <div class="inv-ztitlebox">
        <div class="inv-zdoctitle">${docTitle}</div>
        <div class="inv-zdocno">${docNoLbl} ${esc(S.meta.number)}</div>
        <div class="inv-zbaltop"><span>${balLbl}</span><strong>${fmt(c.total)}</strong></div>
      </div>
    </div>
    <div class="inv-zparties">
      <div class="inv-zbillto"><div class="inv-zcap">${t.billTo}</div><div class="pname">${esc(cl.name)||"Client"}</div>${clLines?`<div>${clLines}</div>`:""}</div>
      <div class="inv-zmeta">
        <div class="zrow"><span>${t.date} :</span><b>${esc(S.meta.date)}</b></div>
        ${S.meta.showDue!==false?`<div class="zrow"><span>${t.dueDate} :</span><b>${esc(S.meta.due)}</b></div>`:""}
        ${S.meta.po?`<div class="zrow"><span>${t.poNo} :</span><b>${esc(S.meta.po)}</b></div>`:""}
      </div>
    </div>
    <table class="inv-ztable">
      <thead><tr><th class="zn">#</th><th>${t.description}</th><th class="num">${t.qty}</th><th class="num">${t.rate}</th>${taxHead}<th class="num">${t.amount}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="inv-ztotals">
      <div class="trow"><span>${t.subtotal}</span><span>${fmt(c.sub)}</span></div>
      ${c.disc>0?`<div class="trow"><span>${t.discount}</span><span>−${fmt(c.disc)}</span></div>`:""}
      ${c.ship>0?`<div class="trow"><span>${t.shipping}</span><span>${fmt(c.ship)}</span></div>`:""}
      ${taxRows}
      <div class="trow grand"><span>${t.grandTotal}</span><span>${fmt(c.total)}</span></div>
      <div class="trow baldue"><span>${balLbl}</span><span>${fmt(c.total)}</span></div>
      ${(doc==="invoice"&&S.meta.paid)?`<div class="inv-paid-wrap"><div class="inv-paid-stamp">PAID</div></div>`:""}
    </div>
    ${words?`<div class="inv-zwords"><strong>${t.amtWords}:</strong> ${esc(words)}</div>`:""}
    ${sigHtml}
    ${(S.notes||S.payment||qr)?`<div class="inv-zbottom">
      ${S.notes?`<div><h4>${t.notes}</h4><div>${esc(S.notes).replace(/\n/g,"<br>")}</div></div>`:""}
      ${(S.payment||qr)?`<div><h4>${t.paymentDetails}</h4><div class="inv-pay-flex">${S.payment?`<div>${esc(S.payment).replace(/\n/g,"<br>")}</div>`:""}${qr}</div></div>`:""}
    </div>`:""}
    ${S.meta.terms?`<div class="inv-zterms"><h4>${t.paymentTerms}</h4><div>${esc(S.meta.terms).replace(/\n/g,"<br>")}</div></div>`:""}
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
  set("m-number",S.meta.number); set("m-date",S.meta.date); set("m-due",S.meta.due); set("m-terms",S.meta.terms); set("m-po",S.meta.po);
  const qr=$("m-qr"); if(qr){qr.checked=!!S.meta.qr;} set("m-qr-text",S.meta.qrText); toggleQrWrap();
  const sd=$("m-show-due"); if(sd){ sd.checked=S.meta.showDue!==false; toggleDueInput(); }
  const pd=$("m-paid"); if(pd){ pd.checked=!!S.meta.paid; }
  set("tax-mode",S.taxMode); set("disc-type",S.discountType); set("disc-val",S.discountVal); set("ship",S.shipping);
  set("notes",S.notes); set("pay",S.payment);
  const lp=$("logo-prev"); if(lp&&S.business.logo){lp.src=S.business.logo;lp.style.display="block";}
  sigRender();
  const cur=$("m-currency"), lang=$("m-lang");
  if(cur){cur.innerHTML=CURRENCIES.map(c=>`<option value="${c[0]}" ${S.meta.currency===c[0]?"selected":""}>${c[0]} (${c[1]}) — ${c[2]}</option>`).join("");}
  if(lang){lang.innerHTML=Object.keys(LANGUAGES).map(k=>`<option value="${k}" ${S.meta.lang===k?"selected":""}>${LANGUAGES[k].name}</option>`).join("");}
}

function bindForm(){
  /* "started" = first meaningful interaction with the generator (once per page) */
  document.addEventListener("input",bzStart);
  document.addEventListener("change",bzStart);
  const bind=(id,fn)=>{const el=$(id); if(el) el.addEventListener("input",e=>{fn(e.target.value);autosave();renderPreview();});};
  bind("b-name",v=>S.business.name=v); bind("b-addr",v=>S.business.address=v);
  bind("b-email",v=>S.business.email=v); bind("b-phone",v=>S.business.phone=v); bind("b-taxid",v=>S.business.taxId=v);
  bind("c-name",v=>S.client.name=v); bind("c-addr",v=>S.client.address=v); bind("c-email",v=>S.client.email=v);
  bind("m-number",v=>S.meta.number=v); bind("m-date",v=>S.meta.date=v); bind("m-due",v=>S.meta.due=v); bind("m-terms",v=>S.meta.terms=v); bind("m-po",v=>S.meta.po=v); bind("m-qr-text",v=>S.meta.qrText=v);
  const qr2=$("m-qr"); if(qr2) qr2.addEventListener("change",e=>{S.meta.qr=e.target.checked;toggleQrWrap();autosave();renderPreview();});
  bind("disc-val",v=>S.discountVal=v); bind("ship",v=>S.shipping=v);
  bind("notes",v=>S.notes=v); bind("pay",v=>S.payment=v);
  const tm=$("tax-mode"); if(tm) tm.addEventListener("change",e=>{S.taxMode=e.target.value;autosave();renderItems();renderTaxControls();renderPreview();});
  const dt=$("disc-type"); if(dt) dt.addEventListener("change",e=>{S.discountType=e.target.value;autosave();renderPreview();});
  const cu=$("m-currency"); if(cu) cu.addEventListener("change",e=>{S.meta.currency=e.target.value;autosave();renderPreview();});
  const lg=$("m-lang"); if(lg) lg.addEventListener("change",e=>{S.meta.lang=e.target.value;autosave();renderPreview();});
  const sd2=$("m-show-due"); if(sd2) sd2.addEventListener("change",e=>{S.meta.showDue=e.target.checked;toggleDueInput();autosave();renderPreview();});
  const pd2=$("m-paid"); if(pd2) pd2.addEventListener("change",e=>{S.meta.paid=e.target.checked;autosave();renderPreview();toast(S.meta.paid?"Marked as paid — PAID stamp added":"Marked as unpaid");});
  const add=$("add-item"); if(add) add.addEventListener("click",e=>{e.preventDefault();S.items.push(blankItem());autosave();renderItems();renderPreview();});
  const logo=$("b-logo");
  if(logo) logo.addEventListener("change",e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{S.business.logo=ev.target.result;const lp=$("logo-prev");if(lp){lp.src=S.business.logo;lp.style.display="block";}autosave();renderPreview();};
    r.readAsDataURL(f);
  });
  const ssb=$("btn-save-send"); if(ssb) ssb.addEventListener("click",()=>{ if(validateInvoice()) openSendModal(); });
  const scx=$("send-cancel"); if(scx) scx.addEventListener("click",closeSendModal);
  const smd=$("send-modal"); if(smd) smd.addEventListener("click",e=>{ if(e.target===smd) closeSendModal(); });
  const swa=$("send-wa"); if(swa) swa.addEventListener("click",sendViaWhatsApp);
  const sem=$("send-em"); if(sem) sem.addEventListener("click",sendViaEmail);
  const dlp=$("btn-dl-print"), smn=$("split-menu");
  if(dlp&&smn){
    dlp.addEventListener("click",e=>{ e.stopPropagation(); smn.classList.toggle("open"); });
    document.addEventListener("click",e=>{ if(!e.target.closest(".split-wrap")) smn.classList.remove("open"); });
    const md=$("m-download"); if(md) md.addEventListener("click",async()=>{ smn.classList.remove("open"); const b=await makePdfOrToast(); if(b) downloadBlob(b,pdfFileName()); });
    const mp=$("m-print"); if(mp) mp.addEventListener("click",()=>{ smn.classList.remove("open"); if(!validateInvoice()) return; printDoc(); });
  }
  document.addEventListener("input",e=>{
    const f=e.target&&e.target.closest?e.target.closest(".field.invalid"):null;
    if(f) f.classList.remove("invalid");
  });
  const sv=$("btn-save"); if(sv) sv.addEventListener("click",saveToHistory);
  const nw=$("btn-new"); if(nw) nw.addEventListener("click",()=>{ if(confirm("Start a new invoice? Your current draft will be cleared.")){ S=defaultState(); saveDraft(); fillForm(); renderItems(); renderTaxControls(); renderTemplates(); renderPreview(); renderHistory(); }});
}

/* ---------- signature pad ---------- */
let _sigDrawing=false;
function sigRender(){
  const pad=$("sig-pad"); if(!pad) return;
  const ctx=pad.getContext("2d");
  ctx.clearRect(0,0,pad.width,pad.height);
  if(S.business.signature){
    const img=new Image();
    img.onload=()=>{const s=Math.min(pad.width/img.width,pad.height/img.height,1);const w=img.width*s,h=img.height*s;ctx.drawImage(img,(pad.width-w)/2,(pad.height-h)/2,w,h);};
    img.src=S.business.signature;
  }
}
function sigPadInit(){
  const pad=$("sig-pad"); if(!pad||pad.dataset.wired) return;
  pad.dataset.wired="1";
  const ctx=pad.getContext("2d");
  ctx.strokeStyle="#1e293b"; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineJoin="round";
  const pos=e=>{
    const r=pad.getBoundingClientRect();
    const t=(e.touches&&e.touches[0])||e;
    return [(t.clientX-r.left)*(pad.width/r.width),(t.clientY-r.top)*(pad.height/r.height)];
  };
  const start=e=>{e.preventDefault();_sigDrawing=true;const[x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);};
  const move=e=>{if(!_sigDrawing)return;e.preventDefault();const[x,y]=pos(e);ctx.lineTo(x,y);ctx.stroke();};
  const end=()=>{if(!_sigDrawing)return;_sigDrawing=false;S.business.signature=pad.toDataURL("image/png");autosave();renderPreview();};
  pad.addEventListener("mousedown",start);
  pad.addEventListener("mousemove",move);
  document.addEventListener("mouseup",end);
  pad.addEventListener("touchstart",start,{passive:false});
  pad.addEventListener("touchmove",move,{passive:false});
  pad.addEventListener("touchend",end);
  const clr=$("sig-clear");
  if(clr) clr.addEventListener("click",()=>{S.business.signature="";sigRender();autosave();renderPreview();});
  const up=$("sig-upload");
  if(up) up.addEventListener("change",e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{
      const img=new Image();
      img.onload=()=>{
        ctx.clearRect(0,0,pad.width,pad.height);
        const s=Math.min(pad.width/img.width,pad.height/img.height,1);
        const w=img.width*s,h=img.height*s;
        ctx.drawImage(img,(pad.width-w)/2,(pad.height-h)/2,w,h);
        S.business.signature=pad.toDataURL("image/png");
        autosave();renderPreview();
      };
      img.src=ev.target.result;
    };
    r.readAsDataURL(f);
  });
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

/* ---------- print with a clean document title ---------- */
function printDoc(){
  bzDone(); /* "completed" = document printed (print path bypasses PDF generation) */
  const labels={invoice:"Invoice",quote:"Quote",receipt:"Receipt",proforma:"Proforma Invoice"};
  const lbl=labels[DOC]||"Invoice";
  const oldTitle=document.title;
  document.title=lbl+" "+(S.meta.number||"")+(S.business.name?" - "+S.business.name:"").trim();
  const restore=()=>{ document.title=oldTitle; window.removeEventListener("afterprint",restore); };
  window.addEventListener("afterprint",restore);
  window.print();
  setTimeout(restore,1500);
}

/* ---------- required-field validation (no empty invoices out) ---------- */
function markInvalid(el,msg){
  const f=el.closest(".field"); if(!f) return;
  f.classList.add("invalid");
  let e=f.querySelector(".err");
  if(!e){ e=document.createElement("div"); e.className="err"; f.appendChild(e); }
  e.textContent=msg;
}
function validateInvoice(){
  document.querySelectorAll(".app-form .field.invalid").forEach(f=>f.classList.remove("invalid"));
  let ok=true, first=null;
  [["b-name","Please fill in your company's name"],
   ["c-name","Please fill in your client's name or their company name"]].forEach(([id,msg])=>{
    const el=document.getElementById(id);
    if(el&&!el.value.trim()){ markInvalid(el,msg); ok=false; first=first||el; }
  });
  const rows=[...document.querySelectorAll("#items-box .item-row")];
  const hasItem=rows.some(r=>{
    const d=r.querySelector('[data-k="desc"]');
    return d&&d.value.trim();
  });
  if(!hasItem){
    ok=false;
    const d=rows[0]&&rows[0].querySelector('[data-k="desc"]');
    if(d){ markInvalid(d,"Add at least one item with a description"); first=first||d; }
  }
  if(!ok){
    toast("Please fill in the highlighted fields");
    if(first){ first.scrollIntoView({behavior:"smooth",block:"center"}); setTimeout(()=>{try{first.focus({preventScroll:true});}catch(e){}},450); }
  }
  return ok;
}

/* ---------- real PDF generation (client-side, no server) ---------- */
function pdfFileName(){
  const doc=(S.meta.doc&&DOC_TYPES[S.meta.doc])?S.meta.doc:"invoice";
  const lbl={invoice:"Invoice",quote:"Quote",receipt:"Receipt",proforma:"Proforma Invoice"}[doc]||"Invoice";
  return lbl.replace(/\s+/g,"")+"-"+String(S.meta.number||"").replace(/[^\w-]/g,"")+".pdf";
}
function downloadBlob(blob,name){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000);
}
async function generatePdfBlob(){
  if(!window.html2canvas||!window.jspdf) throw new Error("pdf engine missing");
  const src=document.querySelector(".invoice-sheet");
  const W=src.offsetWidth;
  const clone=src.cloneNode(true);
  clone.style.boxShadow="none"; clone.style.margin="0"; clone.style.borderRadius="0";
  const holder=document.createElement("div");
  holder.style.cssText="position:fixed;left:-12000px;top:0;width:"+W+"px;background:#fff;";
  holder.appendChild(clone); document.body.appendChild(holder);
  try{
    const canvas=await window.html2canvas(clone,{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false});
    const img=canvas.toDataURL("image/png");
    const pdf=new window.jspdf.jsPDF("p","mm","a4");
    const pageW=210, pageH=297, m=10, ph=pageH-m;
    const w=pageW-m*2, h=canvas.height*w/canvas.width;
    let heightLeft=h, position=m;
    pdf.addImage(img,"PNG",m,position,w,h);
    heightLeft-= (ph-m);
    while(heightLeft>0){
      pdf.addPage();
      position=m-(h-heightLeft);
      pdf.addImage(img,"PNG",m,position,w,h);
      heightLeft-= ph;
    }
    return pdf.output("blob");
  }finally{ holder.remove(); }
}

/* ---------- shared invoice message ---------- */
function invoiceShareText(){
  const c=calc();
  const biz=(S.business.name||"").trim();
  const num=(S.meta.number||"").trim();
  const due=(S.meta.showDue!==false&&S.meta.due)?new Date(S.meta.due+"T12:00:00").toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}):"";
  const paid=!!S.meta.paid;
  let msg="Hi "+((S.client.name||"").trim()||"there")+",\n\n";
  msg+= paid
    ? "This invoice "+num+" for "+fmt(c.total)+" has been paid in full — thank you!\n"
    : "Please find attached invoice "+num+" for "+fmt(c.total)+(due?", due on "+due:"")+".\n";
  if((S.payment||"").trim()) msg+="\nPayment details:\n"+S.payment.trim()+"\n";
  msg+="\nThank you,\n"+(biz||"");
  const subject="Invoice "+num+(biz?" from "+biz:"")+(paid?" — PAID":" — "+fmt(c.total)+(due?" (due "+due+")":""));
  return {msg, subject};
}

/* ---------- save and send ---------- */
function openSendModal(){ const n=$("send-inv-no"); if(n) n.textContent=S.meta.number||""; $("send-modal").hidden=false; }
function closeSendModal(){ $("send-modal").hidden=true; }
async function makePdfOrToast(){
  if(!validateInvoice()) return null;
  toast("Preparing PDF…");
  try{ const b=await generatePdfBlob(); bzDone(); return b; }
  catch(e){ toast("Couldn't make the PDF — check your connection and try again"); return null; }
}
async function sendViaWhatsApp(){
  closeSendModal();
  const blob=await makePdfOrToast(); if(!blob) return;
  const {msg}=invoiceShareText();
  const fname=pdfFileName();
  const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||"");
  if(mobile){
    /* phones: native share sheet carries the actual PDF into WhatsApp */
    const file=new File([blob],fname,{type:"application/pdf"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file],title:fname,text:msg}); return; }
      catch(e){ if(e&&e.name==="AbortError") return; }
    }
  }
  downloadBlob(blob,fname);
  window.open("https://wa.me/?text="+encodeURIComponent(msg),"_blank");
  toast("PDF downloaded — attach it from your downloads in the chat");
}
async function sendViaEmail(){
  closeSendModal();
  const blob=await makePdfOrToast(); if(!blob) return;
  const fname=pdfFileName();
  downloadBlob(blob,fname);
  const to=(S.client.email||"").trim();
  const {msg,subject}=invoiceShareText();
  const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||"");
  if(mobile){
    window.location.href="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(msg);
    toast("PDF downloaded — attach it to the email");
    return;
  }
  window.open("https://mail.google.com/mail/?view=cm&fs=1&to="+encodeURIComponent(to)+"&su="+encodeURIComponent(subject)+"&body="+encodeURIComponent(msg),"_blank");
  toast("PDF downloaded — attach it from your downloads in the email");
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

/* ---------- industry template seed import ---------- */
function importTemplateSeed(){
  if(DOC!=="invoice") return;
  let imp=null;
  try{ imp=JSON.parse(localStorage.getItem("billzilla_template_import_v1")||"null"); }catch(e){}
  if(!imp || !imp.items || !imp.items.length) return;
  try{ localStorage.removeItem("billzilla_template_import_v1"); }catch(e){}
  /* never clobber a real draft: only seed when every current item is still blank */
  const hasContent=S.items.some(it=>((it.desc||"").trim()||(Number(it.rate)||0)>0));
  if(hasContent) return;
  S.items=imp.items.map(e=>({desc:String(e.desc||"Service"), qty:Number(e.qty)||1, rate:Number(e.rate)||0, tax:0}));
  saveDraft(); fillForm(); renderItems(); renderPreview();
  toast("Loaded sample "+(imp.industry?imp.industry+" ":"")+"invoice items — edit them to make it yours");
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded",()=>{
  initChrome();
  tickInvoiceCounter();
  if(!$("invoice-sheet")) return; /* not the generator page */
  fillForm(); bindForm(); sigPadInit(); renderItems(); renderTaxControls(); renderTemplates(); renderPreview(); renderHistory();
  importTimeEntries();
  importTemplateSeed();
});
})();
