"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    const swimmerId = localStorage.getItem("swimmer_id");
    if (swimmerId) {
      api
        .getProfile(swimmerId)
        .then(setProfile)
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function handleSyncFFN() {
    const swimmerId = localStorage.getItem("swimmer_id");
    if (!swimmerId) return;
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await api.syncFFN(swimmerId);
      setSyncMsg(`Synchronisation lancée (job: ${res.job_id}). Les temps arriveront dans quelques secondes.`);
    } catch {
      setSyncMsg("Erreur lors de la synchronisation FFN.");
    } finally {
      setSyncing(false);
    }
  }

  const inputStyle = {
    width: "100%",
    background: "var(--navy-mid)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    padding: "0.75rem",
    color: "var(--text-primary)",
    fontSize: "0.875rem",
    outline: "none",
  };

  const labelStyle = {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    display: "block",
    marginBottom: "0.375rem",
  };

  if (loading) {
    return <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "2rem" }}>Mon Profil</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Identity */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Identité & FFN</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input
                style={inputStyle}
                defaultValue={profile?.first_name as string || ""}
                readOnly
              />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input style={inputStyle} defaultValue={profile?.last_name as string || ""} readOnly />
            </div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label style={labelStyle}>Licence FFN</label>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                defaultValue={profile?.ffn_licence as string || ""}
                readOnly
              />
              <button
                onClick={handleSyncFFN}
                disabled={syncing}
                style={{
                  background: "var(--blue)",
                  border: "none",
                  color: "#fff",
                  padding: "0.75rem 1.25rem",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: syncing ? "wait" : "pointer",
                  fontSize: "0.875rem",
                  whiteSpace: "nowrap",
                }}
              >
                {syncing ? "Sync..." : "Sync FFN"}
              </button>
            </div>
            {syncMsg && (
              <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--teal)" }}>
                {syncMsg}
              </p>
            )}
          </div>
          {profile?.is_minor && (
            <div
              style={{
                marginTop: "1rem",
                background: "rgba(192,57,43,0.1)",
                border: "1px solid rgba(192,57,43,0.3)",
                borderRadius: "8px",
                padding: "0.75rem",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
              }}
            >
              Profil mineur — consentement parental enregistré.
            </div>
          )}
        </section>

        {/* Morpho */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Morphologie</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            {[
              { label: "Taille (cm)", val: profile?.height_cm },
              { label: "Poids (kg)", val: profile?.weight_kg },
              { label: "Envergure (cm)", val: profile?.wingspan_cm },
            ].map(({ label, val }) => (
              <div key={label}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} defaultValue={val as string || ""} readOnly />
              </div>
            ))}
          </div>
        </section>

        {/* Academic */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Académique</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Mention Bac</label>
              <input style={inputStyle} defaultValue={profile?.bac_mention as string || ""} readOnly />
            </div>
            <div>
              <label style={labelStyle}>Filières cibles</label>
              <input
                style={inputStyle}
                defaultValue={
                  Array.isArray(profile?.target_majors)
                    ? (profile.target_majors as string[]).join(", ")
                    : ""
                }
                readOnly
              />
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Divisions cibles</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {(Array.isArray(profile?.target_divisions) ? profile.target_divisions as string[] : []).map((div) => (
              <span
                key={div}
                style={{
                  padding: "0.375rem 0.875rem",
                  borderRadius: "999px",
                  background: "var(--red)",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                {div}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
