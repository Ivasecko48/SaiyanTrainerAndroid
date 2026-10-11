// Pretvara tekst iz inputa u broj.
// Prihvaća i zarez kao decimalni separator ("82,5"), jer ga hrvatske tipkovnice često nude.
export const parseNumber = (value, fallback = 0) => {
  const parsed = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};
