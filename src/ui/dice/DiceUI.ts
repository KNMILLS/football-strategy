import type { EventBus } from '../../utils/EventBus';
import { getCurrentEngine } from '../../config/FeatureFlags';
import { initializeDiceUIIntegration } from './integration';
import type { DiceUIState, DiceUIConfig, DiceUIEvent } from './types';
import { CardSelector } from './CardSelector';
import { PenaltyModal } from './PenaltyModal';
import { ResultDisplay } from './ResultDisplay';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

export class DiceUI {
  private bus: EventBus;
  private config: DiceUIConfig;
  private state: DiceUIState;
  private cardSelector: CardSelector;
  private penaltyModal: PenaltyModal;
  private resultDisplay: ResultDisplay;
  private isRegistered = false;

  constructor(bus: EventBus, config?: Partial<DiceUIConfig>) {
    this.bus = bus;
    this.config = {
      accessibility: {
        enableScreenReader: true,
        enableKeyboardNavigation: true,
        enableFocusManagement: true,
        announceResults: true,
        announceCardSelections: true,
        ...config?.accessibility
      },
      performance: {
        animationDuration: 300,
        debounceMs: 100,
        maxConcurrentAnimations: 5,
        enableHardwareAcceleration: true,
        ...config?.performance
      },
      theme: config?.theme || 'auto',
      animations: config?.animations !== false,
      soundEffects: config?.soundEffects || false
    };

    this.state = {
      playbook: {
        availablePlaybooks: ['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'],
        cards: []
      },
      defensive: {
        selectedCards: [],
        availableCards: [],
        maxSelections: 10
      },
      penalty: {
        isVisible: false,
        isAccepting: false,
        isDeclining: false
      },
      result: {
        isVisible: false,
        showAnimation: false
      },
      isPlayerOffense: true
    };

    // Initialize sub-components
    this.cardSelector = new CardSelector(bus, this.config);
    this.penaltyModal = new PenaltyModal(bus, this.config);
    this.resultDisplay = new ResultDisplay(bus, this.config);
  }

  register(): void {
    if (this.isRegistered) {
      console.warn('DiceUI already registered');
      return;
    }

    console.log('DiceUI main coordinator registering...');

    // Wait for DOM to be ready if elements aren't found yet
    const waitForElements = () => {
      const diceContainer = $('dice-ui-container');
      if (!diceContainer) {
        console.log('DiceUI container not found, waiting...');
        setTimeout(waitForElements, 100);
        return;
      }

      console.log('DiceUI container found, setting up...');
      this.setupDiceUIContainer(diceContainer);

      // Register sub-components
      this.cardSelector.register();
      this.penaltyModal.register();
      this.resultDisplay.register();

      // Set up event listeners
      this.setupEventListeners();

      // Set up theme
      this.applyTheme();

      this.isRegistered = true;
      console.log('DiceUI registered successfully');

      // Emit ready event
      this.bus.emit('ui:diceUIReady', { config: this.config });
    };

    waitForElements();
  }

  private setupDiceUIContainer(container: HTMLElement): void {
    // Clear existing content
    container.innerHTML = '';

    // Create main structure
    container.innerHTML = `
      <div class="dice-ui-main">
        <div class="dice-ui-header">
          <h1 class="dice-ui-title">Dice Football Strategy</h1>
          <div class="dice-ui-subtitle">2d20 Resolution System</div>
        </div>

        <div class="dice-ui-content">
          <div class="dice-ui-section dice-playbook-section">
            <h2 class="dice-section-title">Offensive Playbook</h2>
            <div class="dice-playbook-container" id="dice-playbook-container">
              <!-- Playbook selector and cards will be inserted here -->
            </div>
          </div>

          <div class="dice-ui-section dice-defensive-section">
            <h2 class="dice-section-title">Defensive Selection</h2>
            <div class="dice-defensive-container" id="dice-defensive-container">
              <!-- Defensive cards will be inserted here -->
            </div>
          </div>

          <div class="dice-ui-section dice-modal-section">
            <div class="dice-modal-container" id="dice-modal-container">
              <!-- Penalty modal will be inserted here -->
            </div>
          </div>

          <div class="dice-ui-section dice-result-section">
            <div class="dice-result-container" id="dice-result-container">
              <!-- Result display will be inserted here -->
            </div>
          </div>
        </div>

        <div class="dice-ui-footer">
          <div class="dice-ui-status" id="dice-ui-status">
            Ready for play selection
          </div>
        </div>
      </div>
    `;

    // Apply configuration-based styling
    this.applyConfigurationStyles(container);
  }

  private applyConfigurationStyles(container: HTMLElement): void {
    // Apply theme
    if (this.config.theme !== 'auto') {
      container.setAttribute('data-theme', this.config.theme);
    }

    // Apply accessibility preferences (no enableAnimations in accessibility config)
    // This could be added to accessibility config if needed
    container.classList.add('dice-ui-accessible');

    // Apply performance optimizations
    if (this.config.performance.enableHardwareAcceleration) {
      container.classList.add('hardware-accelerated');
    }
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const theme = this.config.theme;
    if (theme === 'auto') {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  private setupEventListeners(): void {
    // Listen for state changes from sub-components
    this.bus.on('ui:playbookStateChanged', (payload: any) => {
      this.state.playbook = { ...payload.state };
      this.updateStatus();
    });

    this.bus.on('ui:defensiveStateChanged', (payload: any) => {
      this.state.defensive = { ...payload.state };
      this.updateStatus();
    });

    this.bus.on('ui:penaltyStateChanged', (payload: any) => {
      this.state.penalty = { ...payload.state };
      this.updateStatus();
    });

    this.bus.on('ui:resultStateChanged', (payload: any) => {
      this.state.result = { ...payload.state };
      this.updateStatus();
    });

    // Listen for game flow events that affect UI state
    this.bus.on('ui:possessionChanged', (payload: { isPlayerOffense: boolean }) => {
      this.state.isPlayerOffense = payload.isPlayerOffense;
      this.updateForPossessionChange();
    });

    // Listen for game reset events
    this.bus.on('ui:gameReset', () => {
      this.resetUI();
    });

    // Listen for dice UI specific events
    this.bus.on('ui:diceUIEvent', (payload: { event: DiceUIEvent }) => {
      this.handleDiceUIEvent(payload.event);
    });
  }

  private updateForPossessionChange(): void {
    // Update UI based on possession change
    const statusElement = $('dice-ui-status');
    if (statusElement) {
      if (this.state.isPlayerOffense) {
        statusElement.textContent = 'Your offense - select a play';
        statusElement.className = 'dice-ui-status dice-status-offense';
      } else {
        statusElement.textContent = 'Your defense - select defensive plays';
        statusElement.className = 'dice-ui-status dice-status-defense';
      }
    }

    // Update card selector state
    this.cardSelector.updatePlaybookState(this.state.playbook);
    this.cardSelector.updateDefensiveState(this.state.defensive);
  }

  private updateStatus(): void {
    const statusElement = $('dice-ui-status');
    if (!statusElement) return;

    let status = 'Ready';

    if (this.state.penalty.isVisible) {
      status = 'Penalty decision required';
    } else if (this.state.result.isVisible) {
      status = 'Viewing result';
    } else if (this.state.isPlayerOffense) {
      const selectedCards = this.state.playbook.cards.filter(c => c.isSelected).length;
      status = selectedCards > 0 ? `Play selected: ${this.state.playbook.cards.find(c => c.isSelected)?.label}` : 'Select offensive play';
    } else {
      status = `Defensive plays selected: ${this.state.defensive.selectedCards.length}/${this.state.defensive.maxSelections}`;
    }

    statusElement.textContent = status;
  }

  private handleDiceUIEvent(event: DiceUIEvent): void {
    switch (event.type) {
      case 'PLAYBOOK_SELECTED':
        this.state.playbook.selectedPlaybook = event.playbook;
        this.cardSelector.updatePlaybookState(this.state.playbook);
        break;

      case 'CARD_SELECTED':
        // Update selected card state
        this.state.playbook.cards.forEach(card => {
          card.isSelected = card.id === event.cardId;
        });
        this.cardSelector.updatePlaybookState(this.state.playbook);
        break;

      case 'DEFENSIVE_CARD_TOGGLED':
        // Update defensive card selection
        const cardIndex = this.state.defensive.availableCards.findIndex(c => c.id === event.cardId);
        if (cardIndex >= 0) {
          const card = this.state.defensive.availableCards[cardIndex];
          if (card && card.isSelected) {
            card.isSelected = false;
            card.variant = 'secondary';
            const selectedIndex = this.state.defensive.selectedCards.indexOf(event.cardId);
            if (selectedIndex > -1) {
              this.state.defensive.selectedCards.splice(selectedIndex, 1);
            }
          } else if (card && this.state.defensive.selectedCards.length < this.state.defensive.maxSelections) {
            card.isSelected = true;
            card.variant = 'success';
            this.state.defensive.selectedCards.push(event.cardId);
          }
          this.cardSelector.updateDefensiveState(this.state.defensive);
        }
        break;

      case 'PENALTY_DECISION':
        this.state.penalty.isAccepting = event.decision === 'accept';
        this.state.penalty.isDeclining = event.decision === 'decline';
        this.penaltyModal.updateState(this.state.penalty);
        break;

      case 'RESULT_DISPLAY_SHOWN':
        this.state.result.isVisible = true;
        this.state.result.outcome = event.result;
        this.resultDisplay.updateState(this.state.result);
        break;

      case 'RESULT_DISPLAY_HIDDEN':
        this.state.result.isVisible = false;
        this.state.result.outcome = undefined as any;
        this.resultDisplay.updateState(this.state.result);
        break;

      case 'UI_RESET':
        this.resetUI();
        break;
    }

    this.updateStatus();
  }

  private resetUI(): void {
    // Reset all component states
    this.state = {
      playbook: {
        availablePlaybooks: ['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'],
        cards: []
      },
      defensive: {
        selectedCards: [],
        availableCards: [],
        maxSelections: 10
      },
      penalty: {
        isVisible: false,
        isAccepting: false,
        isDeclining: false
      },
      result: {
        isVisible: false,
        showAnimation: false
      },
      isPlayerOffense: true
    };

    // Update all sub-components
    this.cardSelector.updatePlaybookState(this.state.playbook);
    this.cardSelector.updateDefensiveState(this.state.defensive);
    this.penaltyModal.updateState(this.state.penalty);
    this.resultDisplay.updateState(this.state.result);

    this.updateStatus();
  }

  // Public API methods
  getState(): DiceUIState {
    return { ...this.state };
  }

  updateConfig(newConfig: Partial<DiceUIConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Apply theme changes
    this.applyTheme();

    // Update sub-components if needed
    this.cardSelector = new CardSelector(this.bus, this.config);
    this.penaltyModal = new PenaltyModal(this.bus, this.config);
    this.resultDisplay = new ResultDisplay(this.bus, this.config);

    if (this.isRegistered) {
      this.cardSelector.register();
      this.penaltyModal.register();
      this.resultDisplay.register();
    }
  }

  // Force show components for testing
  showTestPenaltyModal(): void {
    this.penaltyModal.showOverrideModal('Test penalty override for doubles 4-4');
  }

  showTestResult(): void {
    this.resultDisplay.showTestResult();
  }

  // Get component instances for testing
  getCardSelector(): CardSelector {
    return this.cardSelector;
  }

  getPenaltyModal(): PenaltyModal {
    return this.penaltyModal;
  }

  getResultDisplay(): ResultDisplay {
    return this.resultDisplay;
  }

  // Check if UI is ready
  isReady(): boolean {
    return this.isRegistered;
  }
}

// Register function for optionalComponents loader in src/index.ts
export function registerDiceUI(bus: EventBus): void {
  if (typeof document === 'undefined') return;

  // Ensure a container exists in the DOM
  let container = document.getElementById('dice-ui-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dice-ui-container';
    // Basic layout; can be refined by CSS if desired
    (container as any).style && ((container as any).style.cssText = 'position:relative;padding:8px;');
    // Prefer placing within the main area if present
    const main = document.getElementById('main');
    if (main && main.appendChild) main.appendChild(container);
    else document.body.appendChild(container);
  }

  const diceUI = new DiceUI(bus);
  diceUI.register();

  const integration = initializeDiceUIIntegration(bus);

  const applyEngineMode = (engine: string) => {
    const handEl = document.getElementById('hand') as HTMLElement | null;
    const diceEl = document.getElementById('dice-ui-container') as HTMLElement | null;
    const isDice = engine === 'dice';
    if (handEl) handEl.style.display = isDice ? 'none' : '';
    if (diceEl) diceEl.style.display = isDice ? 'block' : 'none';
    try {
      if (isDice) (integration as any)?.enable?.(diceUI);
      else (integration as any)?.disable?.();
    } catch { /* non-fatal */ }
  };

  // Set initial visibility based on current engine
  try { applyEngineMode(getCurrentEngine()); } catch { /* ignore */ }

  // React to engine changes from DevMode dropdown
  (bus as any).on && (bus as any).on('ui:engineChanged', ({ engine }: { engine: string }) => {
    applyEngineMode(engine);
  });
}
