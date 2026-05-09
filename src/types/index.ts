export interface FoodEntry {
  id: string;
  date: string; // "YYYY-MM-DD" in local time
  productName: string;
  brand: string;
  barcode: string;
  caloriesPer100g: number;
  servingSize: number; // grams per serving
  servingsConsumed: number; // multiplier
  totalCalories: number; // caloriesPer100g * (servingSize / 100) * servingsConsumed
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
  'energy-kcal'?: number;
  energy_100g?: number;
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
  status: number; // 1 = found, 0 = not found
  status_verbose: string;
  product?: OFFProduct;
  code: string;
}

export type RootStackParamList = {
  MainTabs: { screen?: keyof BottomTabParamList } | undefined;
  FoodDetail: {
    barcode: string;
    product: OFFProduct;
  };
};

export type BottomTabParamList = {
  Home: undefined;
  Scan: undefined;
  History: undefined;
};
