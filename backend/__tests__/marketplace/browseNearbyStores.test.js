const express = require('express');
const request = require('supertest');

jest.mock('../../config/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));

jest.mock('../../middleware/auth', () => ({
  verifyToken: (req, res, next) => next()
}));

jest.mock('../../modules/marketplace/services/storeService', () => ({
  searchNearbyStores: jest.fn()
}));

const storeService = require('../../modules/marketplace/services/storeService');
const app = express();
app.use('/api/browse', require('../../routes/browse'));

describe('GET /api/browse/vendors-near', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns nearby marketplace stores using the requested page', async () => {
    const stores = [
      { id: 'store-1', name: 'Nearby Store', latitude: 30.0444, longitude: 31.2357, distance_m: 500 }
    ];
    storeService.searchNearbyStores.mockResolvedValue(stores);

    const response = await request(app)
      .get('/api/browse/vendors-near')
      .query({ lat: '30.0444', lng: '31.2357', radius_km: '3', page: '2', limit: '5' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ page: 2, limit: 5, count: 1, items: stores });
    expect(storeService.searchNearbyStores).toHaveBeenCalledWith(30.0444, 31.2357, 3, 5, 5);
  });

  it('rejects missing coordinates without searching stores', async () => {
    const response = await request(app)
      .get('/api/browse/vendors-near')
      .query({ lat: '30.0444' });

    expect(response.status).toBe(400);
    expect(storeService.searchNearbyStores).not.toHaveBeenCalled();
  });

  it('rejects out-of-range coordinates without searching stores', async () => {
    const response = await request(app)
      .get('/api/browse/vendors-near')
      .query({ lat: '91', lng: '31.2357' });

    expect(response.status).toBe(400);
    expect(storeService.searchNearbyStores).not.toHaveBeenCalled();
  });
});
