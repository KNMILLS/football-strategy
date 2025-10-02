import { describe, it, expect, beforeEach } from 'vitest';
import type {
  PlaybookCardMetadata,
  DefensiveCardMetadata,
  CardCatalog,
  RiskLevel,
  PerimeterBias
} from '../../../src/data/cards/CardMetadata';
import type { PlaybookName, CardType } from '../../../src/types/dice';

describe('CardMetadata Types', () => {
  describe('PlaybookCardMetadata', () => {
    it('should have required properties', () => {
      const card: PlaybookCardMetadata = {
        id: 'test-card',
        playbook: 'West Coast',
        label: 'Test Card',
        type: 'pass',
        description: 'A test card',
        riskLevel: 'medium',
        perimeterBias: 'inside',
        tags: ['test', 'card']
      };

      expect(card.id).toBe('test-card');
      expect(card.playbook).toBe('West Coast');
      expect(card.label).toBe('Test Card');
      expect(card.type).toBe('pass');
      expect(card.description).toBe('A test card');
      expect(card.riskLevel).toBe('medium');
      expect(card.perimeterBias).toBe('inside');
      expect(card.tags).toEqual(['test', 'card']);
    });

    it('should allow optional statistical properties', () => {
      const card: PlaybookCardMetadata = {
        id: 'stats-card',
        playbook: 'Air Raid',
        label: 'Deep Pass',
        type: 'pass',
        description: 'A pass with statistics',
        riskLevel: 'high',
        perimeterBias: 'outside',
        tags: ['deep', 'risky'],
        averageYards: 15,
        completionRate: 0.65,
        touchdownRate: 0.12,
        turnoverRisk: 0.20
      };

      expect(card.averageYards).toBe(15);
      expect(card.completionRate).toBe(0.65);
      expect(card.touchdownRate).toBe(0.12);
      expect(card.turnoverRisk).toBe(0.20);
    });
  });

  describe('DefensiveCardMetadata', () => {
    it('should have required properties', () => {
      const card: DefensiveCardMetadata = {
        id: 'test-defense',
        label: 'Cover 2',
        description: 'Zone coverage with two deep safeties',
        coverageType: 'zone',
        aggressionLevel: 'conservative',
        tags: ['zone', 'coverage']
      };

      expect(card.id).toBe('test-defense');
      expect(card.label).toBe('Cover 2');
      expect(card.description).toBe('Zone coverage with two deep safeties');
      expect(card.coverageType).toBe('zone');
      expect(card.aggressionLevel).toBe('conservative');
      expect(card.tags).toEqual(['zone', 'coverage']);
    });
  });

  describe('CardCatalog', () => {
    it('should have correct structure', () => {
      const catalog: CardCatalog = {
        offensive: {
          playbooks: {
            'West Coast': [],
            'Spread': [],
            'Air Raid': [],
            'Smashmouth': [],
            'Wide Zone': []
          }
        },
        defensive: []
      };

      expect(catalog.offensive.playbooks).toBeDefined();
      expect(catalog.defensive).toBeDefined();
      expect(Object.keys(catalog.offensive.playbooks)).toHaveLength(5);
    });
  });

  describe('Type Guards', () => {
    it('should validate RiskLevel types', () => {
      const validRiskLevels: RiskLevel[] = ['low', 'medium', 'high', 'very-high'];

      validRiskLevels.forEach(level => {
        expect(['low', 'medium', 'high', 'very-high']).toContain(level);
      });
    });

    it('should validate PerimeterBias types', () => {
      const validBiases: PerimeterBias[] = ['inside', 'balanced', 'outside'];

      validBiases.forEach(bias => {
        expect(['inside', 'balanced', 'outside']).toContain(bias);
      });
    });

    it('should validate PlaybookName types', () => {
      const validPlaybooks: PlaybookName[] = [
        'West Coast',
        'Spread',
        'Air Raid',
        'Smashmouth',
        'Wide Zone'
      ];

      validPlaybooks.forEach(playbook => {
        expect(['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone']).toContain(playbook);
      });
    });

    it('should validate CardType types', () => {
      const validTypes: CardType[] = ['run', 'pass', 'punt', 'field-goal'];

      validTypes.forEach(type => {
        expect(['run', 'pass', 'punt', 'field-goal']).toContain(type);
      });
    });
  });
});
