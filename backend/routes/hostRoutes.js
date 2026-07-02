const express = require("express");
const router = express.Router();

const hostController = require("../controllers/hostController");

router.get("/", hostController.getHosts);

router.post("/", hostController.createHost);

router.delete("/:name", hostController.deleteHost);

module.exports = router;