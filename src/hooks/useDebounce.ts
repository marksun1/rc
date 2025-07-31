import { useCallback, useEffect, useRef } from 'react';

// Generic debounce hook for performance optimization
// Reduces unnecessary function calls by batching rapid successive calls

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef<T>(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

// Optimized storage debouncer specifically for database operations
// Uses different delays for different operation types based on urgency

interface StorageOperation {
  type: 'chains' | 'history' | 'sessions' | 'activeSession';
  data: any;
  timestamp: number;
}

export class StorageDebouncer {
  private operations = new Map<string, StorageOperation>();
  private timers = new Map<string, NodeJS.Timeout>();
  
  // Different delays for different operation types
  private readonly delays = {
    chains: 1000,        // Chains change less frequently, can wait longer
    history: 500,        // History is important but can be batched
    sessions: 800,       // Sessions are less urgent
    activeSession: 200   // Active session needs faster updates for UX
  };

  constructor(
    private storage: {
      saveChains: (chains: any[]) => Promise<void>;
      saveCompletionHistory: (history: any[]) => Promise<void>;
      saveScheduledSessions: (sessions: any[]) => Promise<void>;
      saveActiveSession: (session: any) => Promise<void>;
    }
  ) {}

  // Queue operation for debounced execution
  queueOperation(type: StorageOperation['type'], data: any): void {
    const key = type;
    const delay = this.delays[type];
    
    // Store the latest operation (overwrites previous)
    this.operations.set(key, {
      type,
      data,
      timestamp: Date.now()
    });

    // Clear existing timer for this operation type
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.executeOperation(key);
    }, delay);
    
    this.timers.set(key, timer);
  }

  // Execute the queued operation
  private async executeOperation(key: string): Promise<void> {
    const operation = this.operations.get(key);
    if (!operation) return;

    try {
      switch (operation.type) {
        case 'chains':
          await this.storage.saveChains(operation.data);
          break;
        case 'history':
          await this.storage.saveCompletionHistory(operation.data);
          break;
        case 'sessions':
          await this.storage.saveScheduledSessions(operation.data);
          break;
        case 'activeSession':
          await this.storage.saveActiveSession(operation.data);
          break;
      }
    } catch (error) {
      console.error(`Error executing ${operation.type} operation:`, error);
      // Could implement retry logic here
    } finally {
      // Clean up
      this.operations.delete(key);
      this.timers.delete(key);
    }
  }

  // Force immediate execution of all pending operations
  async flush(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    // Clear all timers and execute operations immediately
    for (const [key, timer] of this.timers.entries()) {
      clearTimeout(timer);
      promises.push(this.executeOperation(key));
    }

    await Promise.all(promises);
  }

  // Get current queue status for debugging
  getQueueStatus() {
    return {
      pendingOperations: this.operations.size,
      operationTypes: Array.from(this.operations.keys())
    };
  }
}

// Throttle hook for high-frequency events (like scroll, resize)
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastRun.current >= delay) {
        // Execute immediately if enough time has passed
        lastRun.current = now;
        callbackRef.current(...args);
      } else {
        // Schedule execution for the remaining time
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastRun.current = Date.now();
          callbackRef.current(...args);
        }, delay - (now - lastRun.current));
      }
    }) as T,
    [delay]
  );
}