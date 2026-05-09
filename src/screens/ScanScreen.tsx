import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../types';
import { fetchProductByBarcode } from '../services/openFoodFacts';

type ScanNavProp = StackNavigationProp<RootStackParamList, 'MainTabs'>;

export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigation = useNavigation<ScanNavProp>();
  const lastScannedRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setScanning(true);
      lastScannedRef.current = null;
      setErrorMsg(null);
    }, [])
  );

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (!scanning || loading || data === lastScannedRef.current) return;

    lastScannedRef.current = data;
    setScanning(false);
    setLoading(true);
    setErrorMsg(null);

    try {
      const product = await fetchProductByBarcode(data);
      if (!product) {
        setErrorMsg('Product not found in Open Food Facts database.');
        setScanning(true);
        return;
      }
      navigation.navigate('FoodDetail', { barcode: data, product });
    } catch {
      setErrorMsg('Network error. Check your connection and try again.');
      setScanning(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setErrorMsg(null);
    lastScannedRef.current = null;
    setScanning(true);
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="camera-outline" size={64} color="#c8e6c9" />
        <Text style={styles.permissionText}>Camera access is required to scan barcodes.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
        }}
      />

      <View style={styles.overlay}>
        <View style={styles.topDim} />
        <View style={styles.middleRow}>
          <View style={styles.sideDim} />
          <View style={styles.scanBox}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.sideDim} />
        </View>
        <View style={styles.bottomDim}>
          {loading && (
            <View style={styles.statusCard}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.statusText}>Looking up product...</Text>
            </View>
          )}
          {!loading && errorMsg && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
                <Text style={styles.retryText}>Tap to scan again</Text>
              </TouchableOpacity>
            </View>
          )}
          {!loading && !errorMsg && (
            <Text style={styles.hintText}>Point the camera at a food barcode</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = '#fff';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    padding: 32,
  },
  permissionText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    marginTop: 24,
    backgroundColor: '#2e7d32',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  topDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 220,
  },
  sideDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  scanBox: {
    width: 260,
    height: 220,
  },
  bottomDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 15,
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(198,40,40,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    textAlign: 'center',
  },
});
