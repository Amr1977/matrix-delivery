/**
 * Telegram Callback Handler Middleware
 * 
 * Handles callback queries from Telegram inline buttons
 * Verifies authenticity and processes withdrawal approvals/rejections
 */

const TelegramWithdrawalNotificationService = require('../services/telegramWithdrawalNotificationService');

/**
 * Verify Telegram webhook authenticity
 * In a real production setup, you should verify the X-Telegram-Bot-Api-Secret-Token header
 */
const verifyTelegramWebhook = (botToken) => {
    return (req, res, next) => {
        // Check for valid Telegram webhook signature
        // For now, we trust that the webhook is properly configured
        const secretToken = process.env.TELEGRAM_SECRET_TOKEN;
        
        if (secretToken && req.headers['x-telegram-bot-api-secret-token'] !== secretToken) {
            console.warn('Invalid Telegram webhook signature');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        next();
    };
};

/**
 * Handle incoming Telegram updates (messages and callback queries)
 */
const handleTelegramUpdate = (pool, balanceService) => {
    return async (req, res, next) => {
        try {
            const update = req.body;
            
            // Handle callback queries (button presses)
            if (update.callback_query) {
                return await handleCallbackQuery(update.callback_query, pool, balanceService);
            }
            
            // Handle regular messages
            if (update.message) {
                console.log('Telegram message received:', update.message.text);
                // You can add command handlers here if needed
            }

            // Always acknowledge the update to Telegram
            res.status(200).json({ ok: true });
        } catch (error) {
            console.error('Error handling Telegram update:', error);
            res.status(200).json({ ok: true }); // Still acknowledge to prevent Telegram retries
        }
    };
};

/**
 * Handle callback query (button press) from Telegram
 */
async function handleCallbackQuery(callbackQuery, pool, balanceService) {
    try {
        const { id: callbackQueryId, from, data } = callbackQuery;
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

        if (!data) {
            return;
        }

        // Parse the callback data
        const telegramService = new TelegramWithdrawalNotificationService(botToken, adminChatId);
        const { action, withdrawalId } = telegramService.parseCallbackData(data);

        if (action === 'approve') {
            await handleApprovalCallback(callbackQuery, withdrawalId, pool, balanceService, botToken);
        } else if (action === 'reject') {
            await handleRejectionCallback(callbackQuery, withdrawalId, pool, balanceService, botToken);
        }

        // Answer the callback query to remove the loading state
        await answerCallbackQuery(botToken, callbackQueryId, `تم ${action === 'approve' ? 'الموافقة' : 'الرفض'}`);
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
}

/**
 * Handle withdrawal approval callback
 */
async function handleApprovalCallback(callbackQuery, withdrawalId, pool, balanceService, botToken) {
    try {
        // Ask for transaction reference via inline prompt or next message
        const adminChatId = callbackQuery.message.chat.id;
        
        // For now, we'll just mark it as approved with a placeholder reference
        // In production, you might want to ask for the reference via a follow-up message
        
        const adminId = process.env.TELEGRAM_ADMIN_ID || 'system';
        const reference = `TG-${Date.now()}`; // Generate reference

        await balanceService.approveWithdrawal(adminId, withdrawalId, reference);

        // Notify admin via Telegram
        const confirmMessage = `✅ <b>تم الموافقة على الطلب</b>

🆔 <b>رقم الطلب:</b> <code>${withdrawalId}</code>
💳 <b>المرجع:</b> <code>${reference}</code>`;

        await sendTelegramMessage(botToken, adminChatId, confirmMessage);

    } catch (error) {
        console.error('Error handling approval callback:', error);
        const adminChatId = callbackQuery.message.chat.id;
        await sendTelegramMessage(botToken, adminChatId, 
            `❌ حدث خطأ أثناء الموافقة: ${error.message}`);
    }
}

/**
 * Handle withdrawal rejection callback
 */
async function handleRejectionCallback(callbackQuery, withdrawalId, pool, balanceService, botToken) {
    try {
        const adminChatId = callbackQuery.message.chat.id;
        const adminId = process.env.TELEGRAM_ADMIN_ID || 'system';
        const reason = 'تم الرفض من خلال Telegram';

        await balanceService.rejectWithdrawal(adminId, withdrawalId, reason);

        // Notify admin via Telegram
        const confirmMessage = `❌ <b>تم رفض الطلب</b>

🆔 <b>رقم الطلب:</b> <code>${withdrawalId}</code>
📝 <b>السبب:</b> ${reason}`;

        await sendTelegramMessage(botToken, adminChatId, confirmMessage);

    } catch (error) {
        console.error('Error handling rejection callback:', error);
        const adminChatId = callbackQuery.message.chat.id;
        await sendTelegramMessage(botToken, adminChatId, 
            `❌ حدث خطأ أثناء الرفض: ${error.message}`);
    }
}

/**
 * Send message via Telegram Bot API
 */
async function sendTelegramMessage(botToken, chatId, text) {
    try {
        const axios = require('axios');
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    } catch (error) {
        console.error('Failed to send Telegram message:', error.message);
    }
}

/**
 * Answer callback query to remove loading state
 */
async function answerCallbackQuery(botToken, callbackQueryId, text = null) {
    try {
        const axios = require('axios');
        await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
            callback_query_id: callbackQueryId,
            text: text || 'تم',
            show_alert: false
        });
    } catch (error) {
        console.error('Failed to answer callback query:', error.message);
    }
}

module.exports = {
    verifyTelegramWebhook,
    handleTelegramUpdate
};
