import { useMemo } from 'react';
import { Chain, CompletionHistory } from '../types';

// Cache configuration - keeps computed results in memory
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL for analytics cache
const analyticsCache = new Map<string, { data: any; timestamp: number }>();

interface ProcessedAnalytics {
  weeklyCompletions: number;
  monthlyCompletions: number;
  successRate: number;
  bestStreak: number;
  heatmapData: Array<{ date: string; completed: boolean; streak?: number }>;
  chainHistory: CompletionHistory[];
}

export const useAnalyticsCache = (
  chain: Chain,
  completionHistory: CompletionHistory[]
): ProcessedAnalytics => {
  // Create cache key based on chain ID and history length
  // Using history length as version indicator - lightweight but effective
  const cacheKey = `${chain.id}-${completionHistory.length}-${chain.currentStreak}`;
  
  return useMemo(() => {
    // Check cache first - O(1) lookup
    const cached = analyticsCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
    
    // Filter once, reuse everywhere - O(n) becomes O(1) for subsequent operations
    const chainHistory = completionHistory.filter(h => h.chainId === chain.id);
    
    // Pre-calculate date boundaries to avoid repeated date calculations
    const now_date = new Date();
    const oneWeekAgo = new Date(now_date.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now_date.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now_date.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Batch process all metrics in single pass - O(n) instead of O(4n)
    let weeklyCompletions = 0;
    let monthlyCompletions = 0;
    let successfulCount = 0;
    
    // Single loop for all date-based calculations
    for (const history of chainHistory) {
      const historyDate = new Date(history.completedAt);
      
      if (history.wasSuccessful) {
        successfulCount++;
        
        if (historyDate >= oneWeekAgo) {
          weeklyCompletions++;
        }
        if (historyDate >= oneMonthAgo) {
          monthlyCompletions++;
        }
      }
    }
    
    // Calculate success rate
    const successRate = chainHistory.length > 0 
      ? Math.round((successfulCount / chainHistory.length) * 100) 
      : 0;
    
    // Best streak calculation (simplified - could be enhanced with historical data)
    const bestStreak = Math.max(chain.currentStreak, chain.auxiliaryStreak);
    
    // Generate optimized heatmap data - pre-allocate array size
    const heatmapData = generateOptimizedHeatmapData(chainHistory, thirtyDaysAgo, now_date);
    
    const result: ProcessedAnalytics = {
      weeklyCompletions,
      monthlyCompletions,
      successRate,
      bestStreak,
      heatmapData,
      chainHistory
    };
    
    // Cache the result with timestamp
    analyticsCache.set(cacheKey, { data: result, timestamp: now });
    
    // Cleanup old cache entries to prevent memory leaks
    // Only clean up occasionally to avoid performance impact
    if (Math.random() < 0.1) { // 10% chance of cleanup
      cleanupCache(now);
    }
    
    return result;
  }, [cacheKey, chain, completionHistory]);
};

// Optimized heatmap generation with pre-allocated arrays
function generateOptimizedHeatmapData(
  chainHistory: CompletionHistory[],
  startDate: Date,
  endDate: Date
) {
  // Pre-calculate the number of days for array allocation
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const heatmapData = new Array(dayCount);
  
  // Create a map for O(1) history lookup instead of O(n) for each day
  const historyMap = new Map<string, CompletionHistory>();
  chainHistory.forEach(h => {
    const dateKey = h.completedAt.toISOString().split('T')[0];
    historyMap.set(dateKey, h);
  });
  
  // Generate heatmap data with optimized lookups
  const current = new Date(startDate);
  let index = 0;
  
  while (current <= endDate && index < dayCount) {
    const dateStr = current.toISOString().split('T')[0];
    const historyEntry = historyMap.get(dateStr);
    
    heatmapData[index] = {
      date: dateStr,
      completed: historyEntry?.wasSuccessful || false,
      streak: historyEntry ? undefined : undefined // Could add streak tracking here
    };
    
    current.setDate(current.getDate() + 1);
    index++;
  }
  
  return heatmapData;
}

// Cleanup function to prevent memory leaks
function cleanupCache(currentTime: number) {
  for (const [key, value] of analyticsCache.entries()) {
    if ((currentTime - value.timestamp) > CACHE_TTL) {
      analyticsCache.delete(key);
    }
  }
}

// Export for manual cache clearing if needed
export const clearAnalyticsCache = () => {
  analyticsCache.clear();
};