import { useState, useEffect } from 'react';
import { FoodEntry } from '../types';
import {
  getEntriesForDate, deleteEntry, getDailyGoal,
  setDailyGoal, getTodayString, formatDate,
} from '../services/storage';

interface Props {
  refreshKey: number;
}

export function HomeView({ refreshKey }: Props) {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [goal, setGoal] = useState(2000);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('2000');
  const today = getTodayString();

  useEffect(() => {
    const e = getEntriesForDate(today);
    const g = getDailyGoal();
    setEntries(e);
    setGoal(g);
    setGoalInput(String(g));
  }, [today, refreshKey]);

  const totalCal = entries.reduce((s, e) => s + e.totalCalories, 0);
  const totalP = entries.reduce((s, e) => s + e.protein, 0);
  const totalC = entries.reduce((s, e) => s + e.carbs, 0);
  const totalF = entries.reduce((s, e) => s + e.fat, 0);
  const pct = Math.min(100, Math.round((totalCal / goal) * 100));
  const over = totalCal > goal;

  const handleDelete = (id: string) => {
    if (confirm('Remove this entry?')) {
      deleteEntry(id);
      setEntries(getEntriesForDate(today));
    }
  };

  const handleSaveGoal = () => {
    const v = parseInt(goalInput, 10);
    if (!isNaN(v) && v > 0) { setDailyGoal(v); setGoal(v); }
    setEditingGoal(false);
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Today</div>
          <div style={s.subtitle}>{formatDate(today)}</div>
        </div>
        <button style={s.goalBtn} onClick={() => setEditingGoal(true)}>
          🎯 {goal} kcal goal
        </button>
      </div>

      <div style={s.card}>
        <div style={s.calRow}>
          <span style={{ fontSize: 32, fontWeight: 800, color: over ? '#c62828' : '#2e7d32' }}>
            {totalCal}
          </span>
          <span style={{ color: '#888', marginLeft: 6 }}>/ {goal} kcal</span>
        </div>
        <div style={s.barBg}>
          <div style={{ ...s.barFill, width: `${pct}%`, background: over ? '#c62828' : '#2e7d32' }} />
        </div>
        <div style={{ color: over ? '#c62828' : '#555', fontSize: 13, marginTop: 6 }}>
          {over ? `${totalCal - goal} kcal over goal` : `${goal - totalCal} kcal remaining`}
        </div>
        {entries.length > 0 && (
          <div style={s.macros}>
            <span>P: {Math.round(totalP)}g</span>
            <span>C: {Math.round(totalC)}g</span>
            <span>F: {Math.round(totalF)}g</span>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 48 }}>🥗</div>
          <div style={{ marginTop: 12, color: '#888' }}>No foods logged yet.</div>
          <div style={{ color: '#aaa', fontSize: 14 }}>Tap Scan to add food.</div>
        </div>
      ) : (
        <div style={s.list}>
          {entries.map(e => (
            <div key={e.id} style={s.item}>
              <div style={{ flex: 1 }}>
                <div style={s.itemName}>{e.productName}</div>
                <div style={s.itemDetail}>
                  {e.servingSize}g × {e.servingsConsumed}
                  {e.brand ? ` · ${e.brand}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#2e7d32' }}>{e.totalCalories} kcal</div>
                <button style={s.deleteBtn} onClick={() => handleDelete(e.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingGoal && (
        <div style={s.modalOverlay} onClick={() => setEditingGoal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>Daily Calorie Goal</div>
            <input
              style={s.modalInput}
              type="number"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.cancelBtn} onClick={() => setEditingGoal(false)}>Cancel</button>
              <button style={s.saveBtn} onClick={handleSaveGoal}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: '16px 16px 0' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title: { fontSize: 26, fontWeight: 800, color: '#212121' },
  subtitle: { fontSize: 14, color: '#888' },
  goalBtn: { background: '#e8f5e9', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 13, color: '#2e7d32', cursor: 'pointer', fontWeight: 600 },
  card: { background: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  calRow: { display: 'flex', alignItems: 'baseline', marginBottom: 10 },
  barBg: { height: 10, background: '#e0e0e0', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, transition: 'width 0.3s' },
  macros: { display: 'flex', gap: 16, marginTop: 10, color: '#555', fontSize: 13 },
  empty: { textAlign: 'center', paddingTop: 60 },
  list: { display: 'flex', flexDirection: 'column', gap: 1 },
  item: { display: 'flex', background: '#fff', padding: '12px 16px', borderBottom: '1px solid #f0f0f0', gap: 12 },
  itemName: { fontWeight: 600, color: '#212121', fontSize: 15 },
  itemDetail: { fontSize: 12, color: '#999', marginTop: 2 },
  deleteBtn: { background: 'none', border: 'none', color: '#e57373', cursor: 'pointer', fontSize: 16, marginTop: 4 },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#fff', borderRadius: 16, padding: 24, width: 300 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16, textAlign: 'center' },
  modalInput: { width: '100%', border: '2px solid #c8e6c9', borderRadius: 8, padding: 12, fontSize: 20, textAlign: 'center', marginBottom: 16, outline: 'none' },
  cancelBtn: { flex: 1, padding: 12, border: 'none', borderRadius: 8, background: '#f5f5f5', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { flex: 1, padding: 12, border: 'none', borderRadius: 8, background: '#2e7d32', color: '#fff', cursor: 'pointer', fontWeight: 600 },
};
