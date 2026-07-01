import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [hosts, setHosts] = useState([]);
  const [problems, setProblems] = useState([]);
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [voiceCommand, setVoiceCommand] = useState("");
  const [assistantMessage, setAssistantMessage] = useState(
    "Waiting for voice command..."
  );
  const [isListening, setIsListening] = useState(false);

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const updateAssistant = (message) => {
    setAssistantMessage(message);
    speak(message);
  };

  const loadHosts = async () => {
    const response = await fetch("http://localhost:5000/hosts");
    const data = await response.json();
    setHosts(data);
  };

  const loadProblems = async () => {
    const response = await fetch("http://localhost:5000/problems");
    const data = await response.json();
    setProblems(data);
  };

  const checkHealth = async () => {
    try {
      const response = await fetch("http://localhost:5000/health");
      const data = await response.json();
      setBackendStatus(data.status);
      return data.status;
    } catch {
      setBackendStatus("DOWN");
      return "DOWN";
    }
  };

  useEffect(() => {
    loadHosts();
    loadProblems();
    checkHealth();
  }, []);

  const createHost = async (hostName = name, hostIp = ip) => {
    if (!hostName || !hostIp) {
      updateAssistant("Please provide both host name and IP address.");
      return;
    }

    const response = await fetch("http://localhost:5000/create-host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: hostName, ip: hostIp }),
    });

    const result = await response.json();

    if (!response.ok) {
      updateAssistant(result.message || "Failed to create host.");
      return;
    }

    setName("");
    setIp("");
    updateAssistant(`Host ${hostName} was created successfully.`);
    loadHosts();
  };

  const deleteHost = async (id) => {
    const response = await fetch(`http://localhost:5000/delete-host/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      updateAssistant(result.message || "Failed to delete host.");
      return;
    }

    updateAssistant("Host was deleted successfully.");
    loadHosts();
  };

  const deleteHostByName = async (hostName) => {
    if (!hostName) {
      updateAssistant("Please provide the host name to delete.");
      return;
    }

    const host = hosts.find(
      (h) => h.name.toLowerCase() === hostName.toLowerCase()
    );

    if (!host) {
      updateAssistant(`Host ${hostName} was not found.`);
      return;
    }

    await deleteHost(host.id);
  };

  const closeProblem = async (id) => {
    if (!id) {
      updateAssistant("Please provide the problem ID.");
      return;
    }

    const response = await fetch(`http://localhost:5000/close-problem/${id}`, {
      method: "POST",
    });

    const result = await response.json();

    if (!response.ok) {
      updateAssistant(result.message || "Failed to close problem.");
      return;
    }

    updateAssistant(`Problem ${id} was closed successfully.`);
    loadProblems();
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      updateAssistant("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setVoiceCommand(text);
      updateAssistant(`I heard: ${text}`);
    };

    recognition.onerror = () => {
      updateAssistant("I could not hear the command clearly.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const runVoiceCommand = async () => {
    const rawCommand = voiceCommand.trim();

    if (!rawCommand) {
      updateAssistant("Please enter or say a command first.");
      return;
    }

    const command = rawCommand.toLowerCase();
    const parts = rawCommand.split(" ");

    if (command.startsWith("create host")) {
      await createHost(parts[2], parts[3]);
      setVoiceCommand("");
      return;
    }

    if (command.startsWith("delete host")) {
      await deleteHostByName(parts[2]);
      setVoiceCommand("");
      return;
    }

    if (command === "list problems" || command === "show problems") {
      const openCount = problems.filter((p) => !p.closed).length;
      updateAssistant(
        `There are ${problems.length} problems in the system, ${openCount} are open.`
      );
      setVoiceCommand("");
      return;
    }

    if (command.startsWith("close problem")) {
      await closeProblem(parts[2]);
      setVoiceCommand("");
      return;
    }

    if (command === "health check") {
      const status = await checkHealth();
      updateAssistant(`Backend status is ${status}.`);
      setVoiceCommand("");
      return;
    }

    updateAssistant("Command not recognized.");
  };

  const openProblems = problems.filter((p) => !p.closed).length;
  const backendClass = backendStatus === "UP" ? "status-up" : "status-down";

  return (
    <div className="dashboard">
      <h1 className="title">Smart Voice Assistant for Zabbix</h1>

      <div className="cards">
        <div className="card">
          <h3>Total Hosts</h3>
          <p>{hosts.length}</p>
        </div>

        <div className="card">
          <h3>Total Problems</h3>
          <p>{problems.length}</p>
        </div>

        <div className="card">
          <h3>Open Problems</h3>
          <p>{openProblems}</p>
        </div>

        <div className="card">
          <h3>Backend</h3>
          <p className={backendClass}>{backendStatus}</p>
        </div>
      </div>

      <div className="section">
        <h2>Voice Assistant Simulator</h2>

        <div className="voice-row">
          <input
            className="command-input"
            placeholder="Example: create host Server2 192.168.1.20"
            value={voiceCommand}
            onChange={(e) => setVoiceCommand(e.target.value)}
          />

          <button onClick={runVoiceCommand}>Run Command</button>

          <button
            className={`mic-inline ${isListening ? "listening-inline" : ""}`}
            onClick={startListening}
          >
            {isListening ? "🎙 Listening" : "🎤 Speak"}
          </button>
        </div>

        <div className="assistant-box">
          Assistant says: <b>{assistantMessage}</b>
        </div>

        <p className="hint">
          Try: create host Server2 192.168.1.20 | delete host Server2 | list
          problems | close problem 101 | health check
        </p>
      </div>

      <div className="section">
        <h2>Create Host</h2>

        <input
          placeholder="Host Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="IP Address"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
        />

        <button onClick={() => createHost()}>Create</button>
      </div>

      <div className="section">
        <h2>Hosts</h2>

        {hosts.length === 0 ? (
          <p>No hosts found</p>
        ) : (
          hosts.map((host) => (
            <div className="host-row" key={host.id}>
              <span>
                <b>{host.name}</b> | {host.ip}
              </span>

              <button
                className="danger-button"
                onClick={() => deleteHost(host.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      <div className="section">
        <h2>Current Problems</h2>

        {problems.length === 0 ? (
          <p>No problems found</p>
        ) : (
          problems.map((problem) => (
            <div className="problem-row" key={problem.id}>
              <span>
                <b>{problem.host}</b> | {problem.problem} | Severity:{" "}
                <span
                  className={
                    problem.severity === "Critical"
                      ? "severity-critical"
                      : "severity-high"
                  }
                >
                  {problem.severity}
                </span>{" "}
                | Status:{" "}
                <span className={problem.closed ? "closed" : "open"}>
                  {problem.closed ? "Closed" : "Open"}
                </span>
              </span>

              {!problem.closed && (
                <button onClick={() => closeProblem(problem.id)}>
                  Close Problem
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;