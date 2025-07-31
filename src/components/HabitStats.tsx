import React from 'react';
import { TrendingUp, Target, Calendar, Zap } from 'lucide-react';

interface HabitStatsData {
  period: string; // e.g., "本周", "本月"
  completed: number;
  goal: number;
  totalAttempts: number;
  currentStreak: number;
  bestStreak: number;
  successRate: number; // 0-100
}

interface HabitStatsProps {
  data: HabitStatsData;
  className?: string;
}

export const HabitStats: React.FC<HabitStatsProps> = ({
  data,
  className = ""
}) => {
  const { period, completed, goal, totalAttempts, currentStreak, bestStreak, successRate } = data;
  const completionRate = Math.round((completed / goal) * 100);
  
  const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
  }> = ({ icon, title, value, subtitle, color }) => (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 border border-opacity-20`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-white/80 text-sm font-chinese font-medium">
          {title}
        </div>
        <div className="text-white/60">
          {icon}
        </div>
      </div>
      <div className="text-white text-2xl font-bold font-mono mb-1">
        {value}
      </div>
      {subtitle && (
        <div className="text-white/70 text-xs font-chinese">
          {subtitle}
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-600 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100">
          {period}统计
        </h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-slate-400">
          <Calendar size={16} />
          <span className="font-chinese">数据概览</span>
        </div>
      </div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Target size={18} />}
          title="完成率"
          value={`${completionRate}%`}
          subtitle={`${completed} / ${goal} 次`}
          color="from-primary-500 to-primary-600"
        />
        
        <StatCard
          icon={<Zap size={18} />}
          title="当前连击"
          value={currentStreak}
          subtitle="天"
          color="from-orange-500 to-orange-600"
        />
        
        <StatCard
          icon={<TrendingUp size={18} />}
          title="成功率"
          value={`${successRate}%`}
          subtitle={`${totalAttempts} 次尝试`}
          color="from-green-500 to-green-600"
        />
        
        <StatCard
          icon={<Calendar size={18} />}
          title="最佳记录"
          value={bestStreak}
          subtitle="天连击"
          color="from-blue-500 to-blue-600"
        />
      </div>

      {/* Progress bar */}
      <div className="bg-gray-50 dark:bg-slate-700 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-chinese font-medium text-gray-700 dark:text-slate-300">
            {period}目标进度
          </span>
          <span className="text-sm font-mono font-bold text-primary-500">
            {completionRate}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(completionRate, 100)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500 dark:text-slate-400 font-chinese">
            已完成 {completed} 次
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400 font-chinese">
            目标 {goal} 次
          </span>
        </div>
      </div>

      {/* Achievement badge */}
      {completionRate >= 100 && (
        <div className="mt-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-yellow-900 font-bold font-chinese">
            目标达成！
          </div>
          <div className="text-yellow-800 text-xs font-chinese">
            恭喜完成{period}目标
          </div>
        </div>
      )}
      
      {/* Streak status */}
      {currentStreak > 0 && (
        <div className="mt-4 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-3 border border-orange-200 dark:border-orange-700">
          <div className="text-orange-500 text-lg">🔥</div>
          <div className="text-orange-700 dark:text-orange-300 font-chinese text-sm font-medium">
            连续 {currentStreak} 天保持习惯！
          </div>
        </div>
      )}
    </div>
  );
};