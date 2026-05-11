// ============================================================
//  utils.js — State, API, Toast, Router, Drawer
// ============================================================

const API = '';

// ---------- SHARED STATE ----------
window.State = {
  currentUser: null,
  settings: {},
  allUsers: [],
  selectedAmount: null,
};

// ---------- TOKEN ----------
const getToken = () => localStorage.getItem('auth_token');
const setToken = t => localStorage.setItem('auth_token', t);
const removeToken = () => localStorage.removeItem('auth_token');

// ---------- API HELPER ----------
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

// ---------- TOAST ----------
function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 3200);
}

// ---------- MODAL ----------
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ---------- PAGE ROUTER ----------
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  if (!pg) return;
  pg.classList.add('active');

  if (name === 'home')             loadHome();
  if (name === 'deposit-atm')      loadDepositAtm();
  if (name === 'deposit-card')     loadDepositCard();
  if (name === 'history-deposit')  loadHistoryDeposit();
  if (name === 'history-purchase') loadHistoryPurchase();
  if (name === 'admin')            loadAdmin();
}

// ---------- DRAWER ----------
function toggleDrawer() {
  document.getElementById('drawer').classList.toggle('open');
  document.getElementById('drawer-overlay').classList.toggle('open');
}

function navTo(page) {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  showPage(page);
}

function updateDrawerUser() {
  const u = window.State.currentUser;
  if (!u) { updateDrawerGuest(); return; }
  document.getElementById('drawer-auth').style.display = 'flex';
  document.getElementById('drawer-guest').style.display = 'none';
  document.getElementById('drawer-avatar').textContent = u.username[0].toUpperCase();
  document.getElementById('drawer-username').textContent = u.username;
  document.getElementById('drawer-id').textContent = 'Mã KH: ' + u.customerId;
  document.getElementById('drawer-balance').textContent = Number(u.balance).toLocaleString('vi-VN') + ' VND';
  document.getElementById('nav-login-btn').style.display = 'none';
  document.getElementById('admin-link').style.display = u.isAdmin ? 'flex' : 'none';
}

function updateDrawerGuest() {
  document.getElementById('drawer-auth').style.display = 'none';
  document.getElementById('drawer-guest').style.display = 'flex';
  document.getElementById('nav-login-btn').style.display = 'block';
}

function syncBalance(newBalance) {
  if (window.State.currentUser) {
    window.State.currentUser.balance = newBalance;
    document.getElementById('drawer-balance').textContent = Number(newBalance).toLocaleString('vi-VN') + ' VND';
  }
}

// ---------- SNOW ----------
function initSnow() {
  const canvas = document.getElementById('snow-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const TOTAL = 160;
  const flakes = Array.from({ length: TOTAL }, () => ({
    x:     Math.random() * window.innerWidth,
    y:     Math.random() * window.innerHeight,
    r:     Math.random() * 3.5 + 1.2,
    speed: Math.random() * 0.7 + 0.25,
    drift: (Math.random() - 0.5) * 0.35,
    op:    Math.random() * 0.55 + 0.25,
  }));

  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    flakes.forEach(f => {
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,230,255,${f.op})`;
      ctx.fill();
      f.y += f.speed;
      f.x += f.drift;
      if (f.y > canvas.height + 6) { f.y = -6; f.x = Math.random() * canvas.width; }
      if (f.x >  canvas.width  + 6) f.x = -6;
      if (f.x < -6)                 f.x = canvas.width + 6;
    });
    requestAnimationFrame(draw);
  })();
}

// ---------- STARS ----------
function initStars() {
  const c = document.getElementById('stars');
  if (!c || c.childElementCount > 0) return;
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2 + 1;
    s.style.cssText = `width:${size}px;height:${size}px;top:${Math.random()*100}%;left:${Math.random()*100}%;opacity:${Math.random()*0.4+0.1};`;
    c.appendChild(s);
  }
}

function escHtml(s) { return (s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }

// ---------- BOOT ----------
async function boot() {
  initSnow();
  initStars();

  // Load settings
  try {
    const s = await apiFetch('/api/settings');
    window.State.settings = s;
    applySettings(s);
  } catch (e) {}

  // Restore session
  if (getToken()) {
    try {
      const u = await apiFetch('/api/auth/me');
      window.State.currentUser = u;
      updateDrawerUser();
    } catch (e) {
      removeToken();
      updateDrawerGuest();
    }
  } else {
    updateDrawerGuest();
  }

  showPage('home');
}

function applySettings(s) {
  if (s.shopTagline) document.getElementById('hero-tagline').textContent = s.shopTagline;
  if (s.shopDescription) document.getElementById('hero-sub').textContent = s.shopDescription;
  if (s.contactEmail) document.getElementById('hero-email').textContent = s.contactEmail;
  if (s.totalVisitors !== undefined) document.getElementById('visitor-count').textContent = Number(s.totalVisitors).toLocaleString('vi-VN');
  if (s.zaloLink) document.getElementById('float-zalo').href = s.zaloLink;
  if (s.facebookLink) document.getElementById('float-fb').href = s.facebookLink;
}

document.addEventListener('DOMContentLoaded', boot);
