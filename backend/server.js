const express = require("express");
const cors = require("cors");
const fs = require("fs");
const alexaRoute = require("./routes/alexa");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use("/alexa", alexaRoute);

const DATA_FILE = "./data.json";

const defaultData = {
    hosts: [
        {
            id: 1,
            name: "Server1",
            ip: "192.168.1.10"
        }
    ],
    problems: [
        {
            id: 101,
            host: "Server1",
            problem: "CPU Usage High",
            severity: "High",
            closed: false
        },
        {
            id: 102,
            host: "Database01",
            problem: "Disk Space Low",
            severity: "Critical",
            closed: false
        }
    ]
};

function loadData() {
    if (!fs.existsSync(DATA_FILE)) {
        saveData(defaultData);
        return defaultData;
    }

    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get("/health", (req, res) => {
    res.json({
        status: "UP",
        service: "Zabbix Voice Assistant Backend"
    });
});

app.get("/hosts", (req, res) => {
    const data = loadData();
    res.json(data.hosts);
});

app.post("/create-host", (req, res) => {
    const { name, ip } = req.body;

    if (!name || !ip) {
        return res.status(400).json({
            success: false,
            message: "Host name and IP address are required"
        });
    }

    const data = loadData();

    const exists = data.hosts.some(
        host => host.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
        return res.status(409).json({
            success: false,
            message: "Host already exists"
        });
    }

    const newHost = {
        id: Date.now(),
        name,
        ip
    };

    data.hosts.push(newHost);
    saveData(data);

    res.json({
        success: true,
        message: "Host created successfully",
        host: newHost
    });
});

app.delete("/delete-host/:id", (req, res) => {
    const data = loadData();

    const hostExists = data.hosts.some(
        host => host.id == req.params.id
    );

    if (!hostExists) {
        return res.status(404).json({
            success: false,
            message: "Host not found"
        });
    }

    data.hosts = data.hosts.filter(
        host => host.id != req.params.id
    );

    saveData(data);

    res.json({
        success: true,
        message: "Host deleted successfully"
    });
});

app.get("/problems", (req, res) => {
    const data = loadData();
    res.json(data.problems);
});

app.post("/close-problem/:id", (req, res) => {
    const data = loadData();

    const problem = data.problems.find(
        problem => problem.id == req.params.id
    );

    if (!problem) {
        return res.status(404).json({
            success: false,
            message: "Problem not found"
        });
    }

    problem.closed = true;
    saveData(data);

    res.json({
        success: true,
        message: "Problem closed successfully"
    });
});

app.post("/reopen-problem/:id", (req, res) => {
    const data = loadData();

    const problem = data.problems.find(
        problem => problem.id == req.params.id
    );

    if (!problem) {
        return res.status(404).json({
            success: false,
            message: "Problem not found"
        });
    }

    problem.closed = false;
    saveData(data);

    res.json({
        success: true,
        message: "Problem reopened successfully"
    });
});

app.post("/reset-demo", (req, res) => {
    saveData(defaultData);

    res.json({
        success: true,
        message: "Demo data was reset successfully"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});