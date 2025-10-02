import { CardRenderer } from './CardRenderer';
import { CardDefinitions } from './CardDefinitions';
import { DEFAULT_CARD_CONFIG } from './types';
/**
 * Progressive card system that provides fallbacks and feature detection
 * Integrates with the existing progressive enhancement system
 */
export class ProgressiveCardSystem {
    bus;
    cardRenderer;
    cardDefinitions;
    config;
    featureSupport = {
        svg: true,
        canvas: true,
        webgl: false,
        animations: true,
        textFallback: true
    };
    constructor(bus, config = {}) {
        this.bus = bus;
        this.config = {
            ...DEFAULT_CARD_CONFIG,
            ...config
        };
        this.cardRenderer = new CardRenderer(bus, this.config);
        this.cardDefinitions = CardDefinitions.getInstance();
        this.detectFeatures();
        this.setupProgressiveEnhancements();
    }
    /**
     * Detects browser features for card rendering
     */
    detectFeatures() {
        // SVG support (almost universal now)
        this.featureSupport.svg = this.detectSVGSupport();
        // Canvas support
        this.featureSupport.canvas = this.detectCanvasSupport();
        // WebGL support for advanced effects
        this.featureSupport.webgl = this.detectWebGLSupport();
        // Animation support
        this.featureSupport.animations = this.detectAnimationSupport();
        // Text fallback (always available)
        this.featureSupport.textFallback = true;
        // Emit feature detection results
        this.bus.emit('cards:featuresDetected', {
            features: this.featureSupport
        });
    }
    /**
     * Sets up progressive enhancements based on detected features
     */
    setupProgressiveEnhancements() {
        // Enable advanced features if supported
        if (this.featureSupport.webgl) {
            this.enableWebGLFeatures();
        }
        if (this.featureSupport.animations) {
            this.enableAnimationFeatures();
        }
        // Set up fallback strategies
        this.setupFallbackStrategies();
        // Listen for progressive enhancement events
        this.bus.on('progressive:enhancement', (payload) => {
            this.handleProgressiveEnhancement(payload);
        });
    }
    /**
     * Detects SVG support
     */
    detectSVGSupport() {
        try {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '1');
            svg.setAttribute('height', '1');
            return svg.namespaceURI === 'http://www.w3.org/2000/svg';
        }
        catch {
            return false;
        }
    }
    /**
     * Detects Canvas support
     */
    detectCanvasSupport() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext && canvas.getContext('2d'));
        }
        catch {
            return false;
        }
    }
    /**
     * Detects WebGL support
     */
    detectWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        }
        catch {
            return false;
        }
    }
    /**
     * Detects animation support
     */
    detectAnimationSupport() {
        const style = document.createElement('div').style;
        return 'transform' in style && 'transition' in style && 'animation' in style;
    }
    /**
     * Enables WebGL features for cards
     */
    enableWebGLFeatures() {
        this.bus.emit('cards:webglEnabled', {});
        // Update configuration for WebGL
        this.cardRenderer.updateConfig({
            enableAnimations: true,
            dimensions: { ...this.config.dimensions } // Could adjust dimensions for WebGL
        });
        // Add WebGL-specific CSS classes
        document.body.classList.add('cards-webgl-supported');
    }
    /**
     * Enables animation features for cards
     */
    enableAnimationFeatures() {
        this.bus.emit('cards:animationsEnabled', {});
        // Update configuration for animations
        this.cardRenderer.updateConfig({
            enableAnimations: true
        });
        // Add animation-specific CSS classes
        document.body.classList.add('cards-animations-supported');
    }
    /**
     * Sets up fallback strategies for unsupported features
     */
    setupFallbackStrategies() {
        // Primary: SVG rendering
        if (!this.featureSupport.svg) {
            console.warn('SVG not supported, falling back to Canvas');
            this.setupCanvasFallback();
        }
        // Secondary: Canvas rendering
        if (!this.featureSupport.canvas) {
            console.warn('Canvas not supported, falling back to text');
            this.setupTextFallback();
        }
        // Tertiary: Text rendering (always available)
        if (!this.featureSupport.textFallback) {
            console.error('Text fallback not available - card rendering may fail');
        }
    }
    /**
     * Sets up Canvas fallback for SVG
     */
    setupCanvasFallback() {
        this.bus.emit('cards:fallbackActivated', {
            from: 'svg',
            to: 'canvas',
            reason: 'SVG not supported'
        });
        // Update renderer configuration
        this.cardRenderer.updateConfig({
            enableAnimations: false, // Canvas animations are limited
            fallbackToText: true
        });
        // Add fallback CSS classes
        document.body.classList.add('cards-canvas-fallback');
    }
    /**
     * Sets up text fallback for Canvas/SVG
     */
    setupTextFallback() {
        this.bus.emit('cards:fallbackActivated', {
            from: 'canvas',
            to: 'text',
            reason: 'Canvas not supported'
        });
        // Update renderer configuration
        this.cardRenderer.updateConfig({
            enableAnimations: false,
            fallbackToText: true
        });
        // Add fallback CSS classes
        document.body.classList.add('cards-text-fallback');
    }
    /**
     * Handles progressive enhancement events
     */
    handleProgressiveEnhancement(payload) {
        switch (payload.type) {
            case 'webgl':
                if (payload.enabled && this.featureSupport.webgl) {
                    this.enableWebGLFeatures();
                }
                else {
                    this.cardRenderer.updateConfig({ enableAnimations: false });
                }
                break;
            case 'animations':
                this.cardRenderer.updateConfig({ enableAnimations: payload.enabled });
                break;
            case 'caching':
                this.cardRenderer.updateConfig({ enableCaching: payload.enabled });
                break;
        }
    }
    /**
     * Renders a card with progressive enhancement
     */
    async renderCard(cardId) {
        const card = this.cardDefinitions.getCard(cardId);
        if (!card) {
            throw new Error(`Card not found: ${cardId}`);
        }
        try {
            // Try primary rendering method (SVG)
            if (this.featureSupport.svg) {
                if ('playbook' in card) {
                    return this.cardRenderer.renderOffensiveCard(card);
                }
                else {
                    return this.cardRenderer.renderDefensiveCard(card);
                }
            }
            // Fallback to Canvas if SVG fails
            if (this.featureSupport.canvas) {
                return this.renderCardToCanvas(card);
            }
            // Final fallback to text
            if (this.featureSupport.textFallback) {
                return this.renderCardAsText(card);
            }
            throw new Error('No rendering methods available');
        }
        catch (error) {
            console.error(`Failed to render card ${cardId}:`, error);
            // Emit fallback event
            this.bus.emit('cards:renderFallback', {
                cardId,
                originalError: error instanceof Error ? error.message : 'Unknown error'
            });
            // Try next fallback method
            if (this.featureSupport.canvas && this.featureSupport.svg) {
                return this.renderCardToCanvas(card);
            }
            else if (this.featureSupport.textFallback) {
                return this.renderCardAsText(card);
            }
            throw error;
        }
    }
    /**
     * Renders card to Canvas (fallback method)
     */
    renderCardToCanvas(card) {
        // For now, return text fallback
        // In a full implementation, this would use Canvas 2D API to draw the card
        return this.renderCardAsText(card);
    }
    /**
     * Renders card as text (final fallback method)
     */
    renderCardAsText(card) {
        const { width, height } = this.config.dimensions;
        return `
      <div style="
        width: ${width}px;
        height: ${height}px;
        background: #f3f4f6;
        border: 2px solid #9ca3af;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-family: Arial, sans-serif;
        color: #374151;
        padding: 12px;
        box-sizing: border-box;
      ">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">
          ${card.label}
        </div>
        <div style="font-size: 12px; color: #6b7280;">
          Risk: ${card.visual.riskLevel}/5
        </div>
        <div style="font-size: 12px; color: #6b7280;">
          OOB: ${Math.round(card.visual.perimeterBias * 100)}%
        </div>
        <div style="font-size: 10px; color: #9ca3af; margin-top: 8px;">
          SVG unavailable
        </div>
      </div>
    `;
    }
    /**
     * Preloads cards for better performance
     */
    async preloadCards(cardIds) {
        const cards = cardIds
            .map(id => this.cardDefinitions.getCard(id))
            .filter(card => card !== undefined);
        await this.cardRenderer.preloadCards(cards);
    }
    /**
     * Gets feature support information
     */
    getFeatureSupport() {
        return { ...this.featureSupport };
    }
    /**
     * Gets renderer statistics
     */
    getRenderStats() {
        return this.cardRenderer.getRenderStats();
    }
    /**
     * Gets cache information
     */
    getCacheInfo() {
        return this.cardRenderer.getCacheInfo();
    }
    /**
     * Updates system configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.cardRenderer.updateConfig(newConfig);
    }
    /**
     * Clears render cache
     */
    clearCache() {
        this.cardRenderer.clearCache();
    }
    /**
     * Gets card definitions instance
     */
    getCardDefinitions() {
        return this.cardDefinitions;
    }
    /**
     * Gets card renderer instance
     */
    getCardRenderer() {
        return this.cardRenderer;
    }
}
//# sourceMappingURL=ProgressiveCardSystem.js.map