'use strict';
// Pozadina ekrana za prijavu: Shenron sa slike iz Nano Banane (shenron_source.png),
// malo udaljen da se vidi više neba, a šuma na dnu zamijenjena planinama i zlatnim tlom.
// Pokretanje iz korijena projekta: node scripts/auth-backgrounds/login.js
// Sprema assets/images/auth/login_shenron.jpg (1080 x 2340).
// --preview dodatno sprema umanjeni pregled i isječke u privremenu mapu.
const path = require('path');
const fs = require('fs');
const os = require('os');
const Jimp = require('jimp-compact');
const C = require('./core');
const { W, H, SS, w, h, R, G, B, clamp, mix, smooth, hex, forBox, forAll, paint, light, fbm, field, rng, save } = C;

const PROJECT = path.resolve(__dirname, '../..');
const OUT = path.join(PROJECT, 'assets/images/auth');
// izvorna slika (originalna rezolucija iz Nano Banane), .jpg ili .png
const SOURCE = ['shenron_source.jpg', 'shenron_source.png']
  .map((name) => path.join(__dirname, name))
  .find((file) => fs.existsSync(file));
const PREVIEW = process.argv.includes('--preview') ? fs.mkdtempSync(path.join(os.tmpdir(), 'auth-bg-')) : null;

// Svi redovi izvorne slike ispod (FOREST, granice vrtloga) su u jedinicama slike širine 474 px;
// veća (originalna) slika radi isto, samo je oštrija.
const REF_W = 474;
const REF_H = 1024;
const K = 2.15; // širina slike u konačnim pikselima = REF_W * K (malo manje od 1080 = "udaljeno")
const TOP = 20; // nebo iznad slike (glava mora ostati iznad kartice za prijavu)
const FOREST = 588; // izvorni red gdje počinje šuma
const GLOW = { x: 505, y: 2165 }; // zlatno svjetlo na tlu ispod vrtloga
const GOLD = hex('#f2bf45');

// ---------------------------------------------------------------- izvorna slika
async function loadSource() {
  const im = await Jimp.read(SOURCE);
  const { width, height, data } = im.bitmap;
  const rgb = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    rgb[i * 3] = data[i * 4] / 255;
    rgb[i * 3 + 1] = data[i * 4 + 1] / 255;
    rgb[i * 3 + 2] = data[i * 4 + 2] / 255;
  }
  return { w: width, h: height, rgb };
}

// Boja neba po redovima, s lijevog i desnog ruba slike (samo tamni plavkasti pikseli)
function skyRows(src) {
  const rows = new Array(src.h).fill(null);
  for (let y = 0; y < src.h; y++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let k = 0; k < 20; k++) {
      const x = k < 10 ? k : src.w - 20 + k;
      const o = (y * src.w + x) * 3;
      const lum = 0.2126 * src.rgb[o] + 0.7152 * src.rgb[o + 1] + 0.0722 * src.rgb[o + 2];
      if (lum < 0.2 && src.rgb[o + 2] >= src.rgb[o + 1] * 0.9) {
        r += src.rgb[o];
        g += src.rgb[o + 1];
        b += src.rgb[o + 2];
        n++;
      }
    }
    if (n) rows[y] = [r / n, g / n, b / n];
  }
  // praznine (gdje je zmaj na rubu) popuni susjednim redovima, pa izgladi
  let last = rows.find(Boolean) || [0, 0.03, 0.08];
  for (let y = 0; y < src.h; y++) {
    if (rows[y]) last = rows[y];
    else rows[y] = last;
  }
  const smoothRows = rows.map((_, y) => {
    const acc = [0, 0, 0];
    let n = 0;
    const top = Math.round(FOREST * (src.h / REF_H));
    const span = Math.round(30 * (src.h / REF_H));
    for (let k = Math.max(0, y - span); k <= Math.min(top, y + span); k++) {
      acc[0] += rows[k][0];
      acc[1] += rows[k][1];
      acc[2] += rows[k][2];
      n++;
    }
    return [acc[0] / n, acc[1] / n, acc[2] / n];
  });
  const scale = src.h / REF_H;
  return (ys) => smoothRows[Math.round(clamp(ys, 0, FOREST) * scale)];
}

// Lanczos-3 povećanje (odvojeno po osima)
function resize(src, dw, dh) {
  const A = 3;
  const sinc = (x) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));
  const kernel = (x) => (Math.abs(x) < A ? sinc(x) * sinc(x / A) : 0);
  const taps = (sn, dn) => {
    const scale = sn / dn;
    const stretch = Math.max(1, scale); // kod smanjivanja filtar je širi (bez aliasinga)
    const out = [];
    for (let d = 0; d < dn; d++) {
      const center = (d + 0.5) * scale - 0.5;
      const idx = [];
      const wts = [];
      let sum = 0;
      for (let s = Math.floor(center - A * stretch) + 1; s <= Math.floor(center + A * stretch); s++) {
        const wt = kernel((s - center) / stretch);
        if (!wt) continue;
        idx.push(Math.min(sn - 1, Math.max(0, s)));
        wts.push(wt);
        sum += wt;
      }
      out.push({ idx, wts: wts.map((v) => v / sum) });
    }
    return out;
  };
  const tx = taps(src.w, dw);
  const ty = taps(src.h, dh);
  const tmp = new Float32Array(dw * src.h * 3);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < dw; x++) {
      const { idx, wts } = tx[x];
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = 0; k < idx.length; k++) {
        const o = (y * src.w + idx[k]) * 3;
        r += src.rgb[o] * wts[k];
        g += src.rgb[o + 1] * wts[k];
        b += src.rgb[o + 2] * wts[k];
      }
      const o = (y * dw + x) * 3;
      tmp[o] = r;
      tmp[o + 1] = g;
      tmp[o + 2] = b;
    }
  }
  const rgb = new Float32Array(dw * dh * 3);
  for (let y = 0; y < dh; y++) {
    const { idx, wts } = ty[y];
    for (let x = 0; x < dw; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let k = 0; k < idx.length; k++) {
        const o = (idx[k] * dw + x) * 3;
        r += tmp[o] * wts[k];
        g += tmp[o + 1] * wts[k];
        b += tmp[o + 2] * wts[k];
      }
      const o = (y * dw + x) * 3;
      rgb[o] = clamp(r);
      rgb[o + 1] = clamp(g);
      rgb[o + 2] = clamp(b);
    }
  }
  return { w: dw, h: dh, rgb };
}

// Blago izoštravanje nakon povećanja (unsharp mask)
function sharpen(img, sigma = 1.6, amount = 0.55) {
  const rad = Math.ceil(sigma * 3);
  const kern = [];
  let sum = 0;
  for (let k = -rad; k <= rad; k++) {
    const v = Math.exp(-(k * k) / (2 * sigma * sigma));
    kern.push(v);
    sum += v;
  }
  for (let k = 0; k < kern.length; k++) kern[k] /= sum;
  const { w: iw, h: ih, rgb } = img;
  const tmp = new Float32Array(rgb.length);
  const blur = new Float32Array(rgb.length);
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let k = -rad; k <= rad; k++) v += rgb[(y * iw + Math.min(iw - 1, Math.max(0, x + k))) * 3 + c] * kern[k + rad];
        tmp[(y * iw + x) * 3 + c] = v;
      }
    }
  }
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let k = -rad; k <= rad; k++) v += tmp[(Math.min(ih - 1, Math.max(0, y + k)) * iw + x) * 3 + c] * kern[k + rad];
        blur[(y * iw + x) * 3 + c] = v;
      }
    }
  }
  for (let i = 0; i < rgb.length; i++) rgb[i] = clamp(rgb[i] + (rgb[i] - blur[i]) * amount);
  return img;
}

// ---------------------------------------------------------------- nebo i tlo
function sky(rowColor) {
  const clouds = field(6, (x, y) => fbm(x * 0.0024 + 7.1, y * 0.0045 + 2.3, 6));
  forAll((i, x, y) => {
    const c = rowColor((y - TOP) / K);
    const m = smooth(0.53, 0.76, clouds(x, y)) * 0.6;
    R[i] = mix(c[0], c[0] * 1.5 + 0.02, m);
    G[i] = mix(c[1], c[1] * 1.4 + 0.035, m);
    B[i] = mix(c[2], c[2] * 1.3 + 0.05, m);
  });
}

function stars() {
  const rnd = rng(11);
  const white = hex('#e4f2ff');
  for (let k = 0; k < 520; k++) {
    const x = rnd() * W;
    const y = 1800 * Math.pow(rnd(), 1.2);
    const bright = 0.25 + 0.75 * Math.pow(rnd(), 3);
    const s = 0.55 + 1.3 * Math.pow(rnd(), 5);
    const big = bright > 0.9;
    const rad = big ? 22 : s * 4;
    forBox(x - rad, y - rad, x + rad, y + rad, (i, px, py) => {
      const dx = px - x;
      const dy = py - y;
      let v = Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
      if (big) v += 0.45 * (Math.exp(-Math.abs(dx) / 0.9 - Math.abs(dy) / 8) + Math.exp(-Math.abs(dy) / 0.9 - Math.abs(dx) / 8));
      light(i, white, v * bright);
    });
  }
}

function landscape() {
  const far = hex('#0a1f27');
  const near = hex('#06130f');
  const ridgeFar = new Float32Array(W + 2);
  const ridgeNear = new Float32Array(W + 2);
  for (let x = 0; x <= W + 1; x++) {
    ridgeFar[x] = 1975 - 140 * fbm(x * 0.0042 + 11, 0.5, 5) - 40 * Math.sin(x * 0.0058 + 1);
    ridgeNear[x] = 2075 - 80 * fbm(x * 0.0065 + 41, 2.5, 5);
  }
  const ridge = (arr, x) => {
    const i = Math.floor(x);
    return mix(arr[i], arr[i + 1], x - i);
  };
  forBox(0, 1700, W, H, (i, x, y) => {
    const yf = ridge(ridgeFar, x);
    const yn = ridge(ridgeNear, x);
    const ex = x - GLOW.x;
    const ey = (y - GLOW.y) * 2.6;
    const lit = Math.exp(-(ex * ex + ey * ey) / (2 * 170 * 170));
    if (y > yn) {
      paint(i, near);
      // zrnato tlo, tamnije prema dnu, svijetlo samo oko mjesta odakle izlazi zmaj
      const grain = fbm(x * 0.05, y * 0.11, 3) - 0.5;
      light(i, hex('#1d3a2c'), 0.25 * grain + 0.025);
      light(i, GOLD, 0.55 * lit * (1 + 0.6 * grain));
      paint(i, [0, 0, 0], 0.45 * smooth(2100, H, y) * (1 - lit));
    } else if (y > yf) {
      paint(i, far);
      light(i, hex('#1b4a4c'), 0.25 * smooth(yf, yn + 30, y)); // magla pri dnu brda
      light(i, GOLD, 0.22 * lit);
    }
  });
}

// Snop zlatnog svjetla od dna vrtloga do tla: širok uz vrtlog, uzak pri tlu (lijevak),
// uz meki sjaj koji spaja vrtlog i snop. Crta se preko slike (svjetlo se zbraja).
function beam() {
  const c = hex('#ffe7a0');
  const yTop = TOP + 790 * K; // unutar donjeg dijela vrtloga
  forBox(60, yTop - 260, 960, GLOW.y + 90, (i, x, y) => {
    const t = smooth(yTop, GLOW.y, y);
    const wb = mix(125, 40, t);
    const dx = (x - GLOW.x) / wb;
    const fade = smooth(yTop - 240, yTop + 80, y) * (1 - smooth(GLOW.y - 20, GLOW.y + 70, y));
    light(i, c, (0.36 * Math.exp(-dx * dx) + 0.34 * Math.exp(-dx * dx * 7)) * fade);
  });
  const hy = TOP + 835 * K;
  forBox(GLOW.x - 420, hy - 380, GLOW.x + 420, hy + 380, (i, x, y) => {
    const ex = (x - GLOW.x) / 1.25;
    const ey = y - hy;
    light(i, GOLD, 0.3 * Math.exp(-(ex * ex + ey * ey) / (2 * 135 * 135)));
  });
  forAll((i, x, y) => {
    const ex = x - GLOW.x;
    const ey = (y - GLOW.y) * 2.1;
    light(i, GOLD, 0.2 * Math.exp(-(ex * ex + ey * ey) / (2 * 240 * 240)));
  });
}

// ---------------------------------------------------------------- slaganje
const lumOf = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// Brzo zamućenje (tri prolaza pomičnog prosjeka po svakoj osi), za kanale u jednom nizu
function boxBlur(data, iw, ih, channels, radius, passes = 3) {
  const tmp = new Float32Array(data.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < ih; y++) {
      for (let c = 0; c < channels; c++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) acc += data[(y * iw + Math.min(iw - 1, Math.max(0, k))) * channels + c];
        for (let x = 0; x < iw; x++) {
          tmp[(y * iw + x) * channels + c] = acc / (2 * radius + 1);
          const add = Math.min(iw - 1, x + radius + 1);
          const sub = Math.max(0, x - radius);
          acc += data[(y * iw + add) * channels + c] - data[(y * iw + sub) * channels + c];
        }
      }
    }
    for (let x = 0; x < iw; x++) {
      for (let c = 0; c < channels; c++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) acc += tmp[(Math.min(ih - 1, Math.max(0, k)) * iw + x) * channels + c];
        for (let y = 0; y < ih; y++) {
          data[(y * iw + x) * channels + c] = acc / (2 * radius + 1);
          const add = Math.min(ih - 1, y + radius + 1);
          const sub = Math.max(0, y - radius);
          acc += tmp[(add * iw + x) * channels + c] - tmp[(sub * iw + x) * channels + c];
        }
      }
    }
  }
}

// Svaki piksel dobije boju najsvjetlijeg susjeda (u kvadratu radius): tamne rupe
// (borovi) unutar sjaja popune se okolnim sjajem
function dilateBright(data, iw, ih, radius) {
  const lum = new Float32Array(iw * ih);
  for (let i = 0; i < iw * ih; i++) lum[i] = lumOf(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const pass = (src, srcLum, horizontal) => {
    const out = new Float32Array(src.length);
    const outLum = new Float32Array(srcLum.length);
    const n = horizontal ? iw : ih;
    const lines = horizontal ? ih : iw;
    for (let l = 0; l < lines; l++) {
      for (let k = 0; k < n; k++) {
        let best = -1;
        let bi = 0;
        for (let d = Math.max(0, k - radius); d <= Math.min(n - 1, k + radius); d++) {
          const idx = horizontal ? l * iw + d : d * iw + l;
          if (srcLum[idx] > best) {
            best = srcLum[idx];
            bi = idx;
          }
        }
        const o = horizontal ? l * iw + k : k * iw + l;
        out[o * 3] = src[bi * 3];
        out[o * 3 + 1] = src[bi * 3 + 1];
        out[o * 3 + 2] = src[bi * 3 + 2];
        outLum[o] = best;
      }
    }
    return [out, outLum];
  };
  const [h1, l1] = pass(data, lum, true);
  return pass(h1, l1, false)[0];
}

function composite(img) {
  const oy = TOP * SS;
  const refRow = (py) => py / (K * SS * (img.w / (REF_W * K * SS)));
  const forestAt = (py) => smooth(FOREST - 10, FOREST + 24, refRow(py));

  // Vodoravno: sredina slike u pravom omjeru, a uz rubove se slika blago rastegne do
  // ruba ekrana, pa tijelo zmaja izlazi iz ekrana (nije odrezano usred neba)
  const ox = (w - img.w) / 2;
  const band = 70 * SS;
  const pw = (ox + band) / band;
  const colX = new Float32Array(w);
  const edge = new Float32Array(w);
  for (let sx = 0; sx < w; sx++) {
    const c = sx + 0.5;
    let bx;
    if (c < ox + band) bx = band * Math.pow(c / (ox + band), pw);
    else if (c > w - ox - band) bx = img.w - band * Math.pow((w - c) / (ox + band), pw);
    else bx = c - ox;
    colX[sx] = clamp(bx - 0.5, 0, img.w - 1);
    edge[sx] = smooth(0, ox + band, Math.min(c, w - c));
  }

  // Što od šume ostaje: samo svijetlo (vrtlog, munje, rep, kugle). Pri dnu vrtloga
  // strože, a maska je zamućena da rubovi ne budu nazubljeni.
  const keep = new Float32Array(img.w * img.h).fill(1);
  for (let py = 0; py < img.h; py++) {
    const forest = forestAt(py);
    if (forest <= 0) continue;
    const ys = refRow(py);
    const strict = smooth(760, 830, ys);
    for (let px = 0; px < img.w; px++) {
      const o = (py * img.w + px) * 3;
      const r = img.rgb[o];
      const g = img.rgb[o + 1];
      const b = img.rgb[o + 2];
      const green = g > r - 0.02 && g > b;
      const k = smooth(mix(green ? 0.28 : 0.2, 0.48, strict), mix(green ? 0.44 : 0.36, 0.66, strict), lumOf(r, g, b));
      keep[py * img.w + px] = (1 - forest * (1 - k)) * (1 - smooth(800, 878, ys));
    }
  }
  boxBlur(keep, img.w, img.h, 1, 3, 2);

  // Mekani sjaj (jako zamućena slika) popuni rupe koje ostanu iza borova u sjaju
  const glowTop = Math.floor((FOREST - 20) * K * SS * (img.w / (REF_W * K * SS)));
  const glow = dilateBright(img.rgb.slice(glowTop * img.w * 3), img.w, img.h - glowTop, 18);
  boxBlur(glow, img.w, img.h - glowTop, 3, 12, 3);

  const feather = 46 * SS; // gornji rub slike se stapa s nebom
  for (let py = 0; py < img.h; py++) {
    const sy = py + oy;
    if (sy < 0 || sy >= h) continue;
    const forest = forestAt(py);
    const ys = refRow(py);
    const fy = smooth(0, feather, py);
    const row = py * img.w;
    for (let sx = 0; sx < w; sx++) {
      const i = sy * w + sx;
      const bx = colX[sx];
      const x0 = Math.floor(bx);
      const x1 = Math.min(img.w - 1, x0 + 1);
      const t = bx - x0;
      const o0 = (row + x0) * 3;
      const o1 = (row + x1) * 3;
      const r = img.rgb[o0] + (img.rgb[o1] - img.rgb[o0]) * t;
      const g = img.rgb[o0 + 1] + (img.rgb[o1 + 1] - img.rgb[o0 + 1]) * t;
      const b = img.rgb[o0 + 2] + (img.rgb[o1 + 2] - img.rgb[o0 + 2]) * t;

      if (forest > 0 && py >= glowTop) {
        const q0 = ((py - glowTop) * img.w + x0) * 3;
        const q1 = ((py - glowTop) * img.w + x1) * 3;
        const gr = glow[q0] + (glow[q1] - glow[q0]) * t;
        const gg = glow[q0 + 1] + (glow[q1 + 1] - glow[q0 + 1]) * t;
        const gb = glow[q0 + 2] + (glow[q1 + 2] - glow[q0 + 2]) * t;
        // samo pri dnu vrtloga, gdje su borovi (iznad toga čestice i kugle ostaju kakve jesu)
        const ga = forest * smooth(0.34, 0.55, lumOf(gr, gg, gb)) * 0.9 * smooth(790, 815, ys) * (1 - smooth(810, 895, ys));
        if (ga > 0) paint(i, [gr, gg, gb], ga * fy);
      }

      // uz rubove: rastegnuto nebo (i zvijezde) prepusti nacrtanom nebu, zmaj ostaje
      let ea = 1;
      if (edge[sx] < 1) {
        const lum = lumOf(r, g, b);
        const skyLike = b >= g - 0.01 && (lum < 0.16 || Math.abs(r - g) < 0.08);
        if (skyLike) ea = edge[sx];
      }
      const a = (keep[row + x0] + (keep[row + x1] - keep[row + x0]) * t) * fy * ea;
      if (a > 0) paint(i, [r, g, b], a);
    }
  }
}

// Blago tamniji rubovi ekrana
function vignette() {
  forAll((i, x, y) => {
    const k = (0.7 + 0.3 * smooth(0, 120, Math.min(x, W - x))) * (0.82 + 0.18 * smooth(0, 140, y));
    R[i] *= k;
    G[i] *= k;
    B[i] *= k;
  });
}

async function main() {
  const t0 = Date.now();
  const src = await loadSource();
  const rowColor = skyRows(src);
  const bw = Math.round(REF_W * K * SS);
  // izoštravanje samo kad se mala slika povećava (velika se smanjuje i ostaje oštra)
  const upscale = (REF_W * K) / src.w;
  const resized = resize(src, bw, Math.round((bw * src.h) / src.w));
  const big = upscale > 1.05 ? sharpen(resized, 1.6, Math.min(0.55, (upscale - 1) * 0.5)) : resized;
  console.log(`izvor ${src.w} x ${src.h}, ${upscale > 1 ? 'povećanje' : 'smanjenje'} ${upscale.toFixed(2)}x`);
  sky(rowColor);
  stars();
  landscape();
  composite(big);
  beam();
  vignette();
  console.log('render', (Date.now() - t0) / 1000, 's');
  fs.mkdirSync(OUT, { recursive: true });
  await save(OUT, 'login_shenron', {
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
