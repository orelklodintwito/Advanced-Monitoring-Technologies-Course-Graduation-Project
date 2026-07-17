const zabbix = require("../services/zabbixService");

exports.getHosts = async (req, res) => {
  try {
    const hosts = await zabbix.getHosts();

    return res.status(200).json({
      success: true,
      count: hosts.length,
      hosts
    });
  } catch (error) {
    console.error("Failed to get hosts:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve hosts"
    });
  }
};

exports.createHost = async (req, res) => {
  try {
    const { name, ip } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Host name is required"
      });
    }

    if (!ip || !ip.trim()) {
      return res.status(400).json({
        success: false,
        error: "Host IP address is required"
      });
    }

    const result = await zabbix.createHost(
      name.trim(),
      ip.trim()
    );

    return res.status(201).json(result);
  } catch (error) {
    console.error("Failed to create host:", error);

    const statusCode =
      error.message?.includes("already exists") ? 409 : 500;

    return res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to create host"
    });
  }
};

exports.deleteHost = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name || "").trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Host name is required"
      });
    }

    const result = await zabbix.deleteHostByName(name);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Failed to delete host:", error);

    const statusCode =
      error.message?.includes("was not found") ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to delete host"
    });
  }
};