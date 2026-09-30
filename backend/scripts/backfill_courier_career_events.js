#!/usr/bin/env node
/**
 * Backfill script: Insert 'joined_platform' career event for every existing driver
 * Run once after migration 027/028 to initialize career history for existing accounts.
 * 
 * Usage: node backend/scripts/backfill_courier_career_events.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = require('../config/db');
const logger = require('../config/logger');

async function backfillCareerEvents() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get all drivers (primary_role = 'driver' or granted_roles includes 'driver')
    const driversResult = await client.query(`
      SELECT id, name, created_at 
      FROM users 
      WHERE primary_role = 'driver' 
         OR 'driver' = ANY(granted_roles)
      ORDER BY created_at
    `);
    
    logger.info(`Found ${driversResult.rows.length} drivers to backfill`);
    
    let inserted = 0;
    let skipped = 0;
    
    for (const driver of driversResult.rows) {
      // Check if career event already exists for this driver
      const existing = await client.query(
        `SELECT 1 FROM courier_career_events 
         WHERE courier_user_id = $1 AND event_type = 'joined_platform'`,
        [driver.id]
      );
      
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Insert joined_platform event dated from user's created_at
      await client.query(
        `INSERT INTO courier_career_events (courier_user_id, event_type, event_detail, occurred_at)
         VALUES ($1, 'joined_platform', $2, $3)`,
        [
          driver.id,
          JSON.stringify({ source: 'backfill', original_created_at: driver.created_at }),
          driver.created_at
        ]
      );
      
      inserted++;
      
      if (inserted % 100 === 0) {
        logger.info(`Backfill progress: ${inserted} inserted, ${skipped} skipped`);
      }
    }
    
    await client.query('COMMIT');
    
    logger.info(`Backfill complete: ${inserted} career events inserted, ${skipped} skipped (already existed)`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Backfill failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  backfillCareerEvents()
    .then(() => {
      console.log('✅ Backfill completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Backfill failed:', err);
      process.exit(1);
    });
}

module.exports = { backfillCareerEvents };