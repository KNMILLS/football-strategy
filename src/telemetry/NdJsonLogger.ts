import type { TelemetryEvent, TelemetryEventForExport } from './TelemetrySchema';

/**
 * NDJSON logger for structured telemetry output
 * Formats telemetry events as newline-delimited JSON for analysis tooling
 */
export class NdJsonLogger {
  private writeStream?: WritableStreamDefaultWriter<string>;
  private isInitialized = false;
  private pendingWrites: string[] = [];
  private maxPendingWrites = 1000;
  private flushInterval?: number;

  constructor(
    private outputDestination: 'console' | 'file' | 'memory' = 'console',
    private config: NdJsonLoggerConfig = {}
  ) {
    if (outputDestination === 'file') {
      this.initializeFileStream();
    } else {
      // For console and memory modes, initialize immediately
      this.isInitialized = true;
    }

    if (outputDestination === 'memory' || config.enableBatching) {
      this.startBatchProcessor();
    }
  }

  /**
   * Log a telemetry event as NDJSON
   */
  async logEvent(event: TelemetryEvent): Promise<void> {
    if (!this.shouldLog()) return;

    const exportEvent = this.prepareForExport(event);
    const jsonLine = JSON.stringify(exportEvent) + '\n';

    if (this.outputDestination === 'console') {
      console.log(jsonLine.trim()); // Remove trailing newline for console
    } else if (this.outputDestination === 'memory') {
      this.pendingWrites.push(jsonLine);
      // Auto-flush for memory to ensure data is available immediately
      if (this.pendingWrites.length >= 100) {
        await this.flush();
      }
    } else if (this.writeStream) {
      await this.writeToStream(jsonLine);
    }
  }

  /**
   * Log multiple events as NDJSON
   */
  async logEvents(events: TelemetryEvent[]): Promise<void> {
    if (!this.shouldLog()) return;

    for (const event of events) {
      await this.logEvent(event);
    }
  }

  /**
   * Flush pending writes (for batching/memory modes)
   */
  async flush(): Promise<void> {
    if (this.pendingWrites.length === 0) return;

    if (this.outputDestination === 'memory') {
      // In memory mode, don't clear the buffer - it's meant to be persistent
      // Just return to indicate flush is complete
      return;
    } else if (this.writeStream) {
      const batch = this.pendingWrites.join('');
      await this.writeToStream(batch);
      this.pendingWrites = [];
    }
  }

  /**
   * Get memory output without flushing (for immediate access)
   */
  getMemoryOutputImmediate(): string {
    return this.pendingWrites.join('');
  }

  /**
   * Get collected output (for memory mode)
   */
  getMemoryOutput(): string {
    return this.pendingWrites.join('');
  }

  /**
   * Close the logger and cleanup resources
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    await this.flush();

    if (this.writeStream) {
      await this.writeStream.close();
    }

    this.isInitialized = false;
  }

  /**
   * Check if logging should occur based on configuration
   */
  private shouldLog(): boolean {
    return this.isInitialized && (!this.config.logLevel || this.config.logLevel !== 'off');
  }

  /**
   * Prepare event for JSON export (convert timestamp to ISO string)
   */
  private prepareForExport(event: TelemetryEvent): TelemetryEventForExport {
    return {
      ...event,
      timestamp: new Date(event.timestamp).toISOString()
    };
  }

  /**
   * Initialize file stream for output
   */
  private async initializeFileStream(): Promise<void> {
    try {
      const fileName = this.config.fileName || `telemetry_${Date.now()}.ndjson`;
      const fileHandle = await this.getFileHandle(fileName);

      if ('createWritable' in fileHandle) {
        // Modern File System Access API
        const writableStream = await fileHandle.createWritable();
        this.writeStream = writableStream.getWriter();
      } else {
        // Fallback for older browsers or Node.js
        this.writeStream = {
          write: async (chunk: string) => {
            // This would need to be implemented based on the target environment
            console.warn('File writing not implemented for this environment');
          },
          close: async () => {
            // No-op for fallback
          }
        } as any;
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize file stream:', error);
      // Fall back to console logging
      this.outputDestination = 'console';
      this.isInitialized = true;
    }
  }

  /**
   * Get file handle for writing (implementation depends on environment)
   */
  private async getFileHandle(fileName: string): Promise<FileSystemFileHandle | FileSystemWritableFileStream> {
    // This is a placeholder - actual implementation depends on:
    // 1. Browser File System Access API (showSaveFilePicker)
    // 2. Node.js fs module
    // 3. Electron or other environments

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      // Browser File System Access API
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'NDJSON files',
          accept: { 'application/ndjson': ['.ndjson'] }
        }]
      });
      return handle;
    } else {
      // Node.js or fallback - would need actual fs implementation
      throw new Error('File writing not implemented for this environment');
    }
  }

  /**
   * Write to output stream
   */
  private async writeToStream(data: string): Promise<void> {
    if (this.writeStream) {
      try {
        await this.writeStream.write(data);
      } catch (error) {
        console.error('Failed to write to stream:', error);
      }
    }
  }

  /**
   * Start batch processor for periodic flushing
   */
  private startBatchProcessor(): void {
    const interval = this.config.flushInterval || 5000; // 5 seconds default

    this.flushInterval = window.setInterval(async () => {
      await this.flush();
    }, interval);
  }
}

/**
 * Configuration for NDJSON logger
 */
export interface NdJsonLoggerConfig {
  logLevel?: 'off' | 'debug' | 'production';
  fileName?: string;
  enableBatching?: boolean;
  flushInterval?: number; // milliseconds
  maxBatchSize?: number;
}
