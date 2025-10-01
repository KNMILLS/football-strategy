import { EventBus } from '../../utils/EventBus';

/**
 * Progressive enhancement utilities for better user experience
 * Handles feature detection, loading states, and graceful degradation
 */

/**
 * Feature detection results
 */
export interface FeatureSupport {
  webgl: boolean;
  webAudio: boolean;
  localStorage: boolean;
  serviceWorker: boolean;
  intersectionObserver: boolean;
  requestIdleCallback: boolean;
  webWorkers: boolean;
}

/**
 * Progressive enhancement configuration
 */
export interface ProgressiveConfig {
  enableWebGL?: boolean;
  enableWebAudio?: boolean;
  enableOfflineSupport?: boolean;
  enableAdvancedAnimations?: boolean;
  enablePerformanceMonitoring?: boolean;
}

/**
 * Progressive enhancement manager
 */
export class ProgressiveEnhancement {
  private features: FeatureSupport;
  private config: ProgressiveConfig;
  private bus: EventBus;

  constructor(bus: EventBus, config: ProgressiveConfig = {}) {
    this.bus = bus;
    this.config = {
      enableWebGL: config.enableWebGL ?? this.detectWebGL(),
      enableWebAudio: config.enableWebAudio ?? this.detectWebAudio(),
      enableOfflineSupport: config.enableOfflineSupport ?? this.detectServiceWorker(),
      enableAdvancedAnimations: config.enableAdvancedAnimations ?? this.detectAdvancedAnimations(),
      enablePerformanceMonitoring: config.enablePerformanceMonitoring ?? true
    };

    this.features = this.detectFeatures();
    this.initializeProgressiveFeatures();
  }

  /**
   * Detects browser feature support
   */
  private detectFeatures(): FeatureSupport {
    return {
      webgl: this.detectWebGL(),
      webAudio: this.detectWebAudio(),
      localStorage: this.detectLocalStorage(),
      serviceWorker: this.detectServiceWorker(),
      intersectionObserver: this.detectIntersectionObserver(),
      requestIdleCallback: this.detectRequestIdleCallback(),
      webWorkers: this.detectWebWorkers()
    };
  }

  /**
   * Detects WebGL support
   */
  private detectWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }

  /**
   * Detects Web Audio API support
   */
  private detectWebAudio(): boolean {
    return 'webkitAudioContext' in window || 'AudioContext' in window;
  }

  /**
   * Detects LocalStorage support
   */
  private detectLocalStorage(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detects Service Worker support
   */
  private detectServiceWorker(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Detects Intersection Observer support
   */
  private detectIntersectionObserver(): boolean {
    return 'IntersectionObserver' in window;
  }

  /**
   * Detects requestIdleCallback support
   */
  private detectRequestIdleCallback(): boolean {
    return 'requestIdleCallback' in window;
  }

  /**
   * Detects Web Workers support
   */
  private detectWebWorkers(): boolean {
    return 'Worker' in window;
  }

  /**
   * Detects advanced animation capabilities
   */
  private detectAdvancedAnimations(): boolean {
    // Check for CSS transforms, transitions, and animations
    const style = document.createElement('div').style;
    return 'transform' in style &&
           'transition' in style &&
           'animation' in style &&
           this.detectWebGL(); // Require WebGL for advanced animations
  }

  /**
   * Initializes progressive features based on detected support
   */
  private initializeProgressiveFeatures(): void {
    // Emit feature detection results
    (this.bus as any).emit('features:detected', { features: this.features });

    // Enable features based on support and configuration
    if (this.config.enableWebGL && this.features.webgl) {
      this.enableWebGLFeatures();
    }

    if (this.config.enableWebAudio && this.features.webAudio) {
      this.enableWebAudioFeatures();
    }

    if (this.config.enableOfflineSupport && this.features.serviceWorker) {
      this.enableOfflineSupport();
    }

    if (this.config.enableAdvancedAnimations && this.features.intersectionObserver) {
      this.enableAdvancedAnimations();
    }

    if (this.config.enablePerformanceMonitoring) {
      this.enablePerformanceMonitoring();
    }

    // Set up lazy loading for images
    if (this.features.intersectionObserver) {
      this.setupLazyLoading();
    }
  }

  /**
   * Enables WebGL features if supported
   */
  private enableWebGLFeatures(): void {
    (this.bus as any).emit('webgl:enabled', {});

    // Add WebGL-specific CSS classes
    document.body.classList.add('webgl-supported');

    // Emit event for field component to use WebGL rendering
    (this.bus as any).emit('ui:enhancement', {
      type: 'webgl',
      enabled: true,
      message: 'Enhanced graphics enabled'
    });
  }

  /**
   * Enables Web Audio features if supported
   */
  private enableWebAudioFeatures(): void {
    (this.bus as any).emit('webaudio:enabled', {});

    // Add Web Audio-specific CSS classes
    document.body.classList.add('webaudio-supported');

    // Emit event for SFX component to use Web Audio
    (this.bus as any).emit('ui:enhancement', {
      type: 'webaudio',
      enabled: true,
      message: 'Enhanced audio enabled'
    });
  }

  /**
   * Enables offline support if service workers are supported
   */
  private enableOfflineSupport(): void {
    (this.bus as any).emit('offline:enabled', {});

    // Register service worker for offline functionality
    // Only attempt registration in production builds where sw.js is served with the correct MIME type
    try {
      const isProd = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.PROD;
      if ('serviceWorker' in navigator && isProd) {
        // Optionally verify sw.js is reachable before registering
        fetch('/sw.js', { method: 'HEAD' }).then(resp => {
          if (!resp.ok) throw new Error(`sw.js not found (${resp.status})`);
          return navigator.serviceWorker.register('/sw.js');
        }).then(registration => {
          (this.bus as any).emit('offline:ready', { registration });
        }).catch(error => {
          console.warn('Service worker registration failed:', error);
        });
      }
    } catch (error) {
      console.warn('Service worker registration skipped:', error);
    }
  }

  /**
   * Enables advanced animations if supported
   */
  private enableAdvancedAnimations(): void {
    (this.bus as any).emit('animations:enabled', {});

    // Add animation-specific CSS classes
    document.body.classList.add('animations-supported');

    // Emit event for VFX component to use advanced animations
    (this.bus as any).emit('ui:enhancement', {
      type: 'animations',
      enabled: true,
      message: 'Enhanced animations enabled'
    });
  }

  /**
   * Enables performance monitoring
   */
  private enablePerformanceMonitoring(): void {
    if ('performance' in window && 'measure' in performance) {
      this.setupPerformanceMonitoring();
    }
  }

  /**
   * Sets up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    let startTime = performance.now();

    // Monitor frame rate
    let frameCount = 0;
    let lastFrameTime = performance.now();

    const measureFrameRate = () => {
      frameCount++;
      const now = performance.now();
      const elapsed = now - lastFrameTime;

      if (elapsed >= 1000) { // Every second
        const fps = Math.round((frameCount * 1000) / elapsed);
        (this.bus as any).emit('performance:fps', { fps });

        frameCount = 0;
        lastFrameTime = now;
      }

      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);

    // Monitor UI registration time
    (this.bus as any).on('ui:ready', () => {
      const loadTime = performance.now() - startTime;
      performance.mark('ui-ready');

      (this.bus as any).emit('performance:loadTime', {
        loadTime,
        mark: 'ui-ready'
      });
    });

    // Monitor game flow events
    (this.bus as any).on('flow:gameStart', () => {
      performance.mark('game-start');
      const gameStartTime = performance.now() - startTime;

      (this.bus as any).emit('performance:gameStartTime', {
        gameStartTime,
        mark: 'game-start'
      });
    });
  }

  /**
   * Sets up lazy loading for images
   */
  private setupLazyLoading(): void {
    const lazyImages = document.querySelectorAll('img[data-src]');

    if (lazyImages.length === 0) return;

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });

    lazyImages.forEach(img => imageObserver.observe(img));
  }

  /**
   * Gets current feature support status
   */
  getFeatures(): FeatureSupport {
    return { ...this.features };
  }

  /**
   * Gets current configuration
   */
  getConfig(): ProgressiveConfig {
    return { ...this.config };
  }

  /**
   * Checks if a specific feature is supported and enabled
   */
  isFeatureEnabled(feature: keyof FeatureSupport): boolean {
    return this.features[feature] && this.config[`enable${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof ProgressiveConfig] === true;
  }

  /**
   * Enables a specific feature if supported
   */
  enableFeature(feature: keyof FeatureSupport): boolean {
    if (!this.features[feature]) {
      return false;
    }

    const configKey = `enable${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof ProgressiveConfig;
    this.config[configKey] = true;

    // Trigger feature-specific initialization
    switch (feature) {
      case 'webgl':
        this.enableWebGLFeatures();
        break;
      case 'webAudio':
        this.enableWebAudioFeatures();
        break;
      case 'serviceWorker':
        this.enableOfflineSupport();
        break;
      case 'intersectionObserver':
        this.enableAdvancedAnimations();
        break;
    }

    return true;
  }

  /**
   * Disables a specific feature
   */
  disableFeature(feature: keyof FeatureSupport): void {
    const configKey = `enable${feature.charAt(0).toUpperCase() + feature.slice(1)}` as keyof ProgressiveConfig;
    this.config[configKey] = false;

    // Remove feature-specific CSS classes
    switch (feature) {
      case 'webgl':
        document.body.classList.remove('webgl-supported');
        break;
      case 'webAudio':
        document.body.classList.remove('webaudio-supported');
        break;
      case 'intersectionObserver':
        document.body.classList.remove('animations-supported');
        break;
    }
  }
}
