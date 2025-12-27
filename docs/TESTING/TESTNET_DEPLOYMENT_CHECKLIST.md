# Quick Testnet Deployment Checklist

**Fast-track guide for deploying to Mumbai testnet**

---

## ✅ Pre-Deployment Checklist

- [ ] MetaMask installed
- [ ] Mumbai network added to MetaMask
- [ ] Testnet MATIC in wallet (get from https://faucet.polygon.technology/)
- [ ] Dependencies installed (`npm install` in backend)
- [ ] Contracts compile successfully (`npx hardhat compile`)

---

## 🚀 Deployment Steps

### 1. Set Up Environment Variables

Create `backend/.env` with:

```bash
# Deployer wallet (get from MetaMask → Account Details → Show Private Key)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Platform wallet (where commission goes)
PLATFORM_WALLET_ADDRESS=0xYOUR_PLATFORM_WALLET
PLATFORM_WALLET_PRIVATE_KEY=0xYOUR_PLATFORM_PRIVATE_KEY

# Network config
BLOCKCHAIN_NETWORK=polygonMumbai
BLOCKCHAIN_RPC_URL=https://rpc-mumbai.maticvigil.com
BLOCKCHAIN_CHAIN_ID=80001

# Optional: for contract verification
POLYGONSCAN_API_KEY=YOUR_API_KEY
```

### 2. Deploy Contract

```bash
cd backend
npx hardhat run scripts/deploy-escrow.js --network polygonMumbai
```

### 3. Save Contract Address

Copy the contract address from output and add to `.env`:

```bash
ESCROW_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

### 4. Verify on PolygonScan

Go to: https://mumbai.polygonscan.com/address/YOUR_CONTRACT_ADDRESS

---

## 🧪 Testing

### Test Backend
```bash
# Start server
npm run dev

# Test endpoint
curl http://localhost:5000/api/crypto/tokens
```

### Test Frontend
```bash
cd frontend

# Update .env
REACT_APP_ESCROW_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS

# Start app
npm start

# Connect MetaMask and test
```

---

## 🆘 Quick Troubleshooting

**"Insufficient funds"**
→ Get MATIC from https://faucet.polygon.technology/

**"Invalid private key"**
→ Make sure it starts with 0x and has no spaces

**"Network error"**
→ Check RPC URL and internet connection

---

## 📞 Need Help?

Check full guide: `TESTNET_DEPLOYMENT_GUIDE.md`
