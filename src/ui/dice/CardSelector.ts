import type { EventBus } from '../../utils/EventBus';
import type { ButtonCard, ButtonDefensiveCard, PlaybookSelectionState, DefensiveSelectionState, DiceUIConfig } from './types';

// Playbook card data (this would come from the game data in a real implementation)
const PLAYBOOK_CARDS: Record<string, Omit<ButtonCard, 'id' | 'playbook'>[]> = {
  'West Coast': [
    { label: 'Quick Slant', type: 'pass', description: 'Short, quick pass over the middle' },
    { label: 'Screen Pass', type: 'pass', description: 'Lateral pass behind the line of scrimmage' },
    { label: 'Draw Play', type: 'run', description: 'Fake pass, run up the middle' },
    { label: 'RB Screen', type: 'pass', description: 'Screen pass to the running back' },
    { label: 'TE Seam', type: 'pass', description: 'Tight end down the seam' },
    { label: 'HB Slip Screen', type: 'pass', description: 'Halfback screen after initial move' },
    { label: 'WR Out', type: 'pass', description: 'Wide receiver out route' },
    { label: 'Zone Read', type: 'run', description: 'QB reads defense, keeps or hands off' },
    { label: 'PA Bootleg', type: 'pass', description: 'Play action, QB rolls out' },
    { label: 'Dig Route', type: 'pass', description: 'Cross field pass route' },
    { label: 'Inside Zone', type: 'run', description: 'Offensive line zones block' },
    { label: 'Slants', type: 'pass', description: 'Multiple receivers run slant routes' },
    { label: 'Counter Trey', type: 'run', description: 'Misdirection run play' },
    { label: 'TE Corner', type: 'pass', description: 'Tight end corner route' },
    { label: 'Power O', type: 'run', description: 'Power running scheme' },
    { label: 'WR Screen', type: 'pass', description: 'Wide receiver screen pass' },
    { label: 'Outside Zone', type: 'run', description: 'Stretch zone run to the edge' },
    { label: 'Stick Route', type: 'pass', description: 'Short stick route combination' },
    { label: 'Trap Play', type: 'run', description: 'Trap blocking scheme' },
    { label: 'Flood Concept', type: 'pass', description: 'Three level flood routes' }
  ],
  'Spread': [
    { label: 'Air Raid', type: 'pass', description: 'Four verticals concept' },
    { label: 'Mesh Concept', type: 'pass', description: 'Crossing routes underneath' },
    { label: 'RPO Bubble', type: 'pass', description: 'Run-pass option with bubble' },
    { label: 'Smash Route', type: 'pass', description: 'Corner and hitch combination' },
    { label: 'Zone Read', type: 'run', description: 'QB reads edge defender' },
    { label: 'Levels Concept', type: 'pass', description: 'Multiple levels of routes' },
    { label: 'Y-Stick', type: 'pass', description: 'Y receiver stick route' },
    { label: 'Power Read', type: 'run', description: 'Power scheme with read option' },
    { label: 'Drive Concept', type: 'pass', description: 'Drive routes to intermediate zone' },
    { label: 'Counter', type: 'run', description: 'Counter run against spread defense' },
    { label: 'Spot Concept', type: 'pass', description: 'Spot routes underneath' },
    { label: 'Arrow Route', type: 'pass', description: 'Quick arrow route' },
    { label: 'Outside Zone', type: 'run', description: 'Stretch zone to the perimeter' },
    { label: 'Bender', type: 'pass', description: 'Bender route combination' },
    { label: 'Inside Zone', type: 'run', description: 'Inside zone running scheme' },
    { label: 'Curl-Flat', type: 'pass', description: 'Curl and flat route combo' },
    { label: 'Trap', type: 'run', description: 'Trap block run play' },
    { label: 'Post-Wheel', type: 'pass', description: 'Post and wheel combination' },
    { label: 'Power', type: 'run', description: 'Power gap scheme' },
    { label: 'Slants', type: 'pass', description: 'Multiple slant routes' }
  ],
  'Air Raid': [
    { label: 'Four Verticals', type: 'pass', description: 'Four receivers run vertical routes' },
    { label: 'Mesh', type: 'pass', description: 'Crossing mesh routes' },
    { label: 'Y-Stick', type: 'pass', description: 'Y-stick route concept' },
    { label: 'Spot', type: 'pass', description: 'Spot routes underneath' },
    { label: 'Drive', type: 'pass', description: 'Drive routes to intermediate' },
    { label: 'Smash', type: 'pass', description: 'Smash route combination' },
    { label: 'Curl-Flat', type: 'pass', description: 'Curl and flat routes' },
    { label: 'Post-Corner', type: 'pass', description: 'Post and corner routes' },
    { label: 'Levels', type: 'pass', description: 'Multiple level routes' },
    { label: 'Triangle', type: 'pass', description: 'Triangle route concept' },
    { label: 'Bender', type: 'pass', description: 'Bender route combination' },
    { label: 'Slants', type: 'pass', description: 'Slant route concept' },
    { label: 'Arrow', type: 'pass', description: 'Arrow route underneath' },
    { label: 'Wheel', type: 'pass', description: 'Wheel route combination' },
    { label: 'Flood', type: 'pass', description: 'Flood route concept' },
    { label: 'Out', type: 'pass', description: 'Out route combination' },
    { label: 'Dig', type: 'pass', description: 'Dig route across field' },
    { label: 'Cross', type: 'pass', description: 'Crosser route concept' },
    { label: 'Post', type: 'pass', description: 'Post route downfield' },
    { label: 'Corner', type: 'pass', description: 'Corner route downfield' }
  ],
  'Smashmouth': [
    { label: 'Power O', type: 'run', description: 'Power gap scheme' },
    { label: 'Counter', type: 'run', description: 'Counter run play' },
    { label: 'Trap', type: 'run', description: 'Trap blocking scheme' },
    { label: 'Inside Zone', type: 'run', description: 'Inside zone runs' },
    { label: 'Outside Zone', type: 'run', description: 'Outside zone runs' },
    { label: 'Pull Sweep', type: 'run', description: 'Pulling guards for sweep' },
    { label: 'Toss', type: 'run', description: 'Toss sweep to perimeter' },
    { label: 'Lead', type: 'run', description: 'Lead blocking run' },
    { label: 'PA Pass', type: 'pass', description: 'Play action pass' },
    { label: 'Bootleg', type: 'pass', description: 'Quarterback bootleg' },
    { label: 'Counter Pass', type: 'pass', description: 'Counter pass action' },
    { label: 'TE Seam', type: 'pass', description: 'Tight end seam route' },
    { label: 'HB Flat', type: 'pass', description: 'Halfback flat route' },
    { label: 'WR Out', type: 'pass', description: 'Wide receiver out route' },
    { label: 'FB Dive', type: 'run', description: 'Fullback dive play' },
    { label: 'Iso', type: 'run', description: 'Isolation run play' },
    { label: 'Wham', type: 'run', description: 'Wham blocking scheme' },
    { label: 'Power Sweep', type: 'run', description: 'Power sweep play' },
    { label: 'Draw', type: 'run', description: 'Draw play' },
    { label: 'Screen', type: 'pass', description: 'Screen pass' }
  ],
  'Wide Zone': [
    { label: 'Wide Zone', type: 'run', description: 'Wide zone running scheme' },
    { label: 'Stretch Zone', type: 'run', description: 'Stretch zone to perimeter' },
    { label: 'Inside Zone', type: 'run', description: 'Inside zone runs' },
    { label: 'Counter', type: 'run', description: 'Counter misdirection' },
    { label: 'Power', type: 'run', description: 'Power gap scheme' },
    { label: 'Trap', type: 'run', description: 'Trap blocking' },
    { label: 'Toss Sweep', type: 'run', description: 'Toss to perimeter' },
    { label: 'Pull Sweep', type: 'run', description: 'Pulling for sweep' },
    { label: 'RPO', type: 'pass', description: 'Run-pass option' },
    { label: 'Play Action', type: 'pass', description: 'Play action pass' },
    { label: 'Bootleg', type: 'pass', description: 'QB bootleg' },
    { label: 'TE Route', type: 'pass', description: 'Tight end route' },
    { label: 'Screen', type: 'pass', description: 'Screen pass' },
    { label: 'HB Flat', type: 'pass', description: 'HB flat route' },
    { label: 'WR Out', type: 'pass', description: 'WR out route' },
    { label: 'Lead Block', type: 'run', description: 'Lead blocking run' },
    { label: 'Cutback', type: 'run', description: 'Cutback lane run' },
    { label: 'Gap Scheme', type: 'run', description: 'Gap blocking' },
    { label: 'Zone Read', type: 'run', description: 'Zone read option' },
    { label: 'Sprint Out', type: 'pass', description: 'Sprint out pass' }
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

  private applyPlaybookSelection(playbook: string): void {
    if (!this.playbookState.availablePlaybooks.includes(playbook)) {
      console.warn(`Invalid playbook selected: ${playbook}`);
      return;
    }

    this.playbookState.selectedPlaybook = playbook;

    // Update cards for selected playbook
    const cards = PLAYBOOK_CARDS[playbook] || [];
    this.playbookState.cards = cards.map((card, index) => ({
      ...card,
      id: `${playbook.toLowerCase().replace(' ', '-')}-card-${index}`,
      playbook: playbook as any,
      isSelected: false,
      isDisabled: false,
      isHovered: false,
      ariaLabel: `${card.label}: ${card.description}`,
      variant: 'primary' as const
    }));

    this.renderPlaybookCards();

    // Announce selection for screen readers
    if (this.config.accessibility.announceCardSelections) {
      this.announceToScreenReader(`Playbook changed to ${playbook}`);
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
