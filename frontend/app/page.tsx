"use client"

import { useState } from "react"

const API_URL = "https://rise-match-production.up.railway.app/api/match"

const EVENTS = [
  "50FR", "100FR", "200FR", "500FR", "1000FR", "1650FR",
  "50BA", "100BA", "200BA",
  "50BR", "100BR", "200BR",
  "50FL", "100FL", "200FL",
  "200IM", "400IM",
]

const BASINS = [
  { value: "LCM", label: "LCM (50m)" },
  { value: "SCM", label: "SCM (25m)" },
  { value: "SCY", label: "SCY (25y)" },
]

const DIVISIONS_UI = [
  { label: "NCAA D1", api: "division_1" },
  { label: "NCAA D2", api: "division_2" },
  { label: "NCAA D3", api: "division_3" },
  { label: "NAIA",    api: "division_4" },
]

interface TimeEntry {
  id: number
  event: string
  basin: string
  time: string
}

interface EventMatch {
  athlete_scy: number
  team_best_scy: number
  ratio: number
}

interface MatchResult {
  team_id: number
  name: string
  division: string
  state: string
  city: string
  score: number
  events: Record<string, EventMatch>
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

function divisionLabel(api: string): string {
  return DIVISIONS_UI.find(d => d.api === api)?.label ?? api
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
    return (
      <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto" style={{ backgroundColor: "#0A0E1A" }}>
        <button
          onClick={() => setResults(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-sm transition-colors"
        >
          <span>&#8592;</span> Retour
        </button>

        <h1 className="text-2xl font-bold text-white mb-1">
          {results.matches.length > 0
            ? `Tes ${Math.min(results.matches.length, 20)} meilleurs matchs`
            : "Aucun match trouvé"}
        </h1>

        {Object.keys(results.scy_times).length > 0 && (
          <p className="text-gray-400 text-sm mb-8">
            Temps convertis en SCY :{" "}
            {Object.entries(results.scy_times).map(([event, scy], i) => (
              <span key={event}>
                {i > 0 && " · "}
                <span className="text-white">{event}</span> {formatScy(scy)}s
              </span>
            ))}
          </p>
        )}

        {results.matches.length === 0 && (
          <div
            className="rounded-xl p-6 text-center text-gray-400"
            style={{ backgroundColor: "#111827", border: "1px solid #1e2d45" }}
          >
            Aucune université ne correspond à ces critères. Essaie avec moins de divisions ou des temps plus lents.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {results.matches.map((match, idx) => (
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
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-white leading-tight">{match.name}</h2>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                      style={{ backgroundColor: "#1a2236", color: "#2E75B6" }}
                    >
                      {match.score} épreuve{match.score > 1 ? "s" : ""} matchée{match.score > 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {divisionLabel(match.division)}{match.state ? ` · ${match.state}` : ""}{match.city ? ` · ${match.city}` : ""}
                  </p>

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
                              {formatScy(ev.athlete_scy)}s <span className="text-gray-600">vs</span> {formatScy(ev.team_best_scy)}s
                            </span>
                            <span className="font-semibold" style={{ color }}>
                              {faster ? "-" : "+"}{Math.abs(parseFloat(pct))}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
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
                {div.label}
              </button>
            )
          })}
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
                {EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
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
                placeholder={entry.event.includes("F") && !entry.event.includes("M") && parseInt(entry.event) <= 100 ? "22.54" : "1:02.41"}
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
