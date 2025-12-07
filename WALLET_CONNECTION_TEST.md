# 🧪 Testing Crypto Wallet Connection

**Servers Status**: ✅ Running
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

---

## How to Test WalletConnect Component

### Option 1: Add to Existing Page (Quick Test)

**1. Open any existing page component** (e.g., `frontend/src/App.js` or a dashboard page)

**2. Import the WalletConnect component:**
```javascript
import WalletConnect from './components/crypto/WalletConnect';
```

**3. Add it to your JSX:**
```javascript
<div>
  <h2>Test Crypto Wallet</h2>
  <WalletConnect 
    onConnected={(walletInfo) => {
      console.log('Wallet connected:', walletInfo);
      alert(`Connected: ${walletInfo.address}`);
    }}
    onDisconnected={() => {
      console.log('Wallet disconnected');
      alert('Wallet disconnected');
    }}
  />
</div>
```

**4. Save the file** - React will hot-reload

**5. Open http://localhost:3000** in your browser

**6. Test:**
- Click "Connect Wallet"
- Approve in MetaMask
- Should show your wallet address and MATIC balance
- Should confirm you're on Polygon network (Chain ID 137)

---

### Option 2: Create Test Page (Better)

**1. Create `frontend/src/pages/CryptoTest.js`:**
```javascript
import React, { useState } from 'react';
import WalletConnect from '../components/crypto/WalletConnect';
import CryptoPayment from '../components/crypto/CryptoPayment';
import DriverEarnings from '../components/crypto/DriverEarnings';

const CryptoTest = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);

  const handleWalletConnected = (walletInfo) => {
    console.log('Wallet connected:', walletInfo);
    setWalletConnected(true);
    setWalletAddress(walletInfo.address);
  };

  const handleWalletDisconnected = () => {
    console.log('Wallet disconnected');
    setWalletConnected(false);
    setWalletAddress(null);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🧪 Crypto Payment System Test</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>1. Wallet Connection</h2>
        <WalletConnect 
          onConnected={handleWalletConnected}
          onDisconnected={handleWalletDisconnected}
        />
      </div>

      {walletConnected && (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <h2>2. Test Payment (Optional)</h2>
            <CryptoPayment
              orderId="test-order-123"
              amount={10}
              walletAddress={walletAddress}
              onSuccess={(data) => {
                console.log('Payment success:', data);
                alert('Payment successful!');
              }}
              onError={(error) => {
                console.error('Payment error:', error);
                alert(`Payment failed: ${error}`);
              }}
            />
          </div>

          <div>
            <h2>3. Driver Earnings Dashboard</h2>
            <DriverEarnings />
          </div>
        </>
      )}
    </div>
  );
};

export default CryptoTest;
```

**2. Add route in `App.js`:**
```javascript
import CryptoTest from './pages/CryptoTest';

// In your routes:
<Route path="/crypto-test" component={CryptoTest} />
```

**3. Visit:** http://localhost:3000/crypto-test

---

## ✅ What to Test

### 1. Wallet Connection
- [ ] Click "Connect Wallet" button
- [ ] MetaMask popup appears
- [ ] Approve connection
- [ ] Wallet address displays
- [ ] MATIC balance shows
- [ ] Network shows "Polygon" (Chain ID 137)

### 2. Network Verification
- [ ] Verify Chain ID is 137
- [ ] If wrong network, should show warning
- [ ] Test network switching

### 3. Wallet Disconnection
- [ ] Click "Disconnect" button
- [ ] Wallet info clears
- [ ] Can reconnect

### 4. Account Switching
- [ ] Switch accounts in MetaMask
- [ ] New account should display automatically

---

## 🐛 Troubleshooting

### "Please install MetaMask"
- Install MetaMask extension
- Refresh page

### "Wrong network"
- Switch to Polygon in MetaMask
- Or click the network warning to auto-switch

### "Connection failed"
- Check MetaMask is unlocked
- Try refreshing page
- Check browser console for errors

### Component not found
- Verify files exist:
  - `frontend/src/components/crypto/WalletConnect.js`
  - `frontend/src/components/crypto/WalletConnect.css`
- Check import paths are correct

---

## 📊 Expected Console Output

When wallet connects successfully:
```javascript
Wallet connected: {
  address: "0xfa83394a4f3346717cfad47c27bbe66a19df1ca4",
  balance: "3.99",
  network: "matic",
  chainId: 137
}
```

---

## 🎯 Next Steps After Testing

Once wallet connection works:
1. Test CryptoPayment component
2. Test DriverEarnings dashboard
3. Integrate into your actual order flow
4. Test with real USDC payment

---

**Ready to test! Open http://localhost:3000 and try connecting your wallet!** 🚀
