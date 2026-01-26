import { useEffect, useState } from "react";

function App() {
  const [apiStatus, setApiStatus] = useState<string>("Checking...");

  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch("/api/v1/health");
        if (!res.ok) throw new Error("Bad status");
        const data = (await res.json()) as { status?: string };
        setApiStatus(data.status ?? "ok");
      } catch (err) {
        console.error(err);
        setApiStatus("unreachable");
      }
    };

    void ping();
  }, []);

  return (
    <div className="card">
      <div className="header">
        <div>
          <div className="tag">EcoLearnAI • Full-stack</div>
          <h1>FastAPI + React scaffold</h1>
          <p className="status">Backend health: {apiStatus}</p>
        </div>
      </div>

      <div className="grid">
        <div className="tile">
          <strong>Backend</strong>
          <p>FastAPI served via Uvicorn with an async SQLAlchemy setup ready for Postgres.</p>
        </div>
        <div className="tile">
          <strong>Frontend</strong>
          <p>React + Vite + TypeScript with a health check wired to the API.</p>
        </div>
        <div className="tile">
          <strong>Database</strong>
          <p>Postgres container exposed internally at db:5432 with persistent volume.</p>
        </div>
        <div className="tile">
          <strong>Containers</strong>
          <p>Docker compose bundles web, api, and db for local dev and CI smoke tests.</p>
        </div>
      </div>

      <div className="cta">
        <button onClick={() => window.open("https://fastapi.tiangolo.com", "_blank")}>FastAPI docs</button>
        <button className="secondary" onClick={() => window.open("https://vitejs.dev", "_blank")}>
          Vite guide
        </button>
      </div>
    </div>
  );
}

export default App;
