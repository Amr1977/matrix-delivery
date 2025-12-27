# 🚀 Polygon Mainnet Deployment Guide

**Step-by-step guide to deploy your crypto payment system to Polygon Mainnet**

---

## Prerequisites Checklist

Before deploying, make sure you have:
- [x] MetaMask wallet installed
- [x] Polygon Mainnet network added (Chain ID: 137)
- [x] MATIC in your wallet (~0.5 MATIC for deployment)
- [x] Node.js and npm installed
- [x] All dependencies installed

---

## Step 1: Verify MetaMask Setup

### 1.1 Confirm You're on Polygon Mainnet
1. Open MetaMask
2. Check network dropdown shows **"Polygon"** or **"Polygon Mainnet"**
3. Verify Chain ID is **137**
4. Confirm you have MATIC balance (at least 0.3 MATIC)

### 1.2 Polygon Mainnet Network Details
```
Network Name: Polygon Mainnet
RPC URL: https://polygon-rpc.com/
Chain ID: 137
Currency Symbol: MATIC
Block Explorer: https://polygonscan.com/
```

---

## Step 2: Get Your Private Key

**⚠️ SECURITY WARNING: Never share your private key or commit it to git!**

### 2.1 Export Private Key from MetaMask
1. Open MetaMask
2. Click the **3 dots** next to your account name
3. Click **"Account Details"**
4. Click **"Show Private Key"**
5. Enter your MetaMask password
6. **Copy the private key** (starts with 0x)
7. Keep it secure!

---

## Step 3: Configure Environment Variables

### 3.1 Update .env.deployment File

The file is already created at `backend/.env.deployment`. Update these values:

```bash
# Your MetaMask private key
DEPLOYER_PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY_HERE
PLATFORM_WALLET_PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY_HERE

# Your wallet address (already filled)
PLATFORM_WALLET_ADDRESS=0xfa83394a4f3346717cfad47c27bbe66a19df1ca4

# Network settings (already configured for Polygon Mainnet)
BLOCKCHAIN_NETWORK=polygon
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
BLOCKCHAIN_CHAIN_ID=137

# Token addresses (already configured)
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDT_CONTRACT_ADDRESS=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
```

### 3.2 Rename the File

After updating, rename `.env.deployment` to `.env`:

**PowerShell:**
```bash
cd d:\matrix-delivery\backend
mv .env.deployment .env
```

**Or manually:** Rename the file in File Explorer

---

## Step 4: Verify Setup

### 4.1 Check Dependencies
```bash
cd d:\matrix-delivery\backend

# Verify Hardhat is installed
npx hardhat --version
# Should show: Hardhat version 2.19.5 or similar
```

### 4.2 Check Wallet Balance
- Open MetaMask
- Verify you have at least **0.3 MATIC**
- Deployment will cost ~0.1-0.2 MATIC

### 4.3 Test Compilation
```bash
# Compile contracts to verify everything works
npx hardhat compile

# Should show:
# ✓ Compiled 9 Solidity files successfully
```

---

## Step 5: Deploy to Polygon Mainnet

### 5.1 Run Deployment Script

**⚠️ IMPORTANT: This deploys to REAL Polygon Mainnet with REAL funds!**

```bash
cd d:\matrix-delivery\backend

# Deploy to Polygon Mainnet
npx hardhat run scripts/deploy-escrow.js --network polygon
```

### 5.2 Expected Output
```
🚀 Deploying MatrixDeliveryEscrow contract...

Deploying with account: 0xfa83...1ca4
Account balance: 0.48 MATIC

Configuration:
- Platform Wallet: 0xfa83...1ca4
- Commission Rate: 15 %

✅ MatrixDeliveryEscrow deployed to: 0x1234...5678

Adding supported tokens...
✅ Added USDC: 0x2791...4174
✅ Added USDT: 0xc213...e832

=== Deployment Complete ===
Contract Address: 0x1234...5678
Platform Wallet: 0xfa83...1ca4
Commission Rate: 15 %
Network: polygon (Chain ID: 137)
Gas Used: ~XXX MATIC

📝 Add these to your .env file:
ESCROW_CONTRACT_ADDRESS=0x1234...5678
```

### 5.3 Save Contract Address

**IMPORTANT**: Copy the contract address and add it to your `.env`:

```bash
# Add to backend/.env
ESCROW_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

# Also add to frontend/.env
REACT_APP_ESCROW_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

---

## Step 6: Verify Deployment

### 6.1 Check on PolygonScan
1. Go to https://polygonscan.com/
2. Paste your contract address
3. You should see:
   - ✅ Contract creation transaction
   - ✅ Token addition transactions
   - ✅ Contract balance (if any)

### 6.2 Verify Contract Functions

On PolygonScan, click "Contract" tab → "Read Contract":
- Check `platformWallet` - should match your wallet
- Check `platformCommissionRate` - should be 1500 (15%)
- Check `supportedTokens` for USDC - should return true

---

## Step 7: Run Database Migration

```bash
# Connect to your database
psql -h localhost -U your_user -d matrix_delivery

# Run migration
\i migrations/add_crypto_payments.sql

# Verify tables created
\dt crypto_transactions
\d users

# Should show new columns and tables
```

---

## Step 8: Test Backend API

### 8.1 Start Backend Server
```bash
cd d:\matrix-delivery\backend
npm run dev

# Should show:
# ✅ Blockchain service initialized
# ✅ Server running on: http://localhost:5000
```

### 8.2 Test Crypto Endpoints
```bash
# Test tokens endpoint
curl http://localhost:5000/api/crypto/tokens

# Should return USDC and USDT details

# Test network info
curl http://localhost:5000/api/crypto/network/info

# Should return Polygon Mainnet details
```

---

## Step 9: Update Frontend Configuration

### 9.1 Update Frontend Environment
```bash
cd d:\matrix-delivery\frontend

# Edit .env file
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ESCROW_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
REACT_APP_BLOCKCHAIN_NETWORK=polygon
REACT_APP_BLOCKCHAIN_CHAIN_ID=137
```

### 9.2 Start Frontend
```bash
npm start

# Should open http://localhost:3000
```

---

## Step 10: Test Payment Flow

### 10.1 Get Real USDC

You need real USDC to test payments. Options:

**Option 1: Buy on Exchange**
1. Buy USDC on Coinbase/Binance
2. Withdraw to Polygon network
3. Send to your MetaMask address

**Option 2: Bridge from Ethereum**
1. Use Polygon Bridge: https://wallet.polygon.technology/
2. Bridge USDC from Ethereum to Polygon

**Option 3: Swap on Polygon**
1. Use QuickSwap or Uniswap on Polygon
2. Swap MATIC for USDC

### 10.2 Test End-to-End
1. Create a test order in your app
2. Connect MetaMask wallet
3. Select USDC token
4. Approve token spending
5. Confirm order creation
6. Check transaction on PolygonScan
7. Complete order (as admin)
8. Verify driver receives payment

---

## Troubleshooting

### "Insufficient funds for gas"
- You need more MATIC
- Buy on exchange and send to your wallet

### "Invalid private key"
- Make sure it starts with 0x
- Check for extra spaces
- Verify you copied the full key

### "Network error"
- Check internet connection
- Try alternative RPC: https://polygon-mainnet.g.alchemy.com/v2/demo

### "Transaction failed"
- Increase gas price
- Check you have enough MATIC
- Verify contract address is correct

---

## Cost Breakdown

### One-Time Costs
- **Contract Deployment**: ~0.1-0.2 MATIC (~$0.10-0.20)
- **Token Addition**: Included in deployment
- **Total**: ~$0.20

### Per-Transaction Costs
- **Order Creation**: ~0.01 MATIC (~$0.01)
- **Order Completion**: ~0.02 MATIC (~$0.02)
- **Refund**: ~0.01 MATIC (~$0.01)

**vs Stripe**: $0.88 per $20 transaction
**Savings**: 98% cost reduction! 🎉

---

## Security Checklist

✅ Private key stored securely
✅ .env file in .gitignore
✅ Contract deployed to mainnet
✅ Contract verified on PolygonScan (optional)
✅ Platform wallet secured
✅ Backup of private keys
✅ Monitoring set up

---

## Next Steps

1. ✅ Deploy smart contract
2. ✅ Update environment variables
3. ✅ Run database migration
4. ✅ Test backend endpoints
5. ✅ Test frontend components
6. ✅ Test end-to-end payment flow
7. ✅ Monitor first real transactions
8. ✅ Launch to users! 🚀

---

## Quick Reference

### Polygon Mainnet Details
```
Network: Polygon Mainnet
Chain ID: 137
RPC: https://polygon-rpc.com
Explorer: https://polygonscan.com
```

### Token Addresses
```
USDC: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDT: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
```

### Important Commands
```bash
# Compile
npx hardhat compile

# Deploy to Polygon Mainnet
npx hardhat run scripts/deploy-escrow.js --network polygon

# Test
npx hardhat test

# Console
npx hardhat console --network polygon
```

---

**You're deploying to REAL Polygon Mainnet! This is production-ready.** 🚀

**Estimated time: 10-15 minutes**
**Cost: ~$0.20 in MATIC**
