const express = require("express");

const hostController = require("../controllers/hostController");

const router = express.Router();

/**
 * GET /api/hosts
 * Returns all monitored hosts.
 */
router.get("/", hostController.getHosts);

/**
 * POST /api/hosts
 * Creates a new monitored host.
 *
 * Expected body:
 * {
 *   "name": "Server1",
 *   "ip": "192.168.1.10"
 * }
 */
router.post("/", hostController.createHost);

/**
 * DELETE /api/hosts/:name
 * Deletes a host according to its technical Zabbix host name.
 */
router.delete("/:name", hostController.deleteHost);

module.exports = router;