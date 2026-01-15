# Design Document

## Overview

This design addresses the customer active orders filtering bug where customers see all orders (including delivered ones) in their active orders list. The solution involves modifying the backend order service to filter out completed orders for customers and updating the frontend to provide consistent navigation with the driver interface.

## Architecture

The fix involves three main components:

1. **Backend Order Service**: Modify the `getOrders` method to filter customer orders by status
2. **Frontend API Service**: Update the OrdersApi to handle pagination properly
3. **Frontend UI**: Implement side menu navigation consistent with driver interface

## Components and Interfaces

### Backend Changes

#### OrderService.getOrders() Method

- **Location**: `backend/services/orderService.js`
- **Current Issue**: Customer query doesn't filter by order status
- **Solution**: Add status filtering to exclude 'delivered' and 'cancelled' orders

```sql
-- Current customer query (shows all orders)
WHERE o.customer_id = $1

-- Fixed customer query (shows only active orders)
WHERE o.customer_id = $1
AND o.status NOT IN ('delivered', 'cancelled')
```

#### Pagination Support

- **Location**: `backend/routes/orders.js`
- **Enhancement**: Add pagination query parameters (page, limit)
- **Default Values**: page=1, limit=20, max_limit=100

### Frontend Changes

#### OrdersApi Service

- **Location**: `frontend/src/services/api/orders.ts`
- **Enhancement**: Update `getHistoryOrders` to return proper pagination metadata
- **Return Type**: `{ orders: Order[], pagination: PaginationInfo }`

#### Side Menu Navigation

- **Location**: `frontend/src/App.js`
- **Enhancement**: Add customer navigation tabs similar to driver interface
- **Tabs**: "Active Orders", "History"

## Data Models

### Order Status Flow

```
pending_bids → accepted → picked_up → in_transit → delivered_pending → delivered
                ↓
            cancelled
```

### Active Orders Filter

- **Include**: `pending_bids`, `accepted`, `picked_up`, `in_transit`, `delivered_pending`
- **Exclude**: `delivered`, `cancelled`

### Pagination Response

```typescript
interface PaginationResponse<T> {
  orders: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Analysis

Let me analyze the acceptance criteria to determine which ones are testable as properties:

**1.1 Customer Active Orders Status Filtering**

- **Analysis**: This is a universal rule that should apply to all customer order requests - any customer requesting orders should only receive non-delivered orders
- **Testable**: yes - property

**1.2 Delivered Orders Exclusion**

- **Analysis**: This is a specific case of the general filtering rule - delivered orders should never appear in active orders for any customer
- **Testable**: yes - property (but redundant with 1.1)

**1.3 Cancelled Orders Exclusion**

- **Analysis**: Another specific case of the general filtering rule - cancelled orders should never appear in active orders
- **Testable**: yes - property (but redundant with 1.1)

**1.4 Active Status Inclusion**

- **Analysis**: This verifies that valid active statuses are included - the inverse of the exclusion rule
- **Testable**: yes - property (but redundant with 1.1)

**1.5 Functionality Preservation**

- **Analysis**: This ensures that filtering doesn't break existing functionality - too vague to test automatically
- **Testable**: no

**2.1 History Orders Status Filtering**

- **Analysis**: Universal rule for history endpoint - should only return completed orders for any customer
- **Testable**: yes - property

**2.6 Pagination Metadata**

- **Analysis**: Universal rule that pagination responses should always include proper metadata structure
- **Testable**: yes - property

**3.1-3.4 Backward Compatibility**

- **Analysis**: These are about maintaining API contracts and response formats - not functionally testable
- **Testable**: no

**4.1-4.4 Performance Requirements**

- **Analysis**: These are performance characteristics that require load testing, not unit testing
- **Testable**: no

**5.1-5.6 UI Navigation**

- **Analysis**: These are UI behavior requirements that require integration testing
- **Testable**: no (for unit tests)

### Property Reflection

After reviewing all properties, I can consolidate redundant ones:

- Properties 1.1, 1.2, 1.3, and 1.4 all test the same core filtering logic
- Property 2.1 tests the inverse filtering for history
- Property 2.6 tests pagination structure

### Final Properties

**Property 1: Customer Active Orders Filtering**
_For any_ customer and any set of orders, when requesting active orders, the response should only include orders with status in ['pending_bids', 'accepted', 'picked_up', 'in_transit', 'delivered_pending']
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

**Property 2: Customer History Orders Filtering**
_For any_ customer and any set of orders, when requesting order history, the response should only include orders with status in ['delivered', 'cancelled']
**Validates: Requirements 2.1**

**Property 3: Pagination Metadata Completeness**
_For any_ paginated orders response, the pagination object should contain all required fields (page, limit, total, totalPages, hasMore) with valid values
**Validates: Requirements 2.6**

## Error Handling

### Invalid Pagination Parameters

- **Scenario**: page < 1 or limit < 1
- **Response**: Default to page=1, limit=20
- **HTTP Status**: 200 (corrected parameters)

### Limit Exceeds Maximum

- **Scenario**: limit > 100
- **Response**: Cap limit at 100
- **HTTP Status**: 200 (corrected parameters)

### Database Connection Issues

- **Scenario**: Database unavailable
- **Response**: Return 500 with generic error message
- **Logging**: Log full error details for debugging

## Testing Strategy

### Unit Tests

- Test order status filtering logic with specific examples
- Test pagination parameter validation and defaults
- Test error handling for edge cases
- Test API response format consistency

### Property-Based Tests

- **Property 1**: Generate random customer IDs and order sets, verify active orders filtering
- **Property 2**: Generate random customer IDs and order sets, verify history orders filtering
- **Property 3**: Generate random pagination parameters, verify response structure

Each property test should run minimum 100 iterations to ensure comprehensive coverage through randomization.

### Integration Tests

- Test complete customer order flow from frontend to backend
- Test side menu navigation and tab switching
- Test pagination behavior across multiple pages
- Test backward compatibility with existing API consumers

**Test Configuration**: All property-based tests will be tagged with:

- **Feature: customer-active-orders-filter, Property 1**: Customer Active Orders Filtering
- **Feature: customer-active-orders-filter, Property 2**: Customer History Orders Filtering
- **Feature: customer-active-orders-filter, Property 3**: Pagination Metadata Completeness
