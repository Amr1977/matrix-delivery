/**
 * Automated script to update all req.user.role references to support both
 * primary_role (new) and role (old) for backward compatibility
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'server.js',
    'routes/drivers.js',
    'routes/cryptoPayments.js',
    'map-location-picker-backend.js'
];

const replacements = [
    {
        // Simple role checks
        pattern: /if \(req\.user\.role !== '([^']+)'\)/g,
        replacement: "if ((req.user.primary_role || req.user.role) !== '$1')"
    },
    {
        // Role equality checks
        pattern: /if \(req\.user\.role === '([^']+)'\)/g,
        replacement: "if ((req.user.primary_role || req.user.role) === '$1')"
    },
    {
        // Role in variables
        pattern: /const userRole = req\.user\.role;/g,
        replacement: "const userRole = req.user.primary_role || req.user.role;"
    },
    {
        // Role in objects
        pattern: /role: req\.user\.role,/g,
        replacement: "role: (req.user.primary_role || req.user.role),"
    },
    {
        // Role in arrays/function calls
        pattern: /req\.user\.role(?=[,\)])/g,
        replacement: "(req.user.primary_role || req.user.role)"
    }
];

async function updateFile(filePath) {
    const fullPath = path.join(__dirname, '..', filePath);

    try {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;
        let changeCount = 0;

        replacements.forEach(({ pattern, replacement }) => {
            const matches = content.match(pattern);
            if (matches) {
                content = content.replace(pattern, replacement);
                modified = true;
                changeCount += matches.length;
            }
        });

        if (modified) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`✅ Updated ${filePath} (${changeCount} changes)`);
            return { file: filePath, changes: changeCount };
        } else {
            console.log(`⏭️  Skipped ${filePath} (no changes needed)`);
            return { file: filePath, changes: 0 };
        }
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
        return { file: filePath, error: error.message };
    }
}

async function main() {
    console.log('🔄 Starting automated role migration...\n');

    const results = [];

    for (const file of filesToUpdate) {
        const result = await updateFile(file);
        results.push(result);
    }

    console.log('\n📊 Migration Summary:');
    console.log('─'.repeat(50));

    let totalChanges = 0;
    let successCount = 0;
    let errorCount = 0;

    results.forEach(result => {
        if (result.error) {
            console.log(`❌ ${result.file}: ERROR - ${result.error}`);
            errorCount++;
        } else if (result.changes > 0) {
            console.log(`✅ ${result.file}: ${result.changes} changes`);
            totalChanges += result.changes;
            successCount++;
        } else {
            console.log(`⏭️  ${result.file}: No changes`);
        }
    });

    console.log('─'.repeat(50));
    console.log(`Total files processed: ${results.length}`);
    console.log(`Successful updates: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total changes made: ${totalChanges}`);

    if (errorCount > 0) {
        process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
