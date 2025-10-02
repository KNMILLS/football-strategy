import type { PlaybookName, CardType, DefensivePlay } from '../../types/dice';

/**
 * Risk level indicators for cards
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'very-high';

/**
 * Perimeter bias indicators for plays
 */
export type PerimeterBias = 'inside' | 'balanced' | 'outside';

/**
 * Enhanced playbook card with comprehensive metadata
 */
export interface PlaybookCardMetadata {
  id: string;
  playbook: PlaybookName;
  label: string;
  type: CardType;
  description: string;
  riskLevel: RiskLevel;
  perimeterBias: PerimeterBias;
  tags: string[];
  averageYards?: number;
  completionRate?: number; // For pass plays
  touchdownRate?: number;
  turnoverRisk?: number;
}

/**
 * Defensive card metadata
 */
export interface DefensiveCardMetadata {
  id: string;
  label: DefensivePlay;
  description: string;
  coverageType: 'man' | 'zone' | 'blitz' | 'prevent';
  aggressionLevel: 'conservative' | 'balanced' | 'aggressive';
  tags: string[];
}

/**
 * Complete card catalog structure
 */
export interface CardCatalog {
  offensive: {
    playbooks: Record<PlaybookName, PlaybookCardMetadata[]>;
  };
  defensive: DefensiveCardMetadata[];
}

/**
 * Card catalog loading result
 */
export interface CardCatalogLoadResult {
  success: boolean;
  data?: CardCatalog;
  error?: string;
  loadTime: number;
}
