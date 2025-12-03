// TypeScript type definitions for security utilities

export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
    roles: string[];
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface EncryptedData {
    iv: string;
    encryptedData: string;
    authTag: string;
}

export interface AuditLogEntry {
    userId?: string;
    action: string;
    resource: string;
    details: Record<string, any>;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
}

export interface SecurityConfig {
    jwtSecret: string;
    jwtRefreshSecret: string;
    encryptionKey: Buffer;
    tokenExpiry: string;
    refreshTokenExpiry: string;
    bcryptRounds: number;
}

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

export interface CorsConfig {
    allowedOrigins: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
}
