const axios = require("axios");
require("dotenv").config();

const ZABBIX_URL = process.env.ZABBIX_URL;
const ZABBIX_USER = process.env.ZABBIX_USER;
const ZABBIX_PASSWORD = process.env.ZABBIX_PASSWORD;
const ZABBIX_GROUP_ID = process.env.ZABBIX_GROUP_ID;
const ZABBIX_TEMPLATE_ID = process.env.ZABBIX_TEMPLATE_ID;

const SEVERITY_NAMES = {
  0: "Not classified",
  1: "Information",
  2: "Warning",
  3: "Average",
  4: "High",
  5: "Disaster"
};

let authToken = null;

/**
 * Checks that all required Zabbix environment variables exist.
 */
function validateConfiguration() {
  const requiredVariables = {
    ZABBIX_URL,
    ZABBIX_USER,
    ZABBIX_PASSWORD,
    ZABBIX_GROUP_ID,
    ZABBIX_TEMPLATE_ID
  };

  const missingVariables = Object.entries(requiredVariables)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing Zabbix environment variables: ${missingVariables.join(", ")}`
    );
  }
}

/**
 * Converts a Zabbix severity number to a readable name.
 */
function getSeverityName(severity) {
  return SEVERITY_NAMES[Number(severity)] || "Unknown";
}

/**
 * Sends a JSON-RPC request to the Zabbix API.
 */
async function zabbixRequest(method, params = {}, retryAfterLogin = true) {
  validateConfiguration();

  try {
    const response = await axios.post(
      ZABBIX_URL,
      {
        jsonrpc: "2.0",
        method,
        params,
        auth: authToken,
        id: Date.now()
      },
      {
        headers: {
          "Content-Type": "application/json-rpc"
        },
        timeout: 10000
      }
    );

    if (response.data.error) {
      const errorMessage =
        response.data.error.data ||
        response.data.error.message ||
        "Unknown Zabbix API error";

      /*
       * If the authentication token expired, log in again
       * and retry the original request once.
       */
      const authenticationError =
        errorMessage.toLowerCase().includes("session terminated") ||
        errorMessage.toLowerCase().includes("not authorized") ||
        errorMessage.toLowerCase().includes("re-login");

      if (authenticationError && retryAfterLogin) {
        authToken = null;
        await login();

        return zabbixRequest(method, params, false);
      }

      throw new Error(errorMessage);
    }

    return response.data.result;
  } catch (error) {
    if (error.response) {
      throw new Error(
        `Zabbix API returned HTTP ${error.response.status}: ${
          error.response.statusText || "Request failed"
        }`
      );
    }

    if (error.code === "ECONNABORTED") {
      throw new Error("The request to Zabbix timed out");
    }

    if (error.code === "ECONNREFUSED") {
      throw new Error("Could not connect to the Zabbix server");
    }

    throw error;
  }
}

/**
 * Logs in to Zabbix and stores the authentication token.
 */
async function login() {
  validateConfiguration();

  try {
    const response = await axios.post(
      ZABBIX_URL,
      {
        jsonrpc: "2.0",
        method: "user.login",
        params: {
          username: ZABBIX_USER,
          password: ZABBIX_PASSWORD
        },
        id: Date.now()
      },
      {
        headers: {
          "Content-Type": "application/json-rpc"
        },
        timeout: 10000
      }
    );

    if (response.data.error) {
      throw new Error(
        response.data.error.data ||
          response.data.error.message ||
          "Zabbix login failed"
      );
    }

    authToken = response.data.result;

    return authToken;
  } catch (error) {
    authToken = null;

    if (error.response) {
      throw new Error(
        `Zabbix login returned HTTP ${error.response.status}`
      );
    }

    if (error.code === "ECONNABORTED") {
      throw new Error("Zabbix login request timed out");
    }

    if (error.code === "ECONNREFUSED") {
      throw new Error("Could not connect to the Zabbix server");
    }

    throw error;
  }
}

/**
 * Logs in only when there is no stored authentication token.
 */
async function ensureLogin() {
  if (!authToken) {
    await login();
  }
}

/**
 * Returns a host that exactly matches the technical host name.
 */
async function getHostByName(name) {
  await ensureLogin();

  const hosts = await zabbixRequest("host.get", {
    output: ["hostid", "host", "name"],
    selectInterfaces: ["ip"],
    filter: {
      host: [name]
    }
  });

  return hosts.length > 0 ? hosts[0] : null;
}

/**
 * Creates a new monitored host and links it to the configured
 * host group and template.
 */
async function createHost(name, ip) {
  if (!name || !name.trim()) {
    throw new Error("Host name is required");
  }

  if (!ip || !ip.trim()) {
    throw new Error("Host IP address is required");
  }

  await ensureLogin();

  const normalizedName = name.trim();
  const normalizedIp = ip.trim();

  const existingHost = await getHostByName(normalizedName);

  if (existingHost) {
    throw new Error(`Host "${normalizedName}" already exists`);
  }

  const result = await zabbixRequest("host.create", {
    host: normalizedName,
    name: normalizedName,
    interfaces: [
      {
        type: 1,
        main: 1,
        useip: 1,
        ip: normalizedIp,
        dns: "",
        port: "10050"
      }
    ],
    groups: [
      {
        groupid: ZABBIX_GROUP_ID
      }
    ],
    templates: [
      {
        templateid: ZABBIX_TEMPLATE_ID
      }
    ]
  });

  return {
    success: true,
    message: `Host "${normalizedName}" was created successfully`,
    hostIds: result.hostids
  };
}

/**
 * Returns hosts in a simple format suitable for the frontend
 * and Alexa responses.
 */
async function getHosts() {
  await ensureLogin();

  const hosts = await zabbixRequest("host.get", {
    output: ["hostid", "host", "name", "status"],
    selectInterfaces: ["ip", "dns", "port", "available"],
    sortfield: "name",
    sortorder: "ASC"
  });

  return hosts.map((host) => {
    const mainInterface = host.interfaces?.[0];

    return {
      id: host.hostid,
      name: host.name || host.host,
      technicalName: host.host,
      ip: mainInterface?.ip || "N/A",
      port: mainInterface?.port || "N/A",
      available: mainInterface?.available || "0",
      enabled: host.status === "0"
    };
  });
}

/**
 * Deletes a host by its exact technical host name.
 */
async function deleteHostByName(name) {
  if (!name || !name.trim()) {
    throw new Error("Host name is required");
  }

  await ensureLogin();

  const normalizedName = name.trim();
  const host = await getHostByName(normalizedName);

  if (!host) {
    throw new Error(`Host "${normalizedName}" was not found`);
  }

  const result = await zabbixRequest("host.delete", [
    host.hostid
  ]);

  return {
    success: true,
    message: `Host "${normalizedName}" was deleted successfully`,
    hostIds: result.hostids
  };
}

/**
 * Retrieves unresolved and recently resolved problems.
 *
 * problem.get supplies the active problem data.
 * event.get is then used to attach the host and trigger data
 * associated with each event.
 */
async function getProblems() {
  await ensureLogin();

  const problems = await zabbixRequest("problem.get", {
    output: [
      "eventid",
      "objectid",
      "name",
      "severity",
      "clock",
      "acknowledged",
      "r_eventid"
    ],
    recent: true,
    sortfield: ["eventid"],
    sortorder: "DESC"
  });

  if (problems.length === 0) {
    return [];
  }

  const eventIds = problems.map((problem) => problem.eventid);

  const events = await zabbixRequest("event.get", {
    output: ["eventid", "objectid", "acknowledged"],
    eventids: eventIds,
    selectHosts: ["hostid", "host", "name"],
    selectRelatedObject: ["triggerid", "description", "manual_close"]
  });

  const eventMap = new Map(
    events.map((event) => [event.eventid, event])
  );

  return problems.map((problem) => {
    const event = eventMap.get(problem.eventid);
    const host = event?.hosts?.[0];
    const trigger = event?.relatedObject;

    return {
      id: problem.eventid,
      eventId: problem.eventid,
      triggerId: problem.objectid,
      hostId: host?.hostid || null,
      host: host?.name || host?.host || "Unknown host",
      problem: problem.name,
      name: problem.name,
      severity: getSeverityName(problem.severity),
      severityId: Number(problem.severity),
      acknowledged: problem.acknowledged === "1",
      canClose: trigger?.manual_close === "1",
      closed:
        Boolean(problem.r_eventid) &&
        problem.r_eventid !== "0",
      clock: Number(problem.clock),
      createdAt: new Date(
        Number(problem.clock) * 1000
      ).toISOString()
    };
  });
}

/**
 * Checks whether an event can be closed manually.
 */
async function getProblemCloseDetails(eventId) {
  const events = await zabbixRequest("event.get", {
    output: ["eventid", "name", "value"],
    eventids: [String(eventId)],
    selectHosts: ["hostid", "host", "name"],
    selectRelatedObject: [
      "triggerid",
      "description",
      "manual_close"
    ]
  });

  if (events.length === 0) {
    throw new Error(`Problem event "${eventId}" was not found`);
  }

  const event = events[0];

  return {
    event,
    canClose: event.relatedObject?.manual_close === "1"
  };
}

/**
 * Manually closes a problem only when the associated trigger
 * permits manual closing.
 */
async function closeProblem(eventId) {
  if (!eventId) {
    throw new Error("Problem event ID is required");
  }

  await ensureLogin();

  const { event, canClose } =
    await getProblemCloseDetails(eventId);

  if (!canClose) {
    throw new Error(
      `Problem "${event.name || eventId}" cannot be closed manually`
    );
  }

  /*
   * Zabbix event action is a bitmap:
   * 1 = close problem
   * 4 = add message
   * 5 = close problem and add message
   */
  const result = await zabbixRequest("event.acknowledge", {
    eventids: [String(eventId)],
    action: 5,
    message: "Closed by Alexa voice assistant"
  });

  return {
    success: true,
    message: `Problem event "${eventId}" was submitted for closing`,
    eventIds: result.eventids
  };
}

module.exports = {
  login,
  createHost,
  getHosts,
  deleteHostByName,
  getProblems,
  closeProblem
};