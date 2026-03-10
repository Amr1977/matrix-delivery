#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

// Production database URL
const PROD_URL = 'postgresql://neondb_owner:npg_6JEvapd0ifSy@ep-shy-tooth-ab6w37t9-pooler.eu-west-2.aws.neon.tech/matrix_delivery_production?sslmode=verify-full&channel_binding=require';

// Development database URL
const DEV_URL = 'postgresql://postgres:be_the_one@localhost:5432/matrix_delivery_develop';

// Backup file path
const BACKUP_FILE = path.join(__dirname, 'prod_backup.dump');

console.log('🔄 Starting production database clone to development...\n');

// Step 1: Create backup from production
console.log('📦 Step 1: Creating backup from production database...');
exec(`pg_dump "${PROD_URL}" -Fc -Z 9 -f "${BACKUP_FILE}"`, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Failed to create production backup:', error.message);
    console.error('STDERR:', stderr);
    return;
  }

  console.log('✅ Production backup created successfully!');
  console.log(`   Backup file: ${BACKUP_FILE}\n`);

  // Step 2: Drop and recreate development database
  console.log('🗑️  Step 2: Dropping and recreating development database...');
  exec(`psql "${DEV_URL.replace('matrix_delivery_develop', 'postgres')}" -c "DROP DATABASE IF EXISTS matrix_delivery_develop;"`, (error2, stdout2, stderr2) => {
    if (error2) {
      console.error('❌ Failed to drop development database:', error2.message);
      return;
    }

    exec(`psql "${DEV_URL.replace('matrix_delivery_develop', 'postgres')}" -c "CREATE DATABASE matrix_delivery_develop;"`, (error3, stdout3, stderr3) => {
      if (error3) {
        console.error('❌ Failed to create development database:', error3.message);
        return;
      }

      console.log('✅ Development database recreated successfully!\n');

      // Step 3: Restore backup to development
      console.log('📥 Step 3: Restoring backup to development database...');
      exec(`pg_restore -d "${DEV_URL}" -c "${BACKUP_FILE}"`, (error4, stdout4, stderr4) => {
        if (error4) {
          console.error('❌ Failed to restore backup to development:', error4.message);
          console.error('STDERR:', stderr4);
          return;
        }

        console.log('✅ Production database successfully cloned to development!\n');

        // Step 4: Verify the clone
        console.log('🔍 Step 4: Verifying clone...');
        exec(`psql "${DEV_URL}" -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`, (error5, stdout5, stderr5) => {
          if (error5) {
            console.error('❌ Failed to verify clone:', error5.message);
            return;
          }

          console.log('✅ Clone verification completed!');
          console.log('\n📋 Tables in development database:');
          console.log(stdout5);

          // Check user count
          exec(`psql "${DEV_URL}" -c "SELECT COUNT(*) as user_count FROM users;"`, (error6, stdout6, stderr6) => {
            if (!error6) {
              console.log('\n👥 User count in development database:');
              console.log(stdout6);
            }

            console.log('\n🎉 Database clone operation completed successfully!');
            console.log('\nNext steps:');
            console.log('1. Test your application with the cloned data');
            console.log('2. Verify all features work correctly');
            console.log('3. Clean up backup file if no longer needed: prod_backup.dump');
          });
        });
      });
    });
  });
});
