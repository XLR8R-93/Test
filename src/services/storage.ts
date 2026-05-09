import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodEntry, DailyGoal } from '../types';

const KEYS = {
  FOOD_LOG: 'food_log',
  DAILY_GOAL: 'daily_goal',
} as const;

const DEFAULT_GOAL: DailyGoal = { calories: 2000 };

export async function getAllEntries(): Promise<FoodEntry[]> {
  const raw = await AsyncStorage.getItem(KEYS.FOOD_LOG);
  if (!raw) return [];
  return JSON.parse(raw) as FoodEntry[];
}

export async function getEntriesForDate(date: string): Promise<FoodEntry[]> {
  const all = await getAllEntries();
  return all.filter(e => e.date === date).sort((a, b) => a.timestamp - b.timestamp);
}

export async function addEntry(entry: FoodEntry): Promise<void> {
  const all = await getAllEntries();
  all.push(entry);
  await AsyncStorage.setItem(KEYS.FOOD_LOG, JSON.stringify(all));
}

export async function deleteEntry(id: string): Promise<void> {
  const all = await getAllEntries();
  const filtered = all.filter(e => e.id !== id);
  await AsyncStorage.setItem(KEYS.FOOD_LOG, JSON.stringify(filtered));
}

export async function getUniqueDates(): Promise<string[]> {
  const all = await getAllEntries();
  const dates = [...new Set(all.map(e => e.date))];
  return dates.sort((a, b) => b.localeCompare(a));
}

export async function getDailyGoal(): Promise<DailyGoal> {
  const raw = await AsyncStorage.getItem(KEYS.DAILY_GOAL);
  if (!raw) return DEFAULT_GOAL;
  return JSON.parse(raw) as DailyGoal;
}

export async function setDailyGoal(goal: DailyGoal): Promise<void> {
  await AsyncStorage.setItem(KEYS.DAILY_GOAL, JSON.stringify(goal));
}

/**
 * Returns today's date as "YYYY-MM-DD" in LOCAL time.
 * Do not use toISOString() — it returns UTC and can give the wrong date.
 */
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
