import { EventBus } from '../utils/EventBus';
/**
 * Component health monitor specifically designed for Gridiron UI components
 * Validates component registration, rendering, event handling, and error boundaries
 */
export class ComponentHealthMonitor {
    bus;
    componentHealth = new Map();
    monitoringActive = false;
    constructor(bus) {
        this.bus = bus;
        this.setupEventListeners();
    }
    /**
     * Start monitoring component health
     */
    startMonitoring() {
        if (this.monitoringActive)
            return;
        console.log('🏥 Starting component health monitoring...');
        this.monitoringActive = true;
        // Monitor component registration events
        this.bus.on('component:registered', ({ componentName }) => {
            this.updateComponentHealth(componentName, { status: 'registered' });
        });
        this.bus.on('component:error', ({ componentName, error }) => {
            this.updateComponentHealth(componentName, {
                status: 'error',
                error: error.message,
                lastError: Date.now()
            });
        });
        // Monitor error boundary events
        this.bus.on('errorBoundary:error', ({ componentName, error }) => {
            this.updateComponentHealth(componentName, {
                status: 'error_boundary',
                error: error.message,
                errorBoundaryTriggered: true
            });
        });
    }
    /**
     * Stop monitoring component health
     */
    stopMonitoring() {
        this.monitoringActive = false;
        console.log('⏹️ Stopping component health monitoring...');
    }
    /**
     * Validate health of a specific component
     */
    async validateComponentHealth(componentName) {
        const health = this.componentHealth.get(componentName) || {
            name: componentName,
            status: 'unknown',
            lastCheck: Date.now()
        };
        try {
            // Check if component DOM element exists
            const domElement = await this.checkDOMElement(componentName);
            health.domElement = domElement;
            // Check if component responds to events
            const eventResponsiveness = await this.checkEventResponsiveness(componentName);
            health.eventResponsiveness = eventResponsiveness;
            // Check for error boundaries
            const errorBoundary = await this.checkErrorBoundary(componentName);
            health.errorBoundary = errorBoundary;
            // Update overall health status
            health.status = this.determineOverallStatus(health);
            health.lastCheck = Date.now();
            // Store updated health
            this.componentHealth.set(componentName, health);
            return health;
        }
        catch (error) {
            health.status = 'error';
            health.error = error.message;
            health.lastCheck = Date.now();
            this.componentHealth.set(componentName, health);
            return health;
        }
    }
    /**
     * Validate health of all registered components
     */
    async validateAllComponents() {
        const components = [
            'HUD', 'Field', 'Controls', 'Hand', 'Log',
            'ErrorBoundary', 'ProgressiveEnhancement'
        ];
        const healthResults = new Map();
        for (const componentName of components) {
            const health = await this.validateComponentHealth(componentName);
            healthResults.set(componentName, health);
        }
        return healthResults;
    }
    /**
     * Check if component DOM element exists and is properly rendered
     */
    async checkDOMElement(componentName) {
        return new Promise((resolve) => {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    resolve(this.checkDOMElementImmediate(componentName));
                });
            }
            else {
                resolve(this.checkDOMElementImmediate(componentName));
            }
        });
    }
    /**
     * Immediate DOM element check
     */
    checkDOMElementImmediate(componentName) {
        try {
            // Map component names to their typical DOM element IDs
            const elementIdMap = {
                'HUD': ['hud', 'game-hud', 'hud-display'],
                'Field': ['field', 'field-display', 'game-field'],
                'Controls': ['controls', 'game-controls', 'control-panel'],
                'Hand': ['hand', 'player-hand', 'card-hand'],
                'Log': ['log', 'game-log', 'log-display'],
                'ErrorBoundary': ['error-boundary'],
                'ProgressiveEnhancement': []
            };
            const possibleIds = elementIdMap[componentName] || [componentName.toLowerCase()];
            let element = null;
            // Try to find the element by ID
            for (const id of possibleIds) {
                element = document.getElementById(id);
                if (element)
                    break;
            }
            // If not found by ID, try by class name
            if (!element) {
                for (const id of possibleIds) {
                    const elements = document.getElementsByClassName(id);
                    if (elements.length > 0) {
                        element = elements[0];
                        break;
                    }
                }
            }
            if (!element) {
                return {
                    exists: false,
                    visible: false,
                    dimensions: { width: 0, height: 0 },
                    styles: {},
                    error: 'Element not found in DOM'
                };
            }
            const computedStyle = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
                exists: true,
                visible: computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden',
                dimensions: {
                    width: rect.width,
                    height: rect.height
                },
                styles: {
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity
                }
            };
        }
        catch (error) {
            return {
                exists: false,
                visible: false,
                dimensions: { width: 0, height: 0 },
                styles: {},
                error: error.message
            };
        }
    }
    /**
     * Check if component responds to events properly
     */
    async checkEventResponsiveness(componentName) {
        try {
            // Test if component can handle events by dispatching a test event
            const testEvent = new CustomEvent('componentHealthCheck', {
                detail: { componentName, timestamp: Date.now() }
            });
            let eventHandled = false;
            const eventHandler = (event) => {
                if (event.detail?.componentName === componentName) {
                    eventHandled = true;
                    document.removeEventListener('componentHealthResponse', eventHandler);
                }
            };
            document.addEventListener('componentHealthResponse', eventHandler);
            // Dispatch test event (components should listen for this)
            document.dispatchEvent(testEvent);
            // Wait a bit for response
            await new Promise(resolve => setTimeout(resolve, 100));
            return {
                responsive: eventHandled,
                responseTime: eventHandled ? 100 : 0,
                lastEventTimestamp: Date.now()
            };
        }
        catch (error) {
            return {
                responsive: false,
                responseTime: 0,
                error: error.message
            };
        }
    }
    /**
     * Check if component has triggered error boundaries
     */
    async checkErrorBoundary(componentName) {
        try {
            // Look for error boundary fallback elements
            const errorElements = document.querySelectorAll('.error-boundary-fallback');
            const componentErrors = Array.from(errorElements).filter(el => {
                const text = el.textContent || '';
                return text.toLowerCase().includes(componentName.toLowerCase());
            });
            return {
                triggered: componentErrors.length > 0,
                errorCount: componentErrors.length,
                lastErrorTimestamp: componentErrors.length > 0 ? Date.now() : undefined
            };
        }
        catch (error) {
            return {
                triggered: false,
                errorCount: 0,
                error: error.message
            };
        }
    }
    /**
     * Determine overall component health status
     */
    determineOverallStatus(health) {
        // Component is healthy if:
        // 1. DOM element exists and is visible
        // 2. No error boundaries triggered
        // 3. Responds to events (if applicable)
        if (!health.domElement?.exists) {
            return 'missing';
        }
        if (!health.domElement?.visible) {
            return 'hidden';
        }
        if (health.errorBoundary?.triggered) {
            return 'error';
        }
        if (health.status === 'error') {
            return 'error';
        }
        return 'healthy';
    }
    /**
     * Update component health information
     */
    updateComponentHealth(componentName, updates) {
        const current = this.componentHealth.get(componentName) || {
            name: componentName,
            status: 'unknown',
            lastCheck: Date.now()
        };
        const updated = { ...current, ...updates };
        this.componentHealth.set(componentName, updated);
    }
    /**
     * Set up event listeners for component monitoring
     */
    setupEventListeners() {
        // Monitor for component lifecycle events
        this.bus.on('ui:enhancement', ({ type, enabled }) => {
            if (enabled) {
                this.updateComponentHealth('ProgressiveEnhancement', { status: 'enhanced' });
            }
        });
        // Monitor for error boundary activations
        this.bus.on('errorBoundary:fallback', ({ componentName }) => {
            this.updateComponentHealth(componentName, {
                status: 'error_boundary',
                errorBoundaryTriggered: true
            });
        });
        // Monitor for progressive enhancement features
        this.bus.on('features:detected', ({ features }) => {
            const enhancementStatus = Object.entries(features)
                .filter(([_, supported]) => supported)
                .map(([feature]) => feature);
            this.updateComponentHealth('ProgressiveEnhancement', {
                status: 'enhanced',
                enhancedFeatures: enhancementStatus
            });
        });
    }
    /**
     * Get health baseline for comparison
     */
    async getHealthBaseline() {
        return await this.validateAllComponents();
    }
    /**
     * Get health status of specific component
     */
    getComponentHealth(componentName) {
        return this.componentHealth.get(componentName);
    }
    /**
     * Get all component health statuses
     */
    getAllComponentHealth() {
        return new Map(this.componentHealth);
    }
    /**
     * Check if component is healthy
     */
    isComponentHealthy(componentName) {
        const health = this.componentHealth.get(componentName);
        return health?.status === 'healthy' || health?.status === 'enhanced';
    }
    /**
     * Get components that need attention
     */
    getProblematicComponents() {
        return Array.from(this.componentHealth.values())
            .filter(health => health.status === 'error' ||
            health.status === 'missing' ||
            health.status === 'hidden' ||
            health.errorBoundary?.triggered);
    }
    /**
     * Clear component health data
     */
    clearHealthData() {
        this.componentHealth.clear();
    }
}
//# sourceMappingURL=ComponentHealthMonitor.js.map