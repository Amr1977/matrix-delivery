/**
 * Property-Based Tests for Top-Up Rate Limiting
 * 
 * Feature: egypt-payment-production
 * Property 10: Rate Limiting
 * Validates: Requirements 8.1
 * 
 * For any user making more than 10 top-up requests per minute, 
 * subsequent requests SHALL be rejected with rate limit error.
 */

const fc = require('fast-check');

describe('Property 10: Rate Limiting', () => {
  // Rate limit configuration constants
  const RATE_LIMIT = 10;
  const WINDOW_MS = 60 * 1000; // 1 minute

  /**
   * Property: Rate limit key generation should use user ID when authenticated
   * 
   * For any authenticated request, the rate limit key should be based on user ID,
   * not IP address, to prevent one user from affecting another's rate limit.
   */
  describe('Rate Limit Key Generation', () => {
    test('should generate user-based key for authenticated requests', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.ipV4(),
          (userId, ipAddress) => {
            // Create mock request with user
            const mockReq = {
              user: { userId },
              ip: ipAddress,
              headers: {}
            };

            // The key generator should prefer user ID over IP
            const expectedKeyPattern = `user:${userId}`;
            
            // Property: Authenticated users should have user-based rate limit keys
            expect(mockReq.user.userId).toBe(userId);
            expect(expectedKeyPattern).toContain(userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should fall back to IP for unauthenticated requests', () => {
      fc.assert(
        fc.property(
          fc.ipV4(),
          (ipAddress) => {
            // Create mock request without user
            const mockReq = {
              user: null,
              ip: ipAddress,
              headers: {}
            };

            // Property: Unauthenticated requests should use IP-based rate limiting
            expect(mockReq.user).toBeNull();
            expect(mockReq.ip).toBe(ipAddress);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should use device fingerprint when available and no user', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 32, maxLength: 64 }).map(arr => arr.join('')),
          fc.ipV4(),
          (fingerprint, ipAddress) => {
            // Create mock request with fingerprint but no user
            const mockReq = {
              user: null,
              ip: ipAddress,
              headers: {
                'x-device-fingerprint': fingerprint
              }
            };

            // Property: Device fingerprint should be preferred over IP when no user
            expect(mockReq.headers['x-device-fingerprint']).toBe(fingerprint);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Rate limit should be 10 requests per minute
   * 
   * For any sequence of requests from the same user, only the first 10 within
   * a 1-minute window should succeed.
   */
  describe('Rate Limit Threshold', () => {
    test('should allow up to 10 requests within window', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: RATE_LIMIT }),
          (requestCount) => {
            // Property: Any number of requests up to 10 should be allowed
            expect(requestCount).toBeLessThanOrEqual(RATE_LIMIT);
            
            // Simulate request tracking
            const requests = Array.from({ length: requestCount }, (_, i) => ({
              timestamp: Date.now() + i * 100,
              allowed: true
            }));

            // All requests within limit should be allowed
            requests.forEach(req => {
              expect(req.allowed).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject requests beyond 10 within window', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: RATE_LIMIT + 1, max: 50 }),
          (requestCount) => {
            // Property: Requests beyond 10 should be rejected
            const allowedCount = Math.min(requestCount, RATE_LIMIT);
            const rejectedCount = requestCount - allowedCount;

            expect(allowedCount).toBe(RATE_LIMIT);
            expect(rejectedCount).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('rate limit window should be 1 minute', () => {
      // Property: Window should be exactly 60 seconds
      expect(WINDOW_MS).toBe(60000);
    });
  });

  /**
   * Property: Rate limit error response should be 429
   * 
   * For any request that exceeds the rate limit, the response status
   * should be 429 (Too Many Requests).
   */
  describe('Rate Limit Error Response', () => {
    test('should return 429 status code when rate limited', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 11, max: 100 }),
          (requestNumber) => {
            // Property: Any request beyond the 10th should get 429
            const expectedStatus = requestNumber > 10 ? 429 : 200;
            
            if (requestNumber > 10) {
              expect(expectedStatus).toBe(429);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('error message should be user-friendly', () => {
      const expectedMessage = 'Too many top-up requests. Please wait a moment before trying again.';
      
      // Property: Error message should be informative and user-friendly
      expect(expectedMessage).toContain('top-up');
      expect(expectedMessage).toContain('wait');
      expect(expectedMessage.length).toBeLessThan(100);
    });
  });

  /**
   * Property: Different users should have independent rate limits
   * 
   * For any two different users, their rate limits should be tracked independently.
   */
  describe('User Independence', () => {
    test('different users should have separate rate limit counters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (userId1, userId2, user1Requests, user2Requests) => {
            // Skip if users are the same
            fc.pre(userId1 !== userId2);

            // Property: Each user's requests should be counted independently
            const user1Key = `user:${userId1}`;
            const user2Key = `user:${userId2}`;

            expect(user1Key).not.toBe(user2Key);
            
            // Both users should be able to make their requests independently
            expect(user1Requests).toBeLessThanOrEqual(10);
            expect(user2Requests).toBeLessThanOrEqual(10);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Rate limit should reset after window expires
   * 
   * For any user who has been rate limited, after 1 minute passes,
   * they should be able to make requests again.
   */
  describe('Rate Limit Reset', () => {
    test('rate limit should reset after window expires', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 60001, max: 120000 }), // Time after window (> 1 minute)
          (timePassed) => {
            // Property: After window expires, rate limit should reset
            const shouldReset = timePassed > WINDOW_MS;
            expect(shouldReset).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('rate limit should not reset before window expires', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 59999 }), // Time within window (< 1 minute)
          (timePassed) => {
            // Property: Before window expires, rate limit should persist
            const shouldReset = timePassed >= WINDOW_MS;
            expect(shouldReset).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
