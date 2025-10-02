import { DEFAULT_CARD_CONFIG, CARD_THEMES } from './types';
import { CardTemplateFactory } from './CardTemplates';
/**
 * High-performance card renderer with caching and progressive enhancement
 * Renders cards in under 5ms per card with intelligent caching
 */
export class CardRenderer {
    config;
    bus;
    cache;
    templateFactory;
    renderStats = {
        totalRenders: 0,
        cacheHits: 0,
        averageRenderTime: 0,
        lastRenderTime: 0
    };
    constructor(bus, config = {}) {
        this.bus = bus;
        this.config = { ...DEFAULT_CARD_CONFIG, ...config };
        this.cache = new Map();
        // Initialize template factory with default dimensions and styles
        this.templateFactory = new CardTemplateFactory(this.config.dimensions, CARD_THEMES.offense // Default theme, will be overridden per card
        );
        this.setupPerformanceMonitoring();
    }
    /**
     * Renders an offensive playbook card
     * Performance target: < 5ms per render with caching
     */
    renderOffensiveCard(card) {
        const startTime = performance.now();
        try {
            // Check cache first
            if (this.config.enableCaching) {
                const cacheKey = this.getCacheKey('offensive', card);
                const cached = this.cache.get(cacheKey);
                if (cached && this.isCacheValid(cached)) {
                    this.renderStats.cacheHits++;
                    this.recordRenderTime(performance.now() - startTime);
                    return cached.svg;
                }
            }
            // Render new card
            const svg = this.renderOffensiveCardInternal(card);
            const renderTime = performance.now() - startTime;
            // Cache the result
            if (this.config.enableCaching) {
                this.cache.set(this.getCacheKey('offensive', card), {
                    svg,
                    timestamp: Date.now(),
                    renderTime
                });
            }
            this.recordRenderTime(renderTime);
            this.renderStats.totalRenders++;
            // Emit performance metrics
            this.bus.emit('cards:renderComplete', {
                cardId: card.id,
                renderTime,
                cached: false
            });
            return svg;
        }
        catch (error) {
            console.error('Failed to render offensive card:', error);
            this.bus.emit('cards:renderError', {
                cardId: card.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            // Fallback to text representation
            if (this.config.fallbackToText) {
                return this.renderTextFallback(card);
            }
            throw error;
        }
    }
    /**
     * Renders a defensive card
     * Performance target: < 5ms per render with caching
     */
    renderDefensiveCard(card) {
        const startTime = performance.now();
        try {
            // Check cache first
            if (this.config.enableCaching) {
                const cacheKey = this.getCacheKey('defensive', card);
                const cached = this.cache.get(cacheKey);
                if (cached && this.isCacheValid(cached)) {
                    this.renderStats.cacheHits++;
                    this.recordRenderTime(performance.now() - startTime);
                    return cached.svg;
                }
            }
            // Render new card
            const svg = this.renderDefensiveCardInternal(card);
            const renderTime = performance.now() - startTime;
            // Cache the result
            if (this.config.enableCaching) {
                this.cache.set(this.getCacheKey('defensive', card), {
                    svg,
                    timestamp: Date.now(),
                    renderTime
                });
            }
            this.recordRenderTime(renderTime);
            this.renderStats.totalRenders++;
            // Emit performance metrics
            this.bus.emit('cards:renderComplete', {
                cardId: card.id,
                renderTime,
                cached: false
            });
            return svg;
        }
        catch (error) {
            console.error('Failed to render defensive card:', error);
            this.bus.emit('cards:renderError', {
                cardId: card.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            // Fallback to text representation
            if (this.config.fallbackToText) {
                return this.renderTextFallback(card);
            }
            throw error;
        }
    }
    /**
     * Internal offensive card rendering logic
     */
    renderOffensiveCardInternal(card) {
        // Get appropriate theme for the card
        const theme = this.getCardTheme(card.visual.theme);
        this.templateFactory = new CardTemplateFactory(this.config.dimensions, theme);
        const template = this.templateFactory.createOffensiveTemplate();
        return template({
            title: card.label,
            description: card.description || '',
            riskLevel: card.visual.riskLevel,
            perimeterBias: card.visual.perimeterBias
        });
    }
    /**
     * Internal defensive card rendering logic
     */
    renderDefensiveCardInternal(card) {
        // Get appropriate theme for the card
        const theme = this.getCardTheme(card.visual.theme);
        this.templateFactory = new CardTemplateFactory(this.config.dimensions, theme);
        const template = this.templateFactory.createDefensiveTemplate();
        return template({
            title: card.label,
            riskLevel: card.visual.riskLevel,
            perimeterBias: card.visual.perimeterBias
        });
    }
    /**
     * Renders a text fallback when SVG rendering fails
     */
    renderTextFallback(card) {
        const { width, height, padding } = this.config.dimensions;
        return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
           xmlns="http://www.w3.org/2000/svg" role="img">
        <rect width="${width}" height="${height}" rx="8"
              fill="#f3f4f6" stroke="#9ca3af" stroke-width="2"/>
        <text x="${width / 2}" y="${height / 2 - 10}" font-family="Arial, sans-serif"
              font-size="16" font-weight="bold" fill="#374151" text-anchor="middle">
          ${card.label}
        </text>
        <text x="${width / 2}" y="${height / 2 + 10}" font-family="Arial, sans-serif"
              font-size="12" fill="#6b7280" text-anchor="middle">
          Card unavailable
        </text>
      </svg>
    `;
    }
    /**
     * Generates a cache key for a card
     */
    getCacheKey(type, card) {
        // Create a deterministic cache key based on card properties
        const visualHash = this.hashCardVisuals(card.visual);
        return `${type}:${card.id}:${visualHash}`;
    }
    /**
     * Creates a hash of card visual properties for caching
     */
    hashCardVisuals(visual) {
        // Simple hash function - in production, use a proper hash
        return `${visual.riskLevel}-${Math.round(visual.perimeterBias * 100)}-${visual.theme}-${JSON.stringify(visual.customStyles || {})}`;
    }
    /**
     * Checks if a cached entry is still valid
     */
    isCacheValid(entry) {
        // Cache entries are valid for 5 minutes
        const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds
        return Date.now() - entry.timestamp < maxAge;
    }
    /**
     * Gets the appropriate card theme styles
     */
    getCardTheme(theme) {
        const baseTheme = CARD_THEMES[theme];
        // Apply custom styles if provided
        if (this.config.enableAnimations) {
            return this.applyCustomStyles(baseTheme);
        }
        return baseTheme;
    }
    /**
     * Applies custom styling overrides to base theme
     */
    applyCustomStyles(baseTheme) {
        // For now, just return base theme
        // In a full implementation, this would merge custom styles
        return baseTheme;
    }
    /**
     * Records render time for performance monitoring
     */
    recordRenderTime(renderTime) {
        this.renderStats.lastRenderTime = renderTime;
        // Update running average
        const totalTime = this.renderStats.averageRenderTime * (this.renderStats.totalRenders - 1) + renderTime;
        this.renderStats.averageRenderTime = totalTime / this.renderStats.totalRenders;
    }
    /**
     * Sets up performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor cache efficiency
        setInterval(() => {
            const cacheEfficiency = this.renderStats.totalRenders > 0
                ? (this.renderStats.cacheHits / this.renderStats.totalRenders) * 100
                : 0;
            this.bus.emit('cards:performance', {
                ...this.renderStats,
                cacheEfficiency,
                cacheSize: this.cache.size
            });
            // Clean up old cache entries periodically
            this.cleanupCache();
        }, 30000); // Every 30 seconds
    }
    /**
     * Cleans up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10 minutes
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > maxAge) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Updates renderer configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Clear cache if dimensions changed
        if (newConfig.dimensions &&
            (newConfig.dimensions.width !== this.config.dimensions.width ||
                newConfig.dimensions.height !== this.config.dimensions.height)) {
            this.cache.clear();
        }
    }
    /**
     * Gets current render statistics
     */
    getRenderStats() {
        return { ...this.renderStats };
    }
    /**
     * Gets cache information
     */
    getCacheInfo() {
        return {
            size: this.cache.size,
            enabled: this.config.enableCaching,
            hitRate: this.renderStats.totalRenders > 0
                ? (this.renderStats.cacheHits / this.renderStats.totalRenders) * 100
                : 0
        };
    }
    /**
     * Clears the render cache
     */
    clearCache() {
        this.cache.clear();
        this.bus.emit('cards:cacheCleared', {});
    }
    /**
     * Pre-renders cards for better performance
     */
    async preloadCards(cards) {
        const promises = cards.map(async (card) => {
            if ('playbook' in card) {
                return this.renderOffensiveCard(card);
            }
            else {
                return this.renderDefensiveCard(card);
            }
        });
        try {
            await Promise.all(promises);
            this.bus.emit('cards:preloadComplete', { count: cards.length });
        }
        catch (error) {
            console.error('Failed to preload cards:', error);
            this.bus.emit('cards:preloadError', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
}
//# sourceMappingURL=CardRenderer.js.map