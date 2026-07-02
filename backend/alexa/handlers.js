const getSlotValue = (handlerInput, slotName) => {
  const slots = handlerInput.requestEnvelope.request.intent.slots || {};
  return slots[slotName]?.value || null;
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Welcome to Smart Voice Assistant for Zabbix. You can create a host, delete a host, list problems, or close a problem.")
      .reprompt("What would you like to do?")
      .getResponse();
  }
};

const CreateHostIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "CreateHostIntent";
  },
  handle(handlerInput) {
    const hostName = getSlotValue(handlerInput, "HostName");

    if (!hostName) {
      return handlerInput.responseBuilder
        .speak("What is the host name?")
        .reprompt("Please say the host name.")
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak(`I received host name ${hostName}. Next we will collect the IP address and create it in Zabbix.`)
      .getResponse();
  }
};

const DeleteHostIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "DeleteHostIntent";
  },
  handle(handlerInput) {
    const hostName = getSlotValue(handlerInput, "HostName");

    if (!hostName) {
      return handlerInput.responseBuilder
        .speak("Which host should I delete?")
        .reprompt("Please say the host name.")
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak(`Deleting host ${hostName} from Zabbix.`)
      .getResponse();
  }
};

const ListProblemsIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "ListProblemsIntent";
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Reading current problems from Zabbix.")
      .getResponse();
  }
};

const CloseProblemIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "CloseProblemIntent";
  },
  handle(handlerInput) {
    const problemId = getSlotValue(handlerInput, "ProblemId");

    if (!problemId) {
      return handlerInput.responseBuilder
        .speak("Which problem number should I close?")
        .reprompt("Please say the problem number.")
        .getResponse();
    }

    return handlerInput.responseBuilder
      .speak(`Closing problem number ${problemId} in Zabbix.`)
      .getResponse();
  }
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent";
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("You can say create host, delete host, list problems, or close problem.")
      .reprompt("Try saying list problems.")
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      ["AMAZON.CancelIntent", "AMAZON.StopIntent"].includes(
        handlerInput.requestEnvelope.request.intent.name
      );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak("Goodbye.").getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error("Alexa error:", error);
    return handlerInput.responseBuilder
      .speak("Sorry, something went wrong while processing the request.")
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
  CancelAndStopIntentHandler,
  SessionEndedRequestHandler,
  ErrorHandler
};