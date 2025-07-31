import React, { useMemo } from 'react';
import { Chain, CompletionHistory } from '../types';

// Ultra-lightweight alternative for resource-constrained environments
// Uses minimal processing and rendering for maximum performance

interface SimplifiedHabitDashboardProps {
  chain: Chain;
  completionHistory: CompletionHistory[];
  className?: string;
}

export const SimplifiedHabitDashboard: React.FC<SimplifiedHabitDashboardProps> = ({
  chain,
  completionHistory,
  className = ""
}) => {
  // Minimal calculations - only essential metrics
  const stats = useMemo(() => {
    const chainHistory = completionHistory.filter(h => h.chainId === chain.id);
    const successCount = chainHistory.filter(h => h.wasSuccessful).length;
    const successRate = chainHistory.length > 0 ? Math.round((successCount / chainHistory.length) * 100) : 0;
    
    return {
      totalAttempts: chainHistory.length,
      successCount,
      successRate
    };
  }, [chain.id, completionHistory]);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-600 ${className}`}>
      {/* Minimal header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
          {chain.name}
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          {chain.trigger}
        </p>
      </div>

      {/* Essential stats only */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-500">
            {chain.currentStreak}
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            当前连击
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">
            {stats.successRate}%
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            成功率
          </div>
        </div>
      </div>

      {/* Simple progress bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
          <div 
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(stats.successRate, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-slate-400">
          <span>成功 {stats.successCount}</span>
          <span>总计 {stats.totalAttempts}</span>
        </div>
      </div>
    </div>
  );
};

// Minimal analytics view for low-spec devices
interface SimplifiedAnalyticsViewProps {
  chains: Chain[];
  completionHistory: CompletionHistory[];
  onBack: () => void;
}

export const SimplifiedAnalyticsView: React.FC<SimplifiedAnalyticsViewProps> = ({
  chains,
  completionHistory,
  onBack,
}) => {
  // Single calculation for all stats to minimize processing
  const overallStats = useMemo(() => {
    const totalSuccessful = completionHistory.filter(h => h.wasSuccessful).length;
    const totalAttempts = completionHistory.length;
    const successRate = totalAttempts > 0 ? Math.round((totalSuccessful / totalAttempts) * 100) : 0;
    
    return {
      totalChains: chains.length,
      totalStreak: chains.reduce((sum, c) => sum + c.currentStreak, 0),
      totalSuccessful,
      successRate
    };
  }, [chains, completionHistory]);

  if (chains.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
        <button 
          onClick={onBack}
          className="mb-4 text-primary-500 hover:text-primary-600"
        >
          ← 返回
        </button>
        <div className="text-center py-20">
          <p className="text-gray-600 dark:text-slate-400">暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      <button 
        onClick={onBack}
        className="mb-4 text-primary-500 hover:text-primary-600"
      >
        ← 返回
      </button>
      
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">
        数据概览
      </h1>

      {/* Overall stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-xl font-bold text-primary-500">{overallStats.totalChains}</div>
          <div className="text-sm text-gray-600 dark:text-slate-400">习惯总数</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-xl font-bold text-orange-500">{overallStats.totalStreak}</div>
          <div className="text-sm text-gray-600 dark:text-slate-400">总连击</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-xl font-bold text-green-500">{overallStats.totalSuccessful}</div>
          <div className="text-sm text-gray-600 dark:text-slate-400">成功次数</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-xl font-bold text-blue-500">{overallStats.successRate}%</div>
          <div className="text-sm text-gray-600 dark:text-slate-400">成功率</div>
        </div>
      </div>

      {/* Simplified chain list */}
      <div className="space-y-4">
        {chains.map(chain => (
          <SimplifiedHabitDashboard
            key={chain.id}
            chain={chain}
            completionHistory={completionHistory}
          />
        ))}
      </div>
    </div>
  );
};