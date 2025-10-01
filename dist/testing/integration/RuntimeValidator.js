import { EventBus } from '../utils/EventBus';
/**
 * Runtime validator specifically designed for Gridiron football game
 * Automatically detects runtime issues like black screens, component failures,
 * and performance problems without human intervention
 */
export class RuntimeValidator {
    bus;
    monitoringActive = false;
    performanceMetrics = {
        startTime: 0,
        frameCount: 0,
        lastFrameTime: 0,
        averageFPS: 0,
        memoryUsage: 0,
        loadTime: 0
    };
    issueLog = [];
    componentStates = new Map();
    lastGameState;
    constructor(bus) {
        this.bus = bus;
        this.setupEventListeners();
    }
    /**
     * Start monitoring for runtime issues
     */
    startMonitoring() {
        if (this.monitoringActive)
            return;
        console.log('🔍 Starting runtime monitoring...');
        this.monitoringActive = true;
        this.performanceMetrics.startTime = performance.now();
        this.performanceMetrics.lastFrameTime = performance.now();
        this.startPerformanceMonitoring();
        this.startComponentMonitoring();
        this.startRenderingMonitoring();
        this.startGameStateMonitoring();
    }
    /**
     * Stop monitoring and return collected issues
     */
    stopMonitoring() {
        console.log('⏹️ Stopping runtime monitoring...');
        this.monitoringActive = false;
        // Return all detected issues sorted by severity
        return this.issueLog.sort((a, b) => this.getSeverityPriority(b.severity) - this.getSeverityPriority(a.severity));
    }
    /**
     * Detect runtime issues without human intervention
     */
    async detectRuntimeIssues() {
        const issues = [];
        // Check for black screen (no rendering)
        issues.push(...await this.checkBlackScreen());
        // Check for unresponsive components
        issues.push(...await this.checkComponentResponsiveness());
        // Check for JavaScript errors
        issues.push(...await this.checkJavaScriptErrors());
        // Check for memory issues
        issues.push(...await this.checkMemoryIssues());
        // Check for performance degradation
        issues.push(...await this.checkPerformanceIssues());
        // Check for game state issues
        issues.push(...await this.checkGameStateIssues());
        return issues;
    }
    /**
     * Monitor performance metrics
     */
    startPerformanceMonitoring() {
        if (!this.monitoringActive)
            return;
        const measureFrameRate = () => {
            if (!this.monitoringActive)
                return;
            this.performanceMetrics.frameCount++;
            const now = performance.now();
            const elapsed = now - this.performanceMetrics.lastFrameTime;
            if (elapsed >= 1000) { // Update FPS every second
                this.performanceMetrics.averageFPS = Math.round((this.performanceMetrics.frameCount * 1000) / elapsed);
                this.performanceMetrics.frameCount = 0;
                this.performanceMetrics.lastFrameTime = now;
            }
            // Check memory usage if available
            if (performance.memory) {
                this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
            }
            requestAnimationFrame(measureFrameRate);
        };
        requestAnimationFrame(measureFrameRate);
        // Monitor UI load time
        this.bus.on('ui:ready', () => {
            this.performanceMetrics.loadTime = performance.now() - this.performanceMetrics.startTime;
            console.log(`⏱️ UI loaded in ${Math.round(this.performanceMetrics.loadTime)}ms`);
        });
    }
    /**
     * Monitor component states for failures
     */
    startComponentMonitoring() {
        // Monitor component registration events
        this.bus.on('component:registered', ({ componentName }) => {
            this.updateComponentState(componentName, 'registered');
        });
        this.bus.on('component:error', ({ componentName, error }) => {
            this.updateComponentState(componentName, 'error', error.message);
            this.logIssue('critical', `Component ${componentName} failed`, error.message);
        });
        // Monitor error boundary events
        this.bus.on('errorBoundary:error', ({ componentName, error }) => {
            this.logIssue('high', `Error boundary caught error in ${componentName}`, error.message);
        });
    }
    /**
     * Monitor for rendering issues (black screen detection)
     */
    startRenderingMonitoring() {
        if (!this.monitoringActive)
            return;
        // Check for canvas/field rendering
        const checkRendering = () => {
            if (!this.monitoringActive)
                return;
            try {
                // Check if field canvas exists and has content
                const fieldElement = document.getElementById('field-display');
                if (fieldElement) {
                    const canvas = fieldElement.querySelector('canvas');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            // Check if canvas has been drawn to (has pixel data)
                            const imageData = ctx.getImageData(0, 0, 1, 1);
                            const hasContent = imageData.data.some(pixel => pixel > 0);
                            if (!hasContent) {
                                this.logIssue('high', 'Field canvas appears blank (black screen)', 'Canvas has no pixel data');
                            }
                        }
                    }
                }
                // Check for HUD elements
                const hudElements = ['quarter', 'clock', 'down', 'to-go', 'ball-on'];
                const missingElements = hudElements.filter(id => !document.getElementById(id));
                if (missingElements.length > 0) {
                    this.logIssue('high', 'HUD elements missing', `Missing: ${missingElements.join(', ')}`);
                }
            }
            catch (error) {
                this.logIssue('medium', 'Rendering check failed', error.message);
            }
            setTimeout(checkRendering, 5000); // Check every 5 seconds
        };
        setTimeout(checkRendering, 1000); // Start checking after 1 second
    }
    /**
     * Monitor game state for inconsistencies
     */
    startGameStateMonitoring() {
        this.bus.on('hudUpdate', (payload) => {
            this.lastGameState = payload;
            // Validate game state consistency
            if (this.lastGameState) {
                this.validateGameState(this.lastGameState);
            }
        });
        // Monitor for stuck game states
        setInterval(() => {
            if (this.lastGameState && this.monitoringActive) {
                this.checkForStuckGame();
            }
        }, 30000); // Check every 30 seconds
    }
    /**
     * Check for black screen conditions
     */
    async checkBlackScreen() {
        const issues = [];
        try {
            // Check if body has any visible content
            const bodyChildren = Array.from(document.body.children);
            const visibleElements = bodyChildren.filter(el => el.tagName !== 'SCRIPT' &&
                el.tagName !== 'STYLE' &&
                getComputedStyle(el).display !== 'none');
            if (visibleElements.length === 0) {
                issues.push({
                    type: 'black_screen',
                    severity: 'critical',
                    message: 'No visible content detected (black screen)',
                    timestamp: Date.now(),
                    details: 'Body element has no visible children'
                });
            }
            // Check for field display
            const fieldElement = document.getElementById('field-display');
            if (!fieldElement || getComputedStyle(fieldElement).display === 'none') {
                issues.push({
                    type: 'missing_field',
                    severity: 'high',
                    message: 'Field display element missing or hidden',
                    timestamp: Date.now(),
                    details: 'Field component may not be rendering'
                });
            }
        }
        catch (error) {
            issues.push({
                type: 'rendering_check_failed',
                severity: 'medium',
                message: 'Failed to check rendering status',
                timestamp: Date.now(),
                details: error.message
            });
        }
        return issues;
    }
    /**
     * Check component responsiveness
     */
    async checkComponentResponsiveness() {
        const issues = [];
        // Check if components are responding to events
        const unresponsiveComponents = Array.from(this.componentStates.entries())
            .filter(([_, state]) => {
            const timeSinceLastUpdate = Date.now() - state.lastUpdate;
            return timeSinceLastUpdate > 30000; // 30 seconds without update
        })
            .map(([name]) => name);
        if (unresponsiveComponents.length > 0) {
            issues.push({
                type: 'unresponsive_components',
                severity: 'high',
                message: `Components not responding: ${unresponsiveComponents.join(', ')}`,
                timestamp: Date.now(),
                details: 'Components have not updated in over 30 seconds'
            });
        }
        return issues;
    }
    /**
     * Check for JavaScript errors
     */
    async checkJavaScriptErrors() {
        const issues = [];
        // Check if any error boundaries have been triggered
        const errorBoundaryElements = document.querySelectorAll('.error-boundary-fallback');
        if (errorBoundaryElements.length > 0) {
            issues.push({
                type: 'error_boundaries_triggered',
                severity: 'high',
                message: `${errorBoundaryElements.length} error boundaries active`,
                timestamp: Date.now(),
                details: 'Components have failed and fallen back to error UI'
            });
        }
        return issues;
    }
    /**
     * Check for memory issues
     */
    async checkMemoryIssues() {
        const issues = [];
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize;
            const memoryLimit = 100 * 1024 * 1024; // 100MB
            if (memoryUsage > memoryLimit) {
                issues.push({
                    type: 'high_memory_usage',
                    severity: 'medium',
                    message: `High memory usage: ${Math.round(memoryUsage / 1024 / 1024)}MB`,
                    timestamp: Date.now(),
                    details: 'Memory usage exceeds recommended threshold'
                });
            }
        }
        return issues;
    }
    /**
     * Check for performance issues
     */
    async checkPerformanceIssues() {
        const issues = [];
        // Check frame rate
        if (this.performanceMetrics.averageFPS > 0 && this.performanceMetrics.averageFPS < 15) {
            issues.push({
                type: 'low_frame_rate',
                severity: 'medium',
                message: `Low frame rate: ${this.performanceMetrics.averageFPS} FPS`,
                timestamp: Date.now(),
                details: 'Frame rate below acceptable threshold for smooth gameplay'
            });
        }
        // Check load time
        if (this.performanceMetrics.loadTime > 5000) {
            issues.push({
                type: 'slow_load_time',
                severity: 'low',
                message: `Slow load time: ${this.performanceMetrics.loadTime}ms`,
                timestamp: Date.now(),
                details: 'UI took longer than expected to load'
            });
        }
        return issues;
    }
    /**
     * Check for game state issues
     */
    async checkGameStateIssues() {
        const issues = [];
        if (this.lastGameState) {
            // Check for impossible game states
            if (this.lastGameState.quarter < 1 || this.lastGameState.quarter > 4) {
                issues.push({
                    type: 'invalid_quarter',
                    severity: 'high',
                    message: `Invalid quarter: ${this.lastGameState.quarter}`,
                    timestamp: Date.now(),
                    details: 'Quarter value outside valid range'
                });
            }
            if (this.lastGameState.clock < 0 || this.lastGameState.clock > 15 * 60) {
                issues.push({
                    type: 'invalid_clock',
                    severity: 'high',
                    message: `Invalid clock: ${this.lastGameState.clock}s`,
                    timestamp: Date.now(),
                    details: 'Clock value outside valid range'
                });
            }
            if (this.lastGameState.ballOn < 0 || this.lastGameState.ballOn > 100) {
                issues.push({
                    type: 'invalid_field_position',
                    severity: 'high',
                    message: `Invalid field position: ${this.lastGameState.ballOn}`,
                    timestamp: Date.now(),
                    details: 'Ball position outside field boundaries'
                });
            }
        }
        return issues;
    }
    /**
     * Validate game state consistency
     */
    validateGameState(state) {
        // Check for state consistency issues
        if (state.awaitingPAT && state.score.player === state.score.ai) {
            this.logIssue('low', 'Unusual PAT situation', 'PAT pending but scores are tied');
        }
        if (state.gameOver && state.clock > 0) {
            this.logIssue('medium', 'Game ended with time remaining', 'Game marked as over but clock shows time left');
        }
    }
    /**
     * Check if game appears stuck
     */
    checkForStuckGame() {
        if (!this.lastGameState)
            return;
        // If we've been in the same state for too long, game might be stuck
        const timeInState = Date.now() - this.lastGameState.lastUpdate || Date.now();
        if (timeInState > 60000) { // 1 minute in same state
            this.logIssue('high', 'Game appears stuck', 'No state changes detected for over 1 minute');
        }
    }
    /**
     * Update component state
     */
    updateComponentState(componentName, status, error) {
        this.componentStates.set(componentName, {
            status,
            lastUpdate: Date.now(),
            error
        });
    }
    /**
     * Log a runtime issue
     */
    logIssue(severity, message, details) {
        const issue = {
            type: 'runtime_issue',
            severity,
            message,
            timestamp: Date.now(),
            details
        };
        this.issueLog.push(issue);
        console.warn(`🚨 Runtime Issue [${severity}]: ${message}`, details || '');
    }
    /**
     * Get severity priority for sorting
     */
    getSeverityPriority(severity) {
        const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorities[severity] || 0;
    }
    /**
     * Set up event listeners for monitoring
     */
    setupEventListeners() {
        // Monitor for global errors
        window.addEventListener('error', (event) => {
            this.logIssue('high', 'JavaScript error detected', `${event.message} at ${event.filename}:${event.lineno}`);
        });
        window.addEventListener('unhandledrejection', (event) => {
            this.logIssue('high', 'Unhandled promise rejection', event.reason?.message || 'Unknown promise rejection');
        });
    }
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    /**
     * Get performance baseline for comparison
     */
    async getPerformanceBaseline() {
        return this.getPerformanceMetrics();
    }
    /**
     * Monitor performance during test execution
     */
    async monitorPerformance() {
        return this.getPerformanceMetrics();
    }
    /**
     * Clear issue log
     */
    clearIssues() {
        this.issueLog = [];
    }
    /**
     * Get current issues
     */
    getCurrentIssues() {
        return [...this.issueLog];
    }
    /**
     * Check if monitoring is active
     */
    isMonitoring() {
        return this.monitoringActive;
    }
}
//# sourceMappingURL=RuntimeValidator.js.map