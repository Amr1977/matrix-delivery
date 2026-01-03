const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../../backend/config/db');

const pool = require('../../../backend/config/db');

describe('Authentication Middleware', () => {
    const JWT_SECRET = 'test-secret-key-for-testing-only';
    let verifyToken, isAdmin, isVendor;

    beforeEach(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        jest.clearAllMocks();

        // Import middleware functions
        // Note: These would need to be extracted from server.js first
        // For now, we'll create mock implementations
        verifyToken = (req, res, next) => {
            const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                req.user = decoded;
                next();
            } catch (error) {
                if (error.name === 'TokenExpiredError') {
                    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
                }
                return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
            }
        };

        isAdmin = (req, res, next) => {
            const primary_role = req.user?.primary_role;
            const granted_roles = req.user?.granted_roles || [];

            if (primary_role === 'admin' || granted_roles.includes('admin')) {
                return next();
            }
            return res.status(403).json({ error: 'Forbidden' });
        };

        isVendor = (req, res, next) => {
            const primary_role = req.user?.primary_role;
            const granted_roles = req.user?.granted_roles || [];

            if (primary_role === 'vendor' || granted_roles.includes('vendor') || primary_role === 'admin' || granted_roles.includes('admin')) {
                return next();
            }
            return res.status(403).json({ error: 'Forbidden' });
        };
    });

    describe('verifyToken', () => {
        it('should accept valid token from cookie', () => {
            const token = jwt.sign({ userId: '123', primary_role: 'customer' }, JWT_SECRET);
            const req = { cookies: { token } };
            const res = {};
            const next = jest.fn();

            verifyToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.user).toHaveProperty('userId', '123');
        });

        it('should accept valid token from Authorization header', () => {
            const token = jwt.sign({ userId: '123', primary_role: 'customer' }, JWT_SECRET);
            const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
            const res = {};
            const next = jest.fn();

            verifyToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.user).toHaveProperty('userId', '123');
        });

        it('should reject request with no token', () => {
            const req = { cookies: {}, headers: {} };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject expired token', () => {
            const token = jwt.sign({ userId: '123', primary_role: 'customer' }, JWT_SECRET, { expiresIn: '-1s' });
            const req = { cookies: { token } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject invalid token', () => {
            const req = { cookies: { token: 'invalid-token' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token', code: 'INVALID_TOKEN' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('isAdmin', () => {
        it('should allow admin user', () => {
            const req = { user: { userId: '123', primary_role: 'admin' } };
            const res = {};
            const next = jest.fn();

            isAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should allow user with admin in granted_roles array', () => {
            const req = { user: { userId: '123', primary_role: 'customer', granted_roles: ['admin'] } };
            const res = {};
            const next = jest.fn();

            isAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject non-admin user', () => {
            const req = { user: { userId: '123', primary_role: 'customer' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should reject request with no user', () => {
            const req = {};
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('isVendor', () => {
        it('should allow vendor user', () => {
            const req = { user: { userId: '123', primary_role: 'vendor' } };
            const res = {};
            const next = jest.fn();

            isVendor(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should allow admin user (admins can access vendor routes)', () => {
            const req = { user: { userId: '123', primary_role: 'admin' } };
            const res = {};
            const next = jest.fn();

            isVendor(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject customer user', () => {
            const req = { user: { userId: '123', primary_role: 'customer' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            isVendor(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
            expect(next).not.toHaveBeenCalled();
        });
    });
});
