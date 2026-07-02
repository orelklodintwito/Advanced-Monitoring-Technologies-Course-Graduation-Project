const zabbix = require("../services/zabbixService");

exports.getProblems = async (req, res) => {
    try {
        const problems = await zabbix.getProblems();
        res.json(problems);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.closeProblem = async (req, res) => {
    try {
        const result = await zabbix.closeProblem(req.params.eventId);

        res.json({
            success: true,
            result
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};