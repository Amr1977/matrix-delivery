import jwt from 'jsonwebtoken';
import type { TokenPayload, TokenPair } from '../types/security';

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
export const generateTokens = (user: { id: string; email: string; primary_role: string; granted_roles?: string[] }): TokenPair => {
    const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        primary_role: user.primary_role,
        granted_roles: user.granted_roles || [user.primary_role]
    };

    const accessToken = jwt.sign(payload, JWT_SECRET!, {
        expiresIn: TOKEN_EXPIRY,
        algorithm: 'HS256',
        issuer: 'matrix-delivery',
        audience: 'matrix-delivery-api'
    });

    const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        JWT_REFRESH_SECRET!,
        {
            expiresIn: REFRESH_TOKEN_EXPIRY,
            algorithm: 'HS256',
            issuer: 'matrix-delivery',
            audience: 'matrix-delivery-api'
        }
    );

    return { accessToken, refreshToken };
};

/**
 * Verify and decode an access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET!, {
            algorithms: ['HS256'],
            issuer: 'matrix-delivery',
            audience: 'matrix-delivery-api'
        }) as TokenPayload;

        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid token');
        }
        throw error;
    }
};

/**
 * Verify and decode a refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string; type: string } => {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET!, {
            algorithms: ['HS256'],
            issuer: 'matrix-delivery',
            audience: 'matrix-delivery-api'
        }) as { userId: string; type: string };

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Refresh token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): any => {
    return jwt.decode(token);
};

export default {
    generateTokens,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken
};
