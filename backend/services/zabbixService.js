const axios = require("axios");
require("dotenv").config();

const ZABBIX_URL = process.env.ZABBIX_URL;
const ZABBIX_USER = process.env.ZABBIX_USER;
const ZABBIX_PASSWORD = process.env.ZABBIX_PASSWORD;
const ZABBIX_GROUP_ID = process.env.ZABBIX_GROUP_ID;
const ZABBIX_TEMPLATE_ID = process.env.ZABBIX_TEMPLATE_ID;

let authToken = null;

async function zabbixRequest(method, params = {}) {
  const response = await axios.post(ZABBIX_URL, {
    jsonrpc: "2.0",
    method,
    params,
    auth: authToken,
    id: Date.now()
  });

  if (response.data.error) {
    throw new Error(response.data.error.data || response.data.error.message);
  }

  return response.data.result;
}

async function login() {
  const response = await axios.post(ZABBIX_URL, {
    jsonrpc: "2.0",
    method: "user.login",
    params: {
      username: ZABBIX_USER,
      password: ZABBIX_PASSWORD
    },
    id: 1
  });

  if (response.data.error) {
    throw new Error(response.data.error.data || response.data.error.message);
  }

  authToken = response.data.result;
  return authToken;
}

async function ensureLogin() {
  if (!authToken) {
    await login();
  }
}

async function createHost(name, ip) {
  await ensureLogin();

  return zabbixRequest("host.create", {
    host: name,
    interfaces: [
      {
        type: 1,
        main: 1,
        useip: 1,
        ip,
        dns: "",
        port: "10050"
      }
    ],
    groups: [{ groupid: ZABBIX_GROUP_ID }],
    templates: [{ templateid: ZABBIX_TEMPLATE_ID }]
  });
}

async function getHosts() {
  await ensureLogin();

  return zabbixRequest("host.get", {
    output: ["hostid", "host", "name"],
    selectInterfaces: ["ip"]
  });
}

async function deleteHostByName(name) {
  await ensureLogin();

  const hosts = await zabbixRequest("host.get", {
    output: ["hostid", "host"],
    filter: { host: [name] }
  });

  if (!hosts.length) {
    throw new Error("Host not found");
  }

  return zabbixRequest("host.delete", [hosts[0].hostid]);
}

async function getProblems() {
  await ensureLogin();

  return zabbixRequest("problem.get", {
    output: ["eventid", "name", "severity", "clock"],
    selectAcknowledges: "extend",
    recent: true,
    sortfield: ["eventid"],
    sortorder: "DESC"
  });
}

async function closeProblem(eventId) {
  await ensureLogin();

  return zabbixRequest("event.acknowledge", {
    eventids: [eventId],
    action: 1,
    message: "Closed by Alexa voice assistant"
  });
}

module.exports = {
  login,
  createHost,
  getHosts,
  deleteHostByName,
  getProblems,
  closeProblem
};