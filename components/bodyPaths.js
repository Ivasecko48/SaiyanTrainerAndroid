// Podaci o obliku tijela (koriste se za generiranje slika i za prepoznavanje dodira na mišić).
// Svaka figura ima viewBox 200 x 420, a sredina tijela je na x = 100.
// Slike (assets/body, components/bodyLayers.js) generira: node scripts/body-figure.js
//
// - `full`    oblici koji se crtaju jednom (vrat, glava)
// - `neutral` oblici bez mišića (šake, koljena, stopala), crtaju se desno i zrcalno lijevo
// - `muscles` putanje DESNE polovice po mišićnoj skupini, lijeva strana je zrcalna slika
// - `lines`   dodatne linije radi izgleda, samo obrub
// - `hair`    kosa iza glave (cijeli oblik, ne zrcali se), s linijama pramenova `hairLines`
// - `hairTop` kosa preko glave, s linijama `hairTopLines`; `hairTopOutline: false` znači
//             bez obruba (kapa koja leži unutar kose iza glave, pa se spoj ne vidi)
//
// Građa je Saiyanska (Toriyama): široka ramena i trapezi, velika četvrtasta prsa, uzak
// struk, nazubljeni serratus, veliki bicepsi i bedra, listovi u obliku dijamanta, a kosa
// je Super Saiyan (kao Goku). Kosa ide iznad platna (y < 0); generator zato pomakne vrh
// platna (CANVAS.top u bodyLayers.js).

export const FIGURE_WIDTH = 200;
export const FIGURE_HEIGHT = 420;

// Azurne prepone (spolovilo) za Super Saiyan zafrkanciju, desna polovica.
// Leži preko kukova, na dnu zdjelice.
export const GROIN =
  'M101 196 C 106 196, 111 199, 113 205 C 114 213, 109 221, 102 228 L101 228 Z';

// Veća glava
const HEAD =
  'M100 2 C 114 2, 122 13, 122 25 C 122 39, 112 48, 100 48 C 88 48, 78 39, 78 25 C 78 13, 86 2, 100 2 Z';
// Vrat se širi prema trapezima
const NECK = 'M90 44 L110 44 L114 62 L86 62 Z';
// Kosa se slaže od točaka (udubina, vrh, udubina, vrh...): svaka stranica postane blaga
// krivulja. `bend` je izbočenje u stranu, a `sweep` pomak u smjeru u kojem je kosa
// počešljana, pa šiljci izgledaju kao plamen nagnut udesno (kao Goku).
const round1 = (n) => Math.round(n * 10) / 10;
// Točke idu u smjeru kazaljke na satu, pa negativni `bend` izboči stranice prema van
// (debeli šiljci), a pozitivni prema unutra (tanki). Vrh šiljka je označen trećim
// brojem 1 ([x, y, 1]): uz njega se stranica ne izbočuje, pa vrh ostane oštar.
const curved = (points, { closed = true, bend = -0.15, sweep = [2, -1] } = {}) => {
  const count = closed ? points.length : points.length - 1;
  let d = `M${round1(points[0][0])} ${round1(points[0][1])}`;
  for (let i = 0; i < count; i++) {
    const [ax, ay, tipA] = points[i];
    const [bx, by, tipB] = points[(i + 1) % points.length];
    const dx = bx - ax;
    const dy = by - ay;
    const wa = tipA ? 0.15 : 1;
    const wb = tipB ? 0.15 : 1;
    const c1 = [ax + dx / 3 - dy * bend * wa + sweep[0], ay + dy / 3 + dx * bend * wa + sweep[1]];
    const c2 = [
      ax + (2 * dx) / 3 - dy * bend * wb + sweep[0],
      ay + (2 * dy) / 3 + dx * bend * wb + sweep[1],
    ];
    d += ` C ${c1.map(round1).join(' ')}, ${c2.map(round1).join(' ')}, ${round1(bx)} ${round1(by)}`;
  }
  return closed ? `${d} Z` : d;
};
// Straga se kosa vidi zrcalno (i počešljana na drugu stranu)
const mirrorPoints = (points) => points.map(([x, y, tip]) => [200 - x, y, tip]).reverse();
const BACK_SWEEP = [-2, -1];

// Šiljci od lijeve sljepoočnice preko tjemena do desne (sprijeda): uz lice idu prema
// dolje, inače gore i ukoso; desna strana je veća (kosa je počešljana udesno)
const HAIR_SPIKES = [
  [70, 36, 1], [77, 22], [62, 0, 1], [76, 4], [70, -28, 1], [86, -6], [86, -50, 1],
  [98, -14], [106, -62, 1], [112, -16], [128, -58, 1], [124, -10], [148, -40, 1], [130, 0],
  [158, -14, 1], [132, 12], [154, 14, 1], [128, 20], [136, 38, 1],
];
// Sprijeda: kosa iza glave; dno je skriveno iza lica
const HAIR_FRONT = curved([[84, 34], ...HAIR_SPIKES, [118, 34], [100, 40]]);
// Linije pramenova unutar većih šiljaka (od glave prema vrhu, ne do kraja)
const STRANDS = [
  [[80, 2], [71, -14]],
  [[92, -8], [88, -30]],
  [[104, -12], [105, -38]],
  [[118, -12], [125, -36]],
  [[128, -4], [142, -24]],
  [[132, 6], [148, -6]],
];
const STRAND_STYLE = { closed: false, bend: 0, sweep: [1, 0] };
const HAIR_STRANDS_FRONT = STRANDS.map((points) => curved(points, STRAND_STYLE));
// Šiške: četiri pramena preko čela, od desne do lijeve sljepoočnice (najduži u sredini)
const BANGS = [
  [124, 24], [118, 40, 1], [113, 22], [108, 36, 1], [104, 20], [99, 44, 1], [93, 22],
  [86, 38, 1], [77, 24],
];
const BANG_STYLE = { bend: -0.12, sweep: [-1, 0.5] };
// Kapa preko tjemena (bez obruba, leži unutar kose iza glave) i rub šiški
const HAIR_CAP = curved([[76, 12], [84, 0], [100, -4], [116, 0], [124, 12], ...BANGS], BANG_STYLE);
const HAIRLINE = curved(BANGS, { ...BANG_STYLE, closed: false });
// Straga: zrcalni šiljci, a cijeli zatiljak je kosa s kratkim šiljcima na vratu
const NAPE = [
  [126, 40], [120, 57, 1], [113, 50], [106, 58, 1], [100, 51], [94, 58, 1], [87, 50],
  [80, 57, 1], [74, 40],
];
const HAIR_BACK = curved([...mirrorPoints(HAIR_SPIKES), ...NAPE], { sweep: BACK_SWEEP });
const HAIR_STRANDS_BACK = STRANDS.map((points) =>
  curved(mirrorPoints(points), { ...STRAND_STYLE, sweep: [-1, 0] })
);
const HAND =
  'M171 225 C 175 221, 186 222, 189 231 C 191 241, 187 251, 180 253 C 174 253, 169 243, 170 233 Z';
const FOREARM =
  'M159 168 L181 166 C 189 180, 191 200, 188 222 L 172 225 C 166 206, 160 186, 159 168 Z';

export const FIGURES = {
  front: {
    full: [NECK, HEAD],
    hair: [HAIR_FRONT],
    hairLines: HAIR_STRANDS_FRONT,
    hairTop: [HAIR_CAP],
    hairTopLines: [HAIRLINE],
    hairTopOutline: false,
    neutral: [
      // šaka
      HAND,
      // koljeno
      'M108 298 C 113 294, 131 294, 136 298 C 138 306, 134 313, 122 314 C 109 313, 106 306, 108 298 Z',
      // stopalo
      'M110 393 L132 393 C 139 400, 141 410, 134 415 L 106 415 C 103 406, 105 398, 110 393 Z',
    ],
    // Redoslijed je redoslijed crtanja: trbušnjaci počinju ispod prsa, a delte leže
    // preko prsa i bicepsa, pa između mišića nema bijelih procijepa
    muscles: {
      abs: ['M101 110 L118 110 C 119 134, 119 158, 118 180 L 101 180 Z'],
      obliques: [
        'M119 110 C 129 108, 137 102, 141 96 C 145 118, 141 152, 134 180 L 119 180 Z',
      ],
      // kukovi: pregibači i aduktori, cijela zdjelica; azurne prepone leže preko njih
      hips: [
        'M101 180 L134 180 C 138 190, 138 200, 135 209 C 124 211, 112 217, 102 228 L101 228 Z',
      ],
      traps: [
        'M109 50 C 116 57, 129 62, 146 65 C 140 73, 128 75, 118 72 C 110 70, 104 66, 104 62 C 106 58, 108 54, 109 50 Z',
      ],
      chest: [
        'M101 63 C 114 61, 130 64, 143 70 C 147 84, 147 96, 142 104 C 130 115, 113 119, 101 116 Z',
      ],
      biceps: [
        'M150 110 L165 119 C 178 132, 184 148, 181 166 L 159 168 C 152 152, 148 132, 150 110 Z',
      ],
      forearms: [FOREARM],
      front_delts: [
        'M141 66 C 158 58, 175 68, 177 88 C 178 101, 173 112, 165 119 L 150 110 C 145 98, 142 82, 141 66 Z',
      ],
      quads: [
        'M102 228 C 112 217, 124 211, 135 209 C 147 228, 150 258, 143 282 C 141 290, 139 294, 136 298 L 108 298 C 104 276, 100 252, 102 228 Z',
      ],
      calves: [
        'M107 314 L137 314 C 146 328, 144 352, 130 393 L 113 393 C 105 366, 101 336, 107 314 Z',
      ],
    },
    lines: [
      // šest kockica
      'M101 135 C 107 136, 113 136, 118 134',
      'M101 151 C 107 152, 113 152, 118 150',
      'M101 166 C 107 167, 113 167, 118 165',
      // serratus: "prsti" sa strane rebara
      'M129 119 C 133 118, 137 120, 140 123',
      'M128 127 C 132 126, 136 128, 139 131',
      'M128 135 C 131 134, 135 136, 138 139',
      // razdvajanje prednjeg i bočnog delta
      'M157 66 C 162 80, 163 96, 160 112',
      // biceps i podlaktica
      'M160 128 C 165 141, 167 153, 166 165',
      'M174 172 C 179 186, 181 200, 180 216',
      // V-linija kuka (od struka prema preponama)
      'M131 184 C 125 195, 119 201, 114 204',
      // bedro: srednja linija, vanjski luk i "kapljica" iznad koljena
      'M121 222 C 125 244, 126 266, 122 289',
      'M141 238 C 142 256, 139 273, 134 287',
      'M105 262 C 111 268, 116 280, 114 295',
      // list: razdvajanje glava
      'M122 318 C 126 340, 125 362, 121 388',
    ],
  },

  back: {
    full: [NECK, HEAD],
    // straga je cijela kosa preko glave (zatiljak)
    hairTop: [HAIR_BACK],
    hairTopLines: HAIR_STRANDS_BACK,
    neutral: [
      // šaka
      HAND,
      // zadnji dio koljena
      'M108 298 C 113 294, 131 294, 137 298 C 139 306, 139 312, 138 315 L 107 315 C 106 310, 106 304, 108 298 Z',
      // peta
      'M112 393 L130 393 C 136 401, 138 410, 132 415 L 112 415 C 109 406, 110 398, 112 393 Z',
    ],
    // Redoslijed je redoslijed crtanja: donji dio leđa ide ispod latova, gornji ispod
    // trapeza, a delte preko tricepsa
    muscles: {
      calves: [
        'M107 315 L138 315 C 148 334, 143 360, 129 393 L 115 393 C 106 368, 100 338, 107 315 Z',
      ],
      hamstrings: [
        'M102 238 L136 234 C 145 256, 146 280, 137 298 L 108 298 C 104 278, 100 258, 102 238 Z',
      ],
      lower_back: [
        'M101 138 C 109 138, 117 142, 122 148 C 124 164, 124 178, 122 194 L 101 196 Z',
      ],
      lats: [
        'M122 128 C 134 121, 144 110, 148 98 C 152 120, 150 146, 144 166 C 140 178, 134 186, 127 192 L 119 192 C 114 170, 114 145, 122 128 Z',
      ],
      upper_back: [
        'M101 120 C 112 110, 128 96, 147 86 C 148 104, 142 120, 128 130 C 119 136, 109 140, 101 140 Z',
      ],
      traps: [
        'M100 50 L110 56 C 122 61, 134 64, 146 67 C 141 82, 132 96, 120 110 C 113 117, 106 123, 100 128 Z',
      ],
      triceps: [
        'M150 109 L165 119 C 177 132, 183 148, 181 166 L 159 168 C 153 150, 149 130, 150 109 Z',
      ],
      forearms: [FOREARM],
      side_delts: [
        'M155 65 C 166 67, 175 76, 177 88 C 178 101, 173 112, 165 119 L 159 114 C 163 100, 162 82, 155 65 Z',
      ],
      rear_delts: [
        'M144 67 C 148 65, 152 64, 155 65 C 162 82, 163 100, 159 114 L 150 109 C 145 98, 143 84, 144 67 Z',
      ],
      glutes: [
        'M101 190 C 116 185, 136 188, 142 203 C 145 216, 139 230, 128 236 C 115 240, 104 236, 101 229 Z',
      ],
    },
    lines: [
      // stupovi uz kralježnicu
      'M108 147 C 110 160, 110 176, 108 190',
      // potkova tricepsa
      'M155 122 C 158 134, 165 142, 174 143',
      // podlaktica
      'M174 172 C 179 186, 181 200, 180 216',
      // stražnja loža: razdvajanje
      'M121 244 C 124 262, 124 280, 121 294',
      // list: dvije glave i dijamant
      'M122 319 C 120 336, 121 350, 123 362',
      'M109 348 C 115 360, 125 364, 136 356',
    ],
  },
};
