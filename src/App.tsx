import { useState } from 'react';
import { View } from './types';
import { HomeView } from './views/HomeView';
import { ScanView } from './views/ScanView';
import { HistoryView } from './views/HistoryView';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFoodAdded = () => {
    setRefreshKey(k => k + 1);
    setView('home');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <div style={{ flex: 1, overflowY: view === 'scan' ? 'hidden' : 'auto' }}>
        {view === 'home' && <HomeView refreshKey={refreshKey} />}
        {view === 'scan' && <ScanView onFoodAdded={handleFoodAdded} />}
        {view === 'history' && <HistoryView />}
      </div>

      {view !== 'scan' && (
        <nav style={nav.bar}>
          <TabBtn icon="🏠" label="Home" active={view === 'home'} onClick={() => setView('home')} />
          <TabBtn icon="📷" label="Scan" active={false} onClick={() => setView('scan')} />
          <TabBtn icon="📅" label="History" active={view === 'history'} onClick={() => setView('history')} />
        </nav>
      )}
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button style={{ ...nav.tab, color: active ? '#2e7d32' : '#999' }} onClick={onClick}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: active ? 700 : 400 }}>{label}</span>
    </button>
  );
}

const nav: Record<string, React.CSSProperties> = {
  bar: { display: 'flex', borderTop: '1px solid #e0e0e0', background: '#fff', paddingBottom: 'env(safe-area-inset-bottom)' },
  tab: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer' },
};
