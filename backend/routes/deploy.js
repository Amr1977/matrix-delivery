const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const logger = require('../config/logger');
const path = require('path');

// POST /api/deploy
// Triggers the deployment script
router.post('/', (req, res) => {
    logger.info('🚀 Deployment triggered via API');

    // Use absolute path to the script
    const scriptPath = path.join(__dirname, '../scripts/deploy.sh');

    // Execute the deployment script
    // Note: This requires a bash environment (Linux/Git Bash)
    exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            logger.error(`❌ Deployment failed: ${error.message}`);
            // Don't expose internal error details in production ideally, but helpful for debugging
            return res.status(500).json({ error: 'Deployment failed', details: error.message });
        }

        if (stderr) {
            logger.warn(`⚠️ Deployment stderr: ${stderr}`);
        }

        logger.info(`✅ Deployment success: ${stdout}`);
        res.json({ message: 'Deployment executed successfully', output: stdout });
    });
});

module.exports = router;
