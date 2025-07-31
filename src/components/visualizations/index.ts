// Habit tracking visualization components
export { StreakProgress } from '../StreakProgress';
export { HabitHeatmap } from '../HabitHeatmap';
export { HabitStats } from '../HabitStats';
export { HabitDashboard } from '../HabitDashboard';

// Type definitions for visualization components
export interface HeatmapData {
  date: string; // YYYY-MM-DD format
  completed: boolean;
  streak?: number;
}

export interface HabitStatsData {
  period: string;
  completed: number;
  goal: number;
  totalAttempts: number;
  currentStreak: number;
  bestStreak: number;
  successRate: number;
}