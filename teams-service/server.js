const express = require("express");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");
const config = require("./config/env");
const teamsRoutes = require("./routes/teams");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

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

// --- Affinda Resume Parser Proxy ---
app.post("/api/affinda/parse-resume", upload.single("file"), async (req, res) => {
  const apiKey = process.env.AFFINDA_API_KEY;
  const workspace = process.env.AFFINDA_WORKSPACE || "GzdypdKa";
  const documentType = process.env.AFFINDA_DOCUMENT_TYPE || "IuismUKk";

  if (!apiKey) {
    return res.status(500).json({ error: "Missing AFFINDA_API_KEY environment variable." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Resume file is required." });
  }

  try {
    const form = new FormData();
    form.append("workspace", workspace);
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype || "application/octet-stream"
    });

    if (documentType) {
      form.append("documentType", documentType);
    }

    const response = await axios.post("https://api.affinda.com/v3/documents", form, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
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
