#!/usr/bin/env node

/**
 * Log Analyzer
 * 
 * Analyzes synced production logs to detect common issues and generate reports.
 * Detects CORS errors, authentication issues, database problems, and more.
 * 
 * Usage:
 *   npm run logs:analyze
 *   node scripts/log-analyzer.js
 *   node scripts/log-analyzer.js --report
 */

const fs = require('fs');
const path = require('path');
const config = require('./log-sync.config.js');

// Setup paths
const localLogDir = path.join(__dirname, '..', config.storage.directory);
const analysisDir = path.join(localLogDir, 'analysis');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// Color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

function log(message, color = 'white') {
    console.log(`${colors[color] || colors.reset}${message}${colors.reset}`);
}

// Analysis results
const results = {
    totalLines: 0,
    errors: [],
    warnings: [],
    patterns: {},
    summary: {
        cors: [],
        jwt: [],
        auth: [],
        database: [],
        timeout: [],
        memory: [],
        crash: [],
    },
    topErrors: {},
    affectedEndpoints: {},
};

// Analyze a single log file
function analyzeLogFile(filePath, category) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    results.totalLines += lines.length;

    lines.forEach((line, index) => {
        if (!line.trim()) return;

        // Check each pattern
        Object.entries(config.analysis.patterns).forEach(([patternName, pattern]) => {
            if (pattern.test(line)) {
                if (!results.patterns[patternName]) {
                    results.patterns[patternName] = 0;
                }
                results.patterns[patternName]++;

                // Store detailed error info
                const errorInfo = {
                    file: path.basename(filePath),
                    line: index + 1,
                    content: line.trim(),
                    category,
                    pattern: patternName,
                };

                // Categorize
                if (results.summary[patternName]) {
                    results.summary[patternName].push(errorInfo);
                }

                // Track error frequency
                const errorKey = line.substring(0, 100);
                results.topErrors[errorKey] = (results.topErrors[errorKey] || 0) + 1;

                // Extract endpoint if present
                const endpointMatch = line.match(/(?:GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)/);
                if (endpointMatch) {
                    const endpoint = endpointMatch[1];
                    if (!results.affectedEndpoints[endpoint]) {
                        results.affectedEndpoints[endpoint] = [];
                    }
                    results.affectedEndpoints[endpoint].push(patternName);
                }
            }
        });

        // Check for errors
        if (/\[error\]|ERROR:|Error:/i.test(line)) {
            results.errors.push({
                file: path.basename(filePath),
                line: index + 1,
                content: line.trim(),
            });
        }

        // Check for warnings
        if (/\[warn\]|WARNING:|Warning:/i.test(line)) {
            results.warnings.push({
                file: path.basename(filePath),
                line: index + 1,
                content: line.trim(),
            });
        }
    });
}

// Analyze all log files
function analyzeLogs() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  Log Analysis', 'bright');
    log('='.repeat(60), 'cyan');

    if (!fs.existsSync(localLogDir)) {
        log('\n❌ No logs found. Run: npm run logs:sync', 'red');
        process.exit(1);
    }

    // Analyze each category
    const categories = ['pm2', 'winston', 'postgresql', 'apache'];

    categories.forEach(category => {
        const categoryDir = path.join(localLogDir, category);
        if (!fs.existsSync(categoryDir)) {
            return;
        }

        log(`\n📊 Analyzing ${category} logs...`, 'yellow');

        const files = fs.readdirSync(categoryDir)
            .filter(f => f.endsWith('.log'))
            .sort()
            .reverse() // Most recent first
            .slice(0, 5); // Analyze last 5 files

        files.forEach(file => {
            const filePath = path.join(categoryDir, file);
            analyzeLogFile(filePath, category);
            log(`   ✓ ${file}`, 'gray');
        });
    });
}

// Generate markdown report
function generateReport() {
    const reportPath = path.join(analysisDir, `analysis-${timestamp}.md`);

    let report = `# Production Log Analysis Report\n\n`;
    report += `**Generated**: ${new Date().toISOString()}\n\n`;
    report += `**Total Lines Analyzed**: ${results.totalLines.toLocaleString()}\n\n`;

    report += `---\n\n`;

    // Summary
    report += `## Summary\n\n`;
    report += `- **Errors**: ${results.errors.length}\n`;
    report += `- **Warnings**: ${results.warnings.length}\n`;

    Object.entries(results.patterns).forEach(([pattern, count]) => {
        report += `- **${pattern.toUpperCase()} Issues**: ${count}\n`;
    });

    report += `\n---\n\n`;

    // CORS Errors
    if (results.summary.cors.length > 0) {
        report += `## 🚨 CORS Errors (${results.summary.cors.length})\n\n`;
        report += `> [!WARNING]\n`;
        report += `> CORS errors are blocking requests from unauthorized origins.\n\n`;

        // Group by origin
        const corsOrigins = {};
        results.summary.cors.forEach(error => {
            const originMatch = error.content.match(/origin[:\s]+([^\s,]+)/i);
            if (originMatch) {
                const origin = originMatch[1];
                if (!corsOrigins[origin]) {
                    corsOrigins[origin] = [];
                }
                corsOrigins[origin].push(error);
            }
        });

        Object.entries(corsOrigins).forEach(([origin, errors]) => {
            report += `### Blocked Origin: \`${origin}\` (${errors.length} occurrences)\n\n`;
            report += `**Fix**: Add this origin to your \`CORS_ORIGIN\` environment variable:\n\n`;
            report += `\`\`\`bash\n`;
            report += `CORS_ORIGIN="https://matrix-delivery.web.app,https://matrix-delivery.firebaseapp.com,${origin}"\n`;
            report += `\`\`\`\n\n`;

            // Show sample error
            report += `**Sample Error**:\n\`\`\`\n${errors[0].content}\n\`\`\`\n\n`;
            report += `**File**: \`${errors[0].file}\` (Line ${errors[0].line})\n\n`;
        });

        report += `---\n\n`;
    }

    // JWT Errors
    if (results.summary.jwt.length > 0) {
        report += `## 🔐 JWT/Authentication Errors (${results.summary.jwt.length})\n\n`;
        report += `> [!CAUTION]\n`;
        report += `> JWT authentication failures detected.\n\n`;

        const jwtTypes = {};
        results.summary.jwt.forEach(error => {
            const type = error.content.includes('expired') ? 'Expired' :
                error.content.includes('malformed') ? 'Malformed' : 'Invalid';
            if (!jwtTypes[type]) {
                jwtTypes[type] = [];
            }
            jwtTypes[type].push(error);
        });

        Object.entries(jwtTypes).forEach(([type, errors]) => {
            report += `### ${type} Tokens (${errors.length})\n\n`;
            report += `**Sample Error**:\n\`\`\`\n${errors[0].content}\n\`\`\`\n\n`;
        });

        report += `---\n\n`;
    }

    // Database Errors
    if (results.summary.database.length > 0) {
        report += `## 🗄️ Database Errors (${results.summary.database.length})\n\n`;
        report += `> [!WARNING]\n`;
        report += `> Database connection or query issues detected.\n\n`;

        results.summary.database.slice(0, 5).forEach(error => {
            report += `- \`${error.file}\` (Line ${error.line})\n`;
            report += `  \`\`\`\n  ${error.content}\n  \`\`\`\n\n`;
        });

        report += `---\n\n`;
    }

    // Top Errors
    if (Object.keys(results.topErrors).length > 0) {
        report += `## 📊 Most Frequent Errors\n\n`;

        const sortedErrors = Object.entries(results.topErrors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        sortedErrors.forEach(([error, count], index) => {
            report += `${index + 1}. **${count} occurrences**\n`;
            report += `   \`\`\`\n   ${error}\n   \`\`\`\n\n`;
        });

        report += `---\n\n`;
    }

    // Affected Endpoints
    if (Object.keys(results.affectedEndpoints).length > 0) {
        report += `## 🎯 Affected Endpoints\n\n`;

        Object.entries(results.affectedEndpoints)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 10)
            .forEach(([endpoint, patterns]) => {
                report += `- \`${endpoint}\` - ${patterns.length} issues (${[...new Set(patterns)].join(', ')})\n`;
            });

        report += `\n---\n\n`;
    }

    // Recommendations
    report += `## 💡 Recommendations\n\n`;

    if (results.summary.cors.length > 0) {
        report += `1. **Fix CORS Configuration**: Update \`CORS_ORIGIN\` environment variable on VPS\n`;
    }

    if (results.summary.jwt.length > 0) {
        report += `2. **Review JWT Configuration**: Check token expiration and secret keys\n`;
    }

    if (results.summary.database.length > 0) {
        report += `3. **Database Health Check**: Verify PostgreSQL connection and query performance\n`;
    }

    if (results.summary.timeout.length > 0) {
        report += `4. **Performance Optimization**: Investigate timeout issues and slow queries\n`;
    }

    report += `\n---\n\n`;
    report += `## 📁 Log Files Analyzed\n\n`;
    report += `Logs are stored in: \`${localLogDir}\`\n\n`;
    report += `To sync latest logs: \`npm run logs:sync\`\n`;

    // Save report
    fs.writeFileSync(reportPath, report);

    return reportPath;
}

// Print console summary
function printSummary() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  Analysis Results', 'bright');
    log('='.repeat(60), 'cyan');

    log(`\n📊 Statistics:`, 'cyan');
    log(`   Total Lines: ${results.totalLines.toLocaleString()}`, 'gray');
    log(`   Errors: ${results.errors.length}`, results.errors.length > 0 ? 'red' : 'gray');
    log(`   Warnings: ${results.warnings.length}`, results.warnings.length > 0 ? 'yellow' : 'gray');

    if (Object.keys(results.patterns).length > 0) {
        log(`\n🔍 Pattern Matches:`, 'cyan');
        Object.entries(results.patterns).forEach(([pattern, count]) => {
            const color = count > 0 ? 'yellow' : 'gray';
            log(`   ${pattern.toUpperCase()}: ${count}`, color);
        });
    }

    // CORS specific alert
    if (results.summary.cors.length > 0) {
        log(`\n🚨 CORS ERRORS DETECTED!`, 'red');
        log(`   ${results.summary.cors.length} CORS errors found`, 'red');

        const corsOrigins = new Set();
        results.summary.cors.forEach(error => {
            const originMatch = error.content.match(/origin[:\s]+([^\s,]+)/i);
            if (originMatch) {
                corsOrigins.add(originMatch[1]);
            }
        });

        if (corsOrigins.size > 0) {
            log(`\n   Blocked origins:`, 'yellow');
            corsOrigins.forEach(origin => {
                log(`   - ${origin}`, 'yellow');
            });
        }
    }
}

// Main
function main() {
    const startTime = Date.now();

    analyzeLogs();
    printSummary();

    if (config.analysis.generateReport) {
        log(`\n📝 Generating report...`, 'cyan');
        const reportPath = generateReport();
        log(`   ✅ Report saved: ${reportPath}`, 'green');

        // Try to open report in VS Code
        try {
            const { execSync } = require('child_process');
            execSync(`code "${reportPath}"`, { stdio: 'ignore' });
            log(`   📖 Opened in VS Code`, 'gray');
        } catch (error) {
            // VS Code not available
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n✅ Analysis completed in ${duration}s`, 'green');

    // Send notification if critical errors found
    if (config.analysis.notifications.enabled) {
        const criticalCount = results.summary.cors.length +
            results.summary.crash.length +
            results.summary.database.length;

        if (criticalCount > 0 || !config.analysis.notifications.criticalOnly) {
            sendNotification(criticalCount);
        }
    }
}

// Send desktop notification
function sendNotification(criticalCount) {
    try {
        const notifier = require('node-notifier');
        notifier.notify({
            title: 'Production Log Analysis',
            message: criticalCount > 0
                ? `⚠️ ${criticalCount} critical issues detected!`
                : `✅ Analysis complete`,
            sound: config.analysis.notifications.sound,
            timeout: 10,
        });
    } catch (error) {
        // node-notifier not installed, skip
    }
}

// Run
main();
