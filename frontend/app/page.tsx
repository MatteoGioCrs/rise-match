"use client"

import type { CSSProperties } from "react"
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

// ─── Design tokens ────────────────────────────────────────────────────────────

const BEBAS: CSSProperties = { fontFamily: "'Bebas Neue', sans-serif" }
const MONO:  CSSProperties = { fontFamily: "'Space Mono', monospace" }

const C = {
  navy:       "#0B1628",
  navyLight:  "#152236",
  navyMid:    "#1E3A5F",
  maize:      "#FFCB05",
  maizeDark:  "#E6B800",
  slate:      "#8A9BB0",
  slateLight: "#B8C8D8",
  green:      "#2ECC71",
  orange:     "#F39C12",
  red:        "#E74C3C",
}

const SECTION_LABEL: CSSProperties = {
  ...BEBAS,
  fontSize: 13,
  color: C.maize,
  letterSpacing: 2,
  display: "block",
  marginBottom: 10,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function divisionBadge(api: string): { label: string; bg: string; color: string } {
  switch (api) {
    case "division_1":  return { label: "NCAA D1", bg: "#1a3a6b", color: "#6fa3d8" }
    case "division_2":  return { label: "NCAA D2", bg: "#1a4a2e", color: "#5dba78" }
    case "division_3":  return { label: "NCAA D3", bg: "#2a3a1a", color: "#8dba5d" }
    case "division_4":  return { label: "NAIA",    bg: "#2a1a3a", color: "#9d7dca" }
    case "division_5":  return { label: "NJCAA",   bg: "#3a2a1a", color: "#ca9d5d" }
    case "division_10": return { label: "USports", bg: "#3a1a1a", color: "#ca5d5d" }
    default:            return { label: api,        bg: "#1a2236", color: C.slate  }
  }
}

function gradeBadgeStyle(grade: string): { bg: string; color: string } {
  switch (grade) {
    case "A": return { bg: "#0d2d1a", color: C.green }
    case "B": return { bg: "#0a1a3b", color: "#6fa3d8" }
    case "C": return { bg: "#2d1e0f", color: C.orange }
    default:  return { bg: "#2d1515", color: C.red }
  }
}

function gradeOk(grade: string, minGrade: string | null): boolean {
  if (!minGrade) return true
  return GRADE_ORDER.indexOf(grade) <= GRADE_ORDER.indexOf(minGrade)
}

function getLogoUrl(website: string | null): string | null {
  if (!website) return null
  const domain = website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

// ─── Shared Components ────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header style={{
      backgroundColor: C.navy,
      height: 72,
      borderBottom: `2px solid ${C.maize}`,
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 24px",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ ...BEBAS, fontSize: 28, letterSpacing: 1, lineHeight: 1 }}>
            <span style={{ color: C.maize }}>RISE</span>
            <span style={{ color: "#fff" }}>.MATCH</span>
          </div>
          <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Powered by RISE Athletics</div>
        </div>
        <a
          href="https://riseathletics.fr"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: C.slate, textDecoration: "none" }}
        >
          riseathletics.fr ↗
        </a>
      </div>
    </header>
  )
}

function CountryBadge({ country }: { country: string }) {
  const isCA = country === "CA"
  return (
    <span style={{
      ...BEBAS,
      fontSize: 11,
      letterSpacing: 1,
      padding: "2px 6px",
      borderRadius: 4,
      backgroundColor: isCA ? "#4a0a0a" : C.navyMid,
      color: isCA ? "#f87171" : C.maize,
      border: `1px solid ${isCA ? "#7a1a1a" : C.navyMid}`,
      flexShrink: 0,
    }}>
      {isCA ? "CA" : "US"}
    </span>
  )
}

function UniversityLogo({ name, website, size = 36 }: { name: string; website: string | null; size?: number }) {
  const logoUrl = getLogoUrl(website)
  const initials = name.split(/\s+/).filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join("")
  const base: CSSProperties = { width: size, height: size, borderRadius: 6, flexShrink: 0 }
  if (!logoUrl) {
    return (
      <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.navyMid, ...BEBAS, fontSize: Math.round(size * 0.38), color: C.maize }}>
        {initials}
      </div>
    )
  }
  return (
    <div style={{ ...base, position: "relative", overflow: "hidden" }}>
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain", backgroundColor: "#f8fafc", borderRadius: 6, display: "block" }}
        onError={(e) => {
          e.currentTarget.style.display = "none"
          const fb = e.currentTarget.nextElementSibling as HTMLElement | null
          if (fb) fb.style.display = "flex"
        }}
      />
      <div style={{ position: "absolute", inset: 0, display: "none", alignItems: "center", justifyContent: "center", backgroundColor: C.navyMid, ...BEBAS, fontSize: Math.round(size * 0.38), color: C.maize, borderRadius: 6 }}>
        {initials}
      </div>
    </div>
  )
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 6,
        border: `1px solid ${active ? C.maize : "rgba(255,255,255,0.15)"}`,
        backgroundColor: active ? C.maize : "transparent",
        color: active ? C.navy : C.slate,
        fontWeight: active ? 600 : 400,
        fontSize: 13,
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 12px",
        borderRadius: 20,
        border: `1px solid ${active ? C.maize : C.slate}`,
        backgroundColor: active ? C.maize : "transparent",
        color: active ? C.navy : C.slate,
        fontWeight: active ? 600 : 400,
        fontSize: 12,
        cursor: "pointer",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  )
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

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

// ─── Utils ────────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

let nextId = 1

export default function Page() {
  const router = useRouter()

  // ── form state ──
  const [selectedAge,        setSelectedAge]        = useState<number>(17)
  const [gender,             setGender]             = useState<"M" | "F">("M")
  const [selectedDivisions,  setSelectedDivisions]  = useState<string[]>(DIVISIONS_UI.map(d => d.api))
  const [selectedSpecialite, setSelectedSpecialite] = useState<string>("all")
  const [selectedRegions,    setSelectedRegions]    = useState<string[]>([])
  const [selectedStates,     setSelectedStates]     = useState<string[]>([])
  const [entries,            setEntries]            = useState<TimeEntry[]>([
    { id: nextId++, event: "100FR", basin: "LCM", time: "" },
  ])

  // ── filter state (client-side) ──
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
  const availableStates = selectedRegions.flatMap(r => REGIONS_CONFIG[r] ?? [])

  function toggleRegion(region: string) {
    setSelectedRegions(prev => {
      const next = prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
      const nextStates = availableStates.filter(s =>
        next.flatMap(r => REGIONS_CONFIG[r] ?? []).includes(s)
      )
      setSelectedStates(nextStates)
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

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ backgroundColor: C.navy, minHeight: "100vh" }}>
        <Navbar />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 74px)", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 280 }}>
            {[100, 72, 50].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${w}%`,
                  background: `linear-gradient(90deg, ${C.navyLight} 0%, ${C.navyMid} 40%, ${C.maize}33 50%, ${C.navyMid} 60%, ${C.navyLight} 100%)`,
                  backgroundSize: "200% 100%",
                  animation: `shimmer 1.8s ease-in-out ${i * 0.25}s infinite`,
                }}
              />
            ))}
          </div>
          <p style={{ ...MONO, fontSize: 13, color: C.slate, marginTop: 8 }}>
            Analyse de 600+ programmes en cours...
          </p>
        </div>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────

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
      <div style={{ backgroundColor: C.navy, minHeight: "100vh" }}>
        <Navbar />
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>

          {/* Back */}
          <button
            onClick={() => setResults(null)}
            style={{ ...BEBAS, fontSize: 14, letterSpacing: 1, color: C.maize, background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0 }}
          >
            ← RETOUR AU FORMULAIRE
          </button>

          {/* Title */}
          <h1 style={{ ...BEBAS, fontSize: 40, color: "#fff", letterSpacing: 1, marginBottom: 4, lineHeight: 1 }}>
            TES {filtered.length} MEILLEURS MATCHS
          </h1>

          {/* Converted times */}
          {Object.keys(results.scy_times).length > 0 && (
            <p style={{ ...MONO, fontSize: 12, color: C.slate, marginBottom: 20, lineHeight: 1.8 }}>
              Temps SCY :{" "}
              {Object.entries(results.scy_times).map(([event, scy], i) => (
                <span key={event}>{i > 0 && " · "}<span style={{ color: "#fff" }}>{event}</span> {formatScy(scy)}</span>
              ))}
            </p>
          )}

          {/* Filter pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${C.navyMid}`, alignItems: "center" }}>
            <span style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 1 }}>BUDGET</span>
            <FilterPill active={filterBudget === null} onClick={() => setFilterBudget(null)}>Tous</FilterPill>
            {[20000, 35000, 50000, 65000].map(v => (
              <FilterPill key={v} active={filterBudget === v} onClick={() => setFilterBudget(filterBudget === v ? null : v)}>
                &lt;${(v / 1000).toFixed(0)}k
              </FilterPill>
            ))}
            <span style={{ width: 1, height: 20, backgroundColor: C.navyMid, margin: "0 4px" }} />
            <span style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 1 }}>TAILLE</span>
            {([{ l: "Petite", v: "small" }, { l: "Moyenne", v: "medium" }, { l: "Grande", v: "large" }] as const).map(opt => (
              <FilterPill key={opt.v} active={filterSize === opt.v} onClick={() => setFilterSize(filterSize === opt.v ? null : opt.v)}>{opt.l}</FilterPill>
            ))}
            <span style={{ width: 1, height: 20, backgroundColor: C.navyMid, margin: "0 4px" }} />
            {([{ l: "Public", v: "public" }, { l: "Privé", v: "private" }] as const).map(opt => (
              <FilterPill key={opt.v} active={filterType === opt.v} onClick={() => setFilterType(filterType === opt.v ? null : opt.v)}>{opt.l}</FilterPill>
            ))}
            <span style={{ width: 1, height: 20, backgroundColor: C.navyMid, margin: "0 4px" }} />
            <span style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 1 }}>NOTE MIN</span>
            {(["A", "B", "C"] as const).map(g => (
              <FilterPill key={g} active={filterGrade === g} onClick={() => setFilterGrade(filterGrade === g ? null : g)}>{g}</FilterPill>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.slate, ...MONO, fontSize: 13 }}>
              Aucun résultat pour ces filtres.
            </div>
          )}

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filtered.map((match, idx) => {
              const sp    = match.score_sportif    ?? match.score ?? 0
              const sa    = match.score_academique ?? 0
              const sg    = match.score_geo        ?? 0
              const total = match.score_total      ?? match.score ?? 0
              const grade = match.academic_grade   ?? null
              const rang  = match.rang_estime      ?? null
              const b     = divisionBadge(match.division)
              const isOpen = openRosters.has(match.team_id)

              const rangColor = rang === null ? null : rang <= 4 ? C.green : rang <= 8 ? C.orange : C.slate
              const rangBg    = rang === null ? null : rang <= 4 ? "rgba(46,204,113,0.1)" : rang <= 8 ? "rgba(243,156,18,0.1)" : "rgba(138,155,176,0.1)"

              return (
                <div
                  key={match.team_id}
                  onClick={() => typeof match.team_id === "number" && router.push(`/school/${match.team_id}`)}
                  style={{
                    backgroundColor: C.navyLight,
                    borderRadius: 12,
                    borderLeft: `4px solid ${C.maize}`,
                    cursor: "pointer",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    padding: "20px 20px 16px",
                    animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.transform = "translateY(-2px)"
                    el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)"
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.transform = ""
                    el.style.boxShadow = ""
                  }}
                >
                  {/* ROW 1 — Header */}
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {/* Rank */}
                    <div style={{ ...BEBAS, fontSize: 48, color: idx === 0 ? C.maize : idx < 3 ? C.slateLight : C.slate, lineHeight: 1, width: 58, flexShrink: 0, letterSpacing: -1 }}>
                      #{idx + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Logo + country + name + score grid */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <UniversityLogo name={match.name} website={match.academic?.website ?? null} size={36} />
                        <CountryBadge country={match.country} />
                        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: 0, flex: 1, minWidth: 100 }}>
                          {match.name}
                        </h2>
                        {/* Score grid 2×2 */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 14px", flexShrink: 0 }}>
                          {[
                            { icon: "🏊", score: sp,    max: 50  },
                            { icon: "🎓", score: sa,    max: 25  },
                            { icon: "🌍", score: sg,    max: 15  },
                            { icon: "⭐", score: total, max: 100 },
                          ].map(({ icon, score, max }) => (
                            <div key={icon} style={{ ...MONO, fontSize: 12, display: "flex", gap: 3, alignItems: "center" }}>
                              <span>{icon}</span>
                              <span style={{ color: C.maize, fontWeight: 700 }}>{score}</span>
                              <span style={{ color: C.slate }}>/{max}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Division + grade + location row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                        <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, backgroundColor: b.bg, color: b.color }}>
                          {b.label}
                        </span>
                        {grade && grade !== "N/A" && (() => {
                          const gs = gradeBadgeStyle(grade)
                          return (
                            <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, backgroundColor: gs.bg, color: gs.color }}>
                              🎓 {grade}
                            </span>
                          )
                        })()}
                        {match.academic?.pct_pell_grant != null && match.academic.pct_pell_grant > 30 && (
                          <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(46,204,113,0.1)", color: C.green }}>
                            💰 Aides dispo
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: C.slate }}>
                          {match.state}{match.city ? ` · ${match.city}` : ""}
                        </span>
                      </div>

                      {/* ROW 2 — Rang estimé */}
                      {rang !== null && rang !== undefined && (
                        <div style={{ marginTop: 10 }}>
                          <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 6,
                            backgroundColor: rangBg ?? "transparent",
                            color: rangColor ?? C.slate,
                            border: `1px solid ${rangColor ?? C.slate}`,
                            display: "inline-block",
                          }}>
                            📍 Tu serais estimé #{rang} dans l&apos;équipe
                          </span>
                        </div>
                      )}

                      {/* ROW 3 — Stats académiques */}
                      {match.academic && (
                        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 12 }}>
                          {[
                            {
                              icon: "🎓", label: "Admission",
                              value: match.academic.admission_rate === null ? "—"
                                : match.academic.admission_rate > 80 ? "Non sélectif"
                                : `${match.academic.admission_rate}%`
                            },
                            {
                              icon: "💰", label: "Scolarité",
                              value: match.academic.tuition_out_state === null ? "—"
                                : `$${match.academic.tuition_out_state.toLocaleString("en-US")}/an`
                            },
                            {
                              icon: "👥", label: "Taille",
                              value: match.academic.enrollment_total === null ? "—"
                                : match.academic.enrollment_total < 3000
                                ? `Petite (${match.academic.enrollment_total.toLocaleString("en-US")})`
                                : match.academic.enrollment_total <= 10000
                                ? `Moyenne (${match.academic.enrollment_total.toLocaleString("en-US")})`
                                : `Grande (${match.academic.enrollment_total.toLocaleString("en-US")})`
                            },
                            {
                              icon: "💼", label: "Salaire 10y",
                              value: match.academic.median_earnings === null ? "—"
                                : `$${match.academic.median_earnings.toLocaleString("en-US")}`
                            },
                            {
                              icon: "📈", label: "Rétention",
                              value: match.academic.retention_rate === null ? "—" : `${match.academic.retention_rate}%`
                            },
                            {
                              icon: "💳", label: "Dette sortie",
                              value: match.academic.grad_debt_median === null ? "—"
                                : `$${match.academic.grad_debt_median.toLocaleString("en-US")}`
                            },
                          ].map(({ icon, label, value }) => (
                            <div key={label}>
                              <span style={{ fontSize: 11, color: C.slate }}>{icon} {label} </span>
                              <span style={{ ...MONO, fontSize: 12, color: "#fff", fontWeight: 700 }}>{value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ROW 4 — Event ratios */}
                      {Object.entries(match.events).length > 0 && (
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                          {Object.entries(match.events).map(([event, ev]) => {
                            const pct    = ((ev.ratio - 1) * 100).toFixed(1)
                            const faster = ev.ratio < 1
                            const close  = ev.ratio <= 1.05
                            const color  = faster ? C.green : close ? C.orange : C.slate
                            return (
                              <div key={event} style={{ display: "flex", alignItems: "center", gap: 10, ...MONO, fontSize: 12 }}>
                                <span style={{ color: C.slate, width: 60, flexShrink: 0 }}>{event}</span>
                                <span style={{ color: "#fff" }}>{formatScy(ev.athlete_time)}</span>
                                <span style={{ color: C.slate }}>vs</span>
                                <span style={{ color: C.slate }}>{formatScy(ev.team_best)}</span>
                                <span style={{ color, fontWeight: 700 }}>
                                  {faster ? "-" : "+"}{Math.abs(parseFloat(pct))}%
                                </span>
                                {ev.rang && <span style={{ color: C.slate }}>#{ev.rang}</span>}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* ROW 5 — Roster collapsible */}
                      {match.team_times && Object.keys(match.team_times).length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setOpenRosters(prev => {
                                const next = new Set(prev)
                                next.has(match.team_id) ? next.delete(match.team_id) : next.add(match.team_id)
                                return next
                              })
                            }}
                            style={{ ...BEBAS, fontSize: 12, color: C.maize, letterSpacing: 1, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <span style={{ fontSize: 9 }}>{isOpen ? "▼" : "▶"}</span>
                            ROSTER — Meilleurs temps ({Object.keys(match.team_times).length} épreuves)
                          </button>
                          {isOpen && (
                            <div style={{ marginTop: 8, backgroundColor: C.navy, borderRadius: 8, padding: "10px 12px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px 12px" }}>
                                {ROSTER_ORDER.filter(ev => match.team_times[ev]).map(ev => (
                                  <div key={ev} style={{ display: "flex", gap: 6, ...MONO, fontSize: 12 }}>
                                    <span style={{ color: C.slate, width: 48, flexShrink: 0 }}>{ev}</span>
                                    <span style={{ color: C.slateLight }}>{match.team_times[ev].display}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ROW 6 — Website */}
                      {match.academic?.website && (
                        <a
                          href={match.academic.website.startsWith("http") ? match.academic.website : `https://${match.academic.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ display: "inline-block", marginTop: 12, fontSize: 12, color: C.slate, textDecoration: "none", transition: "color 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.color = C.maize)}
                          onMouseLeave={e => (e.currentTarget.style.color = C.slate)}
                        >
                          🌐 Site officiel
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const statesForRegions = selectedRegions.flatMap(r => REGIONS_CONFIG[r] ?? [])
  const canSubmit = validEntries.length > 0 && selectedDivisions.length > 0

  const inputStyle: CSSProperties = {
    backgroundColor: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    outline: "none",
    ...MONO,
  }

  return (
    <div style={{ backgroundColor: C.navy, minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <div style={{
        background: `repeating-linear-gradient(45deg, rgba(255,203,5,0.03) 0px, rgba(255,203,5,0.03) 1px, transparent 1px, transparent 8px), ${C.navy}`,
        padding: "72px 24px 64px",
        textAlign: "center",
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", backgroundColor: C.navy, border: `1px solid ${C.maize}`, padding: "4px 16px", borderRadius: 4, marginBottom: 28 }}>
          <span style={{ ...BEBAS, fontSize: 14, color: C.maize, letterSpacing: 3 }}>🏊 NCAA · NAIA · USports</span>
        </div>
        <h1 style={{ ...BEBAS, lineHeight: 0.95, margin: "0 0 20px" }}>
          <div style={{ fontSize: "clamp(36px, 7vw, 72px)", color: "#fff" }}>TROUVE TON UNIVERSITÉ</div>
          <div style={{ fontSize: "clamp(36px, 7vw, 72px)", color: C.maize }}>IDÉALE AUX ÉTATS-UNIS</div>
        </h1>
        <p style={{ fontSize: 16, color: C.slateLight, marginBottom: 28, lineHeight: 1.6, maxWidth: 500, margin: "0 auto 28px" }}>
          Algorithme de matching sportif × académique — 600+ universités analysées
        </p>
        <div style={{ width: 40, height: 2, backgroundColor: C.maize, margin: "0 auto" }} />
      </div>

      {/* Form container */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{ backgroundColor: C.navyLight, borderRadius: 16, padding: "36px 32px", border: "1px solid rgba(255,203,5,0.15)" }}>

          {/* Âge */}
          <div style={{ marginBottom: 28 }}>
            <label style={SECTION_LABEL}>Âge de départ souhaité</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[15, 16, 17, 18, 19, 20, 21].map(age => (
                <ToggleBtn key={age} active={selectedAge === age} onClick={() => setSelectedAge(age)}>
                  {age === 21 ? "21+" : age}
                </ToggleBtn>
              ))}
            </div>
          </div>

          {/* Genre */}
          <div style={{ marginBottom: 28 }}>
            <label style={SECTION_LABEL}>Genre</label>
            <div style={{ display: "flex", gap: 8 }}>
              <ToggleBtn active={gender === "M"} onClick={() => setGender("M")}>Homme</ToggleBtn>
              <ToggleBtn active={gender === "F"} onClick={() => setGender("F")}>Femme</ToggleBtn>
            </div>
          </div>

          {/* Divisions */}
          <div style={{ marginBottom: 28 }}>
            <label style={SECTION_LABEL}>Divisions</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DIVISIONS_UI.map(div => (
                <ToggleBtn key={div.api} active={selectedDivisions.includes(div.api)} onClick={() => toggleDivision(div.api)}>
                  {div.label}{div.api === "division_10" ? " 🇨🇦" : ""}
                </ToggleBtn>
              ))}
            </div>
          </div>

          {/* Spécialité */}
          <div style={{ marginBottom: 28 }}>
            <label style={SECTION_LABEL}>Spécialité souhaitée</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SPECIALITES.map(sp => (
                <ToggleBtn key={sp.value} active={selectedSpecialite === sp.value} onClick={() => setSelectedSpecialite(sp.value)}>
                  {sp.label}
                </ToggleBtn>
              ))}
            </div>
          </div>

          {/* Localisation */}
          <div style={{ marginBottom: 28 }}>
            <label style={SECTION_LABEL}>Localisation souhaitée</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <ToggleBtn active={selectedRegions.length === 0} onClick={() => { setSelectedRegions([]); setSelectedStates([]) }}>
                Toutes les régions
              </ToggleBtn>
              {Object.entries(REGION_LABELS).map(([key, label]) => (
                <ToggleBtn key={key} active={selectedRegions.includes(key)} onClick={() => toggleRegion(key)}>
                  {label}
                </ToggleBtn>
              ))}
            </div>
            {statesForRegions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {statesForRegions.map(code => (
                  <button
                    key={code}
                    onClick={() => setSelectedStates(prev =>
                      prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
                    )}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 5,
                      border: `1px solid ${selectedStates.includes(code) ? C.maize : "rgba(255,255,255,0.12)"}`,
                      backgroundColor: selectedStates.includes(code) ? "rgba(255,203,5,0.12)" : "transparent",
                      color: selectedStates.includes(code) ? C.maize : C.slate,
                      fontSize: 11,
                      cursor: "pointer",
                      ...MONO,
                    }}
                    title={STATE_NAMES[code]}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filtres optionnels */}
          <div style={{ marginBottom: 28 }}>
            <label style={SECTION_LABEL}>Filtres (optionnels)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: C.slate, minWidth: 52 }}>Budget</span>
                <select
                  value={filterBudget ?? ""}
                  onChange={e => setFilterBudget(e.target.value === "" ? null : Number(e.target.value))}
                  style={{ ...inputStyle, minWidth: 168 }}
                >
                  {BUDGET_OPTIONS.map(opt => <option key={opt.label} value={opt.value ?? ""}>{opt.label}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: C.slate, minWidth: 52 }}>Taille</span>
                {([{ l: "Toutes", v: null }, { l: "Petite", v: "small" }, { l: "Moyenne", v: "medium" }, { l: "Grande", v: "large" }] as const).map(opt => (
                  <ToggleBtn key={String(opt.v)} active={filterSize === opt.v} onClick={() => setFilterSize(opt.v)}>{opt.l}</ToggleBtn>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: C.slate, minWidth: 52 }}>Type</span>
                {([{ l: "Tous", v: null }, { l: "Public", v: "public" }, { l: "Privé", v: "private" }] as const).map(opt => (
                  <ToggleBtn key={String(opt.v)} active={filterType === opt.v} onClick={() => setFilterType(opt.v)}>{opt.l}</ToggleBtn>
                ))}
              </div>
            </div>
          </div>

          {/* Temps */}
          <div style={{ marginBottom: 28 }}>
            <label style={SECTION_LABEL}>Tes meilleurs temps</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {entries.map(entry => (
                <div key={entry.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={entry.event}
                    onChange={e => updateEntry(entry.id, "event", e.target.value)}
                    style={{ ...inputStyle, width: 92, padding: "8px 6px" }}
                  >
                    {EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.value}</option>)}
                  </select>
                  <select
                    value={entry.basin}
                    onChange={e => updateEntry(entry.id, "basin", e.target.value)}
                    style={{ ...inputStyle, width: 102, padding: "8px 6px" }}
                  >
                    {BASINS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  <input
                    type="text"
                    value={entry.time}
                    onChange={e => updateEntry(entry.id, "time", e.target.value)}
                    placeholder={["50FR", "50BA", "50BR", "50FL"].includes(entry.event) ? "22.54" : "1:02.41"}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => removeEntry(entry.id)}
                    style={{ width: 32, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: C.slate, cursor: "pointer", fontSize: 18, flexShrink: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {entries.length < 6 && (
              <button
                onClick={addEntry}
                style={{ marginTop: 10, ...BEBAS, fontSize: 12, letterSpacing: 1, color: C.maize, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6 }}
              >
                + AJOUTER UNE ÉPREUVE
              </button>
            )}
            {selectedDivisions.includes("division_10") && (
              <p style={{ marginTop: 12, fontSize: 12, padding: "8px 12px", borderRadius: 8, backgroundColor: "rgba(202,93,93,0.1)", color: "#f87171", border: "1px solid rgba(202,93,93,0.3)", lineHeight: 1.5 }}>
                🇨🇦 <strong>USports Canada :</strong> utilise <strong>400FR / 800FR / 1500FR</strong> au lieu de 500FR / 1000FR / 1650FR
              </p>
            )}
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13, color: "#f87171", backgroundColor: "rgba(202,93,93,0.1)", border: "1px solid rgba(202,93,93,0.3)" }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: "100%",
              padding: "16px 32px",
              borderRadius: 8,
              backgroundColor: canSubmit ? C.maize : C.navyMid,
              color: canSubmit ? C.navy : C.slate,
              ...BEBAS,
              fontSize: 20,
              letterSpacing: 1,
              border: "none",
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (canSubmit) (e.currentTarget.style.backgroundColor = C.maizeDark); if (canSubmit) (e.currentTarget.style.transform = "scale(1.01)") }}
            onMouseLeave={e => { if (canSubmit) (e.currentTarget.style.backgroundColor = C.maize); (e.currentTarget.style.transform = "") }}
          >
            CALCULER MES MATCHS →
          </button>
        </div>
      </div>
    </div>
  )
}
