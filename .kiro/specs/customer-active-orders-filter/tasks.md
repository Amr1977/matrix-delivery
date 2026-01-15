# Implementation Plan: Customer Active Orders Filter

## Overview

This implementation plan fixes the customer active orders filtering bug by modifying the backend order service to exclude delivered/cancelled orders and updating the frontend to provide consistent navigation with pagination support.

## Tasks

- [x] 1. Fix Backend Order Service Filtering
  - Modify the customer query in `orderService.js` to exclude delivered and cancelled orders
  - Add status filtering to the WHERE clause for customer orders
  - Ensure existing functionality for bids and statistics is preserved
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.1 Write property test for customer active orders filtering
  - **Property 1: Customer Active Orders Filtering**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [ ] 2. Add Pagination Support to Orders Endpoint
  - Add pagination query parameters (page, limit) to orders route
  - Implement pagination logic with defaults (page=1, limit=20, max=100)
  - Return pagination metadata in response format
  - _Requirements: 1.6, 1.7, 1.8, 1.9_

- [ ] 2.1 Write property test for pagination metadata
  - **Property 3: Pagination Metadata Completeness**
  - **Validates: Requirements 2.6**

- [ ] 3. Update History Orders Endpoint
  - Verify history endpoint correctly filters delivered/cancelled orders
  - Ensure pagination is working properly for history orders
  - Update ordering to use completion dates (delivered_at, cancelled_at)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [ ] 3.1 Write property test for history orders filtering
  - **Property 2: Customer History Orders Filtering**
  - **Validates: Requirements 2.1**

- [ ] 4. Update Frontend OrdersApi Service
  - Modify getHistoryOrders to return proper pagination metadata
  - Update TypeScript interfaces for pagination response
  - Ensure backward compatibility with existing API calls
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4.1 Write unit tests for OrdersApi pagination
  - Test pagination parameter handling
  - Test response format consistency
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Frontend Side Menu Navigation
  - Add "Active Orders" and "History" tabs to customer side menu
  - Follow the same navigation pattern as driver interface
  - Implement tab switching logic with independent pagination state
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 6.1 Write unit tests for side menu navigation
  - Test tab switching behavior
  - Test pagination state independence
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 7. Update Frontend Order Display Logic
  - Ensure active orders view only shows non-delivered orders
  - Ensure history view only shows delivered/cancelled orders
  - Maintain existing order card functionality and styling
  - _Requirements: 5.3, 5.4_

- [ ] 7.1 Write integration tests for order display
  - Test order filtering in both views
  - Test order card rendering consistency
  - _Requirements: 5.3, 5.4_

- [ ] 8. Final Integration and Testing
  - Test complete customer flow from login to order management
  - Verify pagination works correctly in both active and history views
  - Ensure no breaking changes to existing functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 8.1 Write end-to-end integration tests
  - Test complete customer order workflow
  - Test backward compatibility with existing API consumers
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript for type safety and better maintainability

## Handover Information for Continuation

If another AI agent needs to continue this work, they should:

1. **Start with Task 1**: Fix Backend Order Service Filtering in `backend/services/orderService.js`
2. **Key Files to Modify**:
   - `backend/services/orderService.js` (main fix)
   - `backend/routes/orders.js` (pagination)
   - `frontend/src/services/api/orders.ts` (API service)
   - `frontend/src/App.js` (UI navigation)

3. **Critical Requirements**:
   - Customer active orders must exclude status 'delivered' and 'cancelled'
   - History orders must include only 'delivered' and 'cancelled' status
   - Pagination must default to page=1, limit=20, max=100
   - UI must match driver interface navigation pattern

4. **Testing Requirements**:
   - Property-based tests for filtering logic (min 100 iterations)
   - Unit tests for API and UI components
   - Integration tests for complete workflow

5. **Current Status**: Spec complete, ready for implementation
6. **Next Action**: Execute Task 1 - Fix Backend Order Service Filtering
