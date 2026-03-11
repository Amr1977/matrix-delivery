/**
 * Telegram Polling Service
 * 
 * Polls Telegram for updates instead of using webhooks
 * Handles /dev commands for remote VPS control
 */

const axios = require('axios');

class TelegramPollingService {
  constructor(botToken, pool, balanceService) {
    this.botToken = botToken;
    this.pool = pool;
    this.balanceService = balanceService;
    this.lastUpdateId = 0;
    this.isRunning = false;
    this.pollInterval = null;
    this.adminChatId = parseInt(process.env.TELEGRAM_ADMIN_CHAT_ID);
  }

  /**
   * Start polling for updates
   */
  start() {
    if (this.isRunning) {
      console.warn('⚠️ Telegram polling already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Telegram polling service...');

    // Poll immediately, then every 2 seconds
    this.poll();
    this.pollInterval = setInterval(() => this.poll(), 2000);
  }

  /**
   * Stop polling
   */
  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      this.isRunning = false;
      console.log('⏹️ Telegram polling stopped');
    }
  }

  /**
   * Poll for updates from Telegram
   */
  async poll() {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;

      const response = await axios.get(url, {
        params: {
          offset: this.lastUpdateId + 1,
          timeout: 0,
          allowed_updates: ['message', 'callback_query']
        }
      });

      if (!response.data.ok) {
        console.error('❌ Telegram API error:', response.data.description);
        return;
      }

      const updates = response.data.result;

      if (updates.length > 0) {
        console.log(`📬 Received ${updates.length} update(s)`);

        for (const update of updates) {
          this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);

          try {
            if (update.message) {
              await this.handleMessage(update.message);
            } else if (update.callback_query) {
              await this.handleCallbackQuery(update.callback_query);
            }
          } catch (err) {
            console.error('Error processing update:', err.message);
          }
        }
      }
    } catch (error) {
      if (error.message.includes('409')) {
        console.warn('⚠️ 409 Conflict - webhook might still be active');
      } else {
        console.error('❌ Polling error:', error.message);
      }
    }
  }

  /**
   * Handle incoming message
   */
  async handleMessage(message) {
    const chatId = message.chat.id;
    const text = message.text || '';

    console.log('📩 Message from', message.from?.username || 'unknown', ':', text.substring(0, 50));

    // Only process dev commands in private chat with admin
    if (text.startsWith('/dev') && chatId === this.adminChatId) {
      console.log('🔧 Dev command detected');
      await this.handleDevCommand(message);
    }
  }

  /**
   * Handle dev commands
   */
  async handleDevCommand(message) {
    const chatId = message.chat.id;
    const text = message.text.substring(1).trim(); // Remove /
    const parts = text.split(' ');

    if (parts[0].toLowerCase() !== 'dev') return;

    const command = parts[1]?.toLowerCase() || '';
    const params = parts.slice(2).join(' ');

    console.log(`🔧 Dev command: ${command} ${params}`);

    try {
      const response = await this.executeDevCommand(command, params);
      await this.sendMessage(chatId, response);
    } catch (error) {
      console.error('Dev command error:', error);
      await this.sendMessage(chatId, `❌ *Error:* ${error.message}`);
    }
  }

  /**
   * Execute dev commands on VPS
   */
  async executeDevCommand(command, params) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    console.log(`⚙️ EXECUTING DEV COMMAND: ${command} ${params}`);

    try {
      switch (command) {
        case 'git': {
          const result = await execAsync(`cd /home/ubuntu/matrix-delivery && git ${params}`, {
            timeout: 30000
          });
          const output = result.stdout.substring(0, 500);
          return `✅ *Git:* \n\`\`\`\n${output}\n\`\`\``;
        }

        case 'pm2': {
          const result = await execAsync(`pm2 ${params}`, { timeout: 15000 });
          const output = result.stdout.substring(0, 500);
          return `✅ *PM2:* \n\`\`\`\n${output}\n\`\`\``;
        }

        case 'status': {
          const result = await execAsync('pm2 list', { timeout: 10000 });
          return `✅ *Server Status:*\n\`\`\`\n${result.stdout.substring(0, 400)}\n\`\`\``;
        }

        case 'restart': {
          await execAsync('pm2 restart matrix-delivery-backend --update-env', { timeout: 20000 });
          return '✅ *Backend restarting...* (check status in 10s)';
        }

        case 'logs': {
          const lines = params.match(/\d+/) ? params.match(/\d+/)[0] : '30';
          const result = await execAsync(
            `pm2 logs matrix-delivery-backend --lines ${lines}`,
            { timeout: 15000 }
          );
          return `📋 *Recent Logs:*\n\`\`\`\n${result.stdout.substring(0, 400)}\n\`\`\``;
        }

        case 'ping':
          return '🏓 *Pong!* VPS Agent is alive and responding!';

        case 'help':
          return `🔧 *Dev Commands:*
\`/dev git status\` - Git status
\`/dev git pull origin branch\` - Pull code
\`/dev pm2 list\` - List processes
\`/dev status\` - Server status
\`/dev restart\` - Restart backend
\`/dev logs [lines]\` - View logs
\`/dev ping\` - Check agent`;

        default:
          return `❓ *Unknown command:* ${command}\n\nType \`/dev help\` for available commands`;
      }
    } catch (error) {
      if (error.code === 'ETIMEDOUT') {
        return `⏱️ *Timeout:* Command took too long`;
      }
      return `❌ *Error:* ${error.message.substring(0, 200)}`;
    }
  }

  /**
   * Handle callback query (button press)
   */
  async handleCallbackQuery(callbackQuery) {
    console.log('🔘 Callback query:', callbackQuery.data?.substring(0, 50));
    // Implement callback handling here if needed
  }

  /**
   * Send message via Telegram API
   */
  async sendMessage(chatId, text) {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await axios.post(url, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      });

      console.log(`✅ Message sent to ${chatId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send message:', error.response?.data?.description || error.message);
    }
  }
}

module.exports = TelegramPollingService;
