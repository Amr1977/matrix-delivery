const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to load .env from backend root if not already loaded
// Assuming this script is run from backend/scripts or backend root
// We will look for .env in the parent directory if running from scripts/

const backendRoot = path.resolve(__dirname, '..');
const envPath = path.join(backendRoot, '.env');

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    // try default loading
    require('dotenv').config();
}

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    console.error('❌ Error: Missing database configuration variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD).');
    console.error('Please ensure you have a .env file with these variables in the backend directory.');
    process.exit(1);
}

// Generate timestamp for filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(backendRoot, 'backups');

// Create backups directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Check for pg_dump availability (basic check)
exec('pg_dump --version', (err, stdout) => {
    if (err) {
        console.warn('⚠️ Warning: pg_dump command not found or failed to run. Ensure PostgreSQL tools are installed and in the PATH.');
        console.warn('If you are on the VPS, you might need to install postgresql-client.');
        // We continue anyway in case it's a path issue that exec handles differently
    } else {
        console.log(`Using ${stdout.trim()}`);
    }

    const filename = `backup_${DB_NAME}_${timestamp}.dump`;
    const outputPath = path.join(backupDir, filename);

    console.log(`Starting backup for database: ${DB_NAME} at ${DB_HOST}...`);
    console.log(`Output file: ${outputPath}`);

    // Using -F c (Custom format) which is compressed and suitable for pg_restore
    const command = `pg_dump -h ${DB_HOST} -p ${DB_PORT || 5432} -U ${DB_USER} -F c -f "${outputPath}" ${DB_NAME}`;

    const child = exec(command, {
        env: {
            ...process.env,
            PGPASSWORD: DB_PASSWORD // Pass password safely via env variable
        }
    });

    child.stdout.on('data', (data) => console.log(data.toString()));
    child.stderr.on('data', (data) => console.error(data.toString()));

    child.on('close', (code) => {
        if (code === 0) {
            console.log(`\n✅ Backup completed successfully!`);
            console.log(`File saved at: ${outputPath}`);
            console.log(`\nTo restore this backup, use:`);
            console.log(`pg_restore -d ${DB_NAME} "${outputPath}"`);
        } else {
            console.error(`\n❌ Backup failed with exit code ${code}`);
        }
    });
});
