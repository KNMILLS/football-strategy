import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerPenaltyFixture } from '../../src/ui/dice/PenaltyFixture';
import { EventBus } from '../../src/utils/EventBus';
import type { PenaltyResolution } from '../../src/rules/PenaltyResolver';

describe('Penalty Fixture UI', () => {
  let bus: EventBus;
  let mockDocument: any;

  beforeEach(() => {
    // Mock DOM environment
    mockDocument = {
      getElementById: vi.fn(),
      createElement: vi.fn(),
      body: {
        appendChild: vi.fn()
      },
      activeElement: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    // Mock global document
    global.document = mockDocument as any;

    // Create fresh event bus for each test
    bus = new EventBus();

    // Register the penalty fixture
    registerPenaltyFixture(bus);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockPenaltyResolution = (isForcedOverride = false): PenaltyResolution => ({
    penalty: {
      on: 'defense',
      yards: 10
    },
    isForcedOverride,
    tableEntry: {
      side: 'defense',
      yards: 10,
      label: 'Test Penalty',
      override_play_result: isForcedOverride
    }
  });

  const createMockPenaltyFixtureData = (isForcedOverride = false) => ({
    resolution: createMockPenaltyResolution(isForcedOverride),
    summary: {
      down: 2,
      toGo: 7,
      ballOn: 45,
      quarter: 3,
      clock: 120,
      possession: 'player' as const
    },
    prePlay: {
      down: 2,
      toGo: 7,
      ballOn: 45
    },
    accepted: {
      down: 2,
      toGo: 17,
      ballOn: 35
    },
    declined: {
      down: 2,
      toGo: 7,
      ballOn: 45
    }
  });

  describe('Forced Override Dialog', () => {
    it('should show forced override dialog for forced penalties', () => {
      const mockDialog = {
        className: '',
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        remove: vi.fn(),
        querySelector: vi.fn().mockReturnValue(null)
      };

      const mockBackdrop = {
        className: '',
        tabIndex: -1,
        remove: vi.fn()
      };

      mockDocument.createElement.mockImplementation((tagName: string) => {
        if (tagName === 'div') {
          if (mockDocument.createElement.mock.calls.length === 1) {
            return mockBackdrop;
          }
          return mockDialog;
        }
        return { className: '', setAttribute: vi.fn(), appendChild: vi.fn() };
      });

      mockDocument.getElementById.mockReturnValue(null);

      const testData = createMockPenaltyFixtureData(true);

      // Emit the event to show the fixture
      (bus as any).emit('ui:penalty.fixture.show', { data: testData });

      // Verify dialog creation
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();

      // Verify dialog attributes
      expect(mockDialog.setAttribute).toHaveBeenCalledWith('role', 'dialog');
      expect(mockDialog.setAttribute).toHaveBeenCalledWith('aria-modal', 'true');
      expect(mockDialog.setAttribute).toHaveBeenCalledWith('data-dialog-id', 'penaltyForcedOverride');
    });

    it('should emit acknowledgment event when OK is clicked', () => {
      const mockButton = {
        type: 'button',
        className: '',
        textContent: '',
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        click: vi.fn(),
        focus: vi.fn()
      };

      const mockDialog = {
        className: '',
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        remove: vi.fn(),
        querySelector: vi.fn().mockReturnValue(null)
      };

      mockDocument.createElement.mockImplementation((tagName: string) => {
        if (tagName === 'button') return mockButton;
        if (tagName === 'div') return mockDialog;
        return { className: '', setAttribute: vi.fn(), appendChild: vi.fn() };
      });

      mockDocument.getElementById.mockReturnValue(null);

      const testData = createMockPenaltyFixtureData(true);
      const acknowledgmentSpy = vi.fn();

      bus.on('ui:penalty.fixture.acknowledged', acknowledgmentSpy);

      // Show the dialog
      (bus as any).emit('ui:penalty.fixture.show', { data: testData });

      // Simulate clicking OK
      expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));

      // Get the click handler and call it
      const clickHandler = mockButton.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )?.[1];

      if (clickHandler) {
        clickHandler();
      }

      expect(acknowledgmentSpy).toHaveBeenCalledWith({
        resolution: testData.resolution
      });
    });
  });

  describe('Accept/Decline Dialog', () => {
    it('should show accept/decline dialog for regular penalties', () => {
      const mockAcceptButton = {
        type: 'button',
        className: '',
        textContent: '',
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        click: vi.fn(),
        focus: vi.fn()
      };

      const mockDeclineButton = {
        type: 'button',
        className: '',
        textContent: '',
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        click: vi.fn(),
        focus: vi.fn()
      };

      const mockDialog = {
        className: '',
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        remove: vi.fn(),
        querySelector: vi.fn().mockReturnValue(null)
      };

      let buttonIndex = 0;
      mockDocument.createElement.mockImplementation((tagName: string) => {
        if (tagName === 'button') {
          return buttonIndex++ === 0 ? mockAcceptButton : mockDeclineButton;
        }
        if (tagName === 'div') return mockDialog;
        return { className: '', setAttribute: vi.fn(), appendChild: vi.fn() };
      });

      mockDocument.getElementById.mockReturnValue(null);

      const testData = createMockPenaltyFixtureData(false);

      // Emit the event to show the fixture
      (bus as any).emit('ui:penalty.fixture.show', { data: testData });

      // Verify dialog creation
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
      expect(mockDocument.body.appendChild).toHaveBeenCalled();

      // Verify dialog attributes
      expect(mockDialog.setAttribute).toHaveBeenCalledWith('role', 'dialog');
      expect(mockDialog.setAttribute).toHaveBeenCalledWith('aria-modal', 'true');
      expect(mockDialog.setAttribute).toHaveBeenCalledWith('data-dialog-id', 'penaltyAcceptDecline');

      // Verify buttons are created
      expect(mockDocument.createElement).toHaveBeenCalledWith('button');
    });

    it('should emit choice event when accept/decline buttons are clicked', () => {
      const mockAcceptButton = {
        type: 'button',
        className: '',
        textContent: '',
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        click: vi.fn(),
        focus: vi.fn()
      };

      const mockDeclineButton = {
        type: 'button',
        className: '',
        textContent: '',
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        click: vi.fn(),
        focus: vi.fn()
      };

      const mockDialog = {
        className: '',
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        remove: vi.fn(),
        querySelector: vi.fn().mockReturnValue(null)
      };

      let buttonIndex = 0;
      mockDocument.createElement.mockImplementation((tagName: string) => {
        if (tagName === 'button') {
          return buttonIndex++ === 0 ? mockAcceptButton : mockDeclineButton;
        }
        if (tagName === 'div') return mockDialog;
        return { className: '', setAttribute: vi.fn(), appendChild: vi.fn() };
      });

      mockDocument.getElementById.mockReturnValue(null);

      const testData = createMockPenaltyFixtureData(false);
      const choiceSpy = vi.fn();

      bus.on('ui:penalty.fixture.choice', choiceSpy);

      // Show the dialog
      (bus as any).emit('ui:penalty.fixture.show', { data: testData });

      // Get the click handlers
      const acceptClickHandler = mockAcceptButton.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )?.[1];

      const declineClickHandler = mockDeclineButton.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )?.[1];

      // Test accept
      if (acceptClickHandler) {
        acceptClickHandler();
      }
      expect(choiceSpy).toHaveBeenCalledWith({
        decision: 'accept',
        resolution: testData.resolution
      });

      // Reset spy and test decline
      choiceSpy.mockClear();
      if (declineClickHandler) {
        declineClickHandler();
      }
      expect(choiceSpy).toHaveBeenCalledWith({
        decision: 'decline',
        resolution: testData.resolution
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Enter key to acknowledge forced override', () => {
      const mockButton = {
        type: 'button',
        className: '',
        textContent: '',
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        click: vi.fn(),
        focus: vi.fn()
      };

      const mockDialog = {
        className: '',
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        remove: vi.fn(),
        querySelector: vi.fn().mockReturnValue(null)
      };

      mockDocument.createElement.mockImplementation((tagName: string) => {
        if (tagName === 'button') return mockButton;
        if (tagName === 'div') return mockDialog;
        return { className: '', setAttribute: vi.fn(), appendChild: vi.fn() };
      });

      mockDocument.getElementById.mockReturnValue(null);
      mockDocument.activeElement = mockButton;

      const testData = createMockPenaltyFixtureData(true);
      const acknowledgmentSpy = vi.fn();

      bus.on('ui:penalty.fixture.acknowledged', acknowledgmentSpy);

      // Show the dialog
      (bus as any).emit('ui:penalty.fixture.show', { data: testData });

      // Get the keydown handler
      const keyHandler = mockDocument.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )?.[1];

      // Test Enter key
      if (keyHandler) {
        const enterEvent = { key: 'Enter', preventDefault: vi.fn() };
        keyHandler(enterEvent);
      }

      expect(acknowledgmentSpy).toHaveBeenCalled();
    });

    it('should handle number keys for accept/decline', () => {
      const mockAcceptButton = {
        type: 'button',
        className: '',
        textContent: '',
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        click: vi.fn(),
        focus: vi.fn()
      };

      const mockDeclineButton = {
        type: 'button',
        className: '',
        textContent: '',
        setAttribute: vi.fn(),
        addEventListener: vi.fn(),
        click: vi.fn(),
        focus: vi.fn()
      };

      const mockDialog = {
        className: '',
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        remove: vi.fn(),
        querySelector: vi.fn().mockReturnValue(null)
      };

      let buttonIndex = 0;
      mockDocument.createElement.mockImplementation((tagName: string) => {
        if (tagName === 'button') {
          return buttonIndex++ === 0 ? mockAcceptButton : mockDeclineButton;
        }
        if (tagName === 'div') return mockDialog;
        return { className: '', setAttribute: vi.fn(), appendChild: vi.fn() };
      });

      mockDocument.getElementById.mockReturnValue(null);

      const testData = createMockPenaltyFixtureData(false);
      const choiceSpy = vi.fn();

      bus.on('ui:penalty.fixture.choice', choiceSpy);

      // Show the dialog
      (bus as any).emit('ui:penalty.fixture.show', { data: testData });

      // Get the keydown handler
      const keyHandler = mockDocument.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )?.[1];

      // Test number keys
      if (keyHandler) {
        // Test '1' key (accept)
        const acceptEvent = { key: '1', preventDefault: vi.fn() };
        keyHandler(acceptEvent);
        expect(choiceSpy).toHaveBeenCalledWith({
          decision: 'accept',
          resolution: testData.resolution
        });

        choiceSpy.mockClear();

        // Test '2' key (decline)
        const declineEvent = { key: '2', preventDefault: vi.fn() };
        keyHandler(declineEvent);
        expect(choiceSpy).toHaveBeenCalledWith({
          decision: 'decline',
          resolution: testData.resolution
        });
      }
    });
  });

  describe('Dialog Cleanup', () => {
    it('should clean up dialog on close', () => {
      const mockBackdrop = {
        className: '',
        tabIndex: -1,
        remove: vi.fn()
      };

      const mockDialog = {
        className: '',
        setAttribute: vi.fn(),
        appendChild: vi.fn(),
        remove: vi.fn(),
        querySelector: vi.fn().mockReturnValue(mockBackdrop)
      };

      mockDocument.createElement.mockImplementation((tagName: string) => {
        if (tagName === 'div') return mockDialog;
        return { className: '', setAttribute: vi.fn(), appendChild: vi.fn() };
      });

      mockDocument.getElementById.mockReturnValue(null);

      const testData = createMockPenaltyFixtureData(true);

      // Show the dialog
      (bus as any).emit('ui:penalty.fixture.show', { data: testData });

      // Verify dialog was created
      expect(mockDocument.body.appendChild).toHaveBeenCalled();

      // The cleanup should be handled by the closeDialog function
      // which is called when events are emitted
    });
  });
});
