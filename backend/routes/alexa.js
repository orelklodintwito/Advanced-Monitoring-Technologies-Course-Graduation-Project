const express = require("express");
const { ExpressAdapter } = require("ask-sdk-express-adapter");

const skill = require("../alexa/skill");

const router = express.Router();

const adapter = new ExpressAdapter(
  skill,
  false,
  false
);

router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    service: "Alexa Skill Endpoint",
    status: "UP",
    message: "Send Alexa requests using POST"
  });
});

const alexaRequestHandlers = adapter.getRequestHandlers();

router.post("/", ...alexaRequestHandlers);

module.exports = router;