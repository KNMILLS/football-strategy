/**
 * Default card configuration
 */
export const DEFAULT_CARD_CONFIG = {
    dimensions: {
        width: 200,
        height: 280,
        padding: 12,
        borderRadius: 8
    },
    enableCaching: true,
    enableAnimations: true,
    fallbackToText: true
};
/**
 * Default card themes
 */
export const CARD_THEMES = {
    offense: {
        background: '#1e40af', // Blue
        border: '#1e3a8a',
        text: {
            primary: '#ffffff',
            secondary: '#dbeafe',
            accent: '#fbbf24'
        },
        riskIndicator: {
            low: '#22c55e',
            medium: '#f59e0b',
            high: '#ef4444'
        },
        perimeterBadge: {
            background: '#1e40af',
            border: '#ffffff'
        }
    },
    defense: {
        background: '#dc2626', // Red
        border: '#991b1b',
        text: {
            primary: '#ffffff',
            secondary: '#fecaca',
            accent: '#fbbf24'
        },
        riskIndicator: {
            low: '#22c55e',
            medium: '#f59e0b',
            high: '#ef4444'
        },
        perimeterBadge: {
            background: '#dc2626',
            border: '#ffffff'
        }
    },
    special: {
        background: '#7c3aed', // Purple
        border: '#5b21b6',
        text: {
            primary: '#ffffff',
            secondary: '#e9d5ff',
            accent: '#fbbf24'
        },
        riskIndicator: {
            low: '#22c55e',
            medium: '#f59e0b',
            high: '#ef4444'
        },
        perimeterBadge: {
            background: '#7c3aed',
            border: '#ffffff'
        }
    }
};
//# sourceMappingURL=types.js.map