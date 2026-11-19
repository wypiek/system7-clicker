'use strict';
/*
 * Pixel art for System7 Clicker.
 * Every icon is a 16x16 grid of palette characters, rendered to a PNG data URL
 * at runtime and scaled up with `image-rendering: pixelated`.
 */

const PALETTE = {
  k: '#000000', w: '#ffffff', g: '#c8c8c8', G: '#8a8a8a', d: '#555555',
  b: '#3a62c9', B: '#9cc6ff', r: '#d9302c', y: '#ffd21f', o: '#ff8a1f',
  n: '#9b6a2f', t: '#e9dfc0', e: '#2fae4a', p: '#8b4fd1', c: '#35c6c6',
  m: '#ff6fae',
};

const ART = {
  floppy: [
    'kkkkkkkkkkkkkkk.',
    'kbbbkgggggGkbbkk',
    'kbbbkgGGggGkbbbk',
    'kbbbkgGGggGkbbbk',
    'kbbbkgGGggGkbbbk',
    'kbbbkggggggkbbbk',
    'kbbbkkkkkkkkbbbk',
    'kbbbbbbbbbbbbbbk',
    'kbbwwwwwwwwwwbbk',
    'kbbwkkkkkkkkwbbk',
    'kbbwwwwwwwwwwbbk',
    'kbbwkkkkkkwwwbbk',
    'kbbwwwwwwwwwwbbk',
    'kbbwwwwwwwwwwbbk',
    'kbbwwwwwwwwwwbbk',
    'kkkkkkkkkkkkkkkk',
  ],
  trash: [
    '......kkkk......',
    '.....k....k.....',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kkkkkkkkkkkkkk.',
    '..kwwwwwwwwwwk..',
    '..kwGwGwwGwGwk..',
    '..kwGwGwwGwGwk..',
    '..kwGwGwwGwGwk..',
    '..kwGwGwwGwGwk..',
    '..kwGwGwwGwGwk..',
    '..kwGwGwwGwGwk..',
    '..kwGwGwwGwGwk..',
    '..kwGwGwwGwGwk..',
    '..kwwwwwwwwwwk..',
    '..kkkkkkkkkkkk..',
  ],
  trashfull: [
    '..kk..kkkk.kk...',
    '.kwwkk....kwwk..',
    'kkkkkkkkkkkkkkkk',
    'kwwwwwwwwwwwwwwk',
    'kkkkkkkkkkkkkkkk',
    '.kwwwwwwwwwwwwk.',
    '.kwGwGwwwwGwGwk.',
    '.kwGwGwwwwGwGwk.',
    '.kwGwGwwwwGwGwk.',
    '.kwGwGwwwwGwGwk.',
    '.kwGwGwwwwGwGwk.',
    '.kwGwGwwwwGwGwk.',
    '.kwGwGwwwwGwGwk.',
    '.kwGwGwwwwGwGwk.',
    '.kwwwwwwwwwwwwk.',
    '.kkkkkkkkkkkkkk.',
  ],
  hd: [
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kggggggggggggk.',
    '.kggggggggggggk.',
    '.kggggggggggggk.',
    '.kggggggggggggk.',
    '.kgeggggggggGgk.',
    '.kGGGGGGGGGGGGk.',
    '.kkkkkkkkkkkkkk.',
    '..kk........kk..',
    '................',
    '................',
    '................',
  ],
  mouse: [
    '.......k........',
    '.......k........',
    '........k.......',
    '....kkkkkkkk....',
    '...kggggggggk...',
    '...kgkkkkkkgk...',
    '...kgkGGGGkgk...',
    '...kgkkkkkkgk...',
    '...kwgggggggk...',
    '...kwgggggggk...',
    '...kwgggggggk...',
    '...kggggggggk...',
    '...kggggggggk...',
    '...kGggggggGk...',
    '....kkkkkkkk....',
    '................',
  ],
  drive: [
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kttttttttttttk.',
    '.kttkkkkkkkkttk.',
    '.kttGGGGGGGGttk.',
    '.kttttttttttttk.',
    '.kttttttttttttk.',
    '.kttttttttGGetk.',
    '.kGGGGGGGGGGGGk.',
    '.kkkkkkkkkkkkkk.',
    '..kk........kk..',
    '................',
    '................',
  ],
  calc: [
    '................',
    '..kkkkkkkkkkkk..',
    '..kggggggggggk..',
    '..kgkkkkkkkkgk..',
    '..kgkeeeeeekgk..',
    '..kgkkkkkkkkgk..',
    '..kggggggggggk..',
    '..kgwwgwwgoogk..',
    '..kggggggggggk..',
    '..kgwwgwwgoogk..',
    '..kggggggggggk..',
    '..kgwwgwwgoogk..',
    '..kggggggggggk..',
    '..kgwwwwwgoogk..',
    '..kggggggggggk..',
    '..kkkkkkkkkkkk..',
  ],
  cpanel: [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kggggggggggggk.',
    '.kggkgggkggkggk.',
    '.kgrrrggkggkggk.',
    '.kggkgggkgeeegk.',
    '.kggkgggkggkggk.',
    '.kggkggbbbgkggk.',
    '.kggkgggkggkggk.',
    '.kggkgggkggkggk.',
    '.kggkgggkggkggk.',
    '.kggggggggggggk.',
    '.kGGGGGGGGGGGGk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
  ],
  stack: [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kwbbbbbbwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwkkkkkkkkkkwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwkkkkkkkwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwbbwk.',
    '.kwwwwwwwwwwwwk.',
    '.kkkkkkkkkkkkkk.',
    '..kwwwwwwwwwwk..',
    '..kkkkkkkkkkkk..',
    '...kwwwwwwwwk...',
    '...kkkkkkkkkk...',
  ],
  printer: [
    '................',
    '....kkkkkkkk....',
    '....kwwwwwwk....',
    '....kwkkkkwk....',
    '..kkkkkkkkkkkk..',
    '.kggggggggggggk.',
    '.kggggggggggggk.',
    '.kgGGGGGGGGGGgk.',
    '.kggggggggggggk.',
    '.kggggggggggegk.',
    '.kggggggggggggk.',
    '.kGGGGGGGGGGGGk.',
    '.kkkkkkkkkkkkkk.',
    '...kwwwwwwwwk...',
    '...kkkkkkkkkk...',
    '................',
  ],
  network: [
    '................',
    'kkkkkk....kkkkkk',
    'kwwwwk....kwwwwk',
    'kwBBwk....kwBBwk',
    'kwwwwk....kwwwwk',
    'kkkkkk....kkkkkk',
    '..kk........kk..',
    '.kkkk......kkkk.',
    '..k..........k..',
    '..k..........k..',
    '..kkkkkkkkkkkk..',
    '.......k........',
    '.....kkkkkk.....',
    '.....kwBBwk.....',
    '.....kwwwwk.....',
    '.....kkkkkk.....',
  ],
  scsi: [
    '................',
    '.kkkkkkkkkkkkk..',
    '.kGyGyGyGyGyGk..',
    '..kGyGyGyGyGk...',
    '...kkkkkkkkk....',
    '.....kGGGk......',
    '......kdk.......',
    '......kdk.......',
    '......kdk.......',
    '......kdk.......',
    '......kdk.......',
    '......kdk.......',
    '....kkkkkkk.....',
    '....krrrrrk.....',
    '....krrrrrk.....',
    '....kkkkkkk.....',
  ],
  ext: [
    '................',
    '.....kkkk.......',
    '....kppppk......',
    '....kppppk......',
    '.kkkkppppkkkk...',
    '.kppppppppppk...',
    '.kpmmpppppppk...',
    '.kpmppppppppkkk.',
    '.kpppppppppppppk',
    '.kpppppppppppppk',
    '.kppppppppppkkk.',
    '.kppppppppppk...',
    '.kppppppppppk...',
    '.kppppppppppk...',
    '.kkkkkkkkkkkk...',
    '................',
  ],
  modem: [
    '................',
    '..........k.....',
    '...........k....',
    '.........k..k...',
    '..kkkkkkkkkkkk..',
    '.kggggggggggggk.',
    'kggggggggggggggk',
    'kkkkkkkkkkkkkkkk',
    'kddddddddddddddk',
    'kdrdedyddddddddk',
    'kddddddddddddddk',
    'kkkkkkkkkkkkkkkk',
    '.kk..........kk.',
    '................',
    '................',
    '................',
  ],
  ram: [
    '................',
    '................',
    '................',
    '................',
    'kkkkkkkkkkkkkkkk',
    'keeeeeeeeeeeeeek',
    'kekkkekkkekkkeek',
    'kekkkekkkekkkeek',
    'keeeeeeeeeeeeeek',
    'keeeeeeeeeeeeeek',
    'kyeyeyeyeyeyeyek',
    'kkkkkkkkkkkkkkkk',
    '................',
    '................',
    '................',
    '................',
  ],
  cdrom: [
    '................',
    '.....kkkkkk.....',
    '...kkwwwwwwkk...',
    '..kwwBBwwwwwwk..',
    '.kwwBBwwwwwwmwk.',
    '.kwBwwwwwwwwmwk.',
    'kwwwwwkkkkwwwwwk',
    'kwwwwwk..kwwwwwk',
    'kwwwwwk..kwwwwwk',
    'kwwwwwkkkkwwwwwk',
    '.kwwwwwwwwwwBwk.',
    '.kwwwwwwwwwBBwk.',
    '..kwwmwwwwBBwk..',
    '...kkwwwwwwkk...',
    '.....kkkkkk.....',
    '................',
  ],
  risc: [
    '................',
    '...G.G.G.G.G....',
    '..kkkkkkkkkkkk..',
    '..kddddddddddk..',
    'GGkddddddddddkGG',
    '..kddkkkkkkddk..',
    'GGkddkyyyykddkGG',
    '..kddkyooykddk..',
    'GGkddkyooykddkGG',
    '..kddkyyyykddk..',
    'GGkddkkkkkkddkGG',
    '..kddddddddddk..',
    'GGkddddddddddkGG',
    '..kkkkkkkkkkkk..',
    '...G.G.G.G.G....',
    '................',
  ],
  bbs: [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kttttttttttttk.',
    '.ktkkkkkkkkkktk.',
    '.ktkekeeekkkktk.',
    '.ktkkkkkkkkkktk.',
    '.ktkeeekeekkktk.',
    '.ktkkkkkkkkkktk.',
    '.ktkekkkkkkkktk.',
    '.ktkkkkkkkkkktk.',
    '.kttttttttttttk.',
    '.kttttttttttGtk.',
    '.kkkkkkkkkkkkkk.',
    '...kttttttttk...',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  road: [
    'BBBBBBBBBBBBBBBB',
    'BBBBBBBBBBBByyBB',
    'BBBBBBBBBBBByyBB',
    'eeeeeeeddeeeeeee',
    'eeeeeedyydeeeeee',
    'eeeeeddddddeeeee',
    'eeeedddyydddeeee',
    'eeeddddyyddddeee',
    'eeddddddddddddee',
    'edddddddddddddde',
    'dddddddyyddddddd',
    'dddddddyyddddddd',
    'dddddddyyddddddd',
    'dddddddddddddddd',
    'dddddddddddddddd',
    'dddddddddddddddd',
  ],
  quantum: [
    '................',
    '.....kkkkkk.....',
    '...kkppppppkk...',
    '..kpppwppppppk..',
    '.kppppppppmpppk.',
    '.kpppppppppppwk.',
    'kppypppppppppppk',
    'kpppppprrppppppk',
    'kpppppprrppppppk',
    'kppppppppppppwpk',
    '.kppppwpppppppk.',
    '.kppppppppppppk.',
    '..kppppppppppk..',
    '...kkppppppkk...',
    '.....kkkkkk.....',
    '................',
  ],
  bomb: [
    '...........y.o..',
    '..........y.y...',
    '.........k......',
    '........k.......',
    '......kkk.......',
    '....kkkkkk......',
    '...kkkkkkkk.....',
    '..kkwwkkkkkk....',
    '..kwwkkkkkkk....',
    '.kkwkkkkkkkkk...',
    '.kkkkkkkkkkkk...',
    '.kkkkkkkkkkkk...',
    '..kkkkkkkkkk....',
    '..kkkkkkkkkk....',
    '...kkkkkkkk.....',
    '.....kkkk.......',
  ],
  trophy: [
    '................',
    '..kkkkkkkkkkkk..',
    'kkkyywyyyyyyykkk',
    'k.kyywyyyyyyyk.k',
    'k.kyywyyyyyyyk.k',
    '.kkyyyyyyyyyykk.',
    '...kyyyyyyyyk...',
    '....kyyyyyyk....',
    '.....kyyyyk.....',
    '......kyyk......',
    '......kyyk......',
    '.....kkyykk.....',
    '....knnnnnnk....',
    '....knnnnnnk....',
    '...kkkkkkkkkk...',
    '................',
  ],
  doc: [
    '................',
    '..kkkkkkkkk.....',
    '..kwwwwwwwkk....',
    '..kwwwwwwwkwk...',
    '..kwkkkkwwkkkk..',
    '..kwwwwwwwwwwk..',
    '..kwkkkkkkkwwk..',
    '..kwwwwwwwwwwk..',
    '..kwkkkkkkwwwk..',
    '..kwwwwwwwwwwk..',
    '..kwkkkkkkkkwk..',
    '..kwwwwwwwwwwk..',
    '..kwkkkkkwwwwk..',
    '..kwwwwwwwwwwk..',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  chart: [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwwwweewwk.',
    '.kwwwwwwwweewwk.',
    '.kwwwwwbbweewwk.',
    '.kwwwwwbbweewwk.',
    '.kwwrrwbbweewwk.',
    '.kwwrrwbbweewwk.',
    '.kwwrrwbbweewwk.',
    '.kwwrrwbbweewwk.',
    '.kwkkkkkkkkkkwk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
  ],
  bag: [
    '................',
    '.....kkkkkk.....',
    '....kk....kk....',
    '....k......k....',
    '..kkkkkkkkkkkk..',
    '..kooooooooook..',
    '..kooooooooook..',
    '..koookkkkoook..',
    '..kookwwwwkook..',
    '..kookwbbwkook..',
    '..kookwwwwkook..',
    '..koookkkkoook..',
    '..kooooooooook..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
  ],
  balloon: [
    '................',
    '...kkkkkkkkkk...',
    '..kwwwwwwwwwwk..',
    '.kwwwwkkkkwwwwk.',
    '.kwwwkwwwwkwwwk.',
    '.kwwwwwwwwkwwwk.',
    '.kwwwwwwkkwwwwk.',
    '.kwwwwwkwwwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwwkwwwwwwk.',
    '..kwwwwwwwwwwk..',
    '...kkkkwwkkkk...',
    '.......kwk......',
    '......kwk.......',
    '.....kk.........',
    '................',
  ],
  alert: [
    '.......kk.......',
    '......kyyk......',
    '......kyyk......',
    '.....kyyyyk.....',
    '.....kykkyk.....',
    '....kyykkyyk....',
    '....kyykkyyk....',
    '...kyyykkyyyk...',
    '...kyyykkyyyk...',
    '..kyyyykkyyyyk..',
    '..kyyyyyyyyyyk..',
    '.kyyyyykkyyyyyk.',
    '.kyyyyykkyyyyyk.',
    'kyyyyyyyyyyyyyyk',
    'kkkkkkkkkkkkkkkk',
    '................',
  ],
};

// Palette swaps: map of palette char -> replacement char.
const SWAPS = {
  gold: { b: 'y', G: 'o', g: 'y', B: 'w' },
  red: { b: 'r' },
  green: { b: 'e' },
  purple: { b: 'p' },
  pink: { b: 'm' },
  cyan: { b: 'c' },
  orange: { b: 'o' },
  dark: { b: 'd' },
  silver: { y: 'g', n: 'G' },
  ruby: { y: 'r', n: 'd' },
  emerald: { y: 'e', n: 'd' },
};

/* ---------- Full-size icons (32x32 and 64x64), painted with simple primitives ---------- */

function makePainter(w, h) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const P = {
    w, h, g,
    px(x, y, c) { if (inb(x, y)) g[y][x] = c; },
    rect(x, y, rw, rh, c) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) P.px(i, j, c); },
    hl(x, y, len, c) { P.rect(x, y, len, 1, c); },
    vl(x, y, len, c) { P.rect(x, y, 1, len, c); },
    line(x0, y0, x1, y1, c) {
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        P.px(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    },
    /** Fills every pixel where test(x, y) is true and outlines the shape's edge. */
    shape(test, fill, line = 'k') {
      const inside = (x, y) => inb(x, y) && test(x, y);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!inside(x, y)) continue;
          const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
          if (edge && line) g[y][x] = line;
          else if (fill) g[y][x] = fill;
        }
      }
    },
  };
  return P;
}

const inR = (x, y, w, h) => (px, py) => px >= x && px < x + w && py >= y && py < y + h;
const inE = (cx, cy, rx, ry) => (px, py) => ((px + 0.5 - cx) / rx) ** 2 + ((py + 0.5 - cy) / ry) ** 2 <= 1;
const any = (...t) => (x, y) => t.some(f => f(x, y));
const all = (...t) => (x, y) => t.every(f => f(x, y));
const not = t => (x, y) => !t(x, y);
function inPoly(pts) {
  return (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

function drawFloppy(P, k) {
  const N = 32 * k, x0 = k, y0 = k, x1 = N - k, y1 = N - k, cut = 3 * k;
  P.shape((x, y) => x >= x0 && x < x1 && y >= y0 && y < y1 && !((x - (x1 - 1 - cut)) > (y - y0)), 'b');
  P.vl(x0 + 1, y0 + 1, y1 - y0 - 2, 'B');
  P.hl(x0 + 1, y0 + 1, 9 * k - x0 - 1, 'B');
  // metal shutter with its window
  P.shape(inR(9 * k, k, 14 * k, 11 * k), 'g');
  P.vl(9 * k + 1, k + 1, 11 * k - 2, 'w');
  P.vl(11 * k, 2 * k, 9 * k, 'G');
  P.shape(inR(17 * k, 3 * k, 4 * k, 7 * k), 'd');
  // label
  P.shape(inR(6 * k, 15 * k, 20 * k, 15 * k), 'w');
  for (let y = 18 * k; y < 28 * k; y += 3 * k) P.hl(8 * k, y, 16 * k, 'G');
  if (k > 1) { P.hl(8 * k, 18 * k, 9 * k, 'r'); }
  // write-protect hole
  P.rect(3 * k, 26 * k, 2 * k, 2 * k, 'k');
}

function drawTrash(P, full) {
  if (!full) {
    P.shape(all(inR(12, 1, 8, 4), not(inR(14, 3, 4, 2))), 'g');
    P.shape(inR(4, 4, 24, 4), 'g');
    P.hl(5, 5, 22, 'w');
    P.shape((x, y) => y >= 8 && y <= 30 && x >= 6 + ((y - 8) >> 3) && x <= 25 - ((y - 8) >> 3), 'w');
    for (const rx of [10, 13, 16, 19, 22]) P.vl(rx, 11, 17, 'G');
    return;
  }
  P.shape(inR(7, 2, 8, 9), 'w');
  P.hl(9, 4, 4, 'G'); P.hl(9, 6, 5, 'G');
  P.shape(inR(16, 0, 8, 10), 'w');
  P.line(18, 2, 22, 6, 'G'); P.line(18, 6, 21, 3, 'G');
  P.shape((x, y) => {
    if (y < 9 || y > 30) return false;
    const t = (y - 9) >> 3, bulge = y >= 13 && y <= 24 ? 1 : 0;
    return x >= 5 + t - bulge && x <= 26 - t + bulge;
  }, 'w');
  for (const rx of [9, 12, 16, 20, 23]) P.vl(rx, 12, 16, 'G');
  P.shape((x, y) => {
    if (x < 2 || x > 28) return false;
    const top = 1 + Math.floor((x - 2) / 4);
    return y >= top && y <= top + 2;
  }, 'g');
}

const HI = {
  floppy: { 32: P => drawFloppy(P, 1), 64: P => drawFloppy(P, 2) },
  trash: { 32: P => drawTrash(P, false) },
  trashfull: { 32: P => drawTrash(P, true) },
  hd: {
    32: P => {
      P.shape(inR(1, 9, 30, 14), 'g');
      P.hl(2, 10, 28, 'w'); P.vl(2, 10, 12, 'w');
      P.hl(3, 21, 27, 'G'); P.vl(29, 11, 11, 'G');
      P.rect(5, 18, 3, 1, 'e');
      for (let y = 13; y <= 19; y += 2) P.hl(19, y, 8, 'G');
      P.rect(4, 23, 4, 2, 'k'); P.rect(24, 23, 4, 2, 'k');
    },
  },
  doc: {
    32: P => {
      P.shape((x, y) => x >= 5 && x <= 26 && y >= 1 && y <= 30 && !((x - 19) > (y - 1)), 'w');
      P.shape((x, y) => x >= 19 && x <= 26 && y >= 1 && y <= 8 && (x - 19) <= (y - 1), 'g');
      [[12, 15], [15, 12], [18, 16], [21, 9], [24, 14], [27, 11]].forEach(([y, len]) => P.hl(8, y, len, 'G'));
    },
  },
  bag: {
    32: P => {
      P.shape(all(inR(10, 2, 12, 9), not(inR(12, 4, 8, 7))), 'd');
      P.shape(inR(4, 9, 24, 22), 'o');
      P.rect(5, 10, 22, 2, 'y');
      P.vl(26, 12, 18, 'n');
      P.shape(inR(12, 16, 8, 8), 'b');
      P.rect(14, 17, 4, 2, 'g');
      P.rect(14, 20, 4, 3, 'w');
    },
  },
  trophy: {
    32: P => {
      P.shape(all(inR(2, 4, 7, 9), not(inR(4, 6, 5, 5))), 'y');
      P.shape(all(inR(23, 4, 7, 9), not(inR(23, 6, 5, 5))), 'y');
      P.shape((x, y) => { if (y < 2 || y > 16) return false; const d = Math.max(0, y - 9); return x >= 6 + d && x <= 25 - d; }, 'y');
      P.vl(9, 4, 8, 'w'); P.vl(22, 4, 9, 'o');
      P.shape(inR(14, 16, 4, 6), 'y');
      P.shape(inR(9, 21, 14, 3), 'y');
      P.shape(inR(7, 24, 18, 6), 'n');
      P.rect(12, 26, 8, 2, 'y');
    },
  },
  chart: {
    32: P => {
      P.shape(inR(2, 3, 28, 26), 'w');
      P.vl(6, 6, 19, 'k'); P.hl(6, 24, 21, 'k');
      [9, 14, 19].forEach(y => P.px(5, y, 'k'));
      P.shape(inR(9, 16, 4, 8), 'r');
      P.shape(inR(15, 10, 4, 14), 'b');
      P.shape(inR(21, 6, 4, 18), 'e');
    },
  },
  cpanel: {
    32: P => {
      P.shape(inR(2, 3, 28, 26), 'g');
      P.hl(3, 4, 26, 'w'); P.vl(3, 4, 24, 'w'); P.hl(4, 27, 25, 'G'); P.vl(28, 5, 23, 'G');
      for (const x of [9, 16, 23]) P.vl(x, 7, 18, 'k');
      P.shape(inR(6, 17, 7, 4), 'r'); P.shape(inR(13, 9, 7, 4), 'b'); P.shape(inR(20, 13, 7, 4), 'e');
    },
  },
  balloon: {
    32: P => {
      const bubble = (x, y) => {
        if (x < 2 || x > 29 || y < 2 || y > 20) return false;
        const r = 4, cx = Math.min(Math.max(x, 2 + r), 29 - r), cy = Math.min(Math.max(y, 2 + r), 20 - r);
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 1;
      };
      P.shape(any(bubble, inPoly([[8, 19], [15, 19], [5, 30]])), 'w');
      [[14, 5, 4], [12, 6, 3], [17, 6, 3], [18, 7, 2], [17, 8, 2], [15, 9, 3], [15, 10, 2], [15, 11, 2], [15, 14, 2], [15, 15, 2]]
        .forEach(([x, y, len]) => P.hl(x, y, len, 'k'));
    },
  },
  alert: {
    32: P => {
      P.shape((x, y) => y >= 2 && y <= 28 && Math.abs(x + 0.5 - 16) <= (y - 2) * 15 / 26 + 0.8, 'y');
      P.rect(15, 10, 2, 10, 'k');
      P.rect(15, 23, 2, 2, 'k');
    },
  },
  bomb: {
    32: P => {
      P.shape(inR(20, 6, 5, 5), 'G');
      P.shape(inE(14.5, 19.5, 11.5, 11.5), 'k');
      [[8, 15], [8, 14], [9, 13], [10, 12], [11, 12], [12, 11]].forEach(([x, y]) => P.px(x, y, 'w'));
      P.line(24, 6, 27, 3, 'n');
      [[29, 2, 'y'], [30, 1, 'o'], [28, 0, 'o'], [30, 3, 'y'], [31, 2, 'o'], [29, 0, 'y'], [27, 1, 'y']].forEach(([x, y, c]) => P.px(x, y, c));
    },
  },
  ext: {
    32: P => {
      P.shape(any(inR(5, 10, 20, 19), inE(15, 7, 4.5, 4.5), inE(27, 19.5, 4.5, 4.5)), 'p');
      P.vl(6, 11, 17, 'm');
    },
  },
};

const _iconCache = {};

function iconURL(name, swap, res = 16) {
  const key = name + '|' + (swap || '') + '|' + res;
  if (_iconCache[key]) return _iconCache[key];
  const map = swap ? SWAPS[swap] : null;
  let grid;
  if (res > 16 && HI[name] && HI[name][res]) {
    const P = makePainter(res, res);
    HI[name][res](P);
    grid = P.g;
  } else {
    const rows = ART[name] || ART.floppy;
    grid = rows.map(r => [...r].map(ch => (ch === '.' ? null : ch)));
  }
  const h = grid.length, w = grid[0].length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let ch = grid[j][i];
      if (!ch) continue;
      if (map && map[ch]) ch = map[ch];
      if (!PALETTE[ch]) continue;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(i, j, 1, 1);
    }
  }
  _iconCache[key] = c.toDataURL();
  return _iconCache[key];
}

/** Picks the most detailed drawing that scales to `size` by a whole number. */
function iconRes(name, size) {
  const sizes = HI[name] ? Object.keys(HI[name]).map(Number).sort((a, b) => b - a) : [];
  for (const r of sizes) if (r <= size && size % r === 0) return r;
  return 16;
}

function iconImg(name, size = 32, swap = null, cls = '') {
  return `<img class="px ${cls}" src="${iconURL(name, swap, iconRes(name, size))}" width="${size}" height="${size}" alt="" draggable="false">`;
}

/* ---------- Desktop patterns (8x8, two colours) ---------- */

const PATTERNS = [
  { id: 'classic', name: 'Classic Gray', fg: '#808080', bg: '#a0a0a0',
    rows: ['10101010', '01010101', '10101010', '01010101', '10101010', '01010101', '10101010', '01010101'] },
  { id: 'dither', name: 'Lavender', fg: '#8c8cc4', bg: '#a7a7d8',
    rows: ['10101010', '01010101', '10101010', '01010101', '10101010', '01010101', '10101010', '01010101'] },
  { id: 'grey', name: 'Office Grey', fg: '#8f8f8f', bg: '#b4b4b4',
    rows: ['10001000', '00000000', '00100010', '00000000', '10001000', '00000000', '00100010', '00000000'] },
  { id: 'tiles', name: 'Bathroom Tiles', fg: '#4f7f7f', bg: '#76a5a5',
    rows: ['11111111', '10000000', '10000000', '10000000', '10000000', '10000000', '10000000', '10000000'] },
  { id: 'bricks', name: 'Red Bricks', fg: '#e3c8b0', bg: '#b4624c',
    rows: ['11111111', '10000000', '10000000', '10000000', '11111111', '00001000', '00001000', '00001000'] },
  { id: 'diagonal', name: 'Diagonal', fg: '#7d8ec4', bg: '#5e6fa3',
    rows: ['10000000', '01000000', '00100000', '00010000', '00001000', '00000100', '00000010', '00000001'] },
  { id: 'polka', name: 'Bubblegum', fg: '#c98aa6', bg: '#e8bccf',
    rows: ['00000000', '00110000', '00110000', '00000000', '00000000', '00000011', '00000011', '00000000'] },
  { id: 'waves', name: 'Ocean Waves', fg: '#79acdf', bg: '#3f7bb8',
    rows: ['10000001', '01000010', '00100100', '00011000', '00000000', '00000000', '00000000', '00000000'] },
  { id: 'night', name: 'Night Sky', fg: '#e8e8ff', bg: '#1d2150',
    rows: ['00000000', '00000100', '00000000', '01000000', '00000000', '00000000', '00001000', '00000000'] },
  { id: 'teal', name: 'Plain Teal', fg: '#4f8a8b', bg: '#4f8a8b',
    rows: ['00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000', '00000000'] },
  { id: 'mono', name: 'One-Bit', fg: '#000000', bg: '#ffffff',
    rows: ['10101010', '01010101', '10101010', '01010101', '10101010', '01010101', '10101010', '01010101'] },
];

const _patCache = {};
function patternURL(id, scale = 1) {
  const key = id + '|' + scale;
  if (_patCache[key]) return _patCache[key];
  const p = PATTERNS.find(x => x.id === id) || PATTERNS[0];
  const c = document.createElement('canvas');
  c.width = 8 * scale;
  c.height = 8 * scale;
  const ctx = c.getContext('2d');
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = p.fg;
  for (let j = 0; j < 8; j++) {
    for (let i = 0; i < 8; i++) {
      if (p.rows[j][i] === '1') ctx.fillRect(i * scale, j * scale, scale, scale);
    }
  }
  _patCache[key] = c.toDataURL();
  return _patCache[key];
}
