'use strict';
/* Desktop, windows, menus, dialogs, sound and rendering. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const desktop = $('#desktop');
const mqMobile = matchMedia('(max-width: 720px)');
const isMobile = () => mqMobile.matches;
const coarse = matchMedia('(pointer: coarse)').matches;

/* ---------- Persistent UI layout ---------- */

const UI_KEY = 'system7clicker.ui.v1';
const UI = {
  open: { clicker: true, store: true },
  pos: {}, shaded: {}, zoomed: {},
  storeMode: 'buy', storeAmt: 1,
};
function loadUI() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY));
    if (saved && typeof saved === 'object') Object.assign(UI, saved);
  } catch (e) { /* ignore */ }
}
let _uiSaveT = 0;
function saveUI() {
  clearTimeout(_uiSaveT);
  _uiSaveT = setTimeout(() => { try { localStorage.setItem(UI_KEY, JSON.stringify(UI)); } catch (e) { /* ignore */ } }, 300);
}

/* ---------- Sound (WebAudio, all synthesized) ---------- */

const Sound = {
  ctx: null,
  unlocked: false,
  ensure() {
    if (!this.unlocked || !S.settings.sound || S.settings.volume <= 0) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(f, d, { type = 'square', vol = 0.08, at = 0, slide = null } = {}) {
    const c = this.ensure();
    if (!c) return;
    const v = vol * S.settings.volume;
    if (v <= 0.0001) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + d + 0.03);
  },
  noise(d, { vol = 0.2, at = 0, from = 2500, to = 200 } = {}) {
    const c = this.ensure();
    if (!c) return;
    const v = vol * S.settings.volume;
    if (v <= 0.0001) return;
    const t = c.currentTime + at;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + d);
    const g = c.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  },
  click() { this.tone(900 + Math.random() * 300, 0.035, { vol: 0.04 }); },
  buy() { this.tone(523, 0.07, { vol: 0.05 }); this.tone(784, 0.1, { vol: 0.05, at: 0.07 }); },
  sell() { this.tone(784, 0.07, { vol: 0.05 }); this.tone(440, 0.1, { vol: 0.05, at: 0.07 }); },
  nope() { this.tone(180, 0.12, { vol: 0.06 }); },
  achieve() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.14, at: i * 0.09 })); },
  lucky() { [880, 1175, 1397, 1760, 2093].forEach((f, i) => this.tone(f, 0.1, { type: 'sine', vol: 0.12, at: i * 0.05 })); },
  error() { this.tone(330, 0.16, { vol: 0.07 }); this.tone(247, 0.26, { vol: 0.07, at: 0.18 }); },
  trash() { this.noise(0.5, { vol: 0.35 }); this.noise(0.25, { vol: 0.25, at: 0.18, from: 1800, to: 300 }); },
  chord() { [262, 330, 392, 523, 659].forEach(f => this.tone(f, 1.6, { type: 'triangle', vol: 0.07 })); },
};

['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { Sound.unlocked = true; }, { capture: true, once: true }));

/* ---------- Balloon help ---------- */

let balloonFn = null, balloonAnchor = null, balloonTimer = 0;

function showBalloon(anchor, fn, ms = 0) {
  if (!S.settings.balloons) return;
  balloonFn = fn;
  balloonAnchor = anchor;
  clearTimeout(balloonTimer);
  if (ms) balloonTimer = setTimeout(hideBalloon, ms);
  refreshBalloon();
}

function hideBalloon() {
  balloonFn = null;
  balloonAnchor = null;
  $('#balloon').className = '';
}

function refreshBalloon() {
  if (!balloonFn) return;
  if (!balloonAnchor || !balloonAnchor.isConnected || !balloonAnchor.offsetParent) { hideBalloon(); return; }
  const html = balloonFn();
  if (!html) { hideBalloon(); return; }
  const b = $('#balloon');
  if (b.innerHTML !== html) b.innerHTML = html;
  b.classList.add('on');
  const r = balloonAnchor.getBoundingClientRect();
  const bw = b.offsetWidth, bh = b.offsetHeight;
  let x = r.left - bw - 16, side = 'right';
  if (x < 4) { x = r.right + 16; side = 'left'; }
  if (x + bw > innerWidth - 4) { x = Math.max(4, innerWidth - bw - 4); }
  const cy = r.top + Math.min(r.height / 2, 24);
  let y = cy - 22;
  y = Math.max(26, Math.min(y, innerHeight - bh - 4));
  b.style.left = x + 'px';
  b.style.top = y + 'px';
  b.style.setProperty('--ty', Math.max(14, Math.min(bh - 14, cy - y)) + 'px');
  b.classList.remove('tail-left', 'tail-right');
  b.classList.add('tail-' + side);
}

function bindBalloons(container, selector, getHtml) {
  container.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest(selector);
    if (!el || !container.contains(el) || balloonAnchor === el) return;
    showBalloon(el, () => getHtml(el));
  });
  container.addEventListener('pointerout', e => {
    const el = e.target.closest(selector);
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
    if (balloonAnchor === el) hideBalloon();
  });
}

/* ---------- Notifications ---------- */

function notify(icon, title, text, opts = {}) {
  const box = $('#notes');
  const n = document.createElement('div');
  n.className = 'note';
  n.innerHTML = `${iconImg(icon, 32, opts.swap)}<div><b>${esc(title)}</b><small>${text}</small></div>`;
  box.appendChild(n);
  while (box.children.length > 5) box.firstChild.remove();
  const kill = () => { n.classList.add('out'); setTimeout(() => n.remove(), 300); };
  n.addEventListener('click', kill);
  setTimeout(kill, opts.ms || 5000);
}

/* ---------- Dialogs ---------- */

const openDialogs = [];

/**
 * buttons: [{ label, value, default, cancel, keep, onClick(dialogEl, close) }]
 * Returns a promise resolving to the clicked button's value. promise.close(v) closes it externally.
 */
function dialog({ icon = null, swap = null, html = '', buttons = [{ label: 'OK', default: true, cancel: true }], onOpen = null }) {
  hideBalloon();
  closeMenus();
  const layer = $('#modal-layer');
  const d = document.createElement('div');
  d.className = 'dialog';
  d.setAttribute('role', 'dialog');
  d.innerHTML = `<div class="dlg-inner"><div class="dlg-main">${icon ? iconImg(icon, 32, swap) : ''}<div class="dlg-text">${html}</div></div><div class="dlg-buttons"></div></div>`;
  let resolveFn;
  const promise = new Promise(res => { resolveFn = res; });
  let closed = false;
  const close = v => {
    if (closed) return;
    closed = true;
    d.remove();
    const i = openDialogs.indexOf(entry);
    if (i >= 0) openDialogs.splice(i, 1);
    if (!openDialogs.length) layer.classList.remove('on');
    G.busy = openDialogs.length > 0;
    resolveFn(v);
  };
  const entry = { el: d, close, buttons };
  const row = $('.dlg-buttons', d);
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn' + (b.default ? ' default' : '');
    btn.textContent = b.label;
    btn.addEventListener('click', () => {
      if (b.onClick) {
        const r = b.onClick(d, close, btn);
        if (b.keep || r === false) return;
      }
      if (!b.keep) close(b.value !== undefined ? b.value : b.label);
    });
    b.el = btn;
    row.appendChild(btn);
  });
  layer.appendChild(d);
  layer.classList.add('on');
  openDialogs.push(entry);
  G.busy = true;
  const def = buttons.find(b => b.default);
  if (onOpen) onOpen(d, close);
  else if (def) def.el.focus();
  promise.close = close;
  return promise;
}

document.addEventListener('keydown', e => {
  if (!openDialogs.length) return;
  const top = openDialogs[openDialogs.length - 1];
  if (e.key === 'Escape') {
    const c = top.buttons.find(b => b.cancel);
    if (c) { e.preventDefault(); c.el.click(); }
  } else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
    const d = top.buttons.find(b => b.default);
    if (d && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); d.el.click(); }
  }
});

function alertBox(icon, html) {
  return dialog({ icon, html, buttons: [{ label: 'OK', default: true, cancel: true }] });
}

/* ---------- Windows ---------- */

const WIN_DEFS = {
  clicker: { title: 'Clicker', w: 330, build: buildClicker },
  store: { title: 'Store', w: 390, h: 560, resizable: true, minW: 300, minH: 220, build: buildStore },
  achievements: { title: 'Achievements', w: 420, h: 380, resizable: true, minW: 260, minH: 180, build: buildAchievements },
  stats: { title: 'Statistics', w: 380, h: 460, resizable: true, minW: 280, minH: 200, build: buildStats },
  hd: { title: 'Hard Disk', w: 380, h: 230, resizable: true, minW: 240, minH: 140, build: buildHD },
  control: { title: 'Control Panel', w: 330, build: buildControl },
  readme: { title: 'Read Me', w: 440, h: 420, resizable: true, minW: 260, minH: 160, build: buildReadme },
  about: { title: 'About This Computer', w: 440, build: buildAbout },
};
const WIN_ORDER = ['clicker', 'store', 'hd', 'achievements', 'stats', 'control', 'readme', 'about'];
const winEls = {};
let zTop = 10;

function defaultRect(id) {
  const W = desktop.clientWidth, H = desktop.clientHeight;
  const def = WIN_DEFS[id];
  const rect = { x: 16, y: 16, w: def.w, h: def.h || null };
  const center = () => { rect.x = Math.max(10, Math.round((W - def.w) / 2)); rect.y = 40; };
  switch (id) {
    case 'clicker': rect.x = 16; rect.y = 14; break;
    case 'store':
      rect.x = 360; rect.y = 14;
      rect.h = Math.max(260, Math.min(H - 30, 640));
      if (W < 860) rect.x = Math.max(16, W - def.w - 100);
      break;
    case 'readme':
      if (W >= 1240) { rect.x = Math.min(770, W - def.w - 110); rect.y = 40; } else center();
      rect.h = Math.min(def.h, H - 60);
      break;
    case 'hd': rect.x = Math.max(16, W - def.w - 110); rect.y = 20; break;
    case 'achievements': rect.x = 110; rect.y = 70; break;
    case 'stats': rect.x = 150; rect.y = 50; rect.h = Math.min(def.h, H - 70); break;
    case 'control': rect.x = 200; rect.y = 90; break;
    case 'about': center(); break;
  }
  return rect;
}

function applyRect(id) {
  const el = winEls[id];
  const r = Object.assign(defaultRect(id), UI.pos[id] || {});
  el.style.left = r.x + 'px';
  el.style.top = r.y + 'px';
  el.style.width = r.w + 'px';
  el.style.height = WIN_DEFS[id].resizable && r.h ? r.h + 'px' : '';
  clampWindow(id);
}

function clampWindow(id) {
  const el = winEls[id];
  if (!el || isMobile() || !el.classList.contains('open')) return;
  const W = desktop.clientWidth, H = desktop.clientHeight;
  let x = el.offsetLeft, y = el.offsetTop;
  x = Math.min(Math.max(x, -el.offsetWidth + 80), W - 60);
  y = Math.min(Math.max(y, 0), H - 22);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}

function storeRect(id) {
  const el = winEls[id];
  const prev = UI.pos[id] || {};
  const r = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth };
  if (WIN_DEFS[id].resizable) {
    r.h = el.classList.contains('shaded') ? (prev.h || parseInt(el.style.height, 10) || undefined) : el.offsetHeight;
  }
  UI.pos[id] = r;
  saveUI();
}

function createWindow(id) {
  const def = WIN_DEFS[id];
  const el = document.createElement('div');
  el.className = 'window' + (def.resizable ? ' resizable has-scroll' : '');
  el.id = 'win-' + id;
  el.dataset.id = id;
  el.innerHTML = `<div class="titlebar"><button class="wbox close" title="Close" aria-label="Close"></button>`
    + `<span class="title">${esc(def.title)}</span>`
    + (def.resizable ? '<button class="wbox zoom" title="Zoom" aria-label="Zoom"></button>' : '')
    + `<button class="wbox shade" title="Roll up" aria-label="Roll up"></button></div>`
    + `<div class="wbody"></div>`
    + (def.resizable ? '<div class="wfoot"><span class="foot-text"></span><div class="grow"></div></div>' : '');
  desktop.appendChild(el);
  winEls[id] = el;
  def.build($('.wbody', el), el);

  el.addEventListener('pointerdown', () => focusWindow(id), true);
  $('.wbox.close', el).addEventListener('click', () => closeWindow(id));
  $('.wbox.shade', el).addEventListener('click', () => toggleShade(id));
  if (def.resizable) {
    $('.wbox.zoom', el).addEventListener('click', () => toggleZoom(id));
    makeResizable(el, id);
  }
  makeDraggable(el, id);
  if (UI.shaded[id]) el.classList.add('shaded');
  applyRect(id);
  return el;
}

function makeDraggable(el, id) {
  const tb = $('.titlebar', el);
  tb.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('.wbox') || isMobile()) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
    tb.setPointerCapture(e.pointerId);
    const move = ev => {
      el.style.left = (ox + ev.clientX - sx) + 'px';
      el.style.top = (oy + ev.clientY - sy) + 'px';
      clampWindow(id);
    };
    const up = () => {
      tb.removeEventListener('pointermove', move);
      tb.removeEventListener('pointerup', up);
      tb.removeEventListener('pointercancel', up);
      storeRect(id);
    };
    tb.addEventListener('pointermove', move);
    tb.addEventListener('pointerup', up);
    tb.addEventListener('pointercancel', up);
  });
  tb.addEventListener('dblclick', e => { if (!e.target.closest('.wbox')) toggleShade(id); });
}

function makeResizable(el, id) {
  const grow = $('.grow', el);
  const def = WIN_DEFS[id];
  grow.addEventListener('pointerdown', e => {
    if (e.button !== 0 || isMobile()) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, ow = el.offsetWidth, oh = el.offsetHeight;
    grow.setPointerCapture(e.pointerId);
    const move = ev => {
      el.style.width = Math.max(def.minW || 200, ow + ev.clientX - sx) + 'px';
      el.style.height = Math.max(def.minH || 120, oh + ev.clientY - sy) + 'px';
      refreshBalloon();
    };
    const up = () => {
      grow.removeEventListener('pointermove', move);
      grow.removeEventListener('pointerup', up);
      grow.removeEventListener('pointercancel', up);
      UI.zoomed[id] = null;
      storeRect(id);
    };
    grow.addEventListener('pointermove', move);
    grow.addEventListener('pointerup', up);
    grow.addEventListener('pointercancel', up);
  });
}

function focusWindow(id) {
  const el = winEls[id];
  if (!el) return;
  if (el.style.zIndex != zTop) el.style.zIndex = ++zTop;
  for (const [k, w] of Object.entries(winEls)) w.classList.toggle('active', k === id);
}

function activeId() {
  let best = null, z = -1;
  for (const [k, w] of Object.entries(winEls)) {
    if (w.classList.contains('open') && +w.style.zIndex > z) { z = +w.style.zIndex; best = k; }
  }
  return best;
}

function openWindow(id) {
  const el = winEls[id];
  if (!el) return;
  const wasOpen = el.classList.contains('open');
  el.classList.add('open');
  UI.open[id] = true;
  saveUI();
  if (!wasOpen) applyRect(id);
  focusWindow(id);
  renderWindow(id);
  if (id === 'about') egg('about');
  if (id === 'readme') egg('readme');
  if (isMobile()) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeWindow(id) {
  const el = winEls[id];
  if (!el) return;
  el.classList.remove('open', 'active');
  UI.open[id] = false;
  saveUI();
  hideBalloon();
  const next = activeId();
  if (next) focusWindow(next);
}

function toggleWindow(id) {
  if (winEls[id].classList.contains('open') && activeId() === id) closeWindow(id);
  else openWindow(id);
}

function toggleShade(id) {
  const el = winEls[id];
  const on = !el.classList.contains('shaded');
  el.classList.toggle('shaded', on);
  UI.shaded[id] = on;
  saveUI();
  if (on) egg('shade');
}

function toggleZoom(id) {
  const el = winEls[id];
  if (UI.zoomed[id]) {
    UI.pos[id] = UI.zoomed[id];
    UI.zoomed[id] = null;
  } else {
    UI.zoomed[id] = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    UI.pos[id] = { x: 8, y: 8, w: Math.max(300, desktop.clientWidth - 120), h: desktop.clientHeight - 16 };
  }
  el.classList.remove('shaded');
  UI.shaded[id] = false;
  applyRect(id);
  saveUI();
}

function cleanUpWindows() {
  UI.pos = {};
  UI.zoomed = {};
  UI.shaded = {};
  for (const id of WIN_ORDER) {
    winEls[id].classList.remove('shaded');
    applyRect(id);
  }
  saveUI();
  egg('cleanup');
}

function renderWindow(id) {
  switch (id) {
    case 'store': renderStore(true); break;
    case 'achievements': renderAchievements(); break;
    case 'stats': renderStats(); break;
    case 'hd': renderHD(); break;
    case 'control': syncControls(); break;
    case 'about': renderAbout(); break;
  }
}
const isOpen = id => winEls[id] && winEls[id].classList.contains('open') && !winEls[id].classList.contains('shaded');

/* ---------- Menu bar ---------- */

const MENUS = [
  {
    label: () => iconImg('floppy', 16), aria: 'System7 Clicker',
    items: [
      { label: 'About System7 Clicker…', act: () => openWindow('about') },
      '-',
      { label: 'Control Panel', act: () => openWindow('control') },
      { label: 'Hard Disk', act: () => openWindow('hd') },
      { label: 'Read Me', act: () => openWindow('readme') },
    ],
  },
  {
    label: 'File',
    items: [
      { label: 'Save', key: 'S', act: manualSave },
      { label: 'Export Save…', key: 'E', act: showExport },
      { label: 'Import Save…', key: 'I', act: showImport },
      { label: 'Restore Backup…', act: askRestoreBackup, disabled: () => !readBackup() },
      '-',
      { label: 'Close Window', act: () => { const a = activeId(); if (a) closeWindow(a); }, disabled: () => !activeId() },
      '-',
      { label: 'Erase Disk…', act: confirmReset },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', key: 'Z', act: undoJoke },
      '-',
      { label: 'Cut', key: 'X', disabled: () => true },
      { label: 'Copy', key: 'C', disabled: () => true },
      { label: 'Paste', key: 'V', disabled: () => true },
      { label: 'Clear', disabled: () => true },
      '-',
      { label: 'Select All', key: 'A', act: selectAllIcons },
    ],
  },
  {
    label: 'View',
    items: [
      ...['clicker', 'store', 'achievements', 'stats', 'hd'].map(id => ({
        label: WIN_DEFS[id].title, check: () => !!(winEls[id] && winEls[id].classList.contains('open')),
        act: () => toggleWindow(id),
      })),
      '-',
      { label: 'Clean Up Windows', act: cleanUpWindows },
    ],
  },
  {
    label: 'Special',
    items: [
      { label: 'Empty Trash…', act: askEmptyTrash, disabled: () => trashItems() <= 0 },
      '-',
      { label: 'Install System Update…', act: askUpdate },
      '-',
      { label: 'Restart', act: () => { saveGame(); location.reload(); } },
      { label: 'Shut Down', act: shutDown },
    ],
  },
];
const HELP_MENU = {
  label: () => iconImg('balloon', 16), aria: 'Help',
  items: [
    { label: 'About Balloon Help…', act: aboutBalloons },
    '-',
    { label: () => (S.settings.balloons ? 'Hide Balloons' : 'Show Balloons'), act: toggleBalloons },
    '-',
    { label: 'Read Me', act: () => openWindow('readme') },
  ],
};
const SHORTCUTS = {};
[...MENUS, HELP_MENU].forEach(m => m.items.forEach(it => { if (it.key && it.act) SHORTCUTS[it.key.toLowerCase()] = it; }));

let openMenu = null;

function buildMenubar() {
  const mb = $('#menubar');
  mb.innerHTML = '<div class="mb-left"></div><div class="mb-right"><span class="mb-status" id="mb-version"></span><span class="mb-status" id="mb-clock"></span></div>';
  const left = $('.mb-left', mb), right = $('.mb-right', mb);
  MENUS.forEach(m => left.appendChild(makeMenuTitle(m)));
  right.appendChild(makeMenuTitle(HELP_MENU));
}

function makeMenuTitle(m) {
  const t = document.createElement('div');
  t.className = 'mtitle';
  t.innerHTML = typeof m.label === 'function' ? m.label() : esc(m.label);
  if (m.aria) t.setAttribute('aria-label', m.aria);
  t.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    if (openMenu && openMenu.menu === m) closeMenus();
    else showMenu(m, t);
  });
  t.addEventListener('pointerenter', () => { if (openMenu && openMenu.menu !== m && !openMenu.flashing) showMenu(m, t); });
  return t;
}

function showMenu(m, t) {
  closeMenus();
  hideBalloon();
  t.classList.add('open');
  const d = document.createElement('div');
  d.className = 'mdrop';
  m.items.forEach(it => {
    if (it === '-') { d.insertAdjacentHTML('beforeend', '<div class="msep"></div>'); return; }
    const el = document.createElement('div');
    const label = typeof it.label === 'function' ? it.label() : it.label;
    const disabled = !it.act || (it.disabled && it.disabled());
    el.className = 'mitem' + (disabled ? ' disabled' : '') + (it.check && it.check() ? ' check' : '');
    el.innerHTML = `<span>${esc(label)}</span>${it.key ? `<span class="key">⌘${it.key}</span>` : ''}`;
    el.addEventListener('pointerup', e => {
      if (disabled || !openMenu || openMenu.flashing) return;
      e.stopPropagation();
      openMenu.flashing = true;
      let n = 0;
      const iv = setInterval(() => {
        el.classList.toggle('flash');
        if (++n >= 4) { clearInterval(iv); closeMenus(); it.act(); }
      }, 45);
    });
    d.appendChild(el);
  });
  document.body.appendChild(d);
  const r = t.getBoundingClientRect();
  d.style.left = Math.max(0, Math.min(r.left, innerWidth - d.offsetWidth - 4)) + 'px';
  openMenu = { menu: m, title: t, drop: d, flashing: false };
}

function closeMenus() {
  if (!openMenu) return;
  openMenu.title.classList.remove('open');
  openMenu.drop.remove();
  openMenu = null;
}

document.addEventListener('pointerdown', e => {
  if (openMenu && !e.target.closest('.mdrop') && !e.target.closest('.mtitle')) closeMenus();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMenus();
  if (!(e.ctrlKey || e.metaKey) || e.altKey || openDialogs.length) return;
  const tag = e.target.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT') return;
  const it = SHORTCUTS[e.key.toLowerCase()];
  if (it) { e.preventDefault(); closeMenus(); it.act(); }
});

/* ---------- Desktop icons ---------- */

const DESK_ICONS = [
  { id: 'hd', label: 'Hard Disk', icon: () => 'hd', act: () => openWindow('hd') },
  { id: 'readme', label: 'Read Me', icon: () => 'doc', act: () => openWindow('readme') },
  { id: 'trash', label: 'Trash', icon: () => (S.trash >= 0.25 ? 'trashfull' : 'trash'), act: () => askEmptyTrash(), bottom: true },
];

function wireIcon(el, act) {
  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    $$('.dicon.sel, .ficon.sel').forEach(x => x.classList.remove('sel'));
    el.classList.add('sel');
  });
  if (coarse) el.addEventListener('click', act);
  else el.addEventListener('dblclick', act);
}

function buildDeskIcons() {
  const box = $('#desk-icons');
  box.innerHTML = '';
  DESK_ICONS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'dicon';
    el.dataset.id = d.id;
    el.innerHTML = `${iconImg(d.icon(), 32)}<span>${esc(d.label)}</span>`;
    wireIcon(el, d.act);
    box.appendChild(el);
  });
  bindBalloons(box, '.dicon', el => {
    if (el.dataset.id === 'trash') {
      const n = trashItems();
      return `<div class="b-title">Trash</div>${n ? `Contains <b>${n}</b> junk item${n > 1 ? 's' : ''} (${Math.round(S.trash * 100)}% full). Double-click to empty and recover about <b>${fmtBytes(trashValue())}</b>.` : 'Empty. Junk files pile up here over time.'}`;
    }
    if (el.dataset.id === 'hd') return '<div class="b-title">Hard Disk</div>Double-click to see all your programs.';
    return '<div class="b-title">Read Me</div>How to play, saving, and tips.';
  });
  layoutDeskIcons();
}

function layoutDeskIcons() {
  if (isMobile()) return;
  const W = desktop.clientWidth, H = desktop.clientHeight;
  let y = 12;
  $$('.dicon').forEach(el => {
    const d = DESK_ICONS.find(x => x.id === el.dataset.id);
    el.style.left = (W - 96) + 'px';
    if (d.bottom) el.style.top = Math.max(y, H - 72) + 'px';
    else { el.style.top = y + 'px'; y += 72; }
  });
}

function updateDeskIcons() {
  const t = $('.dicon[data-id="trash"] img');
  const want = iconURL(DESK_ICONS[2].icon());
  if (t && t.getAttribute('src') !== want) t.setAttribute('src', want);
}

desktop.addEventListener('pointerdown', e => {
  if (e.target === desktop || e.target.id === 'desk-icons') $$('.dicon.sel, .ficon.sel').forEach(x => x.classList.remove('sel'));
});

function selectAllIcons() {
  $$('.dicon, .ficon').forEach(x => x.classList.add('sel'));
  egg('selectall');
}

/* ---------- Clicker window ---------- */

function buildClicker(body) {
  body.innerHTML = `
    <div class="clicker">
      <div class="bank"><div class="bank-amount" id="bank">0 bytes</div><div class="bank-rate" id="rate"></div></div>
      <div class="disk-area" id="disk-area">
        <div class="disk" id="disk" role="button" aria-label="Click the floppy disk">${iconImg('floppy', 160)}</div>
      </div>
      <div class="buffs" id="buffs"></div>
      <div class="updbox" id="updbox">
        <div class="upd-row"><span id="upd-label"></span><span id="upd-pct"></span></div>
        <div class="progress"><div class="bar" id="upd-bar"></div></div>
      </div>
      <div class="news" id="news"></div>
    </div>`;
  const disk = $('#disk', body);
  disk.addEventListener('pointerdown', onDiskDown);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => disk.addEventListener(ev, () => disk.classList.remove('pressed')));
  disk.addEventListener('contextmenu', e => e.preventDefault());
  bindBalloons($('#updbox', body), '#updbox', () => {
    const pot = potentialPatches(), gain = pot - S.patches;
    return `<div class="b-title">System Update</div>Every patch permanently boosts production by 1%. `
      + (gain > 0 ? `<b>${gain}</b> patch${gain > 1 ? 'es' : ''} ready to install from the <b>Special</b> menu.`
        : `Next patch at <b>${fmtBytes(nextPatchAt())}</b> written in total.`);
  });
}

function onDiskDown(e) {
  if (e.button !== 0) return;
  e.preventDefault();
  const disk = e.currentTarget;
  disk.classList.add('pressed');
  const gain = clickDisk();
  Sound.click();
  if (S.settings.particles) {
    const area = $('#disk-area');
    const r = area.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    spawnParticle(area, x, y, '+' + fmtBytes(gain, 1));
    spawnBits(area, x, y, 2);
  }
}

function spawnParticle(parent, x, y, text, cls = '') {
  if ($$('.particle', parent).length > 30) return;
  const p = document.createElement('div');
  p.className = 'particle ' + cls;
  p.textContent = text;
  p.style.left = x + 'px';
  p.style.top = y + 'px';
  parent.appendChild(p);
  setTimeout(() => p.remove(), 1000);
}

function spawnBits(parent, x, y, n) {
  if ($$('.bit', parent).length > 40) return;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('div');
    b.className = 'bit';
    b.textContent = Math.random() < 0.5 ? '0' : '1';
    b.style.left = x + 'px';
    b.style.top = y + 'px';
    const a = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 50;
    b.style.setProperty('--dx', Math.cos(a) * dist + 'px');
    b.style.setProperty('--dy', Math.sin(a) * dist + 'px');
    parent.appendChild(b);
    setTimeout(() => b.remove(), 800);
  }
}

let newsTimer = 0;
function nextNews() {
  const el = $('#news');
  el.classList.toggle('hidden', !S.settings.news);
  if (!S.settings.news) return;
  const pool = NEWS.filter(([c]) => { try { return c(S); } catch (e) { return false; } }).map(n => n[1]);
  const msg = pool[Math.floor(Math.random() * pool.length)];
  el.innerHTML = `<b>News:</b> ${esc(msg)}`;
  el.classList.remove('fade');
  void el.offsetWidth;
  el.classList.add('fade');
}

function renderBuffs() {
  const now = Date.now();
  const active = S.buffs.filter(b => b.until > now);
  const html = active.map(b => {
    const left = (b.until - now) / 1000;
    const pct = Math.max(0, Math.min(100, left / b.dur * 100));
    return `<div class="buff">${iconImg(b.icon || 'floppy', 16, b.id === 'crash' ? null : 'gold')}<span>${esc(b.name)}</span>`
      + `<div class="progress mini"><div class="bar" style="width:${pct.toFixed(1)}%"></div></div><span class="buff-t">${Math.ceil(left)}s</span></div>`;
  }).join('');
  const box = $('#buffs');
  if (box.innerHTML !== html) box.innerHTML = html;
  const area = $('#disk-area');
  area.classList.toggle('halted', G.buffMult === 0);
  area.classList.toggle('frenzy', G.buffMult > 1);
  area.classList.toggle('clickfrenzy', G.clickBuff > 1);
}

/* ---------- Store window ---------- */

function buildStore(body) {
  body.innerHTML = `
    <div class="store">
      <div class="store-toolbar">
        <div class="modes">
          <label><input type="radio" class="rad" name="smode" value="buy"> Buy</label>
          <label><input type="radio" class="rad" name="smode" value="sell"> Sell</label>
        </div>
        <div class="seg" id="store-amt">
          <button data-amt="1">1</button><button data-amt="10">10</button><button data-amt="100">100</button><button data-amt="max">Max</button>
        </div>
      </div>
      <div class="scroll store-scroll" id="store-scroll">
        <div class="section-head"><span>Upgrades</span><span id="upg-count"></span></div>
        <div class="upgrade-grid" id="upgrades"></div>
        <div class="section-head"><span>Hardware &amp; Software</span><span id="bld-total"></span></div>
        <div id="buildings"></div>
      </div>
    </div>`;
  $$('input[name=smode]', body).forEach(r => {
    r.checked = r.value === UI.storeMode;
    r.addEventListener('change', () => { UI.storeMode = r.value; saveUI(); renderStore(true); });
  });
  $$('#store-amt button', body).forEach(b => {
    b.addEventListener('click', () => {
      UI.storeAmt = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt;
      saveUI();
      renderStore(true);
    });
  });

  const ups = $('#upgrades', body);
  ups.addEventListener('click', e => {
    const tile = e.target.closest('.upg');
    if (!tile) return;
    if (coarse && S.settings.balloons && balloonAnchor !== tile) {
      showBalloon(tile, () => upgradeBalloon(tile.dataset.id), 4000);
      return;
    }
    if (buyUpgrade(tile.dataset.id)) {
      Sound.buy();
      hideBalloon();
      renderStore(true);
    } else Sound.nope();
  });
  bindBalloons(ups, '.upg', el => upgradeBalloon(el.dataset.id));

  const blds = $('#buildings', body);
  blds.addEventListener('click', e => {
    const row = e.target.closest('.bld');
    if (!row || row.classList.contains('mystery')) return;
    const id = row.dataset.id;
    const n = UI.storeMode === 'sell' ? sellBuilding(id, UI.storeAmt) : buyBuilding(id, UI.storeAmt);
    if (n > 0) {
      UI.storeMode === 'sell' ? Sound.sell() : Sound.buy();
      renderStore();
      refreshBalloon();
      if (coarse) showBalloon(row, () => buildingBalloon(id), 2500);
    } else Sound.nope();
  });
  bindBalloons(blds, '.bld', el => buildingBalloon(el.dataset.id, el.classList.contains('mystery')));
}

function visibleBuildings() {
  const out = [];
  let mysteries = 0;
  BUILDINGS.forEach((b, i) => {
    if (mysteries >= 2) return;
    const revealed = i === 0 || owned(b.id) > 0 || S.runBytes >= b.cost * 0.5 || S.bytes >= b.cost;
    if (revealed) out.push({ b, mystery: false });
    else { out.push({ b, mystery: true }); mysteries++; }
  });
  return out;
}

let storeKey = '';
function renderStore(force = false) {
  const vis = visibleBuildings();
  const ups = availableUpgrades();
  const key = vis.map(x => x.b.id + (x.mystery ? '?' : '')).join(',') + '|' + ups.map(u => u.id).join(',');
  if (force || key !== storeKey) {
    storeKey = key;
    $('#upgrades').innerHTML = ups.length
      ? ups.map(u => `<div class="upg ${u.badge}" data-id="${u.id}">${iconImg(u.icon, 32, u.swap)}</div>`).join('')
      : '<div class="empty">No upgrades available yet. Keep clicking!</div>';
    $('#buildings').innerHTML = vis.map(({ b, mystery }) =>
      `<div class="bld${mystery ? ' mystery' : ''}" data-id="${b.id}">${iconImg(b.icon, 32)}`
      + `<div class="bld-info"><div class="bld-name">${mystery ? '???' : esc(b.name)}</div><div class="bld-cost"></div></div>`
      + `<div class="bld-count"></div></div>`).join('');
    $$('input[name=smode]').forEach(r => { r.checked = r.value === UI.storeMode; });
    $$('#store-amt button').forEach(b => b.classList.toggle('on', String(UI.storeAmt) === b.dataset.amt));
  }
  updateStore();
}

function storeAmountFor(b) {
  if (UI.storeMode === 'sell') {
    const amt = UI.storeAmt === 'max' ? owned(b.id) : Math.min(owned(b.id), UI.storeAmt);
    return { amt, price: sellValue(b, amt), can: amt > 0 };
  }
  const amt = UI.storeAmt === 'max' ? Math.max(1, maxAffordable(b)) : UI.storeAmt;
  const price = buildingPrice(b, owned(b.id), amt);
  return { amt, price, can: S.bytes >= price };
}

function updateStore() {
  $$('#buildings .bld').forEach(row => {
    const b = BUILDING_BY_ID[row.dataset.id];
    const { amt, price, can } = storeAmountFor(b);
    const mystery = row.classList.contains('mystery');
    const cost = UI.storeMode === 'sell'
      ? (amt > 0 ? `Sell ${amt} for ${fmtBytes(price)}` : 'None to sell')
      : fmtBytes(price) + (amt > 1 ? ` for ${amt}` : '');
    const costEl = row.querySelector('.bld-cost');
    if (costEl.textContent !== cost) costEl.textContent = cost;
    const cnt = owned(b.id) ? String(owned(b.id)) : '';
    const cntEl = row.querySelector('.bld-count');
    if (cntEl.textContent !== cnt) cntEl.textContent = cnt;
    row.classList.toggle('cant', !can || mystery);
  });
  $$('#upgrades .upg').forEach(t => t.classList.toggle('can', S.bytes >= UPGRADE_BY_ID[t.dataset.id].cost));
  const n = availableUpgrades().length;
  $('#upg-count').textContent = n ? `${n} available` : '';
  const total = totalBuildings(S);
  $('#bld-total').textContent = total ? `${total} owned` : '';
  const foot = $('#win-store .foot-text');
  if (foot) foot.textContent = `${UI.storeMode === 'sell' ? 'Selling' : 'Buying'} ${UI.storeAmt === 'max' ? 'max' : '×' + UI.storeAmt} · ${G.upgradeSet.size} upgrades installed`;
}

function upgradeBalloon(id) {
  const u = UPGRADE_BY_ID[id];
  if (!u) return '';
  const can = S.bytes >= u.cost;
  return `<div class="b-title">${esc(u.name)}</div><div class="b-sub">${esc(u.sub)}</div>`
    + `<div class="b-cost${can ? '' : ' no'}">Cost: <b>${fmtBytes(u.cost)}</b></div>`
    + `<div>${u.desc}</div><div class="b-flavor">“${esc(u.flavor)}”</div>`;
}

function buildingBalloon(id, mystery = false) {
  const b = BUILDING_BY_ID[id];
  if (mystery) return `<div class="b-title">???</div>Write more bytes to reveal this item.<div class="b-cost">Cost: <b>${fmtBytes(buildingPrice(b, 0, 1))}</b></div>`;
  const n = owned(id);
  const { amt, price } = storeAmountFor(b);
  const share = G.rawBps > 0 ? G.bTotal[id] / G.rawBps * 100 : 0;
  let html = `<div class="b-title">${esc(b.name)}</div><div class="b-sub">Owned: ${n}</div>`;
  html += UI.storeMode === 'sell'
    ? `<div class="b-cost">Sell ${amt} for <b>${fmtBytes(price)}</b> (25% refund)</div>`
    : `<div class="b-cost${S.bytes >= price ? '' : ' no'}">Cost${amt > 1 ? ` for ${amt}` : ''}: <b>${fmtBytes(price)}</b></div>`;
  html += `<div>Each produces <b>${fmtBytes(G.bPer[id], 2)}</b>/s.</div>`;
  if (n) html += `<div>${n} producing <b>${fmtBytes(G.bTotal[id], 2)}</b>/s (${share.toFixed(1)}% of total).</div>`;
  html += `<div class="b-flavor">“${esc(b.desc)}”</div>`;
  return html;
}

/* ---------- Achievements window ---------- */

function buildAchievements(body) {
  body.innerHTML = `<div class="ach-head"><span id="ach-count"></span><div class="progress"><div class="bar" id="ach-bar"></div></div></div><div class="scroll" id="ach-scroll"><div class="ach-grid" id="ach-grid"></div></div>`;
  $('#ach-scroll', body).style.flex = '1';
  bindBalloons($('#ach-grid', body), '.ach', el => {
    const a = ACH_BY_ID[el.dataset.id];
    const got = G.achSet.has(a.id);
    if (a.secret && !got) return '<div class="b-title">???</div>A secret achievement. Explore the desktop!';
    return `<div class="b-title">${esc(a.name)}</div><div class="b-sub">${got ? 'Unlocked · +1% production' : 'Locked'}</div><div>${esc(a.desc)}</div>`;
  });
}

let achKey = '';
function renderAchievements() {
  const key = [...G.achSet].join(',');
  const n = G.achSet.size, total = ACHIEVEMENTS.length;
  $('#ach-count').textContent = `${n} of ${total} unlocked (+${n}% production)`;
  $('#ach-bar').style.width = (n / total * 100) + '%';
  if (key === achKey && $('#ach-grid').children.length) return;
  achKey = key;
  $('#ach-grid').innerHTML = ACHIEVEMENTS.map(a => {
    const got = G.achSet.has(a.id);
    const inner = a.secret && !got ? '?' : iconImg(a.icon, 32, a.swap);
    return `<div class="ach${got ? '' : ' locked'}${a.secret ? ' secret' : ''}" data-id="${a.id}">${inner}</div>`;
  }).join('');
  const foot = $('#win-achievements .foot-text');
  if (foot) foot.textContent = `${total - n} to go`;
}

/* ---------- Statistics window ---------- */

function buildStats(body) {
  body.innerHTML = '<div class="scroll" id="stats-scroll"><div class="stats" id="stats"></div></div>';
  $('#stats-scroll', body).style.flex = '1';
  bindBalloons(body, '.mini-grid .upg', el => upgradeBalloon(el.dataset.id));
}

function renderStats() {
  const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  const pot = potentialPatches();
  const installed = UPGRADES.filter(u => has(u.id));
  const html = `
    <h3>General</h3><table>
    ${row('Bytes on disk', fmtBytes(S.bytes))}
    ${row('Written this run', fmtBytes(S.runBytes))}
    ${row('Written all time', fmtBytes(S.lifetimeBytes))}
    ${row('Bytes per second', fmtBytes(G.bps, 2) + (G.buffMult !== 1 ? ` (×${+G.buffMult.toFixed(2)})` : ''))}
    ${row('Per click', fmtBytes(G.clickPower, 2))}
    ${row('Disk clicks (run / all time)', `${fmtNum(S.clicks)} / ${fmtNum(S.lifetimeClicks)}`)}
    ${row('Written by hand (run / all time)', `${fmtBytes(S.handBytes)} / ${fmtBytes(S.lifetimeHandBytes)}`)}
    ${row('Buildings owned', fmtNum(totalBuildings(S)))}
    ${row('Upgrades installed', `${G.upgradeSet.size} / ${UPGRADES.length}`)}
    ${row('Achievements', `${G.achSet.size} / ${ACHIEVEMENTS.length}`)}
    ${row('Lucky Disks clicked', fmtNum(S.luckyClicks))}
    ${row('Trash emptied', fmtNum(S.trashEmptied))}
    ${row('System errors survived', fmtNum(S.bombs))}
    ${row('This run started', fmtDuration((Date.now() - S.runStart) / 1000) + ' ago')}
    ${row('Total play time', fmtDuration(S.playTime))}
    </table>
    <h3>System Update</h3><table>
    ${row('Current version', 'System ' + versionString(S.patches))}
    ${row('Patches installed', `${S.patches} (+${S.patches}% production)`)}
    ${row('Patches ready to install', Math.max(0, pot - S.patches))}
    ${row('Next patch at', fmtBytes(nextPatchAt()) + ' total')}
    ${row('Updates installed', S.restarts)}
    </table>
    <h3>Multipliers</h3><table>
    ${row('System upgrades', '+' + Math.round(G.globalPct * 100) + '%')}
    ${row('Achievements', '+' + G.achSet.size + '%')}
    ${row('Patches', '+' + S.patches + '%')}
    ${row('Click bonus from production', '+' + Math.round(G.clickPct * 100) + '% of bytes/s')}
    ${row('Trash capacity', '×' + trashMult())}
    ${row('Lucky Disk frequency', '×' + luckyFreq())}
    </table>
    <h3>Installed Upgrades</h3>
    <div class="mini-grid">${installed.map(u => `<div class="upg ${u.badge}" data-id="${u.id}">${iconImg(u.icon, 16, u.swap)}</div>`).join('') || '<span class="small">None yet.</span>'}</div>`;
  const box = $('#stats');
  if (box.dataset.n !== String(installed.length)) { box.innerHTML = html; box.dataset.n = installed.length; return; }
  // Avoid re-rendering the icon grid every second (keeps balloons stable).
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  $$('table', box).forEach((t, i) => { const nt = $$('table', tmp)[i]; if (t.innerHTML !== nt.innerHTML) t.innerHTML = nt.innerHTML; });
}

/* ---------- Hard Disk (Finder) window ---------- */

const HD_ITEMS = [
  { id: 'clicker', label: 'Clicker', icon: 'floppy' },
  { id: 'store', label: 'Store', icon: 'bag' },
  { id: 'achievements', label: 'Achievements', icon: 'trophy' },
  { id: 'stats', label: 'Statistics', icon: 'chart' },
  { id: 'control', label: 'Control Panel', icon: 'cpanel' },
  { id: 'readme', label: 'Read Me', icon: 'doc' },
  { id: 'about', label: 'About', icon: 'balloon' },
];

function buildHD(body) {
  body.innerHTML = `<div class="finder-info"><span>${HD_ITEMS.length} items</span><span id="hd-used"></span><span>∞ available</span></div><div class="finder-grid scroll" id="hd-grid"></div>`;
  const grid = $('#hd-grid', body);
  HD_ITEMS.forEach(it => {
    const el = document.createElement('div');
    el.className = 'ficon';
    el.innerHTML = `${iconImg(it.icon, 32)}<span>${esc(it.label)}</span>`;
    wireIcon(el, () => openWindow(it.id));
    grid.appendChild(el);
  });
}

function renderHD() {
  $('#hd-used').textContent = `${fmtBytes(S.bytes)} in disk`;
}

/* ---------- Control Panel ---------- */

function buildControl(body) {
  body.innerHTML = `
    <div class="cp">
      <fieldset><legend>Desktop Pattern</legend>
        <div class="pat-row"><button class="btn sm" id="pat-prev" aria-label="Previous pattern">◀</button><div class="pat-preview" id="pat-preview"></div><button class="btn sm" id="pat-next" aria-label="Next pattern">▶</button></div>
        <div class="pat-name" id="pat-name"></div>
      </fieldset>
      <fieldset><legend>Sound</legend>
        <label><input type="checkbox" class="chk" data-set="sound"> Sound effects</label>
        <label>Volume <input type="range" min="0" max="1" step="0.05" id="cp-vol"></label>
      </fieldset>
      <fieldset><legend>Display</legend>
        <label><input type="checkbox" class="chk" data-set="particles"> Flying numbers</label>
        <label><input type="checkbox" class="chk" data-set="news"> News ticker</label>
        <label><input type="checkbox" class="chk" data-set="startup"> Startup screen</label>
        <label><input type="checkbox" class="chk" data-set="balloons"> Balloon help</label>
      </fieldset>
      <div class="cp-foot"><span id="cp-saved">Autosaves every 30 seconds.</span><button class="btn" id="cp-save">Save Now</button></div>
    </div>`;
  const cycle = dir => {
    const i = PATTERNS.findIndex(p => p.id === S.settings.pattern);
    S.settings.pattern = PATTERNS[(i + dir + PATTERNS.length) % PATTERNS.length].id;
    applyPattern();
    syncControls();
    egg('pattern');
    saveGame();
  };
  $('#pat-prev', body).addEventListener('click', () => cycle(-1));
  $('#pat-next', body).addEventListener('click', () => cycle(1));
  $$('input[data-set]', body).forEach(c => c.addEventListener('change', () => {
    const k = c.dataset.set;
    if (k === 'balloons') setBalloons(c.checked);
    else S.settings[k] = c.checked;
    if (k === 'sound' && !c.checked) egg('silence');
    if (k === 'sound' && c.checked) Sound.buy();
    if (k === 'news') nextNews();
    saveGame();
  }));
  const vol = $('#cp-vol', body);
  vol.addEventListener('input', () => { S.settings.volume = +vol.value; });
  vol.addEventListener('change', () => { Sound.buy(); saveGame(); });
  $('#cp-save', body).addEventListener('click', manualSave);
}

function syncControls() {
  const p = PATTERNS.find(x => x.id === S.settings.pattern) || PATTERNS[0];
  $('#pat-preview').style.backgroundImage = `url(${patternURL(p.id)})`;
  $('#pat-name').textContent = p.name;
  $$('#win-control input[data-set]').forEach(c => { c.checked = !!S.settings[c.dataset.set]; });
  $('#cp-vol').value = S.settings.volume;
}

function applyPattern() {
  desktop.style.backgroundImage = `url(${patternURL(S.settings.pattern)})`;
  const p = PATTERNS.find(x => x.id === S.settings.pattern) || PATTERNS[0];
  desktop.style.backgroundColor = p.bg;
  const meta = $('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', p.bg);
}

/* ---------- Read Me ---------- */

function buildReadme(body) {
  body.innerHTML = `<div class="scroll" id="readme-scroll"><div class="readme">
    <h2>System7 Clicker</h2>
    <p>Your computer is hungry for <b>bytes</b>. Feed it.</p>
    <h3>How to play</h3>
    <ul>
      <li>Click the big floppy disk in the <b>Clicker</b> window to write bytes.</li>
      <li>Spend bytes in the <b>Store</b> on hardware and software that write bytes for you, even while you are away (at half speed).</li>
      <li>Upgrades show up in the Store as you progress. Point at anything for balloon help.</li>
      <li>Keep an eye out for golden <b>Lucky Disks</b> on the desktop. Click them fast for big bonuses!</li>
      <li>Junk piles up in the <b>Trash</b>. Double-click it now and then to recycle the junk into bytes.</li>
      <li>Every achievement boosts production by 1%.</li>
      <li>Written around 10 GB? Use <b>Special ▸ Install System Update…</b> to start over with permanent patches (+1% production each). The progress bar in the Clicker window shows how close the next patch is.</li>
      <li>Every so often a system error pops up. Resume to play it safe, or Restart and take your chances.</li>
    </ul>
    <h3>Saving</h3>
    <ul>
      <li>The game saves to this browser’s local storage every 30 seconds and when you close the tab.</li>
      <li><b>File ▸ Save</b> saves right away.</li>
      <li><b>File ▸ Export Save…</b> gives you a code you can copy or download as a file.</li>
      <li><b>File ▸ Import Save…</b> loads a code or file, for example on another computer.</li>
      <li><b>File ▸ Erase Disk…</b> wipes everything and starts over.</li>
    </ul>
    <h3>Keyboard</h3>
    <ul>
      <li><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>S</kbd> save, <kbd>E</kbd> export, <kbd>I</kbd> import.</li>
      <li>Double-click a title bar to roll a window up.</li>
    </ul>
    <h3>Desktop</h3>
    <ul>
      <li>Drag windows by their striped title bars. Resize them with the box in the bottom-right corner.</li>
      <li>Change the desktop pattern and sounds in the <b>Control Panel</b>.</li>
      <li>There are a few secret achievements hidden around the desktop…</li>
    </ul>
    <p class="small">System7 Clicker is a fan-made tribute to early-’90s desktop computing. It is not affiliated with any computer company.</p>
  </div></div>`;
  $('#readme-scroll', body).style.flex = '1';
}

/* ---------- About window ---------- */

function buildAbout(body) {
  body.innerHTML = `<div class="about">
    <div class="about-top">${iconImg('floppy', 48)}<div><div class="about-title">System7 Clicker</div><div>System Software <span id="ab-ver"></span></div><div class="small">A clicker for beige computers</div></div>
    <div class="about-mem"><div>Total Written: <b id="ab-total"></b></div><div>Largest Unused Block: <b id="ab-bank"></b></div></div></div>
    <div class="about-apps" id="ab-apps"></div>
  </div>`;
}

function renderAbout() {
  $('#ab-ver').textContent = versionString(S.patches);
  $('#ab-total').textContent = fmtBytes(S.lifetimeBytes);
  $('#ab-bank').textContent = fmtBytes(S.bytes);
  const top = BUILDINGS.filter(b => owned(b.id) > 0).sort((a, b) => G.bTotal[b.id] - G.bTotal[a.id]).slice(0, 6);
  const html = top.length
    ? top.map(b => {
      const pct = G.rawBps ? G.bTotal[b.id] / G.rawBps * 100 : 0;
      return `<div class="app-row">${iconImg(b.icon, 16)}<span>${esc(b.name)}</span><span>${fmtBytes(G.bTotal[b.id], 1)}/s</span><div class="progress"><div class="bar" style="width:${pct.toFixed(1)}%"></div></div></div>`;
    }).join('')
    : '<div class="small">No programs running yet. Buy something in the Store!</div>';
  const box = $('#ab-apps');
  if (box.innerHTML !== html) box.innerHTML = html;
}

/* ---------- Lucky disks & system errors ---------- */

function spawnLucky() {
  const el = document.createElement('div');
  el.className = 'lucky';
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', 'Lucky Disk');
  el.innerHTML = iconImg('floppy', 48, 'gold');
  const W = desktop.clientWidth, H = desktop.clientHeight;
  const x = 20 + Math.random() * Math.max(1, W - 110);
  const y = desktop.scrollTop + 20 + Math.random() * Math.max(1, H - 110);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  desktop.appendChild(el);
  let done = false;
  const life = setTimeout(() => {
    if (done) return;
    done = true;
    el.classList.add('out');
    setTimeout(() => el.remove(), 500);
    luckyMissed();
  }, 13000);
  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (done) return;
    done = true;
    clearTimeout(life);
    const r = luckyClicked();
    Sound.lucky();
    notify('floppy', r.title, esc(r.text), { swap: 'gold' });
    spawnParticle(desktop, x + 24, y + 10, r.short, 'big');
    el.classList.add('got');
    setTimeout(() => el.remove(), 350);
    renderBuffs();
  });
}

function showBomb() {
  Sound.error();
  const codes = [1, 2, 3, 10, 11, 25, 28, 41];
  const code = codes[Math.floor(Math.random() * codes.length)];
  const p = dialog({
    icon: 'bomb',
    html: `<b>Sorry, a system error occurred.</b><p>“Clicker”<br>Error type ${code}</p><p class="small">Resume to salvage a few bytes, or Restart and take your chances…</p>`,
    buttons: [{ label: 'Restart', value: 'restart' }, { label: 'Resume', value: 'resume', default: true }],
  });
  const t = setTimeout(() => p.close('timeout'), 15000);
  p.then(v => {
    clearTimeout(t);
    if (v === 'paused') { G.bombActive = false; scheduleBomb(); return; }
    const r = bombResolve(v);
    if (r.bad) Sound.error(); else if (v === 'restart') Sound.chord();
    notify('bomb', r.title, esc(r.text));
    renderBuffs();
  });
}

/* ---------- Menu actions ---------- */

function manualSave() {
  const ok = saveGame();
  notify('floppy', ok ? 'Saved' : 'Save failed', ok ? 'Your progress is saved in this browser.' : 'Local storage is unavailable. Use File ▸ Export Save… instead.', { ms: 2500 });
}

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function copyText(text, ta, btn) {
  const done = ok => {
    btn.textContent = ok ? 'Copied!' : 'Press ⌘C';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => done(true), () => { ta.select(); done(document.execCommand('copy')); });
  } else {
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    done(ok);
  }
}

function downloadText(text, name) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function showExport() {
  saveGame();
  egg('export');
  const code = exportSave();
  dialog({
    icon: 'floppy',
    html: `<b>Export Save</b><p>Keep this code somewhere safe, or download it as a file. Load it later with <b>File ▸ Import Save…</b></p><textarea class="code" readonly spellcheck="false">${esc(code)}</textarea>`,
    buttons: [
      { label: 'Copy', keep: true, onClick: (d, close, btn) => copyText(code, $('textarea', d), btn) },
      { label: 'Download', keep: true, onClick: () => downloadText(code, `system7-clicker-${todayStamp()}.txt`) },
      { label: 'Done', default: true, cancel: true },
    ],
    onOpen: d => { const ta = $('textarea', d); ta.focus(); ta.select(); },
  });
}

function showImport() {
  dialog({
    icon: 'doc',
    html: `<b>Import Save</b><p>Paste a save code below, or choose a save file. <b>This replaces your current progress.</b></p><textarea class="code" spellcheck="false" placeholder="S7C1:…"></textarea><input type="file" accept=".txt,.json,text/plain,application/json" hidden>`,
    buttons: [
      { label: 'Choose File…', keep: true, onClick: d => $('input[type=file]', d).click() },
      { label: 'Cancel', cancel: true },
      {
        label: 'Import', default: true, keep: true,
        onClick: (d, close) => {
          const txt = $('textarea', d).value;
          try {
            importSave(txt);
          } catch (err) {
            Sound.error();
            alertBox('alert', `<b>Couldn’t import that save.</b><p>${esc(err.message)}</p>`);
            return;
          }
          close('ok');
          afterLoad();
          egg('import');
          Sound.chord();
          notify('floppy', 'Save imported', `Welcome back! ${fmtBytes(S.bytes)} on disk.`);
        },
      },
    ],
    onOpen: d => {
      const f = $('input[type=file]', d);
      f.addEventListener('change', () => {
        const file = f.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alertBox('alert', '<b>That file is too big</b><p>Save files are only a few kilobytes.</p>'); return; }
        file.text().then(t => { $('textarea', d).value = t.trim(); });
      });
      $('textarea', d).focus();
    },
  });
}

function confirmReset() {
  dialog({
    icon: 'alert',
    html: '<b>Erase the disk?</b><p>This permanently erases <b>all</b> progress: bytes, buildings, upgrades, achievements and system updates. You may want to export a save first.</p>',
    buttons: [
      { label: 'Export First…', value: 'export' },
      { label: 'Cancel', cancel: true, default: true },
      { label: 'Erase', value: 'erase' },
    ],
  }).then(v => {
    if (v === 'export') showExport();
    else if (v === 'erase') {
      resetGame();
      afterLoad();
      Sound.trash();
      notify('trash', 'Disk erased', 'A fresh start. Click that floppy!');
    }
  });
}

function askRestoreBackup() {
  const b = readBackup();
  if (!b) { alertBox('doc', '<b>No backup yet.</b><p>A backup is made automatically before you import a save, erase the disk or install a system update.</p>'); return; }
  let preview = '';
  try {
    const o = JSON.parse(b.save);
    preview = `It has <b>${fmtBytes(+o.bytes || 0)}</b> on disk and System ${versionString(Math.floor(+o.patches || 0))}.`;
  } catch (e) { preview = ''; }
  dialog({
    icon: 'doc',
    html: `<b>Restore backup?</b><p>This backup was made before ${esc(b.reason)}, ${fmtDuration((Date.now() - b.time) / 1000)} ago. ${preview}</p><p>Your current game becomes the new backup, so you can switch back.</p>`,
    buttons: [{ label: 'Cancel', cancel: true }, { label: 'Restore', value: 'go', default: true }],
  }).then(v => {
    if (v !== 'go') return;
    try { restoreBackup(); } catch (e) { alertBox('alert', '<b>The backup could not be read.</b>'); return; }
    afterLoad();
    Sound.chord();
    notify('doc', 'Backup restored', `${fmtBytes(S.bytes)} on disk.`);
  });
}

function undoJoke() {
  Sound.error();
  egg('undo');
  alertBox('alert', '<b>Can’t Undo.</b><p>Every click is permanent. That’s just how bytes work.</p>');
}

function askEmptyTrash() {
  const n = trashItems();
  if (n <= 0) {
    alertBox('trash', '<b>The Trash is empty.</b><p>Junk files collect in the Trash over time. Check back in a few minutes!</p>');
    return;
  }
  dialog({
    icon: 'trashfull',
    html: `<b>The Trash contains ${n} item${n > 1 ? 's' : ''}.</b><p>Are you sure you want to permanently remove ${n > 1 ? 'these items' : 'this item'}? Recycling will recover about <b>${fmtBytes(trashValue())}</b>.</p>`,
    buttons: [{ label: 'Cancel', cancel: true }, { label: 'OK', value: 'ok', default: true }],
  }).then(v => {
    if (v !== 'ok') return;
    const g = emptyTrash();
    if (g <= 0) return;
    Sound.trash();
    notify('trash', 'Trash emptied', `Recycled junk into ${fmtBytes(g)}.`);
    updateDeskIcons();
    checkAchievements();
  });
}

function askUpdate() {
  const pot = potentialPatches(), gain = pot - S.patches;
  if (gain <= 0) {
    alertBox('balloon', `<b>No update available.</b><p>You are running System ${versionString(S.patches)}. The next patch unlocks once you have written <b>${fmtBytes(nextPatchAt())}</b> in total (all time). You have written ${fmtBytes(S.lifetimeBytes)} so far.</p>`);
    return;
  }
  dialog({
    icon: 'ext',
    html: `<b>Install System ${versionString(pot)}?</b><p>Installing restarts your computer: your bytes, buildings and upgrades will be erased.</p><p>You keep your achievements and gain <b>${gain}</b> patch${gain > 1 ? 'es' : ''} (+${gain}% production, ${pot}% in total).</p>`,
    buttons: [{ label: 'Cancel', cancel: true }, { label: 'Install', value: 'go', default: true }],
  }).then(v => { if (v === 'go') runInstaller(pot); });
}

function runInstaller(pot) {
  const p = dialog({
    icon: 'ext',
    html: `<b>Installing System ${versionString(pot)}…</b><p id="inst-step">Preparing installer…</p><div class="progress"><div class="bar" id="inst-bar"></div></div>`,
    buttons: [],
  });
  const steps = ['Reading release notes (just kidding)…', 'Copying System file…', 'Updating extensions…', 'Rebuilding desktop file…', 'Blessing System Folder…'];
  let i = 0;
  const iv = setInterval(() => {
    if (G.paused) { clearInterval(iv); return; }
    i++;
    const bar = $('#inst-bar'), step = $('#inst-step');
    if (bar) bar.style.width = Math.min(100, i * 4) + '%';
    if (step && i % 5 === 0) step.textContent = steps[Math.min(steps.length - 1, i / 5 | 0)];
    if (i >= 25) {
      clearInterval(iv);
      p.close('done');
      const gained = installUpdate();
      afterLoad();
      runStartup(() => {
        Sound.chord();
        notify('ext', `Welcome to System ${versionString(S.patches)}`, `${gained} new patch${gained > 1 ? 'es' : ''} installed. Production +${S.patches}%.`);
      }, true);
    }
  }, 90);
}

function shutDown() {
  saveGame();
  egg('shutdown');
  hideBalloon();
  $('#shutdown').hidden = false;
}

function aboutBalloons() {
  alertBox('balloon', '<b>Balloon Help</b><p>Point at items in the Store, achievements, the Trash and more to see helpful balloons. Use the Help menu to turn them on or off.</p>');
}

function setBalloons(on) {
  const wasOff = !S.settings.balloons;
  S.settings.balloons = on;
  if (!on) hideBalloon();
  if (on && wasOff && S.eggs.balloonOff) egg('balloon');
  if (!on) S.eggs.balloonOff = true;
}

function toggleBalloons() {
  setBalloons(!S.settings.balloons);
  saveGame();
  if (isOpen('control')) syncControls();
}

/* ---------- Startup ---------- */

function runStartup(cb, force = false) {
  const st = $('#startup');
  let finished = false;
  let iv = 0;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(iv);
    st.classList.add('hide');
    setTimeout(() => { st.style.display = 'none'; }, 360);
    if (cb) cb();
  };
  if (!S.settings.startup && !force) {
    st.style.display = 'none';
    finish();
    return;
  }
  st.style.display = '';
  st.classList.remove('hide');
  $('#welcome-icon').innerHTML = iconImg('floppy', 64);
  const parade = $('#parade');
  parade.innerHTML = '';
  const icons = ['cpanel', 'ext', 'balloon', ...BUILDINGS.filter(b => owned(b.id) > 0).map(b => b.icon)].slice(0, 14);
  let i = 0;
  iv = setInterval(() => {
    if (i < icons.length) parade.insertAdjacentHTML('beforeend', iconImg(icons[i++], 32));
    else finish();
  }, 120);
  st.onclick = finish;
}

/* ---------- Main render loops ---------- */

const last = {};
function setText(id, text) {
  if (last[id] === text) return;
  last[id] = text;
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function frame() {
  setText('bank', fmtBytes(S.bytes, 3));
  requestAnimationFrame(frame);
}

function fastUpdate() {
  let rate = `per second: ${fmtBytes(G.bps, 1)}`;
  if (G.buffMult !== 1) rate += ` (×${+G.buffMult.toFixed(2)})`;
  setText('rate', rate);
  renderBuffs();
  renderStore();
  updateDeskIcons();
  const pot = potentialPatches(), ready = pot - S.patches;
  setText('upd-label', ready > 0 ? `System ${versionString(pot)} ready to install!` : `Next patch: System ${versionString(pot + 1)}`);
  setText('upd-pct', ready > 0 ? `+${ready} patch${ready > 1 ? 'es' : ''}` : `${(patchProgress() * 100).toFixed(1)}%`);
  $('#upd-bar').style.width = (patchProgress() * 100).toFixed(2) + '%';
  refreshBalloon();
}

function slowUpdate() {
  setText('mb-version', 'System ' + versionString(S.patches));
  setText('mb-clock', new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  document.title = `${fmtBytes(S.bytes)} · System7 Clicker`;
  if (isOpen('stats')) renderStats();
  if (isOpen('about')) renderAbout();
  if (isOpen('hd')) renderHD();
  if (isOpen('achievements')) renderAchievements();
}

function afterLoad() {
  applyPattern();
  storeKey = '';
  achKey = '';
  renderStore(true);
  renderBuffs();
  nextNews();
  if (isOpen('control')) syncControls();
  for (const id of WIN_ORDER) if (isOpen(id)) renderWindow(id);
  fastUpdate();
  slowUpdate();
}

/* ---------- Boot ---------- */

function init() {
  loadUI();
  const info = loadGame();
  G.on('achievement', a => {
    Sound.achieve();
    notify(a.icon, a.name, `Achievement unlocked! ${esc(a.desc)}`, { swap: a.swap });
    if (isOpen('achievements')) renderAchievements();
  });
  G.on('lucky-spawn', spawnLucky);
  G.on('bomb', showBomb);
  G.on('buffs', renderBuffs);
  G.on('paused', () => {
    hideBalloon();
    closeMenus();
    openDialogs.slice().forEach(d => d.close('paused'));
    $('#paused-icon').innerHTML = iconImg('alert', 48);
    $('#paused').hidden = false;
  });
  G.on('resumed', () => {
    $('#paused').hidden = true;
    afterLoad();
    notify('floppy', 'Playing here now', `Loaded your latest save: ${fmtBytes(S.bytes)} on disk.`);
  });
  $('#paused-take').addEventListener('click', () => requestTakeover());
  startTabGuard();

  buildMenubar();
  buildDeskIcons();
  WIN_ORDER.forEach(createWindow);
  WIN_ORDER.forEach(id => { if (UI.open[id]) openWindow(id); });
  if (UI.open.clicker) focusWindow('clicker');
  applyPattern();

  const fav = $('link[rel=icon]');
  fav.setAttribute('href', iconURL('floppy'));

  $('#shutdown-restart').addEventListener('click', () => {
    $('#shutdown').hidden = true;
    runStartup(() => Sound.chord(), true);
  });

  addEventListener('resize', () => {
    layoutDeskIcons();
    WIN_ORDER.forEach(clampWindow);
    refreshBalloon();
  });
  mqMobile.addEventListener?.('change', () => { WIN_ORDER.forEach(id => { if (winEls[id].classList.contains('open')) applyRect(id); }); layoutDeskIcons(); });

  const persist = () => saveGame();
  addEventListener('pagehide', persist);
  addEventListener('beforeunload', persist);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

  startGame();
  afterLoad();
  requestAnimationFrame(frame);
  setInterval(fastUpdate, 200);
  setInterval(slowUpdate, 1000);
  newsTimer = setInterval(nextNews, 9000);

  runStartup(() => {
    if (G.paused) return;
    if (info.offline && info.offline.gain > 0) {
      alertBox('floppy', `<b>Welcome back!</b><p>You were away for <b>${fmtDuration(info.offline.sec)}</b>. Your computer kept writing at half speed and saved <b>${fmtBytes(info.offline.gain)}</b>.</p>`);
    } else if (info.corrupt) {
      alertBox('alert', '<b>Your save could not be read.</b><p>A copy was kept in local storage; starting a fresh disk.</p>');
    } else if (info.fresh) {
      if (isMobile()) notify('doc', 'Welcome!', 'Tap the floppy disk to write bytes. The Read Me (top of the page) explains the rest.', { ms: 8000 });
      else { openWindow('readme'); focusWindow('readme'); }
    }
  });
}

init();
