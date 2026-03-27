const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const backendDir = path.resolve(__dirname, "..");
const LOAD_GUARD_KEY = "__MATRIX_ENV_LOADED";

function resolveEnvFile() {
  if (process.env.ENV_FILE) {
    return process.env.ENV_FILE;
  }

  const nodeEnv = process.env.NODE_ENV || "production";
  if (nodeEnv === "test" || nodeEnv === "testing") return ".env.testing";
  if (nodeEnv === "production") return ".env.production";
  if (nodeEnv === "staging") return ".env.staging";
  if (nodeEnv === "development") return ".env.development";
  return ".env";
}

function loadEnvironment(options = {}) {
  const { silent = false } = options;

  if (process.env[LOAD_GUARD_KEY] === "true") {
    return;
  }

  const envFileToLoad = resolveEnvFile();
  const envPath = path.resolve(backendDir, envFileToLoad);
  const fallbackPath = path.resolve(backendDir, ".env");

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    if (!silent) {
      console.log(`📄 Loaded environment from: ${envPath}`);
    }
  } else if (!silent) {
    console.log(`⚠️ ${envFileToLoad} not found, trying fallback .env`);
  }

  if (fs.existsSync(fallbackPath) && envPath !== fallbackPath) {
    const result = dotenv.config({ path: fallbackPath });
    if (result.parsed) {
      for (const [key, value] of Object.entries(result.parsed)) {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }

  process.env[LOAD_GUARD_KEY] = "true";
}

module.exports = {
  loadEnvironment,
};

