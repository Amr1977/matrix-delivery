#!/usr/bin/env node
/**
 * Log Analyzer Script
 * Analyzes backend logs for errors and patterns
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../backend/logs');

function analyzeLog(logFile) {
    const filePath = path.join(LOGS_DIR, logFile);

    if (!fs.existsSync(filePath)) {
        console.log(`❌ Log file not found: ${logFile}`);
        return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    const analysis = {
        totalLines: lines.length,
        errors: [],
        warnings: [],
        patterns: {}
    };

    lines.forEach((line, index) => {
        try {
            const log = JSON.parse(line);

            // Track errors
            if (log.level && log.level.includes('error')) {
                analysis.errors.push({
                    line: index + 1,
                    timestamp: log.timestamp,
                    message: log.message?.replace(/\u001b\[\d+m/g, '') // Strip ANSI codes
                });
            }

            // Track warnings
            if (log.level && log.level.includes('warn')) {
                analysis.warnings.push({
                    line: index + 1,
                    timestamp: log.timestamp,
                    message: log.message?.replace(/\u001b\[\d+m/g, '')
                });
            }

            // Track error patterns
            if (log.message) {
                const cleanMessage = log.message.replace(/\u001b\[\d+m/g, '');
                const pattern = cleanMessage.substring(0, 50); // First 50 chars as pattern
                analysis.patterns[pattern] = (analysis.patterns[pattern] || 0) + 1;
            }
        } catch (e) {
            // Skip non-JSON lines
        }
    });

    return analysis;
}

function printAnalysis(logFile, analysis) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 Analysis for: ${logFile}`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`Total log entries: ${analysis.totalLines}`);
    console.log(`Errors found: ${analysis.errors.length}`);
    console.log(`Warnings found: ${analysis.warnings.length}\n`);

    if (analysis.errors.length > 0) {
        console.log(`\n🔴 Recent Errors (last 10):`);
        console.log(`${'-'.repeat(80)}`);
        analysis.errors.slice(-10).forEach(error => {
            console.log(`[${error.timestamp}] ${error.message}`);
        });
    }

    if (analysis.warnings.length > 5) {
        console.log(`\n⚠️  Recent Warnings (last 5):`);
        console.log(`${'-'.repeat(80)}`);
        analysis.warnings.slice(-5).forEach(warning => {
            console.log(`[${warning.timestamp}] ${warning.message}`);
        });
    }

    // Show top error patterns
    const topPatterns = Object.entries(analysis.patterns)
        .filter(([pattern]) => pattern.toLowerCase().includes('error'))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (topPatterns.length > 0) {
        console.log(`\n📈 Top Error Patterns:`);
        console.log(`${'-'.repeat(80)}`);
        topPatterns.forEach(([pattern, count]) => {
            console.log(`${count}x: ${pattern}...`);
        });
    }
}

// Main execution
const today = new Date().toISOString().split('T')[0];
const logFiles = [
    `error-${today}.log`,
    `combined-${today}.log`
];

console.log('🔍 Matrix Delivery Log Analyzer\n');

logFiles.forEach(logFile => {
    const analysis = analyzeLog(logFile);
    if (analysis) {
        printAnalysis(logFile, analysis);
    }
});

console.log(`\n${'='.repeat(80)}`);
console.log('✅ Analysis complete');
console.log(`${'='.repeat(80)}\n`);
