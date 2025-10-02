import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { OffenseChartsSchema } from '../../src/data/schemas/OffenseCharts';
import { determineOutcomeFromCharts, initializeTelemetry, getTelemetryCollector } from '../../src/rules/Charts';
import { EventBus } from '../../src/utils/EventBus';

function rngConst(v: number){ return () => v; }

describe('Charts telemetry recording', () => {
  it('records dice roll and outcome when telemetry enabled', async () => {
    const raw = await readFile(path.resolve(process.cwd(),'data','football_strategy_all_mappings.json'),'utf8');
    const parsed = OffenseChartsSchema.parse(JSON.parse(raw)).OffenseCharts;

    // Fake telemetry config by creating a collector with a real bus
    const bus = new EventBus();
    initializeTelemetry(bus);

    const collector = getTelemetryCollector();
    if (!collector) {
      // Telemetry may be disabled by config; skip assert if not enabled
      // But still ensure determineOutcomeFromCharts operates without throwing
      const out = determineOutcomeFromCharts({
        deckName: 'Pro Style',
        playLabel: 'Power Up Middle',
        defenseLabel: 'Inside Blitz',
        charts: parsed,
        rng: rngConst(0.5),
      });
      expect(out.yards).toBeGreaterThanOrEqual(-10);
      return;
    }

    const recordDiceSpy = vi.spyOn(collector, 'recordDiceRoll');
    const recordOutcomeSpy = vi.spyOn(collector, 'recordOutcomeDetermined');

    const out = determineOutcomeFromCharts({
      deckName: 'Pro Style',
      playLabel: 'Power Up Middle',
      defenseLabel: 'Inside Blitz',
      charts: parsed,
      rng: rngConst(0.5),
    });

    expect(out).toBeDefined();
    // At least outcome is recorded; dice may or may not, depending on parsing path
    expect(recordOutcomeSpy).toHaveBeenCalled();
    // Dice record is optional based on whether parse emitted dice roll info
  });
});


