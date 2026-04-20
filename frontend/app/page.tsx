"use client"

import type { CSSProperties } from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const API_BASE = "https://rise-match-production.up.railway.app"
const API_URL = `${API_BASE}/api/match`

// ─── SCY Conversion ────────────────────────────────────────────────────────────

const FACTEURS_LCM_SCY: Record<string, number> = {
  "50FR": 0.864, "100FR": 0.865, "200FR": 0.869,
  "400FR": 0.869, "500FR": 0.869, "1000FR": 0.869, "1650FR": 0.869,
  "50BA": 0.848, "100BA": 0.856, "200BA": 0.858,
  "50BR": 0.901, "100BR": 0.853, "200BR": 0.853,
  "50FL": 0.940, "100FL": 0.878, "200FL": 0.878,
  "100IM": 0.862, "200IM": 0.858, "400IM": 0.866,
}
const FACTEUR_SCM_SCY = 0.976

function convertToSCY(event: string, basin: string, timeStr: string): string | null {
  if (!timeStr || !timeStr.trim()) return null
  const clean = timeStr.trim()
  let t: number
  if (clean.includes(":")) {
    const parts = clean.split(":")
    t = parseInt(parts[0]) * 60 + parseFloat(parts[1])
  } else {
    t = parseFloat(clean)
  }
  if (isNaN(t) || t <= 0) return null
  let scy: number
  if (basin === "SCY") { scy = t }
  else if (basin === "SCM") { scy = t * FACTEUR_SCM_SCY }
  else {
    const f = FACTEURS_LCM_SCY[event]
    if (!f) return null
    scy = t * f
  }
  const mins = Math.floor(scy / 60)
  const secs = scy % 60
  return mins > 0 ? `${mins}:${secs.toFixed(2).padStart(5, "0")}` : secs.toFixed(2)
}

// ─── Constants ─────────────────────────────────────────────────────────────────

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
  WV:"West Virginia", NC:"North Carolina", SC:"South Carolina", GA:"Georgia", FL:"Florida",
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

// ─── Design tokens ─────────────────────────────────────────────────────────────

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
  white: "#FFFFFF"
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return mobile
}

// ─── Shared components ─────────────────────────────────────────────────────────

function Navbar({ onHome, showNewSearch, onNewSearch }: {
  onHome: () => void
  showNewSearch?: boolean
  onNewSearch?: () => void
}) {
  return (
    <header style={{ backgroundColor: C.navy, height: 72, borderBottom: `1px solid rgba(255,255,255,0.08)`, position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        
        {/* ── GAUCHE : Logo + Branding ── */}
        <button onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <img 
            src="/rise-logo.svg" 
            alt="RISE Logo" 
            style={{ height: "38px", width: "auto" }} 
          />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
            <span style={{ ...BEBAS, fontSize: 22, color: C.white, letterSpacing: 1, lineHeight: 1 }}>
              RISE<span style={{ color: C.maize }}>.MATCH</span>
            </span>
            <span style={{ fontSize: 10, color: C.slate, letterSpacing: 0.5, marginTop: 2 }}>
              BY RISE ATHLETICS
            </span>
          </div>
        </button>

        {/* ── DROITE : Navigation ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          
          {showNewSearch && onNewSearch && (
            <button 
              onClick={onNewSearch} 
              style={{ ...BEBAS, fontSize: 15, letterSpacing: 1, color: C.slate, background: "none", border: "none", cursor: "pointer", transition: "color 0.2s", marginRight: 8 }}
              onMouseEnter={e => e.currentTarget.style.color = C.white}
              onMouseLeave={e => e.currentTarget.style.color = C.slate}
            >
              NOUVELLE RECHERCHE
            </button>
          )}
          
          {/* Nav links */}
          <Link href="/a-propos"          style={{ color: C.slate, fontSize: 12, textDecoration: "none", ...INTER }}>À propos</Link>
          <Link href="/comment-ca-marche" style={{ color: C.slate, fontSize: 12, textDecoration: "none", ...INTER }}>Comment ça marche</Link>
          <Link href="/le-sport-aux-usa"  style={{ color: C.slate, fontSize: 12, textDecoration: "none", ...INTER }}>Le Sport aux USA</Link>

          {/* Bouton Secondaire : L'Agence (Outline) */}
          <a
            href="https://riseathletics.fr"
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              backgroundColor: "transparent",
              color: C.maize,
              border: `1px solid ${C.maize}`,
              padding: "8px 18px",
              borderRadius: 6,
              ...BEBAS, 
              fontSize: 15, 
              letterSpacing: 1, 
              textDecoration: "none", 
              transition: "all 0.2s" 
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,203,5,0.1)"; e.currentTarget.style.color = C.maize; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.maize; }}
          >
            L'AGENCE ↗
          </a>

          {/* Bouton Secondaire : Admin (Outline) */}
          <Link 
            href="/admin" 
            style={{ 
              backgroundColor: "transparent",
              color: C.maize,
              border: `1px solid ${C.maize}`,
              padding: "8px 18px",
              borderRadius: 6,
              ...BEBAS, 
              fontSize: 15, 
              letterSpacing: 1, 
              textDecoration: "none", 
              transition: "all 0.2s" 
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,203,5,0.1)"; e.currentTarget.style.color = C.maize; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = C.maize; }}
          >
            ADMIN
          </Link>

          {/* Bouton Principal : Espace Client (Solid) */}
          <Link 
            href="/client" 
            style={{ 
              backgroundColor: C.maize,
              color: C.navy,
              padding: "9px 24px",
              borderRadius: 6,
              ...BEBAS,
              fontSize: 16,
              letterSpacing: 1,
              textDecoration: "none",
              transition: "transform 0.2s, background-color 0.2s",
              marginLeft: 4
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.maizeDark; e.currentTarget.style.transform = "translateY(-2px)" }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.maize; e.currentTarget.style.transform = "" }}
          >
            ESPACE CLIENT
          </Link>

        </div>
      </div>
    </header>
  )
}

function Breadcrumb({ state, onHome, onForm }: { state: "form" | "results"; onHome: () => void; onForm?: () => void }) {
  const linkStyle: CSSProperties = { background: "none", border: "none", cursor: "pointer", color: C.slate, fontSize: 12, padding: 0 }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.slate, paddingTop: 8 }}>
      <button onClick={onHome} style={linkStyle}>Accueil</button>
      <span>→</span>
      {state === "results" && onForm ? (
        <>
          <button onClick={onForm} style={linkStyle}>Formulaire</button>
          <span>→</span>
          <span style={{ color: C.slateLight }}>Résultats</span>
        </>
      ) : (
        <span style={{ color: C.slateLight }}>Formulaire</span>
      )}
    </div>
  )
}

function CountryBadge({ country }: { country: string }) {
  const isCA = country === "CA"
  return (
    <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, backgroundColor: isCA ? "#4a0a0a" : C.navyMid, color: isCA ? "#f87171" : C.maize, flexShrink: 0 }}>
      {isCA ? "CA" : "US"}
    </span>
  )
}

function UniversityLogo({ name, website, size = 36 }: { name: string; website: string | null; size?: number }) {
  const logoUrl = getLogoUrl(website)
  const initials = name.split(/\s+/).filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join("")
  const base: CSSProperties = { width: size, height: size, borderRadius: 6, flexShrink: 0 }
  if (!logoUrl) {
    return <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.navyMid, ...BEBAS, fontSize: Math.round(size * 0.38), color: C.maize }}>{initials}</div>
  }
  return (
    <div style={{ ...base, position: "relative" }}>
      <img src={logoUrl} alt={name} width={size} height={size}
        style={{ width: size, height: size, objectFit: "contain", backgroundColor: "#f8fafc", borderRadius: 6, display: "block" }}
        onError={e => {
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

function ToggleBtn({ active, onClick, children, fullWidth }: { active: boolean; onClick: () => void; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 14px", borderRadius: 6,
      border: `1px solid ${active ? C.maize : "rgba(255,255,255,0.15)"}`,
      backgroundColor: active ? C.maize : "transparent",
      color: active ? C.navy : C.slate,
      fontWeight: active ? 600 : 400, fontSize: 13,
      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
      width: fullWidth ? "100%" : "auto",
    }}>
      {children}
    </button>
  )
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 12px", borderRadius: 20,
      border: `1px solid ${active ? C.maize : C.slate}`,
      backgroundColor: active ? C.maize : "transparent",
      color: active ? C.navy : C.slate,
      fontWeight: active ? 600 : 400, fontSize: 12,
      cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
    }}>
      {children}
    </button>
  )
}

function CounterStat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") { setCount(target); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) {
        setStarted(true)
        const t0 = Date.now()
        const tick = () => {
          const p = Math.min((Date.now() - t0) / 1500, 1)
          setCount(Math.round((1 - Math.pow(1 - p, 3)) * target))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, started])

  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div style={{ ...BEBAS, fontSize: "clamp(36px, 5vw, 56px)", color: C.maize, lineHeight: 1 }}>{count}{suffix}</div>
      <div style={{ fontSize: 14, color: C.slate, marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <div
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onTouchStart={() => setVisible(v => !v)}
    >
      {children}
      {visible && (
        <div style={{ position: "absolute", bottom: "130%", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1E3A5F", border: "1px solid rgba(255,203,5,0.3)", borderRadius: 8, padding: "12px 16px", width: 280, zIndex: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", pointerEvents: "none" }}>
          {content}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid rgba(255,203,5,0.3)" }} />
        </div>
      )}
    </div>
  )
}

const TOOLTIP_SPORT = (
  <div>
    <p style={{ ...BEBAS, color: "#FFCB05", letterSpacing: 1, marginBottom: 8, margin: "0 0 8px" }}>SCORE SPORTIF /50</p>
    <ul style={{ fontSize: 12, color: "#B8C8D8", lineHeight: 1.6, margin: 0, paddingLeft: 16 }}>
      <li>#2-#4 dans l&apos;équipe → 25 pts <span style={{ color: "#FFCB05" }}>(zone idéale)</span></li>
      <li>#1 dans l&apos;équipe → 15 pts</li>
      <li>Plus de 4% plus rapide que le #1 → 5 pts <span style={{ color: "#F39C12" }}>(trop dominant)</span></li>
      <li>#5-#8 → 15 pts · #9+ → 2 pts</li>
      <li>Top 4 sur 2+ épreuves du même style → +5 pts relay</li>
      <li>Nageurs partants devant toi → +5 pts</li>
    </ul>
  </div>
)

const TOOLTIP_ACAD = (
  <div>
    <p style={{ ...BEBAS, color: "#FFCB05", letterSpacing: 1, margin: "0 0 8px" }}>SCORE ACADÉMIQUE /25</p>
    <ul style={{ fontSize: 12, color: "#B8C8D8", lineHeight: 1.6, margin: 0, paddingLeft: 16 }}>
      <li>Spécialité souhaitée disponible → +15 pts</li>
      <li>Taux de rétention &gt; 85% → +4 pts</li>
      <li>Salaire médian &gt; $70k → +4 pts</li>
      <li>École sélective (admission &lt; 30%) → +2 pts</li>
    </ul>
  </div>
)

const TOOLTIP_GEO = (
  <div>
    <p style={{ ...BEBAS, color: "#FFCB05", letterSpacing: 1, margin: "0 0 8px" }}>SCORE GÉOGRAPHIQUE /15</p>
    <ul style={{ fontSize: 12, color: "#B8C8D8", lineHeight: 1.6, margin: 0, paddingLeft: 16 }}>
      <li>École dans ta région souhaitée → 15 pts</li>
      <li>École dans ton état exact → 15 pts</li>
      <li>Aucun filtre géo sélectionné → 15 pts auto</li>
    </ul>
  </div>
)

const TOOLTIP_TOTAL = (
  <div>
    <p style={{ ...BEBAS, color: "#FFCB05", letterSpacing: 1, margin: "0 0 8px" }}>SCORE GLOBAL /100</p>
    <p style={{ fontSize: 12, color: "#B8C8D8", lineHeight: 1.6, margin: "0 0 8px" }}>
      Somme : sportif (50) + académique (25) + géographique (15) + bonus (10 max).
    </p>
    <p style={{ fontSize: 11, color: "#8A9BB0", margin: 0 }}>
      Un score élevé = l&apos;école correspond à ton profil sportif ET à tes critères académiques/géographiques.
    </p>
  </div>
)

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface TimeEntry { id: number; event: string; basin: string; time: string }

interface EventMatch {
  athlete_time: number; team_best: number; ratio: number
  rang?: number; rang_futur?: number; pts?: number
  team_size?: number; percentile?: number
  athlete_wa_pts?: number; rang_wa?: number; team_wa_points?: number[]
  data_quality?: string
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

interface WaSummary {
  athlete_total_wa: number; rang_wa_global: number
  team_total_size: number; percentile_global: number
  team_wa_sorted: number[]
}

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
  wa_summary?: WaSummary
}

interface ApiResponse { scy_times: Record<string, number>; matches: MatchResult[]; error?: string; session_token?: string }

// ─── Utils ─────────────────────────────────────────────────────────────────────

function parseTime(s: string): number {
  s = s.trim()
  if (s.includes(":")) { const [m, sec] = s.split(":"); return parseInt(m) * 60 + parseFloat(sec) }
  return parseFloat(s)
}

function formatScy(seconds: number): string {
  if (seconds >= 60) { const m = Math.floor(seconds / 60); return `${m}:${(seconds % 60).toFixed(2).padStart(5, "0")}` }
  return seconds.toFixed(2)
}

// ─── Main ──────────────────────────────────────────────────────────────────────

let nextId = 1
type AppState = "landing" | "form" | "results"

export default function Page() {
  const router = useRouter()
  const isMobile = useIsMobile()

  // ── navigation ──
  const [appState,  setAppState]  = useState<AppState>("landing")
  const [formMode,  setFormMode]  = useState<"simple" | "advanced">("simple")

  // ── form ──
  const [selectedAge,        setSelectedAge]        = useState<number>(17)
  const [gender,             setGender]             = useState<"M" | "F">("M")
  const [selectedDivisions,  setSelectedDivisions]  = useState<string[]>(DIVISIONS_UI.map(d => d.api))
  const [selectedSpecialite, setSelectedSpecialite] = useState<string>("all")
  const [selectedRegions,    setSelectedRegions]    = useState<string[]>([])
  const [selectedStates,     setSelectedStates]     = useState<string[]>([])
  const [entries,            setEntries]            = useState<TimeEntry[]>([
    { id: nextId++, event: "100FR", basin: "LCM", time: "" },
  ])

  // ── filters ──
  const [filterBudget, setFilterBudget] = useState<number | null>(null)
  const [filterSize,   setFilterSize]   = useState<"small" | "medium" | "large" | null>(null)
  const [filterType,   setFilterType]   = useState<"public" | "private" | null>(null)
  const [filterGrade,  setFilterGrade]  = useState<string | null>(null)

  // ── app ──
  const [loading,     setLoading]     = useState(false)
  const [results,     setResults]     = useState<ApiResponse | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [openRosters, setOpenRosters] = useState<Set<number | string>>(new Set())

  // ── localStorage ──
  useEffect(() => {
    try {
      const m = localStorage.getItem("risematch_mode")
      if (m === "simple" || m === "advanced") setFormMode(m)
      const e = localStorage.getItem("risematch_entries")
      if (e) {
        const parsed = JSON.parse(e) as TimeEntry[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          nextId = Math.max(...parsed.map(x => x.id)) + 1
          setEntries(parsed)
        }
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { try { localStorage.setItem("risematch_mode", formMode) } catch { /* ignore */ } }, [formMode])
  useEffect(() => { try { localStorage.setItem("risematch_entries", JSON.stringify(entries)) } catch { /* ignore */ } }, [entries])

  // ── scroll to top on state change ──
  useEffect(() => { if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }) }, [appState])

  // ── helpers ──
  function toggleRegion(region: string) {
    setSelectedRegions(prev => {
      const next = prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
      const valid = next.flatMap(r => REGIONS_CONFIG[r] ?? [])
      setSelectedStates(s => s.filter(st => valid.includes(st)))
      return next
    })
  }

  function toggleDivision(api: string) {
    setSelectedDivisions(prev => prev.includes(api) ? prev.filter(d => d !== api) : [...prev, api])
  }

  function addEntry() {
    if (entries.length >= 6) return
    setEntries(prev => [...prev, { id: nextId++, event: "100FR", basin: "LCM", time: "" }])
  }

  function removeEntry(id: number) { setEntries(prev => prev.filter(e => e.id !== id)) }
  function updateEntry(id: number, field: keyof TimeEntry, value: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const validEntries = entries.filter(e => e.time.trim() !== "" && !isNaN(parseTime(e.time)))

  async function handleSubmit(
    overrideTimes?: Array<{ event: string; basin: string; time_seconds: number }>,
    overrideGender?: "M" | "F",
    overrideDivisions?: string[]
  ) {
    const times = overrideTimes ?? validEntries.map(e => ({ event: e.event, basin: e.basin, time_seconds: parseTime(e.time) }))
    if (times.length === 0) return
    const divs = overrideDivisions ?? (formMode === "simple" ? DIVISIONS_UI.map(d => d.api) : selectedDivisions)

    setLoading(true); setError(null); setResults(null)
    try {
      const body = {
        times,
        gender: overrideGender ?? gender,
        divisions: divs,
        age: formMode === "simple" ? 17 : selectedAge,
        specialite: formMode === "simple" ? "all" : selectedSpecialite,
        regions: formMode === "simple" ? [] : selectedRegions,
        states: formMode === "simple" ? [] : selectedStates,
      }
      const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`)
      const data: ApiResponse = await res.json()
      setResults(data); setAppState("results")

      // Persister le token en localStorage pour survivre à un rechargement de page
      if (data.session_token) {
        localStorage.setItem("rise_last_session_token", data.session_token)
      }

      // Auto-link session to user account if flag is set
      const sessionToken = data.session_token
      if (sessionToken) {
        const userToken = typeof window !== "undefined" ? localStorage.getItem("rise_user_token") : null
        const linkFlag  = typeof window !== "undefined" ? localStorage.getItem("rise_link_next_session") : null
        if (userToken && linkFlag) {
          localStorage.removeItem("rise_link_next_session")
          fetch(`${API_BASE}/api/auth/link-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${userToken}` },
            body: JSON.stringify({ session_token: sessionToken }),
          }).catch(() => {})
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue")
      setAppState("form")
    } finally { setLoading(false) }
  }

  async function handleDemoSearch() {
    await handleSubmit(
      [{ event: "100FR", basin: "LCM", time_seconds: 52.94 }, { event: "50FR", basin: "LCM", time_seconds: 24.05 }],
      "M",
      DIVISIONS_UI.filter(d => d.api !== "division_10").map(d => d.api)
    )
  }

  // ── LOADING ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ backgroundColor: C.navy, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar onHome={() => setAppState("landing")} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 280 }}>
            {[100, 72, 50].map((w, i) => (
              <div key={i} style={{
                height: 6, borderRadius: 3, width: `${w}%`,
                background: `linear-gradient(90deg, ${C.navyLight} 0%, ${C.navyMid} 40%, ${C.maize}33 50%, ${C.navyMid} 60%, ${C.navyLight} 100%)`,
                backgroundSize: "200% 100%",
                animation: `shimmer 1.8s ease-in-out ${i * 0.25}s infinite`,
              }} />
            ))}
          </div>
          <p style={{ ...MONO, fontSize: 13, color: C.slate }}>Analyse de 600+ programmes en cours...</p>
        </div>
      </div>
    )
  }

  // ── LANDING ────────────────────────────────────────────────────────────────

  if (appState === "landing") {
    const heroBg = `repeating-linear-gradient(45deg, rgba(255,203,5,0.04) 0px, rgba(255,203,5,0.04) 1px, transparent 1px, transparent 10px), ${C.navy}`
    return (
      <div style={{ backgroundColor: C.navy }}>
        <Navbar onHome={() => setAppState("landing")} />

        {/* HERO */}
        <section style={{ background: heroBg, minHeight: "calc(100vh - 72px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: isMobile ? "60px 20px 48px" : "80px 24px 60px", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-block", border: "1px solid rgba(255,203,5,0.4)", borderRadius: 20, padding: "6px 16px", marginBottom: 28 }}>
            <span style={{ ...BEBAS, fontSize: 13, color: C.maize, letterSpacing: 3 }}>🏊 NCAA · NAIA · NJCAA · USports </span>
          </div>
          <h1 style={{ ...BEBAS, lineHeight: 0.92, margin: "0 0 24px" }}>
            <div style={{ fontSize: isMobile ? 42 : 80, color: "#fff" }}>TROUVE TON UNIVERSITÉ</div>
            <div style={{ fontSize: isMobile ? 42 : 80, color: C.maize }}>IDÉALE AUX ÉTATS-UNIS</div>
          </h1>
          <p style={{ fontSize: isMobile ? 16 : 18, color: C.slateLight, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, marginBottom: 28 }}>
            L&apos;algorithme qui analyse 600+ universités américaines<br />
            pour trouver le programme sportif et académique fait pour toi.
          </p>
          <div style={{ width: 60, height: 3, backgroundColor: C.maize, margin: "0 auto 36px" }} />
          <div style={{ display: "flex", gap: 12, flexDirection: isMobile ? "column" : "row", alignItems: "center", justifyContent: "center", width: isMobile ? "100%" : "auto", maxWidth: 420 }}>
            <button
              onClick={() => setAppState("form")}
              style={{ ...BEBAS, fontSize: 18, letterSpacing: 1, backgroundColor: C.maize, color: C.navy, padding: "16px 28px", borderRadius: 8, border: "none", cursor: "pointer", transition: "all 0.15s", width: isMobile ? "100%" : "auto" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.maizeDark; e.currentTarget.style.transform = "scale(1.02)" }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.maize; e.currentTarget.style.transform = "" }}
            >
              COMMENCER →
            </button>
            <button
              onClick={handleDemoSearch}
              style={{ ...BEBAS, fontSize: 18, letterSpacing: 1, backgroundColor: "transparent", color: "#fff", padding: "16px 28px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.15s", width: isMobile ? "100%" : "auto" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.maize; e.currentTarget.style.color = C.maize }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "#fff" }}
            >
              VOIR UN EXEMPLE
            </button>
          </div>
          <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", fontSize: 12, color: C.slate, animation: "pulse 2s ease-in-out infinite" }}>
            ↓ En savoir plus
          </div>
        </section>

        {/* STATS */}
        <section style={{ backgroundColor: C.navyLight, padding: isMobile ? "40px 20px" : "60px 24px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", alignItems: "center" }}>
            <CounterStat target={600} suffix="+" label="Universités analysées" />
            <div style={{ height: isMobile ? 40 : 60, backgroundColor: "rgba(255,203,5,0.2)" }} />
            
            {/* Changement : Focus exclusif sur la natation */}
            <CounterStat target={600} suffix="+" label="Programmes de natation" />
            
            <div style={{ height: isMobile ? 40 : 60, backgroundColor: "rgba(255,203,5,0.2)" }} />
            <CounterStat target={100} suffix="%" label="Gratuit à l'essai" />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ backgroundColor: C.navy, padding: isMobile ? "60px 20px" : "80px 24px" }}>
          <h2 style={{ ...BEBAS, fontSize: isMobile ? 28 : 36, color: C.maize, letterSpacing: 4, textAlign: "center", marginBottom: 48 }}>
            COMMENT ÇA MARCHE
          </h2>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20 }}>
            {[
              { num: "01", icon: "⏱️", title: "ENTRE TES TEMPS",   text: "Renseigne tes meilleurs temps en LCM, SCM ou SCY. Notre algo les convertit automatiquement." },
              { num: "02", icon: "🔬", title: "L'ALGO ANALYSE",    text: "600+ universités analysées en quelques secondes. Rang estimé dans l'équipe, fit académique, géographie." },
              { num: "03", icon: "🎯", title: "TROUVE TON MATCH",  text: "Reçois une liste personnalisée avec scores sportif, académique et géographique pour chaque université." },
            ].map(step => (
              <div key={step.num} style={{ backgroundColor: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 28, position: "relative", overflow: "hidden" }}>
                <div style={{ ...BEBAS, fontSize: 64, color: "rgba(255,203,5,0.12)", position: "absolute", top: -8, right: 16, lineHeight: 1 }}>{step.num}</div>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{step.icon}</div>
                <div style={{ ...BEBAS, fontSize: 20, color: C.maize, letterSpacing: 1, marginBottom: 10 }}>{step.title}</div>
                <p style={{ fontSize: 14, color: C.slateLight, lineHeight: 1.7, margin: 0 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WHY */}
        <section style={{ backgroundColor: C.navyLight, padding: isMobile ? "60px 20px" : "80px 24px" }}>
          <h2 style={{ ...BEBAS, fontSize: isMobile ? 28 : 36, color: "#fff", letterSpacing: 1, textAlign: "center", marginBottom: 48 }}>
            POURQUOI RISE.MATCH ?
          </h2>
          <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 28 }}>
            {[
              { title: "Basé sur les données réelles",   text: "Pas d'estimations — nous analysons les vrais temps des 16 000+ nageurs inscrits en NCAA/NAIA." },
              { title: "Rang estimé dans l'équipe",      text: "Tu sauras si tu serais #2 ou #8 de l'équipe avant même de contacter un coach." },
              { title: "Données académiques complètes",  text: "Taux d'admission, scolarité, salaire médian, spécialités — tout pour décider en connaissance de cause." },
              { title: "Gratuit, sans inscription",      text: "Aucun compte requis. Résultats immédiats." },
            ].map(item => (
              <div key={item.title} style={{ display: "flex", gap: 14 }}>
                <span style={{ color: C.maize, flexShrink: 0, fontSize: 18, marginTop: 2 }}>✅</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{item.title}</div>
                  <p style={{ fontSize: 14, color: C.slate, lineHeight: 1.7, margin: 0 }}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section style={{ backgroundColor: C.navy, padding: isMobile ? "60px 20px" : "80px 24px", textAlign: "center" }}>
          <h2 style={{ ...BEBAS, fontSize: isMobile ? 32 : 48, color: "#fff", marginBottom: 16, letterSpacing: 1 }}>
            PRÊT À TROUVER TON UNIVERSITÉ ?
          </h2>
          <p style={{ fontSize: 16, color: C.slate, marginBottom: 40, lineHeight: 1.7 }}>
            Rejoins les athlètes français qui ont trouvé leur programme grâce à RISE.MATCH
          </p>
          <button
            onClick={() => setAppState("form")}
            style={{ ...BEBAS, fontSize: 18, letterSpacing: 1, backgroundColor: C.maize, color: C.navy, padding: "16px 40px", borderRadius: 8, border: "none", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.maizeDark; e.currentTarget.style.transform = "scale(1.02)" }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.maize; e.currentTarget.style.transform = "" }}
          >
            TROUVER MON MATCH →
          </button>
        </section>
      </div>
    )
  }

  // ── FORM ───────────────────────────────────────────────────────────────────

  if (appState === "form") {
    const statesForRegions = selectedRegions.flatMap(r => REGIONS_CONFIG[r] ?? [])
    const canSubmit = validEntries.length > 0 && (formMode === "simple" || selectedDivisions.length > 0)

    const inputStyle: CSSProperties = {
      backgroundColor: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "#fff", borderRadius: 8, padding: "8px 10px", fontSize: 14, outline: "none", ...MONO,
    }
    const SL: CSSProperties = { ...BEBAS, fontSize: 13, color: C.maize, letterSpacing: 2, display: "block", marginBottom: 10 }

    return (
      <div style={{ backgroundColor: C.navy, minHeight: "100vh" }}>
        <Navbar onHome={() => setAppState("landing")} />
        <div style={{ maxWidth: 700, margin: "0 auto", padding: isMobile ? "16px 16px 60px" : "28px 24px 80px" }}>
          <Breadcrumb state="form" onHome={() => setAppState("landing")} />

          {/* Simple / Advanced toggle */}
          <div style={{ marginTop: 24, marginBottom: 32 }}>
            <div style={{ display: "flex", width: "fit-content", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
              {(["simple", "advanced"] as const).map(mode => (
                <button key={mode} onClick={() => setFormMode(mode)} style={{
                  ...BEBAS, fontSize: 15, letterSpacing: 1, padding: "10px 24px",
                  backgroundColor: formMode === mode ? C.maize : "transparent",
                  color: formMode === mode ? C.navy : C.slate,
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                }}>
                  {mode === "simple" ? "MODE SIMPLE" : "MODE AVANCÉ"}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: C.slate, marginTop: 8 }}>
              {formMode === "simple"
                ? "Genre + temps uniquement — résultats en 30 secondes"
                : "Tous les filtres pour un matching précis"}
            </p>
          </div>

          <div style={{ backgroundColor: C.navyLight, borderRadius: 16, padding: isMobile ? "24px 18px" : "36px 32px", border: "1px solid rgba(255,203,5,0.15)" }}>

            {/* Genre */}
            <div style={{ marginBottom: 28 }}>
              <label style={SL}>Genre</label>
              <div style={{ display: "flex", gap: 8 }}>
                <ToggleBtn active={gender === "M"} onClick={() => setGender("M")}>Homme</ToggleBtn>
                <ToggleBtn active={gender === "F"} onClick={() => setGender("F")}>Femme</ToggleBtn>
              </div>
            </div>

            {/* Temps + SCY feedback */}
            <div style={{ marginBottom: 28 }}>
              <label style={SL}>Tes meilleurs temps</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {entries.map(entry => {
                  const scy = convertToSCY(entry.event, entry.basin, entry.time)
                  const isSCY = entry.basin === "SCY"
                  const showFb = entry.time.trim() !== "" && (scy !== null || isSCY)

                  return (
                    <div key={entry.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {isMobile ? (
                        <>
                          <div style={{ display: "flex", gap: 6 }}>
                            <select value={entry.event} onChange={e => updateEntry(entry.id, "event", e.target.value)} style={{ ...inputStyle, flex: 2, padding: "8px 6px" }}>
                              {EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.value}</option>)}
                            </select>
                            <select value={entry.basin} onChange={e => updateEntry(entry.id, "basin", e.target.value)} style={{ ...inputStyle, flex: 2, padding: "8px 6px" }}>
                              {BASINS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                            </select>
                            <button onClick={() => removeEntry(entry.id)} style={{ width: 36, height: 38, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: C.slate, cursor: "pointer", fontSize: 18, flexShrink: 0 }}>×</button>
                          </div>
                          <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
                            <input type="text" value={entry.time} onChange={e => updateEntry(entry.id, "time", e.target.value)}
                              placeholder={["50FR","50BA","50BR","50FL"].includes(entry.event) ? "22.54" : "1:02.41"}
                              style={{ ...inputStyle, flex: 1, borderRadius: showFb ? "8px 0 0 8px" : 8 }} />
                            {showFb && (
                              <div style={{ display: "flex", alignItems: "center", padding: "0 10px", backgroundColor: isSCY ? "rgba(46,204,113,0.08)" : "rgba(255,203,5,0.08)", border: `1px solid ${isSCY ? "rgba(46,204,113,0.2)" : "rgba(255,203,5,0.2)"}`, borderLeft: `2px solid ${isSCY ? C.green : C.maize}`, borderRadius: "0 8px 8px 0" }}>
                                <span style={{ ...MONO, fontSize: 11, color: isSCY ? C.green : C.maize, whiteSpace: "nowrap" }}>{isSCY ? "SCY ✓" : `≈ ${scy}`}</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select value={entry.event} onChange={e => updateEntry(entry.id, "event", e.target.value)} style={{ ...inputStyle, width: 88, padding: "8px 6px" }}>
                            {EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.value}</option>)}
                          </select>
                          <select value={entry.basin} onChange={e => updateEntry(entry.id, "basin", e.target.value)} style={{ ...inputStyle, width: 98, padding: "8px 6px" }}>
                            {BASINS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                          </select>
                          <input type="text" value={entry.time} onChange={e => updateEntry(entry.id, "time", e.target.value)}
                            placeholder={["50FR","50BA","50BR","50FL"].includes(entry.event) ? "22.54" : "1:02.41"}
                            style={{ ...inputStyle, width: 96, borderRadius: showFb ? "8px 0 0 8px" : 8 }} />
                          {showFb ? (
                            <div style={{ display: "flex", alignItems: "center", height: 38, paddingLeft: 10, paddingRight: 12, backgroundColor: isSCY ? "rgba(46,204,113,0.08)" : "rgba(255,203,5,0.08)", border: `1px solid ${isSCY ? "rgba(46,204,113,0.2)" : "rgba(255,203,5,0.2)"}`, borderLeft: `2px solid ${isSCY ? C.green : C.maize}`, borderRadius: "0 8px 8px 0", flex: 1, gap: 6 }}>
                              <span style={{ ...MONO, fontSize: 12, color: isSCY ? C.green : C.maize, whiteSpace: "nowrap" }}>
                                {isSCY ? "SCY natif ✓" : `≈ ${scy} SCY ✓`}
                              </span>
                            </div>
                          ) : <div style={{ flex: 1 }} />}
                          <button onClick={() => removeEntry(entry.id)} style={{ width: 32, height: 38, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: C.slate, cursor: "pointer", fontSize: 18, flexShrink: 0 }}>×</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {entries.length < 6 && (
                <button onClick={addEntry} style={{ marginTop: 10, ...BEBAS, fontSize: 12, letterSpacing: 1, color: C.maize, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  + AJOUTER UNE ÉPREUVE
                </button>
              )}
              <p style={{ marginTop: 12, fontSize: 12, padding: "8px 12px", borderRadius: 8, backgroundColor: "rgba(202,93,93,0.1)", color: "#f87171", border: "1px solid rgba(202,93,93,0.3)", lineHeight: 1.5 }}>
                <span style={{ display: "inline-block", padding: "1px 5px", fontSize: 10, fontWeight: 700, background: "#c0392b", color: "#fff", borderRadius: 3, fontFamily: "Inter, sans-serif", verticalAlign: "middle", lineHeight: 1.4, marginRight: 6 }}>CA</span>
                <strong>USports Canada :</strong> utilise <strong>400FR / 800FR / 1500FR</strong> au lieu de 500FR / 1000FR / 1650FR
              </p>
            </div>

            {/* ADVANCED ONLY */}
            {formMode === "advanced" && (
              <>
                {/* Divisions */}
                <div style={{ marginBottom: 28 }}>
                  <label style={SL}>Divisions</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {DIVISIONS_UI.map(div => (
                      <ToggleBtn key={div.api} active={selectedDivisions.includes(div.api)} onClick={() => toggleDivision(div.api)}>
                        {div.label}{div.api === "division_10" && (
                          <span style={{ display: "inline-block", marginLeft: 6, padding: "1px 5px", fontSize: 10, fontWeight: 700, background: "#c0392b", color: "#fff", borderRadius: 3, fontFamily: "Inter, sans-serif", verticalAlign: "middle", lineHeight: 1.4 }}>CA</span>
                        )}
                      </ToggleBtn>
                    ))}
                  </div>
                </div>

                {/* Spécialité */}
                <div style={{ marginBottom: 28 }}>
                  <label style={SL}>Spécialité souhaitée</label>
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
                  <label style={SL}>Localisation souhaitée</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    <ToggleBtn active={selectedRegions.length === 0} onClick={() => { setSelectedRegions([]); setSelectedStates([]) }}>Toutes les régions</ToggleBtn>
                    {Object.entries(REGION_LABELS).map(([key, label]) => (
                      <ToggleBtn key={key} active={selectedRegions.includes(key)} onClick={() => toggleRegion(key)}>{label}</ToggleBtn>
                    ))}
                  </div>
                  {statesForRegions.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {statesForRegions.map(code => (
                        <button key={code} title={STATE_NAMES[code]}
                          onClick={() => setSelectedStates(prev => prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code])}
                          style={{ padding: "4px 8px", borderRadius: 5, border: `1px solid ${selectedStates.includes(code) ? C.maize : "rgba(255,255,255,0.12)"}`, backgroundColor: selectedStates.includes(code) ? "rgba(255,203,5,0.12)" : "transparent", color: selectedStates.includes(code) ? C.maize : C.slate, fontSize: 11, cursor: "pointer", ...MONO }}>
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Âge */}
                <div style={{ marginBottom: 28 }}>
                  <label style={SL}>Âge de départ souhaité</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[15, 16, 17, 18, 19, 20, 21].map(age => (
                      <ToggleBtn key={age} active={selectedAge === age} onClick={() => setSelectedAge(age)}>
                        {age === 21 ? "21+" : age}
                      </ToggleBtn>
                    ))}
                  </div>
                </div>

                {/* Filtres optionnels */}
                <div style={{ marginBottom: 28 }}>
                  <label style={SL}>Filtres (optionnels)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: C.slate, minWidth: 52 }}>Budget</span>
                      <select value={filterBudget ?? ""} onChange={e => setFilterBudget(e.target.value === "" ? null : Number(e.target.value))} style={{ ...inputStyle, minWidth: 168 }}>
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
              </>
            )}

            {error && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13, color: "#f87171", backgroundColor: "rgba(202,93,93,0.1)", border: "1px solid rgba(202,93,93,0.3)" }}>
                {error}
              </div>
            )}

            <button
              onClick={() => handleSubmit()}
              disabled={!canSubmit}
              style={{ width: "100%", padding: "16px 32px", borderRadius: 8, backgroundColor: canSubmit ? C.maize : C.navyMid, color: canSubmit ? C.navy : C.slate, ...BEBAS, fontSize: 20, letterSpacing: 1, border: "none", cursor: canSubmit ? "pointer" : "not-allowed", transition: "all 0.15s" }}
              onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.backgroundColor = C.maizeDark; e.currentTarget.style.transform = "scale(1.01)" } }}
              onMouseLeave={e => { if (canSubmit) e.currentTarget.style.backgroundColor = C.maize; e.currentTarget.style.transform = "" }}
            >
              CALCULER MES MATCHS →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────

  if (!results) return null

  const sessionToken = results.session_token || "";

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
      <Navbar onHome={() => setAppState("landing")} showNewSearch onNewSearch={() => setAppState("form")} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "16px 16px 60px" : "28px 24px 80px" }}>
        <Breadcrumb state="results" onHome={() => setAppState("landing")} onForm={() => setAppState("form")} />

        <h1 style={{ ...BEBAS, fontSize: isMobile ? 28 : 40, color: "#fff", letterSpacing: 1, marginBottom: 4, lineHeight: 1, marginTop: 16 }}>
          TES {filtered.length} MEILLEURS MATCHS
        </h1>

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
          <span style={{ width: 1, height: 20, backgroundColor: C.navyMid, margin: "0 2px" }} />
          <span style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 1 }}>TAILLE</span>
          {([{ l: "Petite", v: "small" }, { l: "Moyenne", v: "medium" }, { l: "Grande", v: "large" }] as const).map(opt => (
            <FilterPill key={opt.v} active={filterSize === opt.v} onClick={() => setFilterSize(filterSize === opt.v ? null : opt.v)}>{opt.l}</FilterPill>
          ))}
          <span style={{ width: 1, height: 20, backgroundColor: C.navyMid, margin: "0 2px" }} />
          {([{ l: "Public", v: "public" }, { l: "Privé", v: "private" }] as const).map(opt => (
            <FilterPill key={opt.v} active={filterType === opt.v} onClick={() => setFilterType(filterType === opt.v ? null : opt.v)}>{opt.l}</FilterPill>
          ))}
          <span style={{ width: 1, height: 20, backgroundColor: C.navyMid, margin: "0 2px" }} />
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

        {/* Cards - FREEMIUM GATE LIMITÉ À 5 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.slice(0, 5).map((match, idx) => {
            const isLocked = idx < 2; // Index 0 et 1 verrouillés

            if (isLocked) {
              return (
                <div key={`locked-${idx}`} style={{ backgroundColor: C.navyLight, borderRadius: 12, border: `1px solid rgba(255,203,5,0.3)`, position: "relative", overflow: "hidden", padding: isMobile ? "14px 12px 12px" : "20px 20px 16px" }}>
                  {/* Contenu flouté pour donner envie */}
                  <div style={{ filter: "blur(8px)", opacity: 0.3, userSelect: "none", pointerEvents: "none" }}>
                    <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "flex-start" }}>
                      <div style={{ ...BEBAS, fontSize: isMobile ? 32 : 48, color: idx === 0 ? C.maize : C.slateLight, lineHeight: 1, width: isMobile ? 40 : 58, flexShrink: 0, letterSpacing: -1 }}>#{idx + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <h2 style={{ fontSize: isMobile ? 14 : 17, fontWeight: 600, color: "#fff", margin: 0, flex: 1 }}>UNIVERSITÉ MASQUÉE</h2>
                          <div style={{ ...BEBAS, fontSize: 32, color: C.maize, lineHeight: 1 }}>98<span style={{ fontSize: 16 }}>/100</span></div>
                        </div>
                        <div style={{ fontSize: 12, color: C.slate, marginTop: 8 }}>NCAA D1 · ???</div>
                      </div>
                    </div>
                  </div>

                  {/* Overlay Cadenas + Bouton d'inscription */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(11, 22, 40, 0.65)", zIndex: 10 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                    <h4 style={{ ...BEBAS, fontSize: 22, color: C.maize, letterSpacing: 1, margin: "0 0 16px" }}>VOTRE TOP {idx + 1} MATCH</h4>
                    <Link 
                      href={`/client?session=${sessionToken}`}
                      style={{ backgroundColor: C.maize, color: C.navy, padding: "10px 20px", borderRadius: 8, ...BEBAS, fontSize: 16, textDecoration: "none", letterSpacing: 1, transition: "opacity 0.2s" }} 
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.8"} 
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      DÉBLOQUER MES RÉSULTATS →
                    </Link>
                  </div>
                </div>
              )
            }

            // Normal Card pour index 2, 3, 4
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
                style={{ backgroundColor: C.navyLight, borderRadius: 12, borderLeft: `4px solid ${C.maize}`, cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease", padding: isMobile ? "14px 12px 12px" : "20px 20px 16px", animation: `fadeInUp 0.4s ease ${idx * 0.05}s both` }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)" }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = ""; el.style.boxShadow = "" }}
              >
                <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "flex-start" }}>
                  {/* Rank */}
                  <div style={{ ...BEBAS, fontSize: isMobile ? 32 : 48, color: idx === 0 ? C.maize : idx < 3 ? C.slateLight : C.slate, lineHeight: 1, width: isMobile ? 40 : 58, flexShrink: 0, letterSpacing: -1 }}>
                    #{idx + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name row + score grid */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <UniversityLogo name={match.name} website={match.academic?.website ?? null} size={isMobile ? 26 : 34} />
                      <CountryBadge country={match.country} />
                      <h2 style={{ fontSize: isMobile ? 14 : 17, fontWeight: 600, color: "#fff", margin: 0, flex: 1, minWidth: 80 }}>{match.name}</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px", flexShrink: 0 }}>
                        {([
                          { icon: "🏊", label: "Sportif",    s: sp,    m: 50,  tip: TOOLTIP_SPORT },
                          { icon: "🎓", label: "Académique", s: sa,    m: 25,  tip: TOOLTIP_ACAD  },
                          { icon: "🌍", label: "Géo",        s: sg,    m: 15,  tip: TOOLTIP_GEO   },
                          { icon: "⭐", label: "Total",      s: total, m: 100, tip: TOOLTIP_TOTAL },
                        ] as const).map(({ icon, label, s, m, tip }) => (
                          <Tooltip key={icon} content={tip}>
                            <div style={{ ...MONO, fontSize: isMobile ? 10 : 12, display: "flex", gap: 3, alignItems: "center" }}>
                              <span>{icon}</span><span style={{ color: C.maize, fontWeight: 700 }}>{s}</span><span style={{ color: C.slate }}>/{m}</span>
                              <span style={{ fontSize: 9, color: C.slate, marginLeft: 1 }}>ⓘ</span>
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    {/* Division + grade + location */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
                      <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, backgroundColor: b.bg, color: b.color }}>{b.label}</span>
                      {grade && grade !== "N/A" && (() => { const gs = gradeBadgeStyle(grade); return <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, backgroundColor: gs.bg, color: gs.color }}>🎓 {grade}</span> })()}
                      {match.academic?.pct_pell_grant != null && match.academic.pct_pell_grant > 30 && (
                        <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "2px 6px", borderRadius: 4, backgroundColor: "rgba(46,204,113,0.1)", color: C.green }}>💰 Aides dispo</span>
                      )}
                      <span style={{ fontSize: 12, color: C.slate }}>{match.state}{match.city ? ` · ${match.city}` : ""}</span>
                    </div>

                    {/* Rang estimé enrichi */}
                    {rang !== null && rang !== undefined && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                        {/* Ligne 1 — rang par temps + percentile */}
                        {(() => {
                          const firstEv = Object.entries(match.events).find(([, e]) => e.rang === rang && e.data_quality !== 'insufficient')
                          const evName   = firstEv?.[0] ?? null
                          const teamSize = firstEv?.[1]?.team_size ?? null
                          const pct      = firstEv?.[1]?.percentile ?? null
                          return (
                            <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6, backgroundColor: rangBg ?? "transparent", color: rangColor ?? C.slate, border: `1px solid ${rangColor ?? C.slate}`, display: "inline-block" }}>
                              ⏱ Rang #{rang}{teamSize ? ` sur ${teamSize}` : ""}{evName ? ` · ${evName}` : ""}{pct !== null ? ` · top ${pct}%` : ""}
                            </span>
                          )
                        })()}
                        {/* Ligne 2 — classement WA global */}
                        {match.wa_summary && match.wa_summary.team_total_size > 0 && (
                          <span style={{ ...MONO, fontSize: isMobile ? 10 : 11, padding: "4px 10px", borderRadius: 6, backgroundColor: "rgba(255,203,5,0.08)", color: C.maize, border: "1px solid rgba(255,203,5,0.2)", display: "inline-block" }}>
                            🏆 #{match.wa_summary.rang_wa_global}/{match.wa_summary.team_total_size} au classement général WA · {match.wa_summary.athlete_total_wa} pts · top {match.wa_summary.percentile_global}%
                          </span>
                        )}
                        <p style={{ fontSize: 11, color: C.slate, marginTop: 2, marginBottom: 0, fontStyle: "italic" }}>
                          *Basé sur les temps actuels du roster. Les recrues 2025-26 peuvent modifier ce classement.
                        </p>
                      </div>
                    )}

                    {/* Stats académiques */}
                    {match.academic && (
                      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 8, padding: isMobile ? 10 : 12 }}>
                        {[
                          { icon: "🎓", label: "Admission",  value: match.academic.admission_rate === null ? null : match.academic.admission_rate > 80 ? "Non sélectif" : `${match.academic.admission_rate}%` },
                          { icon: "💰", label: "Scolarité",  value: match.academic.tuition_out_state === null ? null : `$${match.academic.tuition_out_state.toLocaleString("en-US")}/an` },
                          { icon: "👥", label: "Taille",     value: match.academic.enrollment_total === null ? null : match.academic.enrollment_total < 3000 ? `Petite (${match.academic.enrollment_total.toLocaleString("en-US")})` : match.academic.enrollment_total <= 10000 ? `Moyenne (${match.academic.enrollment_total.toLocaleString("en-US")})` : `Grande (${match.academic.enrollment_total.toLocaleString("en-US")})` },
                          { icon: "💼", label: "Salaire 10y",value: match.academic.median_earnings === null ? null : `$${match.academic.median_earnings.toLocaleString("en-US")}` },
                          { icon: "📈", label: "Rétention",  value: match.academic.retention_rate === null ? null : `${match.academic.retention_rate}%` },
                          { icon: "💳", label: "Dette",      value: match.academic.grad_debt_median === null ? null : `$${match.academic.grad_debt_median.toLocaleString("en-US")}` },
                        ].map(({ icon, label, value }) => (
                          <div key={label}>
                            <span style={{ fontSize: 11, color: C.slate }}>{icon} {label} </span>
                            {value !== null
                              ? <span style={{ ...MONO, fontSize: isMobile ? 10 : 12, color: "#fff", fontWeight: 700 }}>{value}</span>
                              : <span style={{ ...MONO, fontSize: isMobile ? 10 : 12, color: C.slate, fontStyle: "italic" }}>N/D</span>
                            }
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Event ratios */}
                    {Object.entries(match.events).length > 0 && (
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4, overflowX: "auto" }}>
                        {Object.entries(match.events).map(([event, ev]) => {
                          const pct = ((ev.ratio - 1) * 100).toFixed(1)
                          const faster = ev.ratio < 1
                          const color = faster ? C.green : ev.ratio <= 1.05 ? C.orange : C.slate
                          return (
                            <div key={event} style={{ display: "flex", alignItems: "center", gap: 10, ...MONO, fontSize: isMobile ? 11 : 12 }}>
                              <span style={{ color: C.slate, width: 60, flexShrink: 0 }}>{event}</span>
                              <span style={{ color: "#fff" }}>{formatScy(ev.athlete_time)}</span>
                              <span style={{ color: C.slate }}>vs</span>
                              <span style={{ color: C.slate }}>{formatScy(ev.team_best)}</span>
                              <span style={{ color, fontWeight: 700 }}>{faster ? "-" : "+"}{Math.abs(parseFloat(pct))}%</span>
                              {ev.rang && <span style={{ color: C.slate }}>#{ev.rang}</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Roster toggle */}
                    {match.team_times && Object.keys(match.team_times).length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <button
                          onClick={e => { e.stopPropagation(); setOpenRosters(prev => { const n = new Set(prev); n.has(match.team_id) ? n.delete(match.team_id) : n.add(match.team_id); return n }) }}
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

                    {/* Website */}
                    {match.academic?.website && (
                      <a
                        href={match.academic.website.startsWith("http") ? match.academic.website : `https://${match.academic.website}`}
                        target="_blank" rel="noopener noreferrer"
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

        {/* CTA GLOBAL POUR VOIR TOUS LES MATCHS */}
        {filtered.length > 5 && (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <h3 style={{ ...BEBAS, color: C.white, fontSize: 24, letterSpacing: 1, marginBottom: 16 }}>
              TON POTENTIEL NE S'ARRÊTE PAS LÀ
            </h3>
            <p style={{ color: C.slate, marginBottom: 24, maxWidth: 500, margin: "0 auto 24px" }}>
              L'algorithme a trouvé {filtered.length} universités qui correspondent à tes temps. Connecte-toi pour explorer l'intégralité de tes matchs et contacter les coachs.
            </p>
            <Link 
              href={`/client?session=${sessionToken}`} 
              style={{ display: "inline-block", backgroundColor: "rgba(255,203,5,0.1)", border: `1px solid ${C.maize}`, color: C.maize, padding: "16px 32px", borderRadius: 8, ...BEBAS, fontSize: 18, textDecoration: "none", letterSpacing: 1, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.maize; e.currentTarget.style.color = C.navy }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,203,5,0.1)"; e.currentTarget.style.color = C.maize }}
            >
              VOIR MES {filtered.length} MATCHS COMPLETS ET DÉTAILLÉS →
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}  