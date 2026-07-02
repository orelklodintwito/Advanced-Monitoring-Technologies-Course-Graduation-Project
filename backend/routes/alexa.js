const express = require("express");
const { ExpressAdapter } = require("ask-sdk-express-adapter");
const skill = require("../alexa/skill");

const router = express.Router();

const adapter = new ExpressAdapter(skill, true, true);

router.post("/", adapter.getRequestHandlers());

module.exports = router;