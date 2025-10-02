// Import taglines data for enhanced commentary variants
import * as fs from 'fs';
import * as path from 'path';
const taglinesPath = path.join(__dirname, '..', 'taglines.json');
const taglinesData = JSON.parse(fs.readFileSync(taglinesPath, 'utf8'));
// Template variants for play-by-play commentary
export const COMMENTARY_TEMPLATES = [
    // Completion templates
    {
        tags: ['completion', 'short'],
        priority: 10,
        variants: [
            'Quick hitter underneath for ${yards} yards.',
            'Short completion over the middle.',
            'Easy pitch and catch underneath.',
            'Quick slant route finds the receiver.',
            'Short crosser picks up ${yards} yards.'
        ]
    },
    {
        tags: ['completion', 'intermediate'],
        priority: 10,
        variants: [
            'Intermediate route finds the mark for ${yards} yards.',
            'Cross-field completion moves the chains.',
            'Timing route connects downfield.',
            'Seam route splits the coverage for ${yards}.',
            'Out route beats the corner for a gain.'
        ]
    },
    {
        tags: ['completion', 'deep'],
        priority: 15,
        variants: [
            'Deep ball connects! ${yards} yards downfield.',
            'Bomb away! Long completion for ${yards} yards.',
            'Vertical route beats the safety for a big gain.',
            'Deep post splits the safeties.',
            'Corner route finds paydirt downfield.'
        ]
    },
    // Incompletion templates
    {
        tags: ['incompletion'],
        priority: 5,
        variants: [
            'Pass falls incomplete.',
            'Ball hits the turf.',
            'Receiver couldn\'t bring it in.',
            'Quarterback misses his target.',
            'Pass sails out of bounds.'
        ]
    },
    {
        tags: ['incompletion', 'deep'],
        priority: 8,
        variants: [
            'Deep shot falls incomplete.',
            'Hail Mary attempt comes up short.',
            'Long bomb sails over the receiver\'s head.',
            'Vertical route just out of reach.',
            'Safety breaks up the deep attempt.'
        ]
    },
    {
        tags: ['incompletion', 'blitz_disruption'],
        priority: 12,
        variants: [
            'Blitz forces a hurried incompletion.',
            'Pressure disrupts the timing.',
            'Quarterback has to rush the throw.',
            'Blitz gets home before the release.',
            'Defensive pressure causes the miss.'
        ]
    },
    // Run templates
    {
        tags: ['run', 'inside_run'],
        priority: 10,
        variants: [
            'Runs it up the gut for ${yards} yards.',
            'Inside zone finds a crease.',
            'Pounds it between the tackles.',
            'Inside run picks up ${yards}.',
            'Between-the-tackles run gains ground.'
        ]
    },
    {
        tags: ['run', 'outside_run'],
        priority: 10,
        variants: [
            'Bounces it outside for ${yards} yards.',
            'Outside zone finds the edge.',
            'Stretches it to the perimeter.',
            'Outside run turns the corner.',
            'Sweep finds daylight on the edge.'
        ]
    },
    // Turnover templates
    {
        tags: ['turnover', 'interception'],
        priority: 20,
        variants: [
            'Intercepted! Defense takes over.',
            'Pick! Turnover in the secondary.',
            'Interception! Ball changes hands.',
            'Defensive back makes the grab.',
            'Turnover! Intercepted by the defense.'
        ]
    },
    {
        tags: ['turnover', 'fumble'],
        priority: 20,
        variants: [
            'Fumble! Ball is loose.',
            'Coughsup the football.',
            'Fumble recovered by the defense.',
            'Turnover! Ball hits the ground.',
            'Loose ball recovered by the defense.'
        ]
    },
    // Sack templates
    {
        tags: ['sack'],
        priority: 15,
        variants: [
            'Sacked! Loss of ${yards} yards.',
            'Quarterback goes down in the backfield.',
            'Sack brings down the quarterback.',
            'Defensive line gets home for the sack.',
            'QB dropped for a loss.'
        ]
    },
    // First down templates
    {
        tags: ['first_down'],
        priority: 12,
        variants: [
            'First down! Moving the chains.',
            'Picks up the first down.',
            'Converts for a new set of downs.',
            'First down and more.',
            'Advances past the sticks.'
        ]
    },
    // Explosive play templates
    {
        tags: ['explosive'],
        priority: 18,
        variants: [
            'Explosive play! ${yards} yards.',
            'Chunk play moves the ball.',
            'Big gain keeps the drive alive.',
            'Explodes for ${yards} yards.',
            'Breakaway speed for a long gain.'
        ]
    },
    // Red zone templates
    {
        tags: ['red_zone'],
        priority: 8,
        variants: [
            'Inside the red zone now.',
            'Knocking on the door.',
            'Goal-to-go situation.',
            'In scoring position.',
            'Red zone opportunity.'
        ],
        conditions: (ctx) => ctx.isRedZone
    },
    // Two-minute warning templates
    {
        tags: ['two_minute'],
        priority: 8,
        variants: [
            'Two-minute warning approaching.',
            'Clock becoming a factor.',
            'Hurry-up mode engaged.',
            'Time management critical.',
            'Under two minutes to play.'
        ],
        conditions: (ctx) => ctx.isTwoMinuteWarning
    }
];
// Color commentary (analyst) templates
export const ANALYST_TEMPLATES = [
    {
        tags: ['completion', 'short'],
        priority: 10,
        variants: [
            'Good underneath route; took what the defense gave him.',
            'Smart checkdown to avoid the pressure.',
            'Easy completion underneath the coverage.',
            'Quarterback reads the blitz and gets rid of it quickly.',
            'Safe throw to the hot route.'
        ]
    },
    {
        tags: ['completion', 'deep'],
        priority: 15,
        variants: [
            'Perfect touch on the deep ball.',
            'Beat the coverage with great protection.',
            'Timing was impeccable on that vertical route.',
            'Safety bit on the underneath route.',
            'Great adjustment by the receiver.'
        ]
    },
    {
        tags: ['incompletion', 'blitz_disruption'],
        priority: 12,
        variants: [
            'Blitz got there too quickly.',
            'Protection broke down at the worst time.',
            'Quarterback had no chance against that pressure.',
            'Defensive coordinator dialed up the perfect blitz.',
            'Edge rusher won that matchup.',
            'Offensive line got overwhelmed.',
            'Pressure came from an unexpected gap.',
            'Quarterback couldn\'t step up in the pocket.',
            'Defensive front dominated that snap.',
            'Blitz timing was perfect.'
        ]
    },
    // Sack templates (Phase D requirement - ≥5 variants)
    {
        tags: ['sack'],
        priority: 15,
        variants: [
            'Sack! Quarterback goes down for a loss.',
            'Defense brings him down behind the line.',
            'Pocket collapses and the QB takes a sack.',
            'Pass rush gets home for the takedown.',
            'Quarterback sacked for ${yards} yards.',
            'Offensive line couldn\'t hold the block.',
            'Edge rusher beats his man for the sack.',
            'Interior pressure forces the quarterback down.',
            'Protection scheme breaks down completely.',
            'Quarterback has no escape from the rush.'
        ]
    },
    // Turnover templates (Phase D requirement - ≥5 variants)
    {
        tags: ['turnover'],
        priority: 20,
        variants: [
            'Turnover! Ball changes hands.',
            'Defense forces the turnover.',
            'Offense gives it away.',
            'Interception! Defense takes over.',
            'Fumble! Loose ball recovered.',
            'Critical turnover at a bad time.',
            'Defense capitalizes on the mistake.',
            'Offense shoots itself in the foot.',
            'Turnover swings momentum.',
            'Ball security issues cost the offense.'
        ]
    },
    // Explosive play templates (Phase D requirement - ≥5 variants)
    {
        tags: ['explosive'],
        priority: 18,
        variants: [
            'Explosive play! Big gain downfield.',
            'Chunk yardage on that play.',
            'Defense gets burned for a big gain.',
            'Offensive playmaker breaks loose.',
            'Vertical route goes for a huge gain.',
            'Coverage breaks down for the big play.',
            'Receiver gets behind the secondary.',
            'Quarterback finds the seam for yards.',
            'Offense strikes for the long gain.',
            'Defense can\'t contain the play.'
        ]
    },
    // Boundary play templates (Phase D requirement - ≥5 variants)
    {
        tags: ['boundary'],
        priority: 8,
        variants: [
            'Play goes to the boundary.',
            'Receiver works the sideline.',
            'Ball thrown to the perimeter.',
            'Out route to the boundary.',
            'Play develops along the sideline.',
            'Receiver uses the sideline as protection.',
            'Quarterback targets the boundary receiver.',
            'Play stays within the field boundaries.',
            'Ball carrier hugs the sideline.',
            'Action moves to the edge of the field.'
        ]
    },
    // Checkdown templates (Phase D requirement - ≥5 variants)
    {
        tags: ['checkdown'],
        priority: 6,
        variants: [
            'Quarterback checks down to the underneath route.',
            'Safe throw underneath the coverage.',
            'Quarterback takes what the defense gives.',
            'Checkdown route finds the open receiver.',
            'Conservative throw to avoid the blitz.',
            'Quarterback reads the coverage and dumps it off.',
            'Underneath route becomes the bailout option.',
            'Smart decision to take the short gain.',
            'Quarterback avoids pressure with the checkdown.',
            'Defense forces the conservative throw.'
        ]
    },
    // Coverage bust templates (Phase D requirement - ≥5 variants)
    {
        tags: ['coverage_bust'],
        priority: 14,
        variants: [
            'Coverage bust! Receiver wide open.',
            'Defensive breakdown creates the opening.',
            'Secondary loses track of the receiver.',
            'Coverage assignment error leads to the gain.',
            'Defender takes the wrong angle.',
            'Defensive coordinator\'s scheme fails.',
            'Receiver finds the soft spot in coverage.',
            'Secondary communication breaks down.',
            'Defender gets caught peeking in the backfield.',
            'Coverage rotation leaves the receiver open.'
        ]
    },
    // Stuff templates (Phase D requirement - ≥5 variants)
    {
        tags: ['stuff'],
        priority: 10,
        variants: [
            'Run gets stuffed at the line.',
            'Defense stops the run cold.',
            'Offensive line gets no push.',
            'Run play goes nowhere.',
            'Defense wins at the point of attack.',
            'Running back meets immediate resistance.',
            'Defensive front dominates the gap.',
            'Run gets blown up in the backfield.',
            'Offense can\'t generate any movement.',
            'Defense stacks the box perfectly.'
        ]
    },
    {
        tags: ['turnover', 'interception'],
        priority: 20,
        variants: [
            'Great read by the defensive back.',
            'Quarterback stared down his receiver.',
            'Coverage was perfect; easy pick.',
            'Defensive back jumps the route.',
            'Turnover at the worst possible time.'
        ]
    },
    {
        tags: ['explosive'],
        priority: 18,
        variants: [
            'Outstanding blocking downfield.',
            'Speed kills; broke a tackle and gone.',
            'Perfect scheme against that coverage.',
            'Great vision to find the hole.',
            'Missed tackle turns good play into great play.'
        ]
    }
];
// Template interpolation helpers
function interpolate(template, context) {
    return template
        .replace(/\${yards}/g, Math.abs(context.yards).toString())
        .replace(/\${down}/g, context.down.toString())
        .replace(/\${toGo}/g, context.toGo.toString())
        .replace(/\${fieldPosition}/g, context.fieldPosition.toString())
        .replace(/\${clock}/g, context.clock.toString())
        .replace(/\${quarter}/g, context.quarter.toString());
}
// Select best template for given tags and context
function selectBestTemplate(templates, tags, context, rng) {
    const matchingTemplates = templates.filter(template => {
        // Check if template tags are subset of available tags
        const hasAllTags = template.tags.every(tag => tags.includes(tag));
        // Check additional conditions if present
        const conditionsMet = !template.conditions || template.conditions(context);
        return hasAllTags && conditionsMet;
    });
    if (matchingTemplates.length === 0)
        return null;
    // Sort by priority (highest first) and pick randomly among highest priority
    matchingTemplates.sort((a, b) => b.priority - a.priority);
    const first = matchingTemplates[0];
    if (!first)
        return null;
    const highestPriority = first.priority;
    const topTemplates = matchingTemplates.filter(t => t.priority === highestPriority);
    if (topTemplates.length === 0)
        return null;
    const idx = Math.floor(rng() * topTemplates.length);
    return topTemplates[Math.min(idx, topTemplates.length - 1)] || null;
}
// Generate commentary for a set of tags
export function generateCommentary(tags, context, rng, type = 'pbp') {
    // Check if we have enhanced taglines for key tags (Phase G requirement)
    for (const tag of tags) {
        const tagKey = tag;
        if (taglinesData.commentary_variants[tagKey]) {
            // Use tagline variant with deterministic selection for testing
            const variants = taglinesData.commentary_variants[tagKey].variants;
            const variantIndex = Math.floor(rng() * variants.length);
            const variant = variants[variantIndex];
            return interpolate(variant, context);
        }
    }
    // Fall back to existing template system
    const templates = type === 'pbp' ? COMMENTARY_TEMPLATES : ANALYST_TEMPLATES;
    // Try to find the best matching template
    const template = selectBestTemplate(templates, tags, context, rng);
    if (!template) {
        // Fallback to generic commentary
        if (type === 'pbp') {
            if (context.yards > 0) {
                return `Gain of ${context.yards} yards.`;
            }
            else if (context.yards < 0) {
                return `Loss of ${Math.abs(context.yards)} yards.`;
            }
            else {
                return 'No gain on the play.';
            }
        }
        else {
            return 'Solid execution by the offense.';
        }
    }
    // Select a random variant and interpolate
    const vIdx = Math.floor(rng() * Math.max(1, template.variants.length));
    const variant = template.variants[Math.min(vIdx, Math.max(0, template.variants.length - 1))] || '';
    return interpolate(variant, context);
}
// Generate commentary for dice outcomes with penalties
export function generatePenaltyCommentary(tags, context, penaltyInfo, accepted, rng) {
    const penaltyTags = tags.filter(tag => tag.includes('penalty') ||
        ['offsides', 'false_start', 'holding', 'pass_interference', 'roughing'].includes(tag));
    let pbp = '';
    let analyst = '';
    if (accepted) {
        const penaltyLabel = penaltyInfo.label;
        const penaltyYards = penaltyInfo.yards || 0;
        // Use enhanced penalty variants (Phase G requirement)
        const penaltyKey = penaltyLabel.toLowerCase().replace(/[^a-z]/g, '');
        if (taglinesData.penalty_variants[penaltyKey]) {
            const variants = taglinesData.penalty_variants[penaltyKey].variants;
            const variantIndex = Math.floor(rng() * variants.length);
            pbp = variants[variantIndex];
        }
        else {
            // Fallback to generic penalty commentary
            if (penaltyInfo.side === 'offense') {
                pbp = `Offensive penalty: ${penaltyLabel}. Loss of ${penaltyYards} yards.`;
            }
            else if (penaltyInfo.side === 'defense') {
                pbp = `Defensive penalty: ${penaltyLabel}. ${penaltyYards > 0 ? `Gain of ${penaltyYards} yards.` : 'No yardage change.'}`;
                if (penaltyInfo.auto_first_down) {
                    pbp += ' Automatic first down.';
                }
            }
            else {
                pbp = `Offsetting penalties: ${penaltyLabel}. Play will be replayed.`;
            }
        }
        analyst = 'Discipline is key; that penalty stalls the drive.';
    }
    else {
        pbp = `Penalty declined. ${generateCommentary(tags.filter(t => !penaltyTags.includes(t)), context, rng, 'pbp')}`;
        analyst = 'Smart decision to decline; better field position.';
    }
    return { pbp, analyst };
}
// Generate commentary for turnover returns
export function generateTurnoverReturnCommentary(tags, context, returnYards, rng) {
    const turnoverType = tags.includes('interception') ? 'interception' : 'fumble';
    let pbp = '';
    let analyst = '';
    if (returnYards > 0) {
        if (returnYards >= 20) {
            pbp = `${turnoverType === 'interception' ? 'Interception' : 'Fumble'} returned ${returnYards} yards!`;
            analyst = 'Great field position after the turnover.';
        }
        else {
            pbp = `${turnoverType === 'interception' ? 'Interception' : 'Fumble'} returned ${returnYards} yards.`;
            analyst = 'Returner makes something out of nothing.';
        }
    }
    else {
        pbp = `${turnoverType === 'interception' ? 'Interception' : 'Fumble'} at the line of scrimmage.`;
        analyst = 'Defense just falls on the ball; no return.';
    }
    return { pbp, analyst };
}
// Generate commentary for out of bounds plays
export function generateOOBCommentary(tags, context, rng) {
    if (context.yards > 0) {
        return `Completion goes out of bounds after ${context.yards} yards.`;
    }
    else {
        return 'Pass goes out of bounds, incomplete.';
    }
}
//# sourceMappingURL=CommentaryEngine.js.map