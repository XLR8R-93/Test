import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  consumed: number;
  goal: number;
}

export function CalorieProgress({ consumed, goal }: Props) {
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const remaining = Math.max(0, goal - consumed);
  const overGoal = consumed > goal;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{consumed} kcal consumed</Text>
        <Text style={styles.label}>Goal: {goal} kcal</Text>
      </View>
      <View style={styles.barBg}>
        <View
          style={[
            styles.barFill,
            { width: `${Math.round(pct * 100)}%` as `${number}%` },
            overGoal && styles.barOverGoal,
          ]}
        />
      </View>
      <Text style={[styles.remaining, overGoal && styles.overGoalText]}>
        {overGoal
          ? `${consumed - goal} kcal over goal`
          : `${remaining} kcal remaining`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    backgroundColor: '#f1f8e9',
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  barBg: {
    height: 10,
    backgroundColor: '#c8e6c9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    backgroundColor: '#2e7d32',
    borderRadius: 5,
  },
  barOverGoal: {
    backgroundColor: '#c62828',
  },
  remaining: {
    marginTop: 6,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  overGoalText: {
    color: '#c62828',
    fontWeight: '600',
  },
});
