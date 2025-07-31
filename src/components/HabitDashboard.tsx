import React from 'react';
import { Chain, CompletionHistory } from '../types';
import { StreakProgress } from './StreakProgress';
import { HabitHeatmap } from './HabitHeatmap';
import { HabitStats } from './HabitStats';
import { useAnalyticsCache } from '../hooks/useAnalyticsCache';

interface HabitDashboardProps {
  chain: Chain;
  completionHistory: CompletionHistory[];
  weeklyGoal?: number;
  monthlyGoal?: number;
  className?: string;
}

export const HabitDashboard: React.FC<HabitDashboardProps> = ({
  chain,
  completionHistory,
  weeklyGoal = 7,
  monthlyGoal = 30,
  className = ""
}) => {
  // Use cached analytics data - replaces all previous O(n) filtering operations
  // with memoized results that persist across re-renders
  const {
    weeklyCompletions,
    monthlyCompletions,
    successRate,
    bestStreak,
    heatmapData,
    chainHistory
  } = useAnalyticsCache(chain, completionHistory);

  // Pre-calculate date boundaries once to avoid repeated calculations
  const now = Date.now();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  
  // Use cached chainHistory to avoid re-filtering the entire completionHistory
  const weeklyAttempts = chainHistory.filter(h => new Date(h.completedAt) >= oneWeekAgo).length;
  const monthlyAttempts = chainHistory.filter(h => new Date(h.completedAt) >= oneMonthAgo).length;

  const weeklyStats = {
    period: "本周",
    completed: weeklyCompletions,
    goal: weeklyGoal,
    totalAttempts: weeklyAttempts,
    currentStreak: chain.currentStreak,
    bestStreak,
    successRate
  };

  const monthlyStats = {
    period: "本月",
    completed: monthlyCompletions,
    goal: monthlyGoal,
    totalAttempts: monthlyAttempts,
    currentStreak: chain.currentStreak,
    bestStreak,
    successRate
  };

  // Use consistent date calculation with the cached heatmap data
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100">
              {chain.name} 数据看板
            </h2>
            <p className="text-gray-600 dark:text-slate-400 mt-1 font-mono">
              {chain.trigger}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-500 font-mono">
                #{chain.currentStreak}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 font-chinese">
                当前连击
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500 font-mono">
                {chain.totalCompletions}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 font-chinese">
                总完成数
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-600 flex justify-center">
          <StreakProgress
            completed={weeklyCompletions}
            goal={weeklyGoal}
            title="本周目标"
            size={100}
          />
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-600 flex justify-center">
          <StreakProgress
            completed={monthlyCompletions}
            goal={monthlyGoal}
            title="本月目标"
            size={100}
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-600 flex justify-center">
          <StreakProgress
            completed={chain.currentStreak}
            goal={Math.max(bestStreak, 10)}
            title="连击记录"
            size={100}
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-600 flex justify-center">
          <StreakProgress
            completed={successRate}
            goal={100}
            title="成功率"
            size={100}
          />
        </div>
      </div>

      {/* Statistics panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HabitStats data={weeklyStats} />
        <HabitStats data={monthlyStats} />
      </div>

      {/* Calendar heatmap */}
      <HabitHeatmap
        data={heatmapData}
        title={`${chain.name} - 最近30天完成情况`}
        startDate={thirtyDaysAgo}
        endDate={new Date()}
      />

      {/* Additional insights */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-600">
        <h3 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100 mb-4">
          习惯洞察
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 font-mono">
              {Math.round(chain.duration / 60)}h {chain.duration % 60}m
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400 font-chinese">
              单次用时
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 font-mono">
              {chain.totalFailures}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400 font-chinese">
              失败次数
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 font-mono">
              {chain.auxiliaryStreak}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400 font-chinese">
              预约链记录
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};