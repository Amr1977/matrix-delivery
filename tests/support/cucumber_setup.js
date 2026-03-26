/**
 * Cucumber test environment setup
 */

const dotenv = require("dotenv");
const path = require("path");

// Load test environment first
const testEnvPath = path.resolve(__dirname, "../../backend/.env.testing");
const result = dotenv.config({ path: testEnvPath });

if (result.error) {
  console.warn("Could not load .env.testing:", result.error);
}

// Also load root .env for any additional settings
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Set test mode
process.env.NODE_ENV = "testing";
process.env.TEST_MODE = "api";
