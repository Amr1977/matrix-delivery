const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let serviceAccount = {};

const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
console.log("🔍 Firebase creds path from env:", credsPath);

if (credsPath) {
  const absolutePath = path.isAbsolute(credsPath)
    ? credsPath
    : path.resolve(__dirname, "..", credsPath);
  console.log("📁 Absolute creds path:", absolutePath);
  console.log("📁 File exists:", fs.existsSync(absolutePath));

  if (fs.existsSync(absolutePath)) {
    try {
      const credsContent = fs.readFileSync(absolutePath, "utf8");
      serviceAccount = JSON.parse(credsContent);
      console.log(
        "✅ Loaded Firebase credentials, project:",
        serviceAccount.project_id,
      );
    } catch (error) {
      console.error(
        "❌ Failed to load GOOGLE_APPLICATION_CREDENTIALS:",
        error.message,
      );
    }
  } else {
    console.log("⚠️ Credentials file not found, falling back to env var");
  }
}

// Fallback: Load from FIREBASE_SERVICE_ACCOUNT_JSON env var
if (!serviceAccount.project_id) {
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

// Only initialize if we have a project_id
if (serviceAccount && serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized successfully");
} else {
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "⚠️ Firebase credentials not configured - push notifications will not work",
    );
  }

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
