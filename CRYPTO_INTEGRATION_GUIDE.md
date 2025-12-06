# Crypto Payment Integration Guide

This guide shows how to integrate the crypto payment components into your Matrix Delivery app.

---

## 1. Order Creation Form Integration

Add crypto payment option to your order creation form:

```javascript
// In your OrderCreationForm.js or similar
import React, { useState } from 'react';
import WalletConnect from './components/crypto/WalletConnect';
import CryptoPayment from './components/crypto/CryptoPayment';

const OrderCreationForm = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderAmount, setOrderAmount] = useState(null);

  const handleWalletConnected = (walletInfo) => {
    setWalletConnected(true);
    setWalletAddress(walletInfo.address);
  };

  const handleOrderSubmit = async (orderData) => {
    // Create order in your backend
    const response = await api.post('/orders', orderData);
    setOrderId(response.data.id);
    setOrderAmount(response.data.total_price);
    setOrderCreated(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    // Update order with payment info
    await api.post(`/orders/${orderId}/payment`, {
      txHash: paymentData.txHash,
      token: paymentData.token,
      amount: paymentData.amount
    });
    
    // Redirect to order tracking
    window.location.href = `/orders/${orderId}/tracking`;
  };

  return (
    <div>
      {!orderCreated ? (
        <div>
          {/* Your existing order form */}
          <OrderForm onSubmit={handleOrderSubmit} />
        </div>
      ) : (
        <div>
          <h2>Complete Payment</h2>
          
          {!walletConnected && (
            <WalletConnect onConnected={handleWalletConnected} />
          )}
          
          {walletConnected && (
            <CryptoPayment
              orderId={orderId}
              amount={orderAmount}
              walletAddress={walletAddress}
              onSuccess={handlePaymentSuccess}
              onError={(error) => alert(error)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default OrderCreationForm;
```

---

## 2. Driver Dashboard Integration

Add earnings dashboard to driver's profile:

```javascript
// In your DriverDashboard.js
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import DriverEarnings from './components/crypto/DriverEarnings';

const DriverDashboard = () => {
  const { user } = useAuth();

  if (user.role !== 'driver') {
    return <div>Access denied</div>;
  }

  return (
    <div className="driver-dashboard">
      <h1>Driver Dashboard</h1>
      
      {/* Existing dashboard content */}
      <div className="dashboard-stats">
        {/* Your existing stats */}
      </div>

      {/* Crypto Earnings Section */}
      <div className="earnings-section">
        <DriverEarnings />
      </div>
    </div>
  );
};

export default DriverDashboard;
```

---

## 3. App.js Route Integration

Add routes for crypto components:

```javascript
// In your App.js
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import DriverEarnings from './components/crypto/DriverEarnings';

function App() {
  return (
    <Router>
      <Switch>
        {/* Existing routes */}
        <Route path="/orders/new" component={OrderCreationForm} />
        <Route path="/driver/dashboard" component={DriverDashboard} />
        
        {/* New crypto routes */}
        <Route path="/driver/earnings" component={DriverEarnings} />
        
        {/* Other routes */}
      </Switch>
    </Router>
  );
}

export default App;
```

---

## 4. Environment Configuration

### Development (.env.develop)
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ESCROW_CONTRACT_ADDRESS=0xYOUR_MUMBAI_TESTNET_CONTRACT
REACT_APP_BLOCKCHAIN_NETWORK=polygonMumbai
REACT_APP_BLOCKCHAIN_CHAIN_ID=80001
```

### Production (.env.production)
```bash
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_ESCROW_CONTRACT_ADDRESS=0xYOUR_MAINNET_CONTRACT
REACT_APP_BLOCKCHAIN_NETWORK=polygon
REACT_APP_BLOCKCHAIN_CHAIN_ID=137
```

---

## 5. Backend Order Completion Hook

Update your order completion logic to release crypto funds:

```javascript
// In your backend order service or route
const blockchainService = require('./services/blockchainService');

async function completeOrder(orderId, driverId) {
  // Your existing completion logic
  await pool.query(
    `UPDATE orders SET status = 'delivered' WHERE id = $1`,
    [orderId]
  );

  // Release crypto funds
  try {
    const result = await blockchainService.completeOrder(orderId);
    
    // Record transaction
    await pool.query(
      `INSERT INTO crypto_transactions 
       (id, order_id, user_id, transaction_type, token_symbol, amount, tx_hash, status)
       VALUES ($1, $2, $3, 'payout', 'USDC', $4, $5, 'confirmed')`,
      [uuidv4(), orderId, driverId, result.driverAmount, result.txHash]
    );
    
    console.log('✅ Crypto payout successful:', result.txHash);
  } catch (error) {
    console.error('❌ Crypto payout failed:', error);
    // Handle error - maybe notify admin
  }
}
```

---

## 6. Navigation Menu Integration

Add crypto earnings link to driver menu:

```javascript
// In your navigation component
const DriverMenu = () => {
  return (
    <nav>
      <Link to="/driver/dashboard">Dashboard</Link>
      <Link to="/driver/orders">My Orders</Link>
      <Link to="/driver/earnings">💰 Crypto Earnings</Link>
      <Link to="/driver/profile">Profile</Link>
    </nav>
  );
};
```

---

## 7. Order Status Display

Show payment status in order details:

```javascript
// In your OrderDetails component
const OrderDetails = ({ order }) => {
  return (
    <div className="order-details">
      <h2>Order #{order.order_number}</h2>
      
      {/* Existing order info */}
      
      {/* Crypto payment info */}
      {order.blockchain_tx_hash && (
        <div className="payment-info">
          <h3>Payment Information</h3>
          <div>Token: {order.crypto_token}</div>
          <div>Amount: {order.crypto_amount} {order.crypto_token}</div>
          <div>Status: {order.escrow_status}</div>
          <a 
            href={`https://polygonscan.com/tx/${order.blockchain_tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Blockchain →
          </a>
        </div>
      )}
    </div>
  );
};
```

---

## 8. Testing Checklist

### Frontend Testing
```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm start

# Test wallet connection
# 1. Click "Connect Wallet"
# 2. Approve MetaMask connection
# 3. Verify wallet address displays

# Test payment flow
# 1. Create test order
# 2. Connect wallet
# 3. Select token (USDC)
# 4. Click "Pay"
# 5. Approve token spending in MetaMask
# 6. Confirm order creation in MetaMask
# 7. Verify transaction on PolygonScan
```

### Backend Testing
```bash
# Test crypto routes
curl http://localhost:5000/api/crypto/tokens
curl http://localhost:5000/api/crypto/network/info

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/crypto/driver/earnings
```

---

## 9. Deployment Steps

### Step 1: Deploy Smart Contract
```bash
cd backend

# Deploy to Mumbai testnet first
npx hardhat run scripts/deploy-escrow.js --network polygonMumbai

# Copy contract address from output
# Update .env files with contract address
```

### Step 2: Run Database Migration
```bash
# Run migration
psql -h localhost -U your_user -d matrix_delivery \
  -f migrations/add_crypto_payments.sql
```

### Step 3: Update Environment Variables
```bash
# Backend .env
ESCROW_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
PLATFORM_WALLET_ADDRESS=0xYOUR_PLATFORM_WALLET
PLATFORM_WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Frontend .env
REACT_APP_ESCROW_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

### Step 4: Deploy Frontend
```bash
cd frontend
npm run build
# Deploy build folder to your hosting
```

### Step 5: Deploy Backend
```bash
cd backend
pm2 restart matrix-delivery-backend
```

---

## 10. User Guides

### For Customers

**How to Pay with Crypto:**
1. Install MetaMask extension
2. Create wallet or import existing
3. Buy USDC on Coinbase/Binance
4. Send USDC to Polygon network
5. On checkout, click "Connect Wallet"
6. Approve MetaMask connection
7. Select USDC token
8. Click "Pay" and confirm in MetaMask
9. Wait for confirmation (2-3 minutes)
10. Track your order!

### For Drivers

**How to Receive Crypto Payments:**
1. Install MetaMask
2. Go to Driver Dashboard
3. Click "Crypto Earnings"
4. Click "Connect Wallet"
5. Approve MetaMask connection
6. Your wallet is now connected!
7. Complete deliveries to earn crypto
8. Earnings appear instantly in your wallet
9. Withdraw to exchange anytime

---

## 11. Troubleshooting

### "Please install MetaMask"
- Install MetaMask browser extension
- Refresh page after installation

### "Wrong network"
- Click "Switch to Polygon" in MetaMask
- Or manually add Polygon network

### "Insufficient balance"
- Buy more USDC on exchange
- Transfer to Polygon network

### "Transaction failed"
- Check gas balance (need MATIC for gas)
- Increase gas limit in MetaMask
- Try again with higher gas price

### "Wallet not connecting"
- Refresh page
- Disconnect wallet in MetaMask
- Reconnect

---

## 12. Security Best Practices

### For Platform
- ✅ Keep platform private key secure
- ✅ Use hardware wallet for platform wallet
- ✅ Monitor contract events
- ✅ Set up alerts for large transactions
- ✅ Regular security audits

### For Users
- ✅ Never share private keys
- ✅ Verify contract address
- ✅ Check transaction details before confirming
- ✅ Use hardware wallet for large amounts
- ✅ Keep recovery phrase safe

---

## 13. Monitoring & Analytics

### Track These Metrics
- Total crypto volume processed
- Number of crypto transactions
- Average transaction value
- Gas costs per transaction
- Failed transaction rate
- User adoption rate

### Set Up Alerts
- Failed transactions
- Unusual transaction amounts
- Contract errors
- Low platform wallet balance

---

## Ready to Launch! 🚀

Your crypto payment system is fully integrated and ready to use. Start with testnet, test thoroughly, then deploy to mainnet when ready!

**Need Help?**
- Check PolygonScan for transaction status
- Review smart contract events
- Check backend logs
- Test on Mumbai testnet first
