import { FoodEntry, DailyGoal } from '../types';

const FOOD_LOG_KEY = 'food_log';
const GOAL_KEY = 'daily_goal';
const DEFAULT_GOAL = 2000;

export function getAllEntries(): FoodEntry[] {
  const raw = localStorage.getItem(FOOD_LOG_KEY);
  return raw ? (JSON.parse(raw) as FoodEntry[]) : [];
}

export function getEntriesForDate(date: string): FoodEntry[] {
  return getAllEntries()
    .filter(e => e.date === date)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function addEntry(entry: FoodEntry): void {
  const all = getAllEntries();
  all.push(entry);
  localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(all));
}

export function deleteEntry(id: string): void {
  const filtered = getAllEntries().filter(e => e.id !== id);
  localStorage.setItem(FOOD_LOG_KEY, JSON.stringify(filtered));
}

export function getUniquePastDates(today: string): string[] {
  const dates = [...new Set(getAllEntries().map(e => e.date))].filter(d => d !== today);
  return dates.sort((a, b) => b.localeCompare(a));
}

export function getDailyGoal(): number {
  const raw = localStorage.getItem(GOAL_KEY);
  return raw ? (JSON.parse(raw) as DailyGoal).calories : DEFAULT_GOAL;
}

export function setDailyGoal(calories: number): void {
  localStorage.setItem(GOAL_KEY, JSON.stringify({ calories }));
}

export function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
