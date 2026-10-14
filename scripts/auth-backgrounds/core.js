'use strict';
// Zajednički dio generatora pozadina za ekran prijave i registracije:
// platno sa supersamplingom (2x), šum, spline, SDF oblici i spremanje u JPG.
const path = require('path');
const Jimp = require('jimp-compact');

const W = 1080;
const H = 2340;
const SS = 2;
const w = W * SS;
const h = H * SS;
const N = w * h;
const R = new Float32Array(N);
const G = new Float32Array(N);
const B = new Float32Array(N);

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const hex = (s) => [
  parseInt(s.slice(1, 3), 16) / 255,
  parseInt(s.slice(3, 5), 16) / 255,
  parseInt(s.slice(5, 7), 16) / 255,
];

// Prolaz kroz subpiksele čiji je centar u pravokutniku (koordinate konačne slike)
function forBox(x0, y0, x1, y1, fn) {
  const sx0 = Math.max(0, Math.floor(x0 * SS));
  const sx1 = Math.min(w - 1, Math.ceil(x1 * SS));
  const sy0 = Math.max(0, Math.floor(y0 * SS));
  const sy1 = Math.min(h - 1, Math.ceil(y1 * SS));
  for (let sy = sy0; sy <= sy1; sy++) {
    const y = (sy + 0.5) / SS;
    let i = sy * w + sx0;
    for (let sx = sx0; sx <= sx1; sx++, i++) fn(i, (sx + 0.5) / SS, y);
  }
}
const forAll = (fn) => forBox(0, 0, W, H, fn);

function paint(i, c, a = 1) {
  if (a <= 0) return;
  if (a >= 1) {
    R[i] = c[0];
    G[i] = c[1];
    B[i] = c[2];
    return;
  }
  R[i] += (c[0] - R[i]) * a;
  G[i] += (c[1] - G[i]) * a;
  B[i] += (c[2] - B[i]) * a;
}
function light(i, c, k) {
  if (k <= 0) return;
  R[i] += c[0] * k;
  G[i] += c[1] * k;
  B[i] += c[2] * k;
}

// Šum
function hash2(x, y) {
  let q = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  q = Math.imul(q ^ (q >>> 13), 1274126177);
  return ((q ^ (q >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, oct = 5) {
  let s = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    s += amp * vnoise(x, y);
    norm += amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
    amp *= 0.5;
  }
  return s / norm;
}

// Polje izračunato na gruboj mreži (korak u pikselima), čita se bilinearno
function field(step, fn) {
  const gw = Math.ceil(W / step) + 2;
  const gh = Math.ceil(H / step) + 2;
  const data = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) data[gy * gw + gx] = fn(gx * step, gy * step);
  return (x, y) => {
    const fx = x / step;
    const fy = y / step;
    const ix = Math.min(gw - 2, Math.max(0, Math.floor(fx)));
    const iy = Math.min(gh - 2, Math.max(0, Math.floor(fy)));
    const tx = fx - ix;
    const ty = fy - iy;
    const o = iy * gw + ix;
    const a = data[o];
    const b = data[o + 1];
    const c = data[o + gw];
    const d = data[o + gw + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Catmull-Rom kroz točke, pa jednoliko po duljini (svaki element: {x, y, L})
function spline(points, step = 8) {
  const dense = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < 60; k++) {
      const t = k / 60;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(points[points.length - 1]);
  const out = [{ x: dense[0][0], y: dense[0][1], L: 0 }];
  let acc = 0;
  let next = step;
  for (let i = 1; i < dense.length; i++) {
    const [ax, ay] = dense[i - 1];
    const [bx, by] = dense[i];
    const seg = Math.hypot(bx - ax, by - ay);
    while (acc + seg >= next) {
      const t = (next - acc) / seg;
      out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, L: next });
      next += step;
    }
    acc += seg;
  }
  const last = dense[dense.length - 1];
  out.push({ x: last[0], y: last[1], L: acc });
  return out;
}

// SDF pomoćnici (iq)
function sdEllipse(px, py, rx, ry) {
  const k0 = Math.hypot(px / rx, py / ry);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry));
  return k0 < 1e-6 ? -Math.min(rx, ry) : (k0 * (k0 - 1)) / k1;
}
function sdSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
function smin(a, b, k) {
  const q = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - q * q * k * 0.25;
}
// Zvijezda s 5 krakova (r = vanjski polumjer), vrh prema gore na ekranu
function sdStar5(px, py, r, rf = 0.45) {
  const k1x = 0.809016994375;
  const k1y = -0.587785252292;
  const k2x = -k1x;
  const k2y = k1y;
  py = -py;
  px = Math.abs(px);
  let d = 2 * Math.max(k1x * px + k1y * py, 0);
  px -= d * k1x;
  py -= d * k1y;
  d = 2 * Math.max(k2x * px + k2y * py, 0);
  px -= d * k2x;
  py -= d * k2y;
  px = Math.abs(px);
  py -= r;
  const bax = rf * -k1y;
  const bay = rf * k1x - 1;
  const q = clamp((px * bax + py * bay) / (bax * bax + bay * bay), 0, r);
  return Math.hypot(px - bax * q, py - bay * q) * Math.sign(py * bax - px * bay);
}

async function save(dir, name, opts = {}) {
  const { quality = 86, preview } = opts;
  const data = Buffer.alloc(W * H * 4);
  const rnd = rng(99);
  const k = 1 / (SS * SS);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        let i = (y * SS + sy) * w + x * SS;
        for (let sx = 0; sx < SS; sx++, i++) {
          r += R[i];
          g += G[i];
          b += B[i];
        }
      }
      const d = (rnd() - 0.5) / 255;
      const o = (y * W + x) * 4;
      data[o] = Math.round(clamp(r * k + d) * 255);
      data[o + 1] = Math.round(clamp(g * k + d) * 255);
      data[o + 2] = Math.round(clamp(b * k + d) * 255);
      data[o + 3] = 255;
    }
  }
  const img = await new Promise((res, rej) =>
    new Jimp({ data, width: W, height: H }, (e, im) => (e ? rej(e) : res(im)))
  );
  if (dir) await img.clone().quality(quality).writeAsync(path.join(dir, `${name}.jpg`));
  if (preview) {
    await img.clone().resize(400, Jimp.AUTO).writeAsync(path.join(preview, `${name}_preview.png`));
    for (const [label, x, y, cw, ch] of opts.crops || []) {
      await img.clone().crop(x, y, cw, ch).writeAsync(path.join(preview, `${name}_${label}.png`));
    }
  }
}

module.exports = {
  W, H, SS, w, h, R, G, B,
  clamp, mix, smooth, hex, forBox, forAll, paint, light,
  vnoise, fbm, field, rng, spline, sdEllipse, sdSegment, smin, sdStar5, save,
};
