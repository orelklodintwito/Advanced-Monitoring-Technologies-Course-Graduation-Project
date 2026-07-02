const zabbix = require("../services/zabbixService");

exports.getHosts = async (req, res) => {
    try {
        const hosts = await zabbix.getHosts();
        res.json(hosts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.createHost = async (req, res) => {
    try {
        const { name, ip } = req.body;

        const result = await zabbix.createHost(name, ip);

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

exports.deleteHost = async (req, res) => {
    try {
        const result = await zabbix.deleteHostByName(req.params.name);

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