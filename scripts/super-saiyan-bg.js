// Širi pozadinu za Super Saiyan zafrkanciju (nije dio aplikacije, pokreće se ručno):
//   node scripts/super-saiyan-bg.js
// Ulaz:  assets/images/vegeta_pro.jpg       (572 x 1024, Vegeta od aureole do čizama)
// Izlaz: assets/images/vegeta_pro_wide.jpg  (ista visina, omjer 1.1)
//
// Vegeta ostaje netaknut u sredini. Lijevo i desno se dodaje pozadina: vanjski pojas
// slike (nebo i stijene, bez Vegetine ruke) zrcali se prema van, rasteže i jako zamuti,
// a prema rubovima lagano potamni. Uz šav se original postupno zamuti, pa se spoj ne
// vidi. Tako slika u kartici može biti pozadina, a Vegeta se ipak vidi cijeli.
const path = require('path');
const Jimp = require('jimp-compact');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'assets/images/vegeta_pro.jpg');
const OUTPUT = path.join(ROOT, 'assets/images/vegeta_pro_wide.jpg');

const RATIO = 1.1; // širina / visina izlazne slike
const EDGE = 60; // vanjski stupci izvora koji se zrcale (ruka počinje oko x = 68)
const FEATHER = 60; // širina postupnog prijelaza unutar originala (prsti ruke počinju oko x = 68)
const BLUR = 26; // polumjer zamućenja (3 prolaza box blura, blizu Gaussa)
const DARKEN = 0.5; // koliko potamne krajnji rubovi

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (x) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};

// Box blur po retcima i stupcima (RGB, Float32), više prolaza. Ulaz ostaje netaknut.
const blur = (rgb, width, height, radius, passes = 3) => {
  let src = rgb.slice();
  let dst = new Float32Array(rgb.length);
  const run = (horizontal) => {
    const outer = horizontal ? height : width;
    const inner = horizontal ? width : height;
    const index = (o, i) => (horizontal ? o * width + i : i * width + o) * 3;
    for (let o = 0; o < outer; o++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += src[index(o, clamp(k, 0, inner - 1)) + c];
        for (let i = 0; i < inner; i++) {
          // klizni prozor s rubovima koji se ponavljaju
          dst[index(o, i) + c] = sum / (2 * radius + 1);
          const add = src[index(o, Math.min(inner - 1, i + radius + 1)) + c];
          const remove = src[index(o, Math.max(0, i - radius)) + c];
          sum += add - remove;
        }
      }
    }
    [src, dst] = [dst, src];
  };
  for (let p = 0; p < passes; p++) {
    run(true);
    run(false);
  }
  return src;
};

(async () => {
  const image = await Jimp.read(SOURCE);
  const sw = image.bitmap.width;
  const sh = image.bitmap.height;
  const ow = Math.round(sh * RATIO);
  const offset = Math.round((ow - sw) / 2);
  const data = image.bitmap.data;
  const source = (x, y, c) => data[(y * sw + x) * 4 + c];

  // 1) Široka slika: sredina je original, strane su rastegnuti zrcalni rubovi
  const wide = new Float32Array(ow * sh * 3);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < ow; x++) {
      let sx;
      if (x < offset) {
        const d = offset - x; // 1..offset od šava prema van
        sx = Math.min(EDGE - 1, Math.floor(((d - 1) * EDGE) / offset));
      } else if (x >= offset + sw) {
        const d = x - (offset + sw) + 1;
        sx = sw - 1 - Math.min(EDGE - 1, Math.floor(((d - 1) * EDGE) / offset));
      } else {
        sx = x - offset;
      }
      for (let c = 0; c < 3; c++) wide[(y * ow + x) * 3 + c] = source(sx, y, c);
    }
  }

  // 2) Zamućena verzija za strane i za prijelaz uz šav
  const blurred = blur(wide, ow, sh, BLUR);

  // 3) Spoj: original u sredini, uz šav postupno zamućen; strane zamućene i potamnjene
  const out = new Jimp(ow, sh, 0x000000ff);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < ow; x++) {
      const i = (y * ow + x) * 3;
      let mixBlur;
      let shade = 1;
      if (x < offset || x >= offset + sw) {
        mixBlur = 1;
        const d = x < offset ? offset - x : x - (offset + sw) + 1;
        shade = 1 - DARKEN * smooth(d / offset);
      } else {
        const inside = Math.min(x - offset, offset + sw - 1 - x); // udaljenost od bližeg šava
        mixBlur = 1 - smooth(inside / FEATHER);
      }
      const rgb = [0, 1, 2].map((c) =>
        Math.round(clamp((wide[i + c] * (1 - mixBlur) + blurred[i + c] * mixBlur) * shade, 0, 255))
      );
      out.setPixelColor(Jimp.rgbaToInt(rgb[0], rgb[1], rgb[2], 255), x, y);
    }
  }

  await out.quality(88).writeAsync(OUTPUT);
  console.log(`zapisano ${path.relative(ROOT, OUTPUT)} (${ow} x ${sh}), Vegeta od x = ${offset} do ${offset + sw}`);
})();
