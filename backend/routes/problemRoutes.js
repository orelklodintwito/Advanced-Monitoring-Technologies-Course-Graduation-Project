const express = require("express");
const router = express.Router();

const problemController = require("../controllers/problemController");

router.get("/", problemController.getProblems);

router.post("/close/:eventId", problemController.closeProblem);

module.exports = router;