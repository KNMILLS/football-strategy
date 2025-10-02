import type { PlaybookName, CardType, DefensivePlay } from '../../types/dice';
import type {
  CardCatalog,
  CardCatalogLoadResult,
  PlaybookCardMetadata,
  DefensiveCardMetadata,
  RiskLevel,
  PerimeterBias
} from './CardMetadata';

/**
 * Card catalog loader and accessor
 */
export class CardCatalogAccessor {
  private static catalog: CardCatalog | null = null;
  private static loadPromise: Promise<CardCatalogLoadResult> | null = null;

  /**
   * Load the card catalog from JSON data
   */
  static async loadCatalog(): Promise<CardCatalogLoadResult> {
    // Return cached result if already loaded
    if (this.catalog) {
      return {
        success: true,
        data: this.catalog,
        loadTime: 0
      };
    }

    // Return existing load promise if already loading
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    const startTime = performance.now();
    this.loadPromise = this.loadCatalogData()
      .then(catalog => {
        this.catalog = catalog;
        const loadTime = performance.now() - startTime;
        return {
          success: true,
          data: catalog,
          loadTime
        };
      })
      .catch(error => {
        this.loadPromise = null;
        const loadTime = performance.now() - startTime;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          loadTime
        };
      });

    return this.loadPromise;
  }

  /**
   * Load catalog data from JSON file
   */
  private static async loadCatalogData(): Promise<CardCatalog> {
    const response = await fetch('/data/cards/playbooks.json');
    if (!response.ok) {
      throw new Error(`Failed to load card catalog: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    // Validate structure
    if (!rawData.offensive?.playbooks || !rawData.defensive) {
      throw new Error('Invalid card catalog structure');
    }

    // Validate each playbook has exactly 20 cards
    const playbooks = rawData.offensive.playbooks;
    for (const playbookName of Object.keys(playbooks) as PlaybookName[]) {
      if (!playbooks[playbookName] || playbooks[playbookName].length !== 20) {
        throw new Error(`Playbook ${playbookName} must have exactly 20 cards`);
      }
    }

    // Validate defensive deck has exactly 10 cards
    if (rawData.defensive.length !== 10) {
      throw new Error('Defensive deck must have exactly 10 cards');
    }

    return rawData as CardCatalog;
  }

  /**
   * Get all offensive cards for a specific playbook
   */
  static async getPlaybookCards(playbook: PlaybookName): Promise<PlaybookCardMetadata[]> {
    const result = await this.loadCatalog();
    if (!result.success || !result.data) {
      throw new Error(`Failed to load card catalog: ${result.error}`);
    }

    return result.data.offensive.playbooks[playbook] || [];
  }

  /**
   * Get a specific offensive card by ID
   */
  static async getOffensiveCard(cardId: string): Promise<PlaybookCardMetadata | null> {
    const result = await this.loadCatalog();
    if (!result.success || !result.data) {
      throw new Error(`Failed to load card catalog: ${result.error}`);
    }

    // Search through all playbooks for the card
    for (const playbook of Object.values(result.data.offensive.playbooks)) {
      const card = playbook.find(c => c.id === cardId);
      if (card) return card;
    }

    return null;
  }

  /**
   * Get all defensive cards
   */
  static async getDefensiveCards(): Promise<DefensiveCardMetadata[]> {
    const result = await this.loadCatalog();
    if (!result.success || !result.data) {
      throw new Error(`Failed to load card catalog: ${result.error}`);
    }

    return result.data.defensive;
  }

  /**
   * Get a specific defensive card by ID
   */
  static async getDefensiveCard(cardId: string): Promise<DefensiveCardMetadata | null> {
    const result = await this.loadCatalog();
    if (!result.success || !result.data) {
      throw new Error(`Failed to load card catalog: ${result.error}`);
    }

    return result.data.defensive.find(c => c.id === cardId) || null;
  }

  /**
   * Filter offensive cards by criteria
   */
  static async filterOffensiveCards(criteria: {
    playbook?: PlaybookName;
    type?: CardType;
    riskLevel?: RiskLevel;
    perimeterBias?: PerimeterBias;
    tags?: string[];
    minAverageYards?: number;
    maxTurnoverRisk?: number;
  }): Promise<PlaybookCardMetadata[]> {
    const result = await this.loadCatalog();
    if (!result.success || !result.data) {
      throw new Error(`Failed to load card catalog: ${result.error}`);
    }

    let cards: PlaybookCardMetadata[] = [];

    // Get cards from specific playbook or all playbooks
    if (criteria.playbook) {
      cards = result.data.offensive.playbooks[criteria.playbook] || [];
    } else {
      cards = Object.values(result.data.offensive.playbooks).flat();
    }

    // Apply filters
    if (criteria.type) {
      cards = cards.filter(card => card.type === criteria.type);
    }

    if (criteria.riskLevel) {
      cards = cards.filter(card => card.riskLevel === criteria.riskLevel);
    }

    if (criteria.perimeterBias) {
      cards = cards.filter(card => card.perimeterBias === criteria.perimeterBias);
    }

    if (criteria.minAverageYards !== undefined) {
      cards = cards.filter(card => (card.averageYards || 0) >= criteria.minAverageYards!);
    }

    if (criteria.maxTurnoverRisk !== undefined) {
      cards = cards.filter(card => (card.turnoverRisk || 0) <= criteria.maxTurnoverRisk!);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      cards = cards.filter(card =>
        criteria.tags!.some(tag => card.tags.includes(tag))
      );
    }

    return cards;
  }

  /**
   * Filter defensive cards by criteria
   */
  static async filterDefensiveCards(criteria: {
    coverageType?: 'man' | 'zone' | 'blitz' | 'prevent';
    aggressionLevel?: 'conservative' | 'balanced' | 'aggressive';
    tags?: string[];
  }): Promise<DefensiveCardMetadata[]> {
    const result = await this.loadCatalog();
    if (!result.success || !result.data) {
      throw new Error(`Failed to load card catalog: ${result.error}`);
    }

    let cards = result.data.defensive;

    if (criteria.coverageType) {
      cards = cards.filter(card => card.coverageType === criteria.coverageType);
    }

    if (criteria.aggressionLevel) {
      cards = cards.filter(card => card.aggressionLevel === criteria.aggressionLevel);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      cards = cards.filter(card =>
        criteria.tags!.some(tag => card.tags.includes(tag))
      );
    }

    return cards;
  }

  /**
   * Get all available playbooks
   */
  static async getAvailablePlaybooks(): Promise<PlaybookName[]> {
    const result = await this.loadCatalog();
    if (!result.success || !result.data) {
      throw new Error(`Failed to load card catalog: ${result.error}`);
    }

    return Object.keys(result.data.offensive.playbooks) as PlaybookName[];
  }

  /**
   * Get catalog statistics
   */
  static async getCatalogStats(): Promise<{
    totalOffensiveCards: number;
    totalDefensiveCards: number;
    playbooksCount: number;
    cardsByPlaybook: Record<PlaybookName, number>;
    cardsByType: Record<CardType, number>;
    cardsByRiskLevel: Record<RiskLevel, number>;
  }> {
    const result = await this.loadCatalog();
    if (!result.success || !result.data) {
      throw new Error(`Failed to load card catalog: ${result.error}`);
    }

    const offensiveCards = Object.values(result.data.offensive.playbooks).flat();
    const cardsByPlaybook: Record<PlaybookName, number> = {} as any;
    const cardsByType: Record<CardType, number> = { run: 0, pass: 0, punt: 0, 'field-goal': 0 };
    const cardsByRiskLevel: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, 'very-high': 0 };

    for (const card of offensiveCards) {
      cardsByPlaybook[card.playbook] = (cardsByPlaybook[card.playbook] || 0) + 1;
      cardsByType[card.type]++;
      cardsByRiskLevel[card.riskLevel]++;
    }

    return {
      totalOffensiveCards: offensiveCards.length,
      totalDefensiveCards: result.data.defensive.length,
      playbooksCount: Object.keys(result.data.offensive.playbooks).length,
      cardsByPlaybook,
      cardsByType,
      cardsByRiskLevel
    };
  }

  /**
   * Clear cached catalog (useful for testing or hot reloading)
   */
  static clearCache(): void {
    this.catalog = null;
    this.loadPromise = null;
  }
}
