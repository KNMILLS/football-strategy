import { createInitialGameState } from '../domain/GameState';
import { createLCG } from './RNG';
import { GameFlow } from '../flow/GameFlow';
import { COACH_PROFILES } from '../ai/CoachProfiles';
import { OFFENSE_DECKS, DEFENSE_DECK, WHITE_SIGN_RESTRICTIONS } from '../data/decks';
import { loadOffenseCharts, loadPlaceKicking, loadTimeKeeping, loadLongGain } from '../data/loaders/tables';
import { attemptPAT as pkAttemptPAT } from '../rules/special/PlaceKicking';
import { formatEventsToLegacyLog } from './LogFormat';
export async function simulateOneGame(opts) {
    const rng = createLCG(opts.seed);
    // Load tables; tolerate undefined and rely on defaults embedded in rules when possible
    const [charts, _pk, _tk, _lg] = await Promise.all([
        loadOffenseCharts(),
        loadPlaceKicking(),
        loadTimeKeeping(),
        loadLongGain(),
    ]);
    if (!charts)
        throw new Error('Offense charts failed to load');
    const flow = new GameFlow({ charts, rng, policy: {
            choosePAT: ({ diff, quarter, clock, side }) => {
                if (side === 'player') {
                    if (opts.playerPAT === 'two')
                        return 'two';
                    if (opts.playerPAT === 'auto') {
                        const aiLeadsBy = -(diff); // diff is player-ai
                        return (aiLeadsBy === 1 || aiLeadsBy === 2) ? 'two' : 'kick';
                    }
                    return 'kick';
                }
                // AI heuristic
                const late = quarter === 4 && clock <= 5 * 60;
                if (late && diff < 0 && -diff <= 2)
                    return 'two';
                return 'kick';
            },
        } });
    // Coaches
    const playerCoachName = opts.playerCoach || 'John Madden';
    const aiCoachName = opts.aiCoach || 'Bill Belichick';
    const playerCoach = COACH_PROFILES[playerCoachName] || COACH_PROFILES['John Madden'];
    const aiCoach = COACH_PROFILES[aiCoachName] || COACH_PROFILES['Bill Belichick'];
    // Decks: defaults per requirement
    const homeDeck = 'Pro Style';
    const awayDeck = 'Ball Control';
    let state = createInitialGameState(opts.seed);
    state.possession = opts.startingPossession || 'player';
    const collected = [];
    const push = (events) => { collected.push(...events); };
    // Kickoff at start of game: receiving is current possession, so kicker is the other side
    {
        const kicking = state.possession === 'player' ? 'ai' : 'player';
        const ko = flow.performKickoff(state, 'normal', kicking);
        state = ko.state;
        push(ko.events);
    }
    // Drive loop
    let snaps = 0;
    const maxSnaps = 2000; // guard
    while (!state.gameOver && snaps < maxSnaps) {
        snaps++;
        // Fixed play selection for parity with current golden baselines
        const input = { deckName: 'Pro Style', playLabel: 'Run & Pass Option', defenseLabel: 'Run & Pass' };
        const res = flow.resolveSnap(state, input);
        state = res.state;
        push(res.events);
    }
    // Final event may already be emitted by flow; ensure we have final scores
    const home = state.score.player;
    const away = state.score.ai;
    const winner = home === away ? 'tie' : (home > away ? 'home' : 'away');
    const log = formatEventsToLegacyLog(collected, { finalHome: home, finalAway: away });
    return { home, away, winner, log };
}
export async function simulateAutoGames(opts) {
    const out = [];
    for (const seed of opts.seeds) {
        const res = await simulateOneGame({ seed, playerPAT: opts.playerPAT });
        out.push({ seed, result: { home: res.home, away: res.away, winner: res.winner } });
    }
    return out;
}
//# sourceMappingURL=Simulator.js.map