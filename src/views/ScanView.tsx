import { useEffect, useRef, useState } from 'react';
import { OFFProduct } from '../types';
import { fetchProductByBarcode } from '../services/openFoodFacts';
import { FoodDetailView } from './FoodDetailView';

interface Props {
  onFoodAdded: () => void;
}

export function ScanView({ onFoodAdded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'scanning' | 'loading' | 'error' | 'found'>('scanning');
  const [errorMsg, setErrorMsg] = useState('');
  const [product, setProduct] = useState<OFFProduct | null>(null);
  const [barcode, setBarcode] = useState('');
  const activeRef = useRef(true);
  const lastScanned = useRef('');

  useEffect(() => {
    activeRef.current = true;
    let stream: MediaStream | null = null;
    let rafId: number;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        });

        if (!activeRef.current) return;

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        if (!activeRef.current) return;

        if (!('BarcodeDetector' in window)) {
          setErrorMsg('Barcode scanning is not supported in this browser. Try Chrome on Android.');
          setStatus('error');
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
        });

        const scan = async () => {
          if (!activeRef.current) return;
          if (video.readyState >= 2) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const barcodes: any[] = await detector.detect(video);
              if (barcodes.length > 0) {
                const code: string = barcodes[0].rawValue;
                if (code && code !== lastScanned.current) {
                  lastScanned.current = code;
                  await handleBarcode(code);
                  return;
                }
              }
            } catch { /* frame not ready */ }
          }
          rafId = requestAnimationFrame(scan);
        };

        scan();
      } catch {
        if (activeRef.current) {
          setErrorMsg('Could not access camera. Please allow camera permission and refresh the page.');
          setStatus('error');
        }
      }
    }

    async function handleBarcode(code: string) {
      setStatus('loading');
      try {
        const p = await fetchProductByBarcode(code);
        if (!activeRef.current) return;
        if (!p) {
          setErrorMsg('Product not found. Try another barcode.');
          setStatus('error');
          lastScanned.current = '';
        } else {
          setBarcode(code);
          setProduct(p);
          setStatus('found');
        }
      } catch {
        if (activeRef.current) {
          setErrorMsg('Network error. Check your connection.');
          setStatus('error');
          lastScanned.current = '';
        }
      }
    }

    start();

    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  if (status === 'found' && product) {
    return (
      <FoodDetailView
        product={product}
        barcode={barcode}
        onAdded={() => { setStatus('scanning'); setProduct(null); lastScanned.current = ''; onFoodAdded(); }}
        onBack={() => { setStatus('scanning'); setProduct(null); lastScanned.current = ''; }}
      />
    );
  }

  return (
    <div style={s.container}>
      <video ref={videoRef} style={s.video} muted playsInline autoPlay />

      <div style={s.overlay}>
        <div style={s.topDim} />
        <div style={s.middle}>
          <div style={s.sideDim} />
          <div style={s.box}>
            <div style={{ ...s.corner, top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }} />
            <div style={{ ...s.corner, top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }} />
            <div style={{ ...s.corner, bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }} />
            <div style={{ ...s.corner, bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }} />
          </div>
          <div style={s.sideDim} />
        </div>
        <div style={s.bottomDim}>
          {status === 'scanning' && <div style={s.hint}>Point camera at a food barcode</div>}
          {status === 'loading' && <div style={s.pill}>Looking up product...</div>}
          {status === 'error' && (
            <div style={s.errorCard}>
              <div style={{ color: '#fff', marginBottom: 10 }}>{errorMsg}</div>
              <button style={s.retryBtn} onClick={() => { setStatus('scanning'); lastScanned.current = ''; }}>
                Tap to scan again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { position: 'relative', width: '100%', height: '100dvh', background: '#000', overflow: 'hidden' },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  overlay: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' },
  topDim: { flex: 1, background: 'rgba(0,0,0,0.5)' },
  middle: { display: 'flex', height: 200 },
  sideDim: { flex: 1, background: 'rgba(0,0,0,0.5)' },
  box: { width: 260, height: 200, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#fff', borderStyle: 'solid', borderWidth: 0 },
  bottomDim: { flex: 1, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 24, paddingInline: 24 },
  hint: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  pill: { background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '10px 20px', borderRadius: 20, fontSize: 15 },
  errorCard: { background: 'rgba(198,40,40,0.9)', padding: 16, borderRadius: 12, textAlign: 'center', width: '100%' },
  retryBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
};
