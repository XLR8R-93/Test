import { OFFApiResponse, OFFProduct, OFFNutriments } from '../types';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';

export async function fetchProductByBarcode(barcode: string): Promise<OFFProduct | null> {
  const response = await fetch(`${BASE_URL}/${barcode}.json`, {
    headers: {
      'User-Agent': 'CalorieTracker/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data: OFFApiResponse = await response.json();

  if (data.status === 0 || !data.product) {
    return null;
  }

  return data.product;
}

/**
 * Parses serving size strings like "30 g", "1 oz (28g)", "2 pieces (50 g)".
 * Returns grams as a number, or null if unparseable.
 */
export function parseServingSizeGrams(servingSize: string | undefined): number | null {
  if (!servingSize) return null;

  // Try parenthetical grams first: "(28g)" or "(28 g)"
  const parenMatch = servingSize.match(/\((\d+(?:\.\d+)?)\s*g\)/i);
  if (parenMatch) return parseFloat(parenMatch[1]);

  // Try plain "30g" or "30 g" at start of string
  const directMatch = servingSize.match(/^(\d+(?:\.\d+)?)\s*g\b/i);
  if (directMatch) return parseFloat(directMatch[1]);

  // Try ml (approximate 1ml ≈ 1g for water-based drinks)
  const mlMatch = servingSize.match(/^(\d+(?:\.\d+)?)\s*ml\b/i);
  if (mlMatch) return parseFloat(mlMatch[1]);

  return null;
}

export function extractCaloriesPer100g(nutriments: OFFNutriments | undefined): number {
  if (!nutriments) return 0;

  const kcal = nutriments['energy-kcal_100g'];
  if (typeof kcal === 'number' && kcal >= 0) return Math.round(kcal);

  // kJ fallback
  const kj = nutriments['energy_100g'];
  if (typeof kj === 'number' && kj >= 0) return Math.round(kj / 4.184);

  return 0;
}
