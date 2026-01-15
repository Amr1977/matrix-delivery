# Requirements Document

## Introduction

This specification addresses a critical bug in the customer orders display where the active orders list shows all orders (including delivered ones) instead of only showing non-delivered orders. This creates confusion for customers who expect to see only their ongoing orders in the active orders view.

## Glossary

- **Active_Orders**: Orders that are not yet completed or cancelled (statuses: pending_bids, accepted, picked_up, in_transit, delivered_pending)
- **Delivered_Orders**: Orders with status 'delivered' that should appear in history, not active orders
- **Customer**: A user with primary_role 'customer' who creates and manages orders
- **Order_Service**: Backend service responsible for fetching and filtering orders
- **Order_Status**: The current state of an order (pending_bids, accepted, picked_up, in_transit, delivered_pending, delivered, cancelled)

## Requirements

### Requirement 1: Customer Active Orders Filtering

**User Story:** As a customer, I want to see only my non-delivered orders in the active orders list, so that I can focus on orders that still require my attention.

#### Acceptance Criteria

1. WHEN a customer requests their orders via the main orders endpoint, THE Order_Service SHALL return only orders with status NOT equal to 'delivered'
2. WHEN a customer has orders with status 'delivered', THE Order_Service SHALL exclude them from the active orders response
3. WHEN a customer has orders with status 'cancelled', THE Order_Service SHALL exclude them from the active orders response
4. WHEN a customer has orders with status 'pending_bids', 'accepted', 'picked_up', 'in_transit', or 'delivered_pending', THE Order_Service SHALL include them in the active orders response
5. WHEN the filtering is applied, THE Order_Service SHALL maintain all existing functionality for order details, bids, and customer statistics
6. WHEN a customer requests active orders with pagination parameters, THE Order_Service SHALL support page and limit query parameters
7. WHEN pagination is used for active orders, THE Order_Service SHALL return metadata including total count, current page, and has_more_pages
8. WHEN no pagination parameters are provided for active orders, THE Order_Service SHALL default to page 1 with a limit of 20 orders
9. WHEN the page limit exceeds 100 for active orders, THE Order_Service SHALL cap the limit at 100 to prevent performance issues

### Requirement 2: History Orders Endpoint

**User Story:** As a customer, I want to access my completed and cancelled orders through a separate history endpoint, so that I can review past transactions without cluttering my active orders view.

#### Acceptance Criteria

1. WHEN a customer requests their order history, THE Order_Service SHALL return only orders with status 'delivered' or 'cancelled'
2. WHEN fetching history orders, THE Order_Service SHALL include all order details and statistics as in active orders
3. WHEN no history orders exist, THE Order_Service SHALL return an empty array
4. WHEN history orders are requested, THE Order_Service SHALL order them by completion date (delivered_at or cancelled_at) in descending order
5. WHEN a customer requests history with pagination parameters, THE Order_Service SHALL support page and limit query parameters
6. WHEN pagination is used, THE Order_Service SHALL return metadata including total count, current page, and has_more_pages
7. WHEN no pagination parameters are provided, THE Order_Service SHALL default to page 1 with a limit of 20 orders
8. WHEN the page limit exceeds 100, THE Order_Service SHALL cap the limit at 100 to prevent performance issues

### Requirement 3: Backward Compatibility

**User Story:** As a system administrator, I want the fix to maintain backward compatibility, so that existing API consumers continue to work without modification.

#### Acceptance Criteria

1. WHEN the fix is deployed, THE Order_Service SHALL maintain the same response format for all existing fields
2. WHEN drivers or admins request orders, THE Order_Service SHALL continue to work with existing logic unchanged
3. WHEN the customer orders endpoint is called, THE Order_Service SHALL return the same data structure with filtered results
4. WHEN existing frontend code processes the response, THE Order_Service SHALL ensure no breaking changes to the API contract

### Requirement 4: Performance Optimization

**User Story:** As a system user, I want the orders filtering to be performant, so that the application remains responsive.

#### Acceptance Criteria

1. WHEN filtering customer orders, THE Order_Service SHALL use database-level filtering rather than application-level filtering
2. WHEN the query executes, THE Order_Service SHALL leverage existing database indexes on status and customer_id columns
3. WHEN multiple customers request orders simultaneously, THE Order_Service SHALL handle the load without performance degradation
4. WHEN the filtering query runs, THE Order_Service SHALL complete within the same performance parameters as the original query

### Requirement 5: UI Consistency and Navigation

**User Story:** As a customer, I want to access active and history orders through a side menu navigation, so that the interface is consistent with the driver user experience.

#### Acceptance Criteria

1. WHEN a customer views the application, THE Frontend SHALL display active orders and history tabs in the side menu
2. WHEN the side menu is rendered, THE Frontend SHALL follow the same navigation pattern as the driver interface
3. WHEN a customer clicks the active orders tab, THE Frontend SHALL display only non-delivered orders
4. WHEN a customer clicks the history tab, THE Frontend SHALL display only delivered and cancelled orders
5. WHEN switching between tabs, THE Frontend SHALL maintain the current pagination state independently for each view
6. WHEN the active orders tab is selected by default, THE Frontend SHALL show it as the initial view for customers

**User Story:** As a system user, I want the orders filtering to be performant, so that the application remains responsive.

#### Acceptance Criteria

1. WHEN filtering customer orders, THE Order_Service SHALL use database-level filtering rather than application-level filtering
2. WHEN the query executes, THE Order_Service SHALL leverage existing database indexes on status and customer_id columns
3. WHEN multiple customers request orders simultaneously, THE Order_Service SHALL handle the load without performance degradation
4. WHEN the filtering query runs, THE Order_Service SHALL complete within the same performance parameters as the original query
