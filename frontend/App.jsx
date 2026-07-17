import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function App() {
  const [hosts, setHosts] = useState([]);
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingHost, setDeletingHost] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadHosts = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/hosts`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load hosts");
      }

      setHosts(Array.isArray(data.hosts) ? data.hosts : []);
    } catch (requestError) {
      console.error("Failed to load hosts:", requestError);
      setHosts([]);
      setError(
        requestError.message ||
          "Could not connect to the backend server"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHosts();
  }, []);

  const createHost = async () => {
    const normalizedName = name.trim();
    const normalizedIp = ip.trim();

    setMessage("");
    setError("");

    if (!normalizedName) {
      setError("Host name is required");
      return;
    }

    if (!normalizedIp) {
      setError("IP address is required");
      return;
    }

    setSubmitting(true);

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create host");
      }

      setMessage(
        data.message ||
          `Host "${normalizedName}" was created successfully`
      );

      setName("");
      setIp("");

      await loadHosts();
    } catch (requestError) {
      console.error("Failed to create host:", requestError);
      setError(
        requestError.message || "Failed to create host"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteHost = async (host) => {
    const hostName = host.technicalName || host.name;

    const confirmed = window.confirm(
      `Are you sure you want to delete host "${host.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");
    setDeletingHost(host.id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/hosts/${encodeURIComponent(
          hostName
        )}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete host");
      }

      setMessage(
        data.message ||
          `Host "${host.name}" was deleted successfully`
      );

      await loadHosts();
    } catch (requestError) {
      console.error("Failed to delete host:", requestError);
      setError(
        requestError.message || "Failed to delete host"
      );
    } finally {
      setDeletingHost(null);
    }
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    createHost();
  };

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "30px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <h1>Zabbix Voice Assistant Dashboard</h1>

      {message && (
        <div
          role="status"
          style={{
            padding: "12px",
            marginBottom: "20px",
            border: "1px solid green",
            borderRadius: "6px"
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px",
            marginBottom: "20px",
            border: "1px solid red",
            borderRadius: "6px"
          }}
        >
          {error}
        </div>
      )}

      <section>
        <h2>Create Host</h2>

        <form onSubmit={handleFormSubmit}>
          <label
            htmlFor="host-name"
            style={{
              display: "block",
              marginBottom: "6px"
            }}
          >
            Host name
          </label>

          <input
            id="host-name"
            type="text"
            placeholder="Server1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={submitting}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "400px",
              padding: "10px",
              marginBottom: "14px"
            }}
          />

          <label
            htmlFor="host-ip"
            style={{
              display: "block",
              marginBottom: "6px"
            }}
          >
            IP address
          </label>

          <input
            id="host-ip"
            type="text"
            placeholder="192.168.56.13"
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            disabled={submitting}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "400px",
              padding: "10px",
              marginBottom: "14px"
            }}
          />

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Host"}
          </button>
        </form>
      </section>

      <hr style={{ margin: "30px 0" }} />

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <h2>Hosts</h2>

          <button
            type="button"
            onClick={loadHosts}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p>Loading hosts...</p>
        ) : hosts.length === 0 ? (
          <p>No hosts found.</p>
        ) : (
          hosts.map((host) => (
            <article
              key={host.id}
              style={{
                padding: "14px",
                marginBottom: "10px",
                border: "1px solid #cccccc",
                borderRadius: "6px"
              }}
            >
              <div>
                <strong>{host.name}</strong>
              </div>

              <div>IP: {host.ip || "N/A"}</div>

              <div>
                Status: {host.enabled ? "Enabled" : "Disabled"}
              </div>

              <button
                type="button"
                onClick={() => deleteHost(host)}
                disabled={deletingHost === host.id}
                style={{ marginTop: "10px" }}
              >
                {deletingHost === host.id
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default App;