import { createLCG } from '../../sim/RNG';
import { buildPolicy } from '../../ai/policy/NFL2025Policy';
import { validateEvents } from '../../sim/Validation';
import * as CoachProfiles from '../../ai/CoachProfiles';
import { runHeadlessSim } from '../../sim/engine/headless';
export async function runChunk(params, postProgress) {
    const { seeds, total, playerPAT, chunkSize, charts, tk, playerDeck, aiDeck, playerCoach, aiCoach, cancelRequestedRef } = params;
    const policy = buildPolicy();
    let passed = 0, failed = 0;
    let sumHome = 0, sumAway = 0;
    const failures = [];
    let done = 0;
    for (let start = 0; start < seeds.length; start += chunkSize) {
        if (cancelRequestedRef.value)
            break;
        const chunk = seeds.slice(start, Math.min(seeds.length, start + chunkSize));
        for (const seed of chunk) {
            if (cancelRequestedRef.value)
                break;
            try {
                const rng = createLCG(seed);
                const { state, events } = await runHeadlessSim(seed, {
                    charts,
                    rng,
                    timeKeeping: tk || {
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
                    },
                    policy: {
                        choosePAT: ({ diff, quarter, clock, side }) => {
                            if (side === 'player') {
                                if (playerPAT === 'two')
                                    return 'two';
                                if (playerPAT === 'auto') {
                                    const aiLeadsBy = -(diff);
                                    return (aiLeadsBy === 1 || aiLeadsBy === 2) ? 'two' : 'kick';
                                }
                                return 'kick';
                            }
                            return policy.choosePAT({ quarter, time_remaining_sec: clock, score_diff: diff });
                        },
                    },
                    seed,
                    playerDeck,
                    aiDeck,
                    playerCoach,
                    aiCoach,
                });
                sumHome += state.score.player;
                sumAway += state.score.ai;
                const report = validateEvents(events);
                if (report.ok)
                    passed++;
                else {
                    failed++;
                    failures.push({ seed, issues: report.issues.slice() });
                }
            }
            catch (err) {
                failed++;
                failures.push({ seed, issues: [String(err?.message || err)] });
            }
        }
        done = Math.min(seeds.length, start + chunk.length);
        postProgress({ done, total, passed, failed });
    }
    return { passed, failed, sumHome, sumAway, failures };
}
//# sourceMappingURL=runChunk.js.map