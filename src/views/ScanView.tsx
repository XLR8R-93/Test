import { useEffect, useRef, useState } from 'react';
import { OFFProduct } from '../types';
import { fetchProductByBarcode } from '../services/openFoodFacts';
import { FoodDetailView } from './FoodDetailView';

interface Props {
  onFoodAdded: () => void;
}

export function ScanView({ onFoodAdded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef(true);
  const lastScanned = useRef('');
  const [phase, setPhase] = useState('Requesting camera...');
  const [product, setProduct] = useState<OFFProduct | null>(null);
  const [barcode, setBarcode] = useState('');
  const [found, setFound] = useState(false);

  useEffect(() => {
    activeRef.current = true;
    let stream: MediaStream | null = null;
    let rafId: number;

    async function handleBarcode(code: string) {
      setPhase('Found barcode, looking up...');
      try {
        const p = await fetchProductByBarcode(code);
        if (!activeRef.current) return;
        if (!p) {
          setPhase('Product not found — scan another');
          lastScanned.current = '';
        } else {
          setBarcode(code);
          setProduct(p);
          setFound(true);
        }
      } catch {
        if (activeRef.current) {
          setPhase('Network error — check connection and retry');
          lastScanned.current = '';
        }
      }
    }

    async function start() {
      try {
        setPhase('Requesting camera...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });

        if (!activeRef.current) return;
        setPhase('Camera granted, starting video...');

        const video = videoRef.current!;
        video.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = reject;
          setTimeout(reject, 8000); // 8s timeout
        });

        await video.play();
        if (!activeRef.current) return;
        setPhase('Scanning — point at a barcode');

        if (!('BarcodeDetector' in window)) {
          setPhase('Error: BarcodeDetector not supported. Please use Chrome on Android.');
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
        });

        const scan = async () => {
          if (!activeRef.current) return;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const codes: any[] = await detector.detect(video);
            if (codes.length > 0) {
              const code: string = codes[0].rawValue;
              if (code && code !== lastScanned.current) {
                lastScanned.current = code;
                await handleBarcode(code);
                return;
              }
            }
          } catch { /* frame not ready yet */ }
          rafId = requestAnimationFrame(scan);
        };

        scan();
      } catch (err) {
        if (activeRef.current) {
          setPhase(`Camera error: ${err instanceof Error ? err.message : String(err)}`);
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

  if (found && product) {
    return (
      <FoodDetailView
        product={product}
        barcode={barcode}
        onAdded={() => { setFound(false); setProduct(null); lastScanned.current = ''; setPhase('Scanning — point at a barcode'); onFoodAdded(); }}
        onBack={() => { setFound(false); setProduct(null); lastScanned.current = ''; setPhase('Scanning — point at a barcode'); }}
      />
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', background: '#000' }}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Scan frame */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 260, height: 200,
          border: '2px solid rgba(255,255,255,0.8)',
          borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
        }} />
      </div>

      {/* Status bar at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.7)',
        color: '#fff', textAlign: 'center',
        padding: '16px 24px 32px',
        fontSize: 15,
      }}>
        {phase}
      </div>
    </div>
  );
}
