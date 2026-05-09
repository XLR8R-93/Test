import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodEntry } from '../types';

interface Props {
  entry: FoodEntry;
  onDelete: (id: string) => void;
}

export function FoodLogItem({ entry, onDelete }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{entry.productName}</Text>
        <Text style={styles.details}>
          {entry.servingSize}g × {entry.servingsConsumed} | P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g
        </Text>
        {entry.brand ? <Text style={styles.brand}>{entry.brand}</Text> : null}
      </View>
      <View style={styles.right}>
        <Text style={styles.calories}>{entry.totalCalories}</Text>
        <Text style={styles.kcalLabel}>kcal</Text>
        <TouchableOpacity
          onPress={() => onDelete(entry.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#c62828" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  details: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  brand: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 1,
  },
  right: {
    alignItems: 'center',
    gap: 2,
  },
  calories: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2e7d32',
  },
  kcalLabel: {
    fontSize: 11,
    color: '#757575',
  },
});
