"use client"

import { useState } from "react"

const API_URL = "https://rise-match-production.up.railway.app/api/match"

const EVENTS = [
  { value: "50FR",   label: "50m Nage Libre" },
  { value: "100FR",  label: "100m Nage Libre" },
  { value: "200FR",  label: "200m Nage Libre" },
  { value: "400FR",  label: "400m Nage Libre (USports)" },
  { value: "500FR",  label: "500y / 400m Nage Libre" },
  { value: "800FR",  label: "800m Nage Libre (USports)" },
  { value: "1000FR", label: "1000y Nage Libre" },
  { value: "1500FR", label: "1500m Nage Libre (USports)" },
  { value: "1650FR", label: "1650y / 1500m Nage Libre" },
  { value: "50BA",   label: "50m Dos" },
  { value: "100BA",  label: "100m Dos" },
  { value: "200BA",  label: "200m Dos" },
  { value: "50BR",   label: "50m Brasse" },
  { value: "100BR",  label: "100m Brasse" },
  { value: "200BR",  label: "200m Brasse" },
  { value: "50FL",   label: "50m Papillon" },
  { value: "100FL",  label: "100m Papillon" },
  { value: "200FL",  label: "200m Papillon" },
  { value: "100IM",  label: "100m 4 Nages" },
  { value: "200IM",  label: "200m 4 Nages" },
  { value: "400IM",  label: "400m 4 Nages" },
]

const BASINS = [
  { value: "LCM", label: "LCM (50m)" },
  { value: "SCM", label: "SCM (25m)" },
  { value: "SCY", label: "SCY (25y)" },
]

const DIVISIONS_UI = [
  { label: "NCAA D1",  api: "division_1"  },
  { label: "NCAA D2",  api: "division_2"  },
  { label: "NCAA D3",  api: "division_3"  },
  { label: "NAIA",     api: "division_4"  },
  { label: "NJCAA",    api: "division_5"  },
  { label: "USports",  api: "division_10" },
]

const ROSTER_ORDER = [
  "50FR","100FR","200FR","500FR","1000FR","1650FR",
  "50BA","100BA","200BA",
  "50BR","100BR","200BR",
  "50FL","100FL","200FL",
  "200IM","400IM",
]

const BUDGET_OPTIONS = [
  { label: "Tous les budgets", value: null },
  { label: "< $20,000",        value: 20000 },
  { label: "< $35,000",        value: 35000 },
  { label: "< $50,000",        value: 50000 },
  { label: "< $65,000",        value: 65000 },
]

function divisionBadge(api: string): { label: string; bg: string; color: string } {
  switch (api) {
    case "division_1":  return { label: "NCAA D1",  bg: "#1a2f50", color: "#60a5fa" }
    case "division_2":  return { label: "NCAA D2",  bg: "#1a2f50", color: "#60a5fa" }
    case "division_3":  return { label: "NCAA D3",  bg: "#1a2f50", color: "#60a5fa" }
    case "division_4":  return { label: "NAIA",     bg: "#1a3020", color: "#4ade80" }
    case "division_5":  return { label: "NJCAA",    bg: "#2d1e0f", color: "#fb923c" }
    case "division_10": return { label: "USports",  bg: "#2d1515", color: "#f87171" }
    default:            return { label: api,         bg: "#1a2236", color: "#94a3b8" }
  }
}

function CountryBadge({ country }: { country: string }) {
  const isCA = country === "CA"
  return (
    <span
      className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
      style={{
        backgroundColor: isCA ? "#3b0a0a" : "#0a1a3b",
        color: isCA ? "#fca5a5" : "#93c5fd",
      }}
    >
      {isCA ? "CA" : "US"}
    </span>
  )
}

interface TimeEntry {
  id: number
  event: string
  basin: string
  time: string
}

interface EventMatch {
  athlete_time: number
  team_best: number
  ratio: number
}

interface AcademicData {
  admission_rate: number | null
  tuition_out_state: number | null
  enrollment_total: number | null
  median_earnings: number | null
  school_type: string | null
  retention_rate: number | null
  pct_pell_grant: number | null
  grad_debt_median: number | null
  latitude: number | null
  longitude: number | null
  website: string | null
}

interface TeamTime {
  seconds: number
  display: string
}

interface MatchResult {
  team_id: number | string
  name: string
  division: string
  state: string
  city: string
  country: string
  score: number
  events: Record<string, EventMatch>
  academic: AcademicData | null
  team_times: Record<string, TeamTime>
}

interface ApiResponse {
  scy_times: Record<string, number>
  matches: MatchResult[]
  error?: string
}

function parseTime(s: string): number {
  s = s.trim()
  if (s.includes(":")) {
    const [mins, secs] = s.split(":")
    return parseInt(mins) * 60 + parseFloat(secs)
  }
  return parseFloat(s)
}

function formatScy(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60)
    const s = (seconds % 60).toFixed(2).padStart(5, "0")
    return `${m}:${s}`
  }
  return seconds.toFixed(2)
}

function getLogoUrl(website: string | null): string | null {
  if (!website) return null
  const domain = website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

function UniversityLogo({ name, website }: { name: string; website: string | null }) {
  const logoUrl = getLogoUrl(website)
  const initials = name.split(/\s+/).filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join("")

  if (!logoUrl) {
    return (
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ backgroundColor: "#1a2236", color: "#60a5fa" }}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className="relative w-8 h-8 shrink-0">
      <img
        src={logoUrl}
        alt={name}
        width={32}
        height={32}
        className="w-8 h-8 rounded-lg object-contain"
        style={{ backgroundColor: "#f8fafc" }}
        onError={(e) => {
          e.currentTarget.style.display = "none"
          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
          if (fallback) fallback.style.display = "flex"
        }}
      />
      <div
        className="w-8 h-8 rounded-lg items-center justify-center shrink-0 text-xs font-bold absolute inset-0"
        style={{ backgroundColor: "#1a2236", color: "#60a5fa", display: "none" }}
      >
        {initials}
      </div>
    </div>
  )
}

let nextId = 1

export default function Page() {
  const [gender, setGender] = useState<"M" | "F">("M")
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(DIVISIONS_UI.map(d => d.api))
  const [entries, setEntries] = useState<TimeEntry[]>([
    { id: nextId++, event: "100FR", basin: "LCM", time: "" },
  ])

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filtres client-side
  const [openRosters, setOpenRosters] = useState<Set<number | string>>(new Set())
  const [filterBudget, setFilterBudget] = useState<number | null>(null)
  const [filterSize, setFilterSize] = useState<"small" | "medium" | "large" | null>(null)
  const [filterType, setFilterType] = useState<"public" | "private" | null>(null)

  function toggleDivision(api: string) {
    setSelectedDivisions(prev =>
      prev.includes(api) ? prev.filter(d => d !== api) : [...prev, api]
    )
  }

  function addEntry() {
    if (entries.length >= 6) return
    setEntries(prev => [...prev, { id: nextId++, event: "100FR", basin: "LCM", time: "" }])
  }

  function removeEntry(id: number) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  function updateEntry(id: number, field: keyof TimeEntry, value: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const validEntries = entries.filter(e => e.time.trim() !== "" && !isNaN(parseTime(e.time)))

  async function handleSubmit() {
    if (validEntries.length === 0) return
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const body = {
        times: validEntries.map(e => ({
          event: e.event,
          basin: e.basin,
          time_seconds: parseTime(e.time),
        })),
        gender,
        divisions: selectedDivisions,
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`)
      const data: ApiResponse = await res.json()
      setResults(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#0A0E1A" }}>
        <div className="w-10 h-10 border-2 border-transparent border-t-blue-400 rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Analyse en cours…</p>
      </div>
    )
  }

  if (results) {
    // Filtrage client-side
    const filtered = results.matches.filter(match => {
      const ac = match.academic
      if (!ac) return true
      if (filterBudget !== null && ac.tuition_out_state !== null && ac.tuition_out_state >= filterBudget) return false
      if (filterSize === "small"  && (ac.enrollment_total === null || ac.enrollment_total >= 3000)) return false
      if (filterSize === "medium" && (ac.enrollment_total === null || ac.enrollment_total < 3000 || ac.enrollment_total > 10000)) return false
      if (filterSize === "large"  && (ac.enrollment_total === null || ac.enrollment_total <= 10000)) return false
      if (filterType === "public"  && ac.school_type !== "public") return false
      if (filterType === "private" && ac.school_type !== "private") return false
      return true
    })

    return (
      <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto" style={{ backgroundColor: "#0A0E1A" }}>
        <button
          onClick={() => setResults(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors"
        >
          <span>&#8592;</span> Retour
        </button>

        <h1 className="text-2xl font-bold text-white mb-1">
          {filtered.length > 0
            ? `${filtered.length} match${filtered.length > 1 ? "s" : ""} trouvé${filtered.length > 1 ? "s" : ""}`
            : "Aucun match trouvé"}
        </h1>

        {Object.keys(results.scy_times).length > 0 && (
          <p className="text-gray-400 text-sm mb-5">
            Temps convertis en SCY :{" "}
            {Object.entries(results.scy_times).map(([event, scy], i) => (
              <span key={event}>
                {i > 0 && " · "}
                <span className="text-white">{event}</span> {formatScy(scy)}s
              </span>
            ))}
          </p>
        )}

        {/* Filtres résultats */}
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: "#0d1525", border: "1px solid #1e2d45" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Filtrer les résultats</p>
          <div className="flex flex-col gap-3">
            {/* Budget */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-500 w-16 shrink-0">Budget</span>
              <select
                value={filterBudget ?? ""}
                onChange={e => setFilterBudget(e.target.value === "" ? null : Number(e.target.value))}
                className="rounded-lg text-xs px-2 py-1.5 outline-none"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5" }}
              >
                {BUDGET_OPTIONS.map(opt => (
                  <option key={opt.label} value={opt.value ?? ""}>{opt.label}</option>
                ))}
              </select>
            </div>
            {/* Taille */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 w-16 shrink-0">Taille</span>
              {([
                { label: "Toutes",       value: null     },
                { label: "Petite (<3k)", value: "small"  },
                { label: "Moyenne",      value: "medium" },
                { label: "Grande (>10k)",value: "large"  },
              ] as const).map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setFilterSize(opt.value)}
                  className="px-2.5 py-1 rounded text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: filterSize === opt.value ? "#1a3050" : "#111827",
                    color: filterSize === opt.value ? "#60a5fa" : "#6b7a99",
                    border: `1px solid ${filterSize === opt.value ? "#2E75B6" : "#1e2d45"}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 w-16 shrink-0">Type</span>
              {([
                { label: "Tous",   value: null      },
                { label: "Public", value: "public"  },
                { label: "Privé",  value: "private" },
              ] as const).map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setFilterType(opt.value)}
                  className="px-2.5 py-1 rounded text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: filterType === opt.value ? "#1a3050" : "#111827",
                    color: filterType === opt.value ? "#60a5fa" : "#6b7a99",
                    border: `1px solid ${filterType === opt.value ? "#2E75B6" : "#1e2d45"}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 && (
          <div
            className="rounded-xl p-6 text-center text-gray-400"
            style={{ backgroundColor: "#111827", border: "1px solid #1e2d45" }}
          >
            Aucun résultat pour ces filtres. Essaie d&apos;élargir les critères.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {filtered.map((match, idx) => (
            <div
              key={match.team_id}
              className="rounded-xl p-5"
              style={{ backgroundColor: "#111827", border: "1px solid #1e2d45" }}
            >
              <div className="flex items-start gap-4">
                <span
                  className="text-3xl font-black tabular-nums leading-none mt-1"
                  style={{ color: idx === 0 ? "#2E75B6" : "#374151", minWidth: "2rem" }}
                >
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Header: logo + country badge + name + score badge */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <UniversityLogo name={match.name} website={match.academic?.website ?? null} />
                      <CountryBadge country={match.country} />
                      <h2 className="text-lg font-bold text-white leading-tight">{match.name}</h2>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: "#1a2236", color: "#2E75B6" }}
                    >
                      {match.score} pt{match.score > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Division badge + pell grant badge + location */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(() => {
                      const b = divisionBadge(match.division)
                      return (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: b.bg, color: b.color }}>
                          {b.label}
                        </span>
                      )
                    })()}
                    {match.academic?.pct_pell_grant != null && match.academic.pct_pell_grant > 30 && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#0d2d1a", color: "#4ade80" }}>
                        💰 Aides dispo
                      </span>
                    )}
                    <span className="text-gray-500 text-xs">
                      {match.state}{match.city ? ` · ${match.city}` : ""}
                    </span>
                  </div>

                  {/* Academic metrics grid 2x3 */}
                  {match.academic && (
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg px-3 py-2.5 text-xs" style={{ backgroundColor: "#0d1525" }}>
                      <div>
                        <span className="text-gray-500">🎓 Admission </span>
                        <span className="text-gray-200 font-semibold">
                          {match.academic.admission_rate === null
                            ? "—"
                            : match.academic.admission_rate > 80
                            ? "Non sélectif"
                            : `${match.academic.admission_rate}%`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">💰 Scolarité </span>
                        <span className="text-gray-200 font-semibold">
                          {match.academic.tuition_out_state === null
                            ? "—"
                            : `$${match.academic.tuition_out_state.toLocaleString("en-US")}/an`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">👥 Taille </span>
                        <span className="text-gray-200 font-semibold">
                          {match.academic.enrollment_total === null
                            ? "—"
                            : match.academic.enrollment_total < 3000
                            ? `Petite (${match.academic.enrollment_total.toLocaleString("en-US")})`
                            : match.academic.enrollment_total <= 10000
                            ? `Moyenne (${match.academic.enrollment_total.toLocaleString("en-US")})`
                            : `Grande (${match.academic.enrollment_total.toLocaleString("en-US")})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">💼 Salaire </span>
                        <span className="text-gray-200 font-semibold">
                          {match.academic.median_earnings === null
                            ? "—"
                            : `$${match.academic.median_earnings.toLocaleString("en-US")}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">📈 Rétention </span>
                        <span className="text-gray-200 font-semibold">
                          {match.academic.retention_rate === null ? "—" : `${match.academic.retention_rate}%`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">💳 Dette </span>
                        <span className="text-gray-200 font-semibold">
                          {match.academic.grad_debt_median === null
                            ? "—"
                            : `$${match.academic.grad_debt_median.toLocaleString("en-US")}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Roster — collapsible */}
                  {match.team_times && Object.keys(match.team_times).length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setOpenRosters(prev => {
                          const next = new Set(prev)
                          next.has(match.team_id) ? next.delete(match.team_id) : next.add(match.team_id)
                          return next
                        })}
                        className="flex items-center gap-1.5 text-xs font-semibold transition-colors w-full text-left"
                        style={{ color: "#4b6fa8" }}
                      >
                        <span style={{ fontSize: "10px" }}>{openRosters.has(match.team_id) ? "▼" : "▶"}</span>
                        ROSTER — Meilleurs temps de l&apos;équipe ({Object.keys(match.team_times).length} épreuves)
                      </button>
                      {openRosters.has(match.team_id) && (
                        <div className="mt-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: "#0a1020" }}>
                          <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                            {ROSTER_ORDER.filter(ev => match.team_times[ev]).map(ev => (
                              <div key={ev} className="flex items-center gap-1.5 text-xs font-mono">
                                <span className="text-gray-500 w-12 shrink-0">{ev}</span>
                                <span className="text-gray-300">{match.team_times[ev].display}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sport event ratios */}
                  {Object.entries(match.events).length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      {Object.entries(match.events).map(([event, ev]) => {
                        const pct = ((ev.ratio - 1) * 100).toFixed(1)
                        const faster = ev.ratio < 1
                        const close = ev.ratio <= 1.05
                        const color = faster ? "#22c55e" : close ? "#f59e0b" : "#6b7280"

                        return (
                          <div key={event} className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-gray-300 w-14 shrink-0">{event}</span>
                            <span className="text-gray-400">
                              {formatScy(ev.athlete_time)}s <span className="text-gray-600">vs</span> {formatScy(ev.team_best)}s
                            </span>
                            <span className="font-semibold" style={{ color }}>
                              {faster ? "-" : "+"}{Math.abs(parseFloat(pct))}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Website link */}
                  {match.academic?.website && (
                    <a
                      href={match.academic.website.startsWith("http") ? match.academic.website : `https://${match.academic.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs transition-colors"
                      style={{ color: "#4b6fa8" }}
                      onMouseOver={e => (e.currentTarget.style.color = "#60a5fa")}
                      onMouseOut={e => (e.currentTarget.style.color = "#4b6fa8")}
                    >
                      🌐 Visiter le site officiel
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-xl mx-auto" style={{ backgroundColor: "#0A0E1A" }}>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-black tracking-tight text-white">
          RISE<span style={{ color: "#2E75B6" }}>.</span>MATCH
        </h1>
        <p className="text-gray-400 text-sm mt-1">Trouve ton université idéale aux États-Unis</p>
      </div>

      {/* Genre */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Genre</label>
        <div className="flex gap-2">
          {(["M", "F"] as const).map(g => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                backgroundColor: gender === g ? "#2E75B6" : "#1a2236",
                color: gender === g ? "#fff" : "#6b7a99",
                border: `1px solid ${gender === g ? "#2E75B6" : "#1e2d45"}`,
              }}
            >
              {g === "M" ? "Homme" : "Femme"}
            </button>
          ))}
        </div>
      </div>

      {/* Divisions */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Divisions</label>
        <div className="flex flex-wrap gap-2">
          {DIVISIONS_UI.map(div => {
            const checked = selectedDivisions.includes(div.api)
            return (
              <button
                key={div.api}
                onClick={() => toggleDivision(div.api)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: checked ? "#1a3050" : "#111827",
                  color: checked ? "#2E75B6" : "#6b7a99",
                  border: `1px solid ${checked ? "#2E75B6" : "#1e2d45"}`,
                }}
              >
                {div.label}{div.api === "division_10" ? " 🇨🇦" : ""}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filtres optionnels */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Filtres (optionnels)</label>
        <div className="flex flex-col gap-3">
          {/* Budget */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 w-16 shrink-0">Budget</span>
            <select
              value={filterBudget ?? ""}
              onChange={e => setFilterBudget(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-lg text-xs px-2 py-1.5 outline-none"
              style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5" }}
            >
              {BUDGET_OPTIONS.map(opt => (
                <option key={opt.label} value={opt.value ?? ""}>{opt.label}</option>
              ))}
            </select>
          </div>
          {/* Taille */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 w-16 shrink-0">Taille</span>
            {([
              { label: "Toutes",        value: null     },
              { label: "Petite (<3k)",  value: "small"  },
              { label: "Moyenne",       value: "medium" },
              { label: "Grande (>10k)", value: "large"  },
            ] as const).map(opt => (
              <button
                key={opt.label}
                onClick={() => setFilterSize(opt.value)}
                className="px-2.5 py-1 rounded text-xs font-semibold transition-all"
                style={{
                  backgroundColor: filterSize === opt.value ? "#1a3050" : "#111827",
                  color: filterSize === opt.value ? "#60a5fa" : "#6b7a99",
                  border: `1px solid ${filterSize === opt.value ? "#2E75B6" : "#1e2d45"}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 w-16 shrink-0">Type</span>
            {([
              { label: "Tous",   value: null      },
              { label: "Public", value: "public"  },
              { label: "Privé",  value: "private" },
            ] as const).map(opt => (
              <button
                key={opt.label}
                onClick={() => setFilterType(opt.value)}
                className="px-2.5 py-1 rounded text-xs font-semibold transition-all"
                style={{
                  backgroundColor: filterType === opt.value ? "#1a3050" : "#111827",
                  color: filterType === opt.value ? "#60a5fa" : "#6b7a99",
                  border: `1px solid ${filterType === opt.value ? "#2E75B6" : "#1e2d45"}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Temps */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Tes meilleurs temps</label>

        <div className="flex flex-col gap-2">
          {entries.map(entry => (
            <div key={entry.id} className="flex gap-2 items-center">
              <select
                value={entry.event}
                onChange={e => updateEntry(entry.id, "event", e.target.value)}
                className="rounded-lg text-sm font-mono px-2 py-2 outline-none focus:ring-1 focus:ring-blue-600"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5", width: "90px" }}
              >
                {EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
              </select>

              <select
                value={entry.basin}
                onChange={e => updateEntry(entry.id, "basin", e.target.value)}
                className="rounded-lg text-sm px-2 py-2 outline-none focus:ring-1 focus:ring-blue-600"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5", width: "98px" }}
              >
                {BASINS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>

              <input
                type="text"
                value={entry.time}
                onChange={e => updateEntry(entry.id, "time", e.target.value)}
                placeholder={["50FR","50BA","50BR","50FL"].includes(entry.event) ? "22.54" : "1:02.41"}
                className="flex-1 rounded-lg text-sm font-mono px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5" }}
              />

              <button
                onClick={() => removeEntry(entry.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all shrink-0"
                style={{ border: "1px solid #1e2d45" }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {entries.length < 6 && (
          <button
            onClick={addEntry}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: "#2E75B6" }}
          >
            <span className="text-base leading-none">+</span> Ajouter une épreuve
          </button>
        )}

        {selectedDivisions.includes("division_10") && (
          <p className="mt-3 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: "#2d1515", color: "#f87171", border: "1px solid #5c2020" }}>
            🇨🇦 <strong>USports Canada :</strong> utilise <strong>400FR / 800FR / 1500FR</strong> au lieu de 500FR / 1000FR / 1650FR
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm text-red-400" style={{ backgroundColor: "#2d1515", border: "1px solid #5c2020" }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={validEntries.length === 0 || selectedDivisions.length === 0}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all"
        style={{
          backgroundColor: validEntries.length > 0 && selectedDivisions.length > 0 ? "#2E75B6" : "#1a2236",
          color: validEntries.length > 0 && selectedDivisions.length > 0 ? "#fff" : "#4b5a72",
          cursor: validEntries.length > 0 && selectedDivisions.length > 0 ? "pointer" : "not-allowed",
        }}
      >
        Calculer mes matchs
      </button>
    </div>
  )
}
