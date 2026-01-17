const pool = require('./config/db');

module.exports = async () => {
  try {
    await pool.end();
  } catch (err) {
    // Ignore errors during teardown
  }
};

