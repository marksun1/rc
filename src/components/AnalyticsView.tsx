import React, { useState } from 'react';
import { Chain, CompletionHistory } from '../types';
import { HabitDashboard } from './HabitDashboard';
import { StreakProgress } from './StreakProgress';
import { HabitStats } from './HabitStats';
import { ArrowLeft, BarChart3 } from 'lucide-react';

interface AnalyticsViewProps {
  chains: Chain[];
  completionHistory: CompletionHistory[];
  onBack: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  chains,
  completionHistory,
  onBack,
}) => {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(
    chains.length > 0 ? chains[0].id : null
  );

  const selectedChain = chains.find(c => c.id === selectedChainId);

  // Calculate overall statistics
  const calculateOverallStats = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyCompletions = completionHistory.filter(
      h => h.wasSuccessful && new Date(h.completedAt) >= oneWeekAgo
    ).length;

    const monthlyCompletions = completionHistory.filter(
      h => h.wasSuccessful && new Date(h.completedAt) >= oneMonthAgo
    ).length;

    const totalSuccess = completionHistory.filter(h => h.wasSuccessful).length;
    const totalAttempts = completionHistory.length;
    const successRate = totalAttempts > 0 ? Math.round((totalSuccess / totalAttempts) * 100) : 0;

    return {
      weeklyCompletions,
      monthlyCompletions,
      successRate,
      totalSuccess,
      totalAttempts
    };
  };

  const overallStats = calculateOverallStats();

  if (chains.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-chinese">返回</span>
            </button>
          </div>
          
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-3xl bg-gray-200 dark:bg-slate-700 flex items-center justify-center mx-auto mb-8">
              <BarChart3 size={32} className="text-gray-400 dark:text-slate-500" />
            </div>
            <h2 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-4">
              暂无数据
            </h2>
            <p className="text-gray-600 dark:text-slate-400 font-chinese">
              创建一些习惯链后就可以查看分析数据了
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-chinese">返回</span>
            </button>
            <div>
              <h1 className="text-3xl font-bold font-chinese text-gray-900 dark:text-slate-100">
                数据分析
              </h1>
              <p className="text-gray-600 dark:text-slate-400 font-mono text-sm tracking-wide">
                ANALYTICS DASHBOARD
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <BarChart3 size={24} className="text-primary-500" />
            <span className="text-primary-500 font-chinese font-medium">
              Momentum Analytics
            </span>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="mb-8">
          <h2 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-4">
            整体概览
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-600 flex justify-center">
              <StreakProgress
                completed={overallStats.weeklyCompletions}
                goal={chains.length * 7} // Assume 1 per day per chain
                title="本周完成"
                size={80}
              />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-600 flex justify-center">
              <StreakProgress
                completed={overallStats.monthlyCompletions}
                goal={chains.length * 30}
                title="本月完成"
                size={80}
              />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-600 flex justify-center">
              <StreakProgress
                completed={overallStats.successRate}
                goal={100}
                title="整体成功率"
                size={80}
              />
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-200 dark:border-slate-600 flex justify-center">
              <StreakProgress
                completed={chains.reduce((sum, c) => sum + c.currentStreak, 0)}
                goal={chains.length * 10} // Assume 10 days as good streak
                title="总连击数"
                size={80}
              />
            </div>
          </div>
        </div>

        {/* Chain selector */}
        <div className="mb-6">
          <h2 className="text-xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-4">
            详细分析
          </h2>
          <div className="flex flex-wrap gap-2">
            {chains.map(chain => (
              <button
                key={chain.id}
                onClick={() => setSelectedChainId(chain.id)}
                className={`px-4 py-2 rounded-xl font-chinese transition-all duration-200 ${
                  selectedChainId === chain.id
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                {chain.name}
              </button>
            ))}
          </div>
        </div>

        {/* Selected chain dashboard */}
        {selectedChain && (
          <HabitDashboard
            chain={selectedChain}
            completionHistory={completionHistory}
            weeklyGoal={7}
            monthlyGoal={30}
          />
        )}
      </div>
    </div>
  );
};