/**
 * A small, good-looking shop checkout for the demo site and the README's
 * screenshots. Its bundle has the kind of bug the app is for: the cart
 * subtotal adds prices as strings and ignores quantities, so the page shows
 * "$NaN" until you fix one expression in the (minified) bundle.
 */

export const STORE_BUNDLE_PATH = '/store/assets/app.7c1e9f4a.js';
export const STORE_CSS_PATH = '/store/assets/store.css';
export const STORE_ICON_PATH = '/store/assets/icon.svg';
/** The store's favicon (a workspace on the store shows it on its rail tile). */
export const STORE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#2b59ff"/><path d="M16 6l9 10-9 10-9-10z" fill="#fff"/></svg>`;

export const STORE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acme Store · Checkout</title>
<link rel="icon" href="${STORE_ICON_PATH}">
<link rel="stylesheet" href="${STORE_CSS_PATH}">
</head>
<body>
<header class="bar">
  <span class="logo"><b>◆</b> acme</span>
  <nav><a>Shop</a><a>Deals</a><a class="cart">Cart <i>4</i></a></nav>
</header>
<main>
  <section class="card">
    <p class="step">Step 2 of 3 · Review</p>
    <h1>Your cart</h1>
    <ul id="items"></ul>
    <dl>
      <div><dt>Subtotal</dt><dd id="subtotal">…</dd></div>
      <div><dt>Shipping</dt><dd id="shipping">…</dd></div>
      <div class="total"><dt>Total</dt><dd id="total">…</dd></div>
    </dl>
    <button id="pay">Pay now</button>
    <p class="fine">Free shipping on orders over $100.</p>
  </section>
</main>
<script src="${STORE_BUNDLE_PATH}"></script>
</body>
</html>
`;

export const STORE_CSS = `:root{--ink:#16181d;--muted:#6b7280;--line:#eceef2;--brand:#4f46e5;--bg:#f6f7fb}
*{box-sizing:border-box}
body{margin:0;font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:radial-gradient(1200px 600px at 20% -10%,#e0e7ff 0,transparent 60%),var(--bg);min-height:100vh}
.bar{display:flex;align-items:center;justify-content:space-between;padding:18px 32px}
.logo{font-weight:700;font-size:18px;letter-spacing:-.02em}.logo b{color:var(--brand)}
nav{display:flex;gap:22px;color:var(--muted)}nav .cart{color:var(--ink);font-weight:600}
nav i{font-style:normal;background:var(--brand);color:#fff;border-radius:99px;padding:1px 7px;font-size:12px;margin-left:4px}
main{display:grid;place-items:start center;padding:24px 16px 48px}
.card{width:min(440px,100%);background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px 26px 20px;box-shadow:0 1px 2px rgba(16,24,40,.04),0 12px 32px -12px rgba(16,24,40,.12)}
.step{margin:0;color:var(--brand);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
h1{margin:4px 0 16px;font-size:24px;letter-spacing:-.02em}
ul{list-style:none;margin:0;padding:0}
li{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.thumb{width:44px;height:44px;border-radius:12px}
.name{font-weight:600}.name small{display:block;font-weight:400;color:var(--muted);font-size:13px}
.price{font-variant-numeric:tabular-nums;font-weight:600}
dl{margin:14px 0 18px}dl div{display:flex;justify-content:space-between;padding:4px 0;color:var(--muted)}
dd{margin:0;font-variant-numeric:tabular-nums;color:var(--ink)}
.total{margin-top:6px;padding-top:12px!important;border-top:1px dashed var(--line);font-size:18px;font-weight:700;color:var(--ink)!important}
button{width:100%;border:0;border-radius:12px;padding:13px;font:inherit;font-weight:600;color:#fff;background:var(--brand);cursor:pointer}
.fine{margin:12px 0 0;text-align:center;color:var(--muted);font-size:12px}
`;

// Whitespace-stripped like a production bundle; the bug is `sum + item.price`.
export const STORE_BUNDLE = [
  '(()=>{"use strict";',
  'const cart=[{sku:"KB-87",name:"Mechanical keyboard",note:"Tactile switches",price:"89.00",qty:1,color:"linear-gradient(135deg,#fb923c,#f43f5e)"},',
  '{sku:"CB-2M",name:"USB-C cable, 2 m",note:"Braided",price:"12.50",qty:2,color:"linear-gradient(135deg,#38bdf8,#6366f1)"},',
  '{sku:"DM-XL",name:"Desk mat XL",note:"Graphite",price:"24.00",qty:1,color:"linear-gradient(135deg,#a3e635,#10b981)"}];',
  'const FREE_SHIPPING_FROM=100,SHIPPING=9.99;',
  'const money=n=>"$"+Number(n).toFixed(2);',
  'const $=id=>document.getElementById(id);',
  'const emitter={handlers:{},on(t,f){(this.handlers[t]??=[]).push(f)},emit(t,d){for(const f of this.handlers[t]??[])f(d)}};',
  'function row(item){const li=document.createElement("li");li.innerHTML=`<span class="thumb" style="background:${item.color}"></span><span class="name">${item.name}<small>${item.note} · ×${item.qty}</small></span><span class="price">${money(item.price*item.qty)}</span>`;return li}',
  'function subtotal(items){return items.reduce((sum,item)=>sum+item.price,0)}',
  'function shipping(amount){return amount>=FREE_SHIPPING_FROM?0:SHIPPING}',
  'function render(){$("items").replaceChildren(...cart.map(row));const sub=subtotal(cart),ship=shipping(sub);$("subtotal").textContent=money(sub);$("shipping").textContent=ship?money(ship):"Free";$("total").textContent=money(sub+ship);emitter.emit("rendered",{sub,ship})}',
  'emitter.on("rendered",e=>{document.title=`Acme Store · ${money(e.sub+e.ship)}`});',
  '$("pay").addEventListener("click",()=>{$("pay").textContent="Processing…";setTimeout(()=>{$("pay").textContent="Paid ✓"},900)});',
  'render();',
  'window.__store={version:"2.4.1",cart,render};',
  '})();',
].join('');
