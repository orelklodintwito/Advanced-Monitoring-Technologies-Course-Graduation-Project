const express = require("express");

const problemController = require("../controllers/problemController");

const router = express.Router();

/**
 * GET /api/problems
 * Returns current and recently resolved Zabbix problems.
 */
router.get("/", problemController.getProblems);

/**
 * POST /api/problems/close/:eventId
 * Manually closes a problem when the related trigger allows it.
 */
router.post("/close/:eventId", problemController.closeProblem);

module.exports = router;