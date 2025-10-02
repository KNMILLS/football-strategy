import type { EventBus } from '../../utils/EventBus';
import type { PenaltyModalState, DiceUIConfig } from './types';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

export class PenaltyModal {
  private bus: EventBus;
  private config: DiceUIConfig;
  private state: PenaltyModalState;
  private modalElement: HTMLElement | null = null;
  private focusTrap: FocusTrap | null = null;

  constructor(bus: EventBus, config: DiceUIConfig) {
    this.bus = bus;
    this.config = config;
    this.state = {
      isVisible: false,
      isAccepting: false,
      isDeclining: false
    };
  }

  register(): void {
    console.log('PenaltyModal component registering...');

    // Wait for DOM to be ready if elements aren't found yet
    const waitForElements = () => {
      const modalContainer = $('dice-modal-container');
      if (!modalContainer) {
        console.log('PenaltyModal container not found, waiting...');
        setTimeout(waitForElements, 100);
        return;
      }

      console.log('PenaltyModal container found, setting up...');
      this.setupModalContainer(modalContainer);

      // Listen for penalty events from the game flow
      this.bus.on('flow:choiceRequired', (payload: any) => {
        if (payload.choice === 'penaltyAcceptDecline') {
          this.showPenaltyModal(payload.data);
        }
      });

      // Listen for penalty decision events
      this.bus.on('ui:choice.penalty', (payload: { decision: 'accept' | 'decline' }) => {
        this.handlePenaltyDecision(payload.decision);
      });

      // Listen for informational penalty events (4/5/6 overrides)
      this.bus.on('ui:penaltyOverride', (payload: { penaltyInfo: any; description: string }) => {
        this.showInformationalModal(payload.penaltyInfo, payload.description);
      });

      console.log('PenaltyModal registered successfully');
    };

    waitForElements();
  }

  private setupModalContainer(container: HTMLElement): void {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'dice-modal-backdrop';
    backdrop.id = 'dice-penalty-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'dice-penalty-modal';
    modal.id = 'dice-penalty-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'dice-penalty-title');

    // Create modal content structure
    modal.innerHTML = `
      <div class="dice-modal-header">
        <h2 id="dice-penalty-title" class="dice-modal-title">Penalty Decision</h2>
        <button class="dice-modal-close" aria-label="Close penalty modal">&times;</button>
      </div>
      <div class="dice-modal-body">
        <div id="dice-penalty-content" class="dice-penalty-content">
          <!-- Penalty information will be inserted here -->
        </div>
        <div id="dice-penalty-buttons" class="dice-penalty-buttons">
          <!-- Accept/Decline buttons will be inserted here -->
        </div>
      </div>
    `;

    backdrop.appendChild(modal);
    container.appendChild(backdrop);

    this.modalElement = modal;

    // Set up event listeners
    this.setupEventListeners(backdrop, modal);

    // Hide initially
    backdrop.style.display = 'none';
  }

  private setupEventListeners(backdrop: HTMLElement, modal: HTMLElement): void {
    // Close button
    const closeButton = modal.querySelector('.dice-modal-close') as HTMLButtonElement;
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideModal();
      });
    }

    // Backdrop click to close
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.hideModal();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.isVisible) {
        this.hideModal();
      }
    });

    // Focus management
    if (this.config.accessibility.enableFocusManagement) {
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          this.handleTabNavigation(e, modal);
        }
      });
    }
  }

  private handleTabNavigation(e: KeyboardEvent, modal: HTMLElement): void {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  private showPenaltyModal(data: {
    accepted: any;
    declined: any;
    meta: any;
  }): void {
    if (!this.modalElement) return;

    this.state.isVisible = true;

    const content = this.modalElement.querySelector('#dice-penalty-content') as HTMLElement;
    const buttons = this.modalElement.querySelector('#dice-penalty-buttons') as HTMLElement;

    if (!content || !buttons) return;

    // Clear previous content
    content.innerHTML = '';
    buttons.innerHTML = '';

    // Show penalty information
    const penaltyInfo = document.createElement('div');
    penaltyInfo.className = 'dice-penalty-info';

    const penaltyType = document.createElement('div');
    penaltyType.className = 'dice-penalty-type';
    penaltyType.textContent = `Penalty: ${data.meta.penaltyType}`;

    const penaltyYards = document.createElement('div');
    penaltyYards.className = 'dice-penalty-yards';
    penaltyYards.textContent = `${data.meta.yards} yards`;

    const penaltyDescription = document.createElement('div');
    penaltyDescription.className = 'dice-penalty-description';
    penaltyDescription.textContent = data.meta.description;

    penaltyInfo.appendChild(penaltyType);
    penaltyInfo.appendChild(penaltyYards);
    penaltyInfo.appendChild(penaltyDescription);
    content.appendChild(penaltyInfo);

    // Create accept/decline buttons
    const acceptButton = document.createElement('button');
    acceptButton.className = 'dice-penalty-btn dice-penalty-accept';
    acceptButton.textContent = 'Accept Penalty';
    acceptButton.setAttribute('aria-label', 'Accept the penalty');
    acceptButton.addEventListener('click', () => {
      this.bus.emit('ui:choice.penalty', { decision: 'accept' });
    });

    const declineButton = document.createElement('button');
    declineButton.className = 'dice-penalty-btn dice-penalty-decline';
    declineButton.textContent = 'Decline Penalty';
    declineButton.setAttribute('aria-label', 'Decline the penalty');
    declineButton.addEventListener('click', () => {
      this.bus.emit('ui:choice.penalty', { decision: 'decline' });
    });

    buttons.appendChild(acceptButton);
    buttons.appendChild(declineButton);

    // Show modal
    const backdrop = this.modalElement.parentElement;
    if (backdrop) {
      backdrop.style.display = 'flex';
      backdrop.setAttribute('aria-hidden', 'false');
    }

    // Focus first button for accessibility
    if (this.config.accessibility.enableFocusManagement) {
      setTimeout(() => {
        acceptButton.focus();
      }, 100);
    }

    // Announce to screen readers
    if (this.config.accessibility.announceResults) {
      this.announceToScreenReader(
        `Penalty decision required. ${data.meta.penaltyType} for ${data.meta.yards} yards. ${data.meta.description}`
      );
    }
  }

  private showInformationalModal(penaltyInfo: any, description: string): void {
    if (!this.modalElement) return;

    this.state.isVisible = true;

    const content = this.modalElement.querySelector('#dice-penalty-content') as HTMLElement;
    const buttons = this.modalElement.querySelector('#dice-penalty-buttons') as HTMLElement;

    if (!content || !buttons) return;

    // Clear previous content
    content.innerHTML = '';
    buttons.innerHTML = '';

    // Show informational content
    const info = document.createElement('div');
    info.className = 'dice-penalty-info';

    const title = document.createElement('div');
    title.className = 'dice-penalty-title';
    title.textContent = 'Automatic Penalty Override';

    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'dice-penalty-description';
    descriptionElement.textContent = description;

    const penaltyDetails = document.createElement('div');
    penaltyDetails.className = 'dice-penalty-details';
    penaltyDetails.textContent = `Penalty: ${penaltyInfo.penaltyType} - ${penaltyInfo.yards} yards`;

    info.appendChild(title);
    info.appendChild(descriptionElement);
    info.appendChild(penaltyDetails);
    content.appendChild(info);

    // Create OK button
    const okButton = document.createElement('button');
    okButton.className = 'dice-penalty-btn dice-penalty-ok';
    okButton.textContent = 'OK';
    okButton.setAttribute('aria-label', 'Acknowledge penalty override');
    okButton.addEventListener('click', () => {
      this.hideModal();
    });

    buttons.appendChild(okButton);

    // Show modal
    const backdrop = this.modalElement.parentElement;
    if (backdrop) {
      backdrop.style.display = 'flex';
      backdrop.setAttribute('aria-hidden', 'false');
    }

    // Focus OK button for accessibility
    if (this.config.accessibility.enableFocusManagement) {
      setTimeout(() => {
        okButton.focus();
      }, 100);
    }

    // Announce to screen readers
    if (this.config.accessibility.announceResults) {
      this.announceToScreenReader(
        `Automatic penalty override. ${description}`
      );
    }
  }

  private handlePenaltyDecision(decision: 'accept' | 'decline'): void {
    this.state.isAccepting = decision === 'accept';
    this.state.isDeclining = decision === 'decline';

    // Update button states
    const acceptButton = this.modalElement?.querySelector('.dice-penalty-accept') as HTMLButtonElement;
    const declineButton = this.modalElement?.querySelector('.dice-penalty-decline') as HTMLButtonElement;

    if (acceptButton && declineButton) {
      if (decision === 'accept') {
        acceptButton.classList.add('processing');
        acceptButton.textContent = 'Accepting...';
        acceptButton.disabled = true;
        declineButton.disabled = true;
      } else {
        declineButton.classList.add('processing');
        declineButton.textContent = 'Declining...';
        declineButton.disabled = true;
        acceptButton.disabled = true;
      }
    }

    // Auto-hide after decision is processed
    setTimeout(() => {
      this.hideModal();
    }, 1000);
  }

  private hideModal(): void {
    if (!this.modalElement) return;

    this.state.isVisible = false;
    this.state.isAccepting = false;
    this.state.isDeclining = false;

    const backdrop = this.modalElement.parentElement;
    if (backdrop) {
      backdrop.style.display = 'none';
      backdrop.setAttribute('aria-hidden', 'true');
    }

    // Reset button states
    const acceptButton = this.modalElement.querySelector('.dice-penalty-accept') as HTMLButtonElement;
    const declineButton = this.modalElement.querySelector('.dice-penalty-decline') as HTMLButtonElement;
    const okButton = this.modalElement.querySelector('.dice-penalty-ok') as HTMLButtonElement;

    if (acceptButton) {
      acceptButton.classList.remove('processing');
      acceptButton.textContent = 'Accept Penalty';
      acceptButton.disabled = false;
    }

    if (declineButton) {
      declineButton.classList.remove('processing');
      declineButton.textContent = 'Decline Penalty';
      declineButton.disabled = false;
    }

    if (okButton) {
      okButton.classList.remove('processing');
      okButton.textContent = 'OK';
      okButton.disabled = false;
    }
  }

  private announceToScreenReader(message: string): void {
    if (!this.config.accessibility.enableScreenReader) return;

    // Create or find live region for announcements
    let liveRegion = $('dice-screen-reader-announcements');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'dice-screen-reader-announcements';
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      liveRegion!.textContent = '';
    }, 2000);
  }

  updateState(state: PenaltyModalState): void {
    this.state = { ...state };

    if (state.isVisible && this.modalElement) {
      const backdrop = this.modalElement.parentElement;
      if (backdrop) {
        backdrop.style.display = 'flex';
        backdrop.setAttribute('aria-hidden', 'false');
      }
    } else {
      this.hideModal();
    }
  }

  getState(): PenaltyModalState {
    return { ...this.state };
  }

  // Force show for testing or special cases
  showOverrideModal(description: string): void {
    this.showInformationalModal(
      { penaltyType: 'Override', yards: 0 },
      description
    );
  }

  // Force hide for testing or special cases
  forceHide(): void {
    this.hideModal();
  }
}

// Simple focus trap implementation for accessibility
class FocusTrap {
  private element: HTMLElement;
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    this.updateFocusableElements();
  }

  private updateFocusableElements(): void {
    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const focusableElements = this.element.querySelectorAll(focusableSelectors);
    this.firstFocusable = focusableElements[0] as HTMLElement;
    this.lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
  }

  activate(): void {
    if (this.firstFocusable) {
      this.firstFocusable.focus();
    }

    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  deactivate(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        if (this.lastFocusable) {
          this.lastFocusable.focus();
        }
      }
    } else {
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        if (this.firstFocusable) {
          this.firstFocusable.focus();
        }
      }
    }
  }
}
