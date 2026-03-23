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

// --- ApyHub Proxy ---
app.get("/api/apyhub/status/:jobId", async (req, res) => {
  const axios = require('axios');
  const jobId = req.params.jobId;
  const apyToken = process.env.APYHUB_API_KEY;
  const url = `https://api.apyhub.com/sharpapi/api/v1/hr/parse_resume/job/status/${jobId}`;
  
  try {
    const response = await axios.get(url, {
      headers: { "apy-token": apyToken }
    });
    res.json(response.data);
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// --- Start server ---
app.listen(config.server.port, () => {
  console.log(`Teams meeting service running on port ${config.server.port}`);
});

module.exports = app;

// trigger restart!
