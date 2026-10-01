#!/usr/bin/env node
/**
 * Version bump script
 * Usage: node scripts/bump-version.js [patch|minor|major]
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.resolve(__dirname, '../VERSION');
const PACKAGE_FILES = [
    path.resolve(__dirname, '../package.json'),
    path.resolve(__dirname, '../backend/package.json'),
    path.resolve(__dirname, '../frontend/package.json')
];

function readVersion() {
    const content = fs.readFileSync(VERSION_FILE, 'utf-8');
    const major = parseInt(content.match(/MAJOR=(\d+)/)?.[1] || '0');
    const minor = parseInt(content.match(/MINOR=(\d+)/)?.[1] || '0');
    const patch = parseInt(content.match(/PATCH=(\d+)/)?.[1] || '0');
    return { major, minor, patch };
}

function writeVersion(major, minor, patch) {
    const today = new Date().toISOString().split('T')[0];
    const content = `MAJOR=${major}
MINOR=${minor}
PATCH=${patch}
BUILD_DATE=${today}
LAST_RELEASE_COMMIT=
`;
    fs.writeFileSync(VERSION_FILE, content);
    return `${major}.${minor}.${patch}`;
}

function bumpVersion(type = 'patch') {
    const { major, minor, patch } = readVersion();
    let newVersion;

    switch (type) {
        case 'major':
            newVersion = writeVersion(major + 1, 0, 0);
            break;
        case 'minor':
            newVersion = writeVersion(major, minor + 1, 0);
            break;
        case 'patch':
        default:
            newVersion = writeVersion(major, minor, patch + 1);
            break;
    }

    // Update package.json files
    PACKAGE_FILES.forEach(pkgFile => {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
            pkg.version = newVersion;
            fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
        } catch (e) {
            console.error(`Could not update ${pkgFile}:`, e.message);
        }
    });

    // Only output the version number (for GitHub Actions)
    console.log(newVersion);
    return newVersion;
}

// CLI
const type = process.argv[2] || 'patch';
const newVersion = bumpVersion(type);