const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const config = {
  azure: {
    tenantId: process.env.TENANT_ID,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    userId: process.env.USER_ID,
  },
  server: {
    port: process.env.PORT || 3001,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:4200",
  },
  graph: {
    tokenUrl: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    baseUrl: "https://graph.microsoft.com/v1.0",
    scope: "https://graph.microsoft.com/.default",
  },
};

const requiredVars = [
  "TENANT_ID",
  "CLIENT_ID",
  "CLIENT_SECRET",
  "USER_ID",
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

module.exports = config;
