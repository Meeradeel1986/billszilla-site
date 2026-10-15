/* Billzilla data: currencies + invoice label translations.
   All static — no network calls, works offline. */

const CURRENCIES = [
  ["USD","$","US Dollar"],["EUR","€","Euro"],["GBP","£","British Pound"],
  ["PKR","₨","Pakistani Rupee"],["INR","₹","Indian Rupee"],["AED","د.إ","UAE Dirham"],
  ["SAR","﷼","Saudi Riyal"],["BDT","৳","Bangladeshi Taka"],["PHP","₱","Philippine Peso"],
  ["CAD","$","Canadian Dollar"],["AUD","$","Australian Dollar"],["NZD","$","New Zealand Dollar"],
  ["CHF","CHF","Swiss Franc"],["JPY","¥","Japanese Yen"],["CNY","¥","Chinese Yuan"],
  ["SGD","$","Singapore Dollar"],["HKD","$","Hong Kong Dollar"],["MYR","RM","Malaysian Ringgit"],
  ["IDR","Rp","Indonesian Rupiah"],["THB","฿","Thai Baht"],["VND","₫","Vietnamese Dong"],
  ["KRW","₩","South Korean Won"],["TWD","NT$","Taiwan Dollar"],["NPR","₨","Nepalese Rupee"],
  ["LKR","₨","Sri Lankan Rupee"],["QAR","﷼","Qatari Riyal"],["KWD","د.ك","Kuwaiti Dinar"],
  ["BHD",".د.ب","Bahraini Dinar"],["OMR","﷼","Omani Rial"],["JOD","JD","Jordanian Dinar"],
  ["EGP","£","Egyptian Pound"],["NGN","₦","Nigerian Naira"],["KES","KSh","Kenyan Shilling"],
  ["GHS","₵","Ghanaian Cedi"],["ZAR","R","South African Rand"],["TRY","₺","Turkish Lira"],
  ["RUB","₽","Russian Ruble"],["BRL","R$","Brazilian Real"],["MXN","$","Mexican Peso"],
  ["ARS","$","Argentine Peso"],["CLP","$","Chilean Peso"],["COP","$","Colombian Peso"],
  ["PEN","S/","Peruvian Sol"],["SEK","kr","Swedish Krona"],["NOK","kr","Norwegian Krone"],
  ["DKK","kr","Danish Krone"],["PLN","zł","Polish Zloty"],["CZK","Kč","Czech Koruna"],
  ["HUF","Ft","Hungarian Forint"],["RON","lei","Romanian Leu"],["ILS","₪","Israeli Shekel"],
  ["UAH","₴","Ukrainian Hryvnia"]
];

/* Invoice labels per language. Keys: invoice, invoiceNo, date, dueDate,
   billTo, from, description, qty, rate, tax, amount, subtotal, discount,
   shipping, taxTotal, total, notes, paymentDetails, paymentTerms, thankYou */
const LANGUAGES = {
  en:{name:"English",rtl:false,invoice:"Invoice",invoiceNo:"Invoice No.",date:"Date",dueDate:"Due Date",billTo:"Bill To",from:"From",description:"Description",qty:"Qty",rate:"Rate",tax:"Tax",amount:"Amount",subtotal:"Subtotal",discount:"Discount",shipping:"Shipping",taxTotal:"Tax",total:"Total",totalDue:"Amount Due",notes:"Notes",paymentDetails:"Payment Details",paymentTerms:"Payment Terms",thankYou:"Thank you for your business!",quote:"Quote",quoteNo:"Quote No.",receipt:"Receipt",receiptNo:"Receipt No.",proforma:"Proforma Invoice",proformaNo:"Proforma No."},
  es:{name:"Español",rtl:false,invoice:"Factura",invoiceNo:"Factura N.º",date:"Fecha",dueDate:"Vencimiento",billTo:"Facturar a",from:"De",description:"Descripción",qty:"Cant.",rate:"Precio",tax:"Impuesto",amount:"Importe",subtotal:"Subtotal",discount:"Descuento",shipping:"Envío",taxTotal:"Impuestos",total:"Total",totalDue:"Total a pagar",notes:"Notas",paymentDetails:"Datos de pago",paymentTerms:"Condiciones de pago",thankYou:"¡Gracias por su confianza!",quote:"Cotización",quoteNo:"Cotización N.º",receipt:"Recibo",receiptNo:"Recibo N.º",proforma:"Factura proforma",proformaNo:"Factura proforma N.º"},
  fr:{name:"Français",rtl:false,invoice:"Facture",invoiceNo:"Facture N°",date:"Date",dueDate:"Échéance",billTo:"Facturer à",from:"De",description:"Description",qty:"Qté",rate:"Prix",tax:"TVA",amount:"Montant",subtotal:"Sous-total",discount:"Remise",shipping:"Livraison",taxTotal:"TVA",total:"Total",totalDue:"Net à payer",notes:"Notes",paymentDetails:"Coordonnées bancaires",paymentTerms:"Conditions de paiement",thankYou:"Merci pour votre confiance !",quote:"Devis",quoteNo:"Devis N°",receipt:"Reçu",receiptNo:"Reçu N°",proforma:"Facture proforma",proformaNo:"Facture proforma N°"},
  de:{name:"Deutsch",rtl:false,invoice:"Rechnung",invoiceNo:"Rechnungsnr.",date:"Datum",dueDate:"Fällig am",billTo:"Rechnung an",from:"Von",description:"Beschreibung",qty:"Menge",rate:"Preis",tax:"MwSt.",amount:"Betrag",subtotal:"Zwischensumme",discount:"Rabatt",shipping:"Versand",taxTotal:"MwSt.",total:"Gesamt",totalDue:"Zu zahlen",notes:"Notizen",paymentDetails:"Zahlungsdaten",paymentTerms:"Zahlungsbedingungen",thankYou:"Vielen Dank für Ihren Auftrag!",quote:"Angebot",quoteNo:"Angebotsnr.",receipt:"Quittung",receiptNo:"Quittungsnr.",proforma:"Proforma-Rechnung",proformaNo:"Proforma-Rechnungsnr."},
  pt:{name:"Português",rtl:false,invoice:"Fatura",invoiceNo:"Fatura N.º",date:"Data",dueDate:"Vencimento",billTo:"Faturar para",from:"De",description:"Descrição",qty:"Qtd.",rate:"Preço",tax:"Imposto",amount:"Valor",subtotal:"Subtotal",discount:"Desconto",shipping:"Frete",taxTotal:"Impostos",total:"Total",totalDue:"Total a pagar",notes:"Notas",paymentDetails:"Dados de pagamento",paymentTerms:"Condições de pagamento",thankYou:"Obrigado pela preferência!",quote:"Orçamento",quoteNo:"Orçamento N.º",receipt:"Recibo",receiptNo:"Recibo N.º",proforma:"Fatura proforma",proformaNo:"Fatura proforma N.º"},
  ar:{name:"العربية",rtl:true,invoice:"فاتورة",invoiceNo:"رقم الفاتورة",date:"التاريخ",dueDate:"تاريخ الاستحقاق",billTo:"فاتورة إلى",from:"من",description:"الوصف",qty:"الكمية",rate:"السعر",tax:"الضريبة",amount:"المبلغ",subtotal:"المجموع الفرعي",discount:"الخصم",shipping:"الشحن",taxTotal:"الضريبة",total:"الإجمالي",totalDue:"المبلغ المستحق",notes:"ملاحظات",paymentDetails:"تفاصيل الدفع",paymentTerms:"شروط الدفع",thankYou:"شكراً لتعاملكم معنا!",quote:"عرض سعر",quoteNo:"رقم عرض السعر",receipt:"إيصال",receiptNo:"رقم الإيصال",proforma:"فاتورة أولية",proformaNo:"رقم الفاتورة الأولية"},
  hi:{name:"हिन्दी",rtl:false,invoice:"चालान",invoiceNo:"चालान संख्या",date:"दिनांक",dueDate:"नियत तारीख",billTo:"प्राप्तकर्ता",from:"प्रेषक",description:"विवरण",qty:"मात्रा",rate:"दर",tax:"कर",amount:"राशि",subtotal:"उप-योग",discount:"छूट",shipping:"शिपिंग",taxTotal:"कर",total:"कुल",totalDue:"देय राशि",notes:"टिप्पणियाँ",paymentDetails:"भुगतान विवरण",paymentTerms:"भुगतान शर्तें",thankYou:"आपके व्यवसाय के लिए धन्यवाद!",quote:"कोटेशन",quoteNo:"कोटेशन संख्या",receipt:"रसीद",receiptNo:"रसीद संख्या",proforma:"प्रोफार्मा चालान",proformaNo:"प्रोफार्मा चालान संख्या"},
  ur:{name:"اردو",rtl:true,invoice:"انوائس",invoiceNo:"انوائس نمبر",date:"تاریخ",dueDate:"واجب الادا تاریخ",billTo:"وصول کنندہ",from:"از طرف",description:"تفصیل",qty:"تعداد",rate:"قیمت",tax:"ٹیکس",amount:"رقم",subtotal:"ذیلی مجموع",discount:"رعایت",shipping:"ترسیل",taxTotal:"ٹیکس",total:"کل",totalDue:"واجب الادا رقم",notes:"نوٹس",paymentDetails:"ادائیگی کی تفصیلات",paymentTerms:"ادائیگی کی شرائط",thankYou:"آپ کے کاروبار کا شکریہ!",quote:"کوٹیشن",quoteNo:"کوٹیشن نمبر",receipt:"رسید",receiptNo:"رسید نمبر",proforma:"پروفارما انوائس",proformaNo:"پروفارما انوائس نمبر"}
};

const TEMPLATES = [
  {id:"t-modern", name:"Modern",  swatch:"linear-gradient(135deg,#10b981,#0f172a)"},
  {id:"t-classic",name:"Classic", swatch:"linear-gradient(135deg,#f8fafc,#0f172a)"},
  {id:"t-minimal",name:"Minimal", swatch:"linear-gradient(135deg,#ffffff,#e5e7eb)"},
  {id:"t-bold",   name:"Bold",    swatch:"linear-gradient(135deg,#0f172a,#334155)"},
  {id:"t-fresh",  name:"Fresh",   swatch:"linear-gradient(135deg,#a7f3d0,#059669)"},
  {id:"t-mono",   name:"Mono",    swatch:"linear-gradient(135deg,#e5e7eb,#9ca3af)"}
];

/* Document types for the generator pages (invoice + quote/receipt/proforma).
   Each page sets window.BILLZILLA_DOC before loading app.js. */
const DOC_TYPES = {
  invoice:  {prefix:"INV-"},
  quote:    {prefix:"QUO-"},
  receipt:  {prefix:"RCP-"},
  proforma: {prefix:"PRO-"}
};
