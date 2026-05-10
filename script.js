// =============================================
//  STORE NGUYỄN LONG — script.js
//  Vanilla JS SPA, communicates with /api/*
// =============================================

const API = 'https://e78fb2fb-54ed-4087-a4e0-3aa75e062e06-00-4fbk9e2qdkfv.pike.replit.dev';

// -------- STATE --------
let currentUser = null;
let selectedAmount = null;
let settings = {};
let allUsers = [];

// -------- TOKEN --------
const getToken = () => localStorage.getItem('auth_token');
const setToken = t => localStorage.setItem('auth_token', t);
const removeToken = () => localStorage.removeItem('auth_token');

// -------- API HELPERS --------
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

// -------- TOAST --------
function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 3000);
}

// -------- DRAWER --------
function toggleDrawer() {
  document.getElementById('drawer').classList.toggle('open');
  document.getElementById('drawer-overlay').classList.toggle('open');
}
function navTo(page) {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  showPage(page);
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// -------- PAGE ROUTING --------
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (!pg) return;
  pg.classList.add('active');
  if (name === 'home') loadHome();
  if (name === 'deposit-atm') loadDepositAtm();
  if (name === 'history-deposit') loadHistoryDeposit();
  if (name === 'history-purchase') loadHistoryPurchase();
  if (name === 'admin') loadAdmin();
}

// -------- STARS --------
function initStars() {
  const c = document.getElementById('stars');
  if (!c) return;
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2 + 1;
    s.style.cssText = `width:${size}px;height:${size}px;top:${Math.random()*100}%;left:${Math.random()*100}%;opacity:${Math.random()*0.4+0.1};`;
    c.appendChild(s);
  }
}

// -------- INIT --------
async function init() {
  initStars();
  try {
    const [s] = await Promise.all([apiFetch('/api/settings')]);
    settings = s;
    applySettings(s);
  } catch(e) {}
  try {
    currentUser = await apiFetch('/api/auth/me');
    updateDrawerUser();
  } catch(e) { currentUser = null; updateDrawerGuest(); }
  loadHome();
}

function applySettings(s) {
  if (s.shopTagline) document.getElementById('hero-tagline').textContent = s.shopTagline;
  if (s.shopDescription) document.getElementById('hero-sub').textContent = s.shopDescription;
  if (s.contactEmail) document.getElementById('hero-email').textContent = s.contactEmail;
  if (s.totalVisitors !== undefined) document.getElementById('visitor-count').textContent = s.totalVisitors.toLocaleString('vi-VN');
  if (s.zaloLink) document.getElementById('float-zalo').href = s.zaloLink;
  if (s.facebookLink) document.getElementById('float-fb').href = s.facebookLink;
}

function updateDrawerUser() {
  if (!currentUser) return;
  document.getElementById('drawer-auth').style.display = 'flex';
  document.getElementById('drawer-guest').style.display = 'none';
  document.getElementById('drawer-avatar').textContent = currentUser.username[0].toUpperCase();
  document.getElementById('drawer-username').textContent = currentUser.username;
  document.getElementById('drawer-id').textContent = 'Mã KH: ' + currentUser.customerId;
  document.getElementById('drawer-balance').textContent = Number(currentUser.balance).toLocaleString('vi-VN') + ' VND';
  document.getElementById('nav-login-btn').style.display = 'none';
  if (currentUser.isAdmin) document.getElementById('admin-link').style.display = 'flex';
}

function updateDrawerGuest() {
  document.getElementById('drawer-auth').style.display = 'none';
  document.getElementById('drawer-guest').style.display = 'flex';
  document.getElementById('nav-login-btn').style.display = 'block';
}

// -------- HOME --------
async function loadHome() {
  try {
    const products = await apiFetch('/api/products');
    renderProducts(products);
  } catch(e) {
    document.getElementById('products-list').innerHTML = '<div class="empty-msg">Không thể tải sản phẩm</div>';
  }
}

function renderProducts(products) {
  const el = document.getElementById('products-list');
  if (!products.length) { el.innerHTML = '<div class="empty-msg">Chưa có sản phẩm nào</div>'; return; }
  el.innerHTML = products.map(p => `
    <div class="product-card ${p.onSale ? 'sale' : ''}">
      ${p.onSale ? '<div class="sale-badge"><div class="sale-badge-inner">ĐANG SALE</div></div>' : ''}
      <div class="product-name">${p.name}</div>
      <div class="product-price-row">
        <div class="product-price ${p.onSale ? 'sale-price' : 'normal-price'}">${Number(p.price).toLocaleString('vi-VN')}K</div>
        ${p.onSale && p.originalPrice ? `<div class="product-orig">${Number(p.originalPrice).toLocaleString('vi-VN')}K</div>` : ''}
      </div>
      ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
      ${p.features ? `<ul class="product-features">${p.features.split('\n').filter(Boolean).map(f=>`<li>${f}</li>`).join('')}</ul>` : ''}
      <button class="btn-buy ${p.onSale ? 'sale' : 'normal'}" onclick="buyProduct(${p.id}, ${p.price}, '${escHtml(p.name)}', ${JSON.stringify(p.fileUrl)}, ${JSON.stringify(p.fileName)})">
        ${currentUser ? (p.onSale ? 'MUA NGAY GÓI SIÊU SALE' : 'MUA ' + p.name.toUpperCase()) : 'ĐĂNG NHẬP ĐỂ MUA'}
      </button>
    </div>
  `).join('');
}

function escHtml(s) { return (s||'').replace(/'/g,"\\'"); }

// Pending purchase state
let _pendingPurchase = null;

function buyProduct(id, price, name, fileUrl, fileName) {
  if (!currentUser) { showPage('login'); return; }
  if (Number(currentUser.balance) < Number(price)) {
    toast('Số dư không đủ! Vui lòng nạp thêm tiền.', 'error'); return;
  }
  _pendingPurchase = { id, price, name, fileUrl, fileName };
  document.getElementById('purchase-confirm-info').innerHTML =
    `Sản phẩm: <b style="color:var(--cyan)">${name}</b><br>` +
    `Số dư hiện tại: <b style="color:var(--white)">${Number(currentUser.balance).toLocaleString('vi-VN')} VND</b><br>` +
    `Thanh toán: <b style="color:var(--orange)">-${Number(price).toLocaleString('vi-VN')} VND</b><br>` +
    `Số dư sau khi mua: <b style="color:var(--green)">${(Number(currentUser.balance) - Number(price)).toLocaleString('vi-VN')} VND</b>`;
  document.getElementById('purchase-confirm-modal').classList.add('open');
}

async function confirmBuy() {
  if (!_pendingPurchase) return;
  const { id, price, name, fileUrl, fileName } = _pendingPurchase;
  _pendingPurchase = null;
  const btn = document.getElementById('purchase-confirm-btn');
  btn.disabled = true; btn.textContent = 'Đang xử lý...';
  closeModal('purchase-confirm-modal');
  try {
    const res = await apiFetch('/api/purchases', { method: 'POST', body: JSON.stringify({ productId: id }) });
    currentUser.balance = res.balance !== undefined ? res.balance : (Number(currentUser.balance) - Number(price));
    document.getElementById('drawer-balance').textContent = Number(currentUser.balance).toLocaleString('vi-VN') + ' VND';
    const info = document.getElementById('purchase-modal-info');
    info.innerHTML = `Sản phẩm: <b style="color:var(--cyan)">${name}</b><br>Đã trừ: <b style="color:var(--orange)">${Number(price).toLocaleString('vi-VN')} VND</b><br>Số dư còn lại: <b style="color:var(--green)">${Number(currentUser.balance).toLocaleString('vi-VN')} VND</b>`;
    const dlBtn = document.getElementById('purchase-dl-btn');
    if (res.fileUrl) { dlBtn.href = res.fileUrl; dlBtn.download = res.fileName || 'file'; dlBtn.style.display = 'block'; }
    else dlBtn.style.display = 'none';
    document.getElementById('purchase-modal').classList.add('open');
  } catch(e) {
    toast(e.error || 'Lỗi khi mua hàng', 'error');
  }
  btn.disabled = false; btn.textContent = '✅ XÁC NHẬN THANH TOÁN';
}

// -------- AUTH --------
async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const cap = document.getElementById('login-captcha').checked;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  if (!cap) { errEl.textContent = 'Vui lòng xác nhận không phải robot'; errEl.style.display = 'block'; return; }
  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.textContent = 'Đang đăng nhập...';
  try {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    setToken(data.token);
    currentUser = data.user;
    updateDrawerUser();
    toast('Đăng nhập thành công!', 'success');
    showPage('home');
  } catch(e) {
    errEl.textContent = e.error || 'Tên đăng nhập hoặc mật khẩu không đúng';
    errEl.style.display = 'block';
  }
  btn.disabled = false; btn.textContent = 'Đăng Nhập';
}

async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const cap = document.getElementById('reg-captcha').checked;
  const errEl = document.getElementById('reg-error');
  errEl.style.display = 'none';
  if (!cap) { errEl.textContent = 'Vui lòng xác nhận không phải robot'; errEl.style.display = 'block'; return; }

  const btn = document.getElementById('reg-btn');
  btn.disabled = true; btn.textContent = 'Đang đăng ký...';
  try {
    const data = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
    setToken(data.token);
    currentUser = data.user;
    updateDrawerUser();
    toast('Đăng ký thành công! Mã KH: ' + data.user.customerId, 'success');
    showPage('home');
  } catch(e) {
    errEl.textContent = e.error || 'Đăng ký thất bại, vui lòng thử lại';
    errEl.style.display = 'block';
  }
  btn.disabled = false; btn.textContent = 'Đăng Ký';
}

async function doLogout() {
  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch(e) {}
  removeToken();
  currentUser = null;
  updateDrawerGuest();
  toggleDrawer();
  showPage('home');
}

// -------- DEPOSIT ATM --------
const AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000, 5000000];

function loadDepositAtm() {
  if (!currentUser) { showPage('login'); return; }
  document.getElementById('bank-owner').textContent = settings.bankOwner || '-';
  document.getElementById('bank-account').textContent = settings.bankAccount || '-';
  document.getElementById('bank-name').textContent = settings.bankName || '-';
  const qrC = document.getElementById('qr-container');
  if (settings.bankQr) {
    document.getElementById('bank-qr').src = settings.bankQr;
    qrC.style.display = 'flex';
  }
  document.getElementById('deposit-warning').textContent =
    'TRƯỚC KHI NHẤN NÚT GỬI YÊU CẦU NẠP THÌ BANK TIỀN QUA NGÂN HÀNG RỒI MỚI NHẤN. NHỚ THÊM SỐ TIỀN MUỐN NẠP VÀ MÃ KHÁCH HÀNG: ' + currentUser.customerId + ' VÀO NỘI DUNG CHUYỂN KHOẢN.';
  selectedAmount = null;
  document.getElementById('selected-amount-display').style.display = 'none';
  const grid = document.getElementById('amount-grid');
  grid.innerHTML = AMOUNTS.map(a => `
    <button class="amount-btn" onclick="selectAmount(${a}, this)">
      ${a >= 1000000 ? (a/1000000)+'M' : (a/1000)+'K'}
    </button>
  `).join('');
}

function selectAmount(amount, btn) {
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedAmount = amount;
  const el = document.getElementById('selected-amount-display');
  el.style.display = 'block';
  document.getElementById('amount-text').textContent = amount.toLocaleString('vi-VN') + ' VND';
}

async function submitDepositAtm() {
  if (!selectedAmount) { toast('Vui lòng chọn số tiền muốn nạp', 'error'); return; }
  const btn = document.getElementById('deposit-atm-btn');
  btn.disabled = true; btn.textContent = 'Đang gửi...';
  try {
    await apiFetch('/api/deposits', { method: 'POST', body: JSON.stringify({ amount: selectedAmount, note: 'ATM - ' + currentUser.customerId }) });
    toast('Đã gửi yêu cầu! Chờ admin duyệt.', 'success');
    showPage('history-deposit');
  } catch(e) { toast('Lỗi khi gửi yêu cầu', 'error'); }
  btn.disabled = false; btn.textContent = 'Gửi yêu cầu nạp';
}

// -------- DEPOSIT CARD --------
function openCardConfirm() {
  if (!currentUser) { showPage('login'); return; }
  const code = document.getElementById('card-code').value.trim();
  const serial = document.getElementById('card-serial').value.trim();
  const carrier = document.getElementById('card-carrier').value;
  const denom = document.getElementById('card-denom').value;
  if (!code || !serial || !carrier || !denom) { toast('Vui lòng điền đầy đủ thông tin thẻ', 'error'); return; }
  document.getElementById('card-confirm-info').innerHTML =
    `Nhà mạng: <b>${carrier}</b><br>Mệnh giá: <b>${Number(denom).toLocaleString('vi-VN')}đ</b><br>Mã thẻ: <b>${code}</b><br>Seri: <b>${serial}</b>`;
  document.getElementById('card-confirm-modal').classList.add('open');
}

async function submitCard() {
  const code = document.getElementById('card-code').value.trim();
  const serial = document.getElementById('card-serial').value.trim();
  const carrier = document.getElementById('card-carrier').value;
  const denom = Number(document.getElementById('card-denom').value);
  closeModal('card-confirm-modal');
  try {
    await apiFetch('/api/cards', { method: 'POST', body: JSON.stringify({ cardCode: code, serial, carrier, denomination: denom }) });
    toast('Đã gửi thẻ! Chờ admin duyệt.', 'success');
    document.getElementById('card-code').value = '';
    document.getElementById('card-serial').value = '';
    showPage('history-deposit');
  } catch(e) { toast('Lỗi khi gửi thẻ', 'error'); }
}

// -------- HISTORY DEPOSIT --------
async function loadHistoryDeposit() {
  if (!currentUser) { showPage('login'); return; }
  const el = document.getElementById('history-deposit-list');
  el.innerHTML = '<div class="empty-msg">Đang tải...</div>';
  try {
    const deposits = await apiFetch('/api/deposits');
    if (!deposits.length) { el.innerHTML = '<div class="empty-msg">Chưa có lịch sử nạp tiền</div>'; return; }
    el.innerHTML = [...deposits].reverse().map(d => {
      const status = { pending:'status-pending', approved:'status-approved', rejected:'status-rejected' }[d.status] || '';
      const label = { pending:'Chờ duyệt', approved:'Đã duyệt', rejected:'Từ chối' }[d.status] || d.status;
      return `<div class="history-item">
        <div class="history-left">
          <div class="h-amount">${Number(d.amount).toLocaleString('vi-VN')} VND</div>
          <div class="h-sub">${d.note || ''} · ${new Date(d.createdAt).toLocaleDateString('vi-VN')}</div>
        </div>
        <div class="history-right"><span class="status-badge ${status}">${label}</span></div>
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<div class="empty-msg">Không thể tải dữ liệu</div>'; }
}

// -------- HISTORY PURCHASE --------
async function loadHistoryPurchase() {
  if (!currentUser) { showPage('login'); return; }
  const el = document.getElementById('history-purchase-list');
  el.innerHTML = '<div class="empty-msg">Đang tải...</div>';
  try {
    const purchases = await apiFetch('/api/purchases');
    if (!purchases.length) { el.innerHTML = '<div class="empty-msg">Chưa có lịch sử mua hàng</div>'; return; }
    el.innerHTML = [...purchases].reverse().map(p => `
      <div class="history-item">
        <div class="history-left">
          <div class="h-amount" style="color:var(--white)">${p.productName}</div>
          <div class="h-sub">${new Date(p.createdAt).toLocaleString('vi-VN')}</div>
        </div>
        <div class="history-right">
          <div style="font-weight:800;color:var(--orange)">-${Number(p.price).toLocaleString('vi-VN')} VND</div>
          ${p.fileUrl ? `<a class="download-link" href="${p.fileUrl}" download="${p.fileName||'file'}">Tải file</a>` : ''}
        </div>
      </div>
    `).join('');
  } catch(e) { el.innerHTML = '<div class="empty-msg">Không thể tải dữ liệu</div>'; }
}

// -------- ADMIN --------
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => {
    const tabs = ['products','deposits','cards','users','settings'];
    b.classList.toggle('active', tabs[i] === name);
  });
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'deposits') loadAdminDeposits();
  if (name === 'cards') loadAdminCards();
  if (name === 'users') loadAdminUsers();
  if (name === 'settings') loadAdminSettings();
  if (name === 'products') loadAdminProducts();
}

async function loadAdmin() {
  if (!currentUser) { showPage('login'); return; }
  if (!currentUser.isAdmin) { showPage('home'); return; }
  loadAdminProducts();
}

async function loadAdminProducts() {
  try {
    const products = await apiFetch('/api/products');
    const el = document.getElementById('admin-products-list');
    if (!products.length) { el.innerHTML = '<div class="empty-msg">Chưa có sản phẩm</div>'; return; }
    el.innerHTML = products.map(p => `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div>
            <div class="name">${p.name}</div>
            <div class="sub" style="color:var(--cyan)">${Number(p.price).toLocaleString('vi-VN')} VND ${p.onSale?'• SALE':''}</div>
            ${p.fileName ? `<div class="sub" style="color:var(--green)">File: ${p.fileName}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
            <label style="cursor:pointer;">
              <span style="padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;background:rgba(0,229,255,0.1);color:var(--cyan);border:1px solid rgba(0,229,255,0.3);">Upload file</span>
              <input type="file" style="display:none" onchange="uploadFile(${p.id}, this)" />
            </label>
            <button class="btn-del" onclick="deleteProduct(${p.id})">Xoá</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch(e) {}
}

function toggleAddProduct() {
  const f = document.getElementById('add-product-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function submitAddProduct() {
  const name = document.getElementById('np-name').value.trim();
  const price = Number(document.getElementById('np-price').value);
  const orig = document.getElementById('np-orig').value ? Number(document.getElementById('np-orig').value) : null;
  const onSale = document.getElementById('np-sale').checked;
  const description = document.getElementById('np-desc').value.trim() || null;
  const features = document.getElementById('np-features').value.trim() || null;
  if (!name || !price) { toast('Nhập tên và giá sản phẩm', 'error'); return; }
  try {
    await apiFetch('/api/products', { method: 'POST', body: JSON.stringify({ name, price, originalPrice: orig, onSale, description, features }) });
    toast('Đã thêm sản phẩm!', 'success');
    toggleAddProduct();
    document.getElementById('np-name').value=''; document.getElementById('np-price').value='';
    document.getElementById('np-orig').value=''; document.getElementById('np-sale').checked=false;
    document.getElementById('np-desc').value=''; document.getElementById('np-features').value='';
    loadAdminProducts();
  } catch(e) { toast('Lỗi thêm sản phẩm', 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('Xoá sản phẩm này?')) return;
  try { await apiFetch('/api/products/' + id, { method: 'DELETE' }); toast('Đã xoá!', 'success'); loadAdminProducts(); }
  catch(e) { toast('Lỗi xoá sản phẩm', 'error'); }
}

async function uploadFile(id, input) {
  const file = input.files[0]; if (!file) return;
  const fd = new FormData(); fd.append('file', file);
  try {
    const res = await fetch(API + '/api/products/' + id + '/file', { method: 'POST', headers: { Authorization: 'Bearer ' + getToken() }, body: fd });
    if (!res.ok) throw new Error();
    toast('Upload thành công!', 'success'); loadAdminProducts();
  } catch(e) { toast('Upload thất bại', 'error'); }
  input.value = '';
}

async function loadAdminDeposits() {
  try {
    const deposits = await apiFetch('/api/deposits');
    const pending = deposits.filter(d => d.status === 'pending');
    const done = deposits.filter(d => d.status !== 'pending').slice(-5).reverse();
    const el = document.getElementById('admin-deposits-list');
    const pHtml = pending.length ? pending.map(d => `
      <div class="admin-card" style="border-color:rgba(255,152,0,0.3);">
        <div style="display:flex;justify-content:space-between;">
          <div>
            <div class="name">${Number(d.amount).toLocaleString('vi-VN')} VND</div>
            <div class="sub">User: ${d.username||d.userId}</div>
            <div class="sub">${d.note||''}</div>
            <div class="sub">${new Date(d.createdAt).toLocaleString('vi-VN')}</div>
          </div>
          <span class="status-badge status-pending">Chờ duyệt</span>
        </div>
        <div class="action-row">
          <button class="btn-approve" onclick="approveDeposit(${d.id})">Duyệt +${Number(d.amount).toLocaleString('vi-VN')}đ</button>
          <button class="btn-reject" onclick="rejectDeposit(${d.id})">Từ chối</button>
        </div>
      </div>
    `).join('') : '<p style="color:var(--gray);font-size:13px;margin-bottom:12px;">Không có yêu cầu chờ duyệt</p>';
    const dHtml = done.map(d => `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;">
          <div><div class="name">${Number(d.amount).toLocaleString('vi-VN')} VND — ${d.username}</div>
          <div class="sub">${new Date(d.createdAt).toLocaleDateString('vi-VN')}</div></div>
          <span class="status-badge ${d.status==='approved'?'status-approved':'status-rejected'}">${d.status==='approved'?'Đã duyệt':'Từ chối'}</span>
        </div>
      </div>
    `).join('');
    el.innerHTML = pHtml + (done.length ? `<p style="color:var(--gray);font-size:12px;margin:12px 0 8px;">Đã xử lý</p>${dHtml}` : '');
  } catch(e) {}
}

async function approveDeposit(id) {
  try { await apiFetch('/api/deposits/' + id + '/approve', { method: 'PATCH' }); toast('Đã duyệt!', 'success'); loadAdminDeposits(); }
  catch(e) { toast('Lỗi', 'error'); }
}
async function rejectDeposit(id) {
  try { await apiFetch('/api/deposits/' + id + '/reject', { method: 'PATCH' }); toast('Đã từ chối!', 'success'); loadAdminDeposits(); }
  catch(e) { toast('Lỗi', 'error'); }
}

async function loadAdminCards() {
  try {
    const cards = await apiFetch('/api/cards');
    const pending = cards.filter(c => c.status === 'pending');
    const done = cards.filter(c => c.status !== 'pending').slice(-5).reverse();
    const el = document.getElementById('admin-cards-list');
    const pHtml = pending.length ? pending.map(c => `
      <div class="admin-card" style="border-color:rgba(255,152,0,0.3);">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <div>
            <div class="name">${c.carrier} — ${Number(c.denomination).toLocaleString('vi-VN')}đ</div>
            <div class="sub">User: ${c.username||c.userId}</div>
            <div class="sub">Mã thẻ: <span class="code">${c.cardCode}</span></div>
            <div class="sub">Seri: <span class="code">${c.serial}</span></div>
          </div>
          <span class="status-badge status-pending">Chờ</span>
        </div>
        <div class="action-row">
          <button class="btn-approve" onclick="approveCard(${c.id})">100%</button>
          <button class="btn-half" onclick="approveCardHalf(${c.id})">50%</button>
          <button class="btn-reject" onclick="rejectCard(${c.id})">Từ chối</button>
        </div>
      </div>
    `).join('') : '<p style="color:var(--gray);font-size:13px;margin-bottom:12px;">Không có thẻ chờ duyệt</p>';
    const dHtml = done.map(c => `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;">
          <div><div class="name">${c.carrier} — ${Number(c.denomination).toLocaleString('vi-VN')}đ — ${c.username}</div></div>
          <span class="status-badge ${c.status==='approved'?'status-approved':c.status==='approved_half'?'status-pending':'status-rejected'}">
            ${c.status==='approved'?'100%':c.status==='approved_half'?'50%':'Từ chối'}
          </span>
        </div>
      </div>
    `).join('');
    el.innerHTML = pHtml + (done.length ? `<p style="color:var(--gray);font-size:12px;margin:12px 0 8px;">Đã xử lý</p>${dHtml}` : '');
  } catch(e) {}
}

async function approveCard(id) { try { await apiFetch('/api/cards/'+id+'/approve',{method:'PATCH'}); toast('Duyệt 100%!','success'); loadAdminCards(); } catch(e){toast('Lỗi','error');} }
async function approveCardHalf(id) { try { await apiFetch('/api/cards/'+id+'/approve-half',{method:'PATCH'}); toast('Duyệt 50%!','success'); loadAdminCards(); } catch(e){toast('Lỗi','error');} }
async function rejectCard(id) { try { await apiFetch('/api/cards/'+id+'/reject',{method:'PATCH'}); toast('Từ chối!','success'); loadAdminCards(); } catch(e){toast('Lỗi','error');} }

async function loadAdminUsers() {
  try {
    allUsers = await apiFetch('/api/users');
    const el = document.getElementById('admin-users-list');
    el.innerHTML = allUsers.map(u => `
      <div class="user-row">
        <div><div class="uname">${u.username} ${u.isAdmin?'<span style="font-size:11px;color:var(--yellow)">[ADMIN]</span>':''}</div><div class="uid">Mã KH: ${u.customerId}</div></div>
        <div class="ubal">${Number(u.balance).toLocaleString('vi-VN')}đ</div>
      </div>
    `).join('');
  } catch(e) {}
}

async function submitAddBalance() {
  const cid = document.getElementById('add-bal-id').value.trim();
  const amount = Number(document.getElementById('add-bal-amount').value);
  if (!cid || !amount) { toast('Nhập đủ thông tin', 'error'); return; }
  const user = allUsers.find(u => u.customerId === cid);
  if (!user) { toast('Không tìm thấy mã KH: ' + cid, 'error'); return; }
  try {
    await apiFetch('/api/users/' + user.id + '/balance', { method: 'PATCH', body: JSON.stringify({ amount }) });
    toast('Đã cộng ' + amount.toLocaleString('vi-VN') + ' VND cho ' + user.username, 'success');
    document.getElementById('add-bal-id').value=''; document.getElementById('add-bal-amount').value='';
    loadAdminUsers();
  } catch(e) { toast('Lỗi cộng tiền', 'error'); }
}

async function loadAdminSettings() {
  try {
    const s = await apiFetch('/api/settings');
    const fields = [
      { key:'shopName', label:'Tên shop' }, { key:'shopTagline', label:'Tagline' },
      { key:'shopDescription', label:'Mô tả' }, { key:'contactEmail', label:'Email liên hệ' },
      { key:'bankOwner', label:'Chủ tài khoản' }, { key:'bankAccount', label:'Số tài khoản' },
      { key:'bankName', label:'Tên ngân hàng' }, { key:'bankQr', label:'URL mã QR' },
      { key:'zaloLink', label:'Link Zalo' }, { key:'facebookLink', label:'Link Facebook' },
    ];
    document.getElementById('settings-form').innerHTML = fields.map(f => `
      <div class="settings-field">
        <label>${f.label}</label>
        <input class="dark-input" data-key="${f.key}" value="${escHtml(s[f.key]||'')}" onblur="saveSettingField(this)" placeholder="${f.label}" />
      </div>
    `).join('') + `<p style="font-size:11px;color:var(--gray);text-align:center;margin-top:8px;">Lượt truy cập: ${s.totalVisitors.toLocaleString('vi-VN')}</p>`;
  } catch(e) {}
}

async function saveSettingField(input) {
  const key = input.dataset.key; const value = input.value.trim();
  try { await apiFetch('/api/settings', { method: 'PATCH', body: JSON.stringify({ [key]: value||null }) }); toast('Đã lưu!', 'success'); }
  catch(e) { toast('Lỗi lưu cài đặt', 'error'); }
}

// -------- START --------
init();
