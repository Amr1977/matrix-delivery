const ReactScripts = require("react-scripts");

// Override TypeScript compilation
const originalFork = ReactScripts.fork;

// Skip type checking by patching
process.env.SKIP_TS_CHECK = "true";

console.log("Starting build with TS check disabled...");
