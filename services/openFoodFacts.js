import Constants from 'expo-constants';
import { parseNumber } from '@/utils/parseNumber';

// Javna baza proizvoda Open Food Facts: besplatna, bez ključa i registracije.
// Šalje se samo broj barkoda, ništa o korisniku.
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product/';
const FIELDS = [
  'product_name_hr',
  'product_name',
  'product_name_en',
  'generic_name_hr',
  'generic_name',
  'brands',
  // Bez `quantity` baza uz nutriments ne vrati veličinu pakiranja
  'quantity',
  'product_quantity',
  'product_quantity_unit',
  'serving_quantity',
  'serving_quantity_unit',
  'nutriments',
].join(',');
// Open Food Facts traži da se aplikacija predstavi imenom i verzijom
const USER_AGENT = `SaiyanTrainer/${Constants.expoConfig?.version ?? '1.0'} (Android)`;
const TIMEOUT_MS = 10000;
// Nazivi iz baze znaju biti dugi, a obrok mora stati u tablicu
const MAX_NAME = 60;
// Veće porcije i pakiranja (npr. 12 limenki) nemaju smisla kao brzi gumb
const MAX_PORTION = 2000;

const clean = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();

const round1 = (n) => Math.round(n * 10) / 10;

// Broj iz baze (nekad stiže kao tekst) ili null kad podatka nema
const toNumber = (value) => {
  const n = parseNumber(value, NaN);
  return Number.isNaN(n) ? null : n;
};

// Naziv proizvoda, po mogućnosti hrvatski, s brendom ispred ("Dukat Jogurt")
const productName = (product) => {
  const name =
    clean(product.product_name_hr) ||
    clean(product.product_name) ||
    clean(product.product_name_en) ||
    clean(product.generic_name_hr) ||
    clean(product.generic_name);
  // Prvi brend; dugi nazivi tvrtki ("COCA-COLA SERVICES SA/NV") se preskaču
  const brand = clean(String(product.brands ?? '').split(',')[0]);
  const addBrand =
    brand.length > 0 &&
    brand.length <= 20 &&
    !name.toLowerCase().includes(brand.split(' ')[0].toLowerCase());
  const full = name ? (addBrand ? `${brand} ${name}` : name) : brand;
  return full.slice(0, MAX_NAME).trim();
};

// Kalorije na 100 g; neki proizvodi imaju samo kJ (1 kcal = 4,184 kJ)
const kcalPer100 = (nutriments) => {
  const kcal = toNumber(nutriments['energy-kcal_100g']);
  if (kcal !== null) return Math.round(kcal);
  const kj = toNumber(nutriments['energy-kj_100g'] ?? nutriments.energy_100g);
  return kj === null ? null : Math.round(kj / 4.184);
};

// Porcija ili pakiranje u gramima (ml), ako ima smisla za brzi gumb
const portion = (value) => {
  const n = toNumber(value);
  return n !== null && n >= 1 && n <= MAX_PORTION ? Math.round(n) : null;
};

// Proizvod iz baze u obliku namirnice iz kataloga (vrijednosti na 100 g).
// Vrijednost koje nema u bazi je null.
const toFood = (product, barcode) => {
  const nutriments = product.nutriments ?? {};
  const per100 = (key) => {
    const n = toNumber(nutriments[key]);
    return n === null ? null : round1(n);
  };
  const isDrink =
    product.product_quantity_unit === 'ml' || product.serving_quantity_unit === 'ml';
  return {
    name: productName(product),
    kcal: kcalPer100(nutriments),
    protein: per100('proteins_100g'),
    fat: per100('fat_100g'),
    carbs: per100('carbohydrates_100g'),
    grams: 100,
    // Pića su u ml; za izračun se 100 ml uzima kao 100 g
    unit: isDrink ? 'ml' : 'g',
    servingGrams: portion(product.serving_quantity),
    packageGrams: portion(product.product_quantity),
    barcode,
  };
};

// Traži proizvod po barkodu. Vraća { data, error }: data je namirnica,
// ili null kad proizvoda nema u bazi.
export const fetchProduct = async (barcode) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${PRODUCT_URL}${barcode}?fields=${FIELDS}`, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    // Nepoznat barkod: baza vraća 404
    if (response.status === 404) return { data: null, error: null };
    if (!response.ok) {
      return {
        data: null,
        error: `Baza proizvoda trenutno ne radi (greška ${response.status}). Pokušaj malo kasnije.`,
      };
    }
    const json = await response.json();
    if (json.status !== 1 || !json.product) return { data: null, error: null };
    return { data: toFood(json.product, barcode), error: null };
  } catch (error) {
    console.log('Greška kod traženja proizvoda:', error);
    return { data: null, error: 'Nema veze s bazom proizvoda. Provjeri internet.' };
  } finally {
    clearTimeout(timer);
  }
};
