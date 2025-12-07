# 🔧 How to Add Crypto Test to Your App

Since your app uses a complex navigation system, here's the simplest way to add the Crypto Test page:

## Quick Solution: Add to App.js

### Step 1: Import CryptoTest Component

Add this import near the top of `App.js` (around line 30):

```javascript
import CryptoTest from './pages/CryptoTest';
```

### Step 2: Add State for Crypto Test

Add this state variable with your other state declarations (around line 130):

```javascript
const [showCryptoTest, setShowCryptoTest] = useState(false);
```

### Step 3: Add Navigation Handler

Find the `handleNavigate` function (search for "handleNavigate" in App.js) and add this case:

```javascript
case 'crypto-test':
  setShowCryptoTest(true);
  break;
```

### Step 4: Add to MainLayout Menu

Find where MainLayout is rendered and add a menu item. Look for the MainLayout component and add `crypto-test` to the navigation options.

Or, simpler - add a button in your UI temporarily:

```javascript
{currentUser && (
  <button 
    onClick={() => setShowCryptoTest(true)}
    style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '15px 25px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '600',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999
    }}
  >
    🧪 Test Crypto
  </button>
)}
```

### Step 5: Render CryptoTest When Active

Add this in your render method (before the closing tag of your main container):

```javascript
{showCryptoTest && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'white',
    zIndex: 10000,
    overflow: 'auto'
  }}>
    <button
      onClick={() => setShowCryptoTest(false)}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '10px 20px',
        background: '#e53e3e',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        zIndex: 10001
      }}
    >
      ✕ Close
    </button>
    <CryptoTest />
  </div>
)}
```

---

## Even Simpler: Direct Access

Or just temporarily replace your main render with:

```javascript
// At the very end of App.js, change:
// export default AppWithErrorBoundary;

// To:
import CryptoTest from './pages/CryptoTest';
const TestApp = () => <CryptoTest />;
export default TestApp;
```

Then change it back when done testing.

---

## What to Test

Once you can access the page:

1. ✅ Click "Connect Wallet"
2. ✅ Approve in MetaMask
3. ✅ See your wallet address and balance
4. ✅ Verify you're on Polygon (Chain ID 137)
5. ✅ Test payment flow (optional)
6. ✅ View driver earnings dashboard

---

**Choose whichever method is easiest for you!** 🚀
