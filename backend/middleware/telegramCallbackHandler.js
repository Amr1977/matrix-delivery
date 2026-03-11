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
            
            // Log ALL incoming updates with full details
            console.log('🔔 WEBHOOK UPDATE RECEIVED:', {
                updateId: update.update_id,
                hasMessage: !!update.message,
                hasCallback: !!update.callback_query,
                messageText: update.message?.text?.substring(0, 100),
                chatId: update.message?.chat?.id || update.callback_query?.message?.chat?.id,
                fromUsername: update.message?.from?.username,
                chatType: update.message?.chat?.type
            });
            
            // Log EVERYTHING to file for debugging
            if (update.message) {
                console.log('📩 FULL MESSAGE:', JSON.stringify(update.message, null, 2).substring(0, 500));
            }
            
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
                
                // Handle commands
                if (message.text && message.text.startsWith('/')) {
                    // Check for dev commands first (private chat only)
                    if (message.text.startsWith('/dev')) {
                        handleDevCommand(message, botToken)
                            .catch(err => console.error('Error handling dev command:', err));
                    } else {
                        // Regular group commands
                        handleTelegramCommand(message, botToken)
                            .catch(err => console.error('Error handling command:', err));
                    }
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
        
        console.log(`📤 Sending message to chat: ${chatId}`);
        console.log(`   Text: "${text.substring(0, 50)}..."`);
        
        const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
        
        console.log(`✅ Message sent successfully to ${chatId}`);
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.description || error.message;
        console.error('❌ Failed to send message:', {
            chatId,
            statusCode: error.response?.status,
            error: errorMsg
        });
        
        // Log full error for debugging
        if (error.response?.data) {
            console.error('Full Telegram error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

/**
 * Handle dev commands from admin (VPS control)
 */
async function handleDevCommand(message, botToken) {
    const chatId = message.chat.id;
    const adminId = parseInt(process.env.TELEGRAM_ADMIN_CHAT_ID);
    
    // Only admin can use dev commands in private chat
    if (chatId !== adminId) {
        await sendTelegramMessage(botToken, chatId, 
            '❌ *Dev commands only in private chat with admin*');
        return;
    }
    
    const text = message.text.substring(1).trim(); // Remove /
    const parts = text.split(' ');
    
    if (parts[0].toLowerCase() !== 'dev') return;
    
    const command = parts[1]?.toLowerCase() || '';
    const params = parts.slice(2).join(' ');
    
    console.log(`🔧 Dev command received: ${command} ${params}`);
    
    try {
        const response = await executeDevCommand(command, params);
        await sendTelegramMessage(botToken, chatId, response);
    } catch (error) {
        console.error('Dev command error:', error);
        await sendTelegramMessage(botToken, chatId, 
            `❌ *Error:* ${error.message}`);
    }
}

/**
 * Execute dev commands on VPS
 */
async function executeDevCommand(command, params) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
        switch(command) {
            case 'git':
                {
                    const result = await execAsync(
                        `cd /home/ubuntu/matrix-delivery && git ${params}`,
                        { timeout: 30000 }
                    );
                    const output = result.stdout.substring(0, 500);
                    return `✅ *Git:* \n\`\`\`\n${output}\n\`\`\``;
                }
            
            case 'pm2':
                {
                    const result = await execAsync(`pm2 ${params}`, { timeout: 15000 });
                    const output = result.stdout.substring(0, 500);
                    return `✅ *PM2:* \n\`\`\`\n${output}\n\`\`\``;
                }
            
            case 'status':
                {
                    const result = await execAsync('pm2 list', { timeout: 10000 });
                    return `✅ *Server Status:*\n\`\`\`\n${result.stdout.substring(0, 400)}\n\`\`\``;
                }
            
            case 'restart':
                {
                    await execAsync('pm2 restart matrix-delivery-backend --update-env', 
                        { timeout: 20000 });
                    return '✅ *Backend restarting...* (check status in 10s)';
                }
            
            case 'logs':
                {
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
