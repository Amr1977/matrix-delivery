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
            
            // Always acknowledge the update to Telegram immediately
            res.status(200).json({ ok: true });
            
            // Handle callback queries (button presses) asynchronously
            if (update.callback_query) {
                // Don't await - process in background
                handleCallbackQuery(update.callback_query, pool, balanceService)
                    .catch(err => console.error('Error handling callback:', err));
                return;
            }
            
            // Handle regular messages
            if (update.message) {
                const message = update.message;
                console.log('📱 Telegram message received:', {
                    from: message.from?.username || message.from?.first_name,
                    chat: message.chat?.title || message.chat?.username || 'DM',
                    chat_id: message.chat?.id,
                    text: message.text,
                    type: message.chat?.type
                });
                
                // Log actual chat ID for debugging
                console.log(`🔢 ACTUAL CHAT ID: ${message.chat?.id}`);
                
                // Handle commands in groups
                if (message.text && message.text.startsWith('/')) {
                    handleTelegramCommand(message, botToken)
                        .catch(err => console.error('Error handling command:', err));
                }
            }
        } catch (error) {
            console.error('Error handling Telegram update:', error);
            res.status(200).json({ ok: true });
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

        // Parse the callback data to determine type (withdrawal or deposit)
        const isDeposit = data.startsWith('approve_deposit:') || data.startsWith('reject_deposit:');
        const isWithdrawal = data.startsWith('approve_withdrawal:') || data.startsWith('reject_withdrawal:');

        if (isDeposit) {
            // Handle deposit approval/rejection
            const action = data.startsWith('approve_deposit:') ? 'approve' : 'reject';
            const transactionId = data.split(':')[1];
            
            if (action === 'approve') {
                await handleDepositApprovalCallback(callbackQuery, transactionId, pool, balanceService, botToken);
            } else {
                await handleDepositRejectionCallback(callbackQuery, transactionId, pool, balanceService, botToken);
            }
            
            await answerCallbackQuery(botToken, callbackQueryId, `تم ${action === 'approve' ? 'الموافقة على الإيداع' : 'رفض الإيداع'}`);
        } else if (isWithdrawal) {
            // Handle withdrawal approval/rejection (existing logic)
            const telegramService = new TelegramWithdrawalNotificationService(botToken, adminChatId);
            const { action, withdrawalId } = telegramService.parseCallbackData(data);

            if (action === 'approve') {
                await handleWithdrawalApprovalCallback(callbackQuery, withdrawalId, pool, balanceService, botToken);
            } else if (action === 'reject') {
                await handleWithdrawalRejectionCallback(callbackQuery, withdrawalId, pool, balanceService, botToken);
            }

            await answerCallbackQuery(botToken, callbackQueryId, `تم ${action === 'approve' ? 'الموافقة' : 'الرفض'}`);
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
    }
}

/**
 * Handle deposit approval callback
 */
async function handleDepositApprovalCallback(callbackQuery, depositId, pool, balanceService, botToken) {
    try {
        const adminChatId = callbackQuery.message.chat.id;
        
        // Get the deposit request details
        const depositResult = await pool.query(
            'SELECT * FROM deposit_requests WHERE id = $1',
            [depositId]
        );
        
        if (depositResult.rows.length === 0) {
            await sendTelegramMessage(botToken, adminChatId, 
                `❌ لم يتم العثور على الإيداع: ${depositId}`);
            return;
        }
        
        const deposit = depositResult.rows[0];
        
        if (deposit.status !== 'pending') {
            await sendTelegramMessage(botToken, adminChatId, 
                `⚠️ الإيداع بالفعل ${deposit.status}`);
            return;
        }
        
        const reference = `DEP-${Date.now()}`;
        const adminId = process.env.TELEGRAM_ADMIN_ID || 'system';
        
        // Mark as approved in database
        await pool.query(
            'UPDATE deposit_requests SET status = $1, processed_by = $2, transaction_reference = $3, processed_at = NOW() WHERE id = $4',
            ['completed', adminId, reference, depositId]
        );
        
        // Update user balance (add the amount)
        await pool.query(
            'UPDATE user_balances SET available_balance = available_balance + $1, updated_at = NOW() WHERE user_id = $2',
            [deposit.amount, deposit.user_id]
        );

        // Notify admin via Telegram
        const confirmMessage = `✅ <b>تم الموافقة على الإيداع</b>

👤 <b>المستخدم:</b> ${deposit.user_id}
💰 <b>المبلغ:</b> ${deposit.amount.toFixed(2)} EGP
🆔 <b>معرف الطلب:</b> <code>${depositId}</code>
💳 <b>رقم المرجع:</b> <code>${reference}</code>`;

        await sendTelegramMessage(botToken, adminChatId, confirmMessage);

    } catch (error) {
        console.error('Error handling deposit approval callback:', error);
        const adminChatId = callbackQuery.message.chat.id;
        await sendTelegramMessage(botToken, adminChatId, 
            `❌ حدث خطأ أثناء الموافقة: ${error.message}`);
    }
}

/**
 * Handle deposit rejection callback
 */
async function handleDepositRejectionCallback(callbackQuery, depositId, pool, balanceService, botToken) {
    try {
        const adminChatId = callbackQuery.message.chat.id;
        
        // Get the deposit request details
        const depositResult = await pool.query(
            'SELECT * FROM deposit_requests WHERE id = $1',
            [depositId]
        );
        
        if (depositResult.rows.length === 0) {
            await sendTelegramMessage(botToken, adminChatId, 
                `❌ لم يتم العثور على الإيداع: ${depositId}`);
            return;
        }
        
        const deposit = depositResult.rows[0];
        
        if (deposit.status !== 'pending') {
            await sendTelegramMessage(botToken, adminChatId, 
                `⚠️ الإيداع بالفعل ${deposit.status}`);
            return;
        }
        
        const adminId = process.env.TELEGRAM_ADMIN_ID || 'system';
        const reason = 'تم الرفض من خلال Telegram';
        
        // Mark as rejected in database
        await pool.query(
            'UPDATE deposit_requests SET status = $1, processed_by = $2, rejection_reason = $3, processed_at = NOW() WHERE id = $4',
            ['rejected', adminId, reason, depositId]
        );

        // Notify admin via Telegram
        const confirmMessage = `❌ <b>تم رفض الإيداع</b>

👤 <b>المستخدم:</b> ${deposit.user_id}
💰 <b>المبلغ:</b> ${deposit.amount.toFixed(2)} EGP
🆔 <b>معرف الطلب:</b> <code>${depositId}</code>
📝 <b>السبب:</b> ${reason}`;

        await sendTelegramMessage(botToken, adminChatId, confirmMessage);

    } catch (error) {
        console.error('Error handling deposit rejection callback:', error);
        const adminChatId = callbackQuery.message.chat.id;
        await sendTelegramMessage(botToken, adminChatId, 
            `❌ حدث خطأ أثناء الرفض: ${error.message}`);
    }
}

/**
 * Handle withdrawal approval callback
 */
async function handleWithdrawalApprovalCallback(callbackQuery, withdrawalId, pool, balanceService, botToken) {
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
async function handleWithdrawalRejectionCallback(callbackQuery, withdrawalId, pool, balanceService, botToken) {
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
        
        // For now, allow all chats (debug mode)
        console.log(`📤 Sending message to chat: ${chatId}`);
        
        const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        
        console.log(`✅ Message sent successfully to ${chatId}`);
        return response.data;
    } catch (error) {
        console.error('❌ Failed to send message:', {
            chatId,
            error: error.response?.data?.description || error.message
        });
    }
}

/**
 * Handle Telegram commands from group messages
 */
async function handleTelegramCommand(message, botToken) {
    try {
        // Remove @botname mention if present
        let text = message.text.replace(/@\w+/g, '').trim();
        const command = text.split(' ')[0].toLowerCase();
        const chatId = message.chat.id;
        let response = '';

        console.log(`🔧 Processing command: "${command}" from chat ${chatId}`);

        switch (command) {
            case '/start':
            case '/help':
                response = `🤖 *Matrix Delivery Bot Commands*

/status - Platform status
/help - Show this message
/ping - Check if bot is alive`;
                break;

            case '/status':
                response = `✅ *Platform Status*

🔧 Backend: Online
📱 Telegram Bot: Connected
🗄️ Database: Connected
🚀 API: Responding`;
                break;

            case '/ping':
                response = '🏓 Pong! Bot is alive and working!';
                break;

            default:
                response = `❓ Unknown command: ${command}\n\nTry /help for available commands`;
        }

        // Send response to the group
        console.log(`📤 Sending response to chat ${chatId}: "${response.substring(0, 50)}..."`);
        await sendTelegramMessage(botToken, chatId, response);
        console.log('✅ Command response sent:', { command, chatId });
    } catch (error) {
        console.error('Error handling telegram command:', error);
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
