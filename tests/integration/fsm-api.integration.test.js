const request = require('supertest');
const { app } = require('../../backend/server');
const { multiFSMOrchestrator } = require('../../backend/fsm/MultiFSMOrchestrator');
const pool = require('../../backend/config/db');
const MarketplaceOrderService = require('../../backend/services/marketplaceOrderService');

// Mock external services for testing
jest.mock('../../backend/fsm/MultiFSMOrchestrator');
jest.mock('../../backend/services/marketplaceOrderService');
jest.mock('../../backend/config/db');

describe('FSM API Integration Tests', () => {
  let server;
  let agent;

  beforeAll(async () => {
    // Start server for testing
    server = app.listen(0); // Use random port
    agent = request.agent(server);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/marketplace/orders - Order Creation with FSM', () => {
    test('should create order and initialize FSM orchestrator', async () => {
      const userId = 1;
      const vendorId = 2;

      // Mock authentication
      const mockUser = { userId, email: 'test@example.com' };

      // Mock order creation response
      const mockOrder = {
        id: 12345,
        order_number: 'ORD-12345',
        user_id: userId,
        vendor_id: vendorId,
        total_amount: 150.00,
        commission_amount: 15.00,
        status: 'pending',
        fsm_states: {
          vendor: 'awaiting_order_availability_vendor_confirmation',
          payment: null,
          delivery: null
        }
      };

      // Mock marketplaceOrderService
      MarketplaceOrderService.prototype.createOrder = jest.fn().mockResolvedValue(mockOrder);

      const orderData = {
        deliveryAddress: '123 Test St',
        deliveryLat: 30.0444,
        deliveryLng: 31.2357,
        deliveryInstructions: 'Ring doorbell',
        customerNotes: 'Extra napkins please'
      };

      const response = await agent
        .post('/api/marketplace/orders')
        .set('Authorization', 'Bearer mock-token')
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fsm_states).toBeDefined();
      expect(response.body.data.fsm_states.vendor).toBe('awaiting_order_availability_vendor_confirmation');
    });

    test('should handle order creation failure gracefully', async () => {
      // Mock service to throw error
      MarketplaceOrderService.prototype.createOrder = jest.fn().mockRejectedValue(new Error('Cart validation failed'));

      const orderData = {
        deliveryAddress: '123 Test St',
        deliveryLat: 30.0444,
        deliveryLng: 31.2357
      };

      const response = await agent
        .post('/api/marketplace/orders')
        .set('Authorization', 'Bearer mock-token')
        .send(orderData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cart validation failed');
    });
  });

  describe('PUT /api/marketplace/orders/:id/status - FSM State Transitions', () => {
    test('should handle vendor order acceptance through API', async () => {
      const orderId = 12345;
      const vendorId = 2;

      const mockUpdatedOrder = {
        id: orderId,
        status: 'accepted',
        fsm_states: {
          vendor: 'awaiting_vendor_start_preparation',
          payment: 'payment_pending_for_customer',
          delivery: 'delivery_request_created_waiting_for_courier_acceptance'
        }
      };

      // Mock the service method
      MarketplaceOrderService.prototype.updateOrderStatus = jest.fn().mockResolvedValue(mockUpdatedOrder);

      const updateData = {
        action: 'vendor_accepts_order',
        userRole: 'vendor'
      };

      const response = await agent
        .put(`/api/marketplace/orders/${orderId}/status`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fsm_states.vendor).toBe('awaiting_vendor_start_preparation');
      expect(response.body.data.fsm_states.payment).toBe('payment_pending_for_customer');
    });

    test('should handle customer payment confirmation', async () => {
      const orderId = 12345;
      const customerId = 1;

      const mockUpdatedOrder = {
        id: orderId,
        status: 'paid',
        fsm_states: {
          vendor: 'awaiting_vendor_start_preparation',
          payment: 'payment_successfully_received_and_verified_for_order',
          delivery: 'delivery_request_created_waiting_for_courier_acceptance'
        }
      };

      MarketplaceOrderService.prototype.updateOrderStatus = jest.fn().mockResolvedValue(mockUpdatedOrder);

      const updateData = {
        action: 'customer_completes_payment',
        userRole: 'customer',
        paymentData: {
          amount: 150.00,
          method: 'card',
          transactionId: 'txn_123'
        }
      };

      const response = await agent
        .put(`/api/marketplace/orders/${orderId}/status`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.fsm_states.payment).toBe('payment_successfully_received_and_verified_for_order');
    });

    test('should handle courier delivery assignment', async () => {
      const orderId = 12345;
      const driverId = 3;

      const mockUpdatedOrder = {
        id: orderId,
        status: 'assigned',
        fsm_states: {
          vendor: 'order_is_fully_prepared_and_ready_for_delivery',
          payment: 'payment_successfully_received_and_verified_for_order',
          delivery: 'courier_has_been_assigned_to_deliver_the_order'
        }
      };

      MarketplaceOrderService.prototype.updateOrderStatus = jest.fn().mockResolvedValue(mockUpdatedOrder);

      const updateData = {
        action: 'courier_accepts_delivery_request',
        userRole: 'driver',
        driverId: driverId
      };

      const response = await agent
        .put(`/api/marketplace/orders/${orderId}/status`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.fsm_states.delivery).toBe('courier_has_been_assigned_to_deliver_the_order');
    });

    test('should handle order completion through customer confirmation', async () => {
      const orderId = 12345;
      const customerId = 1;

      const mockUpdatedOrder = {
        id: orderId,
        status: 'completed',
        fsm_states: {
          vendor: 'order_is_fully_prepared_and_ready_for_delivery',
          payment: 'payment_successfully_received_and_verified_for_order',
          delivery: 'order_delivery_successfully_completed_and_confirmed_by_customer'
        }
      };

      MarketplaceOrderService.prototype.updateOrderStatus = jest.fn().mockResolvedValue(mockUpdatedOrder);

      const updateData = {
        action: 'customer_confirms_receipt',
        userRole: 'customer',
        rating: 5,
        feedback: 'Great service!'
      };

      const response = await agent
        .put(`/api/marketplace/orders/${orderId}/status`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.fsm_states.delivery).toBe('order_delivery_successfully_completed_and_confirmed_by_customer');
    });

    test('should reject invalid transitions', async () => {
      const orderId = 12345;

      MarketplaceOrderService.prototype.updateOrderStatus = jest.fn().mockRejectedValue(new Error('Invalid transition: current state does not allow this action'));

      const updateData = {
        action: 'invalid_action',
        userRole: 'customer'
      };

      const response = await agent
        .put(`/api/marketplace/orders/${orderId}/status`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid transition');
    });
  });

  describe('GET /api/marketplace/orders/:id - FSM State Retrieval', () => {
    test('should return order with current FSM states', async () => {
      const orderId = 12345;

      const mockOrder = {
        id: orderId,
        order_number: 'ORD-12345',
        status: 'paid',
        total_amount: 150.00,
        fsm_states: {
          vendor: 'order_is_fully_prepared_and_ready_for_delivery',
          payment: 'payment_successfully_received_and_verified_for_order',
          delivery: 'courier_has_been_assigned_to_deliver_the_order'
        }
      };

      MarketplaceOrderService.prototype.getOrder = jest.fn().mockResolvedValue(mockOrder);

      const response = await agent
        .get(`/api/marketplace/orders/${orderId}`)
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fsm_states).toBeDefined();
      expect(response.body.data.fsm_states.vendor).toBe('order_is_fully_prepared_and_ready_for_delivery');
      expect(response.body.data.fsm_states.payment).toBe('payment_successfully_received_and_verified_for_order');
      expect(response.body.data.fsm_states.delivery).toBe('courier_has_been_assigned_to_deliver_the_order');
    });
  });

  describe('Timeout Integration', () => {
    test('should handle vendor confirmation timeout via API', async () => {
      const orderId = 12345;

      // Mock timeout handling
      multiFSMOrchestrator.handleTimeout = jest.fn().mockResolvedValue({
        orderId,
        timeoutType: 'vendor_confirmation',
        actionTaken: 'order_cancelled'
      });

      // Mock the service to handle the timeout
      MarketplaceOrderService.prototype.handleTimeout = jest.fn().mockResolvedValue({
        id: orderId,
        status: 'cancelled',
        timeoutHandled: true
      });

      const timeoutData = {
        fsmType: 'vendor',
        state: 'awaiting_order_availability_vendor_confirmation',
        timeoutType: 'vendor_confirmation'
      };

      const response = await agent
        .post(`/api/marketplace/orders/${orderId}/timeout`)
        .set('Authorization', 'Bearer mock-token')
        .send(timeoutData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeoutHandled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle authorization failures', async () => {
      const orderId = 12345;

      MarketplaceOrderService.prototype.updateOrderStatus = jest.fn().mockRejectedValue(new Error('Access denied'));

      const updateData = {
        action: 'vendor_accepts_order',
        userRole: 'customer' // Wrong role
      };

      const response = await agent
        .put(`/api/marketplace/orders/${orderId}/status`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access denied');
    });

    test('should handle order not found', async () => {
      const orderId = 99999;

      MarketplaceOrderService.prototype.getOrder = jest.fn().mockRejectedValue(new Error('Order not found'));

      const response = await agent
        .get(`/api/marketplace/orders/${orderId}`)
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Order not found');
    });
  });

  describe('Race Condition Handling', () => {
    test('should handle concurrent state transitions safely', async () => {
      const orderId = 12345;

      // Mock service to simulate race condition handling
      MarketplaceOrderService.prototype.updateOrderStatus = jest.fn()
        .mockResolvedValueOnce({
          id: orderId,
          status: 'accepted',
          fsm_states: { vendor: 'awaiting_vendor_start_preparation' }
        })
        .mockRejectedValueOnce(new Error('Concurrent modification detected'));

      // First request succeeds
      const response1 = await agent
        .put(`/api/marketplace/orders/${orderId}/status`)
        .set('Authorization', 'Bearer mock-token-1')
        .send({
          action: 'vendor_accepts_order',
          userRole: 'vendor'
        });

      expect(response1.status).toBe(200);

      // Second concurrent request fails
      const response2 = await agent
        .put(`/api/marketplace/orders/${orderId}/status`)
        .set('Authorization', 'Bearer mock-token-2')
        .send({
          action: 'vendor_accepts_order',
          userRole: 'vendor'
        });

      expect(response2.status).toBe(409); // Conflict
      expect(response2.body.error).toContain('Concurrent modification');
    });
  });

  describe('Audit Trail Integration', () => {
    test('should log all FSM transitions to audit trail', async () => {
      const orderId = 12345;
      const vendorId = 2;

      const mockUpdatedOrder = {
        id: orderId,
        status: 'accepted',
        fsm_states: {
          vendor: 'awaiting_vendor_start_preparation'
        }
      };

      MarketplaceOrderService.prototype.updateOrderStatus = jest.fn().mockResolvedValue(mockUpdatedOrder);

      // Mock database to verify audit logging
      pool.query = jest.fn().mockResolvedValue({ rows: [] });

      const updateData = {
        action: 'vendor_accepts_order',
        userRole: 'vendor'
      };

      const response = await agent
        .put(`/api/marketplace/orders/${orderId}/status`)
        .set('Authorization', 'Bearer mock-token')
        .send(updateData);

      expect(response.status).toBe(200);

      // Verify audit log was called
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO fsm_action_log'),
        expect.any(Array)
      );
    });
  });
});
