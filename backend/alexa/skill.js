const Alexa = require("ask-sdk-core");

const {
  LaunchRequestHandler,
  CreateHostIntentHandler,
  DeleteHostIntentHandler,
  ListProblemsIntentHandler,
  CloseProblemIntentHandler,
  HelpIntentHandler,
  CancelAndStopIntentHandler,
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
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .create();

module.exports = skill;