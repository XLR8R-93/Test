export interface FoodEntry {
  id: string;
  date: string; // "YYYY-MM-DD" local time
  productName: string;
  brand: string;
  barcode: string;
  caloriesPer100g: number;
  servingSize: number;
  servingsConsumed: number;
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
}

export interface DailyGoal {
  calories: number;
}

export interface OFFNutriments {
  'energy-kcal_100g'?: number;
  'energy_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

export interface OFFProduct {
  product_name?: string;
  brands?: string;
  nutriments?: OFFNutriments;
  serving_size?: string;
}

export interface OFFApiResponse {
  status: number;
  product?: OFFProduct;
}

export type View = 'home' | 'scan' | 'history';
