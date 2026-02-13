const admin = require('firebase-admin');

// Load service account from environment variable (never commit JSON to repo)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;