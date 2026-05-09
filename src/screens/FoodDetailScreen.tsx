import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList, FoodEntry } from '../types';
import { parseServingSizeGrams, extractCaloriesPer100g } from '../services/openFoodFacts';
import { addEntry, getTodayString, generateId } from '../services/storage';

type Props = StackScreenProps<RootStackParamList, 'FoodDetail'>;

export function FoodDetailScreen({ route, navigation }: Props) {
  const { barcode, product } = route.params;

  const productName = product.product_name || 'Unknown Product';
  const brand = product.brands || '';
  const caloriesPer100g = extractCaloriesPer100g(product.nutriments);
  const parsedServingGrams = parseServingSizeGrams(product.serving_size);
  const defaultServingGrams = parsedServingGrams ?? 100;

  const [servingGrams, setServingGrams] = useState(String(defaultServingGrams));
  const [servingsConsumed, setServingsConsumed] = useState('1');
  const [saving, setSaving] = useState(false);

  const nutrition = useMemo(() => {
    const grams = parseFloat(servingGrams) || 0;
    const servings = parseFloat(servingsConsumed) || 0;
    const factor = (grams * servings) / 100;
    return {
      calories: Math.round(caloriesPer100g * factor),
      protein: Math.round((product.nutriments?.proteins_100g ?? 0) * factor * 10) / 10,
      carbs: Math.round((product.nutriments?.carbohydrates_100g ?? 0) * factor * 10) / 10,
      fat: Math.round((product.nutriments?.fat_100g ?? 0) * factor * 10) / 10,
    };
  }, [servingGrams, servingsConsumed, caloriesPer100g, product.nutriments]);

  const handleAdd = async () => {
    setSaving(true);
    const entry: FoodEntry = {
      id: generateId(),
      date: getTodayString(),
      productName,
      brand,
      barcode,
      caloriesPer100g,
      servingSize: parseFloat(servingGrams) || defaultServingGrams,
      servingsConsumed: parseFloat(servingsConsumed) || 1,
      totalCalories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      timestamp: Date.now(),
    };
    await addEntry(entry);
    setSaving(false);
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.productName}>{productName}</Text>
        {brand ? <Text style={styles.brand}>{brand}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition per 100g</Text>
          <View style={styles.nutriRow}>
            <NutrientBadge label="Calories" value={`${caloriesPer100g} kcal`} highlight />
            <NutrientBadge label="Protein" value={`${product.nutriments?.proteins_100g ?? 0}g`} />
            <NutrientBadge label="Carbs" value={`${product.nutriments?.carbohydrates_100g ?? 0}g`} />
            <NutrientBadge label="Fat" value={`${product.nutriments?.fat_100g ?? 0}g`} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Serving</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Serving size (g)</Text>
            <TextInput
              style={styles.input}
              value={servingGrams}
              onChangeText={setServingGrams}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Number of servings</Text>
            <TextInput
              style={styles.input}
              value={servingsConsumed}
              onChangeText={setServingsConsumed}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalCalories}>{nutrition.calories} kcal</Text>
          <View style={styles.totalMacros}>
            <Text style={styles.totalMacroText}>P: {nutrition.protein}g</Text>
            <Text style={styles.totalMacroText}>C: {nutrition.carbs}g</Text>
            <Text style={styles.totalMacroText}>F: {nutrition.fat}g</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addButton, saving && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.addButtonText}>Add to Log</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function NutrientBadge({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.badge, highlight && styles.badgeHighlight]}>
      <Text style={[styles.badgeValue, highlight && styles.badgeValueHighlight]}>{value}</Text>
      <Text style={[styles.badgeLabel, highlight && styles.badgeLabelHighlight]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  brand: {
    fontSize: 15,
    color: '#757575',
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9e9e9e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  nutriRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  badgeHighlight: {
    backgroundColor: '#e8f5e9',
  },
  badgeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
  },
  badgeValueHighlight: {
    color: '#2e7d32',
    fontSize: 14,
  },
  badgeLabel: {
    fontSize: 11,
    color: '#9e9e9e',
    marginTop: 2,
  },
  badgeLabelHighlight: {
    color: '#4caf50',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputLabel: {
    fontSize: 15,
    color: '#333',
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'right',
    minWidth: 80,
    paddingVertical: 10,
  },
  totalCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalCalories: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2e7d32',
    marginVertical: 4,
  },
  totalMacros: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  totalMacroText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
