const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.resolve(__dirname, '../VERSION');
const PROFILE_PAGE = path.resolve(__dirname, '../frontend/src/pages/ProfilePage.js');

function readVersion() {
    const content = fs.readFileSync(VERSION_FILE, 'utf-8');
    const major = content.match(/MAJOR=(\d+)/)?.[1] || '0';
    const minor = content.match(/MINOR=(\d+)/)?.[1] || '0';
    const patch = content.match(/PATCH=(\d+)/)?.[1] || '0';
    return `${major}.${minor}.${patch}`;
}

try {
    const version = readVersion();
    const content = fs.readFileSync(PROFILE_PAGE, 'utf-8');
    const updatedContent = content.replace(
        /const APP_VERSION = process\.env\.REACT_APP_VERSION \|\| '1\.0\.0';/,
        `const APP_VERSION = '${version}';`
    );
    fs.writeFileSync(PROFILE_PAGE, updatedContent);
    console.log('Injected version into ProfilePage.js:', version);
} catch (error) {
    console.error('Failed to inject version:', error.message);
    process.exit(1);
}