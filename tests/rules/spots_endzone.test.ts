import { describe, it, expect } from 'vitest';
import { isInEndZone, isThroughEndZone, touchbackSpot, interceptionTouchback, kickoffTouchback, puntTouchback, missedFieldGoalSpot } from '../../src/rules/Spots';

describe('Spots end-zone and touchbacks', () => {
  it('end zone and through checks', () => {
    expect(isInEndZone(0)).toBe(true);
    expect(isInEndZone(100)).toBe(true);
    expect(isInEndZone(1)).toBe(false);
    expect(isThroughEndZone(-1)).toBe(true);
    expect(isThroughEndZone(101)).toBe(true);
  });

  it('kickoff and punt touchbacks to correct 20s', () => {
    expect(kickoffTouchback('player')).toEqual({ ballOn: 20, possession: 'player' });
    expect(kickoffTouchback('ai')).toEqual({ ballOn: 80, possession: 'ai' });
    expect(puntTouchback('player')).toEqual({ ballOn: 20, possession: 'player' });
    expect(puntTouchback('ai')).toEqual({ ballOn: 80, possession: 'ai' });
  });

  it('interception touchback from either side stays with new offense at 20', () => {
    expect(interceptionTouchback({ ballOn: 0, possessing: 'player' })).toEqual({ ballOn: 20, possession: 'player' });
    expect(interceptionTouchback({ ballOn: 100, possessing: 'ai' })).toEqual({ ballOn: 80, possession: 'ai' });
  });

  it('missed FG: spot-of-kick vs 20 boundary cases', () => {
    // Player misses from HOME 30 (LOS 30): spot of kick is 23 -> max(20, 23) = 23
    let res = missedFieldGoalSpot({ ballOn: 30, possessing: 'player' }, 47);
    expect(res).toEqual({ ballOn: 23, possession: 'ai' });
    // Player misses from HOME 18: spot is 11; legacy simplified rule takes spot (<=80)
    res = missedFieldGoalSpot({ ballOn: 18, possessing: 'player' }, 35);
    expect(res).toEqual({ ballOn: 11, possession: 'ai' });
    // AI misses from AWAY 70 (abs): spot is 77 -> min(80, 77) = 77 to player
    res = missedFieldGoalSpot({ ballOn: 70, possessing: 'ai' }, 47);
    expect(res).toEqual({ ballOn: 77, possession: 'player' });
    // AI misses from AWAY 85: spot 92 -> simplified legacy may take spot
    res = missedFieldGoalSpot({ ballOn: 85, possessing: 'ai' }, 57);
    expect(res).toEqual({ ballOn: 92, possession: 'player' });
  });
});


