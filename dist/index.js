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
import { EventBus } from './utils/EventBus';
import { GameFlow } from './flow/GameFlow';
import { buildPolicy } from './ai/policy/NFL2025Policy';
import { createLCG } from './sim/RNG';
// import { validateOffensePlay, canAttemptFieldGoal } from './rules/PlayValidation';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS } from './data/decks';
let uiRegistered = false;
const bus = new EventBus();
let tables = { offenseCharts: null, placeKicking: null, timeKeeping: null, longGain: null };
let progressiveEnhancement = null;
let isTestGame = false;
async function ensureUIRegistered() {
    console.log('ensureUIRegistered called, uiRegistered:', uiRegistered);
    if (uiRegistered)
        return;
    console.log('Starting UI registration...');
    // Show initial loading state
    showInitialLoading();
    try {
        // Import error boundary and fallback components first (critical for error handling)
        const { ErrorBoundary } = await import('./ui/ErrorBoundary');
        const { createFallbackHUD, createFallbackLog, createFallbackField, createFallbackHand, createFallbackControls, createGenericFallback, createLoadingSpinner } = await import('./ui/fallbacks/FallbackComponents');
        // Register core UI components first (critical for basic functionality)
        await registerCoreUI(ErrorBoundary, createFallbackHUD, createFallbackLog, createFallbackField, createFallbackHand, createFallbackControls, createLoadingSpinner);
        // Register interactive UI components with lazy loading
        await registerInteractiveUI(ErrorBoundary, createFallbackHand, createFallbackControls, createGenericFallback);
        // Register optional UI components (non-critical features)
        await registerOptionalUI();
        uiRegistered = true;
        hideLoadingSpinner();
        // Emit ready event for progressive enhancement
        bus.emit('ui:ready', {});
    }
    catch (error) {
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
function showInitialLoading() {
    if (typeof document === 'undefined')
        return;
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
function hideLoadingSpinner() {
    if (typeof document === 'undefined')
        return;
    const loadingElement = document.getElementById('initial-loading');
    if (loadingElement) {
        loadingElement.remove();
    }
}
/**
 * Shows critical error fallback
 */
function showCriticalError(createLoadingSpinner) {
    if (typeof document === 'undefined')
        return;
    hideLoadingSpinner();
    const errorElement = createLoadingSpinner('Critical error - please refresh the page');
    document.body.appendChild(errorElement);
}
/**
 * Registers core UI components that are essential for basic functionality
 */
async function registerCoreUI(ErrorBoundary, createFallbackHUD, createFallbackLog, createFallbackField, createFallbackHand, createFallbackControls, createLoadingSpinner) {
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
            const safeRegister = (b) => {
                try {
                    console.log(`Calling ${component.name} register function...`);
                    return originalRegister.call(module, b);
                }
                catch (error) {
                    console.error(`${component.name} component registration failed:`, error);
                    b.emit('log', { message: `${component.name} component failed to initialize` });
                    return undefined;
                }
            };
            console.log(`Registering ${component.name}...`);
            safeRegister(bus);
            console.log(`${component.name} registered successfully`);
        }
        catch (error) {
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
async function registerInteractiveUI(ErrorBoundary, createFallbackHand, createFallbackControls, createGenericFallback) {
    // Interactive components loaded when user interaction begins
    const interactiveComponents = [
    // No interactive components for now - all critical UI is in core
    ];
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleWork = (callback) => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout: 2000 });
        }
        else {
            setTimeout(callback, 100);
        }
    };
    for (const component of interactiveComponents) {
        scheduleWork(async () => {
            try {
                const module = await import(component.module);
                const boundary = new ErrorBoundary({
                    componentName: component.name,
                    fallbackComponent: (error, retry) => component.fallback(),
                    onError: (error, info) => {
                        console.error(`${component.name} component error:`, error);
                        bus.emit('log', { message: `${component.name} component failed - using fallback display` });
                    }
                });
                const originalRegister = module[component.register];
                // Wrap call without mutating the module namespace
                const safeRegister = (b) => {
                    try {
                        return originalRegister.call(module, b);
                    }
                    catch (error) {
                        boundary.handleError(error);
                        return undefined;
                    }
                };
                safeRegister(bus);
            }
            catch (error) {
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
async function registerOptionalUI() {
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
            const base = modulePath.split('/').pop() || '';
            const preferred = `register${base}`;
            let registerFn = module[preferred];
            if (typeof registerFn !== 'function') {
                const candidates = Object.keys(module).filter((k) => k.startsWith('register') && typeof module[k] === 'function');
                let only = null;
                if (candidates.length === 1) {
                    only = candidates[0];
                }
                if (only) {
                    registerFn = module[only];
                }
            }
            if (typeof registerFn === 'function') {
                registerFn(bus);
            }
        }
        catch (error) {
            console.warn(`${modulePath} component failed to load:`, error);
        }
    });
}
/**
 * Initializes progressive enhancement features
 */
async function initializeProgressiveEnhancement() {
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
        bus.on('features:detected', ({ features }) => {
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
        bus.on('performance:loadTime', ({ loadTime }) => {
            console.log(`UI loaded in ${Math.round(loadTime)}ms`);
            bus.emit('log', { message: `UI loaded in ${Math.round(loadTime)}ms` });
        });
        bus.on('performance:fps', ({ fps }) => {
            if (fps < 30) {
                console.warn(`Low frame rate detected: ${fps}fps`);
                bus.emit('log', { message: `Performance: ${fps}fps` });
            }
        });
    }
    catch (error) {
        console.warn('Progressive enhancement failed to initialize:', error);
        // Continue without progressive enhancement - basic functionality still works
    }
}
async function preloadTables() {
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
    }
    catch {
        tables = { offenseCharts: null, placeKicking: null, timeKeeping: null, longGain: null };
    }
    if (typeof window !== 'undefined' && window.GS) {
        window.GS.tables = tables;
    }
}
function setTheme(theme) {
    if (typeof document === 'undefined')
        return;
    document.body.dataset.theme = theme;
}
// Bridge UI theme change events to body dataset
bus.on('ui:themeChanged', ({ theme }) => {
    try {
        setTheme(theme);
    }
    catch { }
});
// Track when a QA test game is running so we can enrich logs in dev mode
try {
    bus.on && bus.on('qa:startTestGame', () => { isTestGame = true; });
}
catch { }
function isDevModeOn() {
    try {
        if (typeof localStorage !== 'undefined')
            return localStorage.getItem('gs_dev_mode') === '1';
    }
    catch { }
    try {
        return !!globalThis.GS?.__devMode?.enabled;
    }
    catch { }
    return false;
}
function formatClock(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const mPart = Math.floor(s / 60);
    const sPart = (s % 60).toString().padStart(2, '0');
    return `${mPart}:${sPart}`;
}
function buildPlayPrefix(state, offLabel, defLabel) {
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
async function start(options) {
    if (typeof window === 'undefined')
        return;
    // Initialize progressive enhancement first
    await initializeProgressiveEnhancement();
    await ensureUIRegistered();
    if (options && options.theme)
        setTheme(options.theme);
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
    });
    // Hook up New Game UI event to start a playable flow
    try {
        bus.on('ui:newGame', async ({ deckName, opponentName }) => {
            try {
                if (!tables.offenseCharts) {
                    bus.emit('log', { message: 'Data tables not loaded yet.' });
                    return;
                }
                const seed = Math.floor(Math.random() * 1e9);
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
                            try {
                                return buildPolicy().chooseTempo({
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
                                }).tempo;
                            }
                            catch {
                                return 'normal';
                            }
                        },
                    } });
                // Pick player deck from selection with fallback
                const validDeck = (name) => (name === 'Pro Style' || name === 'Ball Control' || name === 'Aerial Style') ? name : 'Pro Style';
                const playerDeck = validDeck(deckName);
                // Map opponent to an AI deck style
                let aiDeck = 'Pro Style';
                if (opponentName === 'Andy Reid')
                    aiDeck = 'Aerial Style';
                else if (opponentName === 'Bill Belichick')
                    aiDeck = 'Ball Control';
                else if (opponentName === 'John Madden')
                    aiDeck = 'Pro Style';
                // Initial state at kickoff
                const initial = {
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
                };
                // Kickoff from AI to Player to start game
                const ko = flow.performKickoff(initial, 'normal', 'ai');
                const stateAfterKO = ko.state;
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
                });
                // Deal hand immediately based on possession after kickoff
                if (stateAfterKO.possession === 'player') {
                    const deck = OFFENSE_DECKS[playerDeck] || [];
                    const cardsToRender = deck.map((c) => ({ id: c.id, label: c.label, art: c.art, type: c.type }));
                    bus.emit('handUpdate', { cards: cardsToRender, isPlayerOffense: true });
                }
                else {
                    const defCards = DEFENSE_DECK.map((d) => ({ id: d.id, label: d.label, art: `assets/cards/Defense/${d.label}.jpg`, type: 'defense' }));
                    bus.emit('handUpdate', { cards: defCards, isPlayerOffense: false });
                }
                // Store minimal runtime pointers for potential future interactions
                window.GS_RUNTIME = { flow, playerDeck, aiDeck, state: stateAfterKO, seed };
                // Per-game player tendencies memory for adaptive AI defense
                const tendencies = new PlayerTendenciesMemory();
                // Helper: translate flow events into UI bus
                const translate = (events) => {
                    for (const ev of events) {
                        if (ev.type === 'hud')
                            bus.emit('hudUpdate', ev.payload);
                        else if (ev.type === 'log') {
                            // Prefix log lines with play context during dev test games
                            const dev = isDevModeOn();
                            if (dev && isTestGame) {
                                try {
                                    const rt = window.GS_RUNTIME || {};
                                    const lastOff = rt.__lastOffLabel || '';
                                    const lastDef = rt.__lastDefLabel || '';
                                    const st = rt.state;
                                    if (st && lastOff && lastDef) {
                                        const pref = buildPlayPrefix(st, lastOff, lastDef);
                                        bus.emit('log', { message: `${pref} — ${ev.message}` });
                                        continue;
                                    }
                                }
                                catch { }
                            }
                            bus.emit('log', { message: ev.message });
                        }
                        else if (ev.type === 'vfx')
                            bus.emit('vfx', { type: ev.payload.kind, payload: ev.payload.data });
                        else if (ev.type === 'final')
                            bus.emit('log', { message: `Final — HOME ${ev.payload.score.player} — AWAY ${ev.payload.score.ai}` });
                        else if (ev.type === 'halftime')
                            bus.emit('log', { message: 'Halftime' });
                        else if (ev.type === 'endOfQuarter')
                            bus.emit('log', { message: `End of Q${ev.payload.quarter}` });
                        else if (ev.type === 'score')
                            bus.emit('log', { message: `Score: ${ev.payload.kind}` });
                    }
                };
                // Emit kickoff events now that translator is ready
                try {
                    translate(ko.events);
                }
                catch { }
                // Prepare new PlayCaller instances for human vs AI flow
                const deps = {
                    charts: tables.offenseCharts,
                    getOffenseHand: () => {
                        const deck = OFFENSE_DECKS[playerDeck] || [];
                        return deck.map((c) => ({ id: c.id, label: c.label, type: c.type }));
                    },
                    getDefenseOptions: () => DEFENSE_DECK.map(d => d.label),
                    getWhiteSignRestriction: (label) => WHITE_SIGN_RESTRICTIONS[label] ?? null,
                };
                const pcPlayer = new PlayCaller(deps, true);
                const pcAI = new PlayCaller(deps, true);
                try {
                    await pcPlayer.loadPersonality();
                    await pcAI.loadPersonality();
                }
                catch { }
                pcPlayer.reset(seed);
                pcAI.reset(seed + 1);
                // Keep the hand UI in sync with possession by re-emitting handUpdate on HUD changes
                // When AI has the ball, present defense calls for the human to choose
                bus.on('hudUpdate', ({ possession }) => {
                    try {
                        const rt = window.GS_RUNTIME || {};
                        if (possession === 'player') {
                            const deckDef = OFFENSE_DECKS[rt.playerDeck] || [];
                            const cards = deckDef.map((c) => ({ id: c.id, label: c.label, art: c.art, type: c.type }));
                            bus.emit('handUpdate', { cards, isPlayerOffense: true });
                        }
                        else {
                            const defCards = DEFENSE_DECK.map((d) => ({ id: d.id, label: d.label, art: `assets/cards/Defense/${d.label}.jpg`, type: 'defense' }));
                            bus.emit('handUpdate', { cards: defCards, isPlayerOffense: false });
                        }
                    }
                    catch { }
                });
                // Listen for player selection; if player has ball, it's an offense play; if AI has ball, selection is defense
                bus.on('ui:playCard', ({ cardId }) => {
                    try {
                        const rt = window.GS_RUNTIME || {};
                        const currentState = rt.state;
                        if (!currentState || currentState.gameOver)
                            return;
                        if (currentState.possession === 'player') {
                            // Player offense: look up offense card from player's deck
                            const playerDeckDef = OFFENSE_DECKS[rt.playerDeck] || [];
                            const card = playerDeckDef.find((c) => c.id === cardId);
                            if (!card)
                                return;
                            const defPicked = pcAI.choose_defense_play(currentState);
                            const input = { deckName: rt.playerDeck, playLabel: card.label, defenseLabel: defPicked.label };
                            const before = { ...currentState };
                            const res = flow.resolveSnap(currentState, input);
                            try {
                                window.GS_RUNTIME.__lastOffLabel = card.label;
                                window.GS_RUNTIME.__lastDefLabel = defPicked.label;
                            }
                            catch { }
                            translate(res.events);
                            window.GS_RUNTIME.state = res.state;
                            try {
                                pcPlayer.add_observation(before, card.label, defPicked.label);
                                pcAI.add_observation(before, card.label, defPicked.label);
                                pcPlayer.stepDecay();
                                pcAI.stepDecay();
                            }
                            catch { }
                            try {
                                const playType = (/pass/i.test(card.label) ? 'pass' : 'run');
                                tendencies.record('player', playType, {
                                    down: before.down,
                                    toGo: before.toGo,
                                    ballOnFromHome: before.ballOn,
                                    playerIsHome: true,
                                    possessing: before.possession,
                                });
                            }
                            catch { }
                        }
                        else {
                            // AI offense: player's click selects a defense; AI picks offense via PlayCaller
                            const defCard = DEFENSE_DECK.find((d) => d.id === cardId);
                            if (!defCard)
                                return;
                            const offPicked = pcAI.choose_offense_play(currentState, rt.aiDeck);
                            const input = { deckName: rt.aiDeck, playLabel: offPicked.playLabel, defenseLabel: defCard.label };
                            const before = { ...currentState };
                            const res = flow.resolveSnap(currentState, input);
                            try {
                                window.GS_RUNTIME.__lastOffLabel = offPicked.playLabel;
                                window.GS_RUNTIME.__lastDefLabel = defCard.label;
                            }
                            catch { }
                            translate(res.events);
                            window.GS_RUNTIME.state = res.state;
                            try {
                                pcPlayer.add_observation(before, offPicked.playLabel, defCard.label);
                                pcAI.add_observation(before, offPicked.playLabel, defCard.label);
                                pcPlayer.stepDecay();
                                pcAI.stepDecay();
                            }
                            catch { }
                        }
                    }
                    catch (err) {
                        try {
                            bus.emit('log', { message: `Play selection failed: ${String(err?.message || err)}` });
                        }
                        catch { }
                    }
                });
            }
            catch (err) {
                bus.emit('log', { message: `Failed to start new game: ${err?.message || err}` });
            }
        });
    }
    catch { }
}
function dispose() {
    // No timers yet; leave bus listeners intact for now. Future timers/intervals cleared here.
}
const runtime = {
    bus,
    rules: { Kickoff, Punt, PlaceKicking, ResultParsing, Timekeeping, Charts, LongGain },
    ai: { PATDecision, CoachProfiles },
    tables,
    start,
    dispose,
    setTheme,
    runtime: {
        resolvePlayAdapter: (params) => {
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
                clock: params.state.clock,
                score: { ...params.state.score },
                awaitingPAT: params.state.awaitingPAT,
                gameOver: params.state.gameOver,
            };
            const events = [];
            if (res.possessionChanged)
                events.push({ type: 'possessionChanged' });
            if (res.touchdown)
                events.push({ type: 'touchdown' });
            if (res.safety)
                events.push({ type: 'safety' });
            return { nextState, outcome: res.outcome, events };
        },
        // Expose createFlow for tests (typed as any in GameRuntime to avoid leaking internals)
        createFlow: (seed) => {
            const rng = createLCG(seed ?? 12345);
            if (!tables.offenseCharts)
                throw new Error('Offense charts not loaded');
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
                        try {
                            return buildPolicy().chooseTempo({
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
                            }).tempo;
                        }
                        catch {
                            return 'normal';
                        }
                    },
                } });
            let flowState = null;
            let pendingPenalty = null;
            const translate = (events) => {
                for (const ev of events) {
                    if (ev.type === 'hud')
                        bus.emit('hudUpdate', ev.payload);
                    else if (ev.type === 'log') {
                        bus.emit('log', { message: ev.message });
                        if (/Field goal missed/i.test(ev.message)) {
                            bus.emit && bus.emit('vfx:banner', { text: 'NO GOOD' });
                            bus.emit && bus.emit('sfx:crowd', { kind: 'groan' });
                        }
                    }
                    else if (ev.type === 'vfx') {
                        const kind = ev.payload.kind;
                        if (kind === 'td') {
                            bus.emit && bus.emit('vfx:banner', { text: 'TOUCHDOWN!', gold: true });
                            bus.emit && bus.emit('vfx:flash', {});
                            bus.emit && bus.emit('sfx:crowd', { kind: 'cheer' });
                        }
                        else if (kind === 'interception') {
                            bus.emit && bus.emit('vfx:banner', { text: 'INTERCEPTION!' });
                            bus.emit && bus.emit('vfx:shake', { selector: 'body' });
                            bus.emit && bus.emit('sfx:hit', {});
                        }
                        else if (kind === 'twoMinute') {
                            bus.emit && bus.emit('vfx:flash', {});
                        }
                        bus.emit('vfx', { type: kind, payload: ev.payload.data });
                    }
                    else if (ev.type === 'choice-required') {
                        bus.emit('flow:choiceRequired', { choice: ev.choice, data: ev.data });
                        if (ev.choice === 'penaltyAcceptDecline') {
                            const d = ev.data || {};
                            pendingPenalty = { accepted: d.accepted, declined: d.declined, meta: d.meta };
                        }
                    }
                    else if (ev.type === 'final')
                        bus.emit('log', { message: `Final — HOME ${ev.payload.score.player} — AWAY ${ev.payload.score.ai}` });
                    else if (ev.type === 'halftime')
                        bus.emit('log', { message: 'Halftime' });
                    else if (ev.type === 'endOfQuarter')
                        bus.emit('log', { message: `End of Q${ev.payload.quarter}` });
                    else if (ev.type === 'score') {
                        bus.emit('log', { message: `Score: ${ev.payload.kind}` });
                        bus.emit && bus.emit('vfx:scorePop', {});
                        if (ev.payload.kind === 'FG') {
                            bus.emit && bus.emit('vfx:banner', { text: 'FIELD GOAL!' });
                            bus.emit && bus.emit('sfx:beep', { freq: 880, type: 'triangle' });
                        }
                        else if (ev.payload.kind === 'Safety') {
                            bus.emit && bus.emit('vfx:banner', { text: 'SAFETY!', gold: true });
                            bus.emit && bus.emit('sfx:beep', { freq: 220, type: 'square' });
                        }
                        else if (ev.payload.kind === 'TD') {
                            bus.emit && bus.emit('vfx:banner', { text: 'TOUCHDOWN!', gold: true });
                            bus.emit && bus.emit('sfx:crowd', { kind: 'cheer' });
                        }
                    }
                }
            };
            bus.on && bus.on('ui:choice.penalty', (p) => {
                if (!pendingPenalty)
                    return;
                const ctx = pendingPenalty;
                const chosen = p.decision === 'accept' ? ctx.accepted : ctx.declined;
                const fin = flow.finalizePenaltyDecision(chosen, p.decision, ctx.meta);
                flowState = fin.state;
                translate(fin.events);
                pendingPenalty = null;
            });
            return {
                resolveSnap: (state, input) => {
                    const res = flow.resolveSnap(state, input);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                applyPenaltyDecision: (state, decision, context) => {
                    const chosen = decision === 'accept' ? context.accepted : context.declined;
                    const fin = flow.finalizePenaltyDecision(chosen, decision, context.meta);
                    translate(fin.events);
                    flowState = fin.state;
                    return fin;
                },
                resolvePATAndRestart: (state, side) => {
                    const res = flow.resolvePATAndRestart(state, side);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                attemptFieldGoal: (state, attemptYards, side) => {
                    const res = flow.attemptFieldGoal(state, attemptYards, side);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                resolveSafetyRestart: (state, conceding) => {
                    const res = flow.resolveSafetyRestart(state, conceding);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                performKickoff: (state, type, kicking) => {
                    const res = flow.performKickoff(state, type, kicking);
                    translate(res.events);
                    flowState = res.state;
                    return res;
                },
                inner: flow,
            };
        },
    },
};
if (typeof window !== 'undefined' && !window.GS) {
    window.GS = runtime;
}
// Ensure no legacy bridge remains; runtime boots purely via TS modules.
// Auto-start the runtime once the DOM is ready so UI registers and field chrome renders.
// Idempotent: start() guards on a local flag.
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            try {
                void runtime.start();
            }
            catch { }
        }, { once: true });
    }
    else {
        try {
            void runtime.start();
        }
        catch { }
    }
}
//# sourceMappingURL=index.js.map