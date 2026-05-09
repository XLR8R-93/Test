import { useState, useMemo } from 'react';
import { OFFProduct } from '../types';
import { extractCaloriesPer100g, parseServingSizeGrams } from '../services/openFoodFacts';
import { addEntry, getTodayString, generateId } from '../services/storage';

interface Props {
  product: OFFProduct;
  barcode: string;
  onAdded: () => void;
  onBack: () => void;
}

export function FoodDetailView({ product, barcode, onAdded, onBack }: Props) {
  const name = product.product_name || 'Unknown Product';
  const brand = product.brands || '';
  const cal100 = extractCaloriesPer100g(product.nutriments);
  const defaultServing = parseServingSizeGrams(product.serving_size) ?? 100;

  const [servingG, setServingG] = useState(String(defaultServing));
  const [servings, setServings] = useState('1');

  const nutrition = useMemo(() => {
    const g = parseFloat(servingG) || 0;
    const n = parseFloat(servings) || 0;
    const factor = (g * n) / 100;
    return {
      calories: Math.round(cal100 * factor),
      protein: Math.round((product.nutriments?.proteins_100g ?? 0) * factor * 10) / 10,
      carbs: Math.round((product.nutriments?.carbohydrates_100g ?? 0) * factor * 10) / 10,
      fat: Math.round((product.nutriments?.fat_100g ?? 0) * factor * 10) / 10,
    };
  }, [servingG, servings, cal100, product.nutriments]);

  const handleAdd = () => {
    addEntry({
      id: generateId(),
      date: getTodayString(),
      productName: name,
      brand,
      barcode,
      caloriesPer100g: cal100,
      servingSize: parseFloat(servingG) || defaultServing,
      servingsConsumed: parseFloat(servings) || 1,
      totalCalories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      timestamp: Date.now(),
    });
    onAdded();
  };

  return (
    <div style={s.container}>
      <button style={s.back} onClick={onBack}>← Back</button>
      <div style={s.name}>{name}</div>
      {brand && <div style={s.brand}>{brand}</div>}

      <div style={s.section}>
        <div style={s.sectionTitle}>Per 100g</div>
        <div style={s.badges}>
          <Badge label="Calories" value={`${cal100} kcal`} green />
          <Badge label="Protein" value={`${product.nutriments?.proteins_100g ?? 0}g`} />
          <Badge label="Carbs" value={`${product.nutriments?.carbohydrates_100g ?? 0}g`} />
          <Badge label="Fat" value={`${product.nutriments?.fat_100g ?? 0}g`} />
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Your Serving</div>
        <InputRow label="Serving size (g)" value={servingG} onChange={setServingG} />
        <InputRow label="Number of servings" value={servings} onChange={setServings} />
      </div>

      <div style={s.totalCard}>
        <div style={{ color: '#4caf50', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Total</div>
        <div style={{ fontSize: 40, fontWeight: 800, color: '#2e7d32' }}>{nutrition.calories} kcal</div>
        <div style={{ display: 'flex', gap: 16, color: '#4caf50', fontSize: 14 }}>
          <span>P: {nutrition.protein}g</span>
          <span>C: {nutrition.carbs}g</span>
          <span>F: {nutrition.fat}g</span>
        </div>
      </div>

      <button style={s.addBtn} onClick={handleAdd}>Add to Log</button>
    </div>
  );
}

function Badge({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div style={{ flex: 1, background: green ? '#e8f5e9' : '#f5f5f5', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: green ? '#2e7d32' : '#212121' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function InputRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 10, padding: '4px 14px', marginBottom: 8, border: '1px solid #e0e0e0' }}>
      <span style={{ fontSize: 15, color: '#333' }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: 80, border: 'none', outline: 'none', fontSize: 16, fontWeight: 600, textAlign: 'right', padding: '10px 0', background: 'transparent' }}
      />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: 16, paddingBottom: 32, overflowY: 'auto', height: '100dvh' },
  back: { background: 'none', border: 'none', color: '#2e7d32', fontSize: 16, cursor: 'pointer', padding: '0 0 12px', fontWeight: 600 },
  name: { fontSize: 22, fontWeight: 700, color: '#212121', marginBottom: 4 },
  brand: { fontSize: 15, color: '#888', marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  badges: { display: 'flex', gap: 8 },
  totalCard: { background: '#e8f5e9', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 20 },
  addBtn: { width: '100%', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 14, padding: 16, fontSize: 17, fontWeight: 700, cursor: 'pointer' },
};
