
function showToast(message, duration = 3000) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, duration);
}
function isLoggedIn(){ return !!localStorage.getItem('loggedInUser'); }
function logout({ clearCart=false, redirect='index.html', toastMs=1500 }={}){
  localStorage.removeItem('loggedInUser');
  if (clearCart) localStorage.removeItem('cartItems');
  showToast('Logged out.', toastMs);
  setTimeout(() => (window.location.href = redirect), toastMs);
}
function renderAuthNav(){
  const loginLink = document.getElementById('loginLink');
  const logoutLink = document.getElementById('logoutLink');
  if(!loginLink || !logoutLink) return;
  if(isLoggedIn()){ loginLink.style.display='none'; logoutLink.style.display='inline-block'; }
  else { loginLink.style.display='inline-block'; logoutLink.style.display='none'; }
}
function getCart(){ return JSON.parse(localStorage.getItem('cartItems') || '[]'); }
function saveCart(c){ localStorage.setItem('cartItems', JSON.stringify(c)); }
function getCartCount(){ return getCart().reduce((n,i)=>n+(i.qty||0),0); }
function updateCartBadge(){ const el = document.getElementById('cartCount'); if(el) el.textContent = getCartCount(); }
function currency(n){ return n.toLocaleString(undefined,{ minimumFractionDigits:0 }); }
function slugify(s){ return String(s).toLowerCase().replace(/\s+/g,'-').replace(/[^\w-]/g,''); }
function addToCart(name, price, id=null){
  const pid = id || slugify(name);
  const cart = getCart();
  const idx = cart.findIndex(i=>i.id===pid);
  if(idx>=0) cart[idx].qty += 1; else cart.push({id:pid,name,price:Number(price),qty:1});
  saveCart(cart); updateCartBadge();
  showToast(`${name} has been added to your cart!`, 2000);
  if (typeof updateCartUI === 'function') updateCartUI();
}
function changeQty(id, delta){
  const cart = getCart();
  const idx = cart.findIndex(i=>i.id===id);
  if(idx===-1) return;
  cart[idx].qty += delta;
  if(cart[idx].qty <= 0) cart.splice(idx,1);
  saveCart(cart); updateCartBadge();
  if (typeof updateCartUI === 'function') updateCartUI();
}
function removeItem(id){
  const cart = getCart().filter(i=>i.id!==id);
  saveCart(cart); updateCartBadge();
  if (typeof updateCartUI === 'function') updateCartUI();
}
function applyFilters(){
  const q = (document.getElementById('q')?.value || '').toLowerCase();
  const min = parseFloat(document.getElementById('minPrice')?.value) || 0;
  const max = parseFloat(document.getElementById('maxPrice')?.value) || Infinity;
  document.querySelectorAll('.product-card').forEach(card=>{
    const name = (card.dataset.name || '').toLowerCase();
    const price = parseFloat(card.dataset.price || '0');
    const show = name.includes(q) && price >= min && price <= max;
    card.style.display = show ? '' : 'none';
  });
}
function resetFilters(){
  const q=document.getElementById('q'), min=document.getElementById('minPrice'), max=document.getElementById('maxPrice');
  if(q) q.value=''; if(min) min.value=''; if(max) max.value='';
  applyFilters();
}
function getWishlist(){ return JSON.parse(localStorage.getItem('wishlist') || '[]'); }
function saveWishlist(w){ localStorage.setItem('wishlist', JSON.stringify(w)); }
function toggleWishlist(id, btn){
  let w = getWishlist();
  const i = w.indexOf(id);
  if(i===-1){ w.push(id); btn?.classList.add('active'); showToast('Added to favorites', 1200); }
  else { w.splice(i,1); btn?.classList.remove('active'); showToast('Removed from favorites', 1200); }
  saveWishlist(w);
}
function syncWishlistHearts(){
  const w = getWishlist();
  document.querySelectorAll('.product-card').forEach(card=>{
    const id = card.dataset.id;
    const btn = card.querySelector('.wish-btn');
    if(!id||!btn) return;
    if(w.includes(id)) btn.classList.add('active'); else btn.classList.remove('active');
  });
}
function getCoupon(){ return (localStorage.getItem('cartCoupon') || '').trim().toUpperCase(); }
function setCoupon(code){ localStorage.setItem('cartCoupon', code ? code.toUpperCase() : ''); }
function calcSummary(){
  const cart = getCart();
  const subtotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const code = getCoupon();
  let discount = 0;
  if(code==='SAVE10') discount = Math.round(subtotal*0.10);
  let shipping = subtotal >= 1000 ? 0 : 15;
  if(code==='FREESHIP') shipping = 0;
  const total = Math.max(0, subtotal - discount) + shipping;
  return { subtotal, discount, shipping, total, code };
}
function applyCoupon(){
  const input = document.getElementById('coupon');
  if(!input) return;
  const code = (input.value || '').trim().toUpperCase();
  if(!code){ setCoupon(''); showToast('Coupon cleared', 1200); updateCartUI(); return; }
  if(['SAVE10','FREESHIP'].includes(code)){
    setCoupon(code); showToast(`Applied coupon: ${code}`, 1200); updateCartUI();
  } else {
    showToast('Invalid coupon code', 1500);
  }
}
function updateCartUI(){
  const tbody = document.getElementById('cartTableBody');
  const emptyEl = document.getElementById('cartEmpty');
  if(!tbody) return;
  const cart = getCart();
  tbody.innerHTML='';
  if(cart.length===0){
    if(emptyEl) emptyEl.style.display='block';
    document.getElementById('sumSubtotal')?.replaceChildren(document.createTextNode('0'));
    document.getElementById('sumDiscount')?.replaceChildren(document.createTextNode('0'));
    document.getElementById('sumShipping')?.replaceChildren(document.createTextNode('0'));
    document.getElementById('sumTotal')?.replaceChildren(document.createTextNode('0'));
    document.getElementById('appliedCode')?.replaceChildren(document.createTextNode('—'));
    return;
  }
  if(emptyEl) emptyEl.style.display='none';
  cart.forEach(item=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="cell-name">
        <div class="name">VND${item.name}</div>
        <div class="price-mobile">VND${currency(item.price)}</div>
      </td>
      <td class="cell-price">VND${currency(item.price)}</td>
      <td class="cell-qty">
        <div class="qty">
          <button class="btn-qty" aria-label="Decrease">−</button>
          <input class="qty-input" type="number" min="1" value="${item.qty}">
          <button class="btn-qty" aria-label="Increase">+</button>
        </div>
      </td>
      <td class="cell-sub">VND${currency(item.price*item.qty)}</td>
      <td class="cell-act"><button class="btn-delete" aria-label="Remove">✕</button></td>`;
    const [btnMinus, qtyInput, btnPlus] = tr.querySelectorAll('.btn-qty, .qty-input, .btn-qty');
    const btnDel = tr.querySelector('.btn-delete');
    btnMinus.addEventListener('click', ()=>changeQty(item.id,-1));
    btnPlus.addEventListener('click', ()=>changeQty(item.id,+1));
    qtyInput.addEventListener('change', ()=>{
      const val = Math.max(0, parseInt(qtyInput.value || '0', 10));
      changeQty(item.id, val - item.qty);
    });
    btnDel.addEventListener('click', ()=>removeItem(item.id));
    tbody.appendChild(tr);
  });
  const s = calcSummary();
  document.getElementById('sumSubtotal')?.replaceChildren(document.createTextNode(currency(s.subtotal)));
  document.getElementById('sumDiscount')?.replaceChildren(document.createTextNode(currency(s.discount)));
  document.getElementById('sumShipping')?.replaceChildren(document.createTextNode(currency(s.shipping)));
  document.getElementById('sumTotal')?.replaceChildren(document.createTextNode(currency(s.total)));
  document.getElementById('appliedCode')?.replaceChildren(document.createTextNode(s.code || '—'));
}
function requireLogin(redirect='profile.html'){
  if(!isLoggedIn()){
    showToast('Please log in first.', 1800);
    setTimeout(()=> (window.location.href = redirect), 1800);
    return false;
  }
  return true;
}
function checkout(){
  const cart = getCart();
  if(cart.length===0){ showToast('Your cart is empty!', 1800); return; }
  if(!requireLogin('profile.html')) return;
  const s = calcSummary();
  const user = localStorage.getItem('loggedInUser');
  const order = {
    id: 'ORD-' + Date.now(),
    date: new Date().toISOString(),
    items: cart,
    breakdown: { subtotal: s.subtotal, discount: s.discount, shipping: s.shipping, total: s.total, coupon: s.code }
  };
  const key = 'orders_' + user;
  const old = JSON.parse(localStorage.getItem(key) || '[]');
  old.push(order);
  localStorage.setItem(key, JSON.stringify(old));
  localStorage.removeItem('cartItems');
  localStorage.removeItem('cartCoupon');
  updateCartBadge();
  showToast('Purchase successful! Thank you 💚', 3000);
  setTimeout(()=> (window.location.href = 'index.html'), 3000);
}
function renderOrders(){
  const user = localStorage.getItem('loggedInUser');
  const listEl = document.getElementById('ordersList');
  const nameEl = document.getElementById('userDisplay');
  if(!listEl) return;
  if(!user){
    if(nameEl) nameEl.textContent = 'Guest';
    listEl.innerHTML = '<li class="order-card">Please log in to see your order history.</li>';
    return;
  }
  if(nameEl) nameEl.textContent = user;
  const orders = JSON.parse(localStorage.getItem('orders_'+user) || '[]').reverse();
  if(orders.length===0){ listEl.innerHTML = '<li class="order-card">No orders yet.</li>'; return; }
  listEl.innerHTML='';
  orders.forEach(o=>{
    const when = new Date(o.date).toLocaleString();
    const items = o.items.map(i=>`<li>${i.name} ×${i.qty} — $${currency(i.price*i.qty)}</li>`).join('');
    const b = o.breakdown || {subtotal:0,discount:0,shipping:0,total:0,coupon:''};
    const li = document.createElement('li');
    li.className = 'order-card';
    li.innerHTML = `
      <div class="order-header">
        <div><strong>${o.id}</strong></div>
        <div>${when}</div>
      </div>
      <ul class="order-items">${items}</ul>
      <div class="order-total">
        <div>Subtotal: ${currency(b.subtotal)}VND | Discount: ${currency(b.discount)}VND (${b.coupon||'—'}) | Shipping: ${currency(b.shipping)}VND</div>
        <div><strong>Total: ${currency(b.total)}VND</strong></div>
      </div>`;
    listEl.appendChild(li);
  });
}
document.addEventListener('DOMContentLoaded', ()=>{
  renderAuthNav();
  const logoutLink = document.getElementById('logoutLink');
  if (logoutLink) logoutLink.addEventListener('click', (e)=>{ e.preventDefault(); logout({ clearCart:false, redirect:'index.html', toastMs:1500 }); });
  updateCartBadge();
  document.getElementById('applyFiltersBtn')?.addEventListener('click', applyFilters);
  document.getElementById('resetFiltersBtn')?.addEventListener('click', resetFilters);
  document.getElementById('q')?.addEventListener('input', applyFilters);
  document.getElementById('minPrice')?.addEventListener('input', applyFilters);
  document.getElementById('maxPrice')?.addEventListener('input', applyFilters);
  document.querySelectorAll('.product-card .wish-btn').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const card = e.currentTarget.closest('.product-card');
      if(!card) return;
      toggleWishlist(card.dataset.id, e.currentTarget);
    });
  });
  syncWishlistHearts();
  document.getElementById('applyCouponBtn')?.addEventListener('click', applyCoupon);
  if(document.getElementById('cartTableBody')) updateCartUI();
  if(document.getElementById('ordersList')) renderOrders();
});
