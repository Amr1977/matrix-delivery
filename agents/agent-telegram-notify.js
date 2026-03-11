#!/usr/bin/env node

/**
 * Agent Telegram Notifier
 * Allows distributed agents to post progress/updates to shared group
 */

const https = require('https');

const TELEGRAM_BOT_TOKEN = '***REDACTED***';
const TELEGRAM_GROUP_ID = '-1005179780577'; // Matrix Systems EG group

class AgentNotifier {
  constructor(agentName) {
    this.agentName = agentName;
    this.timestamp = new Date().toISOString();
  }

  async send(message, type = 'info') {
    const emoji = {
      'success': '✅',
      'error': '❌',
      'progress': '🔨',
      'info': 'ℹ️',
      'warning': '⚠️',
      'ready': '✅'
    }[type] || 'ℹ️';

    const fullMessage = `${emoji} **[${this.agentName}]** ${message}\n\n_${this.timestamp}_`;

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        chat_id: TELEGRAM_GROUP_ID,
        text: fullMessage,
        parse_mode: 'Markdown'
      });

      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Telegram API error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

// Export for use in agent scripts
module.exports = AgentNotifier;
