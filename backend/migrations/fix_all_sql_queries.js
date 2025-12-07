/**
 * Comprehensive script to find and fix ALL SQL queries with old column names
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all JS files in backend
const files = glob.sync(path.join(__dirname, '..', '**/*.js'), {
    ignore: ['**/node_modules/**', '**/migrations/**', '**/coverage/**', '**/tests/**', '**/__tests__/**']
});

console.log(`🔍 Scanning ${files.length} files for SQL queries with old column names...\n`);

let totalChanges = 0;
let filesChanged = 0;

files.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileChanges = 0;

    // Pattern 1: SELECT ... role ... FROM users (but not primary_role or granted_roles)
    const selectPattern = /SELECT\s+([^;]*?)\b(role|roles)\b([^;]*?)\s+FROM\s+users/gi;
    content = content.replace(selectPattern, (match, before, column, after) => {
        if (match.includes('primary_role') || match.includes('granted_roles')) {
            return match; // Already updated
        }
        fileChanges++;
        const newColumn = column === 'role' ? 'primary_role' : 'granted_roles';
        return `SELECT ${before}${newColumn}${after} FROM users`;
    });

    // Pattern 2: WHERE role = 'something' (but not primary_role)
    const wherePattern = /WHERE\s+(?!primary_)role\s*=\s*'([^']+)'/gi;
    content = content.replace(wherePattern, (match, value) => {
        fileChanges++;
        return `WHERE primary_role = '${value}'`;
    });

    // Pattern 3: WHERE role IN (...)
    const whereInPattern = /WHERE\s+(?!primary_)role\s+IN\s*\(/gi;
    content = content.replace(whereInPattern, () => {
        fileChanges++;
        return 'WHERE primary_role IN (';
    });

    // Pattern 4: UPDATE users SET role =
    const updatePattern = /UPDATE\s+users\s+SET\s+(?!primary_)role\s*=/gi;
    content = content.replace(updatePattern, () => {
        fileChanges++;
        return 'UPDATE users SET primary_role =';
    });

    // Pattern 5: INSERT INTO users (...role...)
    const insertPattern = /INSERT\s+INTO\s+users\s*\(([^)]*)\brol(?:e|es)\b([^)]*)\)/gi;
    content = content.replace(insertPattern, (match, before, after) => {
        if (match.includes('primary_role') || match.includes('granted_roles')) {
            return match;
        }
        fileChanges++;
        let fixed = match.replace(/\brole\b/g, 'primary_role');
        fixed = fixed.replace(/\broles\b/g, 'granted_roles');
        return fixed;
    });

    // Pattern 6: , role, in column lists
    const columnListPattern = /,\s*(?!primary_)role\s*,/gi;
    content = content.replace(columnListPattern, () => {
        fileChanges++;
        return ', primary_role,';
    });

    // Pattern 7: users.role
    const usersRolePattern = /users\.(?!primary_)role\b/gi;
    content = content.replace(usersRolePattern, () => {
        fileChanges++;
        return 'users.primary_role';
    });

    // Pattern 8: u.role (alias)
    const aliasPattern = /\bu\.(?!primary_)role\b/gi;
    content = content.replace(aliasPattern, () => {
        fileChanges++;
        return 'u.primary_role';
    });

    if (fileChanges > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        const relativePath = path.relative(path.join(__dirname, '..'), filePath);
        console.log(`✅ ${relativePath} (${fileChanges} changes)`);
        filesChanged++;
        totalChanges += fileChanges;
    }
});

console.log('\n' + '─'.repeat(50));
console.log(`📊 Summary:`);
console.log(`   Files scanned: ${files.length}`);
console.log(`   Files changed: ${filesChanged}`);
console.log(`   Total changes: ${totalChanges}`);
console.log('─'.repeat(50));

if (totalChanges > 0) {
    console.log('\n✅ Migration completed successfully!');
} else {
    console.log('\n⏭️  No changes needed');
}
