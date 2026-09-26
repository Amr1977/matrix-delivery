const storeService = require('../../modules/marketplace/services/storeService');
const pool = require('../../config/db');
const storeRepository = require('../../modules/marketplace/repositories/storeRepository');

jest.mock('../../config/db', () => ({
  query: jest.fn()
}));

jest.mock('../../modules/marketplace/repositories/storeRepository', () => ({
  getActiveStores: jest.fn(),
  createStore: jest.fn(),
  getStoreById: jest.fn(),
  updateStore: jest.fn(),
  deactivateStore: jest.fn(),
  getStoresByVendor: jest.fn()
}));

describe('StoreService geospatial search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses PostGIS results when available and filters by radius', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { id: 1, name: 'Near Store', latitude: 30.0444, longitude: 31.2357, distance_m: 500 },
        { id: 2, name: 'Far Store', latitude: 30.9000, longitude: 31.2000, distance_m: 20000 }
      ]
    });

    const result = await storeService.searchNearbyStores(30.0444, 31.2357, 2, 20);

    expect(pool.query).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
  });

  it('falls back to geolib when PostGIS is unavailable', async () => {
    pool.query.mockRejectedValue(new Error('PostGIS missing'));
    storeRepository.getActiveStores.mockResolvedValue([
      { id: 1, name: 'Near Store', latitude: 30.0444, longitude: 31.2357, status: true },
      { id: 2, name: 'Far Store', latitude: 30.9000, longitude: 31.2000, status: true }
    ]);

    const result = await storeService.searchNearbyStores(30.0444, 31.2357, 2, 20);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });
});