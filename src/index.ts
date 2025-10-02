// Bootstrap: expose extracted modules for gradual integration
import * as Kickoff from './rules/special/Kickoff';
import * as Punt from './rules/special/Punt';
import * as PlaceKicking from './rules/special/PlaceKicking';
import * as ResultParsing from './rules/ResultParsing';
import * as Timekeeping from './rules/Timekeeping';
import * as Charts from './rules/Charts';
import * as LongGain from './rules/LongGain';
import * as PATDecision from './ai/PATDecision';
import * as CoachProfiles from './ai/CoachProfiles';
import { PlayerTendenciesMemory } from './ai/Playcall';
import { PlayCaller } from './ai/PlayCaller';
import { resolvePlayCore } from './rules/ResolvePlayCore';
import { resolvePlay, engineFactory } from './config/EngineSelector';
import type { ResolveInput as CoreResolveInput } from './rules/ResolvePlayCore';
import { EventBus } from './utils/EventBus';
import type { GameRuntime, TablesState } from './runtime/types';
import { GameFlow, type FlowEvent, type PlayInput } from './flow/GameFlow';
import { buildPolicy } from './ai/policy/NFL2025Policy';
import { createLCG } from './sim/RNG';
// import { validateOffensePlay, canAttemptFieldGoal } from './rules/PlayValidation';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS } from './data/decks';
import type { DeckName } from './data/decks';

let uiRegistered = false;
const bus = new EventBus();
let tables: TablesState = { offenseCharts: null, placeKicking: null, timeKeeping: null, longGain: null };
let progressiveEnhancement: any = null;
let isTestGame = false;

async function ensureUIRegistered(): Promise<void> {
  console.log('ensureUIRegistered called, uiRegistered:', uiRegistered);
  if (uiRegistered) return;

  console.log('Starting UI registration...');
  // Show initial loading state
  showInitialLoading();

  try {
    // Import error boundary and fallback components first (critical for error handling)
    const { ErrorBoundary } = await import('./ui/ErrorBoundary');
    const {
      createFallbackHUD,
      createFallbackLog,
      createFallbackField,
      createFallbackHand,
      createFallbackControls,
      createGenericFallback,
      createLoadingSpinner
    } = await import('./ui/fallbacks/FallbackComponents');

    // Register core UI components first (critical for basic functionality)
    await registerCoreUI(ErrorBoundary, createFallbackHUD, createFallbackLog, createFallbackField, createFallbackHand, createFallbackControls, createLoadingSpinner);

    // Register interactive UI components with lazy loading
    await registerInteractiveUI(ErrorBoundary, createFallbackHand, createFallbackControls, createGenericFallback);

    // Register optional UI components (non-critical features)
    await registerOptionalUI();

    // Initialize engine indicator
    const { registerEngineIndicator } = await import('./ui/EngineIndicator');
    registerEngineIndicator(bus);

    uiRegistered = true;
    hideLoadingSpinner();

    // Emit ready event for progressive enhancement
    (bus as any).emit('ui:ready', {});

  } catch (error) {
    console.error('Failed to register UI components:', error);
    // Import createLoadingSpinner for error fallback
    import('./ui/fallbacks/FallbackComponents').then(({ createLoadingSpinner }) => {
      showCriticalError(createLoadingSpinner);
    }).catch(() => {
      // Ultimate fallback - just show an alert
      if (typeof document !== 'undefined') {
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'Critical error - please refresh the page';
        errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:red;color:white;padding:20px;border-radius:8px;';
        document.body.appendChild(errorDiv);
      }
    });
  }
}

/**
 * Shows initial loading state while UI components are being registered
 */
function showInitialLoading(): void {
  if (typeof document === 'undefined') return;

  const loadingElement = document.createElement('div');
  loadingElement.id = 'initial-loading';
  loadingElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    color: white;
    font-family: Arial, sans-serif;
    flex-direction: column;
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 40px;
    height: 40px;
    border: 4px solid #333;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  `;

  const text = document.createElement('div');
  text.textContent = 'Loading Gridiron Strategy...';

  loadingElement.appendChild(spinner);
  loadingElement.appendChild(text);

  // Add CSS animation if not already present
  if (!document.getElementById('initial-loading-styles')) {
    const style = document.createElement('style');
    style.id = 'initial-loading-styles';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(loadingElement);
}

/**
 * Hides the initial loading spinner
 */
function hideLoadingSpinner(): void {
  if (typeof document === 'undefined') return;

  const loadingElement = document.getElementById('initial-loading');
  if (loadingElement) {
    loadingElement.remove();
  }
}

/**
 * Shows critical error fallback
 */
function showCriticalError(createLoadingSpinner: (message: string) => HTMLElement): void {
  if (typeof document === 'undefined') return;

  hideLoadingSpinner();
  const errorElement = createLoadingSpinner('Critical error - please refresh the page');
  document.body.appendChild(errorElement);
}

/**
 * Registers core UI components that are essential for basic functionality
 */
async function registerCoreUI(
  ErrorBoundary: any,
  createFallbackHUD: () => HTMLElement,
  createFallbackLog: () => HTMLElement,
  createFallbackField: () => HTMLElement,
  createFallbackHand: () => HTMLElement,
  createFallbackControls: () => HTMLElement,
  createLoadingSpinner: (message: string) => HTMLElement
): Promise<void> {
  // Core components loaded immediately for critical functionality
  const coreComponents = [
    { module: './ui/HUD', register: 'registerHUD', name: 'HUD', fallback: createFallbackHUD },
    { module: './ui/Log', register: 'registerLog', name: 'GameLog', fallback: createFallbackLog },
    { module: './ui/Field', register: 'registerField', name: 'GameField', fallback: createFallbackField },
    { module: './ui/Controls', register: 'registerControls', name: 'GameControls', fallback: createFallbackControls },
    { module: './ui/Hand', register: 'registerHand', name: 'PlayerHand', fallback: createFallbackHand }
  ];

  console.log('Starting core UI component registration...');
  for (const component of coreComponents) {
    console.log(`Loading ${component.name} component from ${component.module}...`);
    try {
      const module = await import(component.module);
      console.log(`${component.name} module loaded successfully`);

      // For critical core components, only use basic error handling
      // Don't use aggressive error boundaries that might hide real issues
      const originalRegister = module[component.register];
      // Avoid mutating ESM module namespace objects (read-only). Wrap and invoke safely instead.
      const safeRegister = (b: EventBus) => {
        try {
          console.log(`Calling ${component.name} register function...`);
          return originalRegister.call(module, b);
        } catch (error) {
          console.error(`${component.name} component registration failed:`, error);
          b.emit('log', { message: `${component.name} component failed to initialize` });
          return undefined;
        }
      };

      console.log(`Registering ${component.name}...`);
      safeRegister(bus);
      console.log(`${component.name} registered successfully`);
    } catch (error) {
      console.error(`${component.name} module failed to load:`, error);
      // For critical components, show a simple error message but don't use fallback UI
      // as that might mask the real issue
      if (typeof document !== 'undefined') {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          background: #ff4444;
          color: white;
          padding: 10px;
          border-radius: 4px;
          z-index: 9999;
          font-family: monospace;
          font-size: 12px;
        `;
        errorDiv.textContent = `${component.name} failed to load - check console`;
        document.body.appendChild(errorDiv);
      }
    }
  }
}

/**
 * Registers interactive UI components with lazy loading
 */
async function registerInteractiveUI(
  ErrorBoundary: any,
  createFallbackHand: () => HTMLElement,
  createFallbackControls: () => HTMLElement,
  createGenericFallback: (componentName: string, error?: Error) => HTMLElement
): Promise<void> {
  // Interactive components loaded when user interaction begins
  const interactiveComponents: Array<{
    module: string;
    register: string;
    name: string;
    fallback: () => HTMLElement;
  }> = [
    // No interactive components for now - all critical UI is in core
  ];

  // Use requestIdleCallback if available, otherwise setTimeout
  const scheduleWork = (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback, { timeout: 2000 });
    } else {
      setTimeout(callback, 100);
    }
  };

  for (const component of interactiveComponents) {
    scheduleWork(async () => {
      try {
        const module = await import(component.module);
        const boundary = new ErrorBoundary({
          componentName: component.name,
          fallbackComponent: (error: Error, retry: () => void) => component.fallback(),
          onError: (error: Error, info: any) => {
            console.error(`${component.name} component error:`, error);
            bus.emit('log', { message: `${component.name} component failed - using fallback display` });
          }
        });

        const originalRegister = module[component.register];
        // Wrap call without mutating the module namespace
        const safeRegister = (b: EventBus) => {
          try {
            return originalRegister.call(module, b);
          } catch (error) {
            boundary.handleError(error as Error);
            return undefined;
          }
        };

        safeRegister(bus);
      } catch (error) {
        console.warn(`${component.name} module failed to load:`, error);
        const element = component.fallback();
        if (typeof document !== 'undefined') {
          const container = document.getElementById(component.name.toLowerCase()) || document.createElement('div');
          container.id = component.name.toLowerCase();
          container.appendChild(element);
          document.body.appendChild(container);
        }
      }
    });
  }
}

/**
 * Registers optional UI components (non-critical features)
 */
async function registerOptionalUI(): Promise<void> {
  // Optional components loaded asynchronously with lower priority
  const optionalComponents = [
    './ui/DevMode',
    './ui/SpecialTeamsUI',
    './ui/PenaltyUI',
    './ui/VFX',
    './ui/SFX',
    './qa/Harness',
    // Dice UI components (button-based card system for 2d20 dice engine)
    './ui/dice/DiceUI',
    './ui/dice/CardSelector',
    './ui/dice/PenaltyModal',
    './ui/dice/ResultDisplay',
    './ui/dice/integration',
    // Programmatic card renderer system (SVG-based cards with visual indicators)
    './ui/cards/ProgressiveCardSystem',
    './ui/cards/CardRenderer',
    './ui/cards/CardDefinitions',
    './ui/cards/RiskIndicator',
    './ui/cards/PerimeterBadge'
  ];

  // Load optional components in background
  optionalComponents.forEach(async (modulePath) => {
    try {
      const module = await import(modulePath);
      const base = (modulePath.split('/').pop() as string) || '';
      const preferred = `register${base}`;
      let registerFn: any = (module as any)[preferred];
      if (typeof registerFn !== 'function') {
        const candidates: string[] = Object.keys(module).filter((k) => k.startsWith('register') && typeof (module as any)[k] === 'function');
        let only: string | null = null;
        if (candidates.length === 1) {
          only = candidates[0] as string;
        }
        if (only) {
          registerFn = (module as any)[only];
        }
      }
      if (typeof registerFn === 'function') {
        registerFn(bus);
      }
    } catch (error) {
      console.warn(`${modulePath} component failed to load:`, error);
    }
  });
}

/**
 * Initializes progressive enhancement features
 */
async function initializeProgressiveEnhancement(): Promise<void> {
  try {
    const { ProgressiveEnhancement } = await import('./ui/progressive/ProgressiveEnhancement');
    progressiveEnhancement = new ProgressiveEnhancement(bus, {
      enableWebGL: true,
      enableWebAudio: true,
      enableOfflineSupport: true,
      enableAdvancedAnimations: true,
      enablePerformanceMonitoring: true
    });

    // Listen for feature detection results
    (bus as any).on('features:detected', ({ features }: any) => {
      console.log('Browser features detected:', features);

      // Log enhancement status to game log
      if (features.webgl) {
        bus.emit('log', { message: 'Enhanced graphics enabled' });
      }
      if (features.webAudio) {
        bus.emit('log', { message: 'Enhanced audio enabled' });
      }
      if (features.serviceWorker) {
        bus.emit('log', { message: 'Offline support available' });
      }
    });

    // Listen for performance metrics
    (bus as any).on('performance:loadTime', ({ loadTime }: any) => {
      console.log(`UI loaded in ${Math.round(loadTime)}ms`);
      bus.emit('log', { message: `UI loaded in ${Math.round(loadTime)}ms` });
    });

    (bus as any).on('performance:fps', ({ fps }: any) => {
      if (fps < 30) {
        console.warn(`Low frame rate detected: ${fps}fps`);
        bus.emit('log', { message: `Performance: ${fps}fps` });
      }
    });

  } catch (error) {
    console.warn('Progressive enhancement failed to initialize:', error);
    // Continue without progressive enhancement - basic functionality still works
  }
}

async function preloadTables(): Promise<void> {
  try {
    const loaders = await import('./data/loaders/tables');
    const [oc, pk, tk, lg] = await Promise.all([
      loaders.fetchOffenseCharts(),
      loaders.fetchPlaceKicking(),
      loaders.fetchTimeKeeping(),
      loaders.fetchLongGain(),
    ]);
    tables = {
      offenseCharts: oc.ok ? oc.data : null,
      placeKicking: pk.ok ? pk.data : null,
      timeKeeping: tk.ok ? tk.data : null,
      longGain: lg.ok ? lg.data : null,
    };
    const summary = `Loaded offense charts ${oc.ok ? '✓' : `✕ (${oc.error.code})`}, place-kicking ${pk.ok ? '✓' : `✕ (${pk.error.code})`}, timekeeping ${tk.ok ? '✓' : `✕ (${tk.error.code})`}, long-gain ${lg.ok ? '✓' : `✕ (${lg.error.code})`}`;
    bus.emit('log', { message: summary });
  } catch {
    tables = { offenseCharts: null, placeKicking: null, timeKeeping: null, longGain: null };
  }
  if (typeof window !== 'undefined' && window.GS) {
    window.GS.tables = tables;
  }
}

function setTheme(theme: string): void {
  if (typeof document === 'undefined') return;
  (document.body as any).dataset.theme = theme;
}

// Bridge UI theme change events to body dataset
bus.on('ui:themeChanged', ({ theme }: any) => {
  try { setTheme(theme); }
  catch (error) {
    console.error('Failed to apply theme:', error);
  }
});

// Track when a QA test game is running so we can enrich logs in dev mode
try {
  (bus as any).on && (bus as any).on('qa:startTestGame', () => { isTestGame = true; });
} catch (error) {
  console.warn('Unable to wire qa:startTestGame listener:', error);
}

function isDevModeOn(): boolean {
  try { if (typeof localStorage !== 'undefined') return localStorage.getItem('gs_dev_mode') === '1'; }
  catch (error) { /* non-fatal */ }
  try { return !!(globalThis as any).GS?.__devMode?.enabled; }
  catch (error) { /* non-fatal */ }
  return false;
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mPart = Math.floor(s / 60);
  const sPart = (s % 60).toString().padStart(2, '0');
  return `${mPart}:${sPart}`;
}

function buildPlayPrefix(state: import('./domain/GameState').GameState, offLabel: string, defLabel: string): string {
  const downNames = ['1st', '2nd', '3rd', '4th'];
  const downIdx = Math.min(state.down, 4) - 1;
  const downStr = downNames[downIdx] || `${state.down}th`;
  const toGoLabel = (() => {
    const firstDownAbs = state.possession === 'player' ? (state.ballOn + state.toGo) : (state.ballOn - state.toGo);
    const isG2G = state.possession === 'player' ? (firstDownAbs >= 100) : (firstDownAbs <= 0);
    return isG2G ? 'Goal' : String(state.toGo);
  })();
  const ballSpot = state.ballOn <= 50 ? state.ballOn : 100 - state.ballOn;
  const possLabel = state.possession === 'player' ? 'HOME' : 'AWAY';
  return `Q${state.quarter} | ${formatClock(state.clock)} | ${downStr} & ${toGoLabel} | Ball on ${Math.round(ballSpot)} | ${possLabel} (possession) | ${offLabel} | ${defLabel}`;
}

async function start(options?: { theme?: 'arcade'|'minimalist'|'retro'|'board'|'vintage'|'modern' }): Promise<void> {
  if (typeof window === 'undefined') return;

  // Initialize progressive enhancement first
  await initializeProgressiveEnhancement();

  await ensureUIRegistered();
  if (options && options.theme) setTheme(options.theme);
  await preloadTables();
  // Emit a baseline HUD update so UI is not blank in smoke tests
  bus.emit('hudUpdate', {
    quarter: 1,
    clock: 15 * 60,
    down: 1,
    toGo: 10,
    ballOn: 25,
    possession: 'player',
    score: { player: 0, ai: 0 },
  } as any);

  // Hook up New Game UI event to start a playable flow
  try {
    bus.on('ui:newGame', async ({ deckName, opponentName }: any) => {
      try {
        if (!tables.offenseCharts) {
          bus.emit('log', { message: 'Data tables not loaded yet.' });
          return;
        }
        const seed = Date.now() % 1e9;
        const rng = createLCG(seed);
        const flow = new GameFlow({ charts: tables.offenseCharts, rng, timeKeeping: tables.timeKeeping || {
          gain0to20: 30,
          gain20plus: 45,
          loss: 30,
          outOfBounds: 15,
          incomplete: 15,
          interception: 30,
          penalty: 15,
          fumble: 15,
          kickoff: 15,
          fieldgoal: 15,
          punt: 15,
          extraPoint: 0,
        }, policy: {
          chooseTempo: ({ quarter, clock, diff, side }) => {
            try { return buildPolicy().chooseTempo({
              quarter,
              time_remaining_sec: clock,
              half: quarter <= 2 ? 1 : 2,
              score_diff: diff,
              down: 1,
              distance_to_go_yd: 10,
              yardline_100: 25,
              has_two_minute_warning: (quarter === 2 || quarter === 4) && clock > 120,
              team_archetype: 'Pro',
              home_or_road: side === 'player' ? 'home' : 'road',
              underdog: false,
              possession_after_score_pref: 'normal',
            }).tempo as any; } catch { return 'normal'; }
          },
        } });
        // Pick player deck from selection with fallback
        const validDeck = (name: any): DeckName => (name === 'Pro Style' || name === 'Ball Control' || name === 'Aerial Style') ? name : 'Pro Style';
        const playerDeck = validDeck(deckName);
        // Map opponent to an AI deck style
        let aiDeck: DeckName = 'Pro Style';
        if (opponentName === 'Andy Reid') aiDeck = 'Aerial Style';
        else if (opponentName === 'Bill Belichick') aiDeck = 'Ball Control';
        else if (opponentName === 'John Madden') aiDeck = 'Pro Style';

        // Initial state at kickoff
        const initial: import('./domain/GameState').GameState = {
          seed,
          quarter: 1,
          clock: 15 * 60,
          down: 1,
          toGo: 10,
          ballOn: 25,
          possession: 'ai', // AI kicks to Player by default
          awaitingPAT: false,
          gameOver: false,
          score: { player: 0, ai: 0 },
        } as const;

        // Kickoff from AI to Player to start game
        const ko = flow.performKickoff(initial, 'normal', 'ai');
        const stateAfterKO = ko.state as any;
        // Announce new game and push kickoff events now (translate declared below)
        bus.emit('log', { message: `New game started — You: ${playerDeck} vs ${String(opponentName || 'AI')} (seed=${seed})` });

        // Emit HUD from kickoff result (already included in events, but ensure baseline)
        bus.emit('hudUpdate', {
          quarter: stateAfterKO.quarter,
          clock: stateAfterKO.clock,
          down: stateAfterKO.down,
          toGo: stateAfterKO.toGo,
          ballOn: stateAfterKO.ballOn,
          possession: stateAfterKO.possession,
          score: stateAfterKO.score,
        } as any);

        // Deal hand immediately based on possession after kickoff
        if (stateAfterKO.possession === 'player') {
          const deck = OFFENSE_DECKS[playerDeck] || [];
          const cardsToRender = deck.map((c) => ({ id: c.id, label: c.label, art: c.art, type: c.type }));
          bus.emit('handUpdate', { cards: cardsToRender, isPlayerOffense: true } as any);
        } else {
          const defCards = DEFENSE_DECK.map((d) => ({ id: (d as any).id, label: (d as any).label, art: `assets/cards/Defense/${(d as any).label}.jpg`, type: 'defense' }));
          bus.emit('handUpdate', { cards: defCards, isPlayerOffense: false } as any);
        }

        // Store minimal runtime pointers for potential future interactions
        (window as any).GS_RUNTIME = { flow, playerDeck, aiDeck, state: stateAfterKO, seed };

        // Per-game player tendencies memory for adaptive AI defense
        const tendencies = new PlayerTendenciesMemory();

        // Helper: translate flow events into UI bus
        const translate = (events: FlowEvent[]) => {
          for (const ev of events) {
            if (ev.type === 'hud') bus.emit('hudUpdate', ev.payload as any);
            else if (ev.type === 'log') {
              // Prefix log lines with play context during dev test games
              const dev = isDevModeOn();
              if (dev && isTestGame) {
                try {
                  const rt: any = (window as any).GS_RUNTIME || {};
                  const lastOff = (rt as any).__lastOffLabel || '';
                  const lastDef = (rt as any).__lastDefLabel || '';
                  const st = rt.state as any;
                  if (st && lastOff && lastDef) {
                    const pref = buildPlayPrefix(st, lastOff, lastDef);
                    bus.emit('log', { message: `${pref} — ${ev.message}` });
                    continue;
                  }
                } catch (error) {
                  console.debug('Failed to build dev prefix', error);
                }
              }
              bus.emit('log', { message: ev.message });
            }
            else if (ev.type === 'vfx') bus.emit('vfx', { type: ev.payload.kind, payload: ev.payload.data });
            else if (ev.type === 'final') bus.emit('log', { message: `Final — HOME ${ev.payload.score.player} — AWAY ${ev.payload.score.ai}` });
            else if (ev.type === 'halftime') bus.emit('log', { message: 'Halftime' });
            else if (ev.type === 'endOfQuarter') bus.emit('log', { message: `End of Q${ev.payload.quarter}` });
            else if (ev.type === 'score') bus.emit('log', { message: `Score: ${ev.payload.kind}` });
          }
        };

        // Emit kickoff events now that translator is ready
        try { translate(ko.events as any); }
        catch (error) { console.debug('Kickoff event translation failed', error); }

        // Prepare new PlayCaller instances for human vs AI flow
        const deps = {
          charts: tables.offenseCharts!,
          getOffenseHand: () => {
            const deck = OFFENSE_DECKS[playerDeck] || [];
            return deck.map((c: any) => ({ id: c.id, label: c.label, type: c.type } as any));
          },
          getDefenseOptions: () => DEFENSE_DECK.map(d => d.label) as any,
          getWhiteSignRestriction: (label: string) => (WHITE_SIGN_RESTRICTIONS as any)[label] ?? null,
        } as const;
        const pcPlayer = new PlayCaller(deps as any, true);
        const pcAI = new PlayCaller(deps as any, true);
        try { await pcPlayer.loadPersonality(); await pcAI.loadPersonality(); }
        catch (error) { console.warn('PlayCaller personality load failed', error); }
        pcPlayer.reset(seed);
        pcAI.reset(seed + 1);

        // Keep the hand UI in sync with possession by re-emitting handUpdate on HUD changes
        // When AI has the ball, present defense calls for the human to choose
        bus.on('hudUpdate', ({ possession }) => {
          try {
            const rt: any = (window as any).GS_RUNTIME || {};
            if (possession === 'player') {
              const deckDef = OFFENSE_DECKS[rt.playerDeck as DeckName] || [];
              const cards = deckDef.map((c: any) => ({ id: c.id, label: c.label, art: c.art, type: c.type }));
              bus.emit('handUpdate', { cards, isPlayerOffense: true } as any);
            } else {
              const defCards = DEFENSE_DECK.map((d) => ({ id: (d as any).id, label: (d as any).label, art: `assets/cards/Defense/${(d as any).label}.jpg`, type: 'defense' }));
              bus.emit('handUpdate', { cards: defCards, isPlayerOffense: false } as any);
            }
          } catch (error) { console.debug('HUD sync failed', error); }
        });

        // Listen for player selection; if player has ball, it's an offense play; if AI has ball, selection is defense
        bus.on('ui:playCard', async ({ cardId }: { cardId: string }) => {
          try {
            const rt: any = (window as any).GS_RUNTIME || {};
            const currentState = rt.state;
            if (!currentState || currentState.gameOver) return;

            // Initialize engine factory if not already done
            await engineFactory.initialize();

            if (currentState.possession === 'player') {
              // Player offense: look up offense card from player's deck
              const playerDeckDef = OFFENSE_DECKS[rt.playerDeck as DeckName] || [];
              const card = playerDeckDef.find((c: any) => c.id === cardId);
              if (!card) return;
              const defPicked = pcAI.choose_defense_play(currentState);

              // Use the new engine system for play resolution
              const before = { ...currentState };
              try {
                const defenseCard = DEFENSE_DECK.find(d => (d as any).label === defPicked.label);
                const engineResult = await resolvePlay(card.id, defenseCard?.id || defPicked.label, currentState, createLCG(currentState.seed));

                // Convert engine result back to flow events (simplified for now)
                // TODO: Implement proper event translation from engine result
                bus.emit('log', { message: `Play resolved: ${engineResult.yards > 0 ? 'Gain' : engineResult.yards < 0 ? 'Loss' : 'No gain'} of ${Math.abs(engineResult.yards)} yards` });

                if (engineResult.turnover && typeof engineResult.turnover !== 'boolean') {
                  const t = engineResult.turnover;
                  bus.emit('log', { message: `${t.type}${typeof t.return_yards === 'number' ? ` - ${t.return_yards} yard return` : ''}` });
                }

                // Update game state based on result (simplified)
                const newState = { ...currentState };
                if (engineResult.yards !== 0) {
                  newState.ballOn = Math.max(0, Math.min(100, newState.ballOn + (newState.possession === 'player' ? engineResult.yards : -engineResult.yards)));
                }

                try { (window as any).GS_RUNTIME.__lastOffLabel = card.label; (window as any).GS_RUNTIME.__lastDefLabel = defPicked.label; }
                catch (error) { /* ignore telemetry bookkeeping errors */ }
                (window as any).GS_RUNTIME.state = newState as any;

                // TODO: Update tendencies and AI observations based on engine result
                try {
                  const playType: 'run'|'pass' = (/pass/i.test(card.label) ? 'pass' : 'run');
                  tendencies.record('player', playType, {
                    down: before.down,
                    toGo: before.toGo,
                    ballOnFromHome: before.ballOn,
                    playerIsHome: true,
                    possessing: before.possession,
                  });
                } catch (error) { console.debug('Tendency record failed', error); }
              } catch (error) {
                console.warn('Engine resolution failed, falling back to deterministic:', error);
                // Fallback to original system
                const input: PlayInput = { deckName: rt.playerDeck, playLabel: card.label, defenseLabel: defPicked.label } as any;
                const res = flow.resolveSnap(currentState, input);
                translate(res.events);
                (window as any).GS_RUNTIME.state = res.state as any;
              }
            } else {
              // AI offense: player's click selects a defense; AI picks offense via PlayCaller
              const defCard = DEFENSE_DECK.find((d) => (d as any).id === cardId);
              if (!defCard) return;
              const offPicked = pcAI.choose_offense_play(currentState, rt.aiDeck as DeckName);

              // Use the new engine system for play resolution
              const before = { ...currentState };
              try {
                const engineResult = await resolvePlay(offPicked.playLabel, defCard.id, currentState, createLCG(currentState.seed));

                // Convert engine result back to flow events (simplified for now)
                // TODO: Implement proper event translation from engine result
                bus.emit('log', { message: `AI Play resolved: ${engineResult.yards > 0 ? 'Gain' : engineResult.yards < 0 ? 'Loss' : 'No gain'} of ${Math.abs(engineResult.yards)} yards` });

                if (engineResult.turnover && typeof engineResult.turnover !== 'boolean') {
                  const t = engineResult.turnover;
                  bus.emit('log', { message: `AI ${t.type}${typeof t.return_yards === 'number' ? ` - ${t.return_yards} yard return` : ''}` });
                }

                // Update game state based on result (simplified)
                const newState = { ...currentState };
                if (engineResult.yards !== 0) {
                  newState.ballOn = Math.max(0, Math.min(100, newState.ballOn + (newState.possession === 'player' ? engineResult.yards : -engineResult.yards)));
                }

                try { (window as any).GS_RUNTIME.__lastOffLabel = offPicked.playLabel; (window as any).GS_RUNTIME.__lastDefLabel = (defCard as any).label; }
                catch (error) { /* ignore telemetry bookkeeping errors */ }
                (window as any).GS_RUNTIME.state = newState as any;

                // TODO: Update tendencies and AI observations based on engine result
              } catch (error) {
                console.warn('Engine resolution failed, falling back to deterministic:', error);
                // Fallback to original system
                const input: PlayInput = { deckName: rt.aiDeck, playLabel: offPicked.playLabel, defenseLabel: (defCard as any).label } as any;
                const res = flow.resolveSnap(currentState, input);
                translate(res.events);
                (window as any).GS_RUNTIME.state = res.state as any;
              }
            }
          } catch (err) {
            try { bus.emit('log', { message: `Play selection failed: ${String((err as any)?.message || err)}` }); }
            catch { /* ignore logging failure */ }
          }
        });
      } catch (err) {
        bus.emit('log', { message: `Failed to start new game: ${(err as Error)?.message || err}` });
      }
    });
  } catch (error) { console.warn('Failed to register ui:newGame handler', error); }
}

function dispose(): void {
  // No timers yet; leave bus listeners intact for now. Future timers/intervals cleared here.
}

const runtime: GameRuntime = {
  bus,
  rules: { Kickoff, Punt, PlaceKicking, ResultParsing, Timekeeping, Charts, LongGain },
  ai: { PATDecision, CoachProfiles },
  tables,
  start,
  dispose,
  setTheme,
  runtime: {
    resolvePlayAdapter: (params: {
      state: CoreResolveInput['state'];
      charts: CoreResolveInput['charts'];
      deckName: CoreResolveInput['deckName'];
      playLabel: CoreResolveInput['playLabel'];
      defenseLabel: CoreResolveInput['defenseLabel'];
      rng: CoreResolveInput['rng'];
      ui?: { inTwoMinute?: boolean };
    }) => {
      const res = resolvePlayCore({
        state: params.state,
        charts: params.charts,
        deckName: params.deckName,
        playLabel: params.playLabel,
        defenseLabel: params.defenseLabel,
        rng: params.rng,
      });
      const nextState = {
        ...res.state,
        clock: (params as any).state.clock,
        score: { ...(params as any).state.score },
        awaitingPAT: (params as any).state.awaitingPAT,
        gameOver: (params as any).state.gameOver,
      } as any;
      const events: Array<{ type: string; data?: any }> = [];
      if ((res as any).possessionChanged) events.push({ type: 'possessionChanged' });
      if ((res as any).touchdown) events.push({ type: 'touchdown' });
      if ((res as any).safety) events.push({ type: 'safety' });
      return { nextState, outcome: (res as any).outcome, events } as any;
    },
    // Expose createFlow for tests (typed as any in GameRuntime to avoid leaking internals)
    createFlow: (seed?: number) => {
      const rng = createLCG(seed ?? 12345);
      if (!tables.offenseCharts) throw new Error('Offense charts not loaded');
      const flow = new GameFlow({ charts: tables.offenseCharts, rng, timeKeeping: tables.timeKeeping || {
        gain0to20: 30,
        gain20plus: 45,
        loss: 30,
        outOfBounds: 15,
        incomplete: 15,
        interception: 30,
        penalty: 15,
        fumble: 15,
        kickoff: 15,
        fieldgoal: 15,
        punt: 15,
        extraPoint: 0,
      }, policy: {
        chooseTempo: ({ quarter, clock, diff, side }) => {
          try { return buildPolicy().chooseTempo({
            quarter,
            time_remaining_sec: clock,
            half: quarter <= 2 ? 1 : 2,
            score_diff: diff,
            down: 1,
            distance_to_go_yd: 10,
            yardline_100: 25,
            has_two_minute_warning: (quarter === 2 || quarter === 4) && clock > 120,
            team_archetype: 'Pro',
            home_or_road: side === 'player' ? 'home' : 'road',
            underdog: false,
            possession_after_score_pref: 'normal',
          }).tempo as any; } catch { return 'normal'; }
        },
      } });
      let flowState: import('./domain/GameState').GameState | null = null;
      let pendingPenalty: { accepted: import('./domain/GameState').GameState; declined: import('./domain/GameState').GameState; meta: any } | null = null;
      const translate = (events: FlowEvent[]) => {
        for (const ev of events) {
          if (ev.type === 'hud') bus.emit('hudUpdate', ev.payload as any);
          else if (ev.type === 'log') {
            bus.emit('log', { message: ev.message });
            if (/Field goal missed/i.test(ev.message)) {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'NO GOOD' });
              (bus as any).emit && (bus as any).emit('sfx:crowd', { kind: 'groan' });
            }
          }
          else if (ev.type === 'vfx') {
            const kind = ev.payload.kind;
            if (kind === 'td') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'TOUCHDOWN!', gold: true });
              (bus as any).emit && (bus as any).emit('vfx:flash', {});
              (bus as any).emit && (bus as any).emit('sfx:crowd', { kind: 'cheer' });
            } else if (kind === 'interception') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'INTERCEPTION!' });
              (bus as any).emit && (bus as any).emit('vfx:shake', { selector: 'body' });
              (bus as any).emit && (bus as any).emit('sfx:hit', {});
            } else if (kind === 'twoMinute') {
              (bus as any).emit && (bus as any).emit('vfx:flash', {});
            }
            bus.emit('vfx', { type: kind, payload: ev.payload.data });
          }
          else if (ev.type === 'choice-required') {
            (bus as any).emit('flow:choiceRequired', { choice: ev.choice, data: ev.data });
            if (ev.choice === 'penaltyAcceptDecline') {
              const d: any = ev.data || {};
              pendingPenalty = { accepted: d.accepted, declined: d.declined, meta: d.meta };
            }
          }
          else if (ev.type === 'final') bus.emit('log', { message: `Final — HOME ${ev.payload.score.player} — AWAY ${ev.payload.score.ai}` });
          else if (ev.type === 'halftime') bus.emit('log', { message: 'Halftime' });
          else if (ev.type === 'endOfQuarter') bus.emit('log', { message: `End of Q${ev.payload.quarter}` });
          else if (ev.type === 'score') {
            bus.emit('log', { message: `Score: ${ev.payload.kind}` });
            (bus as any).emit && (bus as any).emit('vfx:scorePop', {});
            if (ev.payload.kind === 'FG') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'FIELD GOAL!' });
              (bus as any).emit && (bus as any).emit('sfx:beep', { freq: 880, type: 'triangle' });
            } else if (ev.payload.kind === 'Safety') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'SAFETY!', gold: true });
              (bus as any).emit && (bus as any).emit('sfx:beep', { freq: 220, type: 'square' });
            } else if (ev.payload.kind === 'TD') {
              (bus as any).emit && (bus as any).emit('vfx:banner', { text: 'TOUCHDOWN!', gold: true });
              (bus as any).emit && (bus as any).emit('sfx:crowd', { kind: 'cheer' });
            }
          }
        }
      };
      (bus as any).on && (bus as any).on('ui:choice.penalty', (p: { decision: 'accept'|'decline' }) => {
        if (!pendingPenalty) return;
        const ctx = pendingPenalty;
        const chosen = p.decision === 'accept' ? ctx.accepted : ctx.declined;
        const fin = (flow as any).finalizePenaltyDecision(chosen, p.decision, ctx.meta);
        flowState = fin.state as any;
        translate(fin.events);
        pendingPenalty = null;
      });
      return {
        resolveSnap: (state: import('./domain/GameState').GameState, input: PlayInput) => {
          const res = flow.resolveSnap(state, input);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        applyPenaltyDecision: (state: import('./domain/GameState').GameState, decision: 'accept'|'decline', context: { accepted: import('./domain/GameState').GameState; declined: import('./domain/GameState').GameState; meta: any }) => {
          const chosen = decision === 'accept' ? context.accepted : context.declined;
          const fin = (flow as any).finalizePenaltyDecision(chosen, decision, context.meta);
          translate(fin.events);
          flowState = fin.state as any;
          return fin;
        },
        resolvePATAndRestart: (state: import('./domain/GameState').GameState, side: 'player'|'ai') => {
          const res = flow.resolvePATAndRestart(state, side);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        attemptFieldGoal: (state: import('./domain/GameState').GameState, attemptYards: number, side: 'player'|'ai') => {
          const res = flow.attemptFieldGoal(state, attemptYards, side);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        resolveSafetyRestart: (state: import('./domain/GameState').GameState, conceding: 'player'|'ai') => {
          const res = flow.resolveSafetyRestart(state, conceding);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        performKickoff: (state: import('./domain/GameState').GameState, type: 'normal'|'onside', kicking: 'player'|'ai') => {
          const res = flow.performKickoff(state, type, kicking);
          translate(res.events);
          flowState = res.state as any;
          return res;
        },
        inner: flow,
      } as any;
    },
  },
};

declare global {
  interface Window { GS?: GameRuntime }
}

if (typeof window !== 'undefined' && !window.GS) {
  window.GS = runtime;
}

// Ensure no legacy bridge remains; runtime boots purely via TS modules.


// Auto-start the runtime once the DOM is ready so UI registers and field chrome renders.
// Idempotent: start() guards on a local flag.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try { void runtime.start(); } catch (error) { console.error('Runtime start failed', error); }
    }, { once: true });
  } else {
    try { void runtime.start(); } catch (error) { console.error('Runtime start failed', error); }
  }
}
