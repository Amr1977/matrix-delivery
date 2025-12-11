# OrderCard Component Extraction Options

## Current Situation

The OrderCard component in `App.js` is **554 lines** (lines 2856-3410) with complex dependencies including:
- Order display and status
- Map integration
- Bidding system (driver and customer views)
- Review system
- Chat navigation
- Multiple action buttons
- Conditional rendering based on user role and order status

## Extraction Options

### Option 1: Single Component Extraction

**Structure:**
```
components/orders/
└── OrderCard.jsx (554 lines)
```

**Props Required (~20):**
- `order` - Order data
- `currentUser` - User context
- `driverLocation` - Driver location
- `profileData` - Theme settings
- `t` - Translation function
- `navigate` - Router navigation
- `driverPricing` - Driver pricing state
- `saveDriverPricing` - Pricing update handler
- `bidInput` - Bid input state
- `setBidInput` - Bid input setter
- `bidDetails` - Bid details state
- `setBidDetails` - Bid details setter
- `loadingStates` - Loading states
- `reviewStatus` - Review status
- `getStatusLabel` - Status formatter
- `renderStars` - Star rating renderer
- `computeBidSuggestions` - Bid calculator
- `handleDeleteOrder` - Delete handler
- `handleBidOnOrder` - Bid handler
- `handleModifyBid` - Modify bid handler
- `handleWithdrawBid` - Withdraw bid handler
- `handleAcceptBid` - Accept bid handler
- `handlePickupOrder` - Pickup handler
- `handleInTransit` - Transit handler
- `handleCompleteOrder` - Complete handler
- `openReviewModal` - Review modal handler
- `fetchOrderReviews` - Fetch reviews handler

**Pros:**
- ✅ Quick to implement (~30 min)
- ✅ Maintains current logic flow
- ✅ Single file to manage

**Cons:**
- ❌ Still very large component
- ❌ Many props to pass
- ❌ Hard to test individual sections
- ❌ Difficult to reuse parts

### Option 2: Modular Component Structure

**Structure:**
```
components/orders/
├── OrderCard.jsx (150 lines) - Main container
├── OrderHeader.jsx (30 lines) - Title, number, status badge
├── OrderMap.jsx (20 lines) - Map wrapper
├── OrderDetails.jsx (80 lines) - Package info, addresses
├── OrderPricing.jsx (40 lines) - Price display
├── OrderActions.jsx (100 lines) - Action buttons
├── DriverBiddingSection.jsx (120 lines) - Driver bidding UI
├── CustomerBidsSection.jsx (100 lines) - Customer bids display
└── OrderStatusMessages.jsx (60 lines) - Status-specific messages
```

**Pros:**
- ✅ Much more maintainable
- ✅ Each component has clear responsibility
- ✅ Easier to test
- ✅ Reusable components
- ✅ Better code organization

**Cons:**
- ❌ Takes longer (~2-3 hours)
- ❌ More files to manage
- ❌ Need to design prop interfaces carefully

### Option 3: Hybrid Approach (Recommended)

**Structure:**
```
components/orders/
├── OrderCard.jsx (250 lines) - Main card with basic info
├── OrderBiddingSection.jsx (150 lines) - All bidding logic
└── OrderStatusSection.jsx (150 lines) - Status-specific UI
```

**Pros:**
- ✅ Balanced approach
- ✅ Reasonable implementation time (~1 hour)
- ✅ Significant size reduction
- ✅ Logical separation

**Cons:**
- ❌ Still some large components
- ❌ Could be further optimized

## Recommendation

**Option 3 (Hybrid)** provides the best balance of:
- Quick implementation
- Meaningful code organization
- Maintainability improvements
- Reduced complexity in App.js

## Next Steps

Please choose an option and I'll proceed with the extraction.
