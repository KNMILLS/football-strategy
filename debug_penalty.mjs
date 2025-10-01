import { PenaltyTableSchema } from './src/data/schemas/MatchupTable.ts';

const validPenaltyTable = {
  version: 'v1',
  entries: {
    '1': { side: 'offense', yards: -15, loss_of_down: true, label: 'Offensive Holding' },
    '2': { side: 'offense', yards: -15, label: 'Personal Foul' },
    '3': { side: 'offense', yards: -10, label: 'Offensive Holding' },
    '4': { side: 'offense', yards: -5, replay_down: true, label: 'False Start' },
    '5': { side: 'offense', yards: 0, replay_down: true, label: 'Offsetting Penalties' },
    '6': { side: 'defense', yards: 5, replay_down: true, label: 'Encroachment' },
    '7': { side: 'defense', yards: 5, label: 'Offside' },
    '8': { side: 'defense', yards: 10, label: 'Illegal Hands to the Face' },
    '9': { side: 'defense', yards: 10, auto_first_down: true, label: 'Defensive Holding' },
    '10': { side: 'defense', yards: 15, auto_first_down: true, label: 'Personal Foul' },
  },
};

const result = PenaltyTableSchema.safeParse(validPenaltyTable);
console.log('Success:', result.success);
if (!result.success) {
  console.log('Error:', result.error.message);
}
