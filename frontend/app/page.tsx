"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const API_URL = "https://rise-match-production.up.railway.app/api/match"

const EVENTS = [
  { value: "50FR",   label: "50m Nage Libre" },
  { value: "100FR",  label: "100m Nage Libre" },
  { value: "200FR",  label: "200m Nage Libre" },
  { value: "400FR",  label: "400m NL (USports)" },
  { value: "500FR",  label: "500y / 400m NL" },
  { value: "800FR",  label: "800m NL (USports)" },
  { value: "1000FR", label: "1000y Nage Libre" },
  { value: "1500FR", label: "1500m NL (USports)" },
  { value: "1650FR", label: "1650y / 1500m NL" },
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
  { label: "NCAA D1", api: "division_1"  },
  { label: "NCAA D2", api: "division_2"  },
  { label: "NCAA D3", api: "division_3"  },
  { label: "NAIA",    api: "division_4"  },
  { label: "NJCAA",   api: "division_5"  },
  { label: "USports", api: "division_10" },
]

const ROSTER_ORDER = [
  "50FR","100FR","200FR","500FR","1000FR","1650FR",
  "50BA","100BA","200BA",
  "50BR","100BR","200BR",
  "50FL","100FL","200FL",
  "200IM","400IM",
]

const SPECIALITES = [
  { label: "Toutes",              value: "all" },
  { label: "Ingénierie & Tech",   value: "has_engineering" },
  { label: "Business & Finance",  value: "has_business" },
  { label: "Sciences & Médecine", value: "has_sciences" },
  { label: "Sciences humaines",   value: "has_humanities" },
  { label: "Arts & Design",       value: "has_arts" },
  { label: "Sciences sociales",   value: "has_social_sciences" },
  { label: "Sport & Kiné",        value: "has_sports_kine" },
  { label: "Éducation",           value: "has_education" },
  { label: "Droit",               value: "has_law" },
  { label: "Environnement",       value: "has_environment" },
]

const REGIONS_CONFIG: Record<string, string[]> = {
  east:    ["ME","NH","VT","MA","RI","CT","NY","NJ","PA","MD","DE","VA","WV","NC","SC","GA","FL"],
  west:    ["CA","OR","WA","AK","HI","NV","ID","MT","WY","UT","CO","AZ","NM"],
  midwest: ["ND","SD","NE","KS","MN","IA","MO","WI","MI","IL","IN","OH"],
  south:   ["TX","OK","AR","LA","MS","AL","TN","KY"],
}

const REGION_LABELS: Record<string, string> = {
  east: "Côte Est", west: "Côte Ouest", midwest: "Midwest", south: "Sud",
}

const STATE_NAMES: Record<string, string> = {
  ME:"Maine", NH:"New Hampshire", VT:"Vermont", MA:"Massachusetts",
  RI:"Rhode Island", CT:"Connecticut", NY:"New York", NJ:"New Jersey",
  PA:"Pennsylvania", MD:"Maryland", DE:"Delaware", VA:"Virginia",
  WV:"West Virginia", NC:"North Carolina", SC:"South Carolina",
  GA:"Georgia", FL:"Florida",
  CA:"Californie", OR:"Oregon", WA:"Washington", AK:"Alaska",
  HI:"Hawaï", NV:"Nevada", ID:"Idaho", MT:"Montana",
  WY:"Wyoming", UT:"Utah", CO:"Colorado", AZ:"Arizona", NM:"New Mexico",
  ND:"North Dakota", SD:"South Dakota", NE:"Nebraska", KS:"Kansas",
  MN:"Minnesota", IA:"Iowa", MO:"Missouri", WI:"Wisconsin",
  MI:"Michigan", IL:"Illinois", IN:"Indiana", OH:"Ohio",
  TX:"Texas", OK:"Oklahoma", AR:"Arkansas", LA:"Louisiane",
  MS:"Mississippi", AL:"Alabama", TN:"Tennessee", KY:"Kentucky",
}

const BUDGET_OPTIONS = [
  { label: "Tous les budgets", value: null },
  { label: "< $20,000",        value: 20000 },
  { label: "< $35,000",        value: 35000 },
  { label: "< $50,000",        value: 50000 },
  { label: "< $65,000",        value: 65000 },
]

const GRADE_ORDER = ["A", "B", "C", "D", "F"]

// ─── helpers ──────────────────────────────────────────────────────────────────

function divisionBadge(api: string): { label: string; bg: string; color: string } {
  switch (api) {
    case "division_1":  return { label: "NCAA D1", bg: "#1a2f50", color: "#60a5fa" }
    case "division_2":  return { label: "NCAA D2", bg: "#1a2f50", color: "#60a5fa" }
    case "division_3":  return { label: "NCAA D3", bg: "#1a2f50", color: "#60a5fa" }
    case "division_4":  return { label: "NAIA",    bg: "#1a3020", color: "#4ade80" }
    case "division_5":  return { label: "NJCAA",   bg: "#2d1e0f", color: "#fb923c" }
    case "division_10": return { label: "USports", bg: "#2d1515", color: "#f87171" }
    default:            return { label: api,        bg: "#1a2236", color: "#94a3b8" }
  }
}

function gradeBadgeStyle(grade: string): { bg: string; color: string } {
  switch (grade) {
    case "A": return { bg: "#0d2d1a", color: "#4ade80" }
    case "B": return { bg: "#0a1a3b", color: "#60a5fa" }
    case "C": return { bg: "#2d1e0f", color: "#fb923c" }
    default:  return { bg: "#2d1515", color: "#f87171" }
  }
}

function gradeOk(grade: string, minGrade: string | null): boolean {
  if (!minGrade) return true
  return GRADE_ORDER.indexOf(grade) <= GRADE_ORDER.indexOf(minGrade)
}

function CountryBadge({ country }: { country: string }) {
  const isCA = country === "CA"
  return (
    <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
      style={{ backgroundColor: isCA ? "#3b0a0a" : "#0a1a3b", color: isCA ? "#fca5a5" : "#93c5fd" }}>
      {isCA ? "CA" : "US"}
    </span>
  )
}

function ScoreBar({ icon, label, value, max, color }: { icon: string; label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="shrink-0 text-base leading-none">{icon}</span>
      <span className="text-gray-400 shrink-0" style={{ width: "70px" }}>{label}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: "#1e2d45", height: "4px", minWidth: "40px" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-gray-300 tabular-nums shrink-0" style={{ width: "36px", textAlign: "right" }}>{value}/{max}</span>
    </div>
  )
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
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ backgroundColor: "#1a2236", color: "#60a5fa" }}>
        {initials}
      </div>
    )
  }
  return (
    <div className="relative w-8 h-8 shrink-0">
      <img src={logoUrl} alt={name} width={32} height={32}
        className="w-8 h-8 rounded-lg object-contain"
        style={{ backgroundColor: "#f8fafc" }}
        onError={(e) => {
          e.currentTarget.style.display = "none"
          const fb = e.currentTarget.nextElementSibling as HTMLElement | null
          if (fb) fb.style.display = "flex"
        }}
      />
      <div className="w-8 h-8 rounded-lg items-center justify-center shrink-0 text-xs font-bold absolute inset-0"
        style={{ backgroundColor: "#1a2236", color: "#60a5fa", display: "none" }}>
        {initials}
      </div>
    </div>
  )
}

// ─── interfaces ───────────────────────────────────────────────────────────────

interface TimeEntry { id: number; event: string; basin: string; time: string }

interface EventMatch {
  athlete_time: number; team_best: number; ratio: number
  rang?: number; pts?: number
}

interface AcademicData {
  admission_rate: number | null; tuition_out_state: number | null
  enrollment_total: number | null; median_earnings: number | null
  school_type: string | null; retention_rate: number | null
  pct_pell_grant: number | null; grad_debt_median: number | null
  latitude: number | null; longitude: number | null; website: string | null
  has_engineering?: boolean | null; has_business?: boolean | null
  has_sciences?: boolean | null; has_humanities?: boolean | null
  has_arts?: boolean | null; has_social_sciences?: boolean | null
  has_sports_kine?: boolean | null; has_education?: boolean | null
  has_law?: boolean | null; has_environment?: boolean | null
  top_programs?: string | null
}

interface TeamTime { seconds: number; display: string }

interface MatchResult {
  team_id: number | string; name: string; division: string
  state: string; city: string; country: string
  score: number; score_total?: number
  score_sportif?: number; score_academique?: number; score_geo?: number
  academic_grade?: string; rang_estime?: number | null
  relay_bonus?: number; departing_bonus?: number
  events: Record<string, EventMatch>
  academic: AcademicData | null
  team_times: Record<string, TeamTime>
}

interface ApiResponse {
  scy_times: Record<string, number>
  matches: MatchResult[]
  error?: string
}

// ─── utils ────────────────────────────────────────────────────────────────────

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

// ─── page ─────────────────────────────────────────────────────────────────────

let nextId = 1

const BTN = (active: boolean) => ({
  backgroundColor: active ? "#1a3050" : "#111827",
  color:           active ? "#60a5fa" : "#6b7a99",
  border:         `1px solid ${active ? "#2E75B6" : "#1e2d45"}`,
})

export default function Page() {
  const router = useRouter()

  // ── form state ──
  const [selectedAge,       setSelectedAge]       = useState<number>(17)
  const [gender,            setGender]            = useState<"M" | "F">("M")
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(DIVISIONS_UI.map(d => d.api))
  const [selectedSpecialite,setSelectedSpecialite]= useState<string>("all")
  const [selectedRegions,   setSelectedRegions]   = useState<string[]>([])
  const [selectedStates,    setSelectedStates]    = useState<string[]>([])
  const [entries,           setEntries]           = useState<TimeEntry[]>([
    { id: nextId++, event: "100FR", basin: "LCM", time: "" },
  ])

  // ── filter state (client-side on results) ──
  const [filterBudget, setFilterBudget] = useState<number | null>(null)
  const [filterSize,   setFilterSize]   = useState<"small" | "medium" | "large" | null>(null)
  const [filterType,   setFilterType]   = useState<"public" | "private" | null>(null)
  const [filterGrade,  setFilterGrade]  = useState<string | null>(null)

  // ── app state ──
  const [loading,     setLoading]     = useState(false)
  const [results,     setResults]     = useState<ApiResponse | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [openRosters, setOpenRosters] = useState<Set<number | string>>(new Set())

  // ── region/state helpers ──
  const availableStates = selectedRegions.length > 0
    ? selectedRegions.flatMap(r => REGIONS_CONFIG[r] ?? [])
    : []

  function toggleRegion(region: string) {
    setSelectedRegions(prev => {
      const next = prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
      // Remove states that no longer belong to any selected region
      const newStates = availableStates.filter(s =>
        next.flatMap(r => REGIONS_CONFIG[r] ?? []).includes(s)
      )
      setSelectedStates(newStates)
      return next
    })
  }

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
          event: e.event, basin: e.basin, time_seconds: parseTime(e.time),
        })),
        gender,
        divisions: selectedDivisions,
        age: selectedAge,
        specialite: selectedSpecialite,
        regions: selectedRegions,
        states: selectedStates,
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

  // ── loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: "#0A0E1A" }}>
        <div className="w-10 h-10 border-2 border-transparent border-t-blue-400 rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Analyse en cours…</p>
      </div>
    )
  }

  // ── results ──────────────────────────────────────────────────────────────────
  if (results) {
    const filtered = results.matches.filter(match => {
      const ac = match.academic
      if (!ac) return true
      if (filterBudget !== null && ac.tuition_out_state !== null && ac.tuition_out_state >= filterBudget) return false
      if (filterSize === "small"  && (ac.enrollment_total === null || ac.enrollment_total >= 3000))  return false
      if (filterSize === "medium" && (ac.enrollment_total === null || ac.enrollment_total < 3000 || ac.enrollment_total > 10000)) return false
      if (filterSize === "large"  && (ac.enrollment_total === null || ac.enrollment_total <= 10000)) return false
      if (filterType === "public"  && ac.school_type !== "public")  return false
      if (filterType === "private" && ac.school_type !== "private") return false
      if (filterGrade && match.academic_grade && match.academic_grade !== "N/A") {
        if (!gradeOk(match.academic_grade, filterGrade)) return false
      }
      return true
    })

    return (
      <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto" style={{ backgroundColor: "#0A0E1A" }}>
        <button onClick={() => setResults(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition-colors">
          ← Retour
        </button>

        <h1 className="text-2xl font-bold text-white mb-1">
          {filtered.length > 0 ? `${filtered.length} match${filtered.length > 1 ? "s" : ""} trouvé${filtered.length > 1 ? "s" : ""}` : "Aucun match trouvé"}
        </h1>

        {Object.keys(results.scy_times).length > 0 && (
          <p className="text-gray-400 text-sm mb-5">
            Temps convertis en SCY :{" "}
            {Object.entries(results.scy_times).map(([event, scy], i) => (
              <span key={event}>{i > 0 && " · "}<span className="text-white">{event}</span> {formatScy(scy)}s</span>
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
              <select value={filterBudget ?? ""} onChange={e => setFilterBudget(e.target.value === "" ? null : Number(e.target.value))}
                className="rounded-lg text-xs px-2 py-1.5 outline-none"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5" }}>
                {BUDGET_OPTIONS.map(opt => <option key={opt.label} value={opt.value ?? ""}>{opt.label}</option>)}
              </select>
            </div>
            {/* Taille */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 w-16 shrink-0">Taille</span>
              {([{ label: "Toutes", value: null }, { label: "Petite (<3k)", value: "small" }, { label: "Moyenne", value: "medium" }, { label: "Grande (>10k)", value: "large" }] as const).map(opt => (
                <button key={opt.label} onClick={() => setFilterSize(opt.value)}
                  className="px-2.5 py-1 rounded text-xs font-semibold" style={BTN(filterSize === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 w-16 shrink-0">Type</span>
              {([{ label: "Tous", value: null }, { label: "Public", value: "public" }, { label: "Privé", value: "private" }] as const).map(opt => (
                <button key={opt.label} onClick={() => setFilterType(opt.value)}
                  className="px-2.5 py-1 rounded text-xs font-semibold" style={BTN(filterType === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
            {/* Note académique min */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 w-16 shrink-0">Note min</span>
              {([{ label: "Toutes", value: null }, { label: "A", value: "A" }, { label: "B", value: "B" }, { label: "C", value: "C" }] as const).map(opt => (
                <button key={opt.label} onClick={() => setFilterGrade(opt.value)}
                  className="px-2.5 py-1 rounded text-xs font-semibold" style={BTN(filterGrade === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="rounded-xl p-6 text-center text-gray-400"
            style={{ backgroundColor: "#111827", border: "1px solid #1e2d45" }}>
            Aucun résultat pour ces filtres.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {filtered.map((match, idx) => {
            const sp    = match.score_sportif    ?? match.score ?? 0
            const sa    = match.score_academique ?? 0
            const sg    = match.score_geo        ?? 0
            const total = match.score_total      ?? match.score ?? 0
            const grade = match.academic_grade   ?? null
            const rang  = match.rang_estime      ?? null

            return (
              <div key={match.team_id} className="rounded-xl p-5"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", cursor: "pointer" }}
                onClick={() => typeof match.team_id === "number" && router.push(`/school/${match.team_id}`)}>

                <div className="flex items-start gap-4">
                  {/* Rank number */}
                  <span className="text-3xl font-black tabular-nums leading-none mt-1 shrink-0"
                    style={{ color: idx === 0 ? "#2E75B6" : "#374151", minWidth: "2rem" }}>
                    #{idx + 1}
                  </span>

                  <div className="flex-1 min-w-0">
                    {/* Name row + score panel */}
                    <div className="flex items-start gap-3 flex-wrap">
                      {/* Left: logo + country + name */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <UniversityLogo name={match.name} website={match.academic?.website ?? null} />
                        <CountryBadge country={match.country} />
                        <h2 className="text-base font-bold text-white leading-tight">{match.name}</h2>
                      </div>
                      {/* Right: score panel */}
                      <div className="rounded-lg px-3 py-2 flex flex-col gap-1 shrink-0"
                        style={{ backgroundColor: "#0d1525", minWidth: "190px" }}>
                        <ScoreBar icon="🏊" label="Sportif"    value={sp} max={50} color="#3b82f6" />
                        <ScoreBar icon="🎓" label="Académique" value={sa} max={25} color="#8b5cf6" />
                        <ScoreBar icon="🌍" label="Géo"        value={sg} max={15} color="#10b981" />
                        <div className="flex items-center justify-between text-xs font-bold mt-0.5 pt-1"
                          style={{ borderTop: "1px solid #1e2d45" }}>
                          <span className="text-gray-400">⭐ Total</span>
                          <span className="text-white">{total}/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Division + grade + pell + location */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {(() => {
                        const b = divisionBadge(match.division)
                        return (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: b.bg, color: b.color }}>
                            {b.label}
                          </span>
                        )
                      })()}
                      {grade && grade !== "N/A" && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={gradeBadgeStyle(grade)}>
                          🎓 {grade}
                        </span>
                      )}
                      {match.academic?.pct_pell_grant != null && match.academic.pct_pell_grant > 30 && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#0d2d1a", color: "#4ade80" }}>
                          💰 Aides dispo
                        </span>
                      )}
                      <span className="text-gray-500 text-xs">
                        {match.state}{match.city ? ` · ${match.city}` : ""}
                      </span>
                    </div>

                    {/* Rang estimé */}
                    {rang !== null && rang !== undefined && (
                      <div className="mt-1.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: rang <= 4 ? "#0d2d1a" : rang <= 8 ? "#2d1e0f" : "#1a2236",
                            color:           rang <= 4 ? "#4ade80"  : rang <= 8 ? "#fb923c"  : "#94a3b8",
                          }}>
                          📍 Tu serais estimé #{rang} dans l&apos;équipe
                        </span>
                      </div>
                    )}

                    {/* Academic metrics 2x3 */}
                    {match.academic && (
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg px-3 py-2.5 text-xs"
                        style={{ backgroundColor: "#0d1525" }}>
                        <div>
                          <span className="text-gray-500">🎓 Admission </span>
                          <span className="text-gray-200 font-semibold">
                            {match.academic.admission_rate === null ? "—"
                              : match.academic.admission_rate > 80 ? "Non sélectif"
                              : `${match.academic.admission_rate}%`}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">💰 Scolarité </span>
                          <span className="text-gray-200 font-semibold">
                            {match.academic.tuition_out_state === null ? "—"
                              : `$${match.academic.tuition_out_state.toLocaleString("en-US")}/an`}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">👥 Taille </span>
                          <span className="text-gray-200 font-semibold">
                            {match.academic.enrollment_total === null ? "—"
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
                            {match.academic.median_earnings === null ? "—"
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
                            {match.academic.grad_debt_median === null ? "—"
                              : `$${match.academic.grad_debt_median.toLocaleString("en-US")}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Roster collapsible */}
                    {match.team_times && Object.keys(match.team_times).length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setOpenRosters(prev => {
                              const next = new Set(prev)
                              next.has(match.team_id) ? next.delete(match.team_id) : next.add(match.team_id)
                              return next
                            })
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold w-full text-left"
                          style={{ color: "#4b6fa8" }}>
                          <span style={{ fontSize: "10px" }}>{openRosters.has(match.team_id) ? "▼" : "▶"}</span>
                          ROSTER — Meilleurs temps ({Object.keys(match.team_times).length} épreuves)
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
                          const pct    = ((ev.ratio - 1) * 100).toFixed(1)
                          const faster = ev.ratio < 1
                          const close  = ev.ratio <= 1.05
                          const color  = faster ? "#22c55e" : close ? "#f59e0b" : "#6b7280"
                          return (
                            <div key={event} className="flex items-center gap-2 text-xs">
                              <span className="font-mono text-gray-300 w-14 shrink-0">{event}</span>
                              <span className="text-gray-400">
                                {formatScy(ev.athlete_time)}s <span className="text-gray-600">vs</span> {formatScy(ev.team_best)}s
                              </span>
                              <span className="font-semibold" style={{ color }}>
                                {faster ? "-" : "+"}{Math.abs(parseFloat(pct))}%
                              </span>
                              {ev.rang && (
                                <span className="text-gray-500">#{ev.rang}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Website link */}
                    {match.academic?.website && (
                      <a href={match.academic.website.startsWith("http") ? match.academic.website : `https://${match.academic.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs transition-colors"
                        style={{ color: "#4b6fa8" }}
                        onClick={e => e.stopPropagation()}
                        onMouseOver={e => (e.currentTarget.style.color = "#60a5fa")}
                        onMouseOut={e => (e.currentTarget.style.color = "#4b6fa8")}>
                        🌐 Visiter le site officiel
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── form ─────────────────────────────────────────────────────────────────────
  const statesForRegions = selectedRegions.flatMap(r => REGIONS_CONFIG[r] ?? [])

  return (
    <div className="min-h-screen px-4 py-8 max-w-xl mx-auto" style={{ backgroundColor: "#0A0E1A" }}>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-black tracking-tight text-white">
          RISE<span style={{ color: "#2E75B6" }}>.</span>MATCH
        </h1>
        <p className="text-gray-400 text-sm mt-1">Trouve ton université idéale aux États-Unis</p>
      </div>

      {/* Âge de départ */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
          Âge de départ souhaité
        </label>
        <div className="flex flex-wrap gap-2">
          {[15,16,17,18,19,20,21].map(age => (
            <button key={age} onClick={() => setSelectedAge(age)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={selectedAge === age
                ? { backgroundColor: "#2E75B6", color: "#fff", border: "1px solid #2E75B6" }
                : { backgroundColor: "#1a2236", color: "#6b7a99", border: "1px solid #1e2d45" }}>
              {age === 21 ? "21+" : age}
            </button>
          ))}
        </div>
      </div>

      {/* Genre */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Genre</label>
        <div className="flex gap-2">
          {(["M", "F"] as const).map(g => (
            <button key={g} onClick={() => setGender(g)}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={gender === g
                ? { backgroundColor: "#2E75B6", color: "#fff", border: "1px solid #2E75B6" }
                : { backgroundColor: "#1a2236", color: "#6b7a99", border: "1px solid #1e2d45" }}>
              {g === "M" ? "Homme" : "Femme"}
            </button>
          ))}
        </div>
      </div>

      {/* Divisions */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Divisions</label>
        <div className="flex flex-wrap gap-2">
          {DIVISIONS_UI.map(div => (
            <button key={div.api} onClick={() => toggleDivision(div.api)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={BTN(selectedDivisions.includes(div.api))}>
              {div.label}{div.api === "division_10" ? " 🇨🇦" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Spécialité */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
          Spécialité souhaitée
        </label>
        <div className="flex flex-wrap gap-2">
          {SPECIALITES.map(sp => (
            <button key={sp.value} onClick={() => setSelectedSpecialite(sp.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={BTN(selectedSpecialite === sp.value)}>
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Localisation */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
          Localisation souhaitée
        </label>
        {/* Régions */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => { setSelectedRegions([]); setSelectedStates([]) }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={BTN(selectedRegions.length === 0)}>
            Toutes les régions
          </button>
          {Object.entries(REGION_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => toggleRegion(key)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={BTN(selectedRegions.includes(key))}>
              {label}
            </button>
          ))}
        </div>
        {/* États */}
        {statesForRegions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {statesForRegions.map(code => (
              <button key={code}
                onClick={() => setSelectedStates(prev =>
                  prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
                )}
                className="px-2 py-1 rounded text-xs font-semibold transition-all"
                style={BTN(selectedStates.includes(code))}>
                {code} — {STATE_NAMES[code] ?? code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtres optionnels */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Filtres (optionnels)
        </label>
        <div className="flex flex-col gap-3">
          {/* Budget */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 w-16 shrink-0">Budget</span>
            <select value={filterBudget ?? ""} onChange={e => setFilterBudget(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-lg text-xs px-2 py-1.5 outline-none"
              style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5" }}>
              {BUDGET_OPTIONS.map(opt => <option key={opt.label} value={opt.value ?? ""}>{opt.label}</option>)}
            </select>
          </div>
          {/* Taille */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 w-16 shrink-0">Taille</span>
            {([{ label: "Toutes", value: null }, { label: "Petite (<3k)", value: "small" }, { label: "Moyenne", value: "medium" }, { label: "Grande (>10k)", value: "large" }] as const).map(opt => (
              <button key={opt.label} onClick={() => setFilterSize(opt.value)}
                className="px-2.5 py-1 rounded text-xs font-semibold" style={BTN(filterSize === opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {/* Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 w-16 shrink-0">Type</span>
            {([{ label: "Tous", value: null }, { label: "Public", value: "public" }, { label: "Privé", value: "private" }] as const).map(opt => (
              <button key={opt.label} onClick={() => setFilterType(opt.value)}
                className="px-2.5 py-1 rounded text-xs font-semibold" style={BTN(filterType === opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Temps */}
      <div className="mb-7">
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Tes meilleurs temps
        </label>
        <div className="flex flex-col gap-2">
          {entries.map(entry => (
            <div key={entry.id} className="flex gap-2 items-center">
              <select value={entry.event} onChange={e => updateEntry(entry.id, "event", e.target.value)}
                className="rounded-lg text-sm font-mono px-2 py-2 outline-none focus:ring-1 focus:ring-blue-600"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5", width: "90px" }}>
                {EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
              </select>
              <select value={entry.basin} onChange={e => updateEntry(entry.id, "basin", e.target.value)}
                className="rounded-lg text-sm px-2 py-2 outline-none focus:ring-1 focus:ring-blue-600"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5", width: "98px" }}>
                {BASINS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
              <input type="text" value={entry.time} onChange={e => updateEntry(entry.id, "time", e.target.value)}
                placeholder={["50FR","50BA","50BR","50FL"].includes(entry.event) ? "22.54" : "1:02.41"}
                className="flex-1 rounded-lg text-sm font-mono px-3 py-2 outline-none focus:ring-1 focus:ring-blue-600"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45", color: "#e8edf5" }} />
              <button onClick={() => removeEntry(entry.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all shrink-0"
                style={{ border: "1px solid #1e2d45" }}>
                ×
              </button>
            </div>
          ))}
        </div>

        {entries.length < 6 && (
          <button onClick={addEntry}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: "#2E75B6" }}>
            <span className="text-base leading-none">+</span> Ajouter une épreuve
          </button>
        )}

        {selectedDivisions.includes("division_10") && (
          <p className="mt-3 text-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#2d1515", color: "#f87171", border: "1px solid #5c2020" }}>
            🇨🇦 <strong>USports Canada :</strong> utilise <strong>400FR / 800FR / 1500FR</strong> au lieu de 500FR / 1000FR / 1650FR
          </p>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm text-red-400"
          style={{ backgroundColor: "#2d1515", border: "1px solid #5c2020" }}>
          {error}
        </div>
      )}

      <button onClick={handleSubmit}
        disabled={validEntries.length === 0 || selectedDivisions.length === 0}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all"
        style={{
          backgroundColor: validEntries.length > 0 && selectedDivisions.length > 0 ? "#2E75B6" : "#1a2236",
          color:            validEntries.length > 0 && selectedDivisions.length > 0 ? "#fff"    : "#4b5a72",
          cursor:           validEntries.length > 0 && selectedDivisions.length > 0 ? "pointer" : "not-allowed",
        }}>
        Calculer mes matchs
      </button>
    </div>
  )
}
