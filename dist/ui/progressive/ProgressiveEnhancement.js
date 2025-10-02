import { EventBus } from '../../utils/EventBus';
/**
 * Progressive enhancement manager
 */
export class ProgressiveEnhancement {
    features;
    config;
    bus;
    constructor(bus, config = {}) {
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
    detectFeatures() {
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
    detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        }
        catch {
            return false;
        }
    }
    /**
     * Detects Web Audio API support
     */
    detectWebAudio() {
        return 'webkitAudioContext' in window || 'AudioContext' in window;
    }
    /**
     * Detects LocalStorage support
     */
    detectLocalStorage() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Detects Service Worker support
     */
    detectServiceWorker() {
        return 'serviceWorker' in navigator;
    }
    /**
     * Detects Intersection Observer support
     */
    detectIntersectionObserver() {
        return 'IntersectionObserver' in window;
    }
    /**
     * Detects requestIdleCallback support
     */
    detectRequestIdleCallback() {
        return 'requestIdleCallback' in window;
    }
    /**
     * Detects Web Workers support
     */
    detectWebWorkers() {
        return 'Worker' in window;
    }
    /**
     * Detects advanced animation capabilities
     */
    detectAdvancedAnimations() {
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
    initializeProgressiveFeatures() {
        // Emit feature detection results
        this.bus.emit('features:detected', { features: this.features });
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
    enableWebGLFeatures() {
        this.bus.emit('webgl:enabled', {});
        // Add WebGL-specific CSS classes
        document.body.classList.add('webgl-supported');
        // Emit event for field component to use WebGL rendering
        this.bus.emit('ui:enhancement', {
            type: 'webgl',
            enabled: true,
            message: 'Enhanced graphics enabled'
        });
    }
    /**
     * Enables Web Audio features if supported
     */
    enableWebAudioFeatures() {
        this.bus.emit('webaudio:enabled', {});
        // Add Web Audio-specific CSS classes
        document.body.classList.add('webaudio-supported');
        // Emit event for SFX component to use Web Audio
        this.bus.emit('ui:enhancement', {
            type: 'webaudio',
            enabled: true,
            message: 'Enhanced audio enabled'
        });
    }
    /**
     * Enables offline support if service workers are supported
     */
    enableOfflineSupport() {
        this.bus.emit('offline:enabled', {});
        // Register service worker for offline functionality
        // Only attempt registration in production builds where sw.js is served with the correct MIME type
        try {
            const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
            if ('serviceWorker' in navigator && isProd) {
                // Optionally verify sw.js is reachable before registering
                fetch('/sw.js', { method: 'HEAD' }).then(resp => {
                    if (!resp.ok)
                        throw new Error(`sw.js not found (${resp.status})`);
                    return navigator.serviceWorker.register('/sw.js');
                }).then(registration => {
                    this.bus.emit('offline:ready', { registration });
                }).catch(error => {
                    console.warn('Service worker registration failed:', error);
                });
            }
        }
        catch (error) {
            console.warn('Service worker registration skipped:', error);
        }
    }
    /**
     * Enables advanced animations if supported
     */
    enableAdvancedAnimations() {
        this.bus.emit('animations:enabled', {});
        // Add animation-specific CSS classes
        document.body.classList.add('animations-supported');
        // Emit event for VFX component to use advanced animations
        this.bus.emit('ui:enhancement', {
            type: 'animations',
            enabled: true,
            message: 'Enhanced animations enabled'
        });
    }
    /**
     * Enables performance monitoring
     */
    enablePerformanceMonitoring() {
        if ('performance' in window && 'measure' in performance) {
            this.setupPerformanceMonitoring();
        }
    }
    /**
     * Sets up performance monitoring
     */
    setupPerformanceMonitoring() {
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
                this.bus.emit('performance:fps', { fps });
                frameCount = 0;
                lastFrameTime = now;
            }
            requestAnimationFrame(measureFrameRate);
        };
        requestAnimationFrame(measureFrameRate);
        // Monitor UI registration time
        this.bus.on('ui:ready', () => {
            const loadTime = performance.now() - startTime;
            performance.mark('ui-ready');
            this.bus.emit('performance:loadTime', {
                loadTime,
                mark: 'ui-ready'
            });
        });
        // Monitor game flow events
        this.bus.on('flow:gameStart', () => {
            performance.mark('game-start');
            const gameStartTime = performance.now() - startTime;
            this.bus.emit('performance:gameStartTime', {
                gameStartTime,
                mark: 'game-start'
            });
        });
    }
    /**
     * Sets up lazy loading for images
     */
    setupLazyLoading() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        if (lazyImages.length === 0)
            return;
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
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
    getFeatures() {
        return { ...this.features };
    }
    /**
     * Gets current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Checks if a specific feature is supported and enabled
     */
    isFeatureEnabled(feature) {
        return this.features[feature] && this.config[`enable${feature.charAt(0).toUpperCase() + feature.slice(1)}`] === true;
    }
    /**
     * Enables a specific feature if supported
     */
    enableFeature(feature) {
        if (!this.features[feature]) {
            return false;
        }
        const configKey = `enable${feature.charAt(0).toUpperCase() + feature.slice(1)}`;
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
    disableFeature(feature) {
        const configKey = `enable${feature.charAt(0).toUpperCase() + feature.slice(1)}`;
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
//# sourceMappingURL=ProgressiveEnhancement.js.map