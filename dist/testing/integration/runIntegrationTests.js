import { EventBus } from '../utils/EventBus';
import { GridironIntegrationTestRunner } from './GridironIntegrationTestRunner';
/**
 * Main integration test runner script for Gridiron football game
 * Can be run from command line or integrated into build process
 */
export async function runIntegrationTests(config = {}) {
    console.log('🏈 Gridiron Integration Test Suite');
    console.log('================================\n');
    // Initialize event bus
    const bus = new EventBus();
    // Create test runner
    const testRunner = new GridironIntegrationTestRunner(bus);
    try {
        // Load baseline for comparison if requested
        if (config.enableBaselineComparison) {
            console.log('📊 Loading baseline data for comparison...');
            const baselineLoaded = await testRunner.loadBaseline();
            if (!baselineLoaded) {
                console.log('⚠️  Could not load baseline data, running without comparison');
            }
        }
        // Start runtime monitoring
        console.log('🔍 Starting runtime monitoring...');
        testRunner['runtimeValidator'].startMonitoring();
        testRunner['componentHealthMonitor'].startMonitoring();
        // Run full integration test suite
        console.log('🚀 Running integration tests...\n');
        const report = await testRunner.runFullIntegrationTest(config);
        // Stop monitoring
        const runtimeIssues = testRunner['runtimeValidator'].stopMonitoring();
        testRunner['componentHealthMonitor'].stopMonitoring();
        // Display results
        displayTestResults(report, runtimeIssues);
        // Exit with appropriate code
        const exitCode = report.overallStatus === 'FAILED' ? 1 :
            report.overallStatus === 'WARNING' ? 0 : 0;
        process.exit(exitCode);
    }
    catch (error) {
        console.error('❌ Integration test suite failed:', error);
        process.exit(1);
    }
}
/**
 * Display comprehensive test results
 */
function displayTestResults(report, runtimeIssues) {
    console.log('\n📋 Test Results Summary');
    console.log('======================');
    // Overall status
    const statusEmoji = report.overallStatus === 'PASSED' ? '✅' :
        report.overallStatus === 'WARNING' ? '⚠️' : '❌';
    console.log(`${statusEmoji} Overall Status: ${report.overallStatus}`);
    // Summary stats
    console.log(`\n📊 Summary:`);
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   ✅ Passed: ${report.summary.passed}`);
    console.log(`   ❌ Failed: ${report.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`   ⏱️  Duration: ${Math.round(report.summary.duration)}ms`);
    // Test results
    if (report.results.length > 0) {
        console.log(`\n📝 Detailed Results:`);
        report.results.forEach((result) => {
            const emoji = result.status === 'PASSED' ? '✅' :
                result.status === 'WARNING' ? '⚠️' : '❌';
            console.log(`   ${emoji} ${result.name}: ${result.status}`);
            if (result.message) {
                console.log(`      ${result.message}`);
            }
        });
    }
    // Runtime issues
    if (runtimeIssues.length > 0) {
        console.log(`\n🚨 Runtime Issues Detected:`);
        runtimeIssues.forEach((issue) => {
            console.log(`   🚨 [${issue.severity.toUpperCase()}] ${issue.message}`);
            if (issue.details) {
                console.log(`      ${issue.details}`);
            }
        });
    }
    // Baseline comparison
    if (report.baselineComparison?.hasBaseline) {
        console.log(`\n📈 Baseline Comparison:`);
        if (report.baselineComparison.performanceDegraded) {
            console.log(`   ⚠️  Performance degraded`);
        }
        if (report.baselineComparison.newFailures) {
            console.log(`   ❌ New failures detected`);
        }
        if (report.baselineComparison.improvements) {
            console.log(`   ✅ Improvements detected`);
        }
    }
    // Recommendations
    if (report.overallStatus === 'FAILED') {
        console.log(`\n💡 Recommendations:`);
        console.log(`   • Review failed tests and fix underlying issues`);
        console.log(`   • Check runtime issues for immediate problems`);
        console.log(`   • Consider updating baseline if changes are expected`);
        console.log(`   • Run tests in development mode for detailed debugging`);
    }
    else if (report.overallStatus === 'WARNING') {
        console.log(`\n💡 Recommendations:`);
        console.log(`   • Review warning conditions`);
        console.log(`   • Monitor performance trends`);
        console.log(`   • Consider optimization if warnings persist`);
    }
    else {
        console.log(`\n🎉 All tests passed! Game is ready for deployment.`);
    }
}
/**
 * Command line interface for running integration tests
 */
if (require.main === module) {
    const args = process.argv.slice(2);
    const config = {};
    // Parse command line arguments
    args.forEach(arg => {
        if (arg === '--enable-baseline') {
            config.enableBaselineComparison = true;
        }
        else if (arg === '--enable-visual-regression') {
            config.enableVisualRegression = true;
        }
        else if (arg === '--enable-performance-monitoring') {
            config.enablePerformanceMonitoring = true;
        }
        else if (arg.startsWith('--performance-thresholds=')) {
            try {
                config.performanceThresholds = JSON.parse(arg.split('=')[1]);
            }
            catch {
                console.error('Invalid performance thresholds JSON');
                process.exit(1);
            }
        }
    });
    // Set up global error handlers for better error reporting
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
        process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
        console.error('❌ Unhandled Rejection:', reason);
        process.exit(1);
    });
    // Run tests
    runIntegrationTests(config).catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=runIntegrationTests.js.map