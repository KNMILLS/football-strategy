/**
 * Integration module that bridges the dice UI with the existing game flow system.
 * This allows the dice UI to work alongside the current image-based card system.
 */
export class DiceUIIntegration {
    bus;
    diceUI = null;
    isEnabled = false;
    constructor(bus) {
        this.bus = bus;
    }
    /**
     * Enable dice UI integration
     */
    enable(diceUI) {
        if (this.isEnabled) {
            console.warn('DiceUI integration already enabled');
            return;
        }
        this.diceUI = diceUI;
        this.isEnabled = true;
        console.log('DiceUI integration enabled');
        // Set up event bridges
        this.setupGameFlowBridge();
        this.setupDiceUIBridge();
        // Emit integration ready event
        this.bus.emit('ui:diceUIIntegrationReady', { enabled: true });
    }
    /**
     * Disable dice UI integration
     */
    disable() {
        if (!this.isEnabled)
            return;
        this.isEnabled = false;
        this.diceUI = null;
        console.log('DiceUI integration disabled');
        // Emit integration disabled event
        this.bus.emit('ui:diceUIIntegrationDisabled', { enabled: false });
    }
    /**
     * Check if dice UI integration is enabled
     */
    isIntegrationEnabled() {
        return this.isEnabled && this.diceUI !== null;
    }
    /**
     * Set up bridge between game flow events and dice UI
     */
    setupGameFlowBridge() {
        // Listen for hand updates and sync with dice UI
        this.bus.on('handUpdate', (payload) => {
            if (!this.isEnabled || !this.diceUI)
                return;
            // Determine if player is on offense or defense based on possession
            const isPlayerOffense = payload.isPlayerOffense;
            // Update dice UI possession state
            this.bus.emit('ui:possessionChanged', { isPlayerOffense });
            // If player is on defense, show defensive card selection
            if (!isPlayerOffense) {
                // The dice UI defensive selector should be visible
                // Cards are handled by the CardSelector component
            }
        });
        // Listen for dice resolution results
        this.bus.on('ui:diceResult', (payload) => {
            if (!this.isEnabled || !this.diceUI)
                return;
            // Show result in dice UI
            this.bus.emit('ui:resultDisplayShown', { result: payload.outcome });
        });
        // Listen for penalty events that require user choice
        this.bus.on('flow:choiceRequired', (payload) => {
            if (!this.isEnabled || !this.diceUI)
                return;
            if (payload.choice === 'penaltyAcceptDecline') {
                // Show penalty modal in dice UI
                // The modal will be triggered by the existing flow
            }
        });
        // Listen for game reset events
        this.bus.on('ui:newGame', () => {
            if (!this.isEnabled || !this.diceUI)
                return;
            // Reset dice UI state
            this.bus.emit('ui:gameReset', {});
        });
        // Listen for HUD updates to sync possession state
        this.bus.on('hudUpdate', (payload) => {
            if (!this.isEnabled || !this.diceUI)
                return;
            // Update dice UI possession state based on HUD
            this.bus.emit('ui:possessionChanged', { isPlayerOffense: payload.possession === 'player' });
        });
    }
    /**
     * Set up bridge between dice UI events and game flow
     */
    setupDiceUIBridge() {
        if (!this.diceUI)
            return;
        // Listen for dice UI events and forward to game flow
        this.bus.on('ui:playCard', (payload) => {
            if (!this.isEnabled)
                return;
            // Forward card selection to game flow
            // The game flow will handle this the same way as image-based cards
            console.log('DiceUI card selected:', payload.cardId);
        });
        // Listen for penalty decisions from dice UI
        this.bus.on('ui:choice.penalty', (payload) => {
            if (!this.isEnabled)
                return;
            // Forward penalty decision to existing penalty UI system
            // This maintains compatibility with the existing penalty flow
            console.log('DiceUI penalty decision:', payload.decision);
        });
        // Listen for dice UI ready state
        this.bus.on('ui:diceUIReady', (payload) => {
            if (!this.isEnabled)
                return;
            console.log('DiceUI is ready for integration');
        });
        // Listen for dice UI state changes
        this.bus.on('ui:playbookStateChanged', (payload) => {
            if (!this.isEnabled)
                return;
            // Could sync with game state if needed
            console.log('DiceUI playbook state changed');
        });
        this.bus.on('ui:defensiveStateChanged', (payload) => {
            if (!this.isEnabled)
                return;
            // Could sync with game state if needed
            console.log('DiceUI defensive state changed');
        });
    }
    /**
     * Show dice result in dice UI
     */
    showDiceResult(diceResult, outcome, offensiveCard, defensiveCard) {
        if (!this.isEnabled || !this.diceUI)
            return;
        this.bus.emit('ui:diceResult', {
            diceResult,
            outcome,
            offensiveCard,
            defensiveCard
        });
    }
    /**
     * Show penalty override modal in dice UI
     */
    showPenaltyOverride(penaltyInfo, description) {
        if (!this.isEnabled || !this.diceUI)
            return;
        this.bus.emit('ui:penaltyOverride', { penaltyInfo, description });
    }
    /**
     * Update dice UI possession state
     */
    updatePossession(isPlayerOffense) {
        if (!this.isEnabled || !this.diceUI)
            return;
        this.bus.emit('ui:possessionChanged', { isPlayerOffense });
    }
    /**
     * Reset dice UI state
     */
    resetUI() {
        if (!this.isEnabled || !this.diceUI)
            return;
        this.bus.emit('ui:gameReset', {});
    }
    /**
     * Get current dice UI state
     */
    getDiceUIState() {
        if (!this.diceUI)
            return null;
        return this.diceUI.getState();
    }
    /**
     * Test dice UI components
     */
    testComponents() {
        if (!this.isEnabled || !this.diceUI) {
            console.warn('DiceUI integration not enabled');
            return;
        }
        console.log('Testing DiceUI components...');
        // Test penalty modal
        this.diceUI?.showTestPenaltyModal();
        // Test result display (after a delay to see penalty modal first)
        setTimeout(() => {
            this.diceUI?.showTestResult();
        }, 2000);
        console.log('DiceUI component tests initiated');
    }
}
/**
 * Factory function to create dice UI integration instance
 */
export function createDiceUIIntegration(bus) {
    return new DiceUIIntegration(bus);
}
/**
 * Global dice UI integration instance (for backwards compatibility)
 */
let globalIntegration = null;
export function getDiceUIIntegration() {
    return globalIntegration;
}
export function initializeDiceUIIntegration(bus) {
    if (globalIntegration) {
        console.warn('DiceUI integration already initialized');
        return globalIntegration;
    }
    globalIntegration = new DiceUIIntegration(bus);
    return globalIntegration;
}
//# sourceMappingURL=integration.js.map