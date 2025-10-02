import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../../src/utils/EventBus';
import { TelemetryCollector } from '../../src/telemetry/TelemetryCollector';
import { NdJsonLogger } from '../../src/telemetry/NdJsonLogger';
import { PrivacyFilter } from '../../src/telemetry/PrivacyFilter';
import { TelemetryConfig } from '../../src/telemetry/TelemetryConfig';
import { TelemetryManager } from '../../src/telemetry/TelemetryManager';
import type { TelemetryEvent, GameStateSnapshot } from '../../src/telemetry/TelemetrySchema';

describe('Telemetry System', () => {
  let eventBus: EventBus;
  let telemetryConfig: TelemetryConfig;
  let telemetryCollector: TelemetryCollector;
  let telemetryManager: TelemetryManager;

  beforeEach(() => {
    eventBus = new EventBus();
    telemetryConfig = new TelemetryConfig({
      enabled: true,
      logLevel: 'debug',
      privacyMode: 'development'
    });
    telemetryCollector = new TelemetryCollector(eventBus, telemetryConfig);
    telemetryManager = new TelemetryManager(eventBus, telemetryConfig.getConfig());
  });

  afterEach(() => {
    telemetryCollector.clearEvents();
  });

  describe('TelemetryCollector', () => {
    it('should collect dice roll events', () => {
      telemetryCollector.startNewGame();

      telemetryCollector.recordDiceRoll({
        playLabel: 'Power Up Middle',
        defenseLabel: 'Inside Blitz',
        deckName: 'Pro Style',
        diceResult: { d1: 3, d2: 4, sum: 7, isDoubles: false },
        chartKey: 'ProStyle',
        defenseKey: 'C'
      });

      const events = telemetryCollector.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('dice_roll');
      expect((events[0] as any).diceResult.d1).toBe(3);
      expect((events[0] as any).diceResult.d2).toBe(4);
    });

    it('should collect outcome determination events', () => {
      telemetryCollector.startNewGame();

      telemetryCollector.recordOutcomeDetermined({
        playLabel: 'Power Up Middle',
        defenseLabel: 'Inside Blitz',
        deckName: 'Pro Style',
        outcome: {
          category: 'gain',
          yards: 15,
          resultString: '+15'
        }
      });

      const events = telemetryCollector.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('outcome_determined');
      expect((events[0] as any).outcome.category).toBe('gain');
      expect((events[0] as any).outcome.yards).toBe(15);
    });

    it('should collect play resolution events', () => {
      telemetryCollector.startNewGame();

      const gameStateBefore: GameStateSnapshot = {
        quarter: 1,
        clock: 1800,
        down: 1,
        toGo: 10,
        ballOn: 20,
        possession: 'player',
        score: { player: 0, ai: 0 }
      };

      const gameStateAfter: GameStateSnapshot = {
        quarter: 1,
        clock: 1770,
        down: 2,
        toGo: 10,
        ballOn: 35,
        possession: 'player',
        score: { player: 0, ai: 0 }
      };

      telemetryCollector.recordPlayResolved({
        playLabel: 'Power Up Middle',
        defenseLabel: 'Inside Blitz',
        deckName: 'Pro Style',
        gameStateBefore,
        gameStateAfter,
        outcome: {
          category: 'gain',
          yards: 15,
          touchdown: false,
          safety: false,
          possessionChanged: false
        }
      });

      const events = telemetryCollector.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('play_resolved');
      expect((events[0] as any).outcome.yards).toBe(15);
    });

    it('should respect max events limit', () => {
      const limitedConfig = new TelemetryConfig({
        enabled: true,
        maxEventsPerGame: 2
      });
      const limitedCollector = new TelemetryCollector(eventBus, limitedConfig);

      limitedCollector.startNewGame();

      // Add more events than the limit
      limitedCollector.recordDiceRoll({
        playLabel: 'Test Play',
        defenseLabel: 'Test Defense',
        deckName: 'Test Deck',
        diceResult: { d1: 1, d2: 1, sum: 2, isDoubles: true }
      });

      limitedCollector.recordDiceRoll({
        playLabel: 'Test Play 2',
        defenseLabel: 'Test Defense 2',
        deckName: 'Test Deck 2',
        diceResult: { d1: 2, d2: 2, sum: 4, isDoubles: true }
      });

      limitedCollector.recordDiceRoll({
        playLabel: 'Test Play 3',
        defenseLabel: 'Test Defense 3',
        deckName: 'Test Deck 3',
        diceResult: { d1: 3, d2: 3, sum: 6, isDoubles: true }
      });

      const events = limitedCollector.getEvents();
      expect(events.length).toBeLessThanOrEqual(2);
    });
  });

  describe('NdJsonLogger', () => {
    it('should format events as NDJSON', async () => {
      const logger = new NdJsonLogger('memory');
      const testEvent: TelemetryEvent = {
        timestamp: Date.now(),
        eventId: 'test-event',
        sessionId: 'test-session',
        gameId: 'test-game',
        eventType: 'dice_roll',
        playLabel: 'Test Play',
        defenseLabel: 'Test Defense',
        deckName: 'Test Deck',
        diceResult: { d1: 1, d2: 2, sum: 3, isDoubles: false }
      };

      await logger.logEvent(testEvent);
      const output = logger.getMemoryOutput();

      expect(output).toContain('"eventType":"dice_roll"');
      expect(output).toContain('"playLabel":"Test Play"');
      expect(output).toContain('"d1":1');
      expect(output).toContain('"d2":2');
    });

    it('should handle batch operations', async () => {
      const logger = new NdJsonLogger('memory');
      const events: TelemetryEvent[] = [
        {
          timestamp: Date.now(),
          eventId: 'event-1',
          sessionId: 'test-session',
          gameId: 'test-game',
          eventType: 'dice_roll',
          playLabel: 'Play 1',
          defenseLabel: 'Defense 1',
          deckName: 'Deck 1',
          diceResult: { d1: 1, d2: 1, sum: 2, isDoubles: true }
        },
        {
          timestamp: Date.now(),
          eventId: 'event-2',
          sessionId: 'test-session',
          gameId: 'test-game',
          eventType: 'outcome_determined',
          playLabel: 'Play 2',
          defenseLabel: 'Defense 2',
          deckName: 'Deck 2',
          outcome: { category: 'gain', yards: 10 }
        }
      ];

      await logger.logEvents(events);
      const output = logger.getMemoryOutput();

      expect(output.split('\n')).toHaveLength(3); // 2 events + empty line
      expect(output).toContain('event-1');
      expect(output).toContain('event-2');
    });
  });

  describe('PrivacyFilter', () => {
    it('should pass all events in development mode', () => {
      const filter = new PrivacyFilter('development');
      const events: TelemetryEvent[] = [
        {
          timestamp: Date.now(),
          eventId: 'test-event',
          sessionId: 'test-session',
          gameId: 'test-game',
          eventType: 'dice_roll',
          playLabel: 'Test Play',
          defenseLabel: 'Test Defense',
          deckName: 'Test Deck',
          diceResult: { d1: 1, d2: 2, sum: 3, isDoubles: false }
        }
      ];

      const filtered = filter.filterEvents(events);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual(expect.objectContaining({
        eventType: 'dice_roll',
        playLabel: 'Test Play'
      }));
    });

    it('should filter events in production mode', () => {
      const filter = new PrivacyFilter('production');
      const events: TelemetryEvent[] = [
        {
          timestamp: Date.now(),
          eventId: 'test-event',
          sessionId: 'test-session',
          gameId: 'test-game',
          eventType: 'dice_roll',
          playLabel: 'Test Play',
          defenseLabel: 'Test Defense',
          deckName: 'Test Deck',
          diceResult: { d1: 1, d2: 2, sum: 3, isDoubles: false }
        }
      ];

      const filtered = filter.filterEvents(events);
      expect(filtered).toHaveLength(1);
      // Production filter should still pass basic game events
      expect(filtered[0].eventType).toBe('dice_roll');
    });

    it('should generate compliance reports', () => {
      const filter = new PrivacyFilter('production');
      const events: TelemetryEvent[] = [
        {
          timestamp: Date.now(),
          eventId: 'safe-event',
          sessionId: 'test-session',
          gameId: 'test-game',
          eventType: 'dice_roll',
          playLabel: 'Test Play',
          defenseLabel: 'Test Defense',
          deckName: 'Test Deck',
          diceResult: { d1: 1, d2: 2, sum: 3, isDoubles: false }
        }
      ];

      const filtered = filter.filterEvents(events);
      const report = filter.getComplianceReport(filtered);

      expect(report.totalEvents).toBe(1);
      expect(report.safeEvents).toBe(1);
      expect(report.unsafeEvents).toBe(0);
      expect(report.isCompliant).toBe(true);
      expect(report.complianceRate).toBe(1);
    });
  });

  describe('TelemetryConfig', () => {
    it('should create config from environment', () => {
      // Mock environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        TELEMETRY_ENABLED: 'true',
        TELEMETRY_LOG_LEVEL: 'debug',
        TELEMETRY_PRIVACY_MODE: 'development'
      };

      const config = TelemetryConfig.fromEnvironment();
      expect(config.isEnabled()).toBe(true);
      expect(config.getLogLevel()).toBe('debug');
      expect(config.getPrivacyMode()).toBe('development');

      process.env = originalEnv;
    });

    it('should handle configuration updates', () => {
      const config = new TelemetryConfig({ enabled: false });
      expect(config.isEnabled()).toBe(false);

      config.enable({ logLevel: 'production' });
      expect(config.isEnabled()).toBe(true);
      expect(config.getLogLevel()).toBe('production');

      config.disable();
      expect(config.isEnabled()).toBe(false);
    });
  });

  describe('TelemetryManager', () => {
    it('should coordinate telemetry collection and output', async () => {
      const manager = new TelemetryManager(eventBus, {
        enabled: true,
        outputDestination: 'memory',
        privacyMode: 'development'
      });

      await manager.startNewGame();

      // Manually record dice roll event
      manager.recordDiceRoll({
        playLabel: 'Test Play',
        defenseLabel: 'Test Defense',
        deckName: 'Test Deck',
        diceResult: { d1: 2, d2: 3, sum: 5, isDoubles: false }
      });

      await manager.stopCollection();

      const output = await manager.getMemoryOutput();
      expect(output).toContain('dice_roll');
      expect(output).toContain('Test Play');
    });

    it('should respect disabled configuration', async () => {
      const manager = new TelemetryManager(eventBus, {
        enabled: false
      });

      await manager.startNewGame();
      await manager.stopCollection();

      const events = manager.getCurrentEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('Integration Tests', () => {
    it('should collect complete game telemetry', async () => {
      const manager = new TelemetryManager(eventBus, {
        enabled: true,
        outputDestination: 'memory'
      });

      await manager.startNewGame();

      // Manually record dice roll event
      manager.recordDiceRoll({
        playLabel: 'Power Run',
        defenseLabel: 'Goal Line',
        deckName: 'Ball Control',
        diceResult: { d1: 3, d2: 4, sum: 7, isDoubles: false }
      });

      // Manually record play resolution using the manager's collector
      const managerCollector = (manager as any).collector;
      if (managerCollector) {
        managerCollector.recordPlayResolved({
          playLabel: 'Power Run',
          defenseLabel: 'Goal Line',
          deckName: 'Ball Control',
          gameStateBefore: {
            quarter: 1, clock: 1800, down: 1, toGo: 10, ballOn: 80,
            possession: 'player', score: { player: 0, ai: 0 }
          },
          gameStateAfter: {
            quarter: 1, clock: 1770, down: 1, toGo: 10, ballOn: 90,
            possession: 'player', score: { player: 6, ai: 0 }
          },
          outcome: {
            category: 'gain',
            yards: 10,
            touchdown: true,
            safety: false,
            possessionChanged: false
          }
        });
      }

      await manager.stopCollection();

      const output = await manager.getMemoryOutput();
      expect(output).toContain('dice_roll');
      expect(output).toContain('play_resolved');
      // Note: scoring_event would be generated by the actual game flow, not by manual recordPlayResolved
    });
  });
});
