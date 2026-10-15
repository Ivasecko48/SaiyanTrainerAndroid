import { FIGURES, FIGURE_WIDTH, GROIN } from '../components/bodyPaths';

const CURVE_STEPS = 12; // koliko točaka uzorkujemo po Bezierovoj krivulji
const TOLERANCE = 3; // koliko jedinica "mimo" oblika još računamo kao pogodak

// Putanje u bodyPaths.js koriste samo apsolutne naredbe M, L, C i Z
const toPolygon = (d) => {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/g) || [];
  const points = [];
  let i = 0;
  let command = null;
  let current = [0, 0];

  const number = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    if (/[MLCZ]/.test(tokens[i])) {
      command = tokens[i++];
      if (command === 'Z') continue;
    }

    if (command === 'M' || command === 'L') {
      current = [number(), number()];
      points.push(current);
    } else if (command === 'C') {
      const [x0, y0] = current;
      const x1 = number(), y1 = number();
      const x2 = number(), y2 = number();
      const x3 = number(), y3 = number();
      for (let step = 1; step <= CURVE_STEPS; step++) {
        const t = step / CURVE_STEPS;
        const u = 1 - t;
        points.push([
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
      current = [x3, y3];
    } else {
      throw new Error(`Nepodržana naredba u putanji: ${command}`);
    }
  }
  return points;
};

const inside = (polygon, x, y) => {
  let result = false;
  for (let a = 0, b = polygon.length - 1; a < polygon.length; b = a++) {
    const [xa, ya] = polygon[a];
    const [xb, yb] = polygon[b];
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) {
      result = !result;
    }
  }
  return result;
};

// Poligoni se računaju jednom i pamte
let cache = null;
const getShapes = () => {
  if (cache) return cache;
  cache = {};
  Object.entries(FIGURES).forEach(([view, figure]) => {
    // isti redoslijed kao pri crtanju; što je kasnije nacrtano, leži iznad
    cache[view] = Object.entries(figure.muscles).map(([key, paths]) => ({
      key,
      polygons: paths.map(toPolygon),
    }));
  });
  return cache;
};

const hitExact = (shapes, x, y) => {
  // lijeva polovica je zrcalna slika desne, pa testiramo točku preko sredine
  const px = x > FIGURE_WIDTH / 2 ? x : FIGURE_WIDTH - x;
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (shapes[i].polygons.some((polygon) => inside(polygon, px, y))) {
      return shapes[i].key;
    }
  }
  return null;
};

// Područje prepona na prednjoj strani (nije mišić): isti oblik kao zdjelica u
// bodyPaths.js i sloj front_groin_fill
let groinPolygon = null;

// Je li dodir na azurnim preponama? (otvara Super Saiyan zafrkanciju)
export const hitTestGroin = (view, x, y) => {
  if (view !== 'front') return false;
  groinPolygon = groinPolygon || toPolygon(GROIN);
  // desna polovica; lijevu testiramo zrcalno preko sredine. Putanja počinje na x = 101,
  // pa dodir točno na središnjoj liniji pomaknemo malo udesno.
  const px = Math.max(101.5, x > FIGURE_WIDTH / 2 ? x : FIGURE_WIDTH - x);
  return inside(groinPolygon, px, y);
};

/**
 * Koja mišićna skupina je na zadanoj točki?
 * @param {'front'|'back'} view
 * @param {number} x točka u jedinicama platna (0..200)
 * @param {number} y točka u jedinicama platna (0..420)
 * @returns {string|null} ključ mišića ili null ako je dodir mimo mišića
 */
export const hitTestMuscle = (view, x, y) => {
  const shapes = getShapes()[view];
  if (!shapes) return null;

  const direct = hitExact(shapes, x, y);
  if (direct) return direct;

  // mala tolerancija za prst: pokušaj nekoliko točaka oko dodira
  const offsets = [
    [TOLERANCE, 0], [-TOLERANCE, 0], [0, TOLERANCE], [0, -TOLERANCE],
    [TOLERANCE, TOLERANCE], [-TOLERANCE, TOLERANCE], [TOLERANCE, -TOLERANCE], [-TOLERANCE, -TOLERANCE],
  ];
  for (const [dx, dy] of offsets) {
    const near = hitExact(shapes, x + dx, y + dy);
    if (near) return near;
  }
  return null;
};
