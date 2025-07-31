// Batch processor for database operations to reduce N+1 query problems
// Implements connection pooling and transaction batching for optimal performance

interface BatchOperation<T> {
  id: string;
  data: T;
  operation: 'insert' | 'update' | 'delete';
  timestamp: number;
}

interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  retryAttempts: number;
}

const DEFAULT_CONFIG: BatchConfig = {
  maxBatchSize: 50, // Process up to 50 operations in a single batch
  maxWaitTime: 1000, // Wait max 1 second before flushing batch
  retryAttempts: 3
};

export class BatchProcessor<T> {
  private queue: BatchOperation<T>[] = [];
  private config: BatchConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  
  constructor(
    private processor: (operations: BatchOperation<T>[]) => Promise<void>,
    config: Partial<BatchConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Add operation to batch queue - returns immediately for non-blocking UI
  async addOperation(id: string, data: T, operation: 'insert' | 'update' | 'delete'): Promise<void> {
    const batchOp: BatchOperation<T> = {
      id,
      data,
      operation,
      timestamp: Date.now()
    };

    // Remove duplicate operations (latest takes precedence)
    this.queue = this.queue.filter(op => op.id !== id);
    this.queue.push(batchOp);

    // Auto-flush if batch size reached
    if (this.queue.length >= this.config.maxBatchSize) {
      await this.flush();
    } else {
      // Schedule flush if not already scheduled
      this.scheduleFlush();
    }
  }

  // Force immediate flush of all pending operations
  async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.clearFlushTimer();

    const operations = [...this.queue];
    this.queue = [];

    try {
      // Retry mechanism for failed batch operations
      let attempts = 0;
      while (attempts < this.config.retryAttempts) {
        try {
          await this.processor(operations);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= this.config.retryAttempts) {
            console.error('Batch operation failed after retries:', error);
            // Re-queue failed operations for next attempt
            this.queue.unshift(...operations);
          } else {
            // Exponential backoff: wait 2^attempts seconds
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Schedule flush timer
  private scheduleFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.config.maxWaitTime);
  }

  // Clear flush timer
  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // Get current queue size for monitoring
  getQueueSize(): number {
    return this.queue.length;
  }

  // Clean shutdown - flush all pending operations
  async shutdown(): Promise<void> {
    this.clearFlushTimer();
    await this.flush();
  }
}

// Connection pool simulator for better resource management
// In production, this would interface with actual database connection pools
export class ConnectionPool {
  private static instance: ConnectionPool;
  private activeConnections = 0;
  private readonly maxConnections = 10;
  private waitingQueue: Array<() => void> = [];

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  // Acquire connection with timeout
  async acquire(): Promise<() => void> {
    return new Promise((resolve, reject) => {
      if (this.activeConnections < this.maxConnections) {
        this.activeConnections++;
        resolve(() => this.release());
      } else {
        // Queue the request with timeout
        const timeoutId = setTimeout(() => {
          const index = this.waitingQueue.findIndex(r => r === resolve);
          if (index >= 0) {
            this.waitingQueue.splice(index, 1);
            reject(new Error('Connection pool timeout'));
          }
        }, 5000);

        this.waitingQueue.push(() => {
          clearTimeout(timeoutId);
          this.activeConnections++;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.activeConnections--;
    
    // Process waiting queue
    if (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      if (next) next();
    }
  }

  // Get pool statistics for monitoring
  getStats() {
    return {
      activeConnections: this.activeConnections,
      maxConnections: this.maxConnections,
      queueLength: this.waitingQueue.length
    };
  }
}