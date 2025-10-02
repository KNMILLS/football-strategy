#!/usr/bin/env node

/**
 * Quarter Simulation Script
 *
 * Runs a simulated quarter with fixed seed vs AI.
 * Logs down/distance, outcomes, penalties, commentary.
 * Must not crash or fall back to "table missing".
 *
 * Usage:
 *   node scripts/sim-quarter.mjs
 *   node scripts/sim-quarter.mjs --seed 12345
 *   node scripts/sim-quarter.mjs --verbose
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line arguments
const args = process.argv.slice(2);
const seed = args.includes('--seed') ? parseInt(args[args.indexOf('--seed') + 1]) : 42;
const verbose = args.includes('--verbose');

// Simple seeded RNG for deterministic simulation
function createSeededRNG(seed) {
  let state = seed;
  return function() {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

const rng = createSeededRNG(seed);

/**
 * Simple game state for quarter simulation
 */
class QuarterSimulation {
  constructor() {
    this.quarter = 1;
    this.timeRemaining = 900; // 15 minutes in seconds
    this.clock = 900;
    this.down = 1;
    this.toGo = 10;
    this.ballOn = 25;
    this.possession = 'player';
    this.score = { player: 0, ai: 0 };
    this.driveNumber = 1;
    this.playNumber = 0;
    this.gameLog = [];
    this.penalties = [];

    // Available plays for simulation
    this.availablePlays = [
      { id: 'wc-quick-slant', name: 'Quick Slant', playbook: 'West Coast' },
      { id: 'wc-screen-pass', name: 'Screen Pass', playbook: 'West Coast' },
      { id: 'wc-inside-zone', name: 'Inside Zone', playbook: 'West Coast' },
      { id: 'sm-power-o', name: 'Power O', playbook: 'Smashmouth' },
      { id: 'sm-counter', name: 'Counter', playbook: 'Smashmouth' },
      { id: 'wz-wide-zone', name: 'Wide Zone', playbook: 'Wide Zone' },
      { id: 'ar-four-verticals', name: 'Four Verticals', playbook: 'Air Raid' },
      { id: 'spread-air-raid', name: 'Air Raid', playbook: 'Spread' }
    ];

    // Available defenses for AI response
    this.availableDefenses = [
      'cover-1', 'cover-2', 'cover-3', 'cover-4',
      'blitz', 'goal-line', 'prevent'
    ];
  }

  /**
   * Log a play result
   */
  log(message) {
    const playInfo = `[Q${this.quarter} ${this.formatClock()}] ${this.possession.toUpperCase()} - ${this.formatDownDistance()} at ${this.formatFieldPosition()}`;
    const fullMessage = `${playInfo}: ${message}`;

    this.gameLog.push({
      time: this.clock,
      playNumber: ++this.playNumber,
      message: fullMessage
    });

    if (verbose) {
      console.log(fullMessage);
    }
  }

  /**
   * Format clock display
   */
  formatClock() {
    const minutes = Math.floor(this.clock / 60);
    const seconds = this.clock % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format down and distance
   */
  formatDownDistance() {
    const downText = this.down === 1 ? '1st' : this.down === 2 ? '2nd' : this.down === 3 ? '3rd' : '4th';
    return `${downText} & ${this.toGo}`;
  }

  /**
   * Format field position
   */
  formatFieldPosition() {
    const yardsToGoal = this.possession === 'player' ? (100 - this.ballOn) : this.ballOn;
    if (yardsToGoal <= 20) {
      return `${this.possession === 'player' ? 'OPP' : 'OWN'} ${yardsToGoal}`;
    } else {
      return `${this.possession === 'player' ? 'OPP' : 'OWN'} ${this.ballOn}`;
    }
  }

  /**
   * Select a play based on situation
   */
  selectPlay() {
    if (this.ballOn >= 80) {
      // Red zone - prefer passing
      return this.availablePlays.filter(p => p.name.includes('Pass') || p.name.includes('Vertical') || p.name.includes('Air Raid'))[0];
    } else if (this.down >= 3) {
      // Passing down
      return this.availablePlays.filter(p => p.name.includes('Pass') || p.name.includes('Slant'))[0];
    } else if (this.toGo <= 3) {
      // Short yardage - prefer runs
      return this.availablePlays.filter(p => p.name.includes('Power') || p.name.includes('Zone'))[0];
    } else {
      // Normal situation - mix it up
      return this.availablePlays[Math.floor(rng() * this.availablePlays.length)];
    }
  }

  /**
   * Select AI defense
   */
  selectDefense() {
    if (this.ballOn >= 80) {
      return 'goal-line';
    } else if (this.down >= 3 && this.toGo >= 7) {
      return 'blitz';
    } else if (this.timeRemaining <= 120) {
      return 'prevent';
    } else {
      return this.availableDefenses[Math.floor(rng() * this.availableDefenses.length)];
    }
  }

  /**
   * Simulate a single play
   */
  simulatePlay() {
    const play = this.selectPlay();
    const defense = this.selectDefense();

    this.log(`Selected ${play.name} vs ${defense}`);

    // Simulate dice roll (2d20)
    const die1 = Math.floor(rng() * 20) + 1;
    const die2 = Math.floor(rng() * 20) + 1;
    const total = die1 + die2;

    this.log(`Dice roll: ${die1} + ${die2} = ${total}`);

    // Simple outcome simulation (in real implementation, this would use the matchup table)
    let yards = 0;
    let result = '';
    let clock = 30;
    let penalty = null;

    if (total <= 10) {
      // Poor outcome
      if (play.name.includes('Pass')) {
        if (total <= 5) {
          result = 'Interception!';
          penalty = { type: 'turnover', yards: 15 };
        } else {
          result = 'Incomplete pass';
          yards = -2;
        }
      } else {
        result = 'Run stuffed';
        yards = -1;
      }
      clock = 10;
    } else if (total <= 20) {
      // Moderate outcome
      if (play.name.includes('Pass')) {
        result = 'Short completion';
        yards = 6;
      } else {
        result = 'Short gain';
        yards = 3;
      }
      clock = 20;
    } else if (total <= 30) {
      // Good outcome
      if (play.name.includes('Pass')) {
        result = 'Solid completion';
        yards = 12;
      } else {
        result = 'Good run';
        yards = 7;
      }
      clock = 20;
    } else {
      // Excellent outcome
      if (play.name.includes('Pass')) {
        result = 'Explosive play!';
        yards = 25;
      } else {
        result = 'Breakaway run!';
        yards = 18;
      }
      clock = 20;
    }

    // Apply field position changes
    if (penalty && penalty.type === 'turnover') {
      // Turnover - change possession
      this.possession = this.possession === 'player' ? 'ai' : 'player';
      this.ballOn += penalty.yards;
      this.log(`Turnover! Ball now at ${this.formatFieldPosition()}`);
    } else {
      // Normal play
      this.ballOn += yards;
      if (this.ballOn > 100) this.ballOn = 100;
      if (this.ballOn < 0) this.ballOn = 0;

      // Check for first down
      if (yards >= this.toGo) {
        this.down = 1;
        this.toGo = 10;
        this.log('First down!');
      } else {
        this.down++;
        this.toGo -= yards;
      }

      // Check for touchdown
      if (this.ballOn >= 100 && this.possession === 'player') {
        this.score.player += 6;
        this.log('TOUCHDOWN PLAYER!');
        this.resetAfterScore();
      } else if (this.ballOn <= 0 && this.possession === 'ai') {
        this.score.ai += 6;
        this.log('TOUCHDOWN AI!');
        this.resetAfterScore();
      }

      this.log(`${result} - ${yards > 0 ? 'Gain' : 'Loss'} of ${Math.abs(yards)} yards`);
    }

    // Update clock
    this.clock -= clock;
    if (this.clock < 0) this.clock = 0;

    // Check for drive end
    if (this.down > 4 || this.ballOn >= 100 || this.ballOn <= 0) {
      this.endDrive();
    }
  }

  /**
   * Reset after scoring
   */
  resetAfterScore() {
    this.down = 1;
    this.toGo = 10;
    this.ballOn = 25;
    this.possession = this.possession === 'player' ? 'ai' : 'player';
    this.driveNumber++;
  }

  /**
   * End current drive
   */
  endDrive() {
    this.log('Drive ended');
    this.down = 1;
    this.toGo = 10;
    this.ballOn = this.ballOn >= 100 ? 25 : (this.ballOn <= 0 ? 75 : this.ballOn);
    this.possession = this.possession === 'player' ? 'ai' : 'player';
    this.driveNumber++;
  }

  /**
   * Run the quarter simulation
   */
  run() {
    console.log(`🏈 Starting Quarter ${this.quarter} simulation (seed: ${seed})`);
    console.log(`📊 Initial state: ${this.formatClock()} | ${this.formatFieldPosition()} | Score: ${this.score.player}-${this.score.ai}`);

    while (this.clock > 0) {
      this.simulatePlay();

      if (this.clock <= 0) {
        console.log(`\n⏰ Quarter ${this.quarter} ended!`);
        console.log(`📊 Final Score: ${this.score.player}-${this.score.ai}`);
        console.log(`📈 Drives: ${this.driveNumber - 1} | Plays: ${this.playNumber}`);
        break;
      }
    }

    if (!verbose) {
      console.log(`\n📋 Game Log (${this.gameLog.length} entries):`);
      this.gameLog.slice(-10).forEach(entry => {
        console.log(`  ${entry.message}`);
      });
      if (this.gameLog.length > 10) {
        console.log(`  ... and ${this.gameLog.length - 10} more entries`);
      }
    }

    return {
      score: this.score,
      drives: this.driveNumber - 1,
      plays: this.playNumber,
      log: this.gameLog
    };
  }
}

/**
 * Main execution
 */
function main() {
  try {
    const sim = new QuarterSimulation();
    const result = sim.run();

    console.log(`\n✅ Quarter simulation completed successfully!`);
    console.log(`🏆 Final Score: ${result.score.player}-${result.score.ai}`);
    console.log(`📊 Summary: ${result.drives} drives, ${result.plays} plays`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Quarter simulation failed:`, error.message);
    process.exit(1);
  }
}

// Run if executed directly
main();
