const zabbix = require("../services/zabbixService");

exports.getProblems = async (req, res) => {
  try {
    const problems = await zabbix.getProblems();

    return res.status(200).json({
      success: true,
      count: problems.length,
      problems
    });
  } catch (error) {
    console.error("Failed to get problems:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve problems"
    });
  }
};

exports.closeProblem = async (req, res) => {
  try {
    const eventId = String(req.params.eventId || "").trim();

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: "Problem event ID is required"
      });
    }

    const result = await zabbix.closeProblem(eventId);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to close problem:", error);

    let statusCode = 500;

    if (error.message?.includes("was not found")) {
      statusCode = 404;
    } else if (error.message?.includes("cannot be closed manually")) {
      statusCode = 409;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to close problem"
    });
  }
};