const Alexa = require("ask-sdk-core");

const {
  LaunchRequestHandler,
  CreateHostIntentHandler,
  DeleteHostIntentHandler,
  ListProblemsIntentHandler,
  CloseProblemIntentHandler,
  HealthCheckIntentHandler,
  HelpIntentHandler,
  CancelAndStopIntentHandler,
  FallbackIntentHandler,
  SessionEndedRequestHandler,
  ErrorHandler
} = require("./handlers");

const skill = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    CreateHostIntentHandler,
    DeleteHostIntentHandler,
    ListProblemsIntentHandler,
    CloseProblemIntentHandler,
    HealthCheckIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent(
    "advanced-monitoring-technologies/zabbix-voice-assistant"
  )
  .create();

module.exports = skill;