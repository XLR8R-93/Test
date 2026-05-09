import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { FoodEntry } from '../types';
import {
  getEntriesForDate,
  deleteEntry,
  getDailyGoal,
  setDailyGoal,
  getTodayString,
  formatDateDisplay,
} from '../services/storage';
import { CalorieProgress } from '../components/CalorieProgress';
import { FoodLogItem } from '../components/FoodLogItem';

export function HomeScreen() {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [goalCalories, setGoalCalories] = useState(2000);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalInput, setGoalInput] = useState('2000');
  const today = getTodayString();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [todayEntries, goal] = await Promise.all([
          getEntriesForDate(today),
          getDailyGoal(),
        ]);
        if (active) {
          setEntries(todayEntries);
          setGoalCalories(goal.calories);
          setGoalInput(String(goal.calories));
        }
      }
      load();
      return () => { active = false; };
    }, [today])
  );

  const totalCalories = entries.reduce((sum, e) => sum + e.totalCalories, 0);
  const totalProtein = entries.reduce((sum, e) => sum + e.protein, 0);
  const totalCarbs = entries.reduce((sum, e) => sum + e.carbs, 0);
  const totalFat = entries.reduce((sum, e) => sum + e.fat, 0);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Remove this food from today\'s log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(id);
          setEntries(prev => prev.filter(e => e.id !== id));
        },
      },
    ]);
  };

  const handleSaveGoal = async () => {
    const parsed = parseInt(goalInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      await setDailyGoal({ calories: parsed });
      setGoalCalories(parsed);
    }
    setGoalModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{formatDateDisplay(today)}</Text>
        <TouchableOpacity onPress={() => setGoalModalVisible(true)}>
          <Ionicons name="settings-outline" size={22} color="#555" />
        </TouchableOpacity>
      </View>

      <CalorieProgress consumed={totalCalories} goal={goalCalories} />

      {entries.length > 0 && (
        <View style={styles.macroRow}>
          <Text style={styles.macroText}>P: {Math.round(totalProtein)}g</Text>
          <Text style={styles.macroText}>C: {Math.round(totalCarbs)}g</Text>
          <Text style={styles.macroText}>F: {Math.round(totalFat)}g</Text>
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <FoodLogItem entry={item} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="nutrition-outline" size={48} color="#c8e6c9" />
            <Text style={styles.emptyText}>No foods logged today.</Text>
            <Text style={styles.emptySubText}>Tap the Scan tab to add food.</Text>
          </View>
        }
        contentContainerStyle={entries.length === 0 ? styles.emptyList : undefined}
      />

      <Modal
        visible={goalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Daily Calorie Goal</Text>
            <TextInput
              style={styles.modalInput}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="number-pad"
              selectTextOnFocus
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setGoalModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveGoal}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  macroText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#c8e6c9',
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    textAlign: 'center',
    color: '#212121',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
  },
  saveBtn: {
    backgroundColor: '#2e7d32',
  },
  cancelBtnText: {
    color: '#555',
    fontWeight: '600',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
