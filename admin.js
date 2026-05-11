// ============================================================
//  admin.js — Admin Panel: Sản phẩm, ATM, Thẻ, Users, Cài đặt
// ============================================================

async function loadAdmin() {
  if (!window.State.currentUser) { showPage('login'); return; }
  if (!window.State.currentUser.isAdmin) { showPage('home'); return; }
  loadAdminProducts();
}

// -------- CHUYỂN TAB --------
function switchTab(name) {
  const tabs = ['products', 'deposits', 'cards', 'users', 'settings'];
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', tabs[i] === name);
  });
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');

  if (name === 'products') loadAdminProducts();
  if (name === 'deposits') loadAdminDeposits();
  if (name === 'cards')    loadAdminCards();
  if (name === 'users')    loadAdminUsers();
  if (name === 'settings') loadAdminSettings();
}

// -------- PRODUCTS --------
async function loadAdminProducts() {
  const el = document.getElementById('admin-products-list');
  el.innerHTML = '<div class="empty-msg">Đang tải...</div>';
  try {
    const products = await apiFetch('/api/products');
    if (!products.length) { el.innerHTML = '<div class="empty-msg">Chưa có sản phẩm</div>'; return; }
    el.innerHTML = products.map(p => `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div class="name">${p.name} ${p.onSale ? '<span style="color:var(--orange);font-size:11px;">SALE</span>' : ''}</div>
            <div class="sub" style="color:var(--cyan)">${Number(p.price).toLocaleString('vi-VN')} VND</div>
            ${p.fileName ? `<div class="sub" style="color:var(--green)">File: ${p.fileName}</div>` : '<div class="sub">Chưa có file</div>'}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
            <label style="cursor:pointer;">
              <span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;background:rgba(0,229,255,0.12);color:var(--cyan);border:1px solid rgba(0,229,255,0.3);">Upload</span>
              <input type="file" style="display:none" onchange="uploadProductFile(${p.id}, this)" />
            </label>
            <button class="btn-del" onclick="deleteProduct(${p.id})">Xoá</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) { el.innerHTML = '<div class="empty-msg">Lỗi tải sản phẩm</div>'; }
}

function toggleAddProduct() {
  const f = document.getElementById('add-product-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

async function submitAddProduct() {
  const name  = document.getElementById('np-name').value.trim();
  const price = Number(document.getElementById('np-price').value);
  const orig  = document.getElementById('np-orig').value ? Number(document.getElementById('np-orig').value) : null;
  const onSale = document.getElementById('np-sale').checked;
  const description = document.getElementById('np-desc').value.trim() || null;
  const features    = document.getElementById('np-features').value.trim() || null;

  if (!name || !price) { toast('Nhập tên và giá sản phẩm', 'error'); return; }

  try {
    await apiFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify({ name, price, originalPrice: orig, onSale, description, features }),
    });
    toast('Đã thêm sản phẩm!', 'success');
    ['np-name','np-price','np-orig','np-desc','np-features'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('np-sale').checked = false;
    toggleAddProduct();
    loadAdminProducts();
  } catch (e) { toast(e.error || 'Lỗi thêm sản phẩm', 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('Xoá sản phẩm này?')) return;
  try {
    await apiFetch('/api/products/' + id, { method: 'DELETE' });
    toast('Đã xoá sản phẩm!', 'success');
    loadAdminProducts();
  } catch (e) { toast('Lỗi xoá sản phẩm', 'error'); }
}

async function uploadProductFile(id, input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch(API + '/api/products/' + id + '/file', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getToken() },
      body: fd,
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw err; }
    toast('Upload file thành công!', 'success');
    loadAdminProducts();
  } catch (e) { toast(e.error || 'Upload thất bại', 'error'); }
  input.value = '';
}

// -------- DEPOSITS --------
async function loadAdminDeposits() {
  const el = document.getElementById('admin-deposits-list');
  el.innerHTML = '<div class="empty-msg">Đang tải...</div>';
  try {
    const all = await apiFetch('/api/deposits');
    const pending = all.filter(d => d.status === 'pending');
    const done    = all.filter(d => d.status !== 'pending').slice(-8).reverse();

    const pHtml = pending.length
      ? pending.map(d => `
          <div class="admin-card" style="border-color:rgba(255,152,0,0.35);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div class="name">${Number(d.amount).toLocaleString('vi-VN')} VND</div>
                <div class="sub">User: ${d.username || d.userId}</div>
                <div class="sub">${d.note || ''}</div>
                <div class="sub">${new Date(d.createdAt).toLocaleString('vi-VN')}</div>
              </div>
              <span class="status-badge status-pending">Chờ duyệt</span>
            </div>
            <div class="action-row">
              <button class="btn-approve" onclick="approveDeposit(${d.id})">✅ Duyệt +${Number(d.amount).toLocaleString('vi-VN')}đ</button>
              <button class="btn-reject"  onclick="rejectDeposit(${d.id})">❌ Từ chối</button>
            </div>
          </div>
        `).join('')
      : '<p style="color:var(--gray);font-size:13px;padding:8px 0;">Không có yêu cầu nào đang chờ</p>';

    const dHtml = done.map(d => `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="name">${Number(d.amount).toLocaleString('vi-VN')} VND — ${d.username || d.userId}</div>
            <div class="sub">${new Date(d.createdAt).toLocaleDateString('vi-VN')}</div>
          </div>
          <span class="status-badge ${d.status === 'approved' ? 'status-approved' : 'status-rejected'}">
            ${d.status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
          </span>
        </div>
      </div>
    `).join('');

    el.innerHTML = pHtml + (done.length ? `<p style="color:var(--gray);font-size:12px;margin:14px 0 8px;">Đã xử lý gần đây</p>${dHtml}` : '');
  } catch (e) { el.innerHTML = '<div class="empty-msg">Lỗi tải dữ liệu</div>'; }
}

async function approveDeposit(id) {
  try { await apiFetch('/api/deposits/' + id + '/approve', { method: 'PATCH' }); toast('Đã duyệt!', 'success'); loadAdminDeposits(); }
  catch (e) { toast('Lỗi duyệt', 'error'); }
}
async function rejectDeposit(id) {
  try { await apiFetch('/api/deposits/' + id + '/reject', { method: 'PATCH' }); toast('Đã từ chối!', 'success'); loadAdminDeposits(); }
  catch (e) { toast('Lỗi từ chối', 'error'); }
}

// -------- CARDS --------
async function loadAdminCards() {
  const el = document.getElementById('admin-cards-list');
  el.innerHTML = '<div class="empty-msg">Đang tải...</div>';
  try {
    const all = await apiFetch('/api/cards');
    const pending = all.filter(c => c.status === 'pending');
    const done    = all.filter(c => c.status !== 'pending').slice(-8).reverse();

    const pHtml = pending.length
      ? pending.map(c => `
          <div class="admin-card" style="border-color:rgba(255,152,0,0.35);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
              <div>
                <div class="name">${c.carrier} — ${Number(c.denomination).toLocaleString('vi-VN')}đ</div>
                <div class="sub">User: ${c.username || c.userId}</div>
                <div class="sub">Mã: <span class="code">${c.cardCode}</span></div>
                <div class="sub">Seri: <span class="code">${c.serial}</span></div>
              </div>
              <span class="status-badge status-pending">Chờ</span>
            </div>
            <div class="action-row">
              <button class="btn-approve" onclick="approveCard(${c.id})">✅ 100%</button>
              <button class="btn-half"    onclick="approveCardHalf(${c.id})">⚡ 50%</button>
              <button class="btn-reject"  onclick="rejectCard(${c.id})">❌ Từ chối</button>
            </div>
          </div>
        `).join('')
      : '<p style="color:var(--gray);font-size:13px;padding:8px 0;">Không có thẻ nào đang chờ</p>';

    const dHtml = done.map(c => {
      const cls   = { approved: 'status-approved', approved_half: 'status-pending', rejected: 'status-rejected' }[c.status] || '';
      const label = { approved: '100%', approved_half: '50%', rejected: 'Từ chối' }[c.status] || c.status;
      return `
        <div class="admin-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div class="name">${c.carrier} ${Number(c.denomination).toLocaleString('vi-VN')}đ — ${c.username || c.userId}</div>
            </div>
            <span class="status-badge ${cls}">${label}</span>
          </div>
        </div>`;
    }).join('');

    el.innerHTML = pHtml + (done.length ? `<p style="color:var(--gray);font-size:12px;margin:14px 0 8px;">Đã xử lý</p>${dHtml}` : '');
  } catch (e) { el.innerHTML = '<div class="empty-msg">Lỗi tải dữ liệu</div>'; }
}

async function approveCard(id) { try { await apiFetch('/api/cards/'+id+'/approve',{method:'PATCH'}); toast('Duyệt 100%!','success'); loadAdminCards(); } catch(e){toast('Lỗi','error');} }
async function approveCardHalf(id) { try { await apiFetch('/api/cards/'+id+'/approve-half',{method:'PATCH'}); toast('Duyệt 50%!','success'); loadAdminCards(); } catch(e){toast('Lỗi','error');} }
async function rejectCard(id) { try { await apiFetch('/api/cards/'+id+'/reject',{method:'PATCH'}); toast('Từ chối!','success'); loadAdminCards(); } catch(e){toast('Lỗi','error');} }

// -------- USERS --------
async function loadAdminUsers() {
  const el = document.getElementById('admin-users-list');
  el.innerHTML = '<div class="empty-msg">Đang tải...</div>';
  try {
    const users = await apiFetch('/api/users');
    window.State.allUsers = users;
    if (!users.length) { el.innerHTML = '<div class="empty-msg">Chưa có tài khoản</div>'; return; }
    el.innerHTML = users.map(u => `
      <div class="user-row">
        <div>
          <div class="uname">${u.username}${u.isAdmin ? ' <span style="font-size:11px;color:var(--yellow)">[ADMIN]</span>' : ''}</div>
          <div class="uid">Mã KH: ${u.customerId}</div>
        </div>
        <div class="ubal">${Number(u.balance).toLocaleString('vi-VN')}đ</div>
      </div>
    `).join('');
  } catch (e) { el.innerHTML = '<div class="empty-msg">Lỗi tải tài khoản</div>'; }
}

async function submitAddBalance() {
  const cid    = document.getElementById('add-bal-id').value.trim();
  const amount = Number(document.getElementById('add-bal-amount').value);
  if (!cid || !amount || amount <= 0) { toast('Nhập đủ mã KH và số tiền hợp lệ', 'error'); return; }

  const user = window.State.allUsers.find(u => u.customerId === cid);
  if (!user) { toast('Không tìm thấy mã KH: ' + cid, 'error'); return; }

  try {
    await apiFetch('/api/users/' + user.id + '/balance', {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    });
    toast('Đã cộng ' + amount.toLocaleString('vi-VN') + ' VND cho ' + user.username, 'success');
    document.getElementById('add-bal-id').value     = '';
    document.getElementById('add-bal-amount').value = '';
    loadAdminUsers();
  } catch (e) { toast(e.error || 'Lỗi cộng tiền', 'error'); }
}

// -------- SETTINGS --------
const SETTING_FIELDS = [
  { key: 'shopName',       label: 'Tên shop' },
  { key: 'shopTagline',    label: 'Tagline' },
  { key: 'shopDescription',label: 'Mô tả' },
  { key: 'contactEmail',   label: 'Email liên hệ' },
  { key: 'bankOwner',      label: 'Chủ tài khoản' },
  { key: 'bankAccount',    label: 'Số tài khoản' },
  { key: 'bankName',       label: 'Tên ngân hàng' },
  { key: 'bankQr',         label: 'URL mã QR ngân hàng' },
  { key: 'zaloLink',       label: 'Link Zalo' },
  { key: 'facebookLink',   label: 'Link Facebook' },
];

async function loadAdminSettings() {
  try {
    const s = await apiFetch('/api/settings');
    document.getElementById('settings-form').innerHTML =
      SETTING_FIELDS.map(f => `
        <div class="settings-field">
          <label>${f.label}</label>
          <input class="dark-input" data-key="${f.key}" value="${(s[f.key] || '').replace(/"/g,'&quot;')}"
            onblur="saveSettingField(this)" placeholder="${f.label}" />
        </div>
      `).join('') +
      `<p style="font-size:11px;color:var(--gray);text-align:center;margin-top:12px;">
         Lượt truy cập: ${Number(s.totalVisitors).toLocaleString('vi-VN')}
       </p>`;
  } catch (e) { toast('Lỗi tải cài đặt', 'error'); }
}

async function saveSettingField(input) {
  const key   = input.dataset.key;
  const value = input.value.trim() || null;
  try {
    await apiFetch('/api/settings', { method: 'PATCH', body: JSON.stringify({ [key]: value }) });
    toast('Đã lưu!', 'success');
    // Cập nhật settings trong state
    window.State.settings[key] = value;
  } catch (e) { toast('Lỗi lưu cài đặt', 'error'); }
}
