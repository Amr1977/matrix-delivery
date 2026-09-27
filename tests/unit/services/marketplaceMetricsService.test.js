const MarketplaceMetricsService = require('../../../backend/modules/marketplace/services/marketplaceMetricsService');

jest.mock('../../../backend/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

const pool = require('../../../backend/config/db');

describe('MarketplaceMetricsService', () => {
  let service;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MarketplaceMetricsService();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    pool.connect = jest.fn().mockResolvedValue(mockClient);
  });

  describe('collectMetrics', () => {
    it('should collect and persist all KPI metrics', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              total_orders: 100,
              orders_pending_bids: 10,
              orders_vendor_confirmed: 20,
              orders_assigned: 5,
              orders_delivered: 60,
              orders_cancelled: 5,
            },
          ],
        }) // order stats
        .mockResolvedValueOnce({
          rows: [
            {
              order_volume_egp: '15000.00',
              commission_collected_egp: '1500.00',
              payouts_pending_egp: '13500.00',
            },
          ],
        }) // financial
        .mockResolvedValueOnce({
          rows: [
            {
              active_vendors: 25,
              avg_vendor_rating: '4.5',
            },
          ],
        }) // vendor performance
        .mockResolvedValueOnce({
          rows: [
            {
              avg_preparation_time_minutes: '30',
              avg_delivery_time_minutes: '45',
            },
          ],
        }) // timing
        .mockResolvedValueOnce({
          rows: [
            {
              order_creation_failures: 2,
              inventory_conflicts: 0,
            },
          ],
        }) // errors
        .mockResolvedValueOnce() // INSERT metrics
        .mockResolvedValueOnce(); // COMMIT

      const result = await service.collectMetrics('hourly');

      expect(result).toMatchObject({
        metricType: 'hourly',
        totalOrders: 100,
        ordersPendingBids: 10,
        ordersVendorConfirmed: 20,
        ordersAssigned: 5,
        ordersDelivered: 60,
        ordersCancelled: 5,
        activeVendors: 25,
        avgVendorRating: 4.5,
        orderVolumeEgp: 15000,
        commissionCollectedEgp: 1500,
        payoutsPendingEgp: 13500,
        avgPreparationTimeMinutes: 30,
        avgDeliveryTimeMinutes: 45,
        orderCreationFailures: 2,
        inventoryConflicts: 0,
      });

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(pool.connect).toHaveBeenCalled();
    });

    it('should rollback and rethrow on query error', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // order stats fails

      await expect(service.collectMetrics('hourly')).rejects.toThrow(
        'DB error',
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should default to 0 when no data exists', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [
            {
              total_orders: 0,
              orders_pending_bids: 0,
              orders_vendor_confirmed: 0,
              orders_assigned: 0,
              orders_delivered: 0,
              orders_cancelled: 0,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              order_volume_egp: null,
              commission_collected_egp: null,
              payouts_pending_egp: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              active_vendors: 0,
              avg_vendor_rating: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              avg_preparation_time_minutes: null,
              avg_delivery_time_minutes: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              order_creation_failures: 0,
              inventory_conflicts: 0,
            },
          ],
        })
        .mockResolvedValueOnce() // INSERT
        .mockResolvedValueOnce(); // COMMIT

      const result = await service.collectMetrics('hourly');

      expect(result.orderVolumeEgp).toBe(0);
      expect(result.avgVendorRating).toBe(0);
      expect(result.avgPreparationTimeMinutes).toBe(0);
    });
  });

  describe('getLatestMetrics', () => {
    it('should return latest metrics row', async () => {
      const mockRow = {
        id: 1,
        metric_type: 'hourly',
        total_orders: 100,
        timestamp: new Date(),
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await service.getLatestMetrics();

      expect(result).toEqual(mockRow);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM marketplace_metrics ORDER BY timestamp DESC LIMIT 1',
      );
    });

    it('should return null when no metrics exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getLatestMetrics();

      expect(result).toBeNull();
    });
  });

  describe('getMetricsHistory', () => {
    it('should return capped hours (max 168)', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, timestamp: new Date() }],
      });

      await service.getMetricsHistory(200);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('168 hours'),
        expect.any(Array),
      );
    });

    it('should filter by metric type when provided', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1, metric_type: 'hourly' }],
      });

      await service.getMetricsHistory(24, 'hourly');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('metric_type = $1'),
        ['hourly', 1440],
      );
    });

    it('should not filter by type when null', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      await service.getMetricsHistory(24, null);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY timestamp ASC'),
        expect.arrayContaining([]),
      );
    });
  });

  describe('getDashboardSummary', () => {
    it('should return metrics, pending payouts, and alerts', async () => {
      const mockMetrics = {
        id: 1,
        total_orders: 100,
        inventory_conflicts: 0,
        order_creation_failures: 0,
        orders_delivered: 80,
        orders_cancelled: 5,
      };

      const mockPayouts = {
        pending_payouts: 10,
        pending_payout_total_egp: '5000.00',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockMetrics] })
        .mockResolvedValueOnce({ rows: [mockPayouts] });

      const result = await service.getDashboardSummary();

      expect(result.latest).toEqual(mockMetrics);
      expect(result.pendingPayouts).toEqual({
        count: 10,
        totalEgp: 5000,
      });
      expect(result.alerts).toEqual([]);
    });

    it('should generate warning for inventory conflicts', async () => {
      const mockMetrics = {
        id: 1,
        total_orders: 100,
        inventory_conflicts: 5,
        order_creation_failures: 0,
        orders_delivered: 80,
        orders_cancelled: 2,
      };

      const mockPayouts = {
        pending_payouts: 10,
        pending_payout_total_egp: '5000.00',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockMetrics] })
        .mockResolvedValueOnce({ rows: [mockPayouts] });

      const result = await service.getDashboardSummary();

      expect(result.alerts).toContainEqual(
        expect.objectContaining({
          level: 'warning',
          metric: 'inventory_conflicts',
        }),
      );
    });

    it('should generate warning for high cancellation rate', async () => {
      const mockMetrics = {
        id: 1,
        total_orders: 100,
        inventory_conflicts: 0,
        order_creation_failures: 0,
        orders_delivered: 50,
        orders_cancelled: 10,
      };

      const mockPayouts = {
        pending_payouts: 10,
        pending_payout_total_egp: '5000.00',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockMetrics] })
        .mockResolvedValueOnce({ rows: [mockPayouts] });

      const result = await service.getDashboardSummary();

      const cancellationAlert = result.alerts.find(
        (a) => a.metric === 'cancellation_rate',
      );
      expect(cancellationAlert).toBeDefined();
      expect(cancellationAlert.level).toBe('warning');
    });

    it('should generate warning for high pending payouts', async () => {
      const mockMetrics = {
        id: 1,
        total_orders: 100,
        inventory_conflicts: 0,
        order_creation_failures: 0,
        orders_delivered: 80,
        orders_cancelled: 5,
      };

      const mockPayouts = {
        pending_payouts: 75,
        pending_payout_total_egp: '50000.00',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [mockMetrics] })
        .mockResolvedValueOnce({ rows: [mockPayouts] });

      const result = await service.getDashboardSummary();

      const payoutAlert = result.alerts.find(
        (a) => a.metric === 'pending_payouts',
      );
      expect(payoutAlert).toBeDefined();
    });
  });
});
