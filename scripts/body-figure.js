// Generira slojeve figure tijela iz components/bodyPaths.js (nije dio aplikacije):
//   node scripts/body-figure.js            -> assets/body/*.png + components/bodyLayers.js
//   node scripts/body-figure.js --preview  -> samo pregled (u privremenoj mapi), ništa ne mijenja
//
// Svaki sloj je PNG u 3x rezoluciji platna 200 x 420:
// - <strana>_hair      Super Saiyan kosa iza glave (zlatna, crni obrub)
// - neutral_<strana>   glava, vrat i dijelovi bez mišića: bijela ispuna, crni obrub
// - <strana>_<mišić>_fill  bijela maska mišića; aplikacija je boji preko tintColor
// - <strana>_<mišić>_line  crni obrub mišića
// - front_groin_fill/_line  azurne prepone za Super Saiyan zafrkanciju (preko kukova)
// - <strana>_lines     dodatne linije (trbušnjaci, razdvajanja mišića)
// - <strana>_hair_top  kosa preko glave (šiške sprijeda, zatiljak straga)
// Desne polovice iz bodyPaths.js zrcale se preko sredine (x = 100).
const fs = require('fs');
const os = require('os');
const path = require('path');
const Jimp = require('jimp-compact');

const ROOT = path.join(__dirname, '..');
const SCALE = 3; // pikseli po jedinici platna
const STROKE = 4 / SCALE; // debljina obruba u jedinicama (4 px)
const SS = 4; // podredovi po pikselu za glatke rubove ispune
const CURVE_STEPS = 24;
const PREVIEW = process.argv.includes('--preview');

// bodyPaths.js je ES modul aplikacije; ovdje ga učitamo kao običan JS
const loadPaths = () => {
  const file = path.join(ROOT, 'components/bodyPaths.js');
  const code = fs.readFileSync(file, 'utf8').replace(/export const /g, 'const ');
  const module = { exports: {} };
  new Function('module', `${code}\nmodule.exports = { FIGURES, FIGURE_WIDTH, FIGURE_HEIGHT, GROIN };`)(module);
  return module.exports;
};

// Putanja (M, L, C, Z, apsolutne koordinate) u listu potputanja s točkama
const toPolylines = (d) => {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/g) || [];
  const lines = [];
  let current = null;
  let point = [0, 0];
  let command = null;
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (/[MLCZ]/.test(tokens[i])) {
      command = tokens[i++];
      if (command === 'Z') {
        if (current) current.closed = true;
        continue;
      }
    }
    if (command === 'M') {
      point = [num(), num()];
      current = { points: [point], closed: false };
      lines.push(current);
      command = 'L';
    } else if (command === 'L') {
      point = [num(), num()];
      current.points.push(point);
    } else if (command === 'C') {
      const [x0, y0] = point;
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
      for (let s = 1; s <= CURVE_STEPS; s++) {
        const t = s / CURVE_STEPS;
        const u = 1 - t;
        current.points.push([
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
      point = [x3, y3];
    } else {
      throw new Error(`Nepodržana naredba: ${command}`);
    }
  }
  return lines;
};

const mirror = (polyline) => ({
  closed: polyline.closed,
  points: polyline.points.map(([x, y]) => [200 - x, y]),
});

// Desna polovica + zrcalna lijeva (osim oblika koji su već cijeli)
const withMirror = (paths, mirrored = true) =>
  paths.flatMap((d) => toPolylines(d)).flatMap((p) => (mirrored ? [p, mirror(p)] : [p]));

const bounds = (polylines, pad) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  polylines.forEach(({ points }) =>
    points.forEach(([x, y]) => {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    })
  );
  // kosa smije ići iznad platna (y < 0); vrh platna se kasnije pomakne
  const left = Math.max(0, Math.floor(x0 - pad));
  const top = Math.floor(y0 - pad);
  const right = Math.min(200, Math.ceil(x1 + pad));
  const bottom = Math.min(420, Math.ceil(y1 + pad));
  return [left, top, right - left, bottom - top];
};

// Pokrivenost ispune (0..1) po pikselu: scanline po podredovima, rubovi raspona glatki
const fillCoverage = (polylines, box) => {
  const [bx, by, bw, bh] = box;
  const w = bw * SCALE, h = bh * SCALE;
  const cover = new Float32Array(w * h);
  const edges = [];
  polylines.forEach(({ points }) => {
    for (let a = 0; a < points.length; a++) {
      const p = points[a];
      const q = points[(a + 1) % points.length];
      edges.push([(p[0] - bx) * SCALE, (p[1] - by) * SCALE, (q[0] - bx) * SCALE, (q[1] - by) * SCALE]);
    }
  });
  for (let sy = 0; sy < h * SS; sy++) {
    const y = (sy + 0.5) / SS;
    const xs = [];
    edges.forEach(([x0, y0, x1, y1]) => {
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
    });
    xs.sort((m, n) => m - n);
    const row = Math.floor(sy / SS) * w;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, xs[k]);
      const xb = Math.min(w, xs[k + 1]);
      for (let x = Math.floor(xa); x < Math.ceil(xb); x++) {
        const part = Math.min(x + 1, xb) - Math.max(x, xa);
        if (part > 0) cover[row + x] += part / SS;
      }
    }
  }
  return cover;
};

// Pokrivenost obruba (0..1): udaljenost piksela od najbližeg segmenta
const strokeCoverage = (polylines, box, width = STROKE) => {
  const [bx, by, bw, bh] = box;
  const w = bw * SCALE, h = bh * SCALE;
  const cover = new Float32Array(w * h);
  const r = (width * SCALE) / 2;
  polylines.forEach(({ points, closed }) => {
    const count = closed ? points.length : points.length - 1;
    for (let a = 0; a < count; a++) {
      const [x0, y0] = points[a].map((v, i) => (v - (i ? by : bx)) * SCALE);
      const [x1, y1] = points[(a + 1) % points.length].map((v, i) => (v - (i ? by : bx)) * SCALE);
      const dx = x1 - x0, dy = y1 - y0;
      const len2 = dx * dx + dy * dy || 1;
      const minX = Math.max(0, Math.floor(Math.min(x0, x1) - r - 1));
      const maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1) + r + 1));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1) - r - 1));
      const maxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1) + r + 1));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5, py = y + 0.5;
          const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
          const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
          const c = Math.max(0, Math.min(1, r + 0.5 - d));
          if (c > cover[y * w + x]) cover[y * w + x] = c;
        }
      }
    }
  });
  return cover;
};

// Slika iz pokrivenosti: boja + alfa
const toImage = (box, layers) => {
  const [, , bw, bh] = box;
  const w = bw * SCALE, h = bh * SCALE;
  const image = new Jimp(w, h, 0x00000000);
  const data = image.bitmap.data;
  for (let i = 0; i < w * h; i++) {
    // slojevi redom (ispuna pa obrub), "source over"
    let r = 0, g = 0, b = 0, a = 0;
    layers.forEach(({ cover, color }) => {
      const ca = Math.min(1, cover[i]);
      if (ca <= 0) return;
      const na = ca + a * (1 - ca);
      r = (color[0] * ca + r * a * (1 - ca)) / na;
      g = (color[1] * ca + g * a * (1 - ca)) / na;
      b = (color[2] * ca + b * a * (1 - ca)) / na;
      a = na;
    });
    data[i * 4] = Math.round(r);
    data[i * 4 + 1] = Math.round(g);
    data[i * 4 + 2] = Math.round(b);
    data[i * 4 + 3] = Math.round(a * 255);
  }
  return image;
};

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const GOLD = [255, 224, 102]; // Super Saiyan kosa

// Kosa: zlatna ispuna, tanje linije pramenova i (osim kod kape) crni obrub. Oblici su
// cijeli (kosa nije simetrična), pa se ne zrcale. Ne boji se kao mišići.
const hairLayer = (id, view, paths, strands = [], outline = true) => {
  const shapes = withMirror(paths, false);
  const lines = withMirror(strands, false);
  const box = bounds([...shapes, ...lines], STROKE);
  return {
    id,
    kind: 'hair',
    view,
    box,
    image: toImage(box, [
      { cover: fillCoverage(shapes, box), color: GOLD },
      { cover: strokeCoverage(lines, box, outline ? STROKE * 0.7 : STROKE), color: BLACK },
      ...(outline ? [{ cover: strokeCoverage(shapes, box), color: BLACK }] : []),
    ]),
  };
};

const build = () => {
  const { FIGURES, GROIN } = loadPaths();
  const layers = []; // { id, kind, view, muscle?, box, image }

  Object.entries(FIGURES).forEach(([view, figure]) => {
    // Duga kosa je iza svega
    if (figure.hair?.length) {
      layers.push(hairLayer(`${view}_hair`, view, figure.hair, figure.hairLines));
    }

    // Neutralno: vrat i glava su cijeli, ostalo se zrcali
    const neutral = [...withMirror(figure.full, false), ...withMirror(figure.neutral)];
    const fullBox = [0, 0, 200, 420];
    layers.push({
      id: `neutral_${view}`,
      kind: 'neutral',
      view,
      box: fullBox,
      image: toImage(fullBox, [
        { cover: fillCoverage(neutral, fullBox), color: WHITE },
        { cover: strokeCoverage(neutral, fullBox), color: BLACK },
      ]),
    });

    Object.entries(figure.muscles).forEach(([muscle, paths]) => {
      const shapes = withMirror(paths);
      const box = bounds(shapes, STROKE);
      layers.push({
        id: `${view}_${muscle}_fill`,
        kind: 'fill',
        view,
        muscle,
        box,
        image: toImage(box, [{ cover: fillCoverage(shapes, box), color: WHITE }]),
      });
      layers.push({
        id: `${view}_${muscle}_line`,
        kind: 'line',
        view,
        box,
        image: toImage(box, [{ cover: strokeCoverage(shapes, box), color: BLACK }]),
      });
    });

    // Azurne prepone (samo sprijeda): leže preko kukova, s vlastitim obrubom
    if (view === 'front' && GROIN) {
      const groin = withMirror([GROIN]);
      const box = bounds(groin, STROKE);
      layers.push({
        id: 'front_groin_fill',
        kind: 'fill',
        view,
        muscle: 'groin',
        box,
        image: toImage(box, [{ cover: fillCoverage(groin, box), color: WHITE }]),
      });
      layers.push({
        id: 'front_groin_line',
        kind: 'line',
        view,
        box,
        image: toImage(box, [{ cover: strokeCoverage(groin, box), color: BLACK }]),
      });
    }

    if (figure.lines.length) {
      const details = withMirror(figure.lines);
      const box = bounds(details, STROKE);
      layers.push({
        id: `${view}_lines`,
        kind: 'line',
        view,
        box,
        image: toImage(box, [{ cover: strokeCoverage(details, box, STROKE * 0.85), color: BLACK }]),
      });
    }

    // Kosa preko glave (šiške sprijeda, zatiljak straga) je na vrhu
    if (figure.hairTop?.length) {
      layers.push(
        hairLayer(
          `${view}_hair_top`,
          view,
          figure.hairTop,
          figure.hairTopLines,
          figure.hairTopOutline !== false
        )
      );
    }
  });
  return layers;
};

// Platno: širina 200, a vrh se pomakne gore koliko treba kosi
const canvasOf = (layers) => {
  const top = Math.min(0, ...layers.map(({ box }) => box[1]));
  return { left: 0, top, width: 200, height: 420 - top };
};

// Pregled: obje strane jedna do druge, mišići obojeni kao u aplikaciji
const preview = async (layers) => {
  const colors = ['#e74c3c', '#f1c40f', '#2ecc71'];
  const { top, height } = canvasOf(layers);
  const canvas = new Jimp(420 * SCALE, height * SCALE, 0xffffffff);
  let index = 0;
  for (const layer of layers) {
    const [x, boxY] = layer.box;
    const y = boxY - top;
    const offset = layer.view === 'back' ? 220 : 0;
    let image = layer.image.clone();
    if (layer.kind === 'fill') {
      const hex = layer.muscle === 'groin' ? '#1fb5ff' : colors[index++ % 3];
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (px, py, idx) {
        this.bitmap.data[idx] = r;
        this.bitmap.data[idx + 1] = g;
        this.bitmap.data[idx + 2] = b;
      });
    }
    canvas.composite(image, (x + offset) * SCALE, y * SCALE);
  }
  const out = path.join(os.tmpdir(), 'body-preview.png');
  await canvas.writeAsync(out);
  console.log(`pregled: ${out}`);
};

const writeLayers = async (layers) => {
  for (const layer of layers) {
    await layer.image.writeAsync(path.join(ROOT, 'assets/body', `${layer.id}.png`));
  }
  const rows = layers.map(({ id, kind, view, muscle, box }) => {
    const muscleField = muscle ? `, muscle: '${muscle}'` : '';
    return `  { id: '${id}', kind: '${kind}', view: '${view}'${muscleField}, box: [${box.join(', ')}], src: require('../assets/body/${id}.png') },`;
  });
  const { left, top, width, height } = canvasOf(layers);
  const file = [
    '// GENERIRANO skriptom scripts/body-figure.js iz components/bodyPaths.js: ne mijenjati ručno.',
    '// Slojevi tijela kao PNG slike (nema nativnih biblioteka). Redoslijed je redoslijed crtanja.',
    "// Sloj tipa 'fill' se boji (tintColor), ostali (neutral, line, hair) crtaju se kakvi jesu.",
    "// view = 'front' | 'back'. box = [x, y, širina, visina] u jedinicama tijela 200 x 420;",
    '// platno počinje na CANVAS.top (< 0) jer kosa ide iznad glave.',
    '',
    `export const CANVAS = { left: ${left}, top: ${top}, width: ${width}, height: ${height} };`,
    '',
    'export const LAYERS = [',
    ...rows,
    '];',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'components/bodyLayers.js'), file);
  console.log(`zapisano ${layers.length} slojeva i components/bodyLayers.js`);
};

(async () => {
  const layers = build();
  await preview(layers);
  if (!PREVIEW) await writeLayers(layers);
})();
