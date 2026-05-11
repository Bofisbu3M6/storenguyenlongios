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
