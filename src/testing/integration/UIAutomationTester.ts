import { EventBus } from '../utils/EventBus';
import type { DeckName } from '../data/decks';

/**
 * UI automation tester specifically designed for Gridiron football game
 * Tests user interface interactions, controls responsiveness, and visual elements
 */
export class UIAutomationTester {
  private bus: EventBus;
  private interactionLog: UIInteraction[] = [];
  private testingActive = false;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.setupEventListeners();
  }

  /**
   * Start UI automation testing
   */
  startTesting(): void {
    if (this.testingActive) return;

    console.log('🖱️ Starting UI automation testing...');
    this.testingActive = true;
    this.interactionLog = [];

    this.setupEventListeners();
  }

  /**
   * Stop UI automation testing
   */
  stopTesting(): void {
    this.testingActive = false;
    console.log('⏹️ Stopping UI automation testing...');
  }

  /**
   * Test new game flow automation
   */
  async testNewGameFlow(): Promise<UITestResult> {
    try {
      console.log('🆕 Testing new game flow...');

      // Wait for UI to be ready
      await this.waitForUIReady();

      // Test deck selection dropdown
      const deckSelection = await this.testDeckSelection();
      if (!deckSelection.success) {
        return { success: false, error: deckSelection.error };
      }

      // Test opponent selection dropdown
      const opponentSelection = await this.testOpponentSelection();
      if (!opponentSelection.success) {
        return { success: false, error: opponentSelection.error };
      }

      // Test new game button click
      const gameStart = await this.testNewGameButton();
      if (!gameStart.success) {
        return { success: false, error: gameStart.error };
      }

      // Wait for game to initialize
      await this.waitForGameInitialization();

      // Verify game state updates
      const gameStateValidation = await this.validateGameStateAfterStart();
      if (!gameStateValidation.success) {
        return { success: false, error: gameStateValidation.error };
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test deck selection functionality
   */
  async testDeckSelection(): Promise<UITestResult> {
    try {
      const deckSelect = document.getElementById('deck-select') as HTMLSelectElement;
      if (!deckSelect) {
        return { success: false, error: 'Deck selection dropdown not found' };
      }

      // Test deck options are available
      const options = Array.from(deckSelect.options);
      const expectedDecks = ['Pro Style', 'Ball Control', 'Aerial Style'];

      for (const expectedDeck of expectedDecks) {
        const found = options.some(option => option.value === expectedDeck);
        if (!found) {
          return { success: false, error: `Deck option '${expectedDeck}' not found` };
        }
      }

      // Test deck selection change event
      const originalValue = deckSelect.value;
      deckSelect.value = 'Ball Control';
      deckSelect.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify event was emitted
      const deckChanged = this.interactionLog.some(interaction =>
        interaction.type === 'deck_selection' && interaction.data?.deckName === 'Ball Control'
      );

      if (!deckChanged) {
        return { success: false, error: 'Deck selection event not emitted' };
      }

      // Restore original value
      deckSelect.value = originalValue;
      deckSelect.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test opponent selection functionality
   */
  async testOpponentSelection(): Promise<UITestResult> {
    try {
      const opponentSelect = document.getElementById('opponent-select') as HTMLSelectElement;
      if (!opponentSelect) {
        return { success: false, error: 'Opponent selection dropdown not found' };
      }

      // Test opponent options are available
      const options = Array.from(opponentSelect.options);
      const expectedOpponents = ['Andy Reid', 'Bill Belichick', 'John Madden'];

      for (const expectedOpponent of expectedOpponents) {
        const found = options.some(option => option.value === expectedOpponent);
        if (!found) {
          return { success: false, error: `Opponent option '${expectedOpponent}' not found` };
        }
      }

      // Test opponent selection change event
      const originalValue = opponentSelect.value;
      opponentSelect.value = 'Andy Reid';
      opponentSelect.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify event was emitted
      const opponentChanged = this.interactionLog.some(interaction =>
        interaction.type === 'opponent_selection' && interaction.data?.opponentName === 'Andy Reid'
      );

      if (!opponentChanged) {
        return { success: false, error: 'Opponent selection event not emitted' };
      }

      // Restore original value
      opponentSelect.value = originalValue;
      opponentSelect.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test new game button functionality
   */
  async testNewGameButton(): Promise<UITestResult> {
    try {
      const newGameBtn = document.getElementById('new-game') as HTMLButtonElement;
      if (!newGameBtn) {
        return { success: false, error: 'New game button not found' };
      }

      // Test button is enabled and clickable
      if (newGameBtn.disabled) {
        return { success: false, error: 'New game button is disabled' };
      }

      // Test button click event
      let clickHandled = false;
      const clickHandler = () => {
        clickHandled = true;
        document.removeEventListener('click', clickHandler);
      };

      document.addEventListener('click', clickHandler);
      newGameBtn.click();

      // Wait for click to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!clickHandled) {
        return { success: false, error: 'New game button click not handled' };
      }

      // Verify new game event was emitted
      const newGameEvent = this.interactionLog.some(interaction =>
        interaction.type === 'new_game' && interaction.data?.action === 'start'
      );

      if (!newGameEvent) {
        return { success: false, error: 'New game event not emitted' };
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test control responsiveness
   */
  async testControlResponsiveness(): Promise<UITestResult> {
    try {
      // Test that controls respond to state changes
      const controls = [
        { id: 'new-game', event: 'controls:update', property: 'enabled' },
        { id: 'pat-kick', event: 'controls:update', property: 'awaitingPAT' },
        { id: 'fg-kick', event: 'controls:update', property: 'showFG' }
      ];

      for (const control of controls) {
        const element = document.getElementById(control.id) as HTMLButtonElement;
        if (!element) {
          return { success: false, error: `Control element '${control.id}' not found` };
        }

        // Test initial state
        const initialDisabled = element.disabled;

        // Simulate state change event
        this.bus.emit(control.event, { [control.property]: true });

        // Wait for state to be applied
        await new Promise(resolve => setTimeout(resolve, 50));

        // Check if state was applied (element should be enabled for new game)
        if (control.id === 'new-game' && element.disabled) {
          return { success: false, error: 'Control state not applied correctly' };
        }
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Wait for UI to be ready
   */
  private async waitForUIReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkUIReady = () => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          setTimeout(checkUIReady, 100);
        }
      };

      if (document.readyState === 'complete') {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', () => resolve());
        setTimeout(checkUIReady, 100);
      }
    });
  }

  /**
   * Wait for game to initialize after start
   */
  private async waitForGameInitialization(): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 10000); // 10 second timeout

      const checkGameState = () => {
        // Check if game state has been updated (HUD shows non-zero values)
        const quarterElement = document.getElementById('quarter');
        const clockElement = document.getElementById('clock');

        if (quarterElement && clockElement) {
          const quarter = parseInt(quarterElement.textContent || '0');
          const clock = parseInt(clockElement.textContent || '0');

          if (quarter > 0 && clock > 0) {
            clearTimeout(timeout);
            resolve();
            return;
          }
        }

        setTimeout(checkGameState, 100);
      };

      checkGameState();
    });
  }

  /**
   * Validate game state after starting new game
   */
  private async validateGameStateAfterStart(): Promise<UITestResult> {
    try {
      // Check HUD elements are populated
      const hudElements = ['quarter', 'clock', 'down', 'to-go', 'ball-on'];
      const missingElements = hudElements.filter(id => {
        const element = document.getElementById(id);
        return !element || !element.textContent || element.textContent.trim() === '';
      });

      if (missingElements.length > 0) {
        return {
          success: false,
          error: `HUD elements not populated: ${missingElements.join(', ')}`
        };
      }

      // Check field display exists and has content
      const fieldElement = document.getElementById('field-display');
      if (!fieldElement) {
        return { success: false, error: 'Field display element missing' };
      }

      // Check hand display exists
      const handElement = document.getElementById('hand');
      if (!handElement) {
        return { success: false, error: 'Hand display element missing' };
      }

      // Check log has initial content
      const logElement = document.getElementById('log');
      if (!logElement || logElement.children.length === 0) {
        return { success: false, error: 'Log has no initial content' };
      }

      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Set up event listeners for UI interaction monitoring
   */
  private setupEventListeners(): void {
    // Monitor UI events
    this.bus.on('ui:newGame', (data) => {
      if (this.testingActive) {
        this.interactionLog.push({
          type: 'new_game',
          timestamp: Date.now(),
          data
        });
      }
    });

    this.bus.on('ui:themeChanged', (data) => {
      if (this.testingActive) {
        this.interactionLog.push({
          type: 'theme_change',
          timestamp: Date.now(),
          data
        });
      }
    });

    this.bus.on('ui:devModeChanged', (data) => {
      if (this.testingActive) {
        this.interactionLog.push({
          type: 'dev_mode_change',
          timestamp: Date.now(),
          data
        });
      }
    });

    // Monitor control state changes
    this.bus.on('controls:update', (data) => {
      if (this.testingActive) {
        this.interactionLog.push({
          type: 'controls_update',
          timestamp: Date.now(),
          data
        });
      }
    });

    // Monitor hand updates
    this.bus.on('handUpdate', (data) => {
      if (this.testingActive) {
        this.interactionLog.push({
          type: 'hand_update',
          timestamp: Date.now(),
          data
        });
      }
    });

    // Monitor HUD updates
    this.bus.on('hudUpdate', (data) => {
      if (this.testingActive) {
        this.interactionLog.push({
          type: 'hud_update',
          timestamp: Date.now(),
          data
        });
      }
    });

    // Monitor log updates
    this.bus.on('log', (data) => {
      if (this.testingActive && data.message) {
        this.interactionLog.push({
          type: 'log_message',
          timestamp: Date.now(),
          data: { message: data.message }
        });
      }
    });
  }

  /**
   * Get interaction log for analysis
   */
  getInteractionLog(): UIInteraction[] {
    return [...this.interactionLog];
  }

  /**
   * Clear interaction log
   */
  clearInteractionLog(): void {
    this.interactionLog = [];
  }

  /**
   * Check if testing is active
   */
  isTestingActive(): boolean {
    return this.testingActive;
  }
}

// Types for UI automation testing
export interface UITestResult {
  success: boolean;
  error?: string;
}

export interface UIInteraction {
  type: string;
  timestamp: number;
  data?: any;
}
