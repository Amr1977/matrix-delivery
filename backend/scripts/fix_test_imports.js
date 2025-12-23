const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '../tests');

// Map of directory (relative to backend/tests) to the number of extra '../' needed
const dirsToDepth = {
    'unit/services': 1,
    'unit/utils': 1,
    'unit/config': 1,
    'integration/routes': 1,
    'integration/auth': 2,
    'integration/payment': 2,
    'integration/statistics': 2,
    'integration/admin': 2,
    'integration/messaging': 2,
    'integration/uploads': 2,
    'integration/verification': 2
};

function walk(dir, callback) {
    if (!fs.existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else if (stats.isFile() && (file.endsWith('.js') || file.endsWith('.ts'))) {
            callback(filepath);
        }
    }
}

Object.keys(dirsToDepth).forEach(relPath => {
    const fullPath = path.join(baseDir, relPath);
    const depthAdded = dirsToDepth[relPath];
    const prefix = '../'.repeat(depthAdded);

    walk(fullPath, (filepath) => {
        let content = fs.readFileSync(filepath, 'utf8');

        // Regex to replace relative imports starting with ..
        // Supports require('..'), require(".."), from '..', from ".."
        // We match the quote and the first two dots
        const regex = /(['"])\.\./g;

        const newContent = content.replace(regex, (match, quote) => {
            return quote + prefix + '..';
        });

        if (content !== newContent) {
            fs.writeFileSync(filepath, newContent);
            console.log(`Updated imports in ${filepath}`);
        }
    });
});
