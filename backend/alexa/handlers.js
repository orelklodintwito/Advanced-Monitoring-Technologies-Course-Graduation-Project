const zabbix = require("../services/zabbixService");

function getRequest(handlerInput) {
  return handlerInput.requestEnvelope.request;
}

function getIntent(handlerInput) {
  return getRequest(handlerInput).intent;
}

function getSlotValue(handlerInput, slotName) {
  const intent = getIntent(handlerInput);
  const slot = intent?.slots?.[slotName];

  return slot?.value?.trim() || null;
}

function elicitSlot(
  handlerInput,
  slotName,
  speechText,
  repromptText = speechText
) {
  const currentIntent =
    handlerInput.requestEnvelope.request.intent;

  return handlerInput.responseBuilder
    .speak(speechText)
    .reprompt(repromptText)
    .addElicitSlotDirective(slotName, currentIntent)
    .getResponse();
}

function isIntent(handlerInput, intentName) {
  const request = getRequest(handlerInput);

  return (
    request.type === "IntentRequest" &&
    request.intent?.name === intentName
  );
}

function makeIpAddressSpeakable(ipAddress) {
  if (!ipAddress) {
    return "";
  }

  return ipAddress
    .split(".")
    .join(" dot ");
}

function getFriendlyErrorMessage(error) {
  const message = error?.message || "";

  if (message.includes("already exists")) {
    return "A host with that name already exists in Zabbix.";
  }

  if (
    message.includes("was not found") ||
    message.includes("Host not found")
  ) {
    return "I could not find that host in Zabbix.";
  }

  if (message.includes("cannot be closed manually")) {
    return "That problem cannot be closed manually.";
  }

  if (message.includes("Could not connect")) {
    return "I could not connect to the Zabbix server.";
  }

  if (message.includes("timed out")) {
    return "The Zabbix server took too long to respond.";
  }

  if (
    message.includes("login") ||
    message.includes("authorized") ||
    message.includes("password")
  ) {
    return "I could not authenticate with the Zabbix server.";
  }

  return "The operation could not be completed in Zabbix.";
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return getRequest(handlerInput).type === "LaunchRequest";
  },

  handle(handlerInput) {
    const speechText =
    "Welcome to the Smart Voice Assistant for Zabbix. " +
    "You can create a host, delete a host, list problems, close a problem, or run a health check.";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(
        "What would you like to do? You can say, list problems."
      )
      .getResponse();
  }
};

const CreateHostIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "CreateHostIntent");
  },

  async handle(handlerInput) {
    const hostName = getSlotValue(handlerInput, "HostName");
    const rawIpAddress = getSlotValue(handlerInput, "IpAddress");

  const ipAddress = rawIpAddress
    ?.toLowerCase()
    .replace(/\s+dot\s+/g, ".")
    .replace(/\s+/g, "")
    .trim();

    if (!hostName) {
      return elicitSlot(
        handlerInput,
        "HostName",
        "What is the name of the new host?",
        "Please say the host name."
      );
    }

    if (!ipAddress) {
      return elicitSlot(
        handlerInput,
        "IpAddress",
        `What is the IP address for host ${hostName}?`,
        "Please say the IP address one number at a time."
      );
    }

    try {
      const result = await zabbix.createHost(
        hostName,
        ipAddress
      );

      const speakableIp = makeIpAddressSpeakable(ipAddress);

      return handlerInput.responseBuilder
        .speak(
          `${result.message}. ` +
          `The IP address is ${speakableIp}.`
        )
        .getResponse();
    } catch (error) {
      console.error("CreateHostIntent error:", error);

      return handlerInput.responseBuilder
        .speak(getFriendlyErrorMessage(error))
        .reprompt(
          "You can try creating the host again or choose another operation."
        )
        .getResponse();
    }
  }
};

const DeleteHostIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "DeleteHostIntent");
  },

  async handle(handlerInput) {
    const hostName = getSlotValue(handlerInput, "HostName");

    if (!hostName) {
      return elicitSlot(
        handlerInput,
        "HostName",
        "Which host should I delete?",
        "Please say the exact host name."
      );
    }

    try {
      const result =
        await zabbix.deleteHostByName(hostName);

      return handlerInput.responseBuilder
        .speak(result.message)
        .getResponse();
    } catch (error) {
      console.error("DeleteHostIntent error:", error);

      return handlerInput.responseBuilder
        .speak(getFriendlyErrorMessage(error))
        .reprompt(
          "You can say another host name or choose another operation."
        )
        .getResponse();
    }
  }
};

const ListProblemsIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "ListProblemsIntent");
  },

  async handle(handlerInput) {
    try {
      const problems = await zabbix.getProblems();

      const activeProblems = problems.filter(
        (problem) => !problem.closed
      );

      if (activeProblems.length === 0) {
        return handlerInput.responseBuilder
          .speak(
            "There are no current problems in Zabbix."
          )
          .getResponse();
      }

      const maximumProblemsToRead = 5;

      const problemDescriptions = activeProblems
        .slice(0, maximumProblemsToRead)
        .map((problem, index) => {
          const closeStatus = problem.canClose
            ? "This problem can be closed manually."
            : "This problem cannot be closed manually.";

          return (
            `Problem ${index + 1}. ` +
            `Event number ${problem.id}. ` +
            `Host ${problem.host}. ` +
            `${problem.problem}. ` +
            `Severity ${problem.severity}. ` +
            closeStatus
          );
        });

      let speechText =
        `There are ${activeProblems.length} current problems. ` +
        problemDescriptions.join(" ");

      if (activeProblems.length > maximumProblemsToRead) {
        speechText +=
          ` I read the first ${maximumProblemsToRead} problems.`;
      }

      speechText +=
        " To close a problem, say close problem followed by the event number.";

      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(
          "You can say close problem followed by the event number."
        )
        .getResponse();
    } catch (error) {
      console.error("ListProblemsIntent error:", error);

      return handlerInput.responseBuilder
        .speak(getFriendlyErrorMessage(error))
        .getResponse();
    }
  }
};

const CloseProblemIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "CloseProblemIntent");
  },

  async handle(handlerInput) {
    const problemId = getSlotValue(
      handlerInput,
      "ProblemId"
    );

    if (!problemId) {
      return elicitSlot(
        handlerInput,
        "ProblemId",
        "What is the event number of the problem you want to close?",
        "Please say the problem event number."
      );
    }

    try {
      const result = await zabbix.closeProblem(problemId);

      return handlerInput.responseBuilder
        .speak(result.message)
        .getResponse();
    } catch (error) {
      console.error("CloseProblemIntent error:", error);

      return handlerInput.responseBuilder
        .speak(getFriendlyErrorMessage(error))
        .reprompt(
          "You can say list problems to hear the available event numbers."
        )
        .getResponse();
    }
  }
};

const HealthCheckIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "HealthCheckIntent");
  },

  async handle(handlerInput) {
    try {
      const [hosts, problems] = await Promise.all([
        zabbix.getHosts(),
        zabbix.getProblems()
      ]);

      const activeProblems = problems.filter(
        (problem) => !problem.closed
      );

      const hostText =
    hosts.length === 1
      ? "There is 1 monitored host."
      : `There are ${hosts.length} monitored hosts.`;

  const problemText =
    activeProblems.length === 0
      ? "There are no active problems in Zabbix."
      : activeProblems.length === 1
        ? "There is 1 active problem in Zabbix."
        : `There are ${activeProblems.length} active problems in Zabbix.`;

  const speechText =
    `The backend is running correctly. ` +
    hostText +
    " " +
    problemText;

      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    } catch (error) {
      console.error("HealthCheckIntent error:", error);

      return handlerInput.responseBuilder
        .speak(
          "The backend is running, but I could not retrieve information from Zabbix."
        )
        .getResponse();
    }
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(handlerInput, "AMAZON.HelpIntent");
  },

  handle(handlerInput) {
    const speechText =
  "You can say create host, delete host, list problems, " +
  "close problem, or health check. For example, say health check.";

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt("Try saying health check or list problems.")
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      isIntent(handlerInput, "AMAZON.CancelIntent") ||
      isIntent(handlerInput, "AMAZON.StopIntent")
    );
  },

  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Goodbye.")
      .getResponse();
  }
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return isIntent(
      handlerInput,
      "AMAZON.FallbackIntent"
    );
  },

  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(
        "I did not understand that command. " +
        "You can create a host, delete a host, list problems, close a problem, or run a health check."
      )
      .reprompt("Try saying, list problems.")
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      getRequest(handlerInput).type ===
      "SessionEndedRequest"
    );
  },

  handle(handlerInput) {
    const request = getRequest(handlerInput);

    if (request.reason === "ERROR") {
      console.error(
        "Alexa session ended with an error:",
        request.error
      );
    }

    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },

  handle(handlerInput, error) {
    console.error("Unhandled Alexa error:", error);

    return handlerInput.responseBuilder
      .speak(
        "Sorry, something went wrong while processing your request. Please try again."
      )
      .reprompt(
        "You can say list problems, create host, delete host, close problem, or health check."
      )
      .getResponse();
  }
};

module.exports = {
  LaunchRequestHandler,
  CreateHostIntentHandler,
  DeleteHostIntentHandler,
  ListProblemsIntentHandler,
  CloseProblemIntentHandler,
  HelpIntentHandler,
  HealthCheckIntentHandler,
  CancelAndStopIntentHandler,
  FallbackIntentHandler,
  SessionEndedRequestHandler,
  ErrorHandler
};