import { EventBus } from '../utils/EventBus';
import { getCurrentEngine, getCurrentEngineInfo } from '../config/FeatureFlags';

/**
 * Engine indicator component that displays the current engine type during gameplay
 */
export function registerEngineIndicator(bus: EventBus): void {
  // Create engine indicator element
  const createIndicator = (): HTMLElement => {
    const container = document.createElement('div');
    container.id = 'engine-indicator';
    container.className = 'engine-indicator';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      border: 2px solid;
      opacity: 0.9;
      transition: all 0.3s ease;
    `;

    const updateDisplay = () => {
      const engineInfo = getCurrentEngineInfo();
      const currentEngine = getCurrentEngine();

      // Set border color based on engine type
      const borderColor = currentEngine === 'dice' ? '#00ff00' : '#ffaa00';
      container.style.borderColor = borderColor;

      container.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">
          ${engineInfo.name}
        </div>
        <div style="font-size: 10px; opacity: 0.8;">
          ${engineInfo.description}
        </div>
        <div style="font-size: 10px; margin-top: 4px; opacity: 0.7;">
          Engine: ${currentEngine}
        </div>
      `;
    };

    // Initial display
    updateDisplay();

    // Listen for engine changes
    bus.on('ui:engineChanged', () => {
      updateDisplay();
    });

    return container;
  };

  // Add to DOM if document is available
  if (typeof document !== 'undefined') {
    // Check if indicator already exists
    const existing = document.getElementById('engine-indicator');
    if (existing) {
      existing.remove();
    }

    const indicator = createIndicator();
    document.body.appendChild(indicator);
  }

  // Listen for feature flag changes to update display
  bus.on('ui:engineChanged', ({ engine }: { engine: string }) => {
    console.log(`Engine changed to: ${engine}`);
  });
}

/**
 * Update engine indicator visibility based on dev mode state
 */
export function updateEngineIndicatorVisibility(devModeEnabled: boolean): void {
  if (typeof document === 'undefined') return;

  const indicator = document.getElementById('engine-indicator');
  if (indicator) {
    indicator.style.display = devModeEnabled ? 'block' : 'none';
  }
}

/**
 * Remove engine indicator from DOM
 */
export function removeEngineIndicator(): void {
  if (typeof document === 'undefined') return;

  const indicator = document.getElementById('engine-indicator');
  if (indicator) {
    indicator.remove();
  }
}
