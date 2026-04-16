const fs = require("fs");
const file = "d:\\matrix-delivery\\backend\\controllers\\marketplaceOrderController.js";
let content = fs.readFileSync(file, "utf8");

const helper = `
/**
 * Helper to map FSM and validation errors to standard HTTP responses
 */
const mapErrorToResponse = (error, res) => {
  const msg = error.message || "";
  let statusCode = 400;

  if (msg.includes("not found") || msg.includes("No order found")) {
    statusCode = 404;
  } else if (msg.includes("Access denied") || msg.includes("unauthorized") || msg.includes("Only") || msg.includes("vendor account")) {
    statusCode = 403;
  } else if (msg.includes("concurrency") || msg.includes("deadlock") || msg.includes("conflict")) {
    statusCode = 409;
  } else if (msg.includes("Invalid transition") || msg.includes("Cannot transition") || msg.includes("Guard failed")) {
    statusCode = 400;
  }

  return res.status(statusCode).json({
    success: false,
    error: msg
  });
};
`;

content = content.replace(/(const getVendorIdFromUser = [\s\S]*?};\n)/, "$1\n" + helper + "\n");

content = content.replace(/const statusCode = [\s\S]*?res\.status\(statusCode\)\.json\(\{[\s\S]*?\}\);/g, "return mapErrorToResponse(error, res);");

fs.writeFileSync(file, content);
console.log("Done!");

