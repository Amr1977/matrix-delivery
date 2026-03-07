const admin = require('firebase-admin');

// Load service account from environment variable (never commit JSON to repo)
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}';
let serviceAccount = {};

try {
    serviceAccount = JSON.parse(serviceAccountJson);
} catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error.message);
}

// Only initialize if we have a project_id (don't fail in tests if not configured)
if (serviceAccount && serviceAccount.project_id) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized successfully');
} else {
    // In test environment or when not configured, we might not want to fail
    if (process.env.NODE_ENV !== 'test') {
        console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_JSON not configured - push notifications will not work');
    }
    
    // Provide a mock messaging service if not initialized to prevent crashes
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: {
                getAccessToken: () => Promise.resolve({
                    access_token: 'mock-token',
                    expires_in: 3600
                })
            },
            projectId: 'mock-project'
        });
    }
}

module.exports = admin;