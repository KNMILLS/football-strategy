import { createLCG } from './dist/sim/RNG.js';

// Test different seeds to find ones that produce expected dice rolls
const seeds = [1001, 2002, 3003, 4004, 5005, 6006, 7007, 8008, 9009, 10010, 11011, 12012, 13013, 14014, 15015];

seeds.forEach(seed => {
  const rng = createLCG(seed);
  const d1 = Math.floor(rng() * 20) + 1;
  const d2 = Math.floor(rng() * 20) + 1;
  const sum = d1 + d2;

  console.log(`Seed ${seed}: ${d1} + ${d2} = ${sum}`);
});

// Test what seeds produce specific rolls
console.log('\nLooking for specific rolls:');
console.log('Need 2+3=5, 5+5=10, 1+1=2, 20+20=40, 2+2=4, 10+10=20, 1+1=2, 2+1=3, 3+1=4, 3+3=6');

// Let's test specific seeds for the rolls we need
const targetRolls = [
  { name: '2+3=5', d1: 2, d2: 3, sum: 5 },
  { name: '5+5=10', d1: 5, d2: 5, sum: 10 },
  { name: '20+20=40', d1: 20, d2: 20, sum: 40 },
  { name: '2+2=4', d1: 2, d2: 2, sum: 4 },
  { name: '10+10=20', d1: 10, d2: 10, sum: 20 },
  { name: '3+1=4', d1: 3, d2: 1, sum: 4 },
  { name: '3+3=6', d1: 3, d2: 3, sum: 6 },
];

// Find the missing rolls
console.log('Looking for missing rolls: 5+5=10, 20+20=40, 10+10=20, 3+1=4, 3+3=6');

let found = {};

// Look for 5+5=10
console.log('Looking for 5+5=10:');
for (let seed = 1000; seed < 20000; seed++) {
  const rng = createLCG(seed);
  const d1 = Math.floor(rng() * 20) + 1;
  const d2 = Math.floor(rng() * 20) + 1;

  if (d1 === 5 && d2 === 5) {
    console.log(`5+5=10 seed: ${seed}`);
    found['5+5=10'] = seed;
    break;
  }
}

// Look for 20+20=40
console.log('Looking for 20+20=40:');
for (let seed = 1000; seed < 20000; seed++) {
  const rng = createLCG(seed);
  const d1 = Math.floor(rng() * 20) + 1;
  const d2 = Math.floor(rng() * 20) + 1;

  if (d1 === 20 && d2 === 20) {
    console.log(`20+20=40 seed: ${seed}`);
    found['20+20=40'] = seed;
    break;
  }
}

// Look for 10+10=20
console.log('Looking for 10+10=20:');
for (let seed = 1000; seed < 20000; seed++) {
  const rng = createLCG(seed);
  const d1 = Math.floor(rng() * 20) + 1;
  const d2 = Math.floor(rng() * 20) + 1;

  if (d1 === 10 && d2 === 10) {
    console.log(`10+10=20 seed: ${seed}`);
    found['10+10=20'] = seed;
    break;
  }
}

// Look for 3+1=4
console.log('Looking for 3+1=4:');
for (let seed = 1000; seed < 20000; seed++) {
  const rng = createLCG(seed);
  const d1 = Math.floor(rng() * 20) + 1;
  const d2 = Math.floor(rng() * 20) + 1;

  if (d1 === 3 && d2 === 1) {
    console.log(`3+1=4 seed: ${seed}`);
    found['3+1=4'] = seed;
    break;
  }
}

// Look for 3+3=6
console.log('Looking for 3+3=6:');
for (let seed = 1000; seed < 20000; seed++) {
  const rng = createLCG(seed);
  const d1 = Math.floor(rng() * 20) + 1;
  const d2 = Math.floor(rng() * 20) + 1;

  if (d1 === 3 && d2 === 3) {
    console.log(`3+3=6 seed: ${seed}`);
    found['3+3=6'] = seed;
    break;
  }
}

// Test penalty rolls (d10)
console.log('\nTesting penalty rolls (d10) for seeds 5000-6000:');
for (let seed = 5000; seed < 6000; seed++) {
  const rng = createLCG(seed);
  // Skip first 2 calls (2d20)
  rng(); rng();
  const penaltyRoll = Math.floor(rng() * 10) + 1;

  if (penaltyRoll === 4 || penaltyRoll === 7) {
    console.log(`Penalty roll ${penaltyRoll} seed: ${seed}`);
  }
}
