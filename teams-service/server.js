const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const teamsRoutes = require("./routes/teams");

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use("/api/teams", teamsRoutes);

// --- Health check ---
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// --- Start server ---
app.listen(config.server.port, () => {
  console.log(`Teams meeting service running on port ${config.server.port}`);
});

module.exports = app;
