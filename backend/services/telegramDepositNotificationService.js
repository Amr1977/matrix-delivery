/**
 * Telegram Deposit Notification Service
 * 
 * Sends notifications when users deposit money
 */

const axios = require('axios');

class TelegramDepositNotificationService {
    constructor(botToken, adminChatId) {
        if (!botToken || !adminChatId) {
            throw new Error('Telegram bot token and admin chat ID are required');
        }
        this.botToken = botToken;
        this.adminChatId = adminChatId;
        this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    }

    /**
     * Send deposit notification to admin
     * 
     * @param {Object} deposit - Deposit transaction object
     * @param {string} deposit.id - Transaction ID
     * @param {string} deposit.user_id - User ID
     * @param {number} deposit.amount - Amount deposited
     * @param {Date} deposit.created_at - Creation timestamp
     * @param {Object} user - User object
     * @param {string} user.full_name - User full name
     * @param {string} user.phone_number - User phone number
     * 
     * @returns {Promise<Object>} Telegram message response
     */
    async notifyDeposit(deposit, user) {
        try {
            const formatCurrency = (amount) => {
                const num = typeof amount === 'string' ? parseFloat(amount) : amount;
                return `${num.toFixed(2)} EGP`;
            };
            
            const message = this._buildDepositMessage(deposit, user, formatCurrency);

            // Send with buttons for approval
            return await this._sendMessageWithButtons(message, deposit.id);
        } catch (error) {
            console.error('Failed to send Telegram deposit notification:', error);
            throw error;
        }
    }

    /**
     * Build deposit message
     * 
     * @private
     */
    _buildDepositMessage(deposit, user, formatCurrency) {
        const createdAt = new Date(deposit.created_at).toLocaleString('ar-EG', {
            timeZone: 'Africa/Cairo'
        });

        // Ensure amount is a number
        const amount = typeof deposit.amount === 'string' ? parseFloat(deposit.amount) : deposit.amount;

        return `💳 <b>إيداع جديد</b>

👤 <b>المستخدم:</b> ${user.full_name}
📱 <b>الهاتف:</b> <code>${user.phone_number}</code>
🆔 <b>User ID:</b> <code>${deposit.user_id}</code>

💰 <b>المبلغ:</b> ${formatCurrency(amount)}

⏰ <b>الوقت:</b> ${createdAt}
🆔 <b>Transaction ID:</b> <code>${deposit.id}</code>`;
    }

    /**
     * Send message with approval/rejection buttons
     * 
     * @private
     */
    async _sendMessageWithButtons(text, transactionId) {
        try {
            const payload = {
                chat_id: this.adminChatId,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '✅ Approve Deposit',
                                callback_data: `approve_deposit:${transactionId}`
                            },
                            {
                                text: '❌ Reject Deposit',
                                callback_data: `reject_deposit:${transactionId}`
                            }
                        ]
                    ]
                }
            };

            const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);
            
            return {
                success: true,
                messageId: response.data.result.message_id,
                chatId: response.data.result.chat.id
            };
        } catch (error) {
            console.error('Telegram API error:', error.response?.data || error.message);
            throw new Error(`Failed to send Telegram message: ${error.message}`);
        }
    }

    /**
     * Send raw message to admin
     * 
     * @private
     */
    async _sendMessage(text) {
        try {
            const payload = {
                chat_id: this.adminChatId,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            };

            const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);
            
            return {
                success: true,
                messageId: response.data.result.message_id,
                chatId: response.data.result.chat.id
            };
        } catch (error) {
            console.error('Telegram API error:', error.response?.data || error.message);
            throw new Error(`Failed to send Telegram message: ${error.message}`);
        }
    }
}

module.exports = TelegramDepositNotificationService;
