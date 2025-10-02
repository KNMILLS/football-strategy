import { EventBus } from '../utils/EventBus';

/**
 * Error boundary configuration options
 */
export interface ErrorBoundaryConfig {
  /** Custom fallback component to render when an error occurs */
  fallbackComponent?: (error: Error, retry: () => void) => HTMLElement;
  /** Callback function called when an error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to isolate the component (prevent error propagation) */
  isolate?: boolean;
  /** Component name for error reporting */
  componentName?: string;
  /** Whether to show error details in development */
  showErrorDetails?: boolean;
}

/**
 * Error information for error boundary callbacks
 */
export interface ErrorInfo {
  componentName?: string;
  componentStack?: string;
  errorBoundary?: string;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Error boundary class for handling component errors gracefully
 * Provides error isolation, fallback UI, and retry mechanisms
 */
export class ErrorBoundary {
  private state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0
  };

  private config: Required<ErrorBoundaryConfig>;
  private retryTimeoutId: number | null = null;
  private originalErrorHandler: ((event: ErrorEvent) => void) | null = null;

  constructor(config: ErrorBoundaryConfig = {}) {
    this.config = {
      fallbackComponent: config.fallbackComponent || this.createDefaultFallback,
      onError: config.onError || this.defaultErrorHandler,
      isolate: config.isolate ?? true,
      componentName: config.componentName || 'UnknownComponent',
      showErrorDetails: config.showErrorDetails ?? (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
    };
  }

  /**
   * Wraps an HTMLElement with error boundary protection
   * @param component - The DOM element to wrap
   * @param config - Error boundary configuration
   * @returns The wrapped element
   */
  static wrap<T extends HTMLElement>(component: T, config?: ErrorBoundaryConfig): T {
    const boundary = new ErrorBoundary(config);
    return boundary.wrapElement(component);
  }

  /**
   * Wraps a component function that returns an HTMLElement
   * @param componentFn - Function that creates and returns a DOM element
   * @param config - Error boundary configuration
   * @returns The wrapped element
   */
  static wrapComponent<T extends () => HTMLElement>(componentFn: T, config?: ErrorBoundaryConfig): T {
    const boundary = new ErrorBoundary(config);

    const wrappedFn = ((...args: []) => {
      try {
        const element = componentFn.apply(this, args);
        return boundary.wrapElement(element);
      } catch (error) {
        return boundary.handleError(error as Error);
      }
    }) as T;

    return wrappedFn;
  }

  /**
   * Wraps an event bus listener with error boundary protection
   * @param bus - Event bus instance
   * @param eventType - Event type to listen for
   * @param handler - Event handler function
   * @param config - Error boundary configuration
   * @returns Unsubscribe function
   */
  static wrapEventHandler(
    bus: EventBus,
    eventType: string,
    handler: (...args: any[]) => void,
    config?: ErrorBoundaryConfig
  ): () => void {
    const boundary = new ErrorBoundary(config);

    const wrappedHandler = (...args: any[]) => {
      try {
        return handler.apply(this, args);
      } catch (error) {
        boundary.handleError(error as Error);
        return undefined;
      }
    };

    (bus as any).on(eventType, wrappedHandler);

    return () => (bus as any).off(eventType, wrappedHandler);
  }

  /**
   * Wraps a DOM element with error boundary protection
   * @private
   */
  private wrapElement<T extends HTMLElement>(element: T): T {
    if (this.config.isolate) {
      this.setupErrorIsolation(element);
    }

    // Override addEventListener to catch errors in event handlers
    const originalAddEventListener = element.addEventListener;
    element.addEventListener = (...args: any[]) => {
      const [eventType, handler, options] = args;

      const wrappedHandler = (...handlerArgs: any[]) => {
        try {
          return handler.apply(this, handlerArgs);
        } catch (error) {
          this.handleError(error as Error);
          return undefined;
        }
      };

      return originalAddEventListener.call(element, eventType, wrappedHandler, options);
    };

    return element;
  }

  /**
   * Sets up error isolation for the component
   * @private
   */
  private setupErrorIsolation(element: HTMLElement): void {
    // Capture JavaScript errors within this element's scope
    this.originalErrorHandler = window.onerror;

    window.onerror = (message, source, lineno, colno, error) => {
      // Check if the error originated from within our component
      if (error && this.isErrorFromComponent(error, element)) {
        this.handleError(error);
        return true; // Prevent default error handling
      }

      // Call original handler for other errors
      if (this.originalErrorHandler && error) {
        try {
          return this.originalErrorHandler(error as any);
        } catch {
          return false;
        }
      }

      return false;
    };

    // Clean up on element removal
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === element || element.contains(node as Node)) {
            this.cleanup();
            observer.disconnect();
          }
        });
      });
    });

    if (element.parentNode) {
      observer.observe(element.parentNode, { childList: true, subtree: true });
    }
  }

  /**
   * Checks if an error originated from within the component
   * @private
   */
  private isErrorFromComponent(error: Error, element: HTMLElement): boolean {
    // Simple heuristic: check if error stack trace contains references to our component
    const stack = error.stack || '';
    const componentSelectors = ['HUD', 'Log', 'Field', 'Hand', 'Controls'];

    return componentSelectors.some(selector =>
      stack.includes(selector) || element.id?.includes(selector.toLowerCase())
    );
  }

  /**
   * Handles an error by updating state and showing fallback UI
   * @private
   */
  private handleError(error: Error): HTMLElement {
    this.state.hasError = true;
    this.state.error = error;
    this.state.errorInfo = {
      componentName: this.config.componentName,
      errorBoundary: 'ErrorBoundary'
    };

    // Call error callback if provided
    try {
      this.config.onError(error, this.state.errorInfo!);
    } catch (callbackError) {
      console.error('Error in error boundary callback:', callbackError);
    }

    // Log error for debugging
    console.error(`ErrorBoundary caught error in ${this.config.componentName}:`, error);

    // Create and return fallback component
    return this.config.fallbackComponent(error, () => this.retry());
  }

  /**
   * Retries the failed component
   * @private
   */
  private retry(): void {
    if (this.state.retryCount < 3) { // Max 3 retries
      this.state.hasError = false;
      this.state.error = null;
      this.state.errorInfo = null;
      this.state.retryCount++;

      // Add a small delay before retry to avoid rapid error loops
      if (this.retryTimeoutId) {
        clearTimeout(this.retryTimeoutId);
      }

      this.retryTimeoutId = window.setTimeout(() => {
        // Dispatch a custom event to trigger component re-initialization
        window.dispatchEvent(new CustomEvent('errorBoundaryRetry', {
          detail: { componentName: this.config.componentName }
        }));
      }, 100 * this.state.retryCount); // Exponential backoff
    }
  }

  /**
   * Creates a default fallback component
   * @private
   */
  private createDefaultFallback(error: Error, retry: () => void): HTMLElement {
    const fallback = document.createElement('div');
    fallback.className = 'error-boundary-fallback';
    fallback.style.cssText = `
      padding: 16px;
      margin: 8px;
      border: 2px solid #ff6b6b;
      border-radius: 8px;
      background-color: #fff5f5;
      color: #c92a2a;
      font-family: monospace;
      font-size: 14px;
    `;

    const title = document.createElement('div');
    title.textContent = `⚠️ ${this.config.componentName} Error`;
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';

    const message = document.createElement('div');
    message.textContent = this.config.showErrorDetails ? error.message : 'Component failed to load';

    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    retryButton.style.cssText = `
      margin-top: 8px;
      padding: 4px 12px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    retryButton.onclick = () => retry();

    fallback.appendChild(title);
    fallback.appendChild(message);
    fallback.appendChild(retryButton);

    return fallback;
  }

  /**
   * Default error handler that logs to console
   * @private
   */
  private defaultErrorHandler(error: Error, errorInfo: ErrorInfo): void {
    console.group(`🚨 ErrorBoundary: ${errorInfo.componentName}`);
    console.error('Error:', error);
    console.log('Error Info:', errorInfo);
    console.groupEnd();
  }

  /**
   * Cleans up error boundary resources
   * @private
   */
  private cleanup(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    // Restore original error handler
    if (this.originalErrorHandler) {
      window.onerror = this.originalErrorHandler as OnErrorEventHandler;
      this.originalErrorHandler = null;
    }
  }

  /**
   * Gets the current error state
   */
  getState(): Readonly<ErrorBoundaryState> {
    return { ...this.state };
  }

  /**
   * Manually triggers error handling for testing
   */
  triggerError(error: Error): HTMLElement {
    return this.handleError(error);
  }

  /**
   * Resets the error boundary state
   */
  reset(): void {
    this.state.hasError = false;
    this.state.error = null;
    this.state.errorInfo = null;
    this.state.retryCount = 0;
    this.cleanup();
  }
}
