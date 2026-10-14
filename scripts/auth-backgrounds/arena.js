'use strict';
// Pozadina ekrana za registraciju: arena Turnira svjetskih borilačkih vještina, danju.
// Pokretanje iz korijena projekta: node scripts/auth-backgrounds/arena.js
// Sprema assets/images/auth/signup_arena.jpg (1080 x 2340).
// --preview dodatno sprema umanjeni pregled i isječke u privremenu mapu.
const path = require('path');
const fs = require('fs');
const os = require('os');
const C = require('./core');
const { W, H, R, G, B, clamp, mix, smooth, hex, forBox, forAll, paint, light, fbm, rng, spline, sdEllipse, sdSegment, save } = C;

const PROJECT = path.resolve(__dirname, '../..');
const OUT = path.join(PROJECT, 'assets/images/auth');
const PREVIEW = process.argv.includes('--preview') ? fs.mkdtempSync(path.join(os.tmpdir(), 'auth-bg-')) : null;
fs.mkdirSync(OUT, { recursive: true });

const HORIZON = 1215;
const OUTLINE = hex('#3a1f14');

function hash2(x, y) {
  let q = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  q = Math.imul(q ^ (q >>> 13), 1274126177);
  return ((q ^ (q >>> 16)) >>> 0) / 4294967296;
}

// iq: udaljenost do poligona (negativno unutra)
function sdPoly(px, py, pts) {
  let d = (px - pts[0][0]) ** 2 + (py - pts[0][1]) ** 2;
  let s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i++) {
    const ex = pts[j][0] - pts[i][0];
    const ey = pts[j][1] - pts[i][1];
    const wx = px - pts[i][0];
    const wy = py - pts[i][1];
    const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1));
    const bx = wx - ex * t;
    const by = wy - ey * t;
    d = Math.min(d, bx * bx + by * by);
    const c1 = py >= pts[i][1];
    const c2 = py < pts[j][1];
    const c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}

function drawPoly(pts, shade, outlineCol = OUTLINE, ol = 2.6) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  forBox(x0 - ol - 1, y0 - ol - 1, x1 + ol + 1, y1 + ol + 1, (i, x, y) => {
    const d = sdPoly(x, y, pts);
    if (d >= ol) return;
    if (d >= 0 && outlineCol) {
      paint(i, outlineCol);
      return;
    }
    if (d < 0) paint(i, typeof shade === 'function' ? shade(x, y, d) : shade);
  });
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

// ---------------------------------------------------------------- nebo i oblaci
function sky() {
  const top = hex('#2470c9');
  const mid = hex('#62acec');
  const low = hex('#cfe9fb');
  forAll((i, x, y) => {
    const t = clamp(y / HORIZON);
    let c;
    if (t < 0.55) {
      const k = t / 0.55;
      c = [mix(top[0], mid[0], k), mix(top[1], mid[1], k), mix(top[2], mid[2], k)];
    } else {
      const k = smooth(0.55, 1, t);
      c = [mix(mid[0], low[0], k), mix(mid[1], low[1], k), mix(mid[2], low[2], k)];
    }
    R[i] = c[0];
    G[i] = c[1];
    B[i] = c[2];
    // sunce gore desno
    const dx = x - 960;
    const dy = y - 30;
    light(i, hex('#fff6d8'), 0.55 * Math.exp(-(dx * dx + dy * dy) / (2 * 230 * 230)));
  });
}

function clouds() {
  const rnd = rng(31);
  const banks = [
    { x: 290, y: 205, s: 1.0 },
    { x: 760, y: 150, s: 0.8 },
    { x: 560, y: 560, s: 1.25 },
    { x: 180, y: 830, s: 0.9 },
    { x: 900, y: 760, s: 1.0 },
  ];
  const lit = hex('#ffffff');
  const shade = hex('#b4c9e2');
  for (const bank of banks) {
    const puffs = [];
    const n = 9;
    for (let k = 0; k < n; k++) {
      const u = (k / (n - 1)) * 2 - 1;
      const r = (58 + 52 * (1 - Math.abs(u)) + 22 * rnd()) * bank.s;
      puffs.push({ x: bank.x + u * 165 * bank.s + (rnd() - 0.5) * 30, y: bank.y - r * 0.45 + (rnd() - 0.5) * 16, r });
    }
    const base = bank.y + 18 * bank.s;
    forBox(bank.x - 330 * bank.s, bank.y - 200 * bank.s, bank.x + 330 * bank.s, base + 30, (i, x, y) => {
      let dens = 0;
      let top = 0;
      for (const p of puffs) {
        const d = Math.hypot(x - p.x, y - p.y);
        const v = smooth(p.r, p.r - 22, d + (fbm(x * 0.02, y * 0.02, 3) - 0.5) * 26);
        if (v > dens) {
          dens = v;
          top = (p.y - y) / p.r;
        }
      }
      dens *= smooth(base + 12, base - 14, y); // ravno dno
      if (dens <= 0) return;
      const k = smooth(-0.45, 0.65, top);
      paint(i, [mix(shade[0], lit[0], k), mix(shade[1], lit[1], k), mix(shade[2], lit[2], k)], dens * 0.96);
    });
  }
}

// ---------------------------------------------------------------- daleka brda, trava
function background() {
  const hills = hex('#5e9d7c');
  const trees = hex('#2f6b3d');
  forBox(0, 1000, W, H, (i, x, y) => {
    const hy = 1160 - 70 * fbm(x * 0.004 + 3, 0.2, 4);
    const ty = 1205 - 45 * fbm(x * 0.02 + 9, 1.7, 4);
    if (y > HORIZON) {
      // travnato tlo u perspektivi: mrlje i sitne vlati (gušće u daljini)
      const dy = Math.max(1, y - HORIZON);
      const wx = (x - 540) / dy;
      const wz = 1 / dy;
      const n = fbm(wx * 3, wz * 900, 3);
      const blades = C.vnoise(wx * 260, wz * 9000) - 0.5;
      const g = hex('#5cae48');
      const g2 = hex('#357f2f');
      const k = clamp(n * 0.7 + 0.25 * smooth(HORIZON, H, y) + blades * 0.35);
      paint(i, [mix(g[0], g2[0], k), mix(g[1], g2[1], k), mix(g[2], g2[2], k)]);
    } else if (y > ty) {
      paint(i, trees);
    } else if (y > hy) {
      // izmaglica na dalekim brdima
      const k = 0.5 * smooth(hy + 80, hy, y);
      paint(i, [mix(hills[0], 0.8, k), mix(hills[1], 0.88, k), mix(hills[2], 0.95, k)]);
    }
  });
}

// ---------------------------------------------------------------- dvorana turnira
const CX = 540;
const roofCurve = (x, eaveY, eaveHalf, lift) => {
  const u = clamp(Math.abs(x - CX) / eaveHalf);
  return eaveY - lift * Math.pow(u, 3.2);
};

function roofPoly(topY, topHalf, eaveY, eaveHalf, lift) {
  const pts = [];
  const tipY = eaveY - lift;
  // lijevi rub od vrha do špice (blago udubljen)
  for (let k = 0; k <= 14; k++) {
    const t = k / 14;
    pts.push([mix(CX - topHalf, CX - eaveHalf, t), mix(topY, tipY, t) + 22 * Math.sin(Math.PI * t)]);
  }
  // donji rub (strehe se na krajevima dižu)
  for (let k = 1; k < 80; k++) {
    const x = CX - eaveHalf + (2 * eaveHalf * k) / 80;
    pts.push([x, roofCurve(x, eaveY, eaveHalf, lift)]);
  }
  for (let k = 0; k <= 14; k++) {
    const t = 1 - k / 14;
    pts.push([mix(CX + topHalf, CX + eaveHalf, t), mix(topY, tipY, t) + 22 * Math.sin(Math.PI * t)]);
  }
  return pts;
}

function roofShade(eaveY, eaveHalf, lift) {
  const red = hex('#b0372b');
  const dark = hex('#74201a');
  const lite = hex('#d65544');
  const gold = hex('#e7bd45');
  return (x, y) => {
    const ey = roofCurve(x, eaveY, eaveHalf, lift);
    const up = ey - y; // koliko iznad strehe
    if (up < 9) return up < 3 ? [0.32, 0.12, 0.08] : gold; // zlatni rub strehe
    // valoviti crijepovi: stupci i redovi
    const col = Math.cos(((x - CX) / 17) * Math.PI * 2);
    const row = (up / 15) % 1;
    let k = 0.55 + 0.3 * col;
    if (row < 0.12) k -= 0.35;
    const shadeTop = smooth(0, 160, up) * 0.15;
    const c = k > 0.55 ? [mix(red[0], lite[0], (k - 0.55) / 0.3), mix(red[1], lite[1], (k - 0.55) / 0.3), mix(red[2], lite[2], (k - 0.55) / 0.3)]
      : [mix(dark[0], red[0], k / 0.55), mix(dark[1], red[1], k / 0.55), mix(dark[2], red[2], k / 0.55)];
    return [c[0] * (1 - shadeTop), c[1] * (1 - shadeTop), c[2] * (1 - shadeTop)];
  };
}

function wall(x0, y0, x1, y1, pillars) {
  const cream = hex('#f4ead3');
  const beam = hex('#7a3b22');
  const pillar = hex('#b8362a');
  const pillarLite = hex('#da5444');
  drawPoly(rect(x0, y0, x1, y1), (x, y) => {
    const sh = 0.55 + 0.45 * smooth(y0, y0 + 46, y); // sjena ispod strehe
    for (const px of pillars) {
      if (Math.abs(x - px) < 14) {
        const k = 1 - Math.abs(x - px + 4) / 14;
        return [mix(pillar[0], pillarLite[0], k) * sh, mix(pillar[1], pillarLite[1], k) * sh, mix(pillar[2], pillarLite[2], k) * sh];
      }
    }
    if (y - y0 < 16) return [beam[0] * sh, beam[1] * sh, beam[2] * sh];
    return [cream[0] * sh, cream[1] * sh, cream[2] * sh];
  });
}

function hall() {
  // kamena baza sa stepenicama
  const stone = hex('#d8d3c6');
  drawPoly(rect(190, 1150, 890, 1300), (x, y) => {
    const step = ((y - 1150) / 25) % 1;
    const k = step < 0.18 ? 0.78 : 1;
    return [stone[0] * k, stone[1] * k, stone[2] * k];
  });
  // glavni zid
  wall(240, 680, 840, 1150, [262, 372, 468, 612, 708, 818]);
  // vrata i prozori
  const dark = hex('#3b2420');
  drawPoly(rect(492, 900, 588, 1150), (x, y) => (Math.abs(x - 540) < 2 ? [0.12, 0.06, 0.05] : dark));
  // prozori s rešetkom
  for (const wx of [300, 410, 650, 760]) {
    drawPoly(rect(wx - 22, 800, wx + 22, 880), (x, y) =>
      Math.abs(x - wx) < 1.6 || Math.abs(y - 840) < 1.6 || Math.abs(y - 820) < 1.2 || Math.abs(y - 860) < 1.2 ? [0.55, 0.3, 0.18] : dark
    );
  }
  // greda preko zida
  drawPoly(rect(240, 950, 840, 966), hex('#7a3b22'));
  // donji krov
  drawPoly(roofPoly(560, 210, 712, 430, 62), roofShade(712, 430, 62));
  // gornji zid s pločom
  wall(330, 445, 750, 575, [350, 440, 640, 730]);
  const plaque = hex('#e9c04e');
  drawPoly(rect(474, 470, 606, 545), (x, y) => {
    const inner = Math.abs(x - 540) < 56 && Math.abs(y - 507) < 28;
    return inner ? [0.27, 0.11, 0.08] : plaque;
  });
  // amblem na ploči: zlatna kugla s crvenom zvijezdom
  forBox(510, 478, 570, 536, (i, x, y) => {
    const d = Math.hypot(x - 540, y - 507);
    if (d > 24) return;
    if (d > 21.5) {
      paint(i, OUTLINE);
      return;
    }
    const st = C.sdStar5(x - 540, y - 507, 11, 0.45);
    if (st < 0) {
      paint(i, hex('#c9221a'));
      return;
    }
    const k = Math.exp(-((x - 533) ** 2 + (y - 499) ** 2) / 120);
    paint(i, [mix(0.93, 1, k), mix(0.72, 0.95, k), mix(0.2, 0.7, k)]);
  });
  // gornji krov
  drawPoly(roofPoly(300, 140, 462, 300, 58), roofShade(462, 300, 58));
  // sljeme sa zlatnim ukrasima na krajevima i biserom u sredini
  const gold = hex('#e7bd45');
  const goldDark = hex('#a8791d');
  drawPoly(rect(392, 286, 688, 306), (x, y) => (y < 293 ? gold : goldDark));
  const tail = (side) => {
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      pts.push([CX + side * (148 + 30 * Math.sin(t * Math.PI * 0.9)), 306 - 70 * t]);
    }
    for (let k = 20; k >= 0; k--) {
      const t = k / 20;
      pts.push([CX + side * (128 + 26 * Math.sin(t * Math.PI * 0.9) - 10 * t), 300 - 52 * t]);
    }
    return pts;
  };
  drawPoly(tail(-1), gold);
  drawPoly(tail(1), gold);
  forBox(CX - 26, 240, CX + 26, 292, (i, x, y) => {
    const d = Math.hypot(x - CX, y - 266);
    if (d < 21) {
      const k = Math.exp(-((x - CX + 6) ** 2 + (y - 259) ** 2) / 90);
      paint(i, [mix(gold[0], 1, k), mix(gold[1], 1, k), mix(gold[2], 0.9, k)]);
    } else if (d < 23.5) paint(i, OUTLINE);
  });
}

// ---------------------------------------------------------------- publika
function crowd() {
  const rnd = rng(5);
  const shirts = ['#e74c3c', '#3498db', '#f1c40f', '#ecf0f1', '#9b59b6', '#2ecc71', '#34495e', '#1abc9c', '#e84393'].map(hex);
  const skins = ['#f1c27d', '#e0ac69', '#c68642', '#ffdbac', '#8d5524'].map(hex);
  for (let row = 0; row < 7; row++) {
    const y = 1296 + row * 12;
    const rHead = 4.2 + row * 0.35;
    for (let x = 150 + (row % 2) * 5; x < 930; x += 9.5 + rnd() * 2) {
      const cx = x + (rnd() - 0.5) * 3;
      const cy = y + (rnd() - 0.5) * 3;
      const shirt = shirts[Math.floor(rnd() * shirts.length)];
      const skin = skins[Math.floor(rnd() * skins.length)];
      const hair = rnd() < 0.7 ? [0.1, 0.07, 0.05] : [0.55, 0.38, 0.2];
      forBox(cx - 8, cy - 8, cx + 8, cy + 14, (i, px, py) => {
        if (Math.abs(px - cx) < rHead * 1.3 && py > cy + rHead * 0.6 && py < cy + rHead * 3) paint(i, shirt);
        const d = Math.hypot(px - cx, py - cy);
        if (d < rHead) paint(i, py < cy - rHead * 0.25 ? hair : skin);
      });
    }
  }
}

// ---------------------------------------------------------------- ring s pločama
const RING = { far: 1382, front: 2088, face: 2236, f: 1000, hc: 2.9, half: 6 };

function ring() {
  const { far, front, face, f, hc, half } = RING;
  const tileA = hex('#e4ddcc');
  const tileB = hex('#cbc2ae');
  const grout = hex('#7b7466');
  const faceCol = hex('#a8a294');
  const zFront = (f * hc) / (front - HORIZON);
  // pukotina u ploči (ako je ima): izlomljena linija u koordinatama ploče
  const crackOf = (tx, tz) => {
    if (hash2(tx + 7, tz + 3) > 0.32) return null;
    const pts = [[hash2(tx, tz + 11), 0]];
    for (let k = 1; k <= 4; k++) pts.push([clamp(pts[k - 1][0] + (hash2(tx + k, tz - k) - 0.5) * 0.5, 0.05, 0.95), k * 0.2 + hash2(tx - k, tz + k) * 0.1]);
    return pts;
  };
  forBox(0, far - 2, W, face, (i, x, y) => {
    if (y < front) {
      const Z = (f * hc) / (y - HORIZON);
      const X = ((x - 540) * Z) / f;
      if (Math.abs(X) > half) return;
      const gx = X + 100;
      const gz = Z;
      const tx = Math.floor(gx);
      const tz = Math.floor(gz);
      const fx = gx - tx;
      const fz = gz - tz;
      const lw = 0.014 + 0.0022 * Z;
      if (Math.min(fx, 1 - fx) < lw || Math.min(fz, 1 - fz) < lw * 1.2) {
        paint(i, grout);
        return;
      }
      const v = hash2(tx, tz);
      const stain = fbm(gx * 1.7, gz * 1.7, 3) - 0.5;
      const speck = C.vnoise(gx * 30, gz * 30) - 0.5;
      const k = v * 0.55 + stain * 0.55;
      let lit = 0.94 + speck * 0.06;
      // rubovi ploča: strana prema suncu (desno, straga) svjetlija, suprotna tamnija
      const bw = 0.04;
      lit -= 0.1 * smooth(lw + bw, lw, fz) + 0.07 * smooth(lw + bw, lw, fx);
      lit += 0.07 * smooth(lw + bw, lw, 1 - fz) + 0.05 * smooth(lw + bw, lw, 1 - fx);
      // pukotine
      const crack = crackOf(tx, tz);
      if (crack) {
        let dc = 1e9;
        for (let c = 0; c < crack.length - 1; c++) dc = Math.min(dc, sdSegment(fx, fz, crack[c][0], crack[c][1], crack[c + 1][0], crack[c + 1][1]));
        if (dc < 0.006 + 0.0008 * Z) lit *= 0.62;
      }
      // svjetlije prema naprijed, rub ringa malo tamniji
      lit *= 0.92 + 0.1 * smooth(far, front, y) - 0.1 * smooth(half - 0.25, half, Math.abs(X));
      paint(i, [mix(tileA[0], tileB[0], k) * lit, mix(tileA[1], tileB[1], k) * lit, mix(tileA[2], tileB[2], k) * lit]);
      if (front - y < 5) paint(i, [0.97, 0.95, 0.9]); // svijetli prednji rub
    } else {
      // prednja stranica ringa: kameni blokovi u sjeni
      const X = ((x - 540) * zFront) / f;
      const row = Math.floor((y - front) / 50);
      const off = row % 2 ? 0.5 : 0;
      const bx = (X + off + 100) % 1;
      const by = ((y - front) / 50) % 1;
      const line = bx < 0.025 || bx > 0.975 || by < 0.06;
      const k = 0.78 + 0.12 * hash2(Math.floor(X + off + 100), row) - 0.2 * smooth(front, face, y);
      const c = line ? [0.42, 0.4, 0.36] : [faceCol[0] * k, faceCol[1] * k, faceCol[2] * k];
      paint(i, c);
    }
  });
  // sjena ringa na travi
  forBox(0, face, W, face + 40, (i, x, y) => paint(i, [0.1, 0.25, 0.08], 0.45 * smooth(face + 40, face, y)));
}

// ---------------------------------------------------------------- palme
function palm(points, crown, flip) {
  const trunk = spline(points, 4);
  const total = trunk[trunk.length - 1].L;
  const bark = hex('#9a7449');
  const barkDark = hex('#6b4d2d');
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of trunk) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  forBox(x0 - 40, y0 - 40, x1 + 40, y1 + 10, (i, x, y) => {
    let best = 1e9;
    let bl = 0;
    let side = 0;
    for (let k = 0; k < trunk.length - 1; k++) {
      const a = trunk[k];
      const b = trunk[k + 1];
      if (Math.abs(y - a.y) > 50) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const u = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1));
      const cx = x - a.x - dx * u;
      const cy = y - a.y - dy * u;
      const d = Math.hypot(cx, cy);
      if (d < best) {
        best = d;
        bl = a.L + u * (b.L - a.L);
        side = (dx * cy - dy * cx) / (Math.hypot(dx, dy) || 1);
      }
    }
    const r = mix(30, 19, bl / total);
    if (best > r + 2.5) return;
    if (best > r) {
      paint(i, OUTLINE);
      return;
    }
    const s = side / r;
    const ring = (bl / 20) % 1 < 0.18 ? 0.72 : 1;
    const lam = 0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - s * s)) - 0.25 * s * (flip ? -1 : 1);
    paint(i, [mix(barkDark[0], bark[0], lam) * ring, mix(barkDark[1], bark[1], lam) * ring, mix(barkDark[2], bark[2], lam) * ring]);
  });

  // listovi: zakrivljeni, nazubljeni, od krune prema van
  const leaf = hex('#3ea64b');
  const leafDark = hex('#1f6e2c');
  const rib = hex('#a5d36a');
  const fronds = [-168, -140, -112, -80, -48, -20, 8, 34, 150, 178].map((a) => a * (Math.PI / 180));
  for (let fi = 0; fi < fronds.length; fi++) {
    const ang = flip ? Math.PI - fronds[fi] : fronds[fi];
    // listovi prema sredini (prema hramu) su kraći
    const inward = Math.max(0, Math.cos(fronds[fi]));
    const len = (230 + 60 * Math.sin(fi * 1.7) ** 2) * (1 - 0.32 * inward);
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const droop = 0.55 + 0.25 * Math.cos(fi * 2.3);
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      pts.push([crown[0] + dx * len * t, crown[1] + dy * len * t + droop * len * t * t * 0.8]);
    }
    const mid = spline(pts, 4);
    const mtot = mid[mid.length - 1].L;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const p of mid) {
      bx0 = Math.min(bx0, p.x);
      by0 = Math.min(by0, p.y);
      bx1 = Math.max(bx1, p.x);
      by1 = Math.max(by1, p.y);
    }
    forBox(bx0 - 50, by0 - 50, bx1 + 50, by1 + 50, (i, x, y) => {
      let best = 1e9;
      let bl = 0;
      let side = 0;
      for (let k = 0; k < mid.length - 1; k++) {
        const a = mid[k];
        if (Math.abs(x - a.x) > 60 || Math.abs(y - a.y) > 60) continue;
        const b = mid[k + 1];
        const ddx = b.x - a.x;
        const ddy = b.y - a.y;
        const u = clamp(((x - a.x) * ddx + (y - a.y) * ddy) / (ddx * ddx + ddy * ddy || 1));
        const cx = x - a.x - ddx * u;
        const cy = y - a.y - ddy * u;
        const d = Math.hypot(cx, cy);
        if (d < best) {
          best = d;
          bl = a.L + u * (b.L - a.L);
          side = ddx * cy - ddy * cx;
        }
      }
      const t = bl / mtot;
      if (t >= 0.995) return;
      // listići: nazubljeni rub
      const saw = 0.55 + 0.45 * Math.abs(Math.sin(t * 34));
      const wdt = 40 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.02)), 0.7) * saw;
      if (best > wdt + 2.2) return;
      if (best > wdt) {
        paint(i, hex('#123d18'));
        return;
      }
      if (best < 2.4) {
        paint(i, rib);
        return;
      }
      const under = side > 0 ? 1 : 0;
      const k = 0.35 + 0.5 * (best / wdt) + 0.15 * under;
      paint(i, [mix(leaf[0], leafDark[0], k), mix(leaf[1], leafDark[1], k), mix(leaf[2], leafDark[2], k)]);
    });
  }
  // kokosi
  const coco = hex('#6b4423');
  for (const [ox, oy] of [[-14, 14], [10, 18], [-2, 30]]) {
    const cx = crown[0] + (flip ? -ox : ox);
    const cy = crown[1] + oy;
    forBox(cx - 18, cy - 18, cx + 18, cy + 18, (i, x, y) => {
      const d = Math.hypot(x - cx, y - cy);
      if (d < 13) {
        const k = Math.exp(-((x - cx + 4) ** 2 + (y - cy + 5) ** 2) / 30);
        paint(i, [mix(coco[0], 0.75, k * 0.5), mix(coco[1], 0.6, k * 0.5), mix(coco[2], 0.4, k * 0.5)]);
      } else if (d < 15.5) paint(i, OUTLINE);
    });
  }
}

async function main() {
  const t0 = Date.now();
  sky();
  clouds();
  background();
  hall();
  crowd();
  ring();
  palm([[50, 1450], [80, 1120], [92, 790], [116, 470], [146, 290]], [146, 285], false);
  palm([[1036, 1470], [1008, 1120], [990, 790], [968, 470], [932, 262]], [932, 257], true);
  console.log('render', (Date.now() - t0) / 1000, 's');
  await save(OUT, 'signup_arena', {
    preview: PREVIEW,
    crops: [
      ['top', 0, 0, 1080, 760],
      ['bottom', 0, 1500, 1080, 840],
    ],
  });
  console.log('gotovo', (Date.now() - t0) / 1000, 's');
  if (PREVIEW) console.log('pregled:', PREVIEW);
}

main();
