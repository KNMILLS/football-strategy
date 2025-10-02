/**
 * Card catalog loader and accessor
 */
export class CardCatalogAccessor {
    static catalog = null;
    static loadPromise = null;
    /**
     * Load the card catalog from JSON data
     */
    static async loadCatalog() {
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
    static async loadCatalogData() {
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
        for (const playbookName of Object.keys(playbooks)) {
            if (!playbooks[playbookName] || playbooks[playbookName].length !== 20) {
                throw new Error(`Playbook ${playbookName} must have exactly 20 cards`);
            }
        }
        // Validate defensive deck has exactly 10 cards
        if (rawData.defensive.length !== 10) {
            throw new Error('Defensive deck must have exactly 10 cards');
        }
        return rawData;
    }
    /**
     * Get all offensive cards for a specific playbook
     */
    static async getPlaybookCards(playbook) {
        const result = await this.loadCatalog();
        if (!result.success || !result.data) {
            throw new Error(`Failed to load card catalog: ${result.error}`);
        }
        return result.data.offensive.playbooks[playbook] || [];
    }
    /**
     * Get a specific offensive card by ID
     */
    static async getOffensiveCard(cardId) {
        const result = await this.loadCatalog();
        if (!result.success || !result.data) {
            throw new Error(`Failed to load card catalog: ${result.error}`);
        }
        // Search through all playbooks for the card
        for (const playbook of Object.values(result.data.offensive.playbooks)) {
            const card = playbook.find(c => c.id === cardId);
            if (card)
                return card;
        }
        return null;
    }
    /**
     * Get all defensive cards
     */
    static async getDefensiveCards() {
        const result = await this.loadCatalog();
        if (!result.success || !result.data) {
            throw new Error(`Failed to load card catalog: ${result.error}`);
        }
        return result.data.defensive;
    }
    /**
     * Get a specific defensive card by ID
     */
    static async getDefensiveCard(cardId) {
        const result = await this.loadCatalog();
        if (!result.success || !result.data) {
            throw new Error(`Failed to load card catalog: ${result.error}`);
        }
        return result.data.defensive.find(c => c.id === cardId) || null;
    }
    /**
     * Filter offensive cards by criteria
     */
    static async filterOffensiveCards(criteria) {
        const result = await this.loadCatalog();
        if (!result.success || !result.data) {
            throw new Error(`Failed to load card catalog: ${result.error}`);
        }
        let cards = [];
        // Get cards from specific playbook or all playbooks
        if (criteria.playbook) {
            cards = result.data.offensive.playbooks[criteria.playbook] || [];
        }
        else {
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
            cards = cards.filter(card => (card.averageYards || 0) >= criteria.minAverageYards);
        }
        if (criteria.maxTurnoverRisk !== undefined) {
            cards = cards.filter(card => (card.turnoverRisk || 0) <= criteria.maxTurnoverRisk);
        }
        if (criteria.tags && criteria.tags.length > 0) {
            cards = cards.filter(card => criteria.tags.some(tag => card.tags.includes(tag)));
        }
        return cards;
    }
    /**
     * Filter defensive cards by criteria
     */
    static async filterDefensiveCards(criteria) {
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
            cards = cards.filter(card => criteria.tags.some(tag => card.tags.includes(tag)));
        }
        return cards;
    }
    /**
     * Get all available playbooks
     */
    static async getAvailablePlaybooks() {
        const result = await this.loadCatalog();
        if (!result.success || !result.data) {
            throw new Error(`Failed to load card catalog: ${result.error}`);
        }
        return Object.keys(result.data.offensive.playbooks);
    }
    /**
     * Get catalog statistics
     */
    static async getCatalogStats() {
        const result = await this.loadCatalog();
        if (!result.success || !result.data) {
            throw new Error(`Failed to load card catalog: ${result.error}`);
        }
        const offensiveCards = Object.values(result.data.offensive.playbooks).flat();
        const cardsByPlaybook = {};
        const cardsByType = { run: 0, pass: 0, punt: 0, 'field-goal': 0 };
        const cardsByRiskLevel = { low: 0, medium: 0, high: 0, 'very-high': 0 };
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
    static clearCache() {
        this.catalog = null;
        this.loadPromise = null;
    }
}
//# sourceMappingURL=CardCatalog.js.map