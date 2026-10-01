const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.resolve(__dirname, '../VERSION');
const OUTPUT_FILE = path.resolve(__dirname, '../frontend/src/version-constant.js');

function readVersion() {
    const content = fs.readFileSync(VERSION_FILE, 'utf-8');
    const major = content.match(/MAJOR=(\d+)/)?.[1] || '0';
    const minor = content.match(/MINOR=(\d+)/)?.[1] || '0';
    const patch = content.match(/PATCH=(\d+)/)?.[1] || '0';
    return `${major}.${minor}.${patch}`;
}

try {
    const version = readVersion();
    const content = `// Auto-generated version constant - DO NOT EDIT MANUALLY
export const VERSION = '${version}';
`;
    fs.writeFileSync(OUTPUT_FILE, content);
    console.log('Generated version-constant.js:', version);
} catch (error) {
    console.error('Failed to generate version-constant.js:', error.message);
    process.exit(1);
}