# SMS Auto-Verification Setup Guide

## 📱 How SMS Forwarding Works

When a customer transfers money to your platform wallet (Vodafone Cash, InstaPay, etc.), the wallet provider sends an SMS to your registered mobile number with payment details. This SMS can be automatically forwarded to your backend for instant payment confirmation.

## 🔄 SMS Flow

```
Customer Transfer → Wallet Provider → SMS to Platform Mobile → Auto-Forward to Backend → Parse & Match → Auto-Confirm Payment
```

## 📋 Setup Methods

### Method 1: Android App (Recommended)

**Use an Android app to auto-forward SMS:**

1. **Install SMS Forwarder App**
   - Recommended: "SMS Forwarder" or "SMS to URL"
   - Available on Google Play Store

2. **Configure Forwarding Rules**
   ```
   Sender Contains: "Vodafone", "InstaPay", "Orange"
   Forward To: https://your-backend.com/api/wallet-payments/sms/forward
   Method: POST
   Headers: 
     - Content-Type: application/json
     - X-API-Key: your-secret-key
   Body Template:
     {
       "smsContent": "{{message}}",
       "senderNumber": "{{sender}}",
       "receivedAt": "{{timestamp}}"
     }
   ```

3. **Test the Setup**
   - Make a test transfer
   - Verify SMS is forwarded
   - Check backend logs

### Method 2: Dedicated SIM with API

**Use a GSM modem or service:**

1. **Hardware Option: GSM Modem**
   - Buy USB GSM modem (e.g., Huawei E3372)
   - Insert SIM card
   - Connect to server
   - Use software like Gammu or SMSLib

2. **Cloud Option: Twilio/Nexmo**
   - Get virtual number
   - Forward SMS to webhook
   - Parse and process

### Method 3: IFTTT/Zapier

1. **Create IFTTT Applet**
   - Trigger: Android SMS received
   - Filter: From Vodafone/InstaPay
   - Action: Webhook POST to your backend

## 🔧 Backend Configuration

### 1. Secure the SMS Endpoint

Add authentication to `/api/wallet-payments/sms/forward`:

```javascript
// In routes/walletPayments.js
router.post('/sms/forward', async (req, res) => {
  // Verify API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.SMS_FORWARD_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await walletPaymentService.processSMS(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Add Environment Variable

```env
# .env
SMS_FORWARD_API_KEY=your-secure-random-key-here
```

### 3. Test SMS Processing

```bash
curl -X POST https://your-backend.com/api/wallet-payments/sms/forward \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "smsContent": "You have received 150.00 EGP from 01234567890. Ref: VF123456789. Date: 14/12/2025 09:30",
    "senderNumber": "Vodafone",
    "receivedAt": "2025-12-14T09:30:00Z"
  }'
```

## 📝 SMS Format Examples

### Vodafone Cash
```
You have received 150.00 EGP from 01234567890.
Ref: VF123456789
Date: 14/12/2025 09:30
```

### InstaPay
```
InstaPay: Received 200 EGP from sender@instapay
Ref: IP987654321
14/12/2025 09:30
```

### Orange Cash
```
Orange Cash: You received 100 EGP from 01234567890
Reference: OR456789
14/12/2025 09:30
```

## 🎯 Matching Logic

The system matches SMS to pending payments by:

1. **Wallet Type** - Vodafone Cash, InstaPay, etc.
2. **Sender Phone** - Customer's phone number
3. **Amount** - Exact match (±0.01 EGP tolerance)
4. **Time Window** - Within last 24 hours

## ⚡ Auto-Confirmation Process

When SMS is received:

1. **Parse SMS** - Extract amount, sender, reference, timestamp
2. **Find Match** - Search pending payments
3. **Verify** - Confirm all details match
4. **Auto-Confirm** - Mark payment as confirmed
5. **Update Order** - Set order as paid
6. **Calculate Commission** - Apply platform commission
7. **Record Revenue** - Track in platform_revenue table
8. **Notify Customer** - Send confirmation notification

## 🔒 Security Considerations

- ✅ Use HTTPS only
- ✅ Authenticate SMS forwarding requests
- ✅ Validate SMS content before processing
- ✅ Log all SMS processing attempts
- ✅ Rate limit SMS endpoint
- ✅ Alert on suspicious patterns

## 📊 Monitoring

### Check Auto-Verified Payments

```sql
SELECT * FROM wallet_payments 
WHERE auto_verified = TRUE 
ORDER BY confirmed_at DESC;
```

### Check SMS Processing Logs

```sql
SELECT * FROM wallet_payments 
WHERE sms_forwarded = TRUE 
ORDER BY created_at DESC;
```

## 🐛 Troubleshooting

### SMS Not Being Forwarded

- Check SMS forwarder app is running
- Verify internet connection
- Check app permissions (SMS, Network)
- Test with manual SMS send

### SMS Forwarded But Not Matched

- Check SMS format matches parser
- Verify sender phone number format
- Check amount precision
- Verify wallet type detection

### Payment Not Auto-Confirmed

- Check backend logs
- Verify pending payment exists
- Check matching criteria
- Ensure no duplicate payments

## 📱 Recommended Apps

### Android
- **SMS Forwarder** - Free, reliable
- **SMS to URL** - More features
- **Tasker** - Advanced automation

### iOS
- Limited SMS forwarding capabilities
- Use cloud service or dedicated Android device

## 💡 Best Practices

1. **Use Dedicated Phone** - Don't use personal phone
2. **Keep Charged** - Ensure phone stays on
3. **Stable Internet** - Use WiFi or good data plan
4. **Monitor Logs** - Check daily for issues
5. **Test Regularly** - Make test transfers weekly
6. **Backup Plan** - Keep manual confirmation available

## 🚀 Going Live

1. Set up SMS forwarding
2. Test with small amounts
3. Monitor for 1 week
4. Gradually increase usage
5. Keep manual confirmation as backup
6. Train admin team on both methods

## 📞 Support

If you need help setting up:
- Check backend logs: `/api/logs`
- Test SMS parsing: Use test endpoint
- Contact support with SMS example
