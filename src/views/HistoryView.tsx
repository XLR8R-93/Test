import { useState, useEffect } from 'react';
import { getAllEntries, getUniquePastDates, getDailyGoal, formatDate, getTodayString } from '../services/storage';

export function HistoryView() {
  const [days, setDays] = useState<{ date: string; cal: number; count: number }[]>([]);
  const [goal, setGoal] = useState(2000);
  const today = getTodayString();

  useEffect(() => {
    const all = getAllEntries();
    const dates = getUniquePastDates(today);
    const goal = getDailyGoal();
    setGoal(goal);
    setDays(dates.map(date => ({
      date,
      cal: Math.round(all.filter(e => e.date === date).reduce((s, e) => s + e.totalCalories, 0)),
      count: all.filter(e => e.date === date).length,
    })));
  }, [today]);

  return (
    <div style={s.container}>
      <div style={s.title}>History</div>
      {days.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize: 48 }}>📅</div>
          <div style={{ marginTop: 12, color: '#888' }}>No history yet.</div>
          <div style={{ color: '#aaa', fontSize: 14 }}>Past days will appear here.</div>
        </div>
      ) : (
        <div>
          {days.map(d => {
            const over = d.cal > goal;
            const pct = Math.min(100, Math.round((d.cal / goal) * 100));
            return (
              <div key={d.date} style={s.row}>
                <div style={{ flex: 1 }}>
                  <div style={s.rowDate}>{formatDate(d.date)}</div>
                  <div style={s.rowSub}>{d.count} item{d.count !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: over ? '#c62828' : '#2e7d32' }}>{d.cal} kcal</div>
                  <div style={{ fontSize: 12, color: over ? '#c62828' : '#888' }}>
                    {over ? `+${pct - 100}% over` : `${pct}% of goal`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: '16px 0 0' },
  title: { fontSize: 26, fontWeight: 800, color: '#212121', padding: '0 16px 12px' },
  empty: { textAlign: 'center', paddingTop: 80 },
  row: { display: 'flex', padding: '14px 16px', borderBottom: '1px solid #f0f0f0', background: '#fff', alignItems: 'center' },
  rowDate: { fontWeight: 600, color: '#212121', fontSize: 15 },
  rowSub: { fontSize: 13, color: '#aaa', marginTop: 2 },
};
