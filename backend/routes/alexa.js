const express = require("express");
const { ExpressAdapter } = require("ask-sdk-express-adapter");

const skill = require("../alexa/skill");

const router = express.Router();

const adapter = new ExpressAdapter(
  skill,
  false,
  false
);

/**
 * POST /alexa
 * Receives Alexa requests and forwards them to the Alexa skill.
 */
router.post("/", (req, res, next) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({
      success: false,
      error: "Invalid Alexa request body"
    });
  }

  const handlers = adapter.getRequestHandlers();

  return handlers(req, res, next);
});

/**
 * GET /alexa
 * Simple endpoint check for browsers and monitoring tools.
 */
router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    service: "Alexa Skill Endpoint",
    status: "UP",
    message: "Send Alexa requests using POST"
  });
});

module.exports = router;