import { generateCommentary, generatePenaltyCommentary, generateTurnoverReturnCommentary, generateOOBCommentary } from './CommentaryEngine';
export const TAG_CATEGORIES = [
    {
        name: 'Outcome Types',
        tags: ['completion', 'incompletion', 'turnover', 'interception', 'fumble', 'sack', 'safety', 'touchdown'],
        description: 'Basic play result classifications'
    },
    {
        name: 'Route Concepts',
        tags: ['short', 'intermediate', 'deep', 'screen', 'slant', 'post', 'corner', 'out', 'hook', 'seam', 'crossing', 'fade', 'bomb', 'hail_mary'],
        description: 'Passing route types and depths'
    },
    {
        name: 'Run Concepts',
        tags: ['run', 'inside_run', 'outside_run', 'draw', 'counter', 'sweep', 'trap', 'power', 'zone_run', 'stretch', 'cutback', 'blast'],
        description: 'Running play types and schemes'
    },
    {
        name: 'Pressure Types',
        tags: ['blitz', 'blitz_pickup', 'blitz_disruption', 'pressure', 'coverage_sack', 'hurry', 'knockdown', 'bat_down', 'tip', 'breakup'],
        description: 'Defensive pressure and coverage outcomes'
    },
    {
        name: 'Field Position',
        tags: ['red_zone', 'goal_line', 'backed_up', 'midfield', 'boundary', 'sideline', 'hash_marks', 'oob', 'in_bounds'],
        description: 'Where the play occurred on the field'
    },
    {
        name: 'Game Situation',
        tags: ['first_down', 'third_down', 'fourth_down', 'two_minute', 'hurry_up', 'clock_management', 'prevent', 'aggressive', 'conservative'],
        description: 'Down, distance, and strategic context'
    },
    {
        name: 'Special Plays',
        tags: ['explosive', 'chunk', 'big_play', 'breakaway', 'house_call', 'goal_line_stand', 'turnover_on_downs', 'scramble', 'broken_play'],
        description: 'Notable or unusual play outcomes'
    },
    {
        name: 'Penalties',
        tags: ['penalty', 'offsides', 'false_start', 'holding', 'pass_interference', 'roughing', 'face_mask', 'illegal_contact', 'personal_foul', 'offsetting', 'accepted_penalty', 'declined_penalty'],
        description: 'Penalty types and outcomes'
    }
];
// Helper function to determine if a set of tags represents a turnover
export function isTurnover(tags) {
    return tags.includes('turnover') || tags.includes('interception') || tags.includes('fumble');
}
// Helper function to determine if a set of tags represents a completion
export function isCompletion(tags) {
    return tags.includes('completion') && !tags.includes('incompletion');
}
// Helper function to determine if a set of tags represents an incompletion
export function isIncompletion(tags) {
    return tags.includes('incompletion') || (!tags.includes('completion') && !isTurnover(tags));
}
// Helper function to determine if a set of tags represents an explosive play
export function isExplosive(tags) {
    return tags.includes('explosive') || tags.includes('chunk') || tags.includes('big_play') || tags.includes('breakaway');
}
// Helper function to determine if a set of tags represents a penalty situation
export function isPenalty(tags) {
    return tags.includes('penalty') || TAG_CATEGORIES.find(cat => cat.name === 'Penalties')?.tags.some(tag => tags.includes(tag)) || false;
}
// Helper function to get the primary action type from tags
export function getPrimaryAction(tags) {
    if (tags.some(tag => ['short', 'intermediate', 'deep', 'screen', 'slant', 'post', 'corner', 'out', 'hook', 'seam', 'crossing', 'fade', 'bomb'].includes(tag))) {
        return 'pass';
    }
    if (tags.some(tag => ['run', 'inside_run', 'outside_run', 'draw', 'counter', 'sweep', 'trap', 'power', 'zone_run', 'stretch', 'cutback', 'blast'].includes(tag))) {
        return 'run';
    }
    return 'special';
}
// Helper function to get the play depth from tags
export function getPlayDepth(tags) {
    if (tags.includes('short'))
        return 'short';
    if (tags.includes('intermediate'))
        return 'intermediate';
    if (tags.includes('deep'))
        return 'deep';
    return 'unknown';
}
// Helper function to get defensive context from tags
export function getDefensiveContext(tags) {
    if (tags.includes('blitz'))
        return 'blitz';
    if (tags.includes('pressure'))
        return 'pressure';
    if (tags.includes('coverage_sack'))
        return 'coverage';
    return 'standard';
}
// Helper function to determine if play is in the red zone
export function isInRedZone(fieldPosition, possession) {
    // Red zone is within 20 yards of either end zone regardless of possession
    const distanceToNearestGoal = Math.min(fieldPosition, 100 - fieldPosition);
    return distanceToNearestGoal <= 20;
}
// Helper function to determine if it's two-minute warning situation
export function isTwoMinuteWarning(quarter, clock) {
    return (quarter === 2 || quarter === 4) && clock <= 120;
}
// Helper function to build context object for commentary generation
export function buildTagContext(gameState, outcome, penaltyInfo) {
    const isRedZone = isInRedZone(gameState.ballOn, gameState.possession);
    const isTwoMinute = isTwoMinuteWarning(gameState.quarter, gameState.clock);
    return {
        gameState,
        yards: outcome.yards || 0,
        clock: outcome.clock === '10' ? 10 : outcome.clock === '20' ? 20 : 30,
        down: gameState.down,
        toGo: gameState.toGo,
        fieldPosition: gameState.ballOn,
        score: gameState.score,
        quarter: gameState.quarter,
        timeRemaining: gameState.clock,
        isRedZone,
        isTwoMinuteWarning: isTwoMinute,
        explosivePlay: (outcome.yards || 0) >= 20
    };
}
// Main tag mapper class that coordinates commentary generation
export class DiceTagMapper {
    rng;
    constructor(rng) {
        this.rng = rng;
    }
    // Convert dice outcome tags to enhanced tag set with context
    enhanceTagsWithContext(baseTags, outcome, gameState, penaltyInfo) {
        const enhancedTags = [...baseTags];
        const context = buildTagContext(gameState, outcome, penaltyInfo);
        // Add contextual tags based on game situation
        if (context.isRedZone) {
            enhancedTags.push('red_zone');
        }
        if (context.isTwoMinuteWarning) {
            enhancedTags.push('two_minute');
        }
        if (context.explosivePlay) {
            enhancedTags.push('explosive');
        }
        if (context.yards > 0 && context.toGo - context.yards <= 0) {
            enhancedTags.push('first_down');
        }
        // Add field position context
        if (context.fieldPosition <= 10) {
            enhancedTags.push('backed_up');
        }
        else if (context.fieldPosition >= 40 && context.fieldPosition <= 60) {
            enhancedTags.push('midfield');
        }
        // Add down context
        if (context.down === 3) {
            enhancedTags.push('third_down');
        }
        else if (context.down === 4) {
            enhancedTags.push('fourth_down');
        }
        // Add score context
        const scoreDiff = Math.abs(context.score.player - context.score.ai);
        if (scoreDiff <= 7 && context.quarter >= 3) {
            // Represent close game via existing tags: increase clock management pressure
            enhancedTags.push('clock_management');
        }
        return enhancedTags;
    }
    // Generate commentary for a dice outcome (Phase D enhanced integration)
    generateDiceOutcomeCommentary(outcome, gameState, penaltyInfo, penaltyAccepted) {
        const context = buildTagContext(gameState, outcome, penaltyInfo);
        const enhancedTags = this.enhanceTagsWithContext(outcome.tags || [], outcome, gameState, penaltyInfo);
        // Handle special cases
        if (penaltyInfo && penaltyAccepted !== undefined) {
            return generatePenaltyCommentary(enhancedTags, context, penaltyInfo, penaltyAccepted, this.rng);
        }
        if (outcome.turnover?.return_yards !== undefined) {
            return generateTurnoverReturnCommentary(enhancedTags, context, outcome.turnover.return_yards, this.rng);
        }
        if (outcome.oob) {
            const pbp = generateOOBCommentary(enhancedTags, context, this.rng);
            const analyst = generateCommentary(enhancedTags, context, this.rng, 'analyst');
            return { pbp, analyst };
        }
        // Enhanced commentary generation with integrated context (Phase D2 requirement)
        let pbp = generateCommentary(enhancedTags, context, this.rng, 'pbp');
        // Phase D2: Integrate down/distance, field spot, result, clock note
        const downDistance = this.formatDownAndDistance(context.down, context.toGo);
        const fieldSpot = this.formatFieldPosition(context.gameState.possession, context.fieldPosition);
        const result = this.formatResult(outcome);
        const clockNote = this.formatClockNote(outcome.clock, context.timeRemaining);
        // Create comprehensive play-by-play with all context
        let integratedPBP = `${downDistance} from the ${fieldSpot}. ${result}${clockNote ? ` ${clockNote}` : ''}.`;
        // Ensure yardage appears in PBP for test determinism if missing
        if (outcome.yards !== undefined && !/\d/.test(integratedPBP)) {
            const yardText = `${Math.abs(outcome.yards)} yard${Math.abs(outcome.yards) === 1 ? '' : 's'}`;
            if (outcome.yards >= 0) {
                integratedPBP = `${yardText} — ${integratedPBP}`;
            }
            else {
                integratedPBP = `Loss of ${Math.abs(outcome.yards)} — ${integratedPBP}`;
            }
        }
        const analyst = generateCommentary(enhancedTags, context, this.rng, 'analyst');
        return { pbp: integratedPBP, analyst };
    }
    // Format result for integration (Phase D2)
    formatResult(outcome) {
        if (outcome.turnover) {
            const turnoverType = outcome.turnover.type === 'INT' ? 'interception' : 'fumble';
            const returnYards = outcome.turnover.return_yards || 0;
            if (returnYards > 0) {
                return `${turnoverType} returned ${returnYards} yards`;
            }
            else {
                return `${turnoverType} at the line of scrimmage`;
            }
        }
        if (outcome.yards !== undefined) {
            if (outcome.yards > 0) {
                return `gain of ${outcome.yards} yards`;
            }
            else if (outcome.yards < 0) {
                return `loss of ${Math.abs(outcome.yards)} yards`;
            }
            else {
                return 'no gain';
            }
        }
        return 'incomplete pass';
    }
    // Format clock note for integration (Phase D2)
    formatClockNote(clock, timeRemaining) {
        const clockSeconds = clock === '10' ? 10 : clock === '20' ? 20 : 30;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        if (timeRemaining <= 120) { // Two-minute warning or less
            return `(Clock: ${minutes}:${seconds.toString().padStart(2, '0')})`;
        }
        return ''; // Only show clock in critical situations
    }
    // Generate commentary for doubles outcomes (touchdowns, etc.)
    generateDoublesCommentary(result, gameState) {
        const context = buildTagContext(gameState, { yards: 0, clock: '10', tags: [] });
        const tags = result === 'DEF_TD' ? ['defensive_touchdown'] : ['offensive_touchdown'];
        if (result === 'DEF_TD') {
            const pbp = 'Touchdown defense! Pick-six!';
            const analyst = 'Great read and return by the defense.';
            return { pbp, analyst };
        }
        else {
            const pbp = 'Touchdown offense! Six points!';
            const analyst = 'Perfect execution in the red zone.';
            return { pbp, analyst };
        }
    }
    // Format field position for commentary
    formatFieldPosition(possession, ballOn) {
        const yardsToGoal = possession === 'player' ? (100 - ballOn) : ballOn;
        const team = possession === 'player' ? 'HOME' : 'AWAY';
        if (yardsToGoal <= 20) {
            return `${team} ${yardsToGoal}`;
        }
        else if (ballOn <= 50) {
            return `${team} ${ballOn}`;
        }
        else {
            return `${team} ${100 - ballOn} (opp)`;
        }
    }
    // Format down and distance for commentary
    formatDownAndDistance(down, toGo) {
        const downText = down === 1 ? 'First' : down === 2 ? 'Second' : down === 3 ? 'Third' : 'Fourth';
        return `${downText} and ${toGo}`;
    }
    // Format clock for commentary
    formatClock(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    // Format score for commentary
    formatScore(score) {
        return `HOME ${score.player} – AWAY ${score.ai}`;
    }
}
//# sourceMappingURL=TagMapper.js.map