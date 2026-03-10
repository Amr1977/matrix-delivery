'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { 'default': mod };
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.generateSecureToken = exports.hash = exports.decryptFromJSON = exports.encryptToJSON = exports.decrypt = exports.encrypt = void 0;
const crypto_1 = __importDefault(require('crypto'));
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
const encrypt = (text) => {
    if (!text) {
        throw new Error('Cannot encrypt empty text');
    }
    // Generate random initialization vector
    const iv = crypto_1.default.randomBytes(16);
    // Create cipher
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
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
exports.encrypt = encrypt;
/**
 * Decrypt data encrypted with AES-256-GCM
 * @param encryptedObj - Encrypted data object
 * @returns Decrypted plain text
 */
const decrypt = (encryptedObj) => {
    if (!encryptedObj || !encryptedObj.iv || !encryptedObj.encryptedData || !encryptedObj.authTag) {
        throw new Error('Invalid encrypted data object');
    }
    try {
        // Create decipher
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(encryptedObj.iv, 'hex'));
        // Set authentication tag
        decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
        // Decrypt data
        let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        throw new Error('Decryption failed - data may be corrupted or tampered with');
    }
};
exports.decrypt = decrypt;
/**
 * Encrypt data and return as JSON string (for database storage)
 */
const encryptToJSON = (text) => {
    const encrypted = (0, exports.encrypt)(text);
    return JSON.stringify(encrypted);
};
exports.encryptToJSON = encryptToJSON;
/**
 * Decrypt data from JSON string (from database)
 */
const decryptFromJSON = (jsonString) => {
    try {
        const encrypted = JSON.parse(jsonString);
        return (0, exports.decrypt)(encrypted);
    }
    catch (error) {
        throw new Error('Invalid encrypted JSON data');
    }
};
exports.decryptFromJSON = decryptFromJSON;
/**
 * Hash data using SHA-256 (one-way, for verification)
 */
const hash = (text) => {
    return crypto_1.default.createHash('sha256').update(text).digest('hex');
};
exports.hash = hash;
/**
 * Generate cryptographically secure random token
 */
const generateSecureToken = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateSecureToken = generateSecureToken;
exports.default = {
    encrypt: exports.encrypt,
    decrypt: exports.decrypt,
    encryptToJSON: exports.encryptToJSON,
    decryptFromJSON: exports.decryptFromJSON,
    hash: exports.hash,
    generateSecureToken: exports.generateSecureToken
};
