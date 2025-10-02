import type { EventBus } from '../../utils/EventBus';
import type { DiceResolutionResult, ResultDisplayState, DiceUIConfig } from './types';

function $(id: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

export class ResultDisplay {
  private bus: EventBus;
  private config: DiceUIConfig;
  private state: ResultDisplayState;
  private resultContainer: HTMLElement | null = null;
  private animationTimeouts: Set<number> = new Set();

  constructor(bus: EventBus, config: DiceUIConfig) {
    this.bus = bus;
    this.config = config;
    this.state = {
      isVisible: false,
      showAnimation: false
    };
  }

  register(): void {
    console.log('ResultDisplay component registering...');

    // Wait for DOM to be ready if elements aren't found yet
    const waitForElements = () => {
      const resultContainer = $('dice-result-container');
      if (!resultContainer) {
        console.log('ResultDisplay container not found, waiting...');
        setTimeout(waitForElements, 100);
        return;
      }

      console.log('ResultDisplay container found, setting up...');
      this.resultContainer = resultContainer;
      this.setupResultContainer(resultContainer);

      // Listen for dice resolution results
      this.bus.on('ui:diceResult', (payload: {
        diceResult: { d1: number; d2: number; sum: number; isDoubles: boolean };
        outcome: DiceResolutionResult;
      }) => {
        this.showResult(payload.diceResult, payload.outcome);
      });

      // Listen for result display events
      this.bus.on('ui:resultDisplayShown', (payload: { result: DiceResolutionResult }) => {
        this.showResultDisplay(payload.result);
      });

      this.bus.on('ui:resultDisplayHidden', () => {
        this.hideResultDisplay();
      });

      console.log('ResultDisplay registered successfully');
    };

    waitForElements();
  }

  private setupResultContainer(container: HTMLElement): void {
    // Create result display structure
    container.innerHTML = `
      <div class="dice-result-display" id="dice-result-display" style="display: none;">
        <div class="dice-result-header">
          <h3 class="dice-result-title">Play Result</h3>
          <button class="dice-result-close" aria-label="Close result display">&times;</button>
        </div>
        <div class="dice-result-body">
          <div class="dice-result-dice" id="dice-result-dice">
            <!-- Dice will be inserted here -->
          </div>
          <div class="dice-result-outcome" id="dice-result-outcome">
            <!-- Outcome information will be inserted here -->
          </div>
          <div class="dice-result-details" id="dice-result-details">
            <!-- Detailed information will be inserted here -->
          </div>
        </div>
        <div class="dice-result-footer">
          <button class="dice-result-continue" id="dice-result-continue">
            Continue
          </button>
        </div>
      </div>
    `;

    // Set up event listeners
    const closeButton = container.querySelector('.dice-result-close') as HTMLButtonElement;
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideResultDisplay();
      });
    }

    const continueButton = container.querySelector('#dice-result-continue') as HTMLButtonElement;
    if (continueButton) {
      continueButton.addEventListener('click', () => {
        this.hideResultDisplay();
      });
    }

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.isVisible) {
        this.hideResultDisplay();
      }
    });
  }

  private showResult(
    diceResult: { d1: number; d2: number; sum: number; isDoubles: boolean },
    outcome: DiceResolutionResult
  ): void {
    if (!this.resultContainer) return;

    this.state.isVisible = true;
    this.state.diceResult = diceResult;
    this.state.outcome = outcome;
    this.state.showAnimation = true;
    this.state.animationPhase = 'dice-roll';

    const display = this.resultContainer.querySelector('.dice-result-display') as HTMLElement;
    if (display) {
      display.style.display = 'block';
    }

    // Show dice roll animation
    this.showDiceAnimation(diceResult, outcome);

    // Announce result to screen readers
    if (this.config.accessibility.announceResults) {
      this.announceToScreenReader(
        `Dice roll: ${diceResult.d1} and ${diceResult.d2}, total ${diceResult.sum}. ${outcome.tags.join(', ')}.`
      );
    }
  }

  private showDiceAnimation(diceResult: { d1: number; d2: number; sum: number; isDoubles: boolean }, outcome: DiceResolutionResult): void {
    const diceContainer = this.resultContainer?.querySelector('#dice-result-dice') as HTMLElement;
    if (!diceContainer) return;

    // Clear previous dice
    diceContainer.innerHTML = '';

    // Create dice display
    const diceDisplay = document.createElement('div');
    diceDisplay.className = 'dice-display';

    // Create individual dice
    const die1 = document.createElement('div');
    die1.className = `die die-${diceResult.d1} ${diceResult.isDoubles ? 'doubles' : ''}`;
    die1.textContent = diceResult.d1.toString();

    const separator = document.createElement('div');
    separator.className = 'dice-separator';
    separator.textContent = '+';

    const die2 = document.createElement('div');
    die2.className = `die die-${diceResult.d2} ${diceResult.isDoubles ? 'doubles' : ''}`;
    die2.textContent = diceResult.d2.toString();

    const equals = document.createElement('div');
    equals.className = 'dice-equals';
    equals.textContent = '=';

    const total = document.createElement('div');
    total.className = `die-total ${diceResult.isDoubles ? 'doubles' : ''}`;
    total.textContent = diceResult.sum.toString();

    diceDisplay.appendChild(die1);
    diceDisplay.appendChild(separator);
    diceDisplay.appendChild(die2);
    diceDisplay.appendChild(equals);
    diceDisplay.appendChild(total);

    diceContainer.appendChild(diceDisplay);

    // Animate dice appearance
    if (this.config.animations && this.config.performance.enableHardwareAcceleration) {
      const timeoutId = window.setTimeout(() => {
        die1.style.transform = 'scale(1)';
        die2.style.transform = 'scale(1)';
        total.style.transform = 'scale(1.2)';

        if (diceResult.isDoubles) {
          die1.classList.add('animate-bounce');
          die2.classList.add('animate-bounce');
          total.classList.add('animate-pulse');
        }

        this.animationTimeouts.delete(timeoutId);
      }, 100);

      this.animationTimeouts.add(timeoutId);
    }

    // Show outcome after dice animation
    const outcomeTimeoutId = window.setTimeout(() => {
      this.showOutcome(outcome);
      this.animationTimeouts.delete(outcomeTimeoutId);
    }, this.config.performance.animationDuration + 500);
    this.animationTimeouts.add(outcomeTimeoutId);
  }

  private showOutcome(outcome: DiceResolutionResult): void {
    if (!this.resultContainer) return;

    this.state.animationPhase = 'result';

    const outcomeContainer = this.resultContainer.querySelector('#dice-result-outcome') as HTMLElement;
    const detailsContainer = this.resultContainer.querySelector('#dice-result-details') as HTMLElement;

    if (!outcomeContainer || !detailsContainer) return;

    // Clear previous content
    outcomeContainer.innerHTML = '';
    detailsContainer.innerHTML = '';

    // Show main outcome
    const outcomeTitle = document.createElement('div');
    outcomeTitle.className = 'dice-outcome-title';
    outcomeTitle.textContent = this.getOutcomeTitle(outcome);

    const outcomeDescription = document.createElement('div');
    outcomeDescription.className = 'dice-outcome-description';
    outcomeDescription.textContent = this.getOutcomeDescription(outcome);

    outcomeContainer.appendChild(outcomeTitle);
    outcomeContainer.appendChild(outcomeDescription);

    // Show detailed information
    const yardsInfo = document.createElement('div');
    yardsInfo.className = 'dice-detail-item';
    yardsInfo.innerHTML = `
      <span class="dice-detail-label">Yards:</span>
      <span class="dice-detail-value ${this.getYardsClass(outcome)}">${this.formatYards(outcome)}</span>
    `;

    const clockInfo = document.createElement('div');
    clockInfo.className = 'dice-detail-item';
    clockInfo.innerHTML = `
      <span class="dice-detail-label">Clock:</span>
      <span class="dice-detail-value">${this.formatClockRunoff(outcome.clockRunoff)}</span>
    `;

    const tagsInfo = document.createElement('div');
    tagsInfo.className = 'dice-detail-item';
    tagsInfo.innerHTML = `
      <span class="dice-detail-label">Tags:</span>
      <span class="dice-detail-value">${outcome.tags.join(', ')}</span>
    `;

    detailsContainer.appendChild(yardsInfo);
    detailsContainer.appendChild(clockInfo);
    detailsContainer.appendChild(tagsInfo);

    // Show penalty information if present
    if (outcome.penalty) {
      const penaltyInfo = document.createElement('div');
      penaltyInfo.className = 'dice-detail-item dice-penalty-info';
      penaltyInfo.innerHTML = `
        <span class="dice-detail-label">Penalty:</span>
        <span class="dice-detail-value">${outcome.penalty.penaltyInfo.label} - ${outcome.penalty.penaltyInfo.yards || 0} yards</span>
      `;
      detailsContainer.appendChild(penaltyInfo);
    }

    // Show doubles information if present
    if (outcome.doubles) {
      const doublesInfo = document.createElement('div');
      doublesInfo.className = 'dice-detail-item dice-doubles-info';
      doublesInfo.innerHTML = `
        <span class="dice-detail-label">Doubles:</span>
        <span class="dice-detail-value">${outcome.doubles.result}</span>
      `;
      detailsContainer.appendChild(doublesInfo);
    }
  }

  private showResultDisplay(result: DiceResolutionResult): void {
    // This method can be used to show results without dice animation
    // Useful for displaying final results or pre-computed outcomes
    if (!this.resultContainer) return;

    this.state.isVisible = true;
    this.state.outcome = result;

    const display = this.resultContainer.querySelector('.dice-result-display') as HTMLElement;
    if (display) {
      display.style.display = 'block';
    }

    this.showOutcome(result);
  }

  private hideResultDisplay(): void {
    if (!this.resultContainer) return;

    this.state.isVisible = false;
    this.state.showAnimation = false;
    (this.state as any).animationPhase = undefined;

    // Clear any pending animations
    this.animationTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.animationTimeouts.clear();

    const display = this.resultContainer.querySelector('.dice-result-display') as HTMLElement;
    if (display) {
      display.style.display = 'none';
    }

    // Reset dice animations
    const diceElements = this.resultContainer.querySelectorAll('.die, .die-total');
    diceElements.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.transform = '';
      htmlElement.classList.remove('animate-bounce', 'animate-pulse');
    });
  }

  private getOutcomeTitle(outcome: DiceResolutionResult): string {
    if (outcome.penalty) {
      return 'Penalty on the Play';
    }
    if (outcome.doubles) {
      return 'Doubles Result';
    }
    return 'Play Result';
  }

  private getOutcomeDescription(outcome: DiceResolutionResult): string {
    // This would be more sophisticated in a real implementation
    // For now, return a generic description based on tags
    const mainTag = outcome.tags[0] || 'Unknown result';
    return mainTag.charAt(0).toUpperCase() + mainTag.slice(1);
  }

  private getYardsClass(outcome: DiceResolutionResult): string {
    if (outcome.penalty) {
      return 'dice-yards-penalty';
    }
    // Could add more sophisticated logic here based on outcome
    return 'dice-yards-normal';
  }

  private formatYards(outcome: DiceResolutionResult): string {
    if (outcome.penalty) {
      const yards = outcome.penalty.penaltyInfo.yards || 0;
      return `-${yards} yards`;
    }
    // This would need access to the actual yards from the outcome
    // For now, return a placeholder
    return 'TBD yards';
  }

  private formatClockRunoff(clockRunoff: 10 | 20 | 30): string {
    return `${clockRunoff} seconds`;
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
    }, 3000);
  }

  updateState(state: ResultDisplayState): void {
    this.state = { ...state };

    if (state.isVisible && this.resultContainer) {
      const display = this.resultContainer.querySelector('.dice-result-display') as HTMLElement;
      if (display) {
        display.style.display = 'block';
      }

      if (state.outcome) {
        this.showResultDisplay(state.outcome);
      }
    } else {
      this.hideResultDisplay();
    }
  }

  getState(): ResultDisplayState {
    return { ...this.state };
  }

  // Force show for testing or special cases
  showTestResult(): void {
    const testDiceResult = { d1: 3, d2: 4, sum: 7, isDoubles: false };
    const testOutcome: DiceResolutionResult = {
      baseOutcome: {
        yards: 5,
        clock: 20,
        tags: ['short-gain'],
        description: 'Short gain of 5 yards'
      } as any,
      clockRunoff: 20,
      tags: ['short-gain']
    };

    this.showResult(testDiceResult, testOutcome);
  }

  // Force hide for testing or special cases
  forceHide(): void {
    this.hideResultDisplay();
  }
}
