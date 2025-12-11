#!/usr/bin/env python3
"""
Script to safely integrate ActiveOrderCard component into App.js
Strategy: Remove old JSX first, then add component usage
"""

# Read the file
with open('frontend/src/App.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Step 1: Add ActiveOrderCard import after ChatPage import (around line 16)
import_line = None
for i, line in enumerate(lines):
    if 'import ChatPage from' in line:
        import_line = i + 1
        break

if import_line:
    lines.insert(import_line, "import ActiveOrderCard from './components/orders/ActiveOrderCard';\n")
    print(f"✓ Added ActiveOrderCard import at line {import_line + 1}")

# Step 2: Find and remove old order card JSX
# Looking for: return ( followed by <div key={order._id} className="order-card">
start_idx = None
for i in range(2850, 2870):
    if i < len(lines) and 'return (' in lines[i]:
        # Check if next line has the order card div
        if i+1 < len(lines) and '<div key={order._id} className="order-card">' in lines[i+1]:
            start_idx = i
            break

# Find the matching closing
end_idx = None
if start_idx:
    # Look for the closing );
    for i in range(start_idx + 500, start_idx + 600):
        if i < len(lines) and lines[i].strip() == ');':
            # Make sure this is the right closing by checking indentation
            if lines[i].startswith(' ' * 18):  # Same indentation as return
                end_idx = i
                break

if start_idx and end_idx:
    print(f"✓ Found order card JSX from line {start_idx+1} to {end_idx+1}")
    
    # Replace with ActiveOrderCard component
    component_code = '''                  return (
                    <ActiveOrderCard
                      key={order._id}
                      order={order}
                      currentUser={currentUser}
                      driverLocation={driverLocation}
                      profileData={profileData}
                      t={t}
                      driverPricing={driverPricing}
                      saveDriverPricing={saveDriverPricing}
                      bidInput={bidInput}
                      setBidInput={setBidInput}
                      bidDetails={bidDetails}
                      setBidDetails={setBidDetails}
                      loadingStates={loadingStates}
                      reviewStatus={reviewStatus}
                      getStatusLabel={getStatusLabel}
                      renderStars={renderStars}
                      computeBidSuggestions={computeBidSuggestions}
                      handleDeleteOrder={handleDeleteOrder}
                      handleBidOnOrder={handleBidOnOrder}
                      handleModifyBid={handleModifyBid}
                      handleWithdrawBid={handleWithdrawBid}
                      handleAcceptBid={handleAcceptBid}
                      handlePickupOrder={handlePickupOrder}
                      handleInTransit={handleInTransit}
                      handleCompleteOrder={handleCompleteOrder}
                      openReviewModal={openReviewModal}
                      fetchOrderReviews={fetchOrderReviews}
                    />
                  );
'''
    
    # Remove old lines and insert new component
    del lines[start_idx:end_idx+1]
    lines.insert(start_idx, component_code)
    
    removed_lines = end_idx - start_idx + 1
    print(f"✓ Removed {removed_lines} lines of old JSX")
    print(f"✓ Added ActiveOrderCard component usage")

# Write the modified file
with open('frontend/src/App.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\n✅ Integration complete!")
print(f"   - Added import")
print(f"   - Removed ~{removed_lines if start_idx and end_idx else 0} lines of old JSX")
print(f"   - Added ActiveOrderCard component")
