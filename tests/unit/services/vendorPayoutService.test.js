const VendorPayoutService = require('../../../backend/services/vendorPayoutService');

// Mock the database
jest.mock('../../../backend/config/db', () => ({
  db: {
    query: jest.fn()
  }
}));

const { db } = require('../../../backend/config/db');

describe('VendorPayoutService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockClear();
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

      db.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.createPayout(orderId, orderData);

      expect(result).toEqual(mockPayout);
      expect(db.query).toHaveBeenCalledWith(
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

      db.query.mockResolvedValue({ rows: [mockPayout] });

      await service.createPayout(orderId, orderData);

      const insertCall = db.query.mock.calls.find(call =>
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

      db.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.processPayout(payoutId, processedBy);

      expect(result).toEqual(mockPayout);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vendor_payouts SET status = \'processing\''),
        [payoutId, processedBy]
      );
    });

    it('should throw error for non-existent payout', async () => {
      db.query.mockResolvedValue({ rows: [] });

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

      db.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.completePayout(payoutId, referenceNumber, payoutDetails);

      expect(result).toEqual(mockPayout);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vendor_payouts SET status = \'completed\''),
        [payoutId, referenceNumber, JSON.stringify(payoutDetails)]
      );
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

      db.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.failPayout(payoutId, failureReason);

      expect(result).toEqual(mockPayout);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vendor_payouts SET status = \'failed\''),
        [payoutId, failureReason]
      );
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

      db.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.getPayoutById(payoutId);

      expect(result).toEqual(mockPayout);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT vp.*, v.name as vendor_name'),
        [payoutId]
      );
    });

    it('should return null for non-existent payout', async () => {
      db.query.mockResolvedValue({ rows: [] });

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

      db.query.mockResolvedValue({ rows: mockPayouts });

      const result = await service.getPayoutsByVendor(vendorId, filters);

      expect(result).toEqual(mockPayouts);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT vp.*, mo.order_number'),
        [vendorId, 'pending', 10, 0]
      );
    });
  });

  describe('getAllPayouts', () => {
    it('should return all payouts for admin with filters', async () => {
      const filters = { status: 'completed', vendorId: 2 };

      const mockPayouts = [
        { id: 1, payout_number: 'PAYOUT-001', status: 'completed' }
      ];

      db.query.mockResolvedValue({ rows: mockPayouts });

      const result = await service.getAllPayouts(filters);

      expect(result).toEqual(mockPayouts);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT vp.*, v.name as vendor_name'),
        ['completed', 2, 50, 0]
      );
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

      db.query.mockResolvedValue({ rows: [mockPayout] });

      const result = await service.updatePayoutMethod(payoutId, payoutMethod, payoutDetails);

      expect(result).toEqual(mockPayout);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE vendor_payouts SET payout_method'),
        [payoutId, payoutMethod, JSON.stringify(payoutDetails)]
      );
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

      db.query.mockResolvedValue({ rows: [mockStats] });

      const result = await service.getPayoutStats(vendorId);

      expect(result).toEqual(mockStats);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as total_payouts'),
        [vendorId]
      );
    });
  });

  describe('processPendingPayouts', () => {
    it('should process pending payouts in batch', async () => {
      const pendingPayouts = [
        { id: 1, payout_number: 'PAYOUT-001', payout_method: 'bank_transfer' },
        { id: 2, payout_number: 'PAYOUT-002', payout_method: 'bank_transfer' }
      ];

      // Mock getting pending payouts
      db.query
        .mockResolvedValueOnce({ rows: pendingPayouts }) // First call gets pending payouts
        .mockResolvedValue({ rows: [{ id: 1 }] }); // Subsequent calls for processing

      const result = await service.processPendingPayouts(10);

      expect(result).toHaveLength(2);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM vendor_payouts WHERE status = \'pending\''),
        [10]
      );
    });

    it('should handle payout processing failures gracefully', async () => {
      const pendingPayouts = [
        { id: 1, payout_number: 'PAYOUT-001', payout_method: 'bank_transfer' }
      ];

      // Mock getting pending payouts
      db.query
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
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // PAYOUT-20241201-0000 exists
        .mockResolvedValueOnce({ rows: [] }); // PAYOUT-20241201-0001 doesn't exist

      const result = await service.generatePayoutNumber();

      expect(result).toBe('PAYOUT-20241201-0001');

      global.Date.mockRestore();
    });
  });
});
