/**
 * Telegram Withdrawal Notification Service
 * 
 * Sends withdrawal requests to admin via Telegram bot
 * Supports inline buttons for approve/reject actions
 */

const axios = require('axios');

class TelegramWithdrawalNotificationService {
    constructor(botToken, adminChatId) {
        if (!botToken || !adminChatId) {
            throw new Error('Telegram bot token and admin chat ID are required');
        }
        this.botToken = botToken;
        this.adminChatId = adminChatId;
        this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    }

    /**
     * Send withdrawal request notification to admin
     * 
     * @param {Object} withdrawal - Withdrawal request object
     * @param {string} withdrawal.id - Withdrawal request ID
     * @param {string} withdrawal.user_id - User ID
     * @param {number} withdrawal.amount - Amount to withdraw
     * @param {string} withdrawal.method - Payment method (instapay, vodafone_cash)
     * @param {string} withdrawal.account_number - Account number
     * @param {Date} withdrawal.created_at - Creation timestamp
     * @param {Object} user - User object
     * @param {string} user.full_name - User full name
     * @param {string} user.phone_number - User phone number
     * 
     * @returns {Promise<Object>} Telegram message response
     */
    async notifyWithdrawalRequest(withdrawal, user) {
        try {
            // Ensure amount is a number
            const amountNum = typeof withdrawal.amount === 'string' ? parseFloat(withdrawal.amount) : withdrawal.amount;
            const withdrawalWithNumber = { ...withdrawal, amount: amountNum };
            
            const formatCurrency = (amount) => `${(typeof amount === 'string' ? parseFloat(amount) : amount).toFixed(2)} EGP`;
            const methodLabel = this.getMethodLabel(withdrawal.withdrawal_method || withdrawal.method);
            
            const message = this._buildWithdrawalMessage(
                withdrawalWithNumber,
                user,
                methodLabel,
                formatCurrency
            );

            const inlineKeyboard = {
                inline_keyboard: [
                    [
                        {
                            text: '✅ قبول',
                            callback_data: `approve_withdrawal:${withdrawal.id}`
                        },
                        {
                            text: '❌ رفض',
                            callback_data: `reject_withdrawal:${withdrawal.id}`
                        }
                    ]
                ]
            };

            return await this._sendMessage(message, inlineKeyboard);
        } catch (error) {
            console.error('Failed to send Telegram withdrawal notification:', error);
            throw error;
        }
    }

    /**
     * Build withdrawal request message
     * 
     * @private
     */
    _buildWithdrawalMessage(withdrawal, user, methodLabel, formatCurrency) {
        const createdAt = new Date(withdrawal.created_at).toLocaleString('ar-EG', {
            timeZone: 'Africa/Cairo'
        });

        return `🔄 <b>طلب سحب جديد</b>

👤 <b>المستخدم:</b> ${user.full_name}
📱 <b>الهاتف:</b> <code>${user.phone_number}</code>

💰 <b>المبلغ:</b> ${formatCurrency(withdrawal.amount)}
🏦 <b>طريقة السحب:</b> ${methodLabel}
🔢 <b>رقم الحساب:</b> <code>${withdrawal.destination_details || withdrawal.account_number}</code>

⏰ <b>الوقت:</b> ${createdAt}
🆔 <b>رقم الطلب:</b> <code>${withdrawal.id}</code>`;
    }

    /**
     * Get localized method label
     * 
     * @private
     */
    getMethodLabel(method) {
        const methodLabels = {
            'instapay': 'Instapay إنستاباي',
            'vodafone_cash': 'Vodafone Cash فودافون كاش'
        };
        return methodLabels[method] || method;
    }

    /**
     * Send approval/rejection confirmation
     * 
     * @param {string} withdrawalId - Withdrawal request ID
     * @param {string} action - 'approved' or 'rejected'
     * @param {string} reference - Transaction reference (for approvals)
     * @param {string} reason - Rejection reason (for rejections)
     * 
     * @returns {Promise<Object>} Telegram message response
     */
    async notifyWithdrawalActionTaken(withdrawalId, action, reference = null, reason = null) {
        try {
            let message;
            
            if (action === 'approved') {
                message = `✅ <b>تم الموافقة على طلب السحب</b>
                
🆔 <b>رقم الطلب:</b> <code>${withdrawalId}</code>
💳 <b>رقم المرجع:</b> <code>${reference}</code>
⏰ <b>الوقت:</b> ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`;
            } else if (action === 'rejected') {
                message = `❌ <b>تم رفض طلب السحب</b>
                
🆔 <b>رقم الطلب:</b> <code>${withdrawalId}</code>
📝 <b>السبب:</b> ${reason || 'لم يتم تحديد سبب'}
⏰ <b>الوقت:</b> ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`;
            }

            return await this._sendMessage(message);
        } catch (error) {
            console.error('Failed to send withdrawal action confirmation:', error);
            throw error;
        }
    }

    /**
     * Send raw message to admin
     * 
     * @private
     */
    async _sendMessage(text, replyMarkup = null) {
        try {
            const payload = {
                chat_id: this.adminChatId,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            };

            if (replyMarkup) {
                payload.reply_markup = replyMarkup;
            }

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
     * Handle callback query from Telegram button press
     * Returns action and withdrawal ID
     * 
     * @param {string} callbackData - Callback data from button
     * @returns {Object} { action: string, withdrawalId: string }
     */
    parseCallbackData(callbackData) {
        const [action, withdrawalId] = callbackData.split(':');
        return {
            action: action === 'approve_withdrawal' ? 'approve' : 'reject',
            withdrawalId: withdrawalId
        };
    }
}

module.exports = TelegramWithdrawalNotificationService;
