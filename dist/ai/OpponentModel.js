function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
export function toDistanceBucket(toGo) {
    if (toGo <= 1)
        return 1;
    if (toGo <= 3)
        return '2-3';
    if (toGo <= 6)
        return '4-6';
    if (toGo <= 10)
        return '7-10';
    if (toGo <= 15)
        return '11-15';
    return '16+';
}
export function toFieldZone(ballOnFromHome, offenseIsHome) {
    const abs = offenseIsHome ? ballOnFromHome : (100 - ballOnFromHome);
    if (abs <= 5)
        return 'own_gl';
    if (abs <= 19)
        return 'backed';
    if (abs <= 39)
        return 'own';
    if (abs <= 59)
        return 'mid';
    if (abs <= 79)
        return 'plus';
    return 'red';
}
export function toClockPhase(quarter, clock) {
    if (clock <= 120)
        return 'two_min';
    if (quarter === 4 && clock <= 6 * 60)
        return 'Q4-late';
    if (quarter === 4)
        return 'Q4-early';
    if (quarter === 3)
        return 'Q3';
    if (quarter === 2)
        return 'Q2';
    return 'Q1';
}
export function toScoreState(offenseScore, defenseScore) {
    const diff = offenseScore - defenseScore;
    if (diff === 0)
        return 'tied';
    const margin = Math.abs(diff);
    const bucket = (() => {
        if (margin <= 1)
            return 1;
        if (margin <= 3)
            return '2-3';
        if (margin <= 7)
            return '4-7';
        if (margin <= 14)
            return '8-14';
        return '15+';
    })();
    return (diff > 0 ? `lead:${bucket}` : `trail:${bucket}`);
}
function keyString(k) {
    return `${k.down}|${k.dist}|${k.zone}|${k.score}|${k.clock}`;
}
export class OpponentModel {
    offenseCounts = new Map();
    defenseCounts = new Map();
    decay;
    alpha;
    constructor(opts) {
        const halfLife = Math.max(1, Math.floor(opts?.halfLife ?? 12));
        // Convert half-life to per-update decay factor d where weight *= d per play
        // After H plays, weight halves => d^H = 0.5 => d = 0.5^(1/H)
        this.decay = Math.pow(0.5, 1 / halfLife);
        this.alpha = opts?.alpha ?? 0.5;
    }
    reset() {
        this.offenseCounts.clear();
        this.defenseCounts.clear();
    }
    decayAll(m) {
        for (const [k, counts] of m) {
            let total = 0;
            for (const c of Object.keys(counts)) {
                const current = counts[c] ?? 0;
                const decayed = current * this.decay;
                counts[c] = decayed;
                total += decayed;
            }
            // Drop tiny entries to keep map small
            if (total < 1e-3)
                m.delete(k);
        }
    }
    stepDecay() {
        this.decayAll(this.offenseCounts);
        this.decayAll(this.defenseCounts);
    }
    recordOffense(k, bucket) {
        const ks = keyString(k);
        const row = this.offenseCounts.get(ks) || Object.create(null);
        row[bucket] = (row[bucket] || 0) + 1;
        this.offenseCounts.set(ks, row);
    }
    recordDefense(k, bucket) {
        const ks = keyString(k);
        const row = this.defenseCounts.get(ks) || Object.create(null);
        row[bucket] = (row[bucket] || 0) + 1;
        this.defenseCounts.set(ks, row);
    }
    predictOffense(k) {
        const ks = keyString(k);
        const counts = this.offenseCounts.get(ks) || {};
        const cats = ['run_mid', 'run_edge', 'pass_short', 'pass_deep', 'gadget'];
        let total = 0;
        const smoothed = {
            run_mid: this.alpha,
            run_edge: this.alpha,
            pass_short: this.alpha,
            pass_deep: this.alpha,
            gadget: this.alpha,
        };
        for (const c of cats) {
            smoothed[c] += counts[c] || 0;
            total += smoothed[c];
        }
        const probs = Object.fromEntries(cats.map(c => [c, (smoothed[c] || 0) / (total || 1)]));
        const ess = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
        const uncertainty = 1 / (1 + ess);
        return { probs, uncertainty };
    }
    predictDefense(k) {
        const ks = keyString(k);
        const counts = this.defenseCounts.get(ks) || {};
        const cats = ['goal_line', 'short_yd', 'inside_blitz', 'outside_blitz', 'balanced', 'passing', 'prevent', 'prevent_deep'];
        let total = 0;
        const smoothed = Object.create(null);
        for (const c of cats) {
            smoothed[c] = (counts[c] || 0) + this.alpha;
            total += smoothed[c];
        }
        const probs = Object.fromEntries(cats.map(c => [c, (smoothed[c] || 0) / (total || 1)]));
        const ess = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
        const uncertainty = 1 / (1 + ess);
        return { probs, uncertainty };
    }
    // Utility helpers to build model keys from state and perspective
    buildKeyFromState(st, offenseIsHome) {
        const down = clamp(st.down, 1, 4);
        const dist = toDistanceBucket(st.toGo);
        const zone = toFieldZone(st.ballOn, offenseIsHome);
        const clock = toClockPhase(st.quarter, st.clock);
        const offScore = st.score[(st.possession === 'player') ? 'player' : 'ai'];
        const defScore = st.score[(st.possession === 'player') ? 'ai' : 'player'];
        const score = toScoreState(offScore, defScore);
        return { down, dist, zone, score, clock };
    }
}
export function categorizeOffenseLabel(label) {
    const l = label.toLowerCase();
    if (/reverse|razzle|flea|double pass|end around/.test(l))
        return 'gadget';
    if (/end run|outside|sweep|toss/.test(l))
        return 'run_edge';
    if (/long bomb|deep|post|corner|stop & go|streak/.test(l))
        return 'pass_deep';
    if (/pass|hook|look in|sideline|flair|flare|pop|button|down & (in|out)|screen|quick|slant/.test(l))
        return 'pass_short';
    return 'run_mid';
}
export function categorizeDefenseLabel(label) {
    const l = label.toLowerCase();
    if (/goal line/.test(l))
        return 'goal_line';
    if (/short yardage/.test(l))
        return 'short_yd';
    if (/inside blitz/.test(l))
        return 'inside_blitz';
    if (/outside blitz/.test(l))
        return 'outside_blitz';
    if (/prevent deep/.test(l))
        return 'prevent_deep';
    if (/prevent/.test(l))
        return 'prevent';
    if (/passing/.test(l))
        return 'passing';
    return 'balanced';
}
//# sourceMappingURL=OpponentModel.js.map