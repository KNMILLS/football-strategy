/**
 * NDJSON logger for structured telemetry output
 * Formats telemetry events as newline-delimited JSON for analysis tooling
 */
export class NdJsonLogger {
    outputDestination;
    config;
    writeStream;
    isInitialized = false;
    pendingWrites = [];
    maxPendingWrites = 1000;
    flushInterval;
    constructor(outputDestination = 'console', config = {}) {
        this.outputDestination = outputDestination;
        this.config = config;
        if (outputDestination === 'file') {
            this.initializeFileStream();
        }
        if (outputDestination === 'memory' || config.enableBatching) {
            this.startBatchProcessor();
        }
    }
    /**
     * Log a telemetry event as NDJSON
     */
    async logEvent(event) {
        if (!this.shouldLog())
            return;
        const exportEvent = this.prepareForExport(event);
        const jsonLine = JSON.stringify(exportEvent) + '\n';
        if (this.outputDestination === 'console') {
            console.log(jsonLine.trim()); // Remove trailing newline for console
        }
        else if (this.outputDestination === 'memory') {
            this.pendingWrites.push(jsonLine);
        }
        else if (this.writeStream) {
            await this.writeToStream(jsonLine);
        }
    }
    /**
     * Log multiple events as NDJSON
     */
    async logEvents(events) {
        if (!this.shouldLog())
            return;
        const promises = events.map(event => this.logEvent(event));
        await Promise.all(promises);
    }
    /**
     * Flush pending writes (for batching/memory modes)
     */
    async flush() {
        if (this.pendingWrites.length === 0)
            return;
        if (this.outputDestination === 'memory') {
            // In memory mode, just clear the buffer
            this.pendingWrites = [];
        }
        else if (this.writeStream) {
            const batch = this.pendingWrites.join('');
            await this.writeToStream(batch);
            this.pendingWrites = [];
        }
    }
    /**
     * Get collected output (for memory mode)
     */
    getMemoryOutput() {
        return this.pendingWrites.join('');
    }
    /**
     * Close the logger and cleanup resources
     */
    async close() {
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
    shouldLog() {
        return this.isInitialized && (!this.config.logLevel || this.config.logLevel !== 'off');
    }
    /**
     * Prepare event for JSON export (convert timestamp to ISO string)
     */
    prepareForExport(event) {
        return {
            ...event,
            timestamp: new Date(event.timestamp).toISOString()
        };
    }
    /**
     * Initialize file stream for output
     */
    async initializeFileStream() {
        try {
            const fileName = this.config.fileName || `telemetry_${Date.now()}.ndjson`;
            const fileHandle = await this.getFileHandle(fileName);
            if ('createWritable' in fileHandle) {
                // Modern File System Access API
                const writableStream = await fileHandle.createWritable();
                this.writeStream = writableStream.getWriter();
            }
            else {
                // Fallback for older browsers or Node.js
                this.writeStream = {
                    write: async (chunk) => {
                        // This would need to be implemented based on the target environment
                        console.warn('File writing not implemented for this environment');
                    },
                    close: async () => {
                        // No-op for fallback
                    }
                };
            }
            this.isInitialized = true;
        }
        catch (error) {
            console.error('Failed to initialize file stream:', error);
            // Fall back to console logging
            this.outputDestination = 'console';
            this.isInitialized = true;
        }
    }
    /**
     * Get file handle for writing (implementation depends on environment)
     */
    async getFileHandle(fileName) {
        // This is a placeholder - actual implementation depends on:
        // 1. Browser File System Access API (showSaveFilePicker)
        // 2. Node.js fs module
        // 3. Electron or other environments
        if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
            // Browser File System Access API
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                        description: 'NDJSON files',
                        accept: { 'application/ndjson': ['.ndjson'] }
                    }]
            });
            return handle;
        }
        else {
            // Node.js or fallback - would need actual fs implementation
            throw new Error('File writing not implemented for this environment');
        }
    }
    /**
     * Write to output stream
     */
    async writeToStream(data) {
        if (this.writeStream) {
            try {
                await this.writeStream.write(data);
            }
            catch (error) {
                console.error('Failed to write to stream:', error);
            }
        }
    }
    /**
     * Start batch processor for periodic flushing
     */
    startBatchProcessor() {
        const interval = this.config.flushInterval || 5000; // 5 seconds default
        this.flushInterval = window.setInterval(async () => {
            await this.flush();
        }, interval);
    }
}
//# sourceMappingURL=NdJsonLogger.js.map