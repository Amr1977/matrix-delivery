'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { 'default': mod };
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.decodeToken = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokens = void 0;
const jsonwebtoken_1 = __importDefault(require('jsonwebtoken'));
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
// Validate JWT secrets on module load
if (!JWT_SECRET || JWT_SECRET.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters (32 bytes hex)');
}
if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 64) {
    throw new Error('JWT_REFRESH_SECRET must be at least 64 characters (32 bytes hex)');
}
/**
 * Generate access and refresh tokens for a user
 */
const generateTokens = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        roles: user.roles || [user.role]
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: TOKEN_EXPIRY,
        algorithm: 'HS256',
        issuer: 'matrix-delivery',
        audience: 'matrix-delivery-api'
    });
    const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, type: 'refresh' }, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        algorithm: 'HS256',
        issuer: 'matrix-delivery',
        audience: 'matrix-delivery-api'
    });
    return { accessToken, refreshToken };
};
exports.generateTokens = generateTokens;
/**
 * Verify and decode an access token
 */
const verifyAccessToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: 'matrix-delivery',
            audience: 'matrix-delivery-api'
        });
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error('Token expired');
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error('Invalid token');
        }
        throw error;
    }
};
exports.verifyAccessToken = verifyAccessToken;
/**
 * Verify and decode a refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET, {
            algorithms: ['HS256'],
            issuer: 'matrix-delivery',
            audience: 'matrix-delivery-api'
        });
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error('Refresh token expired');
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
/**
 * Decode token without verification (for debugging)
 */
const decodeToken = (token) => {
    return jsonwebtoken_1.default.decode(token);
};
exports.decodeToken = decodeToken;
exports.default = {
    generateTokens: exports.generateTokens,
    verifyAccessToken: exports.verifyAccessToken,
    verifyRefreshToken: exports.verifyRefreshToken,
    decodeToken: exports.decodeToken
};
