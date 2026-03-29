"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    ffn_licence: "",
    birth_date: "",
    // Step 2
    height_cm: "",
    weight_kg: "",
    wingspan_cm: "",
    // Step 3
    bac_mention: "",
    target_majors: "",
    toefl_score: "",
    sat_score: "",
    // Step 4
    target_divisions: [] as string[],
    // Consent
    rgpd_consent: false,
    parent_consent: false,
    parent_email: "",
  });

  const birthDate = form.birth_date ? new Date(form.birth_date) : null;
  const isMinor = birthDate
    ? (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000) < 18
    : false;

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

  async function handleFinish() {
    setLoading(true);
    setError("");
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        ffn_licence: form.ffn_licence || undefined,
        birth_date: form.birth_date || undefined,
        height_cm: form.height_cm ? parseInt(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        wingspan_cm: form.wingspan_cm ? parseInt(form.wingspan_cm) : undefined,
        bac_mention: form.bac_mention || undefined,
        target_majors: form.target_majors ? form.target_majors.split(",").map((s) => s.trim()) : undefined,
        toefl_score: form.toefl_score ? parseInt(form.toefl_score) : undefined,
        sat_score: form.sat_score ? parseInt(form.sat_score) : undefined,
        target_divisions: form.target_divisions,
        rgpd_consent: form.rgpd_consent,
        parent_consent: isMinor ? form.parent_consent : true,
      };

      const result = await api.updateProfile(payload);
      localStorage.setItem("swimmer_id", result.id);
      localStorage.setItem("token", "demo-token");
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--navy)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "2.5rem",
          width: "100%",
          maxWidth: "500px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
            RISE<span style={{ color: "var(--red)" }}>.</span>MATCH
          </Link>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem", marginBottom: "1rem" }}>
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: s <= step ? "var(--red)" : "var(--navy-mid)",
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Étape {step} sur 4
          </p>
        </div>

        {/* Step 1: Identité */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.25rem" }}>Identité & Licence FFN</h2>
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
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Date de naissance</label>
              <input type="date" style={inputStyle} value={form.birth_date} onChange={(e) => update("birth_date", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Numéro de licence FFN (optionnel)</label>
              <input style={inputStyle} value={form.ffn_licence} onChange={(e) => update("ffn_licence", e.target.value)} placeholder="ex: 0123456" />
            </div>

            {isMinor && (
              <div
                style={{
                  background: "rgba(192,57,43,0.1)",
                  border: "1px solid var(--red)",
                  borderRadius: "8px",
                  padding: "1rem",
                }}
              >
                <p style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                  Tu es mineur(e). Le consentement parental est obligatoire.
                </p>
                <div>
                  <label style={labelStyle}>Email du parent/tuteur</label>
                  <input
                    type="email"
                    style={inputStyle}
                    value={form.parent_email}
                    onChange={(e) => update("parent_email", e.target.value)}
                  />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.875rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.parent_consent}
                    onChange={(e) => update("parent_consent", e.target.checked)}
                  />
                  Mon parent/tuteur consent au traitement de mes données
                </label>
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
              <input type="checkbox" checked={form.rgpd_consent} onChange={(e) => update("rgpd_consent", e.target.checked)} />
              J&apos;accepte le traitement de mes données (RGPD)
            </label>
          </div>
        )}

        {/* Step 2: Morpho */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.25rem" }}>Morphologie</h2>
            {[
              { label: "Taille (cm)", field: "height_cm", placeholder: "184" },
              { label: "Poids (kg)", field: "weight_kg", placeholder: "74.0" },
              { label: "Envergure (cm)", field: "wingspan_cm", placeholder: "192" },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={form[field as keyof typeof form] as string}
                  onChange={(e) => update(field, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Ces données améliorent la projection de potentiel et le score relais.
            </p>
          </div>
        )}

        {/* Step 3: Académique */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.25rem" }}>Profil académique</h2>
            <div>
              <label style={labelStyle}>Mention au Bac</label>
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
              <label style={labelStyle}>Filières cibles (séparées par des virgules)</label>
              <input
                style={inputStyle}
                value={form.target_majors}
                onChange={(e) => update("target_majors", e.target.value)}
                placeholder="ex: Business, Biology, Sport Science"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>TOEFL (optionnel)</label>
                <input type="number" style={inputStyle} value={form.toefl_score} onChange={(e) => update("toefl_score", e.target.value)} placeholder="ex: 92" />
              </div>
              <div>
                <label style={labelStyle}>SAT (optionnel)</label>
                <input type="number" style={inputStyle} value={form.sat_score} onChange={(e) => update("sat_score", e.target.value)} placeholder="ex: 1200" />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Préférences */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.25rem" }}>Préférences</h2>
            <div>
              <label style={labelStyle}>Divisions cibles</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                {["D1", "D2", "D3", "NAIA", "USports", "ACAC"].map((div) => (
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
                    }}
                  >
                    {div}
                  </button>
                ))}
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              USports et ACAC sont les équivalents canadiens. Pas de période morte pour les emails au Canada.
            </p>
          </div>
        )}

        {error && (
          <p style={{ color: "var(--red)", fontSize: "0.875rem", marginTop: "1rem" }}>{error}</p>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              style={{
                flex: 1,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "#fff",
                padding: "0.875rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Retour
            </button>
          )}
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              style={{
                flex: 2,
                background: "var(--red)",
                border: "none",
                color: "#fff",
                padding: "0.875rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              style={{
                flex: 2,
                background: "var(--red)",
                border: "none",
                color: "#fff",
                padding: "0.875rem",
                borderRadius: "8px",
                cursor: loading ? "wait" : "pointer",
                fontWeight: 600,
              }}
            >
              {loading ? "Création..." : "Calculer mes matchs"}
            </button>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          Déjà un compte ?{" "}
          <Link href="/login" style={{ color: "var(--blue)" }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
