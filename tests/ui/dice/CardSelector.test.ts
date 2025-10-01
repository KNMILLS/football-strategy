import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../src/utils/EventBus';
import { CardSelector } from '../../../src/ui/dice/CardSelector';
import type { DiceUIConfig } from '../../../src/ui/dice/types';

// Mock DOM environment
const mockElement = (id: string) => ({
  id,
  className: '',
  innerHTML: '',
  style: { display: 'none' },
  appendChild: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
  addEventListener: vi.fn(),
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
  removeEventListener: vi.fn(),
  focus: vi.fn(),
  click: vi.fn()
});

const mockDocument = {
  getElementById: vi.fn((id: string) => mockElement(id)),
  createElement: vi.fn((tag: string) => mockElement(`mock-${tag}`)),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// @ts-ignore
global.document = mockDocument;
// @ts-ignore
global.window = { setTimeout: vi.fn(), clearTimeout: vi.fn() };

describe('CardSelector', () => {
  let bus: EventBus;
  let config: DiceUIConfig;
  let cardSelector: CardSelector;

  beforeEach(() => {
    bus = new EventBus();
    config = {
      accessibility: {
        enableScreenReader: true,
        enableKeyboardNavigation: true,
        enableFocusManagement: true,
        announceResults: true,
        announceCardSelections: true
      },
      performance: {
        animationDuration: 300,
        debounceMs: 100,
        maxConcurrentAnimations: 5,
        enableHardwareAcceleration: true
      },
      theme: 'light',
      animations: true,
      soundEffects: false
    };
    cardSelector = new CardSelector(bus, config);

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const playbookState = cardSelector.getPlaybookState();
      const defensiveState = cardSelector.getDefensiveState();

      expect(playbookState.availablePlaybooks).toEqual([
        'West Coast', 'Spread', 'Air Raid', 'Smashmouth', 'Wide Zone'
      ]);
      expect(playbookState.cards).toEqual([]);
      expect(playbookState.selectedPlaybook).toBeUndefined();

      expect(defensiveState.availableCards).toHaveLength(10);
      expect(defensiveState.selectedCards).toEqual([]);
      expect(defensiveState.maxSelections).toBe(10);
    });

    it('should set up DOM elements when registered', () => {
      // Mock DOM elements
      const mockPlaybookContainer = mockElement('dice-playbook-container');
      const mockDefensiveContainer = mockElement('dice-defensive-container');

      mockDocument.getElementById
        .mockImplementation((id: string) => {
          if (id === 'dice-playbook-container') return mockPlaybookContainer;
          if (id === 'dice-defensive-container') return mockDefensiveContainer;
          return null;
        });

      cardSelector.register();

      // Should have set up containers
      expect(mockPlaybookContainer.appendChild).toHaveBeenCalled();
      expect(mockDefensiveContainer.appendChild).toHaveBeenCalled();
    });
  });

  describe('playbook selection', () => {
    it('should select a valid playbook and update state', () => {
      const testPlaybook = 'West Coast';

      // Mock the bus emit to capture events
      const emitSpy = vi.spyOn(bus, 'emit');

      cardSelector['selectPlaybook'](testPlaybook);

      const state = cardSelector.getPlaybookState();
      expect(state.selectedPlaybook).toBe(testPlaybook);

      // Should emit playbook selection event
      expect(emitSpy).toHaveBeenCalledWith('ui:playbookSelected', { playbook: testPlaybook });
    });

    it('should reject invalid playbook names', () => {
      const invalidPlaybook = 'Invalid Playbook';

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      cardSelector['selectPlaybook'](invalidPlaybook);

      const state = cardSelector.getPlaybookState();
      expect(state.selectedPlaybook).toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(`Invalid playbook selected: ${invalidPlaybook}`);
    });

    it('should update cards when playbook is selected', () => {
      cardSelector['selectPlaybook']('West Coast');

      const state = cardSelector.getPlaybookState();
      expect(state.cards).toHaveLength(20); // West Coast has 20 cards
      expect(state.cards[0]).toHaveProperty('id');
      expect(state.cards[0]).toHaveProperty('label');
      expect(state.cards[0]).toHaveProperty('playbook', 'West Coast');
    });
  });

  describe('defensive card selection', () => {
    it('should toggle defensive card selection within limit', () => {
      const cardId = 'def-0';

      // Mock the bus emit to capture events
      const emitSpy = vi.spyOn(bus, 'emit');

      cardSelector['toggleDefensiveCard'](cardId);

      const state = cardSelector.getDefensiveState();
      expect(state.selectedCards).toContain(cardId);
      expect(state.availableCards[0].isSelected).toBe(true);

      // Should emit defensive card toggle event
      expect(emitSpy).toHaveBeenCalledWith('ui:defensiveCardToggled', { cardId });
    });

    it('should allow deselection of cards', () => {
      const cardId = 'def-0';

      // First select
      cardSelector['toggleDefensiveCard'](cardId);

      // Then deselect
      cardSelector['toggleDefensiveCard'](cardId);

      const state = cardSelector.getDefensiveState();
      expect(state.selectedCards).not.toContain(cardId);
      expect(state.availableCards[0].isSelected).toBe(false);
    });

    it('should respect maximum selection limit', () => {
      const smallLimitConfig = { ...config };
      smallLimitConfig.performance.maxConcurrentAnimations = 2; // Not relevant but testing config override

      const smallLimitSelector = new CardSelector(bus, smallLimitConfig);

      // Mock a smaller max selections
      smallLimitSelector['defensiveState'].maxSelections = 2;

      // Select maximum allowed
      smallLimitSelector['toggleDefensiveCard']('def-0');
      smallLimitSelector['toggleDefensiveCard']('def-1');

      // Try to select one more (should be ignored)
      smallLimitSelector['toggleDefensiveCard']('def-2');

      const state = smallLimitSelector.getDefensiveState();
      expect(state.selectedCards).toHaveLength(2);
      expect(state.availableCards[2].isSelected).toBe(false);
    });
  });

  describe('card selection', () => {
    beforeEach(() => {
      // Select a playbook first
      cardSelector['selectPlaybook']('West Coast');
    });

    it('should select a card and update state', () => {
      const cardId = cardSelector.getPlaybookState().cards[0].id;

      // Mock the bus emit to capture events
      const emitSpy = vi.spyOn(bus, 'emit');

      cardSelector['selectCard'](cardId);

      const state = cardSelector.getPlaybookState();
      const selectedCard = state.cards.find(c => c.id === cardId);
      expect(selectedCard?.isSelected).toBe(true);

      // Should emit card selection event
      expect(emitSpy).toHaveBeenCalledWith('ui:cardSelected', { cardId });
    });

    it('should reject selection of disabled cards', () => {
      const cardId = cardSelector.getPlaybookState().cards[0].id;

      // Disable the card
      cardSelector.getPlaybookState().cards[0].isDisabled = true;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      cardSelector['selectCard'](cardId);

      expect(consoleSpy).toHaveBeenCalledWith(`Card is disabled: ${cardId}`);
    });

    it('should mark only one card as selected at a time', () => {
      const state = cardSelector.getPlaybookState();
      const card1 = state.cards[0];
      const card2 = state.cards[1];

      // Select first card
      cardSelector['selectCard'](card1.id);

      // Select second card
      cardSelector['selectCard'](card2.id);

      const updatedState = cardSelector.getPlaybookState();
      expect(updatedState.cards.find(c => c.id === card1.id)?.isSelected).toBe(false);
      expect(updatedState.cards.find(c => c.id === card2.id)?.isSelected).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should announce playbook changes to screen readers', () => {
      // Mock DOM for live region
      const liveRegion = mockElement('dice-screen-reader-announcements');
      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'dice-screen-reader-announcements') return liveRegion;
        return null;
      });

      // Enable screen reader announcements
      config.accessibility.announceCardSelections = true;

      cardSelector['selectPlaybook']('Spread');

      // Should have created or updated live region
      expect(liveRegion.textContent).toBe('Playbook changed to Spread');
    });

    it('should announce card selections to screen readers', () => {
      // Mock DOM for live region
      const liveRegion = mockElement('dice-screen-reader-announcements');
      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'dice-screen-reader-announcements') return liveRegion;
        return null;
      });

      // Enable screen reader announcements and select playbook first
      config.accessibility.announceCardSelections = true;
      cardSelector['selectPlaybook']('West Coast');

      const cardId = cardSelector.getPlaybookState().cards[0].id;
      cardSelector['selectCard'](cardId);

      // Should have announced card selection
      expect(liveRegion.textContent).toBe(`Selected play: ${cardSelector.getPlaybookState().cards[0].label}`);
    });

    it('should respect accessibility configuration', () => {
      // Disable screen reader announcements
      config.accessibility.announceCardSelections = false;

      const liveRegion = mockElement('dice-screen-reader-announcements');
      mockDocument.getElementById.mockImplementation((id: string) => {
        if (id === 'dice-screen-reader-announcements') return liveRegion;
        return null;
      });

      cardSelector['selectPlaybook']('Air Raid');

      // Should not have announced (live region not created)
      expect(mockDocument.createElement).not.toHaveBeenCalledWith('div');
    });
  });

  describe('state management', () => {
    it('should update playbook state correctly', () => {
      const newState = {
        availablePlaybooks: ['Test Playbook'],
        cards: [
          {
            id: 'test-card',
            label: 'Test Card',
            type: 'pass' as const,
            playbook: 'Test' as any,
            isSelected: false,
            isDisabled: false,
            isHovered: false,
            ariaLabel: 'Test card',
            variant: 'primary' as const
          }
        ]
      };

      cardSelector.updatePlaybookState(newState);

      const state = cardSelector.getPlaybookState();
      expect(state.availablePlaybooks).toEqual(['Test Playbook']);
      expect(state.cards).toHaveLength(1);
      expect(state.cards[0].label).toBe('Test Card');
    });

    it('should update defensive state correctly', () => {
      const newState = {
        selectedCards: ['def-0', 'def-1'],
        availableCards: [
          {
            id: 'def-0',
            label: 'Test Defense',
            isSelected: true,
            isDisabled: false,
            isHovered: false,
            ariaLabel: 'Test defensive play',
            variant: 'success' as const
          }
        ],
        maxSelections: 5
      };

      cardSelector.updateDefensiveState(newState);

      const state = cardSelector.getDefensiveState();
      expect(state.selectedCards).toEqual(['def-0', 'def-1']);
      expect(state.availableCards[0].isSelected).toBe(true);
      expect(state.maxSelections).toBe(5);
    });
  });

  describe('event handling', () => {
    it('should handle playbook selection events', () => {
      const testPlaybook = 'Smashmouth';

      // Emit playbook selection event
      bus.emit('ui:playbookSelected', { playbook: testPlaybook });

      const state = cardSelector.getPlaybookState();
      expect(state.selectedPlaybook).toBe(testPlaybook);
    });

    it('should handle defensive card toggle events', () => {
      const cardId = 'def-5';

      // Emit defensive card toggle event
      bus.emit('ui:defensiveCardToggled', { cardId });

      const state = cardSelector.getDefensiveState();
      expect(state.selectedCards).toContain(cardId);
      expect(state.availableCards[5].isSelected).toBe(true);
    });

    it('should handle card selection events', () => {
      // Select playbook first
      cardSelector['selectPlaybook']('West Coast');
      const cardId = cardSelector.getPlaybookState().cards[0].id;

      // Emit card selection event
      bus.emit('ui:cardSelected', { cardId });

      const state = cardSelector.getPlaybookState();
      expect(state.cards.find(c => c.id === cardId)?.isSelected).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle missing playbook gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Try to select cards from non-existent playbook
      cardSelector['selectCard']('non-existent-card');

      expect(consoleSpy).toHaveBeenCalledWith('Card not found: non-existent-card');
    });

    it('should handle missing defensive cards gracefully', () => {
      // Try to toggle non-existent defensive card
      cardSelector['toggleDefensiveCard']('non-existent-defensive-card');

      const state = cardSelector.getDefensiveState();
      // State should remain unchanged
      expect(state.selectedCards).toEqual([]);
    });
  });
});
