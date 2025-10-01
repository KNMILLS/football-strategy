/**
 * Fallback UI components for graceful degradation
 * Provides alternative UI when main components fail to load or encounter errors
 */

/**
 * Creates a fallback HUD component
 */
export function createFallbackHUD(): HTMLElement {
  const hud = document.createElement('div');
  hud.className = 'fallback-hud';
  hud.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
    margin: 10px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;

  const leftSection = document.createElement('div');
  leftSection.innerHTML = `
    <div>🏈 Gridiron Strategy</div>
    <div style="font-size: 12px; opacity: 0.8;">Game in Progress</div>
  `;

  const centerSection = document.createElement('div');
  centerSection.innerHTML = `
    <div>Q1 15:00</div>
    <div style="font-size: 12px; opacity: 0.8;">1st & 10 at HOME 25</div>
  `;

  const rightSection = document.createElement('div');
  rightSection.innerHTML = `
    <div>HOME 0 — AWAY 0</div>
    <div style="font-size: 12px; opacity: 0.8;">Ready to Play</div>
  `;

  hud.appendChild(leftSection);
  hud.appendChild(centerSection);
  hud.appendChild(rightSection);

  return hud;
}

/**
 * Creates a fallback log component
 */
export function createFallbackLog(): HTMLElement {
  const log = document.createElement('div');
  log.className = 'fallback-log';
  log.style.cssText = `
    background: #1a1a1a;
    color: #00ff00;
    font-family: 'Courier New', monospace;
    padding: 16px;
    margin: 10px;
    border-radius: 8px;
    height: 300px;
    overflow-y: auto;
    border: 2px solid #333;
  `;

  const title = document.createElement('div');
  title.textContent = '📜 Game Log';
  title.style.cssText = `
    color: #ffff00;
    font-weight: bold;
    margin-bottom: 12px;
    text-align: center;
    border-bottom: 1px solid #666;
    padding-bottom: 8px;
  `;

  const messages = document.createElement('div');
  messages.innerHTML = `
    <div>> Game started successfully</div>
    <div>> Waiting for player input...</div>
    <div>> HUD and field components loading...</div>
  `;

  log.appendChild(title);
  log.appendChild(messages);

  return log;
}

/**
 * Creates a fallback field component
 */
export function createFallbackField(): HTMLElement {
  const field = document.createElement('div');
  field.className = 'fallback-field';
  field.style.cssText = `
    background: linear-gradient(to bottom, #4a7c59 0%, #2d5a3d 100%);
    border: 4px solid #8b4513;
    border-radius: 12px;
    margin: 10px;
    height: 400px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  `;

  const fieldLines = document.createElement('div');
  fieldLines.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(90deg, transparent 49%, #ffffff 50%, #ffffff 51%, transparent 52%),
      linear-gradient(90deg, transparent 19%, #ffffff 20%, #ffffff 21%, transparent 22%),
      linear-gradient(90deg, transparent 79%, #ffffff 80%, #ffffff 81%, transparent 82%);
    background-size: 100% 100%, 100% 100%, 100% 100%;
    opacity: 0.3;
  `;

  const centerMessage = document.createElement('div');
  centerMessage.textContent = '🏟️ Football Field';
  centerMessage.style.cssText = `
    color: #ffffff;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    z-index: 1;
  `;

  const yardMarkers = document.createElement('div');
  yardMarkers.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    color: #ffffff;
    font-size: 14px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  `;
  yardMarkers.textContent = '25 30 35 40 45 50 45 40 35 30 25';

  field.appendChild(fieldLines);
  field.appendChild(centerMessage);
  field.appendChild(yardMarkers);

  return field;
}

/**
 * Creates a fallback hand/cards component
 */
export function createFallbackHand(): HTMLElement {
  const hand = document.createElement('div');
  hand.className = 'fallback-hand';
  hand.style.cssText = `
    display: flex;
    gap: 8px;
    padding: 16px;
    margin: 10px;
    background: #f8f9fa;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    overflow-x: auto;
    min-height: 120px;
  `;

  const title = document.createElement('div');
  title.textContent = '🃏 Player Hand';
  title.style.cssText = `
    color: #495057;
    font-weight: bold;
    margin-bottom: 12px;
    flex-shrink: 0;
  `;

  const cardsArea = document.createElement('div');
  cardsArea.style.cssText = `
    display: flex;
    gap: 8px;
    flex: 1;
  `;

  // Create placeholder cards
  for (let i = 0; i < 5; i++) {
    const card = document.createElement('div');
    card.style.cssText = `
      width: 80px;
      height: 112px;
      background: linear-gradient(135deg, #007bff, #0056b3);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      transition: transform 0.2s;
    `;
    card.textContent = `Card ${i + 1}`;
    card.title = 'Click to play card';
    cardsArea.appendChild(card);
  }

  hand.appendChild(title);
  hand.appendChild(cardsArea);

  return hand;
}

/**
 * Creates a fallback controls component
 */
export function createFallbackControls(): HTMLElement {
  const controls = document.createElement('div');
  controls.className = 'fallback-controls';
  controls.style.cssText = `
    display: flex;
    gap: 12px;
    padding: 16px;
    margin: 10px;
    background: #e9ecef;
    border: 2px solid #ced4da;
    border-radius: 8px;
    justify-content: center;
  `;

  const buttons = [
    { text: 'New Game', icon: '🎮' },
    { text: 'Settings', icon: '⚙️' },
    { text: 'Help', icon: '❓' },
    { text: 'Pause', icon: '⏸️' }
  ];

  buttons.forEach(buttonData => {
    const button = document.createElement('button');
    button.innerHTML = `${buttonData.icon} ${buttonData.text}`;
    button.style.cssText = `
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: background-color 0.2s;
    `;
    button.title = `${buttonData.text} - Feature temporarily unavailable`;
    button.disabled = true;
    button.style.opacity = '0.6';

    controls.appendChild(button);
  });

  return controls;
}

/**
 * Creates a fallback component for any UI module
 */
export function createGenericFallback(componentName: string, error?: Error): HTMLElement {
  const fallback = document.createElement('div');
  fallback.className = `fallback-${componentName.toLowerCase()}`;
  fallback.style.cssText = `
    padding: 20px;
    margin: 10px;
    border: 2px solid #ffc107;
    border-radius: 8px;
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    color: #856404;
    text-align: center;
    font-family: Arial, sans-serif;
  `;

  const icon = document.createElement('div');
  icon.textContent = '🔧';
  icon.style.fontSize = '48px';
  icon.style.marginBottom = '12px';

  const title = document.createElement('h3');
  title.textContent = `${componentName} Unavailable`;
  title.style.margin = '0 0 8px 0';
  title.style.color = '#856404';

  const message = document.createElement('p');
  message.textContent = error
    ? `The ${componentName} component encountered an error and couldn't load properly.`
    : `The ${componentName} component is temporarily unavailable.`;
  message.style.margin = '0 0 16px 0';

  const retryHint = document.createElement('p');
  retryHint.textContent = 'Please refresh the page or try again later.';
  retryHint.style.fontSize = '14px';
  retryHint.style.opacity = '0.8';
  retryHint.style.margin = '0';

  fallback.appendChild(icon);
  fallback.appendChild(title);
  fallback.appendChild(message);
  fallback.appendChild(retryHint);

  return fallback;
}

/**
 * Creates a loading spinner component
 */
export function createLoadingSpinner(message: string = 'Loading...'): HTMLElement {
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #6c757d;
    font-family: Arial, sans-serif;
  `;

  const spinnerElement = document.createElement('div');
  spinnerElement.style.cssText = `
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  `;

  const messageElement = document.createElement('div');
  messageElement.textContent = message;
  messageElement.style.fontSize = '16px';

  spinner.appendChild(spinnerElement);
  spinner.appendChild(messageElement);

  // Add CSS animation if not already present
  if (!document.getElementById('loading-spinner-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-spinner-styles';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  return spinner;
}
