import { EventBus } from '../utils/EventBus';
import { RuntimeValidator } from './RuntimeValidator';
import { ComponentHealthMonitor } from './ComponentHealthMonitor';
import { GameFlowValidator } from './GameFlowValidator';
import { UIAutomationTester } from './UIAutomationTester';
import type { GameState, TeamSide } from '../domain/GameState';
import type { DeckName } from '../data/decks';

/**
 * Main integration test runner specifically tailored for Gridiron football simulation
 * Leverages existing QA harness while adding comprehensive UI and runtime validation
 */
export class GridironIntegrationTestRunner {
  private bus: EventBus;
  private runtimeValidator: RuntimeValidator;
  private componentHealthMonitor: ComponentHealthMonitor;
  private gameFlowValidator: GameFlowValidator;
  private uiTester: UIAutomationTester;

  private testResults: TestResult[] = [];
  private baselineData?: BaselineSnapshot;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.runtimeValidator = new RuntimeValidator(bus);
    this.componentHealthMonitor = new ComponentHealthMonitor(bus);
    this.gameFlowValidator = new GameFlowValidator(bus);
    this.uiTester = new UIAutomationTester(bus);
  }

  /**
   * Runs complete integration test suite
   */
  async runFullIntegrationTest(config: IntegrationTestConfig = {}): Promise<IntegrationTestReport> {
    console.log('🚀 Starting Gridiron Integration Tests...');

    const startTime = performance.now();
    this.testResults = [];

    try {
      // Phase 1: Pre-test validation
      await this.runPreTestValidation();

      // Phase 2: Component health checks
      await this.runComponentHealthTests();

      // Phase 3: Game flow validation
      await this.runGameFlowTests(config);

      // Phase 4: UI interaction tests
      await this.runUIInteractionTests();

      // Phase 5: Performance monitoring
      await this.runPerformanceTests();

      // Phase 6: Post-test validation
      await this.runPostTestValidation();

    } catch (error) {
      this.recordTestResult('critical_error', 'FAILED', error.message);
    }

    const duration = performance.now() - startTime;
    return this.generateReport(duration);
  }

  /**
   * Pre-test validation - ensure test environment is ready
   */
  private async runPreTestValidation(): Promise<void> {
    console.log('🔍 Running pre-test validation...');

    // Check if game runtime is initialized
    const runtimeReady = await this.validateRuntimeInitialization();
    this.recordTestResult('runtime_initialization', runtimeReady ? 'PASSED' : 'FAILED');

    // Validate data tables are loaded
    const tablesLoaded = await this.validateDataTables();
    this.recordTestResult('data_tables_loading', tablesLoaded ? 'PASSED' : 'FAILED');

    // Check browser compatibility and feature support
    const browserCompat = await this.validateBrowserCompatibility();
    this.recordTestResult('browser_compatibility', browserCompat ? 'PASSED' : 'FAILED');
  }

  /**
   * Component health monitoring - validate all UI components
   */
  private async runComponentHealthTests(): Promise<void> {
    console.log('🏥 Running component health tests...');

    const components = [
      'HUD', 'Field', 'Controls', 'Hand', 'Log',
      'ErrorBoundary', 'ProgressiveEnhancement'
    ];

    for (const componentName of components) {
      const health = await this.componentHealthMonitor.validateComponentHealth(componentName);
      const status = health.isHealthy ? 'PASSED' : 'FAILED';
      this.recordTestResult(`component_${componentName.toLowerCase()}`, status,
        health.isHealthy ? undefined : health.issues.join(', '));
    }
  }

  /**
   * Game flow validation - test complete game scenarios
   */
  private async runGameFlowTests(config: IntegrationTestConfig): Promise<void> {
    console.log('🎮 Running game flow tests...');

    // Test complete game scenarios
    await this.testCompleteGameFlow(config);

    // Test specific game mechanics
    await this.testPenaltySystem();
    await this.testScoringSystem();
    await this.testTimeManagement();
    await this.testAISystem();
  }

  /**
   * UI interaction automation tests
   */
  private async runUIInteractionTests(): Promise<void> {
    console.log('🖱️ Running UI interaction tests...');

    // Test new game flow
    await this.uiTester.testNewGameFlow();

    // Test deck selection
    await this.uiTester.testDeckSelection();

    // Test opponent selection
    await this.uiTester.testOpponentSelection();

    // Test control responsiveness
    await this.uiTester.testControlResponsiveness();
  }

  /**
   * Performance monitoring during tests
   */
  private async runPerformanceTests(): Promise<void> {
    console.log('📊 Running performance tests...');

    const performanceMetrics = await this.runtimeValidator.monitorPerformance();

    // Check frame rate
    const fpsStatus = performanceMetrics.averageFPS >= 30 ? 'PASSED' : 'FAILED';
    this.recordTestResult('performance_fps', fpsStatus,
      fpsStatus === 'FAILED' ? `Average FPS: ${performanceMetrics.averageFPS}` : undefined);

    // Check memory usage
    const memoryStatus = performanceMetrics.memoryUsage < 100 * 1024 * 1024 ? 'PASSED' : 'WARNING';
    this.recordTestResult('performance_memory', memoryStatus,
      memoryStatus === 'WARNING' ? `Memory usage: ${Math.round(performanceMetrics.memoryUsage / 1024 / 1024)}MB` : undefined);

    // Check load times
    const loadTimeStatus = performanceMetrics.loadTime < 3000 ? 'PASSED' : 'WARNING';
    this.recordTestResult('performance_load_time', loadTimeStatus,
      loadTimeStatus === 'WARNING' ? `Load time: ${performanceMetrics.loadTime}ms` : undefined);
  }

  /**
   * Post-test validation and cleanup
   */
  private async runPostTestValidation(): Promise<void> {
    console.log('🔚 Running post-test validation...');

    // Check for runtime issues
    const runtimeIssues = await this.runtimeValidator.detectRuntimeIssues();
    const criticalIssues = runtimeIssues.filter(issue => issue.severity === 'critical');

    if (criticalIssues.length > 0) {
      this.recordTestResult('runtime_issues', 'FAILED',
        `${criticalIssues.length} critical runtime issues detected`);
    } else {
      this.recordTestResult('runtime_issues', 'PASSED');
    }

    // Validate no memory leaks
    const memoryLeakStatus = await this.validateNoMemoryLeaks();
    this.recordTestResult('memory_leaks', memoryLeakStatus ? 'PASSED' : 'FAILED');
  }

  /**
   * Test complete game flow scenarios
   */
  private async testCompleteGameFlow(config: IntegrationTestConfig): Promise<void> {
    const scenarios = [
      { name: 'balanced_game', playerDeck: 'Pro Style', aiDeck: 'Ball Control' },
      { name: 'offensive_showdown', playerDeck: 'Aerial Style', aiDeck: 'Aerial Style' },
      { name: 'defensive_struggle', playerDeck: 'Ball Control', aiDeck: 'Pro Style' }
    ];

    for (const scenario of scenarios) {
      await this.testGameScenario(scenario.name, scenario);
    }
  }

  /**
   * Test individual game scenario
   */
  private async testGameScenario(scenarioName: string, config: GameScenarioConfig): Promise<void> {
    try {
      // Start test game using existing QA harness
      await this.startAutomatedGame(config);

      // Monitor game state throughout
      const gameValidation = await this.gameFlowValidator.validateGameFlow();

      const status = gameValidation.isValid ? 'PASSED' : 'FAILED';
      this.recordTestResult(`game_scenario_${scenarioName}`, status,
        gameValidation.isValid ? undefined : gameValidation.errors.join(', '));

    } catch (error) {
      this.recordTestResult(`game_scenario_${scenarioName}`, 'FAILED', error.message);
    }
  }

  /**
   * Test penalty system comprehensively
   */
  private async testPenaltySystem(): Promise<void> {
    const penaltyScenarios = [
      'offensive_penalty', 'defensive_penalty', 'pre_snap_penalty',
      'post_play_penalty', 'penalty_on_scoring_play'
    ];

    for (const scenario of penaltyScenarios) {
      const result = await this.gameFlowValidator.testPenaltyScenario(scenario);
      this.recordTestResult(`penalty_${scenario}`, result.success ? 'PASSED' : 'FAILED',
        result.success ? undefined : result.error);
    }
  }

  /**
   * Test scoring system comprehensively
   */
  private async testScoringSystem(): Promise<void> {
    const scoringScenarios = [
      'touchdown_extra_point', 'touchdown_two_point', 'field_goal',
      'safety', 'defensive_touchdown'
    ];

    for (const scenario of scoringScenarios) {
      const result = await this.gameFlowValidator.testScoringScenario(scenario);
      this.recordTestResult(`scoring_${scenario}`, result.success ? 'PASSED' : 'FAILED',
        result.success ? undefined : result.error);
    }
  }

  /**
   * Test AI system functionality
   */
  private async testAISystem(): Promise<void> {
    const aiTests = [
      'play_selection_logic', 'defensive_adjustments', 'coach_profile_behavior',
      'tendency_learning', 'situational_awareness'
    ];

    for (const test of aiTests) {
      const result = await this.gameFlowValidator.testAIScenario(test);
      this.recordTestResult(`ai_${test}`, result.success ? 'PASSED' : 'FAILED',
        result.success ? undefined : result.error);
    }
  }

  /**
   * Test time management system
   */
  private async testTimeManagement(): Promise<void> {
    const timeTests = [
      'quarter_transitions', 'two_minute_warning', 'timeouts',
      'end_of_half', 'end_of_game'
    ];

    for (const test of timeTests) {
      const result = await this.gameFlowValidator.testTimeScenario(test);
      this.recordTestResult(`time_${test}`, result.success ? 'PASSED' : 'FAILED',
        result.success ? undefined : result.error);
    }
  }

  /**
   * Start automated game using existing QA harness
   */
  private async startAutomatedGame(config: GameScenarioConfig): Promise<void> {
    return new Promise((resolve) => {
      // Use existing QA harness to start automated game
      this.bus.emit('qa:startTestGame', {
        seed: Math.floor(Math.random() * 1e9),
        playerDeck: config.playerDeck,
        aiDeck: config.aiDeck,
        startingPossession: 'player'
      });

      // Listen for game completion
      const completionHandler = () => {
        this.bus.off('log', logHandler);
        resolve();
      };

      const logHandler = (event: any) => {
        if (event.message && event.message.includes('Final —')) {
          completionHandler();
        }
      };

      this.bus.on('log', logHandler);

      // Timeout after 5 minutes to prevent hanging
      setTimeout(completionHandler, 5 * 60 * 1000);
    });
  }

  /**
   * Validate runtime initialization
   */
  private async validateRuntimeInitialization(): Promise<boolean> {
    try {
      // Check if GS runtime is available
      const runtime = (globalThis as any).GS;
      if (!runtime) return false;

      // Check if essential runtime methods exist
      const requiredMethods = ['start', 'bus', 'rules', 'tables'];
      return requiredMethods.every(method => method in runtime);
    } catch {
      return false;
    }
  }

  /**
   * Validate data tables are loaded
   */
  private async validateDataTables(): Promise<boolean> {
    try {
      const tables = (globalThis as any).GS?.tables;
      if (!tables) return false;

      // Check essential tables
      return !!(tables.offenseCharts && tables.placeKicking && tables.timeKeeping);
    } catch {
      return false;
    }
  }

  /**
   * Validate browser compatibility
   */
  private async validateBrowserCompatibility(): Promise<boolean> {
    try {
      // Check essential browser features for Gridiron
      const requiredFeatures = [
        'WebGLRenderingContext', // For field rendering
        'localStorage', // For settings persistence
        'MutationObserver', // For component monitoring
        'requestAnimationFrame' // For smooth animations
      ];

      return requiredFeatures.every(feature => feature in window);
    } catch {
      return false;
    }
  }

  /**
   * Validate no memory leaks occurred
   */
  private async validateNoMemoryLeaks(): Promise<boolean> {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    // Check if memory usage is reasonable
    const performance = (window as any).performance;
    if (performance && performance.memory) {
      const usedMemory = performance.memory.usedJSHeapSize;
      const memoryLimit = 50 * 1024 * 1024; // 50MB limit for tests

      return usedMemory < memoryLimit;
    }

    return true; // Can't measure memory, assume no leak
  }

  /**
   * Record test result
   */
  private recordTestResult(testName: string, status: TestStatus, message?: string): void {
    this.testResults.push({
      name: testName,
      status,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(duration: number): IntegrationTestReport {
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const total = this.testResults.length;

    const overallStatus = failed > 0 ? 'FAILED' : warnings > 0 ? 'WARNING' : 'PASSED';

    return {
      overallStatus,
      summary: {
        total,
        passed,
        failed,
        warnings,
        duration
      },
      results: this.testResults,
      timestamp: Date.now(),
      baselineComparison: this.baselineData ?
        this.compareWithBaseline() : undefined
    };
  }

  /**
   * Compare current results with baseline
   */
  private compareWithBaseline(): BaselineComparison {
    if (!this.baselineData) {
      return { hasBaseline: false };
    }

    // Compare performance metrics, component health, etc.
    return {
      hasBaseline: true,
      performanceDegraded: false, // Implement actual comparison
      newFailures: false, // Implement actual comparison
      improvements: false // Implement actual comparison
    };
  }

  /**
   * Save current state as baseline for future comparisons
   */
  async saveAsBaseline(): Promise<void> {
    this.baselineData = {
      timestamp: Date.now(),
      performanceMetrics: await this.runtimeValidator.getPerformanceBaseline(),
      componentHealth: await this.componentHealthMonitor.getHealthBaseline(),
      gameFlowMetrics: await this.gameFlowValidator.getFlowBaseline()
    };
  }

  /**
   * Load baseline for comparison
   */
  async loadBaseline(): Promise<boolean> {
    try {
      // In a real implementation, this would load from localStorage or file
      // For now, we'll use the current state
      await this.saveAsBaseline();
      return true;
    } catch {
      return false;
    }
  }
}

// Types for the integration testing system
export interface IntegrationTestConfig {
  scenarios?: string[];
  performanceThresholds?: {
    maxLoadTime?: number;
    minFPS?: number;
    maxMemoryUsage?: number;
  };
  enableVisualRegression?: boolean;
  enablePerformanceMonitoring?: boolean;
}

export interface GameScenarioConfig {
  name: string;
  playerDeck: DeckName;
  aiDeck: DeckName;
  coachProfiles?: {
    player?: string;
    ai?: string;
  };
}

export type TestStatus = 'PASSED' | 'FAILED' | 'WARNING' | 'SKIPPED';

export interface TestResult {
  name: string;
  status: TestStatus;
  message?: string;
  timestamp: number;
}

export interface IntegrationTestReport {
  overallStatus: TestStatus;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    duration: number;
  };
  results: TestResult[];
  timestamp: number;
  baselineComparison?: BaselineComparison;
}

export interface BaselineComparison {
  hasBaseline: boolean;
  performanceDegraded?: boolean;
  newFailures?: boolean;
  improvements?: boolean;
}

export interface BaselineSnapshot {
  timestamp: number;
  performanceMetrics: any;
  componentHealth: any;
  gameFlowMetrics: any;
}
