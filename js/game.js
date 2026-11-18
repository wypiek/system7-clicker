'use strict';
/* Core game state, rules, events and persistence. No DOM rendering here. */

const SAVE_KEY = 'system7clicker.save.v1';
const SAVE_PREFIX = 'S7C1:';
const TRASH_FILL_SECONDS = 600;
const OFFLINE_RATE = 0.5;
const OFFLINE_CAP = 7 * 86400;

function freshState() {
  const now = Date.now();
  return {
    v: 1,
    bytes: 0, runBytes: 0, lifetimeBytes: 0,
    handBytes: 0, lifetimeHandBytes: 0,
    clicks: 0, lifetimeClicks: 0,
    buildings: Object.fromEntries(BUILDINGS.map(b => [b.id, 0])),
    upgrades: [],
    achievements: [],
    patches: 0, restarts: 0,
    luckyClicks: 0, bombs: 0, bombWins: 0, bombLosses: 0,
    trashEmptied: 0, buildingsSold: 0,
    trash: 0,
    buffs: [],
    eggs: {},
    created: now, runStart: now, lastSave: now, playTime: 0,
    settings: {
      sound: true, volume: 0.5, particles: true, news: true,
      startup: true, balloons: true, pattern: 'dither',
    },
  };
}

let S = freshState();

const G = {
  upgradeSet: new Set(),
  achSet: new Set(),
  bps: 0, rawBps: 0, buffMult: 1, clickBuff: 1, clickPower: 1, prodMult: 1,
  bPer: {}, bTotal: {}, tierCount: {},
  globalPct: 0, clickPct: 0,
  nextLucky: 0, luckyActive: false,
  nextBomb: 0, bombActive: false,
  clickTimes: [],
  _ev: {},
  on(ev, fn) { (this._ev[ev] = this._ev[ev] || []).push(fn); },
  emit(ev, data) { (this._ev[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); },
};

const has = id => G.upgradeSet.has(id);
const owned = id => S.buildings[id] || 0;

/* ---------- Derived values ---------- */

function recalc() {
  G.globalPct = 0;
  G.clickPct = 0;
  for (const b of BUILDINGS) G.tierCount[b.id] = 0;
  for (const id of G.upgradeSet) {
    const u = UPGRADE_BY_ID[id];
    if (!u) continue;
    if (u.kind === 'building') G.tierCount[u.building]++;
    else if (u.kind === 'global') G.globalPct += u.pct;
    else if (u.kind === 'click') G.clickPct += 0.01;
  }
  G.prodMult = (1 + G.globalPct) * (1 + 0.01 * G.achSet.size) * (1 + 0.01 * S.patches);

  let raw = 0;
  for (const b of BUILDINGS) {
    const per = b.bps * Math.pow(2, G.tierCount[b.id]) * G.prodMult;
    G.bPer[b.id] = per;
    G.bTotal[b.id] = per * owned(b.id);
    raw += G.bTotal[b.id];
  }
  G.rawBps = raw;

  let mult = 1, click = 1;
  const now = Date.now();
  for (const bf of S.buffs) {
    if (bf.until <= now) continue;
    if (typeof bf.mult === 'number') mult *= bf.mult;
    if (typeof bf.click === 'number') click *= bf.click;
  }
  G.buffMult = mult;
  G.clickBuff = click;
  G.bps = raw * mult;
  const mouseTiers = Math.min(G.tierCount.mouse || 0, 3);
  G.clickPower = (Math.pow(2, mouseTiers) + G.bps * G.clickPct) * click;
}

/* ---------- Earning & spending ---------- */

function earn(x, hand = false) {
  if (!(x > 0)) return;
  S.bytes += x;
  S.runBytes += x;
  S.lifetimeBytes += x;
  if (hand) { S.handBytes += x; S.lifetimeHandBytes += x; }
}

function clickDisk() {
  const p = G.clickPower;
  earn(p, true);
  S.clicks++;
  S.lifetimeClicks++;
  const now = performance.now();
  G.clickTimes.push(now);
  while (G.clickTimes.length && G.clickTimes[0] < now - 1000) G.clickTimes.shift();
  if (G.clickTimes.length >= 15) S.eggs.speed = true;
  return p;
}

function buildingPrice(b, ownedN, amount) {
  const r = 1.15;
  return Math.ceil(b.cost * Math.pow(r, ownedN) * (Math.pow(r, amount) - 1) / (r - 1));
}

function maxAffordable(b) {
  const r = 1.15;
  const base = b.cost * Math.pow(r, owned(b.id));
  let n = Math.floor(Math.log(S.bytes * (r - 1) / base + 1) / Math.log(r));
  if (!isFinite(n) || n < 0) n = 0;
  while (n > 0 && buildingPrice(b, owned(b.id), n) > S.bytes) n--;
  return n;
}

function sellValue(b, amount) {
  amount = Math.min(amount, owned(b.id));
  if (amount <= 0) return 0;
  return Math.floor(buildingPrice(b, owned(b.id) - amount, amount) * 0.25);
}

function buyBuilding(id, amount) {
  const b = BUILDING_BY_ID[id];
  if (!b) return 0;
  if (amount === 'max') amount = maxAffordable(b);
  if (amount <= 0) return 0;
  const price = buildingPrice(b, owned(b.id), amount);
  if (price > S.bytes) return 0;
  S.bytes -= price;
  S.buildings[id] = owned(id) + amount;
  recalc();
  return amount;
}

function sellBuilding(id, amount) {
  const b = BUILDING_BY_ID[id];
  if (!b) return 0;
  if (amount === 'max') amount = owned(id);
  amount = Math.min(amount, owned(id));
  if (amount <= 0) return 0;
  const refund = sellValue(b, amount);
  S.buildings[id] = owned(id) - amount;
  S.bytes += refund;
  S.buildingsSold += amount;
  recalc();
  return amount;
}

function availableUpgrades() {
  return UPGRADES.filter(u => !has(u.id) && u.unlock(S)).sort((a, b) => a.cost - b.cost);
}

function buyUpgrade(id) {
  const u = UPGRADE_BY_ID[id];
  if (!u || has(id) || !u.unlock(S) || S.bytes < u.cost) return false;
  S.bytes -= u.cost;
  G.upgradeSet.add(id);
  recalc();
  return true;
}

/* ---------- Buffs ---------- */

function addBuff(buff) {
  S.buffs = S.buffs.filter(b => b.id !== buff.id);
  S.buffs.push({ ...buff, until: Date.now() + buff.dur * 1000 });
  recalc();
  G.emit('buffs');
}

/* ---------- Lucky Disks ---------- */

function luckyFreq() { return (has('charm') ? 2 : 1) * (has('clover') ? 2 : 1); }

function scheduleLucky() {
  G.nextLucky = Date.now() + (60 + Math.random() * 180) * 1000 / luckyFreq();
}

function luckyMissed() {
  G.luckyActive = false;
  scheduleLucky();
}

function luckyClicked() {
  G.luckyActive = false;
  scheduleLucky();
  S.luckyClicks++;
  const durMult = has('goldplate') ? 2 : 1;
  const r = Math.random();
  const ownedList = BUILDINGS.filter(b => owned(b.id) > 0);

  if (r < 0.45 || (r >= 0.95 && !ownedList.length)) {
    const gain = Math.min(S.bytes * 0.15, G.bps * 900) + 13;
    earn(gain);
    return { title: 'Lucky!', text: `+${fmtBytes(gain)}`, short: '+' + fmtBytes(gain) };
  }
  if (r < 0.85) {
    addBuff({ id: 'frenzy', name: 'Frenzy', mult: 7, dur: 77 * durMult, icon: 'floppy' });
    return { title: 'Frenzy!', text: `Production ×7 for ${77 * durMult} seconds.`, short: 'Frenzy!' };
  }
  if (r < 0.95) {
    addBuff({ id: 'clickfrenzy', name: 'Click Frenzy', click: 777, dur: 13 * durMult, icon: 'mouse' });
    return { title: 'Click Frenzy!', text: `Clicking power ×777 for ${13 * durMult} seconds.`, short: 'Click Frenzy!' };
  }
  const b = ownedList[Math.floor(Math.random() * ownedList.length)];
  const mult = 1 + 0.1 * owned(b.id);
  addBuff({ id: 'rush', name: `Defrag Rush: ${b.name}`, mult, dur: 30 * durMult, icon: b.icon });
  return {
    title: 'Defrag Rush!',
    text: `Your ${owned(b.id)} ${owned(b.id) === 1 ? b.name : b.plural} boost production ×${mult.toFixed(1)} for ${30 * durMult} seconds.`,
    short: 'Defrag Rush!',
  };
}

/* ---------- System errors (bombs) ---------- */

function scheduleBomb() {
  G.nextBomb = Date.now() + (480 + Math.random() * 900) * 1000;
}

function bombResolve(choice) {
  G.bombActive = false;
  scheduleBomb();
  S.bombs++;
  if (choice === 'timeout') {
    return { title: 'Error went away', text: 'The system error resolved itself. Spooky.' };
  }
  if (choice === 'resume') {
    const g = G.bps * 180;
    earn(g);
    return { title: 'Resumed', text: `Salvaged ${fmtBytes(g)} from memory.` };
  }
  if (Math.random() < 0.5) {
    S.bombWins++;
    const g = G.bps * 1200;
    earn(g);
    return { title: 'Clean restart!', text: `A fresh boot recovered ${fmtBytes(g)}!` };
  }
  S.bombLosses++;
  const loss = Math.min(S.bytes * 0.1, G.bps * 1800);
  S.bytes = Math.max(0, S.bytes - loss);
  addBuff({ id: 'crash', name: 'Restarting…', mult: 0, dur: 30, icon: 'bomb' });
  return { title: 'Crashed again!', text: `Lost ${fmtBytes(loss)}; production halted for 30 s.`, bad: true };
}

/* ---------- Trash ---------- */

function trashMult() { return (has('bigtrash') ? 2 : 1) * (has('compactor') ? 2 : 1) * (has('recycle') ? 2 : 1); }
function trashItems() { return Math.floor(S.trash * 64 * trashMult()); }
function trashValue() { return (G.rawBps * 120 * S.trash + Math.ceil(S.trash * 100)) * trashMult(); }

function emptyTrash() {
  if (trashItems() <= 0) return 0;
  const gain = trashValue();
  earn(gain);
  S.trash = 0;
  S.trashEmptied++;
  return gain;
}

/* ---------- System updates (prestige) ---------- */

function potentialPatches() { return Math.floor(Math.cbrt(S.lifetimeBytes / 1e12)); }
function patchProgress() { const p = Math.cbrt(S.lifetimeBytes / 1e12); return p - Math.floor(p); }
function nextPatchAt() { return Math.pow(potentialPatches() + 1, 3) * 1e12; }

function installUpdate() {
  const pot = potentialPatches();
  const gained = pot - S.patches;
  if (gained <= 0) return 0;
  const keep = {
    lifetimeBytes: S.lifetimeBytes, lifetimeHandBytes: S.lifetimeHandBytes,
    lifetimeClicks: S.lifetimeClicks, achievements: [...G.achSet], restarts: S.restarts + 1,
    patches: pot, luckyClicks: S.luckyClicks, bombs: S.bombs, bombWins: S.bombWins,
    bombLosses: S.bombLosses, trashEmptied: S.trashEmptied, buildingsSold: S.buildingsSold,
    eggs: S.eggs, created: S.created, playTime: S.playTime, settings: S.settings,
  };
  applyState({ ...freshState(), ...keep });
  saveGame();
  return gained;
}

/* ---------- Achievements ---------- */

function checkAchievements() {
  const h = new Date().getHours();
  if (h >= 0 && h < 5) S.eggs.night = true;
  let any = false;
  for (const a of ACHIEVEMENTS) {
    if (G.achSet.has(a.id)) continue;
    let ok = false;
    try { ok = a.test(S, G); } catch (e) { ok = false; }
    if (ok) {
      G.achSet.add(a.id);
      any = true;
      G.emit('achievement', a);
    }
  }
  if (any) recalc();
}

function egg(id) {
  if (S.eggs[id]) return;
  S.eggs[id] = true;
  checkAchievements();
}

/* ---------- Main loop ---------- */

let _lastTick = 0, _accAch = 0, _accSave = 0;

function update(dt) {
  const now = Date.now();
  if (S.buffs.some(b => b.until <= now)) {
    S.buffs = S.buffs.filter(b => b.until > now);
    recalc();
    G.emit('buffs');
  }
  earn(G.bps * dt);
  S.playTime += dt;
  S.trash = Math.min(1, S.trash + dt / TRASH_FILL_SECONDS);

  if (!G.luckyActive && now >= G.nextLucky) {
    if (document.hidden) G.nextLucky = now + 5000;
    else { G.luckyActive = true; G.emit('lucky-spawn'); }
  }
  if (!G.bombActive && now >= G.nextBomb) {
    if (document.hidden || G.bps <= 0 || G.busy) G.nextBomb = now + 60000;
    else { G.bombActive = true; G.emit('bomb'); }
  }
}

function gameTick() {
  const now = performance.now();
  let dt = (now - _lastTick) / 1000;
  _lastTick = now;
  if (!(dt > 0)) return;
  if (dt > OFFLINE_CAP) dt = OFFLINE_CAP;
  update(dt);
  _accAch += dt;
  if (_accAch >= 1) { _accAch = 0; checkAchievements(); }
  _accSave += dt;
  if (_accSave >= 30) { _accSave = 0; saveGame(); G.emit('saved'); }
}

function startGame() {
  scheduleLucky();
  scheduleBomb();
  _lastTick = performance.now();
  setInterval(gameTick, 100);
}

/* ---------- Persistence ---------- */

function serialize() {
  S.upgrades = [...G.upgradeSet];
  S.achievements = [...G.achSet];
  S.lastSave = Date.now();
  return JSON.stringify(S);
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, serialize());
    return true;
  } catch (e) {
    console.warn('Save failed', e);
    return false;
  }
}

function sanitize(obj) {
  const fresh = freshState();
  const out = fresh;
  if (!obj || typeof obj !== 'object') return out;
  for (const k of Object.keys(fresh)) {
    const fv = fresh[k], ov = obj[k];
    if (typeof fv === 'number') {
      if (typeof ov === 'number' && isFinite(ov)) out[k] = Math.max(0, ov);
    }
  }
  if (obj.buildings && typeof obj.buildings === 'object') {
    for (const b of BUILDINGS) {
      const n = obj.buildings[b.id];
      if (typeof n === 'number' && isFinite(n) && n >= 0) out.buildings[b.id] = Math.floor(n);
    }
  }
  if (Array.isArray(obj.upgrades)) out.upgrades = obj.upgrades.filter(id => UPGRADE_BY_ID[id]);
  if (Array.isArray(obj.achievements)) out.achievements = obj.achievements.filter(id => ACH_BY_ID[id]);
  if (Array.isArray(obj.buffs)) {
    out.buffs = obj.buffs.filter(b => b && typeof b === 'object' && typeof b.until === 'number'
      && typeof b.id === 'string' && typeof b.dur === 'number')
      .map(b => ({
        id: b.id, name: String(b.name || b.id), icon: typeof b.icon === 'string' ? b.icon : 'floppy',
        dur: b.dur, until: b.until,
        ...(typeof b.mult === 'number' ? { mult: b.mult } : {}),
        ...(typeof b.click === 'number' ? { click: b.click } : {}),
      }));
  }
  if (obj.eggs && typeof obj.eggs === 'object') {
    for (const [k, v] of Object.entries(obj.eggs)) if (v === true) out.eggs[k] = true;
  }
  if (obj.settings && typeof obj.settings === 'object') {
    for (const [k, v] of Object.entries(fresh.settings)) {
      if (typeof obj.settings[k] === typeof v) out.settings[k] = obj.settings[k];
    }
  }
  out.trash = Math.min(1, out.trash);
  out.settings.volume = Math.min(1, Math.max(0, out.settings.volume));
  out.patches = Math.floor(out.patches);
  return out;
}

function applyState(obj) {
  S = sanitize(obj);
  G.upgradeSet = new Set(S.upgrades);
  G.achSet = new Set(S.achievements);
  G.luckyActive = false;
  recalc();
}

/** Loads the save from localStorage. Returns { fresh, offline } info. */
function loadGame() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
  if (!raw) {
    applyState(freshState());
    return { fresh: true };
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    try { localStorage.setItem(SAVE_KEY + '.corrupt', raw); } catch (e2) { /* ignore */ }
    applyState(freshState());
    return { fresh: true, corrupt: true };
  }
  applyState(obj);
  const away = (Date.now() - (S.lastSave || Date.now())) / 1000;
  let offline = null;
  if (away > 60) {
    const sec = Math.min(away, OFFLINE_CAP);
    const gain = G.rawBps * sec * OFFLINE_RATE;
    earn(gain);
    S.trash = Math.min(1, S.trash + sec / TRASH_FILL_SECONDS);
    offline = { sec: away, gain };
  }
  return { fresh: false, offline };
}

function resetGame() {
  const settings = S.settings;
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  applyState({ ...freshState(), settings });
  saveGame();
}

/* ---------- Export / import ---------- */

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function b64decode(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function exportSave() {
  return SAVE_PREFIX + b64encode(serialize());
}

function importSave(text) {
  let str = String(text || '').trim();
  if (!str) throw new Error('The save code is empty.');
  let obj = null;
  if (str.startsWith('{')) {
    try { obj = JSON.parse(str); } catch (e) { obj = null; }
  } else {
    str = str.replace(/\s+/g, '');
    if (str.startsWith(SAVE_PREFIX)) str = str.slice(SAVE_PREFIX.length);
    try { obj = JSON.parse(b64decode(str)); } catch (e) { obj = null; }
  }
  if (!obj || typeof obj !== 'object' || typeof obj.bytes !== 'number' || !obj.buildings) {
    throw new Error('That doesn’t look like a System7 Clicker save. Check that you copied the whole code.');
  }
  applyState(obj);
  S.lastSave = Date.now();
  saveGame();
}
