'use strict';
/* Game content: formatting helpers, buildings, upgrades, achievements, news. */

/* ---------- Formatting ---------- */

const UNITS = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB', 'RB', 'QB'];
const KB = 1024, MB = KB ** 2, GB = KB ** 3, TB = KB ** 4, PB = KB ** 5, EB = KB ** 6,
  ZB = KB ** 7, YB = KB ** 8, RB = KB ** 9, QB = KB ** 10;

function floorTo(n, d) {
  const p = Math.pow(10, d);
  return (Math.floor(n * p + 1e-9) / p).toFixed(d);
}

function fmtBytes(n, dec = 2) {
  if (!isFinite(n)) return 'Infinite bytes';
  const neg = n < 0;
  n = Math.abs(n);
  let out;
  if (n < 1024) {
    if (n < 10 && n % 1 !== 0) out = floorTo(n, 1) + ' bytes';
    else {
      const whole = Math.floor(n);
      out = whole.toLocaleString('en-US') + (whole === 1 ? ' byte' : ' bytes');
    }
  } else {
    let i = 0;
    while (n >= 1024 && i < UNITS.length - 1) { n /= 1024; i++; }
    if (n >= 1024) {
      out = n.toExponential(2).replace('e+', 'e') + ' ' + UNITS[i];
    } else {
      const d = n >= 100 ? Math.max(0, dec - 2) : n >= 10 ? Math.max(0, dec - 1) : dec;
      out = floorTo(n, d) + ' ' + UNITS[i];
    }
  }
  return (neg ? '-' : '') + out;
}

function fmtNum(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1e9) return Math.floor(n).toLocaleString('en-US');
  return n.toExponential(3).replace('e+', 'e');
}

function fmtDuration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600),
    m = Math.floor(sec % 3600 / 60), s = sec % 60;
  const parts = [];
  if (d) parts.push(d + 'd');
  if (h) parts.push(h + 'h');
  if (m && !d) parts.push(m + 'm');
  if (!d && !h) parts.push(s + 's');
  return parts.join(' ');
}

function versionString(patches) {
  const minor = Math.floor(patches / 10), patch = patches % 10;
  return `7.${minor}` + (patch ? `.${patch}` : '');
}

/* ---------- Buildings ---------- */

const BUILDINGS = [
  { id: 'mouse', name: 'Auto-Mouse', plural: 'Auto-Mice', icon: 'mouse', cost: 15, bps: 0.1,
    desc: 'A one-button mouse that clicks all by itself. Nobody knows who taught it.' },
  { id: 'floppy', name: 'Floppy Drive', plural: 'Floppy Drives', icon: 'drive', cost: 100, bps: 1,
    desc: 'Swallows disks, burps bytes. 800K of pure potential.' },
  { id: 'calc', name: 'Desk Accessory', plural: 'Desk Accessories', icon: 'calc', cost: 1100, bps: 8,
    desc: 'A tiny calculator that only knows how to add bytes.' },
  { id: 'cpanel', name: 'Control Panel', plural: 'Control Panels', icon: 'cpanel', cost: 12000, bps: 47,
    desc: 'Every slider is set to "More Bytes".' },
  { id: 'stack', name: 'Hypertext Stack', plural: 'Hypertext Stacks', icon: 'stack', cost: 130000, bps: 260,
    desc: 'Cards linking to cards linking to bytes.' },
  { id: 'printer', name: 'Laser Printer', plural: 'Laser Printers', icon: 'printer', cost: 1.4e6, bps: 1400,
    desc: 'Prints bytes at a crisp 300 dpi. Toner sold separately.' },
  { id: 'network', name: 'Serial Network', plural: 'Serial Networks', icon: 'network', cost: 2e7, bps: 7800,
    desc: 'Beige boxes daisy-chained together, passing bytes down the line.' },
  { id: 'scsi', name: 'SCSI Chain', plural: 'SCSI Chains', icon: 'scsi', cost: 3.3e8, bps: 44000,
    desc: 'Seven devices, one bus. Remember to terminate.' },
  { id: 'ext', name: 'System Extension', plural: 'System Extensions', icon: 'ext', cost: 5.1e9, bps: 260000,
    desc: 'Loads at startup and parades across the bottom of the screen.' },
  { id: 'modem', name: 'Dial-up Modem', plural: 'Dial-up Modems', icon: 'modem', cost: 7.5e10, bps: 1.6e6,
    desc: 'SCREEEE-KSHHHH-DING. Downloads bytes at a blistering 14.4k.' },
  { id: 'ram', name: 'RAM Upgrade', plural: 'RAM Upgrades', icon: 'ram', cost: 1e12, bps: 1e7,
    desc: 'Memory sticks socketed by hand. Ground yourself first.' },
  { id: 'cdrom', name: 'CD-ROM Tower', plural: 'CD-ROM Towers', icon: 'cdrom', cost: 1.4e13, bps: 6.5e7,
    desc: 'Twelve encyclopedias spinning at once. Mind your fingers.' },
  { id: 'risc', name: 'RISC Accelerator', plural: 'RISC Accelerators', icon: 'risc', cost: 1.7e14, bps: 4.3e8,
    desc: 'Reduced instructions. Increased bytes.' },
  { id: 'bbs', name: 'Bulletin Board', plural: 'Bulletin Boards', icon: 'bbs', cost: 2.1e15, bps: 2.9e9,
    desc: 'Sysops around the world upload bytes to your board at 3 a.m.' },
  { id: 'web', name: 'Info Superhighway', plural: 'Info Superhighways', icon: 'road', cost: 2.6e16, bps: 2.1e10,
    desc: 'Everyone says it is going to be big. They are right.' },
  { id: 'quantum', name: 'Quantum Desktop', plural: 'Quantum Desktops', icon: 'quantum', cost: 3.1e17, bps: 1.5e11,
    desc: 'Every file is simultaneously saved and unsaved.' },
];
const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

/* ---------- Upgrades ---------- */

const TIERS = [
  { need: 1, mult: 10, name: 'Bug Fix Release', flavor: 'Fixes three bugs. Introduces two.' },
  { need: 5, mult: 50, name: 'Turbo Switch', flavor: 'The button on the front finally does something.' },
  { need: 25, mult: 500, name: '32-Bit Clean', flavor: 'No more dirty addressing modes.' },
  { need: 50, mult: 5e4, name: 'Native Code', flavor: 'Recompiled for speed. Mostly.' },
  { need: 100, mult: 5e6, name: 'Overclocked', flavor: 'Runs hot. Very hot. Keep away from cats.' },
  { need: 150, mult: 5e8, name: 'Registered Shareware', flavor: 'You actually mailed in the $15. Good for you.' },
  { need: 200, mult: 5e10, name: 'Golden Master', flavor: 'Ready to ship. Golden, even.' },
];

const UPGRADES = [];

BUILDINGS.forEach(b => {
  TIERS.forEach((t, ti) => {
    UPGRADES.push({
      id: `${b.id}_t${ti}`, kind: 'building', building: b.id, tier: ti,
      icon: b.icon, badge: 't' + ti,
      name: t.name, sub: `${b.name} upgrade`,
      cost: b.cost * t.mult,
      desc: b.id === 'mouse' && ti < 3
        ? 'Auto-Mice and clicking are <b>twice</b> as efficient.'
        : `${b.plural} are <b>twice</b> as efficient.`,
      flavor: t.flavor,
      unlock: s => (s.buildings[b.id] || 0) >= t.need,
    });
  });
});

[
  ['cache', 'Disk Cache', 5e4, 0.05, 'Remembers the bytes you just wrote. Writes them again.'],
  ['vm', 'Virtual Memory', 5e6, 0.05, 'Pretend memory, real bytes.'],
  ['addr32', '32-Bit Addressing', 5e8, 0.10, 'Now you can count all the way to four billion.'],
  ['memman', 'Memory Manager', 5e10, 0.10, 'Moves blocks around until they fit. Like Tetris for your heap.'],
  ['compress', 'Compressed RAM', 5e12, 0.15, 'Squeezes bytes until more come out.'],
  ['defrag', 'Heap Defragmenter', 5e14, 0.15, 'Every free byte, neatly lined up in a row.'],
  ['doubler', 'Byte Doubler Pro', 5e16, 0.20, 'Doesn’t actually double anything. Still helps.'],
  ['clipboard', 'Infinite Clipboard', 5e18, 0.20, 'Copy. Paste. Paste. Paste. Paste.'],
  ['binary', 'Universal Binary', 5e20, 0.25, 'Runs on everything, including toasters.'],
  ['hyper', 'Hyperspace Partition', 5e22, 0.25, 'The partition is bigger on the inside.'],
].forEach(([id, name, cost, pct, flavor], i) => {
  UPGRADES.push({
    id, kind: 'global', pct, icon: 'ram', swap: null, badge: 'tg',
    name, sub: 'System upgrade', cost,
    desc: `All production <b>+${Math.round(pct * 100)}%</b>.`, flavor,
    unlock: s => s.runBytes >= cost / 5,
  });
});

[
  ['pad', 'Mouse Pad', 5e4, 1e3, 'Now with a picture of a sunset.'],
  ['ball', 'Clean Mouse Ball', 5e6, 1e5, 'You would not believe what was in there.'],
  ['wrist', 'Ergonomic Wrist Rest', 5e8, 1e7, 'Click for hours in total comfort.'],
  ['dblclick', 'Fast Double-Click', 5e10, 1e9, 'Slider set all the way to the right.'],
  ['trackball', 'Trackball', 5e12, 1e11, 'Spin to win.'],
  ['twobutton', 'Two-Button Mouse', 5e14, 1e13, 'Heresy! But productive heresy.'],
  ['laser', 'Optical Mouse', 5e16, 1e15, 'No ball. No problem.'],
  ['telekinesis', 'Telekinetic Mouse', 5e18, 1e17, 'You only have to think about clicking.'],
].forEach(([id, name, cost, need, flavor]) => {
  UPGRADES.push({
    id, kind: 'click', icon: 'mouse', badge: 'tc',
    name, sub: 'Clicking upgrade', cost,
    desc: 'Clicking gains <b>+1%</b> of your bytes per second.', flavor,
    unlock: s => s.lifetimeHandBytes >= need,
  });
});

[
  ['charm', 'Lucky Charm', 777777, 7, 'Lucky Disks appear <b>twice</b> as often.', 'Rub it for luck. Not too hard.'],
  ['goldplate', 'Gold Plating', 77777777, 27, 'Lucky Disk effects last <b>twice</b> as long.', '24 karat, 1.44 MB.'],
  ['clover', 'Four-Leaf Floppy', 7.77e10, 77, 'Lucky Disks appear <b>twice</b> as often.', 'Found it in a box of old shareware.'],
].forEach(([id, name, cost, need, desc, flavor]) => {
  UPGRADES.push({
    id, kind: 'lucky', icon: 'floppy', swap: 'gold', badge: 'tl',
    name, sub: 'Luck upgrade', cost, desc, flavor,
    unlock: s => s.luckyClicks >= need,
  });
});

[
  ['bigtrash', 'Bigger Trash Can', 1e6, 5, 'Rummaging finds a bigger can in the attic.'],
  ['compactor', 'Trash Compactor', 1e10, 25, 'Crunch.'],
  ['recycle', 'Recycling Program', 1e14, 60, 'Reduce, reuse, re-byte.'],
].forEach(([id, name, cost, need, flavor]) => {
  UPGRADES.push({
    id, kind: 'trash', icon: 'trashfull', badge: 'tt',
    name, sub: 'Trash upgrade', cost,
    desc: 'The Trash holds and recovers <b>twice</b> as much.', flavor,
    unlock: s => s.trashEmptied >= need,
  });
});

const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

/* ---------- Achievements ---------- */

const ACHIEVEMENTS = [];
function ach(id, name, desc, icon, test, extra = {}) {
  ACHIEVEMENTS.push({ id, name, desc, icon, test, swap: null, secret: false, ...extra });
}

[
  [KB, 'Hello, World'], [100 * KB, 'Shareware Author'], [800 * KB, 'Disk Full: 800K'],
  [1440 * KB, 'High Density', '1,440 KB'], [100 * MB, 'Hard Disk Hero'], [GB, 'Gigabyte Glutton'],
  [100 * GB, 'Bit Baron'], [TB, 'Terabyte Tycoon'], [100 * TB, 'Data Hoarder'],
  [PB, 'Petabyte Pioneer'], [EB, 'Exabyte Emperor'], [ZB, 'Zettabyte Zealot'],
  [YB, 'Yottabyte Yogi'], [RB, 'Running Out of Prefixes'], [QB, 'The Library of Everything'],
].forEach(([n, name, label], i) => {
  ach('bytes' + i, name, `Write ${label || fmtBytes(n, 0)} in total.`, 'floppy',
    s => s.lifetimeBytes >= n, { swap: i >= 10 ? 'gold' : i >= 5 ? 'purple' : null });
});

[
  [1, 'Background Process'], [10, 'Multitasking'], [100, 'Cooperative Multitasking'],
  [KB, 'Broadband Dreams'], [100 * KB, 'Power User'], [10 * MB, 'Mainframe Envy'],
  [GB, 'Server Farm'], [100 * GB, 'Data Firehose'], [10 * TB, 'Byte Singularity'],
  [PB, 'Cosmic Bandwidth'], [EB, 'Infinite Loop'],
].forEach(([n, name], i) => {
  ach('bps' + i, name, `Produce ${fmtBytes(n, 0)} per second.`, 'chart',
    (s, g) => g.rawBps >= n);
});

[
  [1, 'First Click'], [100, 'Click Happy'], [1000, 'Repetitive Strain'],
  [10000, 'Mouse Wrangler'], [50000, 'Clickaholic'], [100000, 'Unstoppable Index Finger'],
].forEach(([n, name], i) => {
  ach('click' + i, name, `Click the disk ${fmtNum(n)} time${n > 1 ? 's' : ''}.`, 'mouse',
    s => s.lifetimeClicks >= n);
});

[
  [KB, 'Hand Crafted'], [MB, 'Artisanal Bytes'], [GB, 'Click Farm'], [TB, 'Clicktopia'], [PB, 'Finger of Destiny'],
].forEach(([n, name], i) => {
  ach('hand' + i, name, `Write ${fmtBytes(n, 0)} just by clicking.`, 'mouse',
    s => s.lifetimeHandBytes >= n, { swap: null });
});

BUILDINGS.forEach(b => {
  [[1, 'Installed'], [50, 'Enthusiast'], [100, 'Empire'], [200, 'Overlord']].forEach(([n, suffix]) => {
    ach(`b_${b.id}_${n}`, `${b.name} ${suffix}`, `Own ${n} ${n === 1 ? b.name : b.plural}.`, b.icon,
      s => (s.buildings[b.id] || 0) >= n);
  });
});

const totalBuildings = s => BUILDINGS.reduce((a, b) => a + (s.buildings[b.id] || 0), 0);

[[100, 'Software Library'], [500, 'Warehouse Club'], [1000, 'Data Center'], [2500, 'Silicon Valley']]
  .forEach(([n, name], i) => ach('own' + i, name, `Own ${n} buildings in total.`, 'hd', s => totalBuildings(s) >= n));

ach('complete', 'Complete Install', 'Own at least one of every building.', 'ext',
  s => BUILDINGS.every(b => (s.buildings[b.id] || 0) > 0));

[[10, 'Upgraded'], [25, 'Early Adopter'], [50, 'Bleeding Edge'], [100, 'Beta Tester for Life']]
  .forEach(([n, name], i) => ach('upg' + i, name, `Install ${n} upgrades.`, 'risc', (s, g) => g.upgradeSet.size >= n));

[[1, 'Lucky Disk!'], [7, 'Lucky Seven'], [27, 'Charmed Life'], [77, 'Golden Archive'], [777, 'Jackpot']]
  .forEach(([n, name], i) => ach('lucky' + i, name, `Click ${n} Lucky Disk${n > 1 ? 's' : ''}.`, 'floppy',
    s => s.luckyClicks >= n, { swap: 'gold' }));

ach('bomb0', 'It Happens', 'Survive a system error.', 'bomb', s => s.bombs >= 1);
ach('bomb1', 'Crash Course', 'Survive 10 system errors.', 'bomb', s => s.bombs >= 10);
ach('bomb2', 'Brave Restart', 'Gamble on Restart and win.', 'bomb', s => s.bombWins >= 1);
ach('bomb3', 'Crash Test Dummy', 'Gamble on Restart and lose.', 'bomb', s => s.bombLosses >= 1);

[[1, 'Taking Out the Trash'], [10, 'Tidy Desktop'], [50, 'Sanitation Engineer'], [200, 'Waste Management']]
  .forEach(([n, name], i) => ach('trash' + i, name, `Empty the Trash ${n} time${n > 1 ? 's' : ''}.`, 'trashfull',
    s => s.trashEmptied >= n));

[[1, 'System Update'], [3, 'Version Hopper'], [10, 'Patch Tuesday'], [25, 'Rolling Release']]
  .forEach(([n, name], i) => ach('restart' + i, name, `Install ${n} system update${n > 1 ? 's' : ''}.`, 'ext',
    s => s.restarts >= n));

[[10, 'Point Release'], [50, 'Feature Complete'], [100, 'Major Upgrade'], [500, 'Version Inflation']]
  .forEach(([n, name], i) => ach('patch' + i, name, `Reach ${n} patches (System ${versionString(n)}).`, 'cpanel',
    s => s.patches >= n));

ach('sell', 'Sell Out', 'Sell a building.', 'bag', s => s.buildingsSold >= 1);

[
  ['about', 'About Time', 'Open the About box.', 'floppy'],
  ['undo', 'Nothing to Undo', 'Try to undo a click.', 'alert'],
  ['readme', 'RTFM', 'Read the Read Me.', 'doc'],
  ['shade', 'Window Shade', 'Roll up a window by double-clicking its title bar.', 'stack'],
  ['pattern', 'Interior Decorator', 'Change the desktop pattern.', 'cpanel'],
  ['export', 'Backup Strategy', 'Export your save.', 'floppy'],
  ['import', 'Time Traveler', 'Import a save.', 'floppy'],
  ['cleanup', 'Neat Freak', 'Clean up your windows.', 'hd'],
  ['night', 'Night Owl', 'Play between midnight and 5 a.m.', 'quantum'],
  ['speed', 'Speed Clicker', 'Click 15 times in one second.', 'mouse'],
  ['shutdown', 'Goodnight, Computer', 'Shut down your computer.', 'bomb'],
  ['selectall', 'Select Everything', 'Select all the things.', 'hd'],
  ['balloon', 'Balloon Animal', 'Turn balloon help off and on again.', 'balloon'],
  ['silence', 'Silence Is Golden', 'Turn off the sound.', 'modem'],
].forEach(([id, name, desc, icon]) => ach('egg_' + id, name, desc, icon, s => !!s.eggs[id], { secret: true }));

const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

/* ---------- News ticker ---------- */

const own = (s, id) => s.buildings[id] || 0;
const NEWS = [
  [() => true, 'Local user discovers that clicking a floppy disk produces bytes. Experts baffled.'],
  [() => true, 'Rebuilding the desktop file has fixed everything. Again.'],
  [() => true, 'Study finds nine out of ten users prefer beige.'],
  [() => true, 'Man spends whole afternoon arranging desktop icons; calls it "productive".'],
  [() => true, 'Please insert Disk 7 of 12.'],
  [() => true, 'Weather forecast: 100% chance of bytes, clearing by the weekend.'],
  [() => true, 'Puzzle desk accessory remains unsolved for 1,000 consecutive days.'],
  [() => true, 'Scientists confirm half a byte is called a "nibble". Snacks ensue.'],
  [() => true, 'User clicks so hard their mouse ball escapes and rolls under the fridge.'],
  [() => true, 'Floppy collector refuses to explain the "DO NOT ERASE" label.'],
  [() => true, 'Area teen types "help" into calculator, gets "0".'],
  [() => true, 'Tip: you can drag windows around by their striped title bars.'],
  [() => true, 'Tip: point at things in the Store for balloon help.'],
  [s => s.lifetimeClicks > 500, 'Doctors warn of rising cases of "disk finger".'],
  [s => own(s, 'mouse') > 0, 'Auto-Mice unionize, demand cleaner mouse balls.'],
  [s => own(s, 'mouse') >= 50, 'Desk space shortage reported as Auto-Mouse population explodes.'],
  [s => own(s, 'floppy') > 0, 'Floppy drive making "that noise" again. Owner unconcerned.'],
  [s => own(s, 'calc') > 0, 'Desk Accessory refuses to calculate anything except bytes.'],
  [s => own(s, 'cpanel') > 0, 'Control Panel slider moved one pixel right; productivity up 0.0001%.'],
  [s => own(s, 'stack') > 0, 'Hypertext Stack links to itself, creates small byte vortex.'],
  [s => own(s, 'printer') > 0, 'Laser printer jams, then prints 40 pages of the letter Q anyway.'],
  [s => own(s, 'network') > 0, 'Office network goes down when someone unplugs the wrong beige cable.'],
  [s => own(s, 'scsi') > 0, 'SCSI chain works perfectly on first try. Scientists unable to explain why.'],
  [s => own(s, 'ext') > 0, 'Startup now takes 11 minutes as extension icons fill three rows.'],
  [s => own(s, 'modem') > 0, 'Phone line busy for nine hours. Family members furious.'],
  [s => own(s, 'ram') > 0, 'User installs more memory; still gets "not enough memory" error.'],
  [s => own(s, 'cdrom') > 0, 'CD-ROM tower spins up, blows papers off nearby desks.'],
  [s => own(s, 'risc') > 0, 'RISC Accelerator finishes instructions before you think of them.'],
  [s => own(s, 'bbs') > 0, 'Sysop logs in at 3 a.m. to upload 400 bytes of ASCII art.'],
  [s => own(s, 'web') > 0, 'Information Superhighway now has more lanes than bytes. Traffic still bad.'],
  [s => own(s, 'quantum') > 0, 'Quantum Desktop both crashes and does not. Users satisfied, probably.'],
  [s => s.luckyClicks > 0, 'Shiny golden floppies spotted on desktops nationwide.'],
  [s => s.trashEmptied > 0, 'Trash emptied with deeply satisfying crunch.'],
  [s => s.bombs > 0, 'Bomb icon sighted near local word processor. Residents told to save often.'],
  [s => s.restarts > 0, 'System update installed. Nobody reads the release notes.'],
  [s => s.lifetimeBytes >= GB, 'Your disk usage has been officially classified as "concerning".'],
  [s => s.lifetimeBytes >= PB, 'Historians run out of shelf space for your bytes.'],
];
