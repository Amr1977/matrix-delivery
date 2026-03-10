const request = require('supertest');
const { multiFSMOrchestrator } = require('../../backend/fsm/MultiFSMOrchestrator');
const pool = require('../../backend/config/db');

// Mock external services for testing
jest.mock('../../backend/fsm/MultiFSMOrchestrator');
jest.mock('../../backend/config/db');

// Mock MarketplaceOrderService BEFORE requiring app
const mockMarketplaceOrderService = {
  createOrder: jest.fn(),
  getOrder: jest.fn(),
  getOrdersForUser: jest.fn(),
  updateOrderStatus: jest.fn(),
  cancelOrder: jest.fn(),
  vendorAcceptOrder: jest.fn(),
  vendorRejectOrder: jest.fn(),
  customerConfirmPayment: jest.fn(),
  adminAssignDriver: jest.fn(),
  driverPickupOrder: jest.fn(),
  driverDeliverOrder: jest.fn(),
  customerConfirmReceipt: jest.fn(),
  customerDisputeOrder: jest.fn(),
  handleTimeout: jest.fn()
};

jest.mock('../../backend/services/marketplaceOrderService', () => {
  return jest.fn().mockImplementation(() => mockMarketplaceOrderService);
});

// Now require app after mocking
const app = require('../../backend/server');

// Mock authentication middleware
jest.mock('../../backend/middleware/auth', () => {
  const original = jest.requireActual('../../backend/middleware/auth');
  return {
    ...original,
    verifyToken: (req, res, next) => {
      const token = req.headers.authorization || '';
      let role = 'customer';
      let userId = 1;
      
      if (token.includes('vendor')) {
        role = 'vendor';
        userId = 2; 
      } else if (token.includes('driver')) {
        role = 'driver';
        userId = 3;
      } else if (token.includes('admin')) {
        role = 'admin';
        userId = 99;
      }
      
      req.user = { userId, role };
      next();
    },
    requireRole: (...roles) => (req, res, next) => next()
  };
});

// Mock database pool query
pool.query.mockImplementation((query) => {
  if (query.includes('SELECT id FROM vendors WHERE user_id')) {
    return Promise.resolve({ rows: [{ id: 2 }] });
  }
  return Promise.resolve({ rows: [] });
});

describe('FSM API Integration Tests', () => {
  let server;
  let agent;

  beforeAll(async () => {
    server = app.listen(0);
    agent = request.agent(server);
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOrderBase = {
    id: 12345,
    order_number: 'ORD-12345',
    total_amount: 150.00,
  };

  describe('POST /api/marketplace/orders - Order Creation', () => {
    test('should create order and return FSM states', async () => {
      const mockOrder = {
        ...mockOrderBase,
        status: 'pending',
        fsm_states: {
          vendor: 'awaiting_order_availability_vendor_confirmation',
          payment: 'payment_pending_for_customer',
          delivery: null
        }
      };

      mockMarketplaceOrderService.createOrder.mockResolvedValue(mockOrder);

      const response = await agent
        .post('/api/marketplace/orders')
        .set('Authorization', 'Bearer customer-token')
        .send({
          deliveryAddress: '123 Test St',
          deliveryLat: 30.0444,
          deliveryLng: 31.2357
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fsm_states.vendor).toBe('awaiting_order_availability_vendor_confirmation');
    });
  });

  describe('PATCH /api/marketplace/orders/:id/status - Vendor Accept/Reject', () => {
    test('should handle vendor order acceptance', async () => {
      const mockUpdatedOrder = {
        ...mockOrderBase,
        status: 'accepted',
        fsm_states: {
          vendor: 'awaiting_vendor_start_preparation'
        }
      };

      mockMarketplaceOrderService.vendorAcceptOrder.mockResolvedValue(mockUpdatedOrder);

      const response = await agent
        .patch('/api/marketplace/orders/12345/status')
        .set('Authorization', 'Bearer vendor-token')
        .send({
          action: 'accept'
        });

      expect(response.status).toBe(200);
      expect(mockMarketplaceOrderService.vendorAcceptOrder).toHaveBeenCalledWith(12345, 2);
    });
  });

  describe('POST /api/marketplace/orders/:id/confirm-payment', () => {
    test('should handle customer payment confirmation', async () => {
      const mockUpdatedOrder = {
        ...mockOrderBase,
        status: 'paid',
        fsm_states: {
          payment: 'payment_successfully_received_and_verified_for_order'
        }
      };

      mockMarketplaceOrderService.customerConfirmPayment.mockResolvedValue(mockUpdatedOrder);

      const response = await agent
        .post('/api/marketplace/orders/12345/confirm-payment')
        .set('Authorization', 'Bearer customer-token')
        .send({ paymentReference: 'txn_123' });

      expect(response.status).toBe(200);
      expect(response.body.data.fsm_states.payment).toBe('payment_successfully_received_and_verified_for_order');
    });
  });

  describe('POST /api/marketplace/orders/:id/assign-driver', () => {
    test('should handle courier delivery assignment', async () => {
      const mockUpdatedOrder = {
        ...mockOrderBase,
        status: 'assigned',
        fsm_states: {
          delivery: 'courier_has_been_assigned_to_deliver_the_order'
        }
      };

      mockMarketplaceOrderService.adminAssignDriver.mockResolvedValue(mockUpdatedOrder);

      const response = await agent
        .post('/api/marketplace/orders/12345/assign-driver')
        .set('Authorization', 'Bearer admin-token')
        .send({ driverId: 3 });

      expect(response.status).toBe(200);
      expect(response.body.data.fsm_states.delivery).toBe('courier_has_been_assigned_to_deliver_the_order');
    });
  });

  describe('POST /api/marketplace/orders/:id/deliver', () => {
    test('should handle delivery marking by courier', async () => {
      const mockUpdatedOrder = {
        ...mockOrderBase,
        status: 'delivered',
        fsm_states: {
          delivery: 'awaiting_customer_confirmation_of_order_delivery'
        }
      };

      mockMarketplaceOrderService.driverDeliverOrder.mockResolvedValue(mockUpdatedOrder);

      const response = await agent
        .post('/api/marketplace/orders/12345/deliver')
        .set('Authorization', 'Bearer driver-token')
        .send({ deliveryNotes: 'Left at reception' });

      expect(response.status).toBe(200);
      expect(mockMarketplaceOrderService.driverDeliverOrder).toHaveBeenCalledWith(12345, 3);
    });
  });

  describe('POST /api/marketplace/orders/:id/confirm-receipt', () => {
    test('should handle order completion through customer confirmation', async () => {
      const mockUpdatedOrder = {
        ...mockOrderBase,
        status: 'completed',
        fsm_states: {
          delivery: 'order_delivery_successfully_completed_and_confirmed_by_customer'
        }
      };

      mockMarketplaceOrderService.customerConfirmReceipt.mockResolvedValue(mockUpdatedOrder);

      const response = await agent
        .post('/api/marketplace/orders/12345/confirm-receipt')
        .set('Authorization', 'Bearer customer-token')
        .send({ rating: 5, feedback: 'Great service!' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('completed');
    });
  });

  describe('Error Handling Mappings', () => {
    test('should correctly map concurrency errors to 409', async () => {
      mockMarketplaceOrderService.vendorAcceptOrder.mockRejectedValue(new Error('concurrency conflict detected'));

      const response = await agent
        .patch('/api/marketplace/orders/12345/status')
        .set('Authorization', 'Bearer vendor-token')
        .send({ action: 'accept' });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('concurrency');
    });

    test('should correctly map invalid transitions to 400', async () => {
      mockMarketplaceOrderService.customerConfirmReceipt.mockRejectedValue(new Error('Invalid transition: current state does not allow this'));

      const response = await agent
        .post('/api/marketplace/orders/12345/confirm-receipt')
        .set('Authorization', 'Bearer customer-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid transition');
    });
  });
});
