// Ultra-lightweight storage adapter for minimal resource usage
// Uses only essential operations with minimal memory footprint

import { Chain, ScheduledSession, ActiveSession, CompletionHistory } from '../types';

// Simplified storage interface with minimal operations
export class LightweightStorage {
  private cacheTimeout = 30000; // 30 seconds cache
  private cache = new Map<string, { data: any; timestamp: number }>();

  // Minimal caching to reduce repeated operations
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    // Limit cache size to prevent memory issues
    if (this.cache.size > 10) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Chains operations - minimal functionality
  async getChains(): Promise<Chain[]> {
    const cached = this.getCached<Chain[]>('chains');
    if (cached) return cached;

    try {
      const data = localStorage.getItem('momentum_chains');
      const chains = data ? JSON.parse(data) : [];
      
      // Convert date strings back to Date objects
      const processedChains = chains.map((chain: any) => ({
        ...chain,
        createdAt: new Date(chain.createdAt),
        lastCompletedAt: chain.lastCompletedAt ? new Date(chain.lastCompletedAt) : undefined,
      }));

      this.setCache('chains', processedChains);
      return processedChains;
    } catch (error) {
      console.error('Failed to load chains:', error);
      return [];
    }
  }

  async saveChains(chains: Chain[]): Promise<void> {
    try {
      localStorage.setItem('momentum_chains', JSON.stringify(chains));
      this.setCache('chains', chains);
    } catch (error) {
      console.error('Failed to save chains:', error);
    }
  }

  // Completion history - only recent entries for performance
  async getCompletionHistory(limit = 100): Promise<CompletionHistory[]> {
    const cacheKey = `history_${limit}`;
    const cached = this.getCached<CompletionHistory[]>(cacheKey);
    if (cached) return cached;

    try {
      const data = localStorage.getItem('momentum_history');
      if (!data) return [];

      const history = JSON.parse(data)
        .map((h: any) => ({
          ...h,
          completedAt: new Date(h.completedAt)
        }))
        .sort((a: CompletionHistory, b: CompletionHistory) => 
          b.completedAt.getTime() - a.completedAt.getTime()
        )
        .slice(0, limit); // Limit to recent entries only

      this.setCache(cacheKey, history);
      return history;
    } catch (error) {
      console.error('Failed to load completion history:', error);
      return [];
    }
  }

  async saveCompletionHistory(history: CompletionHistory[]): Promise<void> {
    try {
      // Keep only last 500 entries to prevent storage bloat
      const limitedHistory = history
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
        .slice(0, 500);
        
      localStorage.setItem('momentum_history', JSON.stringify(limitedHistory));
      this.cache.clear(); // Clear cache to force refresh
    } catch (error) {
      console.error('Failed to save completion history:', error);
    }
  }

  // Scheduled sessions - minimal storage
  async getScheduledSessions(): Promise<ScheduledSession[]> {
    try {
      const data = localStorage.getItem('momentum_sessions');
      if (!data) return [];

      return JSON.parse(data).map((session: any) => ({
        ...session,
        scheduledAt: new Date(session.scheduledAt),
        expiresAt: new Date(session.expiresAt),
      }));
    } catch (error) {
      console.error('Failed to load scheduled sessions:', error);
      return [];
    }
  }

  async saveScheduledSessions(sessions: ScheduledSession[]): Promise<void> {
    try {
      localStorage.setItem('momentum_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save scheduled sessions:', error);
    }
  }

  // Active session - single item storage
  async getActiveSession(): Promise<ActiveSession | null> {
    try {
      const data = localStorage.getItem('momentum_active_session');
      if (!data) return null;

      const session = JSON.parse(data);
      return {
        ...session,
        startedAt: new Date(session.startedAt),
        pausedAt: session.pausedAt ? new Date(session.pausedAt) : undefined,
      };
    } catch (error) {
      console.error('Failed to load active session:', error);
      return null;
    }
  }

  async saveActiveSession(session: ActiveSession | null): Promise<void> {
    try {
      if (session) {
        localStorage.setItem('momentum_active_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('momentum_active_session');
      }
    } catch (error) {
      console.error('Failed to save active session:', error);
    }
  }

  // Utility method to clear all data
  async clearAll(): Promise<void> {
    try {
      localStorage.removeItem('momentum_chains');
      localStorage.removeItem('momentum_history');
      localStorage.removeItem('momentum_sessions');
      localStorage.removeItem('momentum_active_session');
      this.cache.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  // Get storage size for monitoring
  getStorageSize(): { used: string; available: string } {
    try {
      let used = 0;
      for (let key in localStorage) {
        if (key.startsWith('momentum_')) {
          used += localStorage[key].length;
        }
      }

      return {
        used: `${Math.round(used / 1024)}KB`,
        available: '5MB' // Typical localStorage limit
      };
    } catch (error) {
      return { used: 'Unknown', available: 'Unknown' };
    }
  }
}

// Export singleton instance
export const lightweightStorage = new LightweightStorage();

// Alternative minimal debouncer for lightweight version
export class MinimalDebouncer {
  private timers = new Map<string, NodeJS.Timeout>();

  debounce(key: string, callback: () => void, delay: number): void {
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      callback();
      this.timers.delete(key);
    }, delay);

    this.timers.set(key, timer);
  }

  flush(): void {
    this.timers.forEach((timer, key) => {
      clearTimeout(timer);
      this.timers.delete(key);
    });
  }
}

export const minimalDebouncer = new MinimalDebouncer();