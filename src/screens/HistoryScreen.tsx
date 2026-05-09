import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getAllEntries, getUniqueDates, getDailyGoal, formatDateDisplay, getTodayString } from '../services/storage';

interface DaySummary {
  date: string;
  totalCalories: number;
  entryCount: number;
}

export function HistoryScreen() {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [goalCalories, setGoalCalories] = useState(2000);
  const today = getTodayString();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [allEntries, dates, goal] = await Promise.all([
          getAllEntries(),
          getUniqueDates(),
          getDailyGoal(),
        ]);
        if (!active) return;

        const pastDates = dates.filter(d => d !== today);
        const summaries: DaySummary[] = pastDates.map(date => {
          const dayEntries = allEntries.filter(e => e.date === date);
          return {
            date,
            totalCalories: Math.round(dayEntries.reduce((s, e) => s + e.totalCalories, 0)),
            entryCount: dayEntries.length,
          };
        });
        setDays(summaries);
        setGoalCalories(goal.calories);
      }
      load();
      return () => { active = false; };
    }, [today])
  );

  const renderDay = ({ item }: { item: DaySummary }) => {
    const pct = Math.min(100, Math.round((item.totalCalories / goalCalories) * 100));
    const overGoal = item.totalCalories > goalCalories;
    return (
      <View style={styles.dayRow}>
        <View style={styles.dayInfo}>
          <Text style={styles.dayDate}>{formatDateDisplay(item.date)}</Text>
          <Text style={styles.daySubtitle}>{item.entryCount} item{item.entryCount !== 1 ? 's' : ''} logged</Text>
        </View>
        <View style={styles.dayRight}>
          <Text style={[styles.dayCalories, overGoal && styles.overGoal]}>
            {item.totalCalories} kcal
          </Text>
          <Text style={[styles.dayPct, overGoal && styles.overGoal]}>
            {overGoal ? `+${pct - 100}% over` : `${pct}% of goal`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>History</Text>
      <FlatList
        data={days}
        keyExtractor={item => item.date}
        renderItem={renderDay}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#c8e6c9" />
            <Text style={styles.emptyText}>No history yet.</Text>
            <Text style={styles.emptySubText}>Past days will appear here.</Text>
          </View>
        }
        contentContainerStyle={days.length === 0 ? styles.emptyList : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#212121',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  dayInfo: {
    flex: 1,
  },
  dayDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  daySubtitle: {
    fontSize: 13,
    color: '#9e9e9e',
    marginTop: 2,
  },
  dayRight: {
    alignItems: 'flex-end',
  },
  dayCalories: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2e7d32',
  },
  dayPct: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  overGoal: {
    color: '#c62828',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyList: {
    flex: 1,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  emptySubText: {
    marginTop: 4,
    fontSize: 14,
    color: '#9e9e9e',
  },
});
