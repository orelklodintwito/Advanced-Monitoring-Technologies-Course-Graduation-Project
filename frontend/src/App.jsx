import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [isCreatingHost, setIsCreatingHost] = useState(false);
  const [deletingHostId, setDeletingHostId] = useState(null);
  const [closingProblemId, setClosingProblemId] = useState(null);

  const speak = (text) => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    window.speechSynthesis.speak(utterance);
  };

  const updateAssistant = (message) => {
    setAssistantMessage(message);
    speak(message);
  };

  const readJsonResponse = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const loadHosts = async () => {
    setIsLoadingHosts(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/hosts`);
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to load hosts.");
      }

      setHosts(Array.isArray(data.hosts) ? data.hosts : []);
    } catch (error) {
      console.error("Failed to load hosts:", error);
      setHosts([]);
      updateAssistant(
        error.message || "Could not load hosts from the backend."
      );
    } finally {
      setIsLoadingHosts(false);
    }
  };

  const loadProblems = async () => {
    setIsLoadingProblems(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/problems`);
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to load problems.");
      }

      setProblems(Array.isArray(data.problems) ? data.problems : []);
    } catch (error) {
      console.error("Failed to load problems:", error);
      setProblems([]);
      updateAssistant(
        error.message || "Could not load problems from the backend."
      );
    } finally {
      setIsLoadingProblems(false);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error || "Health check failed.");
      }

      const status = data.status || "UP";
      setBackendStatus(status);

      return status;
    } catch (error) {
      console.error("Health check failed:", error);
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
    const normalizedName = hostName?.trim();
    const normalizedIp = hostIp?.trim();

    if (!normalizedName || !normalizedIp) {
      updateAssistant(
        "Please provide both host name and IP address."
      );
      return;
    }

    setIsCreatingHost(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/hosts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: normalizedName,
          ip: normalizedIp
        })
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to create host."
        );
      }

      setName("");
      setIp("");

      updateAssistant(
        result.message ||
          `Host ${normalizedName} was created successfully.`
      );

      await loadHosts();
    } catch (error) {
      console.error("Failed to create host:", error);
      updateAssistant(error.message || "Failed to create host.");
    } finally {
      setIsCreatingHost(false);
    }
  };

  const deleteHost = async (host) => {
    const hostName = host.technicalName || host.name;

    if (!hostName) {
      updateAssistant("The selected host has no valid name.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete host "${host.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingHostId(host.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/hosts/${encodeURIComponent(hostName)}`,
        {
          method: "DELETE"
        }
      );

      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to delete host."
        );
      }

      updateAssistant(
        result.message ||
          `Host ${host.name} was deleted successfully.`
      );

      await loadHosts();
    } catch (error) {
      console.error("Failed to delete host:", error);
      updateAssistant(error.message || "Failed to delete host.");
    } finally {
      setDeletingHostId(null);
    }
  };

  const deleteHostByName = async (hostName) => {
    const normalizedName = hostName?.trim();

    if (!normalizedName) {
      updateAssistant("Please provide the host name to delete.");
      return;
    }

    const host = hosts.find((currentHost) => {
      const visibleName = currentHost.name?.toLowerCase();
      const technicalName =
        currentHost.technicalName?.toLowerCase();
      const requestedName = normalizedName.toLowerCase();

      return (
        visibleName === requestedName ||
        technicalName === requestedName
      );
    });

    if (!host) {
      updateAssistant(
        `Host ${normalizedName} was not found.`
      );
      return;
    }

    await deleteHost(host);
  };

  const closeProblem = async (problem) => {
    const eventId = problem.id || problem.eventId;

    if (!eventId) {
      updateAssistant("Please provide the problem event ID.");
      return;
    }

    if (!problem.canClose) {
      updateAssistant(
        `Problem ${eventId} cannot be closed manually.`
      );
      return;
    }

    setClosingProblemId(eventId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/problems/close/${encodeURIComponent(
          eventId
        )}`,
        {
          method: "POST"
        }
      );

      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to close problem."
        );
      }

      updateAssistant(
        result.message ||
          `Problem ${eventId} was closed successfully.`
      );

      await loadProblems();
    } catch (error) {
      console.error("Failed to close problem:", error);
      updateAssistant(error.message || "Failed to close problem.");
    } finally {
      setClosingProblemId(null);
    }
  };

  const closeProblemById = async (problemId) => {
    const normalizedId = String(problemId || "").trim();

    if (!normalizedId) {
      updateAssistant("Please provide the problem ID.");
      return;
    }

    const problem = problems.find(
      (currentProblem) =>
        String(currentProblem.id || currentProblem.eventId) ===
        normalizedId
    );

    if (!problem) {
      updateAssistant(
        `Problem ${normalizedId} was not found.`
      );
      return;
    }

    await closeProblem(problem);
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      updateAssistant(
        "Speech recognition is not supported in this browser."
      );
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

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      updateAssistant(
        "I could not hear the command clearly."
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const runVoiceCommand = async () => {
    const rawCommand = voiceCommand.trim();

    if (!rawCommand) {
      updateAssistant(
        "Please enter or say a command first."
      );
      return;
    }

    const command = rawCommand.toLowerCase();

    if (command.startsWith("create host ")) {
      const commandWithoutPrefix = rawCommand
        .slice("create host ".length)
        .trim();

      const lastSpaceIndex =
        commandWithoutPrefix.lastIndexOf(" ");

      if (lastSpaceIndex === -1) {
        updateAssistant(
          "Please say the host name followed by the IP address."
        );
        return;
      }

      const hostName = commandWithoutPrefix
        .slice(0, lastSpaceIndex)
        .trim();

      const hostIp = commandWithoutPrefix
        .slice(lastSpaceIndex + 1)
        .trim();

      await createHost(hostName, hostIp);
      setVoiceCommand("");
      return;
    }

    if (command.startsWith("delete host ")) {
      const hostName = rawCommand
        .slice("delete host ".length)
        .trim();

      await deleteHostByName(hostName);
      setVoiceCommand("");
      return;
    }

    if (
      command === "list problems" ||
      command === "show problems"
    ) {
      await loadProblems();

      const activeProblems = problems.filter(
        (problem) => !problem.closed
      );

      if (activeProblems.length === 0) {
        updateAssistant(
          "There are no current problems in the system."
        );
      } else {
        const spokenProblems = activeProblems
          .slice(0, 5)
          .map(
            (problem) =>
              `Event ${problem.id}, host ${problem.host}, ${problem.problem}, severity ${problem.severity}`
          )
          .join(". ");

        updateAssistant(
          `There are ${activeProblems.length} current problems. ${spokenProblems}.`
        );
      }

      setVoiceCommand("");
      return;
    }

    if (command.startsWith("close problem ")) {
      const problemId = rawCommand
        .slice("close problem ".length)
        .trim();

      await closeProblemById(problemId);
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

  const openProblems = useMemo(
    () =>
      problems.filter((problem) => !problem.closed).length,
    [problems]
  );

  const backendClass =
    backendStatus === "UP" ? "status-up" : "status-down";

  return (
    <div className="dashboard">
      <h1 className="title">
        Smart Voice Assistant for Zabbix
      </h1>

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
          <p className={backendClass}>
            {backendStatus}
          </p>
        </div>
      </div>

      <div className="section">
        <h2>Voice Assistant Simulator</h2>

        <div className="voice-row">
          <input
            className="command-input"
            placeholder="Example: create host Server 2 192.168.1.20"
            value={voiceCommand}
            onChange={(event) =>
              setVoiceCommand(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                runVoiceCommand();
              }
            }}
          />

          <button type="button" onClick={runVoiceCommand}>
            Run Command
          </button>

          <button
            type="button"
            className={`mic-inline ${
              isListening ? "listening-inline" : ""
            }`}
            onClick={startListening}
            disabled={isListening}
          >
            {isListening ? "🎙 Listening" : "🎤 Speak"}
          </button>
        </div>

        <div className="assistant-box" role="status">
          Assistant says: <b>{assistantMessage}</b>
        </div>

        <p className="hint">
          Try: create host Server2 192.168.1.20 |
          delete host Server2 | list problems |
          close problem 101 | health check
        </p>
      </div>

      <div className="section">
        <h2>Create Host</h2>

        <input
          placeholder="Host Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isCreatingHost}
        />

        <input
          placeholder="IP Address"
          value={ip}
          onChange={(event) => setIp(event.target.value)}
          disabled={isCreatingHost}
        />

        <button
          type="button"
          onClick={() => createHost()}
          disabled={isCreatingHost}
        >
          {isCreatingHost ? "Creating..." : "Create"}
        </button>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Hosts</h2>

          <button
            type="button"
            onClick={loadHosts}
            disabled={isLoadingHosts}
          >
            {isLoadingHosts ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {isLoadingHosts ? (
          <p>Loading hosts...</p>
        ) : hosts.length === 0 ? (
          <p>No hosts found</p>
        ) : (
          hosts.map((host) => (
            <div className="host-row" key={host.id}>
              <span>
                <b>{host.name}</b> | {host.ip}
              </span>

              <button
                type="button"
                className="danger-button"
                onClick={() => deleteHost(host)}
                disabled={deletingHostId === host.id}
              >
                {deletingHostId === host.id
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Current Problems</h2>

          <button
            type="button"
            onClick={loadProblems}
            disabled={isLoadingProblems}
          >
            {isLoadingProblems
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {isLoadingProblems ? (
          <p>Loading problems...</p>
        ) : problems.length === 0 ? (
          <p>No problems found</p>
        ) : (
          problems.map((problem) => {
            const problemId =
              problem.id || problem.eventId;

            return (
              <div
                className="problem-row"
                key={problemId}
              >
                <span>
                  <b>{problem.host}</b> |{" "}
                  {problem.problem} | Severity:{" "}
                  <span
                    className={`severity severity-${String(
                      problem.severity
                    )
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    {problem.severity}
                  </span>{" "}
                  | Status:{" "}
                  <span
                    className={
                      problem.closed ? "closed" : "open"
                    }
                  >
                    {problem.closed ? "Closed" : "Open"}
                  </span>
                </span>

                {!problem.closed && (
                  <button
                    type="button"
                    onClick={() => closeProblem(problem)}
                    disabled={
                      !problem.canClose ||
                      closingProblemId === problemId
                    }
                    title={
                      problem.canClose
                        ? "Close this problem"
                        : "Manual close is not allowed"
                    }
                  >
                    {closingProblemId === problemId
                      ? "Closing..."
                      : problem.canClose
                        ? "Close Problem"
                        : "Cannot Close"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default App;