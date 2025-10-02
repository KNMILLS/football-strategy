import type { PlaybookName, CardType, DefensivePlay } from '../../types/dice';

/**
 * Visual card properties for programmatic rendering
 */
export interface VisualCardProperties {
  // Risk level indicator (1-5, where 5 is highest risk)
  riskLevel: 1 | 2 | 3 | 4 | 5;

  // Out of bounds bias indicator (0-1, where 1 is fully perimeter)
  perimeterBias: number;

  // Card color theme
  theme: CardTheme;

  // Optional custom styling overrides
  customStyles?: Partial<CardStyles>;
}

/**
 * Card rendering dimensions and layout
 */
export interface CardDimensions {
  width: number;
  height: number;
  padding: number;
  borderRadius: number;
}

/**
 * Card visual themes
 */
export type CardTheme = 'offense' | 'defense' | 'special';

/**
 * Card styling configuration
 */
export interface CardStyles {
  background: string;
  border: string;
  text: {
    primary: string;
    secondary: string;
    accent: string;
  };
  riskIndicator: {
    low: string;
    medium: string;
    high: string;
  };
  perimeterBadge: {
    background: string;
    border: string;
  };
}

/**
 * Enhanced playbook card with visual properties
 */
export interface VisualPlaybookCard {
  id: string;
  playbook: PlaybookName;
  label: string;
  type: CardType;
  description?: string;
  visual: VisualCardProperties;
}

/**
 * Enhanced defensive card with visual properties
 */
export interface VisualDefensiveCard {
  id: string;
  label: DefensivePlay;
  visual: VisualCardProperties;
}

/**
 * Card rendering configuration
 */
export interface CardRenderConfig {
  dimensions: CardDimensions;
  enableCaching: boolean;
  enableAnimations: boolean;
  fallbackToText: boolean;
}

/**
 * Card cache entry for performance optimization
 */
export interface CardCacheEntry {
  svg: string;
  timestamp: number;
  renderTime: number;
}

/**
 * Default card configuration
 */
export const DEFAULT_CARD_CONFIG: CardRenderConfig = {
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
export const CARD_THEMES: Record<CardTheme, CardStyles> = {
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
