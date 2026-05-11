// ============================================================
//  shop.js — Trang chủ, danh sách sản phẩm, mua hàng
// ============================================================

async function loadHome() {
  try {
    const products = await apiFetch('/api/products');
    renderProducts(products);
  } catch (e) {
    document.getElementById('products-list').innerHTML =
      '<div class="empty-msg">Không thể tải sản phẩm. Vui lòng thử lại.</div>';
  }
}

function renderProducts(products) {
  const el = document.getElementById('products-list');
  if (!products || !products.length) {
    el.innerHTML = '<div class="empty-msg">Chưa có sản phẩm nào</div>';
    return;
  }

  el.innerHTML = products.map(p => {
    const isSale = !!p.onSale;
    const priceClass = isSale ? 'sale-price' : 'normal-price';
    const btnClass   = isSale ? 'sale' : 'normal';
    const btnLabel   = window.State.currentUser
      ? (isSale ? '🔥 MUA NGAY GÓI SIÊU SALE' : '🛒 MUA ' + p.name.toUpperCase())
      : '🔐 ĐĂNG NHẬP ĐỂ MUA';

    const origHtml = (isSale && p.originalPrice)
      ? `<div class="product-orig">${Number(p.originalPrice).toLocaleString('vi-VN')}K</div>`
      : '';

    const descHtml = p.description
      ? `<div class="product-desc">${p.description}</div>`
      : '';

    const featuresHtml = p.features
      ? `<ul class="product-features">${
          p.features.split('\n').filter(Boolean).map(f => `<li>${f}</li>`).join('')
        }</ul>`
      : '';

    return `
      <div class="product-card ${isSale ? 'sale' : ''}">
        ${isSale ? '<div class="sale-badge"><div class="sale-badge-inner">ĐANG SALE</div></div>' : ''}
        <div class="product-name">${p.name}</div>
        <div class="product-price-row">
          <div class="product-price ${priceClass}">${Number(p.price).toLocaleString('vi-VN')}đ</div>
          ${origHtml}
        </div>
        ${descHtml}
        ${featuresHtml}
        <button
          class="btn-buy ${btnClass}"
          onclick="buyProduct(${p.id}, ${Number(p.price)}, '${escHtml(p.name)}')">
          ${btnLabel}
        </button>
      </div>
    `;
  }).join('');
}

async function buyProduct(id, price, name) {
  const user = window.State.currentUser;

  // Chưa đăng nhập → sang trang login
  if (!user) {
    showPage('login');
    return;
  }

  // Kiểm tra số dư cục bộ trước
  if (Number(user.balance) < price) {
    toast('Số dư không đủ! Vui lòng nạp thêm tiền.', 'error');
    return;
  }

  try {
    // Gọi API mua hàng
    const purchase = await apiFetch('/api/purchases', {
      method: 'POST',
      body: JSON.stringify({ productId: id }),
    });

    // Trừ số dư cục bộ (API không trả về balance mới)
    const newBalance = Number(user.balance) - price;
    syncBalance(newBalance);

    // Hiển thị modal thành công
    document.getElementById('purchase-modal-info').textContent =
      name + ' — Đã trừ: ' + price.toLocaleString('vi-VN') + ' VND';

    const dlBtn = document.getElementById('purchase-dl-btn');
    if (purchase.fileUrl) {
      dlBtn.href = purchase.fileUrl;
      dlBtn.download = purchase.fileName || 'file';
      dlBtn.style.display = 'block';
    } else {
      dlBtn.style.display = 'none';
    }

    document.getElementById('purchase-modal').classList.add('open');

    // Reload lại danh sách để cập nhật nút mua
    loadHome();

  } catch (e) {
    if (e && e.error === 'Insufficient balance') {
      toast('Số dư không đủ! Vui lòng nạp thêm tiền.', 'error');
    } else {
      toast(e.error || 'Lỗi khi mua hàng, vui lòng thử lại', 'error');
    }
  }
}
