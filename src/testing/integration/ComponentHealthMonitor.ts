import { EventBus, getErrorMessage } from '../../utils/EventBus';

/**
 * Component health monitor specifically designed for Gridiron UI components
 * Validates component registration, rendering, event handling, and error boundaries
 */
export class ComponentHealthMonitor {
  private bus: EventBus;
  private componentHealth = new Map<string, ComponentHealth>();
  private monitoringActive = false;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.setupEventListeners();
  }

  /**
   * Start monitoring component health
   */
  startMonitoring(): void {
    if (this.monitoringActive) return;

    console.log('🏥 Starting component health monitoring...');
    this.monitoringActive = true;

    // Monitor component registration events
    (this.bus as any).on('component:registered', ({ componentName }: any) => {
      this.updateComponentHealth(componentName, { status: 'healthy' });
    });

    (this.bus as any).on('component:error', ({ componentName, error }: any) => {
      this.updateComponentHealth(componentName, {
        status: 'error',
        error: getErrorMessage(error),
        lastError: Date.now()
      });
    });

    // Monitor error boundary events
    (this.bus as any).on('errorBoundary:error', ({ componentName, error }: any) => {
      this.updateComponentHealth(componentName, {
        status: 'error',
        error: getErrorMessage(error),
        errorBoundaryTriggered: true
      });
    });
  }

  /**
   * Stop monitoring component health
   */
  stopMonitoring(): void {
    this.monitoringActive = false;
    console.log('⏹️ Stopping component health monitoring...');
  }

  /**
   * Validate health of a specific component
   */
  async validateComponentHealth(componentName: string): Promise<ComponentHealth> {
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

    } catch (error) {
      health.status = 'error';
      health.error = getErrorMessage(error);
      health.lastCheck = Date.now();
      this.componentHealth.set(componentName, health);

      return health;
    }
  }

  /**
   * Validate health of all registered components
   */
  async validateAllComponents(): Promise<Map<string, ComponentHealth>> {
    const components = [
      'HUD', 'Field', 'Controls', 'Hand', 'Log',
      'ErrorBoundary', 'ProgressiveEnhancement'
    ];

    const healthResults = new Map<string, ComponentHealth>();

    for (const componentName of components) {
      const health = await this.validateComponentHealth(componentName);
      healthResults.set(componentName, health);
    }

    return healthResults;
  }

  /**
   * Check if component DOM element exists and is properly rendered
   */
  private async checkDOMElement(componentName: string): Promise<DOMElementHealth> {
    return new Promise((resolve) => {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          resolve(this.checkDOMElementImmediate(componentName));
        });
      } else {
        resolve(this.checkDOMElementImmediate(componentName));
      }
    });
  }

  /**
   * Immediate DOM element check
   */
  private checkDOMElementImmediate(componentName: string): DOMElementHealth {
    try {
      // Map component names to their typical DOM element IDs
      const elementIdMap: Record<string, string[]> = {
        'HUD': ['hud', 'game-hud', 'hud-display'],
        'Field': ['field', 'field-display', 'game-field'],
        'Controls': ['controls', 'game-controls', 'control-panel'],
        'Hand': ['hand', 'player-hand', 'card-hand'],
        'Log': ['log', 'game-log', 'log-display'],
        'ErrorBoundary': ['error-boundary'],
        'ProgressiveEnhancement': []
      };

      const possibleIds = elementIdMap[componentName] || [componentName.toLowerCase()];
      let element: HTMLElement | null = null;

      // Try to find the element by ID
      for (const id of possibleIds) {
        element = document.getElementById(id);
        if (element) break;
      }

      // If not found by ID, try by class name
      if (!element) {
        for (const id of possibleIds) {
          const elements = document.getElementsByClassName(id);
          if (elements.length > 0) {
            element = elements[0] as HTMLElement;
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

    } catch (error) {
      return {
        exists: false,
        visible: false,
        dimensions: { width: 0, height: 0 },
        styles: {},
        error: getErrorMessage(error as any)
      };
    }
  }

  /**
   * Check if component responds to events properly
   */
  private async checkEventResponsiveness(componentName: string): Promise<EventResponsiveness> {
    try {
      // Test if component can handle events by dispatching a test event
      const testEvent = new CustomEvent('componentHealthCheck', {
        detail: { componentName, timestamp: Date.now() }
      });

      let eventHandled = false;
      const eventHandler = (event: any) => {
        if (event.detail?.componentName === componentName) {
          eventHandled = true;
          document.removeEventListener('componentHealthResponse' as any, eventHandler as any);
        }
      };

      document.addEventListener('componentHealthResponse' as any, eventHandler as any);

      // Dispatch test event (components should listen for this)
      document.dispatchEvent(testEvent);

      // Wait a bit for response
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        responsive: eventHandled,
        responseTime: eventHandled ? 100 : 0,
        lastEventTimestamp: Date.now()
      };

    } catch (error) {
      return {
        responsive: false,
        responseTime: 0,
        lastEventTimestamp: Date.now(),
        error: getErrorMessage(error as any)
      };
    }
  }

  /**
   * Check if component has triggered error boundaries
   */
  private async checkErrorBoundary(componentName: string): Promise<ErrorBoundaryHealth> {
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
        ...(componentErrors.length > 0 ? { lastErrorTimestamp: Date.now() } : {})
      };

    } catch (error) {
      return {
        triggered: false,
        errorCount: 0,
        error: getErrorMessage(error as any)
      };
    }
  }

  /**
   * Determine overall component health status
   */
  private determineOverallStatus(health: ComponentHealth): ComponentStatus {
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
  private updateComponentHealth(componentName: string, updates: Partial<ComponentHealth>): void {
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
  private setupEventListeners(): void {
    // Monitor for component lifecycle events
    (this.bus as any).on('ui:enhancement', ({ type, enabled }: any) => {
      if (enabled) {
        this.updateComponentHealth('ProgressiveEnhancement', { status: 'enhanced' });
      }
    });

    // Monitor for error boundary activations
    (this.bus as any).on('errorBoundary:fallback', ({ componentName }: any) => {
      this.updateComponentHealth(componentName, {
        status: 'error',
        errorBoundaryTriggered: true
      });
    });

    // Monitor for progressive enhancement features
    (this.bus as any).on('features:detected', ({ features }: any) => {
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
  async getHealthBaseline(): Promise<Map<string, ComponentHealth>> {
    return await this.validateAllComponents();
  }

  /**
   * Get health status of specific component
   */
  getComponentHealth(componentName: string): ComponentHealth | undefined {
    return this.componentHealth.get(componentName);
  }

  /**
   * Get all component health statuses
   */
  getAllComponentHealth(): Map<string, ComponentHealth> {
    return new Map(this.componentHealth);
  }

  /**
   * Check if component is healthy
   */
  isComponentHealthy(componentName: string): boolean {
    const health = this.componentHealth.get(componentName);
    return health?.status === 'healthy' || health?.status === 'enhanced';
  }

  /**
   * Get components that need attention
   */
  getProblematicComponents(): ComponentHealth[] {
    return Array.from(this.componentHealth.values())
      .filter(health =>
        health.status === 'error' ||
        health.status === 'missing' ||
        health.status === 'hidden' ||
        health.errorBoundary?.triggered
      );
  }

  /**
   * Clear component health data
   */
  clearHealthData(): void {
    this.componentHealth.clear();
  }
}

// Types for component health monitoring
export type ComponentStatus = 'healthy' | 'enhanced' | 'error' | 'missing' | 'hidden' | 'unknown';

export interface ComponentHealth {
  name: string;
  status: ComponentStatus;
  lastCheck: number;
  domElement?: DOMElementHealth;
  eventResponsiveness?: EventResponsiveness;
  errorBoundary?: ErrorBoundaryHealth;
  error?: string;
  enhancedFeatures?: string[];
  errorBoundaryTriggered?: boolean;
  lastError?: number;
}

export interface DOMElementHealth {
  exists: boolean;
  visible: boolean;
  dimensions: { width: number; height: number };
  styles: {
    display?: string;
    visibility?: string;
    opacity?: string;
  };
  error?: string;
}

export interface EventResponsiveness {
  responsive: boolean;
  responseTime: number;
  lastEventTimestamp: number;
  error?: string;
}

export interface ErrorBoundaryHealth {
  triggered: boolean;
  errorCount: number;
  lastErrorTimestamp?: number;
  error?: string;
}
