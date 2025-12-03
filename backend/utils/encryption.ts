import crypto from 'crypto';
import type { EncryptedData } from '../types/security';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || '';

// Validate encryption key on module load
if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted data object with IV, encrypted data, and auth tag
 */
export const encrypt = (text: string): EncryptedData => {
    if (!text) {
        throw new Error('Cannot encrypt empty text');
    }

    // Generate random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    // Encrypt data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag: authTag.toString('hex')
    };
};

/**
 * Decrypt data encrypted with AES-256-GCM
 * @param encryptedObj - Encrypted data object
 * @returns Decrypted plain text
 */
export const decrypt = (encryptedObj: EncryptedData): string => {
    if (!encryptedObj || !encryptedObj.iv || !encryptedObj.encryptedData || !encryptedObj.authTag) {
        throw new Error('Invalid encrypted data object');
    }

    try {
        // Create decipher
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            ENCRYPTION_KEY,
            Buffer.from(encryptedObj.iv, 'hex')
        );

        // Set authentication tag
        decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));

        // Decrypt data
        let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error('Decryption failed - data may be corrupted or tampered with');
    }
};

/**
 * Encrypt data and return as JSON string (for database storage)
 */
export const encryptToJSON = (text: string): string => {
    const encrypted = encrypt(text);
    return JSON.stringify(encrypted);
};

/**
 * Decrypt data from JSON string (from database)
 */
export const decryptFromJSON = (jsonString: string): string => {
    try {
        const encrypted = JSON.parse(jsonString) as EncryptedData;
        return decrypt(encrypted);
    } catch (error) {
        throw new Error('Invalid encrypted JSON data');
    }
};

/**
 * Hash data using SHA-256 (one-way, for verification)
 */
export const hash = (text: string): string => {
    return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Generate cryptographically secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

export default {
    encrypt,
    decrypt,
    encryptToJSON,
    decryptFromJSON,
    hash,
    generateSecureToken
};
