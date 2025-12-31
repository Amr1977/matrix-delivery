import FingerprintJS, { Agent } from '@fingerprintjs/fingerprintjs';

let fpPromise: Promise<Agent> | null = null;

/**
 * Initializes the FingerprintJS agent
 */
const loadFingerprint = (): Promise<Agent> => {
    if (!fpPromise) {
        fpPromise = FingerprintJS.load();
    }
    return fpPromise;
};

/**
 * Retrieves the visitor identifier
 * @returns {Promise<string | null>} The unique visitor ID
 */
export const getDeviceFingerprint = async (): Promise<string | null> => {
    try {
        const fp = await loadFingerprint();
        const result = await fp.get();
        return result.visitorId;
    } catch (error) {
        console.warn('Failed to generate device fingerprint:', error);
        return null;
    }
};
