# 🔑 Stripe Configuration Guide

## Overview

This guide explains how to configure Stripe payment processing for your Matrix Delivery application.

## 📋 Prerequisites

1. **Stripe Account**: Sign up at [https://stripe.com](https://stripe.com)
2. **Test Mode**: Start with test mode, then switch to live when ready

## 🏦 Step 1: Get Your Stripe API Keys

### 1. Log into Stripe Dashboard
- Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
- Sign in or create a new account

### 2. Access API Keys
- Click **"Developers"** in the left sidebar
- Click **"API keys"**
- You'll see your **Publishable key** and **Secret key**

### 3. Copy Your Keys
- **Publishable key**: Starts with `pk_test_` (test) or `pk_live_` (live)
- **Secret key**: Starts with `sk_test_` (test) or `sk_live_` (live)

⚠️ **Important**: Keep your secret key secure and never expose it in frontend code!

## ⚙️ Step 2: Configure Environment Variables

### Backend Configuration (.env file)

Create or update your backend `.env` file:

```bash
# Stripe Secret Key (Server-side only!)
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
```

### Frontend Configuration

Create or update your frontend environment file (`.env` or `.env.local`):

```bash
# Stripe Publishable Key (Safe for frontend)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
```

## 🔄 Step 3: Environment Files Location

### Backend
- File: `backend/.env`
- Used by: Node.js server
- Contains: `STRIPE_SECRET_KEY`

### Frontend
- File: `frontend/.env` or `frontend/.env.local`
- Used by: React application
- Contains: `REACT_APP_STRIPE_PUBLISHABLE_KEY`

## 🚀 Step 4: Testing Your Setup

### 1. Restart Your Applications
```bash
# Backend
cd backend && npm start

# Frontend (new terminal)
cd frontend && npm start
```

### 2. Test Payment Methods
1. Log into your app
2. Click the **"💳 Payments"** button in the header
3. The payment methods page should load without errors
4. Try creating a payment intent for an order

### 3. Test Cards (Stripe Test Mode)

Use these test card numbers in Stripe test mode:

| Card Number | Brand | Result |
|-------------|-------|---------|
| 4242424242424242 | Visa | ✅ Success |
| 4000000000000002 | Visa | ❌ Declined |
| 4000000000009995 | Visa | ❌ Insufficient funds |

## 🔒 Step 5: Going Live (Production)

### 1. Enable Live Mode in Stripe
- Go to your Stripe dashboard
- Toggle **"Test mode"** to **"Live mode"**
- Get your live API keys

### 2. Update Environment Variables
```bash
# Backend - Use live secret key
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here

# Frontend - Use live publishable key
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
```

### 3. Update Other Settings
```bash
NODE_ENV=production
REACT_APP_API_URL=https://yourdomain.com/api
```

## 🛡️ Security Best Practices

### 1. Never Commit Keys to Git
Add these files to `.gitignore`:
```
.env
.env.local
.env.*.local
```

### 2. Environment Variable Validation
The app will show warnings if Stripe keys are missing:
- Backend: `"STRIPE_SECRET_KEY not configured - payment processing will be disabled"`
- Frontend: Payment forms will show "Stripe integration required"

### 3. Key Rotation
- Regularly rotate your API keys
- Use separate keys for test and live environments
- Monitor key usage in Stripe dashboard

## 🐛 Troubleshooting

### "Payment service not configured"
- Check that `STRIPE_SECRET_KEY` is set in backend `.env`
- Restart the backend server after adding the key

### "Stripe integration required"
- Check that `REACT_APP_STRIPE_PUBLISHABLE_KEY` is set
- Restart the frontend development server

### Payment fails in test mode
- Verify you're using test card numbers
- Check Stripe dashboard for error details
- Ensure webhook endpoints are configured (if using webhooks)

## 📞 Support

- **Stripe Documentation**: [https://stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: [https://support.stripe.com](https://support.stripe.com)
- **Test Cards**: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

## ✅ Quick Setup Checklist

- [ ] Created Stripe account
- [ ] Got API keys from dashboard
- [ ] Added `STRIPE_SECRET_KEY` to backend `.env`
- [ ] Added `REACT_APP_STRIPE_PUBLISHABLE_KEY` to frontend env
- [ ] Restarted backend and frontend servers
- [ ] Tested payment methods page loads
- [ ] Tested payment creation with test card

🎉 **Your Stripe integration is now ready!**
