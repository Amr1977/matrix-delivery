const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.resolve(__dirname, '../VERSION');
const OUTPUT_FILE = path.resolve(__dirname, '../frontend/src/version.ts');

function readVersion() {
    const content = fs.readFileSync(VERSION_FILE, 'utf-8');
    const major = content.match(/MAJOR=(\d+)/)?.[1] || '0';
    const minor = content.match(/MINOR=(\d+)/)?.[1] || '0';
    const patch = content.match(/PATCH=(\d+)/)?.[1] || '0';
    return `${major}.${minor}.${patch}`;
}

try {
    const version = readVersion();
    const content = `// Auto-generated version file - DO NOT EDIT MANUALLY
export const APP_VERSION = '${version}';
`;
    fs.writeFileSync(OUTPUT_FILE, content);
    console.log('Generated version.ts:', version);
} catch (error) {
    console.error('Failed to generate version.ts:', error.message);
    // Fallback
    const fallbackContent = `// Auto-generated version file - DO NOT EDIT MANUALLY
export const APP_VERSION = '1.0.0';
`;
    fs.writeFileSync(OUTPUT_FILE, fallbackContent);
}