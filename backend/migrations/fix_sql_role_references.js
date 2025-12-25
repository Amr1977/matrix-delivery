/**
 * Fix all SQL queries that reference old 'primary_role' and 'granted_roles' columns
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');

// Read the file
let content = fs.readFileSync(serverPath, 'utf8');

// Track changes
let changeCount = 0;

// Pattern 1: WHERE primary_role = 'something'
const pattern1 = /WHERE\s+primary_role\s*=\s*'([^']+)'/gi;
const matches1 = content.match(pattern1);
if (matches1) {
    content = content.replace(pattern1, "WHERE primary_role = '$1'");
    changeCount += matches1.length;
    console.log(`✅ Fixed ${matches1.length} WHERE primary_role = clauses`);
}

// Pattern 2: WHERE primary_role IN (...)
const pattern2 = /WHERE\s+primary_role\s+IN\s*\(/gi;
content = content.replace(pattern2, 'WHERE primary_role IN (');
if (content !== content.replace(pattern2, 'WHERE primary_role IN (')) {
    changeCount++;
    console.log(`✅ Fixed WHERE primary_role IN clauses`);
}

// Pattern 3: SELECT ... primary_role ... FROM users
const pattern3 = /SELECT\s+([^;]*\b)primary_role(\b[^;]*)\s+FROM\s+users/gi;
const matches3 = content.match(pattern3);
if (matches3) {
    content = content.replace(pattern3, (match, before, after) => {
        return `SELECT ${before}primary_role${after} FROM users`;
    });
    changeCount += matches3.length;
    console.log(`✅ Fixed ${matches3.length} SELECT primary_role FROM users clauses`);
}

// Pattern 4: UPDATE users SET primary_role =
const pattern4 = /UPDATE\s+users\s+SET\s+primary_role\s*=/gi;
const matches4 = content.match(pattern4);
if (matches4) {
    content = content.replace(pattern4, 'UPDATE users SET primary_role =');
    changeCount += matches4.length;
    console.log(`✅ Fixed ${matches4.length} UPDATE users SET primary_role clauses`);
}

// Pattern 5: INSERT INTO users (...primary_role...)
const pattern5 = /INSERT\s+INTO\s+users\s*\([^)]*\brole\b[^)]*\)/gi;
const matches5 = content.match(pattern5);
if (matches5) {
    matches5.forEach(match => {
        const fixed = match.replace(/\brole\b/g, 'primary_role');
        content = content.replace(match, fixed);
    });
    changeCount += matches5.length;
    console.log(`✅ Fixed ${matches5.length} INSERT INTO users clauses`);
}

// Pattern 6: , primary_role, or ,primary_role FROM
const pattern6 = /,\s*primary_role\s*,/gi;
const matches6 = content.match(pattern6);
if (matches6) {
    content = content.replace(pattern6, ', primary_role,');
    changeCount += matches6.length;
    console.log(`✅ Fixed ${matches6.length} column list primary_role references`);
}

// Pattern 7: users.primary_role
const pattern7 = /users\.primary_role\b/gi;
const matches7 = content.match(pattern7);
if (matches7) {
    content = content.replace(pattern7, 'users.primary_role');
    changeCount += matches7.length;
    console.log(`✅ Fixed ${matches7.length} users.primary_role references`);
}

// Write back
if (changeCount > 0) {
    fs.writeFileSync(serverPath, content, 'utf8');
    console.log(`\n✅ Total changes made: ${changeCount}`);
    console.log(`✅ Updated ${serverPath}`);
} else {
    console.log('⏭️  No changes needed');
}
