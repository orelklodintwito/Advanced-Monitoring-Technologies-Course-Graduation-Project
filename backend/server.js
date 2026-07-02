const express = require("express");
const cors = require("cors");
require("dotenv").config();

const alexaRoute = require("./routes/alexa");
const hostRoutes = require("./routes/hostRoutes");
const problemRoutes = require("./routes/problemRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/alexa", alexaRoute);
app.use("/api/hosts", hostRoutes);
app.use("/api/problems", problemRoutes);

app.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "Zabbix Voice Assistant Backend"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});