const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let serviceAccount = {};

const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credsPath && fs.existsSync(credsPath)) {
  try {
    const credsContent = fs.readFileSync(
      path.isAbsolute(credsPath)
        ? credsPath
        : path.resolve(__dirname, "..", credsPath),
      "utf8",
    );
    serviceAccount = JSON.parse(credsContent);
    console.log("✅ Loaded Firebase credentials from:", credsPath);
  } catch (error) {
    console.error(
      "❌ Failed to load GOOGLE_APPLICATION_CREDENTIALS:",
      error.message,
    );
  }
} else {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}";
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    console.error(
      "❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:",
      error.message,
    );
  }
}

// Only initialize if we have a project_id (don't fail in tests if not configured)
if (serviceAccount && serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized successfully");
} else {
  // In test environment or when not configured, we might not want to fail
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "⚠️ FIREBASE_SERVICE_ACCOUNT_JSON not configured - push notifications will not work",
    );
  }

  // Provide a mock messaging service if not initialized to prevent crashes
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: {
        getAccessToken: () =>
          Promise.resolve({
            access_token: "mock-token",
            expires_in: 3600,
          }),
      },
      projectId: "mock-project",
    });
  }
}

module.exports = admin;
