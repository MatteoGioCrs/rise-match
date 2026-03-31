"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchResult {
  rank: number;
  university: string;
  division: string;
  conference: string;
  location: string;
  country: string;
  fit_score: number;
  scholarship_est: number;
  scores: {
    vacancy: number;
    conference: number;
    conversion: number;
    relay: number;
    academic: number;
    progression: number;
  };
  vacancy_detail: {
    is_priority: boolean;
    seniors_leaving: string[];
    events_vacating: string[];
  };
  coach_email: string;
  email_subject: string;
  email_body: string;
}

interface DemoResponse {
  swimmer: {
    name: string;
    age: number;
    times_lcm: Record<string, string>;
    times_scy: Record<string, string>;
    source: string;
    ffn_error: string | null;
  };
  matches: MatchResult[];
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTimeToSeconds(display: string): number | null {
  if (!display.trim()) return null;
  if (display.includes(":")) {
    const [min, sec] = display.split(":");
    const v = parseFloat(min) * 60 + parseFloat(sec);
    return isNaN(v) ? null : v;
  }
  const v = parseFloat(display);
  return isNaN(v) ? null : v;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#1D9E75";
  if (score >= 60) return "#E67E22";
  return "#C0392B";
}

function countryFlag(country: string): string {
  return country === "USA" ? "🇺🇸" : country === "CAN" ? "🇨🇦" : "🌍";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
      <span style={{ color: "rgba(255,255,255,0.5)", width: 72, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: scoreColor(value), borderRadius: 4, transition: "width 0.4s" }} />
      </div>
      <span style={{ color: "rgba(255,255,255,0.6)", width: 28, textAlign: "right" }}>{Math.round(value)}</span>
    </div>
  );
}

function MatchCard({ match }: { match: MatchResult }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  function copy(text: string, which: "subject" | "body") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const scoreEntries: [string, number][] = [
    ["Vacance", match.scores.vacancy],
    ["Conf.", match.scores.conference],
    ["Conversion", match.scores.conversion],
    ["Relais", match.scores.relay],
    ["Acad.", match.scores.academic],
    ["Progression", match.scores.progression],
  ];

  return (
    <div
      style={{
        background: "#111827",
        border: `1px solid ${match.vacancy_detail.is_priority ? "rgba(192,57,43,0.5)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>
              {countryFlag(match.country)} {match.university}
            </span>
            {match.vacancy_detail.is_priority && (
              <span style={{ background: "rgba(192,57,43,0.2)", color: "#C0392B", fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, border: "1px solid rgba(192,57,43,0.4)" }}>
                Vacance critique
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.375rem", flexWrap: "wrap" }}>
            <span style={{ background: "rgba(46,134,193,0.15)", color: "#2E86C1", fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 4 }}>
              {match.division}
            </span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem" }}>{match.conference}</span>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.72rem" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem" }}>{match.location}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: scoreColor(match.fit_score), lineHeight: 1 }}>
            {match.fit_score}%
          </div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "0.2rem" }}>
            Bourse ~{match.scholarship_est}%
          </div>
        </div>
      </div>

      {/* Vacancy detail */}
      {match.vacancy_detail.seniors_leaving.length > 0 && (
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", borderLeft: "2px solid rgba(192,57,43,0.4)", paddingLeft: "0.625rem" }}>
          {match.vacancy_detail.seniors_leaving.join(", ")} partent en avril
          {match.vacancy_detail.events_vacating.length > 0 && (
            <> · libèrent {match.vacancy_detail.events_vacating.join(", ")}</>
          )}
        </div>
      )}

      {/* Score bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {scoreEntries.map(([label, val]) => (
          <ScoreBar key={label} label={label} value={val} />
        ))}
      </div>

      {/* Email toggle */}
      <button
        type="button"
        onClick={() => setEmailOpen((v) => !v)}
        style={{
          background: "none",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.6)",
          borderRadius: 6,
          padding: "0.4rem 0.75rem",
          fontSize: "0.8rem",
          cursor: "pointer",
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
        }}
      >
        {emailOpen ? "▲" : "▼"} Voir l&apos;email généré
      </button>

      {emailOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {/* Subject */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "0.625rem 0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Objet</span>
              <button
                type="button"
                onClick={() => copy(match.email_subject, "subject")}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.75rem" }}
              >
                {copied === "subject" ? "✓ Copié !" : "Copier"}
              </button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.8)", wordBreak: "break-word" }}>{match.email_subject}</p>
          </div>

          {/* Body */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "0.625rem 0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Corps</span>
              <button
                type="button"
                onClick={() => copy(match.email_body, "body")}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.75rem" }}
              >
                {copied === "body" ? "✓ Copié !" : "Copier"}
              </button>
            </div>
            <pre style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", margin: 0 }}>
              {match.email_body}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const EVENT_FIELDS: { label: string; field: string; placeholder: string }[] = [
  { label: "100m Brasse", field: "time100BR", placeholder: "1:02.41" },
  { label: "200m Brasse", field: "time200BR", placeholder: "2:16.03" },
  { label: "100m Nage libre", field: "time100FR", placeholder: "55.20" },
  { label: "200m Nage libre", field: "time200FR", placeholder: "2:00.50" },
  { label: "100m Dos", field: "time100BA", placeholder: "1:00.10" },
  { label: "100m Papillon", field: "time100FL", placeholder: "58.80" },
  { label: "200m 4 nages", field: "time200IM", placeholder: "2:15.00" },
];

const DIVISIONS = ["D1", "D2", "D3", "NAIA", "USports CA", "ACAC CA"];

export default function DemoPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "M",
    ffnLicence: "",
    time100BR: "",
    time200BR: "",
    time100FR: "",
    time200FR: "",
    time100BA: "",
    time100FL: "",
    time200IM: "",
    height: "",
    weight: "",
    wingspan: "",
    bacMention: "",
    majorInput: "",
    majors: [] as string[],
    divisions: [] as string[],
  });

  const [ffnStatus, setFfnStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [ffnMessage, setFfnMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<DemoResponse | null>(null);

  // Division display filter (client-side, applied to results)
  const [divFilter, setDivFilter] = useState<string[]>([]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDivision(div: string) {
    setForm((prev) => ({
      ...prev,
      divisions: prev.divisions.includes(div)
        ? prev.divisions.filter((d) => d !== div)
        : [...prev.divisions, div],
    }));
  }

  function addMajor() {
    const val = form.majorInput.trim();
    if (val && !form.majors.includes(val)) {
      setForm((prev) => ({ ...prev, majors: [...prev.majors, val], majorInput: "" }));
    }
  }

  async function handleFFNSync() {
    if (!form.ffnLicence.trim()) return;
    setFfnStatus("loading");
    setFfnMessage("");
    try {
      const res = await fetch(`${API_URL}/api/demo/ffn-sync?licence=${encodeURIComponent(form.ffnLicence.trim())}`);
      const data = await res.json();
      if (data.ok) {
        const fieldMap: Record<string, string> = {
          event_100br_lcm: "time100BR",
          event_200br_lcm: "time200BR",
          event_100fr_lcm: "time100FR",
          event_200fr_lcm: "time200FR",
          event_100ba_lcm: "time100BA",
          event_100fl_lcm: "time100FL",
          event_200im_lcm: "time200IM",
        };
        const updates: Record<string, string> = {};
        for (const [apiKey, formKey] of Object.entries(fieldMap)) {
          if (data.times_display && data.times_display[apiKey.replace("event_", "").replace("_lcm", "").toUpperCase().replace("BR", "BR").replace("FR", "FR").replace("BA", "BA").replace("FL", "FL").replace("IM", "IM")]) {
            // use times_display which is keyed by event code like "100BR"
          }
          if (data.times && data.times[apiKey] !== undefined) {
            const secs = data.times[apiKey] as number;
            const mins = Math.floor(secs / 60);
            const rem = (secs % 60).toFixed(2).padStart(5, "0");
            updates[formKey] = mins > 0 ? `${mins}:${rem}` : `${secs.toFixed(2)}`;
          }
        }
        setForm((prev) => ({ ...prev, ...updates }));
        setFfnStatus("ok");
        setFfnMessage("Temps récupérés depuis Extranat");
      } else {
        setFfnStatus("error");
        setFfnMessage(data.error || "Licence FFN non trouvée.");
      }
    } catch {
      setFfnStatus("error");
      setFfnMessage("Erreur de connexion au backend.");
    }
  }

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.age) {
      setError("Prénom, nom et âge sont requis.");
      return;
    }
    setError("");
    setLoading(true);
    setResults(null);

    try {
      const body = {
        first_name: form.firstName,
        last_name: form.lastName,
        age: parseInt(form.age),
        gender: form.gender,
        ffn_licence: form.ffnLicence || null,
        event_100br_lcm: parseTimeToSeconds(form.time100BR),
        event_200br_lcm: parseTimeToSeconds(form.time200BR),
        event_100fr_lcm: parseTimeToSeconds(form.time100FR),
        event_200fr_lcm: parseTimeToSeconds(form.time200FR),
        event_100ba_lcm: parseTimeToSeconds(form.time100BA),
        event_100fl_lcm: parseTimeToSeconds(form.time100FL),
        event_200im_lcm: parseTimeToSeconds(form.time200IM),
        height_cm: form.height ? parseInt(form.height) : null,
        weight_kg: form.weight ? parseFloat(form.weight) : null,
        wingspan_cm: form.wingspan ? parseInt(form.wingspan) : null,
        bac_mention: form.bacMention || null,
        target_majors: form.majors.length ? form.majors : null,
        target_divisions: form.divisions.length ? form.divisions : null,
      };

      const res = await fetch(`${API_URL}/api/demo/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Erreur ${res.status}`);
      }

      const data: DemoResponse = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
        // Set division display filter to match what user selected
        setDivFilter(form.divisions);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de connexion. Vérifie que le backend est accessible.");
    } finally {
      setLoading(false);
    }
  }

  // Apply client-side division filter to displayed results
  const visibleMatches = results?.matches.filter((m) => {
    if (divFilter.length === 0) return true;
    // normalize: "USports CA" → "USports", "ACAC CA" → "ACAC"
    const div = m.division;
    return divFilter.some((f) => f.replace(" CA", "") === div.replace(" CA", ""));
  }) ?? [];

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#1B2A4A",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "0.625rem 0.75rem",
    color: "#fff",
    fontSize: "0.875rem",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.8rem",
    color: "rgba(255,255,255,0.5)",
    display: "block",
    marginBottom: "0.3rem",
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.35)",
    marginBottom: "0.75rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#fff", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.05em" }}>
          RISE<span style={{ color: "#C0392B" }}>.</span>MATCH
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", padding: "0.2rem 0.6rem", borderRadius: 999 }}>
            Demo — sans compte
          </span>
          <Link href="/register" style={{ background: "#C0392B", color: "#fff", padding: "0.45rem 1rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600 }}>
            Créer un compte
          </Link>
        </div>
      </nav>

      {/* Main layout */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 57px)", gap: 0 }}>

        {/* ── Left panel: Form ── */}
        <div style={{ width: 380, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Profile */}
          <div>
            <p style={sectionTitle}>Ton profil nageur</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <div>
                  <label style={labelStyle}>Prénom</label>
                  <input style={inputStyle} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Lucas" />
                </div>
                <div>
                  <label style={labelStyle}>Nom</label>
                  <input style={inputStyle} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Mercier" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                <div>
                  <label style={labelStyle}>Âge</label>
                  <input type="number" min={14} max={25} style={inputStyle} value={form.age} onChange={(e) => update("age", e.target.value)} placeholder="17" />
                </div>
                <div>
                  <label style={labelStyle}>Genre</label>
                  <select style={inputStyle} value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Times */}
          <div>
            <p style={sectionTitle}>Tes temps</p>

            {/* FFN sync */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={form.ffnLicence}
                onChange={(e) => update("ffnLicence", e.target.value)}
                placeholder="Licence FFN (optionnel)"
              />
              <button
                type="button"
                onClick={handleFFNSync}
                disabled={ffnStatus === "loading" || !form.ffnLicence.trim()}
                style={{
                  background: "#1B2A4A",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: ffnStatus === "loading" ? "rgba(255,255,255,0.35)" : "#fff",
                  borderRadius: 8,
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.78rem",
                  cursor: ffnStatus === "loading" ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {ffnStatus === "loading" ? "..." : "Sync FFN"}
              </button>
            </div>

            {ffnStatus === "ok" && (
              <div style={{ fontSize: "0.78rem", color: "#1D9E75", marginBottom: "0.625rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                ✓ {ffnMessage}
              </div>
            )}
            {ffnStatus === "error" && (
              <div style={{ fontSize: "0.78rem", color: "#C0392B", marginBottom: "0.625rem" }}>
                {ffnMessage}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {EVENT_FIELDS.map(({ label, field, placeholder }) => (
                <div key={field} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <label style={{ ...labelStyle, width: 120, flexShrink: 0, marginBottom: 0 }}>{label}</label>
                  <div style={{ flex: 1 }}>
                    <input
                      style={inputStyle}
                      value={form[field as keyof typeof form] as string}
                      onChange={(e) => update(field, e.target.value)}
                      placeholder={placeholder}
                    />
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>LCM</span>
                </div>
              ))}
            </div>
          </div>

          {/* Morphology */}
          <div>
            <p style={sectionTitle}>Morphologie (optionnel)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              {[
                { label: "Taille cm", field: "height", placeholder: "184" },
                { label: "Poids kg", field: "weight", placeholder: "74" },
                { label: "Envergure", field: "wingspan", placeholder: "192" },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  <input type="number" style={inputStyle} value={form[field as keyof typeof form] as string} onChange={(e) => update(field, e.target.value)} placeholder={placeholder} />
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div>
            <p style={sectionTitle}>Préférences</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

              {/* Divisions */}
              <div>
                <label style={labelStyle}>Divisions cibles (filtre)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.25rem" }}>
                  {DIVISIONS.map((div) => (
                    <button
                      key={div}
                      type="button"
                      onClick={() => toggleDivision(div)}
                      style={{
                        padding: "0.3rem 0.7rem",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: form.divisions.includes(div) ? "#C0392B" : "transparent",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        fontWeight: form.divisions.includes(div) ? 600 : 400,
                      }}
                    >
                      {div}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bac mention */}
              <div>
                <label style={labelStyle}>Mention au Bac</label>
                <select style={inputStyle} value={form.bacMention} onChange={(e) => update("bacMention", e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  <option value="TB">Très Bien (≥ 16)</option>
                  <option value="B">Bien (14–16)</option>
                  <option value="AB">Assez Bien (12–14)</option>
                  <option value="P">Passable (10–12)</option>
                </select>
              </div>

              {/* Majors */}
              <div>
                <label style={labelStyle}>Filières souhaitées</label>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={form.majorInput}
                    onChange={(e) => update("majorInput", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addMajor()}
                    placeholder="ex: Business, Biology…"
                  />
                  <button
                    type="button"
                    onClick={addMajor}
                    style={{ background: "#1B2A4A", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 8, padding: "0 0.75rem", cursor: "pointer", fontSize: "1rem" }}
                  >
                    +
                  </button>
                </div>
                {form.majors.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.5rem" }}>
                    {form.majors.map((m) => (
                      <span key={m} style={{ background: "rgba(46,134,193,0.15)", border: "1px solid rgba(46,134,193,0.3)", color: "#2E86C1", fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: 999, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        {m}
                        <button type="button" onClick={() => setForm((prev) => ({ ...prev, majors: prev.majors.filter((x) => x !== m) }))} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CTA */}
          {error && (
            <p style={{ color: "#C0392B", fontSize: "0.82rem", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 8, padding: "0.625rem 0.75rem" }}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading ? "rgba(192,57,43,0.5)" : "#C0392B",
              border: "none",
              color: "#fff",
              padding: "0.875rem",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            {loading ? (
              <>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Calcul en cours…
              </>
            ) : (
              "Calculer mes matchs →"
            )}
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* ── Right panel: Results ── */}
        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          {!results && !loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
              <div style={{ fontSize: "3rem" }}>🏊</div>
              <p style={{ fontSize: "1rem", maxWidth: 320 }}>
                Remplis le formulaire et clique sur <strong style={{ color: "rgba(255,255,255,0.4)" }}>Calculer</strong> pour voir tes matchs.
              </p>
              <p style={{ fontSize: "0.8rem", maxWidth: 280 }}>
                Aucun compte requis. Les résultats sont calculés en temps réel avec l&apos;algorithme complet.
              </p>
            </div>
          )}

          {results && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 760 }}>

              {/* FFN error banner */}
              {results.swimmer.ffn_error && (
                <div style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#C0392B" }}>
                  {results.swimmer.ffn_error}
                </div>
              )}

              {/* Swimmer summary */}
              <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.2rem" }}>{results.swimmer.name}</h2>
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>{results.swimmer.age} ans</p>
                  </div>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: 999,
                    background: results.swimmer.source === "FFN Extranat" ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${results.swimmer.source === "FFN Extranat" ? "rgba(29,158,117,0.4)" : "rgba(255,255,255,0.12)"}`,
                    color: results.swimmer.source === "FFN Extranat" ? "#1D9E75" : "rgba(255,255,255,0.5)",
                  }}>
                    {results.swimmer.source}
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", color: "rgba(255,255,255,0.35)", fontWeight: 600, paddingBottom: "0.5rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Épreuve</th>
                      <th style={{ textAlign: "right", color: "rgba(255,255,255,0.35)", fontWeight: 600, paddingBottom: "0.5rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>LCM (50m)</th>
                      <th style={{ textAlign: "right", color: "rgba(255,255,255,0.35)", fontWeight: 600, paddingBottom: "0.5rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>SCY converti ≈</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(results.swimmer.times_lcm).map((ev) => (
                      <tr key={ev} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "0.4rem 0", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{ev}</td>
                        <td style={{ textAlign: "right", padding: "0.4rem 0", color: "#fff", fontWeight: 600 }}>{results.swimmer.times_lcm[ev]}</td>
                        <td style={{ textAlign: "right", padding: "0.4rem 0", color: "rgba(255,255,255,0.5)" }}>~{results.swimmer.times_scy[ev]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Division filter chips (client-side) */}
              {results.matches.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>Afficher :</span>
                  <button
                    type="button"
                    onClick={() => setDivFilter([])}
                    style={{ padding: "0.2rem 0.6rem", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: divFilter.length === 0 ? "rgba(255,255,255,0.15)" : "transparent", color: "#fff", cursor: "pointer", fontSize: "0.75rem" }}
                  >
                    Tous
                  </button>
                  {["D1", "D2", "NAIA", "USports", "ACAC"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDivFilter(divFilter.includes(d) ? divFilter.filter((x) => x !== d) : [...divFilter, d])}
                      style={{ padding: "0.2rem 0.6rem", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: divFilter.includes(d) ? "#C0392B" : "transparent", color: "#fff", cursor: "pointer", fontSize: "0.75rem" }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Match cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {visibleMatches.length === 0 && (
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.875rem" }}>Aucun match pour ce filtre.</p>
                )}
                {visibleMatches.map((m) => (
                  <MatchCard key={m.university} match={m} />
                ))}
              </div>

              {/* Disclaimer */}
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem" }}>
                Les scores de conversion SCY sont des approximations (±2%). Les scores de fit sont indicatifs et ne constituent pas une garantie de recrutement. Données roster : SwimCloud. Données académiques : College Scorecard API (US Dept. of Education). Cet outil de démonstration utilise 10 universités pré-sélectionnées.
              </p>

              {/* Upsell */}
              <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 12, padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem" }}>Voir les 300+ universités</p>
                  <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>Crée un compte gratuit pour matcher contre l&apos;intégralité de la base.</p>
                </div>
                <Link href="/register" style={{ background: "#C0392B", color: "#fff", padding: "0.625rem 1.25rem", borderRadius: 8, fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                  Commencer →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
