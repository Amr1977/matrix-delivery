const VendorPayoutService = require('../../../backend/modules/marketplace/services/vendorPayoutService');
const normalizeSql = (sql) => sql.replace(/\s+/g, ' ').trim();

// Mock the database
jest.mock('../../../backend/config/db', () => ({
  query: jest.fn()
}));

const pool = require('../../../backend/config/db');

describe('VendorPayoutService', () => {
  let service;

  beforeEach(() => {
    jest.resetAllMocks();
    pool.query.mockReset();
    service = new VendorPayoutService();
  });

  describe('createPayout', () => {
    it('should create payout successfully', async () => {
      const orderId = 1;
      const orderData = {
        vendor_id: 2,
        total_amount: 100.00,
        commission_amount: 10.00,
        currency: 'EGP'
      };

      const mockPayout = {
        id: 1,
        payout_number: 'PAYOUT-20241201-0001',
        vendor_id: 2,
        order_id: 1,
        payout_amount: 90.00,
        status: 'pending'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockPayout] });

      const result = await service.createPayout(orderId, orderData);

      expect(result).toEqual(mockPayout);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vendor_payouts'),
        expect.any(Array)
      );
    });

    it('should calculate payout amount correctly', async () => {
      const orderId = 1;
      const orderData = {
        vendor_id: 2,
        total_amount: 200.00,
        commission_amount: 20.00
      };

      const mockPayout = {
        id: 1,
        payout_amount: 180.00, // 200 - 20
        status: 'pending'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockPayout] });

      await service.createPayout(orderId, orderData);

      const insertCall = pool.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO vendor_payouts')
      );

      expect(insertCall[1]).toContain(180.00); // payout_amount should be 180
    });
  });

  describe('processPayout', () => {
    it('should mark payout as processing', async () => {
      const payoutId = 1;
      const processedBy = 100;

      const mockPayout = {
        id: 1,
        payout_number: 'PAYOUT-20241201-0001',
        status: 'processing',
        processed_by: 100
      };

      pool.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.processPayout(payoutId, processedBy);

      expect(result).toEqual(mockPayout);
      expect(normalizeSql(pool.query.mock.calls[0][0])).toContain(
        "UPDATE vendor_payouts SET status = 'processing'"
      );
      expect(pool.query.mock.calls[0][1]).toEqual([payoutId, processedBy]);
    });

    it('should throw error for non-existent payout', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(service.processPayout(999, 100)).rejects.toThrow(
        'Payout not found or not in pending status'
      );
    });
  });

  describe('completePayout', () => {
    it('should complete payout successfully', async () => {
      const payoutId = 1;
      const referenceNumber = 'TXN-123';
      const payoutDetails = { bankRef: 'BANK-456' };

      const mockPayout = {
        id: 1,
        payout_number: 'PAYOUT-20241201-0001',
        status: 'completed',
        reference_number: 'TXN-123',
        payout_details: { bankRef: 'BANK-456' }
      };

      pool.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.completePayout(payoutId, referenceNumber, payoutDetails);

      expect(result).toEqual(mockPayout);
      expect(normalizeSql(pool.query.mock.calls[0][0])).toContain(
        "UPDATE vendor_payouts SET status = 'completed'"
      );
      expect(pool.query.mock.calls[0][1]).toEqual([
        payoutId,
        referenceNumber,
        JSON.stringify(payoutDetails)
      ]);
    });
  });

  describe('failPayout', () => {
    it('should fail payout with reason', async () => {
      const payoutId = 1;
      const failureReason = 'Insufficient funds';

      const mockPayout = {
        id: 1,
        payout_number: 'PAYOUT-20241201-0001',
        status: 'failed',
        failure_reason: 'Insufficient funds'
      };

      pool.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.failPayout(payoutId, failureReason);

      expect(result).toEqual(mockPayout);
      expect(normalizeSql(pool.query.mock.calls[0][0])).toContain(
        "UPDATE vendor_payouts SET status = 'failed'"
      );
      expect(pool.query.mock.calls[0][1]).toEqual([payoutId, failureReason]);
    });
  });

  describe('getPayoutById', () => {
    it('should return payout with vendor and order details', async () => {
      const payoutId = 1;

      const mockPayout = {
        id: 1,
        payout_number: 'PAYOUT-20241201-0001',
        vendor_name: 'Test Vendor',
        order_number: 'MO-123-456'
      };

      pool.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.getPayoutById(payoutId);

      expect(result).toEqual(mockPayout);
      expect(normalizeSql(pool.query.mock.calls[0][0])).toContain(
        'SELECT vp.*, v.name as vendor_name'
      );
      expect(pool.query.mock.calls[0][1]).toEqual([payoutId]);
    });

    it('should return null for non-existent payout', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await service.getPayoutById(999);

      expect(result).toBeNull();
    });
  });

  describe('getPayoutsByVendor', () => {
    it('should return vendor payouts with filters', async () => {
      const vendorId = 2;
      const filters = { status: 'pending', limit: 10 };

      const mockPayouts = [
        { id: 1, payout_number: 'PAYOUT-001', status: 'pending' },
        { id: 2, payout_number: 'PAYOUT-002', status: 'pending' }
      ];

      pool.query.mockResolvedValue({ rows: mockPayouts });

      const result = await service.getPayoutsByVendor(vendorId, filters);

      expect(result).toEqual(mockPayouts);
      expect(normalizeSql(pool.query.mock.calls[0][0])).toContain(
        'SELECT vp.*, mo.order_number'
      );
      expect(pool.query.mock.calls[0][1]).toEqual([vendorId, 'pending', 10, 0]);
    });
  });

  describe('getAllPayouts', () => {
    it('should return all payouts for admin with filters', async () => {
      const filters = { status: 'completed', vendorId: 2 };

      const mockPayouts = [
        { id: 1, payout_number: 'PAYOUT-001', status: 'completed' }
      ];

      pool.query.mockResolvedValue({ rows: mockPayouts });

      const result = await service.getAllPayouts(filters);

      expect(result).toEqual(mockPayouts);
      expect(normalizeSql(pool.query.mock.calls[0][0])).toContain(
        'SELECT vp.*, v.name as vendor_name'
      );
      expect(pool.query.mock.calls[0][1]).toEqual(['completed', 2, 50, 0]);
    });
  });

  describe('updatePayoutMethod', () => {
    it('should update payout method for pending payout', async () => {
      const payoutId = 1;
      const payoutMethod = 'bank_transfer';
      const payoutDetails = { accountNumber: '123456789' };

      const mockPayout = {
        id: 1,
        payout_method: 'bank_transfer',
        payout_details: { accountNumber: '123456789' }
      };

      pool.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.updatePayoutMethod(payoutId, payoutMethod, payoutDetails);

      expect(result).toEqual(mockPayout);
      expect(normalizeSql(pool.query.mock.calls[0][0])).toContain(
        'UPDATE vendor_payouts SET payout_method'
      );
      expect(pool.query.mock.calls[0][1]).toEqual([
        payoutId,
        payoutMethod,
        JSON.stringify(payoutDetails)
      ]);
    });
  });

  describe('getPayoutStats', () => {
    it('should return payout statistics for vendor', async () => {
      const vendorId = 2;

      const mockStats = {
        total_payouts: 10,
        completed_payouts: 8,
        pending_payouts: 2,
        total_paid: 800.00,
        total_commissions: 100.00
      };

      pool.query.mockResolvedValue({ rows: [mockStats] });

      const result = await service.getPayoutStats(vendorId);

      expect(result).toEqual(mockStats);
      expect(normalizeSql(pool.query.mock.calls[0][0])).toContain(
        'SELECT COUNT(*) as total_payouts'
      );
      expect(pool.query.mock.calls[0][1]).toEqual([vendorId]);
    });
  });

  describe('processPendingPayouts', () => {
    it('should process pending payouts in batch', async () => {
      const pendingPayouts = [
        { id: 1, payout_number: 'PAYOUT-001', payout_method: 'bank_transfer' },
        { id: 2, payout_number: 'PAYOUT-002', payout_method: 'bank_transfer' }
      ];

      // Mock getting pending payouts
      pool.query
        .mockResolvedValueOnce({ rows: pendingPayouts }) // First call gets pending payouts
        .mockResolvedValue({ rows: [{ id: 1 }] }); // Subsequent calls for processing

      const result = await service.processPendingPayouts(10);

      expect(result).toHaveLength(2);
      expect(normalizeSql(pool.query.mock.calls[0][0])).toContain(
        "SELECT * FROM vendor_payouts WHERE status = 'pending'"
      );
      expect(pool.query.mock.calls[0][1]).toEqual([10]);
    });

    it('should handle payout processing failures gracefully', async () => {
      const pendingPayouts = [
        { id: 1, payout_number: 'PAYOUT-001', payout_method: 'bank_transfer' }
      ];

      // Mock getting pending payouts
      pool.query
        .mockResolvedValueOnce({ rows: pendingPayouts }) // Gets pending payouts
        .mockRejectedValueOnce(new Error('Processing failed')) // Processing fails
        .mockResolvedValue({ rows: [{ id: 1 }] }); // Fail payout call

      const result = await service.processPendingPayouts(10);

      expect(result).toHaveLength(0); // No successful payouts
    });
  });

  describe('generatePayoutNumber', () => {
    it('should generate unique payout numbers', async () => {
      // Mock date to return consistent date
      const mockDate = new Date('2024-12-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      // Mock payout number check - first exists, second doesn't
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // PAYOUT-20241201-0000 exists
        .mockResolvedValueOnce({ rows: [] }); // PAYOUT-20241201-0001 doesn't exist

      const result = await service.generatePayoutNumber();

      expect(result).toBe('PAYOUT-20241201-0001');

      global.Date.mockRestore();
    });
  });
});
