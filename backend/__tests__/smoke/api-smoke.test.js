/**
 * CI smoke tests for key API endpoints
 * - CSRF token route should respond with 200 and {disabled:true} in testing
 * - Register should validate input and return 400 on empty body (no 500)
 */

process.env.NODE_ENV = 'testing';

const request = require('supertest');
// Mock security middleware to avoid hard exits in tests
const path = require('path');
const securityPath = path.resolve(__dirname, '../../middleware/security');
jest.doMock(securityPath, () => ({
  helmetConfig: (req,res,next)=>next(),
  additionalSecurityHeaders: (req,res,next)=>next(),
  sanitizeRequest: (req,res,next)=>next(),
  validateSecurityConfig: () => {},
}), { virtual: true });
const app = require('../../server');

describe('API smoke', () => {
  test('GET /api/csrf-token returns 200 and disabled in testing', async () => {
    const res = await request(app).get('/api/csrf-token').expect(200);
    expect(res.body).toHaveProperty('disabled', true);
    expect(res.body).toHaveProperty('csrfToken', null);
  });

  test('POST /api/auth/register returns 400 on missing fields, not 500', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({})
      .set('Content-Type', 'application/json')
      .expect((r) => {
        if (r.status === 500) {
          throw new Error('Expected validation 4xx, got 500');
        }
      });
    expect([400, 422]).toContain(res.status);
  });
});

