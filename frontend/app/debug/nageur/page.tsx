"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://rise-match-production.up.railway.app";

const EVENTS = [
  "50FR","100FR","200FR","400FR","800FR","1500FR",
  "100BA","200BA","100BR","200BR","100FL","200FL","200IM","400IM",
];

export default function DebugNageurPage() {
  const [name, setName]     = useState("");
  const [event, setEvent]   = useState("100BR");
  const [basin, setBasin]   = useState("LCM");
  const [country, setCountry] = useState("FRA");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<unknown>(null);
  const [error, setError]     = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    setError(null);
    const t0 = Date.now();

    const params = new URLSearchParams({ event, basin, country });
    if (name.trim()) params.set("name", name.trim());

    try {
      const r = await fetch(`${API}/api/debug/swimmer?${params}`);
      const data = await r.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setElapsed(Date.now() - t0);
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "monospace", padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>
        DEBUG — World Aquatics API
      </h1>
      <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "1.5rem" }}>
        Phase 1 validation · <code>{API}/api/debug/swimmer</code>
      </p>

      {/* Controls */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "1rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.8rem" }}>
          Nom du nageur
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ex: Manaudou, Marchand"
            style={{ padding: "0.4rem 0.6rem", border: "1px solid #ccc", borderRadius: 4, fontSize: "0.85rem", width: 200 }}
            onKeyDown={e => e.key === "Enter" && run()}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.8rem" }}>
          Épreuve
          <select
            value={event}
            onChange={e => setEvent(e.target.value)}
            style={{ padding: "0.4rem 0.6rem", border: "1px solid #ccc", borderRadius: 4, fontSize: "0.85rem" }}
          >
            {EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.8rem" }}>
          Bassin
          <select
            value={basin}
            onChange={e => setBasin(e.target.value)}
            style={{ padding: "0.4rem 0.6rem", border: "1px solid #ccc", borderRadius: 4, fontSize: "0.85rem" }}
          >
            <option value="LCM">LCM (50m)</option>
            <option value="SCM">SCM (25m)</option>
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.8rem" }}>
          Pays
          <input
            value={country}
            onChange={e => setCountry(e.target.value.toUpperCase())}
            maxLength={3}
            style={{ padding: "0.4rem 0.6rem", border: "1px solid #ccc", borderRadius: 4, fontSize: "0.85rem", width: 70 }}
          />
        </label>

        <button
          onClick={run}
          disabled={loading}
          style={{
            padding: "0.45rem 1.2rem", background: loading ? "#aaa" : "#1a56db",
            color: "#fff", border: "none", borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer", fontSize: "0.85rem",
          }}
        >
          {loading ? "…" : "Rechercher"}
        </button>
      </div>

      {/* Status bar */}
      {elapsed !== null && (
        <p style={{ fontSize: "0.75rem", color: "#888", marginBottom: "0.5rem" }}>
          Réponse en {elapsed}ms
          {result && typeof result === "object" && (result as Record<string,unknown>).swimmer && (
            <> · nageur trouvé : <strong>{String((result as Record<string,unknown>).swimmer && ((result as Record<string,unknown>).swimmer as Record<string,unknown>).name)}</strong></>
          )}
          {result && typeof result === "object" && Array.isArray((result as Record<string,unknown>).results) && (
            <> · {((result as Record<string,unknown>).results as unknown[]).length} résultats</>
          )}
          {result && typeof result === "object" && Array.isArray((result as Record<string,unknown>).times) && (
            <> · {((result as Record<string,unknown>).times as unknown[]).length} temps trouvés</>
          )}
        </p>
      )}

      {error && (
        <pre style={{
          background: "#fff0f0", border: "1px solid #f99", borderRadius: 4,
          padding: "0.75rem", fontSize: "0.8rem", color: "#c00", marginBottom: "1rem",
        }}>
          ❌ {error}
        </pre>
      )}

      {/* Raw JSON output */}
      {result !== null && (
        <pre style={{
          background: "#f6f8fa", border: "1px solid #ddd", borderRadius: 4,
          padding: "1rem", fontSize: "0.75rem", overflow: "auto",
          maxHeight: 600, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
