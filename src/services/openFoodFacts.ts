import { OFFApiResponse, OFFProduct, OFFNutriments } from '../types';

export async function fetchProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
    headers: { 'User-Agent': 'CalorieTracker/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: OFFApiResponse = await res.json();
  if (data.status === 0 || !data.product) return null;
  return data.product;
}

export function extractCaloriesPer100g(nutriments: OFFNutriments | undefined): number {
  if (!nutriments) return 0;
  const kcal = nutriments['energy-kcal_100g'];
  if (typeof kcal === 'number' && kcal >= 0) return Math.round(kcal);
  const kj = nutriments['energy_100g'];
  if (typeof kj === 'number' && kj >= 0) return Math.round(kj / 4.184);
  return 0;
}

export function parseServingSizeGrams(s: string | undefined): number | null {
  if (!s) return null;
  const paren = s.match(/\((\d+(?:\.\d+)?)\s*g\)/i);
  if (paren) return parseFloat(paren[1]);
  const direct = s.match(/^(\d+(?:\.\d+)?)\s*g\b/i);
  if (direct) return parseFloat(direct[1]);
  const ml = s.match(/^(\d+(?:\.\d+)?)\s*ml\b/i);
  if (ml) return parseFloat(ml[1]);
  return null;
}
