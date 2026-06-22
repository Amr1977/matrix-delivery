const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const gitInfoPath = path.resolve(__dirname, '../src/git-info.json');

function readVersion() {
    try {
        const versionPath = path.resolve(__dirname, '../../VERSION');
        const content = fs.readFileSync(versionPath, 'utf-8');
        const major = content.match(/MAJOR=(\d+)/)?.[1] || '0';
        const minor = content.match(/MINOR=(\d+)/)?.[1] || '0';
        const patch = content.match(/PATCH=(\d+)/)?.[1] || '0';
        return `${major}.${minor}.${patch}`;
    } catch (e) {
        return '1.0.0';
    }
}

try {
    const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    // Get date in ISO format
    const commitDate = execSync('git log -1 --format=%cd --date=iso').toString().trim();

    const gitInfo = {
        commit: commitHash,
        date: commitDate,
        buildTime: new Date().toISOString(),
        version: readVersion()
    };

    fs.writeFileSync(gitInfoPath, JSON.stringify(gitInfo, null, 2));
    console.log('Generated git-info.json:', gitInfo);
} catch (error) {
    console.error('Failed to generate git info:', error.message);
    // Fallback to empty info so build doesn't break
    const fallbackInfo = {
        commit: 'unknown',
        date: 'unknown',
        buildTime: new Date().toISOString()
    };
    fs.writeFileSync(gitInfoPath, JSON.stringify(fallbackInfo, null, 2));
}
