const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../routes/browse', () => {
  const express = require('express');
  return express.Router();
});

const app = require('../app');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
let token;

beforeEach(() => {
  jest.spyOn(pool, 'query').mockImplementation((query) => {
    const normalizedQuery = query.toUpperCase();

    if (normalizedQuery.includes('COUNT(*)')) {
      return Promise.resolve({ rows: [{ count: '0' }] });
    }

    if (normalizedQuery.includes('SUM(DRIVER_EARNINGS)')) {
      return Promise.resolve({ rows: [{ total: null }] });
    }

    if (normalizedQuery.includes('SUM(')) {
      return Promise.resolve({ rows: [{ total: '0' }] });
    }

    return Promise.resolve({ rows: [] });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

beforeAll(() => {
  token = jwt.sign(
    {
      userId: 'test-driver-1',
      email: 'driver@example.com',
      name: 'Test Driver',
      primary_role: 'driver',
      granted_roles: ['driver']
    },
    JWT_SECRET,
    {
      expiresIn: '1h',
      audience: 'matrix-delivery-api',
      issuer: 'matrix-delivery'
    }
  );
});

describe('GET /api/drivers/earnings/stats', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/drivers/earnings/stats');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'No token provided');
  });

  it('returns earnings stats for an authenticated driver', async () => {
    const res = await request(app)
      .get('/api/drivers/earnings/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('today');
    expect(res.body).toHaveProperty('week');
    expect(res.body).toHaveProperty('month');
    expect(res.body).toHaveProperty('chartData');
    expect(Array.isArray(res.body.chartData)).toBe(true);
  });
});

describe('GET /api/drivers/earnings/history', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/drivers/earnings/history?page=1&limit=10');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'No token provided');
  });

  it('returns earnings history for an authenticated driver', async () => {
    const res = await request(app)
      .get('/api/drivers/earnings/history?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('totalPages');
  });
});
