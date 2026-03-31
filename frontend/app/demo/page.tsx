"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeEntry {
  event: string;
  basin: string;
  time_seconds: number;
  is_direct_scy?: boolean;
}

interface MatchResult {
  rank: number;
  university: string;
  division: string;
  conference: string;
  location: string;
  country: string;
  fit_score: number;
  scholarship_est: number;
  data_source?: string;
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

// ─── Event definitions ────────────────────────────────────────────────────────

interface EventDef {
  label: string;
  code: string;
  group: string;
  placeholder: string;
}

const EVENTS: EventDef[] = [
  // Nage libre
  { label: "50m",    code: "50FR",   group: "Nage libre", placeholder: "22.80" },
  { label: "100m",   code: "100FR",  group: "Nage libre", placeholder: "53.00" },
  { label: "200m",   code: "200FR",  group: "Nage libre", placeholder: "1:50.00" },
  { label: "400m",   code: "400FR",  group: "Nage libre", placeholder: "4:10.00" },
  { label: "800m",   code: "800FR",  group: "Nage libre", placeholder: "8:40.00" },
  { label: "1500m",  code: "1500FR", group: "Nage libre", placeholder: "16:30.00" },
  // Brasse
  { label: "100m",   code: "100BR",  group: "Brasse",     placeholder: "1:02.41" },
  { label: "200m",   code: "200BR",  group: "Brasse",     placeholder: "2:16.00" },
  // Dos
  { label: "100m",   code: "100BA",  group: "Dos",        placeholder: "1:00.00" },
  { label: "200m",   code: "200BA",  group: "Dos",        placeholder: "2:10.00" },
  // Papillon
  { label: "100m",   code: "100FL",  group: "Papillon",   placeholder: "58.00" },
  { label: "200m",   code: "200FL",  group: "Papillon",   placeholder: "2:10.00" },
  // 4 nages
  { label: "200m",   code: "200IM",  group: "4 Nages",    placeholder: "2:15.00" },
  { label: "400m",   code: "400IM",  group: "4 Nages",    placeholder: "4:40.00" },
];

const GROUPS = ["Nage libre", "Brasse", "Dos", "Papillon", "4 Nages"];
const DIVISIONS = ["D1", "D2", "D3", "NAIA", "USports CA", "ACAC CA"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimeToSeconds(display: string): number | null {
  const d = display.trim();
  if (!d) return null;
  if (d.includes(":")) {
    const [min, sec] = d.split(":");
    const v = parseFloat(min) * 60 + parseFloat(sec);
    return isNaN(v) ? null : v;
  }
  const v = parseFloat(d);
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

// ─── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem" }}>
      <span style={{ color: "rgba(255,255,255,0.45)", width: 76, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: scoreColor(value), borderRadius: 4, transition: "width 0.4s" }} />
      </div>
      <span style={{ color: "rgba(255,255,255,0.55)", width: 28, textAlign: "right" }}>{Math.round(value)}</span>
    </div>
  );
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

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
    ["Vacance",    match.scores.vacancy],
    ["Conf.",      match.scores.conference],
    ["Conversion", match.scores.conversion],
    ["Relais",     match.scores.relay],
    ["Acad.",      match.scores.academic],
    ["Progression",match.scores.progression],
  ];

  return (
    <div style={{
      background: "#111827",
      border: `1px solid ${match.vacancy_detail.is_priority ? "rgba(192,57,43,0.5)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 12,
      padding: "1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.875rem",
    }}>
      {/* Header */}
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
            {match.data_source === "live" && (
              <span style={{ background: "rgba(29,158,117,0.12)", color: "#1D9E75", fontSize: "0.68rem", padding: "0.12rem 0.45rem", borderRadius: 999, border: "1px solid rgba(29,158,117,0.3)" }}>
                Live SwimCloud
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.375rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ background: "rgba(46,134,193,0.15)", color: "#2E86C1", fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 4 }}>
              {match.division}
            </span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem" }}>{match.conference}</span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.72rem" }}>·</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem" }}>{match.location}</span>
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
        onClick={() => setEmailOpen(v => !v)}
        style={{
          background: "none",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.55)",
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
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "0.625rem 0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Objet</span>
              <button type="button" onClick={() => copy(match.email_subject, "subject")}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.75rem" }}>
                {copied === "subject" ? "✓ Copié !" : "Copier"}
              </button>
            </div>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.8)", wordBreak: "break-word" }}>{match.email_subject}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "0.625rem 0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Corps</span>
              <button type="button" onClick={() => copy(match.email_body, "body")}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.75rem" }}>
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

type TimesState = Record<string, { lcm: string; scm: string; scy: string; basin: string }>;

export default function DemoPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [age, setAge]             = useState("");
  const [gender, setGender]       = useState("M");

  // FFN
  const [ffnLicence, setFfnLicence] = useState("");
  const [ffnStatus, setFfnStatus]   = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [ffnMessage, setFfnMessage] = useState("");

  // Times: keyed by event code, per-basin
  const [times, setTimes] = useState<TimesState>({});
  const [basinMap, setBasinMap] = useState<Record<string, string>>({}); // per-event basin override

  // Morphology
  const [height, setHeight]     = useState("");
  const [weight, setWeight]     = useState("");
  const [wingspan, setWingspan] = useState("");
  const [shoeSize, setShoeSize] = useState("");

  // Preferences
  const [bacMention, setBacMention] = useState("");
  const [majorInput, setMajorInput] = useState("");
  const [majors, setMajors]         = useState<string[]>([]);
  const [divisions, setDivisions]   = useState<string[]>([]);

  // Results
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [results, setResults]   = useState<DemoResponse | null>(null);
  const [divFilter, setDivFilter] = useState<string[]>([]);

  function getTime(code: string): string {
    return times[code]?.lcm ?? "";
  }
  function getSCYDirect(code: string): string {
    return times[code]?.scy ?? "";
  }
  function getBasin(code: string): string {
    return basinMap[code] ?? "LCM";
  }

  function setTimeField(code: string, field: "lcm"|"scy", value: string) {
    setTimes(prev => ({
      ...prev,
      [code]: { ...(prev[code] ?? { lcm: "", scm: "", scy: "", basin: "LCM" }), [field]: value },
    }));
  }
  function setBasin(code: string, basin: string) {
    setBasinMap(prev => ({ ...prev, [code]: basin }));
  }

  function toggleDivision(div: string) {
    setDivisions(prev =>
      prev.includes(div) ? prev.filter(d => d !== div) : [...prev, div]
    );
  }

  function addMajor() {
    const val = majorInput.trim();
    if (val && !majors.includes(val)) {
      setMajors(prev => [...prev, val]);
      setMajorInput("");
    }
  }

  async function handleFFNSync() {
    if (!ffnLicence.trim()) return;
    setFfnStatus("loading");
    setFfnMessage("");
    try {
      const res = await fetch(`${API_URL}/api/demo/ffn-sync?licence=${encodeURIComponent(ffnLicence.trim())}`);
      const data = await res.json();
      if (data.ok) {
        // data.times: { "100BR": 62.41, ... } in seconds
        const newTimes: TimesState = { ...times };
        for (const [ev, secs] of Object.entries(data.times as Record<string, number>)) {
          const mins = Math.floor(secs / 60);
          const rem = (secs % 60).toFixed(2).padStart(5, "0");
          const display = mins > 0 ? `${mins}:${rem}` : secs.toFixed(2);
          newTimes[ev] = { ...(newTimes[ev] ?? { lcm: "", scm: "", scy: "", basin: "LCM" }), lcm: display };
        }
        setTimes(newTimes);
        setFfnStatus("ok");
        setFfnMessage(`${Object.keys(data.times).length} temps récupérés depuis Extranat`);
      } else {
        setFfnStatus("error");
        setFfnMessage(data.error ?? "Licence FFN non trouvée. Entre tes temps manuellement.");
      }
    } catch {
      setFfnStatus("error");
      setFfnMessage("Erreur de connexion au backend.");
    }
  }

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !age) {
      setError("Prénom, nom et âge sont requis.");
      return;
    }
    setError("");
    setLoading(true);
    setResults(null);

    // Build times array
    const timeEntries: TimeEntry[] = [];
    for (const ev of EVENTS) {
      const code = ev.code;
      const scyVal = getSCYDirect(code);
      const lcmVal = getTime(code);
      const basin = getBasin(code);

      if (scyVal.trim()) {
        const secs = parseTimeToSeconds(scyVal);
        if (secs) timeEntries.push({ event: code, basin: "SCY", time_seconds: secs, is_direct_scy: true });
      } else if (lcmVal.trim()) {
        const secs = parseTimeToSeconds(lcmVal);
        if (secs) timeEntries.push({ event: code, basin, time_seconds: secs });
      }
    }

    try {
      const body = {
        first_name: firstName,
        last_name: lastName,
        age: parseInt(age),
        gender,
        ffn_licence: ffnLicence || null,
        times: timeEntries,
        height_cm: height ? parseInt(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        wingspan_cm: wingspan ? parseInt(wingspan) : null,
        shoe_size_eu: shoeSize ? parseInt(shoeSize) : null,
        bac_mention: bacMention || null,
        target_majors: majors.length ? majors : null,
        target_divisions: divisions.length ? divisions : null,
      };

      const res = await fetch(`${API_URL}/api/demo/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? `Erreur ${res.status}`);
      }

      const data: DemoResponse = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
        setDivFilter(divisions);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de connexion. Vérifie que le backend est accessible.");
    } finally {
      setLoading(false);
    }
  }

  const visibleMatches = results?.matches.filter(m => {
    if (divFilter.length === 0) return true;
    return divFilter.some(f => f.replace(" CA", "") === m.division.replace(" CA", ""));
  }) ?? [];

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: "100%",
    background: "#1B2A4A",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: "0.55rem 0.7rem",
    color: "#fff",
    fontSize: "0.85rem",
    outline: "none",
  };
  const lbl: React.CSSProperties = {
    fontSize: "0.78rem",
    color: "rgba(255,255,255,0.45)",
    display: "block",
    marginBottom: "0.3rem",
  };
  const secTitle: React.CSSProperties = {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.3)",
    marginBottom: "0.625rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#fff", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.05em" }}>
          RISE<span style={{ color: "#C0392B" }}>.</span>MATCH
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.25)", padding: "0.2rem 0.6rem", borderRadius: 999 }}>
            Demo — sans compte
          </span>
          <Link href="/register" style={{ background: "#C0392B", color: "#fff", padding: "0.45rem 1rem", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600 }}>
            Créer un compte
          </Link>
        </div>
      </nav>

      <div style={{ display: "flex", minHeight: "calc(100vh - 53px)" }}>

        {/* ── Left panel ── */}
        <div style={{ width: 400, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.06)", padding: "1.25rem 1.25rem 2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.375rem" }}>

          {/* Profile */}
          <div>
            <p style={secTitle}>Profil nageur</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div><label style={lbl}>Prénom</label><input style={inp} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Lucas" /></div>
              <div><label style={lbl}>Nom</label><input style={inp} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Mercier" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div><label style={lbl}>Âge</label><input type="number" min={14} max={25} style={inp} value={age} onChange={e => setAge(e.target.value)} placeholder="17" /></div>
              <div>
                <label style={lbl}>Genre</label>
                <select style={inp} value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                </select>
              </div>
            </div>
          </div>

          {/* FFN sync */}
          <div>
            <p style={secTitle}>Licence FFN (optionnel)</p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input style={{ ...inp, flex: 1 }} value={ffnLicence} onChange={e => setFfnLicence(e.target.value)} placeholder="ex: 012345678" />
              <button
                type="button"
                onClick={handleFFNSync}
                disabled={ffnStatus === "loading" || !ffnLicence.trim()}
                style={{ background: "#1B2A4A", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, opacity: (!ffnLicence.trim()) ? 0.4 : 1 }}
              >
                {ffnStatus === "loading" ? "…" : "Sync FFN"}
              </button>
            </div>
            {ffnStatus === "ok"    && <p style={{ fontSize: "0.75rem", color: "#1D9E75", marginTop: "0.375rem" }}>✓ {ffnMessage}</p>}
            {ffnStatus === "error" && <p style={{ fontSize: "0.75rem", color: "#C0392B", marginTop: "0.375rem" }}>{ffnMessage}</p>}
          </div>

          {/* Times grid */}
          <div>
            <p style={secTitle}>Tes temps — laisse vide si non nagé</p>
            {GROUPS.map(group => {
              const groupEvents = EVENTS.filter(e => e.group === group);
              return (
                <div key={group} style={{ marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: "0.375rem", paddingBottom: "0.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {group}
                  </p>
                  {groupEvents.map(ev => (
                    <div key={ev.code} style={{ display: "grid", gridTemplateColumns: "60px 1fr 72px 1fr", gap: "0.375rem", alignItems: "center", marginBottom: "0.375rem" }}>
                      {/* Distance label */}
                      <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>{ev.label}</span>

                      {/* LCM/SCM time input */}
                      <input
                        style={{ ...inp, padding: "0.45rem 0.55rem", fontSize: "0.8rem" }}
                        value={getTime(ev.code)}
                        onChange={e => setTimeField(ev.code, "lcm", e.target.value)}
                        placeholder={ev.placeholder}
                      />

                      {/* Basin selector */}
                      <select
                        style={{ ...inp, padding: "0.45rem 0.4rem", fontSize: "0.75rem" }}
                        value={getBasin(ev.code)}
                        onChange={e => setBasin(ev.code, e.target.value)}
                      >
                        <option value="LCM">LCM</option>
                        <option value="SCM">SCM</option>
                      </select>

                      {/* SCY direct override */}
                      <input
                        style={{ ...inp, padding: "0.45rem 0.55rem", fontSize: "0.78rem", background: getSCYDirect(ev.code) ? "rgba(29,158,117,0.1)" : "#1B2A4A", borderColor: getSCYDirect(ev.code) ? "rgba(29,158,117,0.4)" : "rgba(255,255,255,0.08)" }}
                        value={getSCYDirect(ev.code)}
                        onChange={e => setTimeField(ev.code, "scy", e.target.value)}
                        placeholder="SCY direct"
                        title="Optionnel: entre directement ton temps SCY (override la conversion)"
                      />
                    </div>
                  ))}
                </div>
              );
            })}
            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", marginTop: "0.25rem" }}>
              Si SCY direct est rempli, il prend la priorité sur la conversion.
            </p>
          </div>

          {/* Morphology */}
          <div>
            <p style={secTitle}>Morphologie (optionnel)</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div><label style={lbl}>Taille (cm)</label><input type="number" style={inp} value={height} onChange={e => setHeight(e.target.value)} placeholder="184" /></div>
              <div><label style={lbl}>Poids (kg)</label><input type="number" style={inp} value={weight} onChange={e => setWeight(e.target.value)} placeholder="74" /></div>
              <div><label style={lbl}>Envergure (cm)</label><input type="number" style={inp} value={wingspan} onChange={e => setWingspan(e.target.value)} placeholder="192" /></div>
              <div><label style={lbl}>Pointure (EU)</label><input type="number" min={36} max={52} style={inp} value={shoeSize} onChange={e => setShoeSize(e.target.value)} placeholder="43" /></div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <p style={secTitle}>Préférences</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label style={lbl}>Divisions cibles</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.25rem" }}>
                  {DIVISIONS.map(div => (
                    <button key={div} type="button" onClick={() => toggleDivision(div)}
                      style={{ padding: "0.28rem 0.65rem", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: divisions.includes(div) ? "#C0392B" : "transparent", color: "#fff", cursor: "pointer", fontSize: "0.76rem", fontWeight: divisions.includes(div) ? 600 : 400 }}>
                      {div}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Mention au Bac</label>
                <select style={inp} value={bacMention} onChange={e => setBacMention(e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  <option value="TB">Très Bien (≥ 16)</option>
                  <option value="B">Bien (14–16)</option>
                  <option value="AB">Assez Bien (12–14)</option>
                  <option value="P">Passable (10–12)</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Filières souhaitées</label>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <input style={{ ...inp, flex: 1 }} value={majorInput} onChange={e => setMajorInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addMajor()} placeholder="Business, Biology…" />
                  <button type="button" onClick={addMajor} style={{ background: "#1B2A4A", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", borderRadius: 8, padding: "0 0.75rem", cursor: "pointer", fontSize: "1rem" }}>+</button>
                </div>
                {majors.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
                    {majors.map(m => (
                      <span key={m} style={{ background: "rgba(46,134,193,0.12)", border: "1px solid rgba(46,134,193,0.25)", color: "#2E86C1", fontSize: "0.74rem", padding: "0.2rem 0.5rem", borderRadius: 999, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        {m}
                        <button type="button" onClick={() => setMajors(prev => prev.filter(x => x !== m))} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error + CTA */}
          {error && (
            <p style={{ color: "#C0392B", fontSize: "0.82rem", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: 8, padding: "0.625rem 0.75rem" }}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{ background: loading ? "rgba(192,57,43,0.5)" : "#C0392B", border: "none", color: "#fff", padding: "0.875rem", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            {loading ? (
              <><span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Calcul en cours…</>
            ) : "Calculer mes matchs →"}
          </button>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          {!results && !loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem", color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
              <div style={{ fontSize: "3rem" }}>🏊</div>
              <p style={{ fontSize: "1rem", maxWidth: 320, color: "rgba(255,255,255,0.25)" }}>
                Remplis le formulaire et clique sur <strong style={{ color: "rgba(255,255,255,0.4)" }}>Calculer</strong> pour voir tes matchs.
              </p>
              <p style={{ fontSize: "0.8rem", maxWidth: 280 }}>Aucun compte requis. Algorithme complet — 10 universités.</p>
            </div>
          )}

          {results && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 780 }}>

              {/* FFN error */}
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
                    <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>{results.swimmer.age} ans</p>
                  </div>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: 999,
                    background: results.swimmer.source === "FFN Extranat" ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${results.swimmer.source === "FFN Extranat" ? "rgba(29,158,117,0.4)" : "rgba(255,255,255,0.1)"}`,
                    color: results.swimmer.source === "FFN Extranat" ? "#1D9E75" : "rgba(255,255,255,0.45)",
                  }}>
                    {results.swimmer.source}
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr>
                      {["Épreuve", "LCM (50m)", "SCY converti ≈"].map(h => (
                        <th key={h} style={{ textAlign: h === "Épreuve" ? "left" : "right", color: "rgba(255,255,255,0.3)", fontWeight: 600, paddingBottom: "0.5rem", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(results.swimmer.times_scy).map(ev => (
                      <tr key={ev} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "0.4rem 0", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{ev}</td>
                        <td style={{ textAlign: "right", padding: "0.4rem 0", color: "#fff", fontWeight: 600 }}>
                          {results.swimmer.times_lcm[ev] ?? "—"}
                        </td>
                        <td style={{ textAlign: "right", padding: "0.4rem 0", color: "rgba(255,255,255,0.5)" }}>
                          ~{results.swimmer.times_scy[ev]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Division filter */}
              {results.matches.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.3)" }}>Afficher :</span>
                  <button type="button" onClick={() => setDivFilter([])}
                    style={{ padding: "0.2rem 0.6rem", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: divFilter.length === 0 ? "rgba(255,255,255,0.12)" : "transparent", color: "#fff", cursor: "pointer", fontSize: "0.74rem" }}>
                    Tous
                  </button>
                  {["D1", "D2", "NAIA", "USports", "ACAC"].map(d => (
                    <button key={d} type="button" onClick={() => setDivFilter(divFilter.includes(d) ? divFilter.filter(x => x !== d) : [...divFilter, d])}
                      style={{ padding: "0.2rem 0.6rem", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)", background: divFilter.includes(d) ? "#C0392B" : "transparent", color: "#fff", cursor: "pointer", fontSize: "0.74rem" }}>
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Match cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {visibleMatches.length === 0 && (
                  <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.875rem" }}>Aucun match pour ce filtre.</p>
                )}
                {visibleMatches.map(m => <MatchCard key={m.university} match={m} />)}
              </div>

              {/* Disclaimer */}
              <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.22)", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }}>
                Les scores de conversion SCY sont des approximations (±2-3%). Les scores de fit sont indicatifs et ne constituent pas une garantie de recrutement. Données roster : SwimCloud (saison 2025-26). Données académiques : College Scorecard API (US Dept. of Education). Cet outil utilise 10 universités pré-sélectionnées.
              </p>

              {/* Upsell */}
              <div style={{ background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.18)", borderRadius: 12, padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem" }}>Voir les 300+ universités</p>
                  <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>Crée un compte gratuit pour matcher contre l&apos;intégralité de la base.</p>
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
