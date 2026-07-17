const express = require("express");
const cors = require("cors");
require("dotenv").config();

const alexaRoute = require("./routes/alexa");
const hostRoutes = require("./routes/hostRoutes");
const problemRoutes = require("./routes/problemRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigin =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/*
 * Alexa must be registered before express.json().
 * The Alexa Express Adapter reads and verifies the raw request body itself.
 */
app.use("/alexa", alexaRoute);

/*
 * JSON parsing is used only for the regular REST API routes.
 */
app.use(express.json());

app.use("/api/hosts", hostRoutes);
app.use("/api/problems", problemRoutes);

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    status: "UP",
    service: "Zabbix Voice Assistant Backend",
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  return res.status(error.status || 500).json({
    success: false,
    message:
      error.message ||
      "An unexpected server error occurred"
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Zabbix Voice Assistant Backend is running on port ${PORT}`
    );
  });
}

module.exports = app;