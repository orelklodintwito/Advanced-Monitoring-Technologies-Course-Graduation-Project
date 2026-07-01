import { useEffect, useState } from "react";

function App() {
  const [hosts, setHosts] = useState([]);
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");

  const loadHosts = async () => {
    const response = await fetch("http://localhost:5000/hosts");
    const data = await response.json();
    setHosts(data);
  };

  useEffect(() => {
    loadHosts();
  }, []);

  const createHost = async () => {
    await fetch("http://localhost:5000/create-host", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        ip,
      }),
    });

    setName("");
    setIp("");
    loadHosts();
  };

  const deleteHost = async (id) => {
    await fetch(`http://localhost:5000/delete-host/${id}`, {
      method: "DELETE",
    });

    loadHosts();
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>Zabbix Voice Assistant Dashboard</h1>

      <h2>Create Host</h2>

      <input
        placeholder="Host Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ marginRight: "10px" }}
      />

      <input
        placeholder="IP Address"
        value={ip}
        onChange={(e) => setIp(e.target.value)}
        style={{ marginRight: "10px" }}
      />

      <button onClick={createHost}>
        Create
      </button>

      <hr />

      <h2>Hosts</h2>

      {hosts.length === 0 ? (
        <p>No hosts found</p>
      ) : (
        hosts.map((host) => (
          <div key={host.id} style={{ marginBottom: "10px" }}>
            <strong>{host.name}</strong> | {host.ip}

            <button
              onClick={() => deleteHost(host.id)}
              style={{ marginLeft: "10px" }}
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default App;