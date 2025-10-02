import type { EventBus } from '../../utils/EventBus';
import type { ButtonCard, ButtonDefensiveCard, PlaybookSelectionState, DefensiveSelectionState, DiceUIConfig } from './types';
import { CardCatalogAccessor } from '../../data/cards/CardCatalog';

// Tier-1 play mappings (only show these in the UI for MVP)
const TIER_1_PLAYS: Record<string, string[]> = {
  'WEST_COAST': [
    'wc-quick-slant', 'wc-screen-pass', 'wc-stick-route', 'wc-slants', 'wc-rb-screen', 'wc-flood-concept'
  ],
  'SPREAD': [
    'spread-mesh-concept', 'spread-smash-route', 'spread-air-raid', 'spread-rpo-bubble', 'spread-zone-read', 'spread-rpo-bubble'
  ],
  'AIR_RAID': [
    'AIR_RAID_FOUR_VERTS', 'AIR_RAID_MILLS', 'ar-spot', 'AIR_RAID_PA_DEEP_SHOT', 'ar-y-stick', 'ar-spot'
  ],
  'SMASHMOUTH': [
    'sm-power-o', 'sm-counter', 'sm-iso', 'sm-toss', 'sm-bootleg', 'sm-te-seam'
  ],
  'WIDE_ZONE': [
    'wz-wide-zone', 'wz-inside-zone', 'wz-counter', 'wz-bootleg', 'wz-play-action', 'wz-toss-sweep'
  ]
};

// Defensive cards for universal deck
const DEFENSIVE_CARDS: Omit<ButtonDefensiveCard, 'id'>[] = [
  { label: 'Goal Line' },
  { label: 'All-Out Blitz' },
  { label: 'Inside Blitz' },
  { label: 'Outside Blitz' },
  { label: 'Cover 1' },
  { label: 'Cover 2' },
  { label: 'Cover 3' },
  { label: 'Cover 4' },
  { label: 'Cover 6' },
  { label: 'Prevent' }
];

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

export class CardSelector {
  private bus: EventBus;
  private config: DiceUIConfig;
  private playbookState: PlaybookSelectionState;
  private defensiveState: DefensiveSelectionState;
  private eventsWired: boolean = false;
  private isBroadcasting: boolean = false;

  constructor(bus: EventBus, config: DiceUIConfig) {
    this.bus = bus;
    this.config = config;
    this.playbookState = {
      availablePlaybooks: ['West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'],
      cards: []
    };
    this.defensiveState = {
      selectedCards: [],
      availableCards: DEFENSIVE_CARDS.map((card, index) => ({
        ...card,
        id: `def-${index}`,
        isSelected: false,
        isDisabled: false,
        isHovered: false,
        ariaLabel: `Select defensive play: ${card.label}`,
        variant: 'secondary' as const
      })),
      maxSelections: 10
    };

    // Wire core bus listeners so tests can use the component without DOM registration
    this.wireBusListeners();
  }

  private wireBusListeners(): void {
    if (this.eventsWired) return;
    this.eventsWired = true;
    this.bus.on('ui:playbookSelected', (payload: { playbook: string }) => {
      if (this.isBroadcasting) return;
      this.applyPlaybookSelection(payload.playbook);
    });
    this.bus.on('ui:defensiveCardToggled', (payload: { cardId: string }) => {
      if (this.isBroadcasting) return;
      this.applyDefensiveToggle(payload.cardId);
    });
    this.bus.on('ui:cardSelected', (payload: { cardId: string }) => {
      if (this.isBroadcasting) return;
      this.applyCardSelection(payload.cardId);
    });
  }

  register(): void {
    console.log('CardSelector component registering...');

    // Wait for DOM to be ready if elements aren't found yet
    const waitForElements = () => {
      const playbookContainer = $('dice-playbook-container');
      const defensiveContainer = $('dice-defensive-container');

      if (!playbookContainer || !defensiveContainer) {
        console.log('CardSelector elements not found, waiting...');
        setTimeout(waitForElements, 100);
        return;
      }

      console.log('CardSelector elements found, setting up...');
      this.setupPlaybookSelector(playbookContainer);
      this.setupDefensiveSelector(defensiveContainer);

      // Bus listeners are wired in constructor to avoid duplicate handlers

      console.log('CardSelector registered successfully');
    };

    waitForElements();
  }

  private setupPlaybookSelector(container: HTMLElement): void {
    // Create playbook dropdown
    const playbookSelect = document.createElement('select');
    playbookSelect.id = 'dice-playbook-select';
    playbookSelect.className = 'dice-playbook-select';
    playbookSelect.setAttribute('aria-label', 'Select offensive playbook');

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Choose Playbook';
    playbookSelect.appendChild(defaultOption);

    // Add playbook options
    this.playbookState.availablePlaybooks.forEach(playbook => {
      const option = document.createElement('option');
      option.value = playbook;
      option.textContent = playbook;
      playbookSelect.appendChild(option);
    });

    playbookSelect.addEventListener('change', () => {
      const selectedPlaybook = playbookSelect.value;
      if (selectedPlaybook) {
        this.bus.emit('ui:playbookSelected', { playbook: selectedPlaybook });
      }
    });

    container.appendChild(playbookSelect);

    // Create card grid container
    const cardGrid = document.createElement('div');
    cardGrid.id = 'dice-playbook-cards';
    cardGrid.className = 'dice-card-grid';
    cardGrid.setAttribute('role', 'grid');
    cardGrid.setAttribute('aria-label', 'Available playbook cards');

    container.appendChild(cardGrid);
  }

  private setupDefensiveSelector(container: HTMLElement): void {
    // Create defensive card grid
    const cardGrid = document.createElement('div');
    cardGrid.id = 'dice-defensive-cards';
    cardGrid.className = 'dice-card-grid dice-defensive-grid';
    cardGrid.setAttribute('role', 'grid');
    cardGrid.setAttribute('aria-label', 'Defensive play selection');

    // Create instruction text
    const instruction = document.createElement('div');
    instruction.className = 'dice-defensive-instruction';
    instruction.textContent = `Select up to ${this.defensiveState.maxSelections} defensive plays`;
    cardGrid.appendChild(instruction);

    // Create defensive cards
    this.defensiveState.availableCards.forEach(card => {
      const cardButton = this.createDefensiveCardButton(card);
      cardGrid.appendChild(cardButton);
    });

    container.appendChild(cardGrid);
  }

  private createDefensiveCardButton(card: ButtonDefensiveCard): HTMLElement {
    const button = document.createElement('button');
    button.className = `dice-defensive-card ${card.variant || 'secondary'}`;
    button.id = `dice-def-card-${card.id}`;
    button.textContent = card.label;
    button.setAttribute('aria-label', card.ariaLabel || `Select defensive play: ${card.label}`);
    button.setAttribute('role', 'gridcell');
    button.setAttribute('tabindex', card.isDisabled ? '-1' : '0');

    if (card.isSelected) {
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.setAttribute('aria-pressed', 'false');
    }

    if (card.isDisabled) {
      button.disabled = true;
      button.classList.add('disabled');
    }

    button.addEventListener('click', () => {
      if (!card.isDisabled) {
        this.bus.emit('ui:defensiveCardToggled', { cardId: card.id });
      }
    });

    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!card.isDisabled) {
          this.bus.emit('ui:defensiveCardToggled', { cardId: card.id });
        }
      }
    });

    // Hover effects
    button.addEventListener('mouseenter', () => {
      if (!card.isDisabled) {
        button.classList.add('hovered');
      }
    });

    button.addEventListener('mouseleave', () => {
      button.classList.remove('hovered');
    });

    return button;
  }

  private selectPlaybook(playbook: string): void {
    this.applyPlaybookSelection(playbook);
    // Emit selection event for observers
    this.isBroadcasting = true;
    try { this.bus.emit('ui:playbookSelected', { playbook }); }
    finally { this.isBroadcasting = false; }
  }

  private mapRiskLevel(riskLevel: string): 1 | 2 | 3 | 4 | 5 {
    switch (riskLevel) {
      case 'low': return 2;
      case 'medium': return 3;
      case 'high': return 4;
      case 'very-high': return 5;
      default: return 3;
    }
  }

  private getRiskText(riskLevel: 1 | 2 | 3 | 4 | 5): string {
    if (riskLevel <= 2) return 'Low risk';
    if (riskLevel <= 3) return 'Medium risk';
    if (riskLevel <= 4) return 'High risk';
    return 'Very high risk';
  }

  private async applyPlaybookSelection(playbook: string): Promise<void> {
    if (!this.playbookState.availablePlaybooks.includes(playbook)) {
      console.warn(`Invalid playbook selected: ${playbook}`);
      return;
    }

    this.playbookState.selectedPlaybook = playbook;

    try {
      // Get all cards for this playbook from the catalog
      const allCards = await CardCatalogAccessor.getPlaybookCards(playbook as any);

      // Filter to only Tier-1 plays
      const tier1PlayIds = TIER_1_PLAYS[playbook] || [];
      const tier1Cards = allCards.filter(card => tier1PlayIds.includes(card.id));

      // Map to button cards with risk information
      this.playbookState.cards = tier1Cards.map((card, index) => {
        const riskLevel = this.mapRiskLevel(card.riskLevel);
        const riskText = this.getRiskText(riskLevel);

        return {
          label: card.label,
          type: card.type,
          description: card.description,
          riskLevel,
          id: `${playbook.toLowerCase().replace(' ', '-')}-card-${index}`,
          playbook: playbook as any,
          isSelected: false,
          isDisabled: false,
          isHovered: false,
          ariaLabel: `${card.label}: ${card.description}. Risk level: ${riskText}`,
          variant: 'primary' as const
        };
      });

      this.renderPlaybookCards();

      // Announce selection for screen readers
      if (this.config.accessibility.announceCardSelections) {
        this.announceToScreenReader(`Playbook changed to ${playbook}. ${tier1Cards.length} plays available`);
      }
    } catch (error) {
      console.error('Failed to load playbook cards:', error);
      // Fallback to empty cards
      this.playbookState.cards = [];
      this.renderPlaybookCards();
    }
  }

  private renderPlaybookCards(): void {
    const cardGrid = $('dice-playbook-cards');
    if (!cardGrid) return;

    cardGrid.innerHTML = '';

    if (!this.playbookState.selectedPlaybook) {
      const placeholder = document.createElement('div');
      placeholder.className = 'dice-no-playbook';
      placeholder.textContent = 'Select a playbook to view available cards';
      cardGrid.appendChild(placeholder);
      return;
    }

    this.playbookState.cards.forEach(card => {
      const cardButton = this.createPlaybookCardButton(card);
      cardGrid.appendChild(cardButton);
    });
  }

  private createPlaybookCardButton(card: ButtonCard): HTMLElement {
    const button = document.createElement('button');
    button.className = `dice-playbook-card ${card.variant || 'primary'}`;
    button.id = `dice-card-${card.id}`;

    const title = document.createElement('div');
    title.className = 'dice-card-title';
    title.textContent = card.label;

    const description = document.createElement('div');
    description.className = 'dice-card-description';
    description.textContent = card.description || '';

    const type = document.createElement('div');
    type.className = `dice-card-type dice-card-type-${card.type}`;
    type.textContent = card.type.toUpperCase();

    // Add risk indicator if available
    if (card.riskLevel) {
      const riskIndicator = document.createElement('div');
      riskIndicator.className = 'dice-card-risk';
      riskIndicator.setAttribute('aria-label', `Risk level: ${this.getRiskText(card.riskLevel)}`);

      // Create visual risk bar
      const riskBar = document.createElement('div');
      riskBar.className = 'dice-card-risk-bar';

      for (let i = 1; i <= 5; i++) {
        const riskDot = document.createElement('span');
        riskDot.className = `dice-card-risk-dot ${i <= card.riskLevel ? 'filled' : 'empty'}`;
        riskBar.appendChild(riskDot);
      }

      riskIndicator.appendChild(riskBar);
      button.appendChild(riskIndicator);
    }

    button.appendChild(title);
    button.appendChild(description);
    button.appendChild(type);

    button.setAttribute('aria-label', card.ariaLabel || `${card.label} - ${card.description}`);
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', card.isDisabled ? '-1' : '0');

    if (card.isSelected) {
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.setAttribute('aria-pressed', 'false');
    }

    if (card.isDisabled) {
      button.disabled = true;
      button.classList.add('disabled');
    }

    button.addEventListener('click', () => {
      if (!card.isDisabled) {
        this.bus.emit('ui:cardSelected', { cardId: card.id });
      }
    });

    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!card.isDisabled) {
          this.bus.emit('ui:cardSelected', { cardId: card.id });
        }
      }
    });

    // Hover effects
    button.addEventListener('mouseenter', () => {
      if (!card.isDisabled) {
        button.classList.add('hovered');
      }
    });

    button.addEventListener('mouseleave', () => {
      button.classList.remove('hovered');
    });

    return button;
  }

  private toggleDefensiveCard(cardId: string): void {
    this.applyDefensiveToggle(cardId);
    // Emit toggle event for observers (echo for consumers)
    this.isBroadcasting = true;
    try { this.bus.emit('ui:defensiveCardToggled', { cardId }); }
    finally { this.isBroadcasting = false; }
  }

  private applyDefensiveToggle(cardId: string): void {
    const cardIndex = this.defensiveState.availableCards.findIndex(card => card.id === cardId);
    if (cardIndex === -1) return;

    const card = this.defensiveState.availableCards[cardIndex];

    if (card && card.isSelected) {
      // Deselect card
      card.isSelected = false;
      card.variant = 'secondary';
      const selectedIndex = this.defensiveState.selectedCards.indexOf(cardId);
      if (selectedIndex > -1) {
        this.defensiveState.selectedCards.splice(selectedIndex, 1);
      }
    } else if (card && this.defensiveState.selectedCards.length < this.defensiveState.maxSelections) {
      // Select card
      card.isSelected = true;
      card.variant = 'success';
      this.defensiveState.selectedCards.push(cardId);
    }

    this.renderDefensiveCards();

    // Announce selection for screen readers
    if (this.config.accessibility.announceCardSelections && card) {
      const action = card.isSelected ? 'selected' : 'deselected';
      this.announceToScreenReader(`Defensive play ${card.label} ${action}`);
    }
  }

  private renderDefensiveCards(): void {
    const cardGrid = $('dice-defensive-cards');
    if (!cardGrid) return;

    // Update instruction text
    const instruction = cardGrid.querySelector('.dice-defensive-instruction');
    if (instruction) {
      instruction.textContent = `Selected ${this.defensiveState.selectedCards.length} of ${this.defensiveState.maxSelections} defensive plays`;
    }

    // Update card states
    this.defensiveState.availableCards.forEach(card => {
      const button = document.getElementById(`dice-def-card-${card.id}`);
      if (button) {
        button.className = `dice-defensive-card ${card.variant || 'secondary'}`;
        button.setAttribute('aria-pressed', card.isSelected ? 'true' : 'false');

        if (card.isSelected) {
          button.classList.add('selected');
        } else {
          button.classList.remove('selected');
        }
      }
    });
  }

  private selectCard(cardId: string): void {
    this.applyCardSelection(cardId);
    // Emit the card selection event
    this.isBroadcasting = true;
    try { this.bus.emit('ui:cardSelected', { cardId }); }
    finally { this.isBroadcasting = false; }
  }

  private applyCardSelection(cardId: string): void {
    // Find the card in the current playbook
    const card = this.playbookState.cards.find(c => c.id === cardId);
    if (!card) {
      console.warn(`Card not found: ${cardId}`);
      return;
    }

    if (card.isDisabled) {
      console.warn(`Card is disabled: ${cardId}`);
      return;
    }

    // Mark card as selected
    this.playbookState.cards.forEach(c => {
      c.isSelected = c.id === cardId;
    });

    this.renderPlaybookCards();

    // Announce selection for screen readers
    if (this.config.accessibility.announceCardSelections) {
      this.announceToScreenReader(`Selected play: ${card.label}`);
    }

    // No emit in internal apply; public selectCard emits
  }

  private announceToScreenReader(message: string): void {
    if (!this.config.accessibility.enableScreenReader) return;
    if (typeof document === 'undefined') return;

    // Create or find live region for announcements
    let liveRegion = $('dice-screen-reader-announcements');
    if (!liveRegion) {
      const newRegion = document.createElement('div');
      newRegion.id = 'dice-screen-reader-announcements';
      newRegion.setAttribute('aria-live', 'polite');
      newRegion.setAttribute('aria-atomic', 'true');
      (newRegion as any).style && ((newRegion as any).style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;');
      if ((document as any).body && (document as any).body.appendChild) {
        (document as any).body.appendChild(newRegion);
      }
      liveRegion = newRegion as any;
    }

    if (liveRegion) {
      (liveRegion as any).textContent = message;
    }

    // Clear after announcement
    setTimeout(() => {
      if (liveRegion) (liveRegion as any).textContent = '';
    }, 1000);
  }

  updatePlaybookState(state: PlaybookSelectionState): void {
    this.playbookState = { ...state };
    this.renderPlaybookCards();
  }

  updateDefensiveState(state: DefensiveSelectionState): void {
    this.defensiveState = { ...state };
    this.renderDefensiveCards();
  }

  getPlaybookState(): PlaybookSelectionState {
    return { ...this.playbookState };
  }

  getDefensiveState(): DefensiveSelectionState {
    return { ...this.defensiveState };
  }
}
