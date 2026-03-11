# Telegram Withdrawal Notifications Integration

This document explains how to set up and use the Telegram bot integration for withdrawal request notifications.

## Overview

The Telegram integration sends withdrawal requests to the admin via a Telegram bot with inline action buttons. The admin can approve or reject withdrawals directly from Telegram.

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/start` to begin
3. Send `/newbot` to create a new bot
4. Follow the prompts to name your bot and set a username
5. Copy the **bot token** (looks like: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### 2. Get Your Admin Chat ID

1. Search for **@userinfobot** on Telegram
2. Send it any message
3. It will reply with your user ID (e.g., `7615344890`)
4. This is your `TELEGRAM_ADMIN_CHAT_ID`

### 3. Set Environment Variables

Add these to your `.env` file:

```env
# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Your admin chat ID
TELEGRAM_ADMIN_CHAT_ID=7615344890

# Optional: Secret token for webhook verification
TELEGRAM_SECRET_TOKEN=your_secret_webhook_token

# Admin user ID (your Telegram user ID)
TELEGRAM_ADMIN_ID=7615344890
```

### 4. Configure Telegram Webhook

Set up the webhook so Telegram sends updates to your backend:

```bash
# Replace with your actual domain and bot token
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/v1/balance/telegram/webhook",
    "secret_token": "your_secret_webhook_token"
  }'
```

**For AWS/Production:**
If your API is on AWS (e.g., `matrix-delivery-api.mywire.org`):

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://matrix-delivery-api.mywire.org/api/v1/balance/telegram/webhook",
    "secret_token": "your_secret_webhook_token"
  }'
```

To verify the webhook was set correctly:

```bash
curl -X GET https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

## How It Works

### Withdrawal Request Flow

1. **User initiates withdrawal** via the API or app
2. **Backend creates withdrawal request** in the database
3. **Telegram notification sent** to admin with:
   - User name and phone number
   - Withdrawal amount
   - Payment method (Instapay, Vodafone Cash)
   - Account number
   - Request ID
   - Timestamp
4. **Admin sees two buttons:**
   - ✅ قبول (Accept)
   - ❌ رفض (Reject)

### Approval Flow

1. Admin taps **✅ Accept** button
2. Telegram sends a callback query to your backend
3. Backend calls `approveWithdrawal()` with a generated reference
4. Admin receives confirmation message with transaction reference
5. User is notified via email/app

### Rejection Flow

1. Admin taps **❌ Reject** button
2. Telegram sends a callback query to your backend
3. Backend calls `rejectWithdrawal()` with a predefined reason
4. Admin receives confirmation message
5. User is notified via email/app

## API Endpoints

### Send Withdrawal Request
```
POST /api/v1/balance/withdraw
Content-Type: application/json

{
  "userId": "user_123",
  "amount": 500,
  "destination": "instapay",
  "account_number": "123456789",
  "method": "instapay"
}
```

### Telegram Webhook (Automatic)
```
POST /api/v1/balance/telegram/webhook
```
This is called automatically by Telegram when:
- Admin presses a button
- New withdrawal is created (notifications sent)

## Files Added/Modified

### New Files
- `backend/services/telegramWithdrawalNotificationService.js` — Telegram notification service
- `backend/middleware/telegramCallbackHandler.js` — Webhook handler and callback processor
- `TELEGRAM_INTEGRATION.md` — This documentation

### Modified Files
- `backend/routes/v1/balance.js` — Added `/telegram/webhook` endpoint
- `backend/controllers/v1/balanceController.js` — Integrated Telegram notifications
- `.env.example` — Added Telegram environment variables

## Testing

### Test Webhook Setup
```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": 7615344890,
    "text": "🤖 تم إعداد البوت بنجاح!",
    "parse_mode": "HTML"
  }'
```

### Manual Withdrawal Test
1. Create a test user and add balance
2. Call the withdrawal endpoint
3. Check your Telegram for the notification
4. Test approve/reject buttons

## Error Handling

If Telegram notifications fail:
- The withdrawal request is still created successfully
- An error is logged to the console
- The withdrawal request is NOT blocked
- The admin can still manage it via the admin panel

## Customization

### Change Notification Message Format
Edit `telegramWithdrawalNotificationService.js`:
```javascript
_buildWithdrawalMessage(withdrawal, user, methodLabel, formatCurrency) {
    // Customize the message here
}
```

### Add More Actions
Extend callback data types in `telegramCallbackHandler.js`:
```javascript
const { action, withdrawalId } = telegramService.parseCallbackData(data);
// Add cases for other actions
```

### Change Button Labels
Edit the inline keyboard in `notifyWithdrawalRequest()`:
```javascript
const inlineKeyboard = {
    inline_keyboard: [
        [
            { text: '✅ Your label', callback_data: `approve_withdrawal:${withdrawal.id}` },
            { text: '❌ Your label', callback_data: `reject_withdrawal:${withdrawal.id}` }
        ]
    ]
};
```

## Troubleshooting

### Bot doesn't respond to buttons
- Check webhook URL is accessible from the internet
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check `TELEGRAM_ADMIN_CHAT_ID` is your actual chat ID (not bot's)
- Ensure backend is running and `/api/v1/balance/telegram/webhook` is accessible

### Admin doesn't receive notifications
- Verify `TELEGRAM_ADMIN_CHAT_ID` environment variable is set
- Check bot has permission to message the admin
- Review backend logs for errors

### "Unauthorized" errors
- If using `TELEGRAM_SECRET_TOKEN`, verify it's set in both bot webhook and `.env`
- Check `X-Telegram-Bot-Api-Secret-Token` header matches

## Support

For issues or questions, check:
1. Backend logs: `pm2 logs`
2. Telegram webhook info: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
3. This documentation file

---

**Last Updated:** March 11, 2026
**Status:** ✅ Production Ready
