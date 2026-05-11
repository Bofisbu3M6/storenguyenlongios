// ============================================================
//  deposit.js — Nạp ATM, Nạp thẻ cào, Lịch sử
// ============================================================

const AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000, 5000000];

// -------- NẠP TIỀN ATM --------
function loadDepositAtm() {
  if (!window.State.currentUser) { showPage('login'); return; }

  const s = window.State.settings;
  document.getElementById('bank-owner').textContent   = s.bankOwner   || '—';
  document.getElementById('bank-account').textContent = s.bankAccount || '—';
  document.getElementById('bank-name').textContent    = s.bankName    || '—';

  const qrC = document.getElementById('qr-container');
  if (s.bankQr) {
    document.getElementById('bank-qr').src = s.bankQr;
    qrC.style.display = 'flex';
  } else {
    qrC.style.display = 'none';
  }

  const cid = window.State.currentUser.customerId;
  document.getElementById('deposit-warning').textContent =
    'TRƯỚC KHI NHẤN NÚT GỬI YÊU CẦU, HÃY CHUYỂN KHOẢN TRƯỚC. ' +
    'Ghi nội dung chuyển khoản: SỐ TIỀN + MÃ KHÁCH HÀNG: ' + cid;

  // Reset lựa chọn
  window.State.selectedAmount = null;
  document.getElementById('selected-amount-display').style.display = 'none';

  const grid = document.getElementById('amount-grid');
  grid.innerHTML = AMOUNTS.map(a => {
    const label = a >= 1000000 ? (a / 1000000) + 'M' : (a / 1000) + 'K';
    return `<button class="amount-btn" onclick="selectAmount(${a}, this)">${label}</button>`;
  }).join('');
}

function selectAmount(amount, btn) {
  document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  window.State.selectedAmount = amount;
  document.getElementById('selected-amount-display').style.display = 'block';
  document.getElementById('amount-text').textContent = amount.toLocaleString('vi-VN') + ' VND';
}

async function submitDepositAtm() {
  if (!window.State.selectedAmount) {
    toast('Vui lòng chọn số tiền muốn nạp', 'error');
    return;
  }
  const btn = document.getElementById('deposit-atm-btn');
  btn.disabled = true;
  btn.textContent = 'Đang gửi...';
  try {
    await apiFetch('/api/deposits', {
      method: 'POST',
      body: JSON.stringify({
        amount: window.State.selectedAmount,
        note: 'ATM - ' + window.State.currentUser.customerId,
      }),
    });
    toast('Đã gửi yêu cầu! Chờ admin duyệt.', 'success');
    showPage('history-deposit');
  } catch (e) {
    toast(e.error || 'Lỗi khi gửi yêu cầu nạp tiền', 'error');
  }
  btn.disabled = false;
  btn.textContent = 'Gửi yêu cầu nạp';
}

// -------- NẠP THẺ CÀO --------
function loadDepositCard() {
  if (!window.State.currentUser) { showPage('login'); return; }
  // Không cần làm gì thêm, form đã có trong HTML
}

function openCardConfirm() {
  if (!window.State.currentUser) { showPage('login'); return; }

  const code    = document.getElementById('card-code').value.trim();
  const serial  = document.getElementById('card-serial').value.trim();
  const carrier = document.getElementById('card-carrier').value;
  const denom   = document.getElementById('card-denom').value;

  if (!code || !serial || !carrier || !denom) {
    toast('Vui lòng điền đầy đủ thông tin thẻ', 'error');
    return;
  }

  document.getElementById('card-confirm-info').innerHTML =
    `Nhà mạng: <b>${carrier}</b><br>` +
    `Mệnh giá: <b>${Number(denom).toLocaleString('vi-VN')}đ</b><br>` +
    `Mã thẻ: <b>${code}</b><br>` +
    `Seri: <b>${serial}</b>`;

  document.getElementById('card-confirm-modal').classList.add('open');
}

async function submitCard() {
  const code    = document.getElementById('card-code').value.trim();
  const serial  = document.getElementById('card-serial').value.trim();
  const carrier = document.getElementById('card-carrier').value;
  const denom   = Number(document.getElementById('card-denom').value);

  closeModal('card-confirm-modal');

  try {
    await apiFetch('/api/cards', {
      method: 'POST',
      body: JSON.stringify({ cardCode: code, serial, carrier, denomination: denom }),
    });
    toast('Đã gửi thẻ! Chờ admin duyệt.', 'success');
    // Xoá form
    document.getElementById('card-code').value    = '';
    document.getElementById('card-serial').value  = '';
    document.getElementById('card-carrier').value = '';
    document.getElementById('card-denom').value   = '';
    showPage('history-deposit');
  } catch (e) {
    toast(e.error || 'Lỗi khi gửi thẻ', 'error');
  }
}

// -------- LỊCH SỬ NẠP TIỀN --------
async function loadHistoryDeposit() {
  if (!window.State.currentUser) { showPage('login'); return; }

  const el = document.getElementById('history-deposit-list');
  el.innerHTML = '<div class="empty-msg">Đang tải...</div>';

  try {
    const deposits = await apiFetch('/api/deposits');
    if (!deposits.length) {
      el.innerHTML = '<div class="empty-msg">Chưa có lịch sử nạp tiền</div>';
      return;
    }
    el.innerHTML = [...deposits].reverse().map(d => {
      const cls   = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' }[d.status] || '';
      const label = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }[d.status] || d.status;
      const date  = new Date(d.createdAt).toLocaleString('vi-VN');
      return `
        <div class="history-item">
          <div class="history-left">
            <div class="h-amount">${Number(d.amount).toLocaleString('vi-VN')} VND</div>
            <div class="h-sub">${d.note || ''} · ${date}</div>
          </div>
          <div class="history-right">
            <span class="status-badge ${cls}">${label}</span>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="empty-msg">Không thể tải dữ liệu</div>';
  }
}

// -------- LỊCH SỬ MUA HÀNG --------
async function loadHistoryPurchase() {
  if (!window.State.currentUser) { showPage('login'); return; }

  const el = document.getElementById('history-purchase-list');
  el.innerHTML = '<div class="empty-msg">Đang tải...</div>';

  try {
    const purchases = await apiFetch('/api/purchases');
    if (!purchases.length) {
      el.innerHTML = '<div class="empty-msg">Chưa có lịch sử mua hàng</div>';
      return;
    }
    el.innerHTML = [...purchases].reverse().map(p => {
      const date = new Date(p.createdAt).toLocaleString('vi-VN');
      const dlHtml = p.fileUrl
        ? `<a class="download-link" href="${p.fileUrl}" download="${p.fileName || 'file'}">Tải file</a>`
        : '';
      return `
        <div class="history-item">
          <div class="history-left">
            <div class="h-amount" style="color:var(--white)">${p.productName}</div>
            <div class="h-sub">${date}</div>
          </div>
          <div class="history-right">
            <div style="font-weight:800;color:var(--orange)">-${Number(p.price).toLocaleString('vi-VN')} VND</div>
            ${dlHtml}
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = '<div class="empty-msg">Không thể tải dữ liệu</div>';
  }
}
