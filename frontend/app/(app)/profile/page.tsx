"use client";

import { useState, useEffect } from "react";
import { api, SwimmerProfile } from "@/lib/api-client";
import { useToast } from "@/components/Toast";

const DIVISIONS = ["D1", "D2", "D3", "NAIA", "USports", "ACAC"];

export default function ProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState<SwimmerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Editable form state
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    birth_date: "",
    ffn_licence: "",
    height_cm: "",
    weight_kg: "",
    wingspan_cm: "",
    bac_mention: "",
    toefl_score: "",
    sat_score: "",
    target_majors: [] as string[],
    target_divisions: [] as string[],
    majorInput: "",
  });

  useEffect(() => {
    const swimmerId = localStorage.getItem("rise_swimmer_id");
    if (swimmerId) {
      api
        .getProfile(swimmerId)
        .then((p) => {
          setProfile(p);
          setForm({
            first_name: p.first_name || "",
            last_name: p.last_name || "",
            birth_date: p.birth_date || "",
            ffn_licence: p.ffn_licence || "",
            height_cm: p.height_cm ? String(p.height_cm) : "",
            weight_kg: p.weight_kg ? String(p.weight_kg) : "",
            wingspan_cm: p.wingspan_cm ? String(p.wingspan_cm) : "",
            bac_mention: p.bac_mention || "",
            toefl_score: p.toefl_score ? String(p.toefl_score) : "",
            sat_score: p.sat_score ? String(p.sat_score) : "",
            target_majors: p.target_majors || [],
            target_divisions: p.target_divisions || [],
            majorInput: "",
          });
        })
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDivision(div: string) {
    setForm((prev) => ({
      ...prev,
      target_divisions: prev.target_divisions.includes(div)
        ? prev.target_divisions.filter((d) => d !== div)
        : [...prev.target_divisions, div],
    }));
  }

  function addMajor() {
    const val = form.majorInput.trim();
    if (val && !form.target_majors.includes(val)) {
      setForm((prev) => ({ ...prev, target_majors: [...prev.target_majors, val], majorInput: "" }));
    }
  }

  function removeMajor(m: string) {
    setForm((prev) => ({ ...prev, target_majors: prev.target_majors.filter((x) => x !== m) }));
  }

  async function handleSave() {
    const swimmerId = localStorage.getItem("rise_swimmer_id");
    if (!swimmerId) return;
    setSaving(true);
    try {
      const updated = await api.patchProfile(swimmerId, {
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        birth_date: form.birth_date || undefined,
        ffn_licence: form.ffn_licence || undefined,
        height_cm: form.height_cm ? parseInt(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        wingspan_cm: form.wingspan_cm ? parseInt(form.wingspan_cm) : undefined,
        bac_mention: form.bac_mention || undefined,
        toefl_score: form.toefl_score ? parseInt(form.toefl_score) : undefined,
        sat_score: form.sat_score ? parseInt(form.sat_score) : undefined,
        target_majors: form.target_majors,
        target_divisions: form.target_divisions,
      });
      setProfile(updated);
      toast.success("Profil mis à jour");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncFFN() {
    const swimmerId = localStorage.getItem("rise_swimmer_id");
    if (!swimmerId) return;
    setSyncing(true);
    try {
      await api.syncFFN(swimmerId);
      toast.success("Synchronisation FFN lancée — les temps arriveront dans quelques secondes");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la synchronisation FFN");
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

  const sectionStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "1.5rem",
  };

  if (loading) {
    return <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>Chargement...</div>;
  }

  if (!profile) {
    return <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>Profil introuvable.</div>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "2rem" }}>Mon Profil</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Identity */}
        <section style={sectionStyle}>
          <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Identité & FFN</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input style={inputStyle} value={form.first_name} onChange={(e) => update("first_name", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input style={inputStyle} value={form.last_name} onChange={(e) => update("last_name", e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label style={labelStyle}>Date de naissance</label>
            <input type="date" style={inputStyle} value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label style={labelStyle}>Licence FFN</label>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={form.ffn_licence}
                onChange={(e) => update("ffn_licence", e.target.value)}
                placeholder="ex: 0123456"
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
                  opacity: syncing ? 0.7 : 1,
                }}
              >
                {syncing ? "Sync..." : "Sync FFN"}
              </button>
            </div>
          </div>
          {profile.is_minor && (
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
        <section style={sectionStyle}>
          <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Morphologie</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Taille (cm)</label>
              <input type="number" style={inputStyle} value={form.height_cm} onChange={(e) => update("height_cm", e.target.value)} placeholder="184" />
            </div>
            <div>
              <label style={labelStyle}>Poids (kg)</label>
              <input type="number" style={inputStyle} value={form.weight_kg} onChange={(e) => update("weight_kg", e.target.value)} placeholder="74.0" />
            </div>
            <div>
              <label style={labelStyle}>Envergure (cm)</label>
              <input type="number" style={inputStyle} value={form.wingspan_cm} onChange={(e) => update("wingspan_cm", e.target.value)} placeholder="192" />
            </div>
          </div>
        </section>

        {/* Academic */}
        <section style={sectionStyle}>
          <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Académique</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>Mention Bac</label>
              <select
                style={{ ...inputStyle }}
                value={form.bac_mention}
                onChange={(e) => update("bac_mention", e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                <option value="TB">Très Bien (≥ 16)</option>
                <option value="B">Bien (14–16)</option>
                <option value="AB">Assez Bien (12–14)</option>
                <option value="P">Passable (10–12)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>TOEFL</label>
              <input type="number" style={inputStyle} value={form.toefl_score} onChange={(e) => update("toefl_score", e.target.value)} placeholder="ex: 92" />
            </div>
            <div>
              <label style={labelStyle}>SAT</label>
              <input type="number" style={inputStyle} value={form.sat_score} onChange={(e) => update("sat_score", e.target.value)} placeholder="ex: 1200" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Filières cibles</label>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                style={{ ...inputStyle }}
                value={form.majorInput}
                onChange={(e) => update("majorInput", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMajor(); } }}
                placeholder="ex: Business (Entrée pour ajouter)"
              />
              <button
                type="button"
                onClick={addMajor}
                style={{
                  background: "var(--blue)",
                  border: "none",
                  color: "#fff",
                  padding: "0 1rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Ajouter
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {form.target_majors.map((m) => (
                <span
                  key={m}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    background: "var(--navy-mid)",
                    border: "1px solid var(--border)",
                    borderRadius: "999px",
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.8rem",
                  }}
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => removeMajor(m)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1rem", padding: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Divisions */}
        <section style={sectionStyle}>
          <h2 style={{ fontWeight: 700, marginBottom: "1.25rem", fontSize: "1rem" }}>Divisions cibles</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {DIVISIONS.map((div) => (
              <button
                key={div}
                type="button"
                onClick={() => toggleDivision(div)}
                style={{
                  padding: "0.375rem 0.875rem",
                  borderRadius: "999px",
                  border: "1px solid var(--border)",
                  background: form.target_divisions.includes(div) ? "var(--red)" : "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: form.target_divisions.includes(div) ? 600 : 400,
                }}
              >
                {div}
              </button>
            ))}
          </div>
          <p style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            USports et ACAC = équivalents canadiens
          </p>
        </section>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: "var(--red)",
            border: "none",
            color: "#fff",
            padding: "1rem",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}
