import { describe, it, expect, beforeEach } from 'vitest';
import { createLCG } from '../../src/sim/RNG';
import { resolveSnap, rollD20, rollD10 } from '../../src/rules/ResolveSnap';
import type { GameState } from '../../src/domain/GameState';
import type { MatchupTable, PenaltyTable } from '../../src/data/schemas/MatchupTable';

// Test data
const createTestGameState = (ballOn = 50, down = 1, toGo = 10): GameState => ({
  seed: 12345,
  quarter: 1,
  clock: 15 * 60,
  down,
  toGo,
  ballOn,
  possession: 'player',
  awaitingPAT: false,
  gameOver: false,
  score: { player: 0, ai: 0 }
});

const createTestMatchupTable = (): MatchupTable => ({
  version: '1.0',
  off_card: 'TEST_OFF',
  def_card: 'TEST_DEF',
  dice: '2d20',
  entries: {
    '3': { yards: -5, clock: '10', tags: ['turnover'] },
    '4': { yards: 0, clock: '20', tags: ['incomplete'] },
    '5': { yards: 5, clock: '30', tags: ['short'] },
    '6': { yards: 10, clock: '30', tags: ['moderate'] },
    '7': { yards: 15, clock: '30', tags: ['moderate'] },
    '8': { yards: 20, clock: '30', tags: ['moderate'] },
    '9': { yards: 25, clock: '30', tags: ['moderate'] },
    '10': { yards: 30, clock: '30', tags: ['moderate'] },
    '11': { yards: 35, clock: '30', tags: ['moderate'] },
    '12': { yards: 40, clock: '30', tags: ['moderate'] },
    '13': { yards: 45, clock: '30', tags: ['moderate'] },
    '14': { yards: 50, clock: '30', tags: ['moderate'] },
    '15': { yards: 55, clock: '30', tags: ['moderate'] },
    '16': { yards: 60, clock: '30', tags: ['moderate'] },
    '17': { yards: 65, clock: '30', tags: ['moderate'] },
    '18': { yards: 70, clock: '30', tags: ['moderate'] },
    '19': { yards: 75, clock: '30', tags: ['moderate'] },
    '20': { yards: 80, clock: '30', tags: ['moderate'] },
    '21': { yards: 85, clock: '30', tags: ['moderate'] },
    '22': { yards: 90, clock: '30', tags: ['moderate'] },
    '23': { yards: 95, clock: '30', tags: ['moderate'] },
    '24': { yards: 100, clock: '30', tags: ['moderate'] },
    '25': { yards: 105, clock: '30', tags: ['moderate'] },
    '26': { yards: 110, clock: '30', tags: ['moderate'] },
    '27': { yards: 115, clock: '30', tags: ['moderate'] },
    '28': { yards: 120, clock: '30', tags: ['moderate'] },
    '29': { yards: 125, clock: '30', tags: ['moderate'] },
    '30': { yards: 130, clock: '30', tags: ['moderate'] },
    '31': { yards: 135, clock: '30', tags: ['moderate'] },
    '32': { yards: 140, clock: '30', tags: ['moderate'] },
    '33': { yards: 145, clock: '30', tags: ['moderate'] },
    '34': { yards: 150, clock: '30', tags: ['moderate'] },
    '35': { yards: 155, clock: '30', tags: ['moderate'] },
    '36': { yards: 160, clock: '30', tags: ['moderate'] },
    '37': { yards: 165, clock: '30', tags: ['moderate'] },
    '38': { yards: 170, clock: '30', tags: ['moderate'] },
    '39': { yards: 175, clock: '30', tags: ['moderate'] }
  },
  doubles: {
    '1': { result: 'DEF_TD' },
    '20': { result: 'OFF_TD' },
    '2-19': { penalty_table_ref: 'PENALTY_1_TO_10' }
  },
  meta: {
    oob_bias: false,
    field_pos_clamp: true,
    risk_profile: 'medium',
    explosive_start_sum: 25
  }
});

const createTestPenaltyTable = (): PenaltyTable => ({
  version: '1.0',
  entries: {
    '1': { side: 'offense', yards: -15, loss_of_down: true, label: 'Offense: -15 yards + Loss of Down' },
    '2': { side: 'offense', yards: -15, label: 'Offense: -15 yards personal foul' },
    '3': { side: 'offense', yards: -10, label: 'Offense: -10 yards holding' },
    '4': { side: 'offense', yards: -5, replay_down: true, override_play_result: true, label: 'Offense: -5 yards false start, replay down' },
    '5': { side: 'offset', replay_down: true, override_play_result: true, label: 'Offsetting penalties, replay down' },
    '6': { side: 'defense', yards: 5, replay_down: true, override_play_result: true, label: 'Defense: +5 yards encroachment, replay down' },
    '7': { side: 'defense', yards: 5, label: 'Defense: +5 yards offside' },
    '8': { side: 'defense', yards: 10, label: 'Defense: +10 yards illegal use of hands' },
    '9': { side: 'defense', yards: 10, auto_first_down: true, label: 'Defense: +10 yards + auto first down' },
    '10': { side: 'defense', yards: 15, auto_first_down: true, label: 'Defense: +15 yards + auto first down' }
  }
});

describe('resolveSnap', () => {
  let rng: () => number;
  let state: GameState;
  let matchupTable: MatchupTable;
  let penaltyTable: PenaltyTable;

  beforeEach(() => {
    rng = createLCG(12345);
    state = createTestGameState();
    matchupTable = createTestMatchupTable();
    penaltyTable = createTestPenaltyTable();
  });

  describe('normal 2d20 rolls', () => {
    it('should return correct result for sum 5', () => {
      // Use a specific seed that produces 2 + 3 = 5
      const rng = createLCG(1001);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.diceRoll.d1).toBe(2);
      expect(result.diceRoll.d2).toBe(3);
      expect(result.diceRoll.sum).toBe(5);
      expect(result.baseOutcome).toBeDefined();
      expect(result.baseOutcome?.yards).toBe(5);
      expect(result.baseOutcome?.clock).toBe('30');
      expect(result.baseOutcome?.tags).toEqual(['short']);
      expect(result.doubles).toBeUndefined();
      expect(result.penalty).toBeUndefined();
      expect(result.finalYards).toBe(5);
      expect(result.finalClockRunoff).toBe(30);
      expect(result.description).toContain('5 yard gain');
    });

    it('should return correct result for sum 10', () => {
      // Use a specific seed that produces 5 + 5 = 10
      const rng = createLCG(2002);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.diceRoll.d1).toBe(5);
      expect(result.diceRoll.d2).toBe(5);
      expect(result.diceRoll.sum).toBe(10);
      expect(result.baseOutcome).toBeDefined();
      expect(result.baseOutcome?.yards).toBe(30);
      expect(result.baseOutcome?.clock).toBe('30');
      expect(result.baseOutcome?.tags).toEqual(['moderate']);
      expect(result.finalYards).toBe(30);
      expect(result.finalClockRunoff).toBe(30);
      expect(result.description).toContain('30 yard gain');
    });
  });

  describe('doubles outcomes', () => {
    it('should return DEF_TD for 1-1 doubles', () => {
      // Use a specific seed that produces 1 + 1 = 2
      const rng = createLCG(3003);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.diceRoll.d1).toBe(1);
      expect(result.diceRoll.d2).toBe(1);
      expect(result.diceRoll.sum).toBe(2);
      expect(result.doubles).toBe('DEF_TD');
      expect(result.baseOutcome).toBeUndefined();
      expect(result.penalty).toBeUndefined();
      expect(result.finalClockRunoff).toBe(30);
      expect(result.description).toContain('Defensive touchdown');
      expect(result.tags).toContain('touchdown');
    });

    it('should return OFF_TD for 20-20 doubles', () => {
      // Use a specific seed that produces 20 + 20 = 40
      const rng = createLCG(4004);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.diceRoll.d1).toBe(20);
      expect(result.diceRoll.d2).toBe(20);
      expect(result.diceRoll.sum).toBe(40);
      expect(result.doubles).toBe('OFF_TD');
      expect(result.baseOutcome).toBeUndefined();
      expect(result.penalty).toBeUndefined();
      expect(result.finalClockRunoff).toBe(30);
      expect(result.description).toContain('Offensive touchdown');
      expect(result.tags).toContain('touchdown');
    });

    it('should handle penalty override for rolls 4, 5, 6', () => {
      // Use a specific seed that produces 2 + 2 = 4, then penalty roll 4
      const rng = createLCG(5005);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.diceRoll.d1).toBe(2);
      expect(result.diceRoll.d2).toBe(2);
      expect(result.diceRoll.sum).toBe(4);
      expect(result.doubles).toBe('PENALTY');
      expect(result.penalty).toBeDefined();
      expect(result.penalty?.roll).toBe(4);
      expect(result.penalty?.overridesPlayResult).toBe(true);
      expect(result.penalty?.penaltyInfo.side).toBe('offense');
      expect(result.penalty?.penaltyInfo.replay_down).toBe(true);
      expect(result.baseOutcome).toBeUndefined();
      expect(result.finalClockRunoff).toBe(30);
      expect(result.description).toContain('forced override');
      expect(result.tags).toContain('penalty');
    });

    it('should handle penalty with base result for non-override penalties', () => {
      // Use a specific seed that produces 2 + 2 = 4, then penalty roll 7 (no override)
      const rng = createLCG(6006);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.diceRoll.d1).toBe(2);
      expect(result.diceRoll.d2).toBe(2);
      expect(result.diceRoll.sum).toBe(4);
      expect(result.doubles).toBe('PENALTY');
      expect(result.penalty).toBeDefined();
      expect(result.penalty?.roll).toBe(7);
      expect(result.penalty?.overridesPlayResult).toBe(false);
      expect(result.penalty?.penaltyInfo.side).toBe('defense');
      expect(result.penalty?.penaltyInfo.yards).toBe(5);
      expect(result.baseOutcome).toBeDefined();
      expect(result.canAcceptDecline).toBe(true);
      expect(result.finalClockRunoff).toBe(30);
      expect(result.description).toContain('with');
      expect(result.tags).toContain('penalty');
    });
  });

  describe('field position clamping', () => {
    it('should clamp yards when near goal line', () => {
      const goalLineState = createTestGameState(5, 1, 10); // 5 yards from goal

      // Use a specific seed that produces 10 + 10 = 20 (would be 100 yards)
      const rng = createLCG(7007);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, goalLineState, rng);

      expect(result.diceRoll.d1).toBe(10);
      expect(result.diceRoll.d2).toBe(10);
      expect(result.diceRoll.sum).toBe(20);
      expect(result.baseOutcome).toBeDefined();
      expect(result.finalYards).toBe(95); // Clamped to remaining field (100 - 5 = 95)
      expect(result.description).toContain('95 yard gain');
    });

    it('should handle safety when going backwards from goal line', () => {
      const goalLineState = createTestGameState(5, 1, 10); // 5 yards from goal

      // Use a specific seed that produces 1 + 1 = 2 (negative yards)
      const rng = createLCG(8008);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, goalLineState, rng);

      expect(result.diceRoll.d1).toBe(1);
      expect(result.diceRoll.d2).toBe(1);
      expect(result.diceRoll.sum).toBe(2);
      expect(result.baseOutcome).toBeDefined();
      expect(result.finalYards).toBe(-5); // Safety: ball goes to 0
      expect(result.description).toContain('5 yard loss');
    });
  });

  describe('turnover handling', () => {
    it('should handle INT turnovers correctly', () => {
      // Use a specific seed that produces 2 + 1 = 3
      const rng = createLCG(9009);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.diceRoll.d1).toBe(2);
      expect(result.diceRoll.d2).toBe(1);
      expect(result.diceRoll.sum).toBe(3);
      expect(result.baseOutcome).toBeDefined();
      expect(result.baseOutcome?.turnover).toBeDefined();
      expect(result.baseOutcome?.turnover?.type).toBe('INT');
      expect(result.finalYards).toBe(-5);
      expect(result.description).toContain('Interception');
    });
  });

  describe('clock and oob handling', () => {
    it('should preserve clock values from table', () => {
      // Use a specific seed that produces 2 + 2 = 4
      const rng = createLCG(10010);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.diceRoll.d1).toBe(2);
      expect(result.diceRoll.d2).toBe(2);
      expect(result.diceRoll.sum).toBe(4);
      expect(result.baseOutcome).toBeDefined();
      expect(result.baseOutcome?.clock).toBe('20');
      expect(result.finalClockRunoff).toBe(20);
    });
  });

  describe('edge cases', () => {
    it('should throw error for missing dice sum entry', () => {
      // Create table missing sum 5
      const incompleteTable = { ...matchupTable };
      delete incompleteTable.entries['5'];

      // Use a specific seed that produces 3 + 2 = 5
      const rng = createLCG(11011);

      expect(() => {
        resolveSnap('TEST_OFF', 'TEST_DEF', incompleteTable, penaltyTable, state, rng);
      }).toThrow('No entry found for dice sum 5');
    });
  });

  describe('clock runoff logic', () => {
    it('should use 10 seconds for OOB plays', () => {
      // Use a specific seed that produces 3 + 1 = 4 (OOB result)
      const rng = createLCG(12012);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.finalClockRunoff).toBe(10); // OOB should use 10 seconds
    });

    it('should use 20 seconds for first down plays', () => {
      // Create state where we need 5 yards for first down
      const firstDownState = createTestGameState(50, 3, 5);

      // Use a specific seed that produces 3 + 3 = 6 (6 yards > 5 needed)
      const rng = createLCG(13013);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, firstDownState, rng);

      expect(result.finalClockRunoff).toBe(20); // First down should use 20 seconds
    });

    it('should use 30 seconds for normal plays', () => {
      // Use a specific seed that produces 5 + 5 = 10 (normal gain, not first down)
      const rng = createLCG(14014);

      const result = resolveSnap('TEST_OFF', 'TEST_DEF', matchupTable, penaltyTable, state, rng);

      expect(result.finalClockRunoff).toBe(30); // Normal play should use 30 seconds
    });
  });
});

describe('rollD20', () => {
  it('should return values between 1 and 20', () => {
    const rng = createLCG(12345);

    for (let i = 0; i < 100; i++) {
      const result = rollD20(rng);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
      expect(Number.isInteger(result)).toBe(true);
    }
  });
});

describe('rollD10', () => {
  it('should return values between 1 and 10', () => {
    const rng = createLCG(12345);

    for (let i = 0; i < 100; i++) {
      const result = rollD10(rng);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    }
  });
});
