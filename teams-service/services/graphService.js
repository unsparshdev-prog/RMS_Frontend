const axios = require("axios");
const config = require("../config/env");

/**
 * Fetches an OAuth2 access token using the client credentials flow.
 * Caches the token in-memory until it expires.
 */
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }
  console.log("[GraphService] Acquiring new access token...");
  console.log("[GraphService] Client ID:", config.azure.clientId);
  console.log("[GraphService] Client Secret:", config.azure.clientSecret);
  console.log("[GraphService] Scope:", config.graph.scope);
  console.log("[GraphService] Grant Type:", "client_credentials");
  const params = new URLSearchParams();
  params.append("client_id", config.azure.clientId);
  params.append("client_secret", config.azure.clientSecret);
  params.append("scope", config.graph.scope);
  params.append("grant_type", "client_credentials");

  try {
    const response = await axios.post(config.graph.tokenUrl, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + response.data.expires_in * 1000;

    console.log("[GraphService] Access token acquired successfully");
    return cachedToken;
  } catch (error) {
    const detail = error.response?.data?.error_description || error.message;
    console.error("[GraphService] Failed to acquire token:", detail);
    throw new Error(`Token acquisition failed: ${detail}`);
  }
}

/**
 * Creates a Microsoft Teams meeting via Microsoft Graph API.
 *
 * @param {object} params
 * @param {string} params.subject    - Meeting subject
 * @param {string} params.startTime  - ISO 8601 datetime string
 * @param {string} params.endTime    - ISO 8601 datetime string
 * @param {string[]} params.attendees - Array of attendee email addresses
 * @returns {Promise<{ joinUrl: string, eventId: string }>}
 */
async function createTeamsMeeting({ subject, startTime, endTime, attendees }) {
  const token = await getAccessToken();

  const graphUrl = `${config.graph.baseUrl}/users/${config.azure.userId}/events`;

  const payload = {
    subject,
    start: {
      dateTime: startTime,
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: endTime,
      timeZone: "Asia/Kolkata",
    },
    attendees: attendees.map((email) => ({
      emailAddress: { address: email, name: email },
      type: "required",
    })),
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
  };

  try {
    const response = await axios.post(graphUrl, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = response.data;

    const joinUrl = data.onlineMeeting?.joinUrl;
    const eventId = data.id;

    if (!joinUrl) {
      console.error(
        "[GraphService] Graph returned no joinUrl. Response:",
        JSON.stringify(data, null, 2)
      );
      throw new Error("Graph API did not return a meeting join URL");
    }

    console.log(`[GraphService] Meeting created: ${eventId}`);
    return { joinUrl, eventId };
  } catch (error) {
    const status = error.response?.status;
    const body = error.response?.data?.error?.message || error.message;
    console.error(
      `[GraphService] Graph API error [${status}]: ${body}`
    );
    throw new Error(`Failed to create Teams meeting: ${body}`);
  }
}

module.exports = { createTeamsMeeting };
