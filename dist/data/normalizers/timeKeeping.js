import { TimeKeepingSchema, TimeKeepingFlatSchema } from '../schemas/Timekeeping';
export function toTimeKeeping(json) {
    const preParsed = TimeKeepingSchema.safeParse(json);
    if (preParsed.success) {
        const data = preParsed.data;
        if (data && typeof data === 'object' && !('rules' in data)) {
            const flat = TimeKeepingFlatSchema.safeParse(data);
            if (flat.success)
                return flat.data;
        }
        // Transform from rich schema
        try {
            const rules = Array.isArray(data?.rules) ? data.rules : [];
            const find = (event) => rules.find((r) => r?.event === event) || {};
            const abs = (n) => (typeof n === 'number' ? Math.abs(n) : 0);
            const required = ['gain_in_bounds_0_to_20', 'gain_in_bounds_20_plus', 'all_plays_for_loss', 'out_of_bounds', 'incomplete_pass', 'interception', 'penalty', 'fumble', 'kickoff_fg_punt_in_bounds', 'extra_point'];
            if (!required.some((ev) => !!find(ev).event))
                return undefined;
            const tk = {
                gain0to20: Number(find('gain_in_bounds_0_to_20').duration) || 30,
                gain20plus: Number(find('gain_in_bounds_20_plus').duration) || 45,
                loss: Number(find('all_plays_for_loss').duration) || 30,
                outOfBounds: abs(find('out_of_bounds').adjustment) || 15,
                incomplete: abs(find('incomplete_pass').adjustment) || 15,
                interception: abs(find('interception').adjustment) || 30,
                penalty: abs(find('penalty').adjustment) || 15,
                fumble: abs(find('fumble').adjustment) || 15,
                kickoff: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
                fieldgoal: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
                punt: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
                extraPoint: abs(find('extra_point').adjustment) || 0,
            };
            const parsed = TimeKeepingFlatSchema.safeParse(tk);
            return parsed.success ? parsed.data : undefined;
        }
        catch {
            return undefined;
        }
    }
    try {
        const rules = Array.isArray(json?.rules) ? json.rules : [];
        const find = (event) => rules.find((r) => r?.event === event) || {};
        const abs = (n) => (typeof n === 'number' ? Math.abs(n) : 0);
        if (!Array.isArray(json?.rules) || json.rules.length === 0)
            return undefined;
        const tk = {
            gain0to20: Number(find('gain_in_bounds_0_to_20').duration) || 30,
            gain20plus: Number(find('gain_in_bounds_20_plus').duration) || 45,
            loss: Number(find('all_plays_for_loss').duration) || 30,
            outOfBounds: abs(find('out_of_bounds').adjustment) || 15,
            incomplete: abs(find('incomplete_pass').adjustment) || 15,
            interception: abs(find('interception').adjustment) || 30,
            penalty: abs(find('penalty').adjustment) || 15,
            fumble: abs(find('fumble').adjustment) || 15,
            kickoff: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
            fieldgoal: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
            punt: abs(find('kickoff_fg_punt_in_bounds').adjustment) || 15,
            extraPoint: abs(find('extra_point').adjustment) || 0,
        };
        const parsed = TimeKeepingFlatSchema.safeParse(tk);
        return parsed.success ? parsed.data : undefined;
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=timeKeeping.js.map