const express = require("express");
const { createTeamsMeeting } = require("../services/graphService");

const router = express.Router();

/**
 * POST /api/teams/meeting
 *
 * Creates a Microsoft Teams meeting.
 *
 * Request body:
 * {
 *   "subject": "string",
 *   "startTime": "ISO datetime",
 *   "endTime": "ISO datetime",
 *   "attendees": ["email1", "email2"]
 * }
 *
 * Response:
 * {
 *   "joinUrl": "https://teams.microsoft.com/...",
 *   "eventId": "...",
 *   "status": "created"
 * }
 */
router.post("/meeting", async (req, res) => {
  try {
    const { subject, startTime, endTime, attendees } = req.body;

    // --- Validation ---
    if (!subject || typeof subject !== "string") {
      return res.status(400).json({ error: "subject is required and must be a string" });
    }
    if (!startTime || isNaN(Date.parse(startTime))) {
      return res.status(400).json({ error: "startTime must be a valid ISO datetime" });
    }
    if (!endTime || isNaN(Date.parse(endTime))) {
      return res.status(400).json({ error: "endTime must be a valid ISO datetime" });
    }
    if (!Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ error: "attendees must be a non-empty array of emails" });
    }

    // --- Create meeting ---
    const { joinUrl, eventId } = await createTeamsMeeting({
      subject,
      startTime,
      endTime,
      attendees,
    });

    res.status(201).json({
      joinUrl,
      eventId,
      status: "created",
    });
  } catch (error) {
    console.error("[TeamsRoute] Meeting creation failed:", error.message);
    res.status(500).json({
      error: "Failed to create Teams meeting",
      detail: error.message,
    });
  }
});

module.exports = router;
