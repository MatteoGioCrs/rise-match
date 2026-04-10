"use client"

import type { CSSProperties } from "react"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"

const API_BASE = "https://rise-match-production.up.railway.app"

const ROSTER_ORDER = [
  "50FR","100FR","200FR","500FR","1000FR","1650FR",
  "50BA","100BA","200BA",
  "50BR","100BR","200BR",
  "50FL","100FL","200FL",
  "200IM","400IM",
]

const PROGRAMS = [
  { key: "has_engineering",     label: "Ingénierie & Tech" },
  { key: "has_business",        label: "Business & Finance" },
  { key: "has_sciences",        label: "Sciences & Médecine" },
  { key: "has_humanities",      label: "Sciences humaines" },
  { key: "has_arts",            label: "Arts & Design" },
  { key: "has_social_sciences", label: "Sciences sociales" },
  { key: "has_sports_kine",     label: "Sport & Kiné" },
  { key: "has_education",       label: "Éducation" },
  { key: "has_law",             label: "Droit" },
  { key: "has_environment",     label: "Environnement" },
]

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

function getLogoUrl(website: string | null): string | null {
  if (!website) return null
  const domain = website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

function fmt(n: number | null, prefix = "", suffix = ""): string {
  if (n === null || n === undefined) return "—"
  return `${prefix}${n.toLocaleString("en-US")}${suffix}`
}

// ─── Components ───────────────────────────────────────────────────────────────

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

function SectionStamp({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <span style={{
        ...BEBAS,
        fontSize: 24,
        color: C.maize,
        letterSpacing: 3,
        border: `2px solid ${C.maize}`,
        padding: "4px 12px",
        display: "inline-block",
      }}>
        {children}
      </span>
    </div>
  )
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface TeamTime {
  best_seconds: number
  best_display: string
  best_swimmer: string
}

interface SchoolData {
  team: Record<string, unknown>
  roster_counts: { men: number; women: number; departing: number }
  times_men: Record<string, TeamTime>
  times_women: Record<string, TeamTime>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchoolPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string

  const [data,       setData]       = useState<SchoolData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState<"M" | "F">("M")
  const [logoError,  setLogoError]  = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/school/${teamId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [teamId])

  if (loading) {
    return (
      <div style={{ backgroundColor: C.navy, minHeight: "100vh" }}>
        <Navbar />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 74px)" }}>
          <div className="animate-spin" style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.navyMid}`, borderTopColor: C.maize }} />
        </div>
      </div>
    )
  }

  if (!data || (data as { error?: string }).error) {
    return (
      <div style={{ backgroundColor: C.navy, minHeight: "100vh" }}>
        <Navbar />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 74px)", gap: 16 }}>
          <p style={{ color: C.slate }}>École non trouvée</p>
          <button
            onClick={() => router.back()}
            style={{ ...BEBAS, fontSize: 14, color: C.maize, background: "none", border: "none", cursor: "pointer", letterSpacing: 1 }}
          >
            ← RETOUR
          </button>
        </div>
      </div>
    )
  }

  const t      = data.team
  const counts = data.roster_counts
  const times  = tab === "M" ? data.times_men : data.times_women

  const name       = t.name     as string
  const division   = t.division as string
  const state      = t.state    as string | null
  const city       = t.city     as string | null
  const website    = t.website  as string | null
  const lat        = t.latitude  as number | null
  const lng        = t.longitude as number | null

  const logoUrl     = !logoError ? getLogoUrl(website) : null
  const initials    = name.split(/\s+/).filter((w: string) => /^[A-Z]/.test(w)).slice(0, 2).map((w: string) => w[0]).join("")
  const isCA        = division === "division_10"
  const badge       = divisionBadge(division)
  const websiteHref = website ? (website.startsWith("http") ? website : `https://${website}`) : null

  const admRate    = t.admission_rate    as number | null
  const tuition    = t.tuition_out_state as number | null
  const enrollment = t.enrollment_total  as number | null
  const earnings   = t.median_earnings   as number | null
  const retention  = t.retention_rate    as number | null
  const debt       = t.grad_debt_median  as number | null
  const pell       = t.pct_pell_grant    as number | null
  const schoolType = t.school_type       as string | null
  const topPrograms = t.top_programs     as string | null

  const hasAcademic = admRate !== null || tuition !== null || enrollment !== null

  return (
    <div style={{ backgroundColor: C.navy, minHeight: "100vh" }}>
      <Navbar />

      {/* Back */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px 0" }}>
        <button
          onClick={() => router.back()}
          style={{ ...BEBAS, fontSize: 14, letterSpacing: 1, color: C.maize, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          ← RETOUR AUX RÉSULTATS
        </button>
      </div>

      {/* Hero */}
      <div style={{
        background: `repeating-linear-gradient(45deg, rgba(255,203,5,0.03) 0px, rgba(255,203,5,0.03) 1px, transparent 1px, transparent 8px), ${C.navy}`,
        padding: "40px 24px 44px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
          {/* Logo 80px */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={name}
              width={80}
              height={80}
              style={{ width: 80, height: 80, borderRadius: 10, objectFit: "contain", backgroundColor: "#f8fafc", flexShrink: 0 }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.navyMid, ...BEBAS, fontSize: 28, color: C.maize }}>
              {initials}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ ...BEBAS, fontSize: "clamp(28px, 5vw, 56px)", color: "#fff", lineHeight: 0.95, margin: "0 0 14px", letterSpacing: 1 }}>
              {name}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "3px 8px", borderRadius: 4, backgroundColor: isCA ? "#4a0a0a" : C.navyMid, color: isCA ? "#f87171" : C.maize }}>
                {isCA ? "CA" : "US"}
              </span>
              <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "3px 8px", borderRadius: 4, backgroundColor: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
              {schoolType && (
                <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, padding: "3px 8px", borderRadius: 4, backgroundColor: C.navyLight, color: C.slateLight }}>
                  {schoolType === "public" ? "PUBLIC" : schoolType === "private" ? "PRIVÉ" : schoolType.toUpperCase()}
                </span>
              )}
              {(state || city) && (
                <span style={{ fontSize: 13, color: C.slate }}>
                  {state}{city ? ` · ${city}` : ""}
                </span>
              )}
              {websiteHref && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: C.slate, textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.maize)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.slate)}
                >
                  🌐 Site officiel
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* ACADEMIC REPORT */}
        {hasAcademic && (
          <div style={{ marginBottom: 56 }}>
            <SectionStamp>ACADEMIC REPORT</SectionStamp>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              {[
                { label: "Admission",    value: admRate === null ? "—" : admRate > 80 ? "Open" : `${admRate}%` },
                { label: "Scolarité",    value: tuition === null ? "—" : `$${tuition.toLocaleString("en-US")}` },
                { label: "Effectif",     value: enrollment === null ? "—" : enrollment.toLocaleString("en-US") },
                { label: "Salaire 10y",  value: fmt(earnings, "$") },
                { label: "Rétention",    value: retention === null ? "—" : `${retention}%` },
                { label: "Dette sortie", value: fmt(debt, "$") },
              ].map(({ label, value }) => (
                <div key={label} style={{ backgroundColor: C.navyLight, borderRadius: 8, padding: "16px 20px", borderTop: `2px solid ${C.maize}` }}>
                  <div style={{ ...BEBAS, fontSize: 34, color: "#fff", lineHeight: 1, marginBottom: 4, letterSpacing: 0.5 }}>{value}</div>
                  <div style={{ fontSize: 12, color: C.slate, marginBottom: 10 }}>{label}</div>
                  <div style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${C.maize}, ${C.maizeDark})`, width: "60%" }} />
                  </div>
                </div>
              ))}
            </div>
            {(schoolType || pell !== null) && (
              <p style={{ marginTop: 12, fontSize: 12, color: C.slate, lineHeight: 1.6 }}>
                {schoolType && (
                  <>Type : <span style={{ color: C.slateLight }}>{schoolType === "public" ? "Université publique" : schoolType === "private" ? "Université privée" : schoolType}</span></>
                )}
                {pell !== null && (
                  <> · Aide Pell : <span style={{ color: C.slateLight }}>{pell}% des étudiants</span></>
                )}
              </p>
            )}
          </div>
        )}

        {/* ROSTER ANALYSIS */}
        <div style={{ marginBottom: 56 }}>
          <SectionStamp>ROSTER ANALYSIS</SectionStamp>

          {/* Counts */}
          <div style={{ display: "flex", gap: 40, marginBottom: 24 }}>
            {[
              { label: "Hommes",   value: counts.men },
              { label: "Femmes",   value: counts.women },
              { label: "Partants", value: counts.departing },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ ...BEBAS, fontSize: 40, color: "#fff", lineHeight: 1, letterSpacing: 0.5 }}>{value}</div>
                <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 0, width: "fit-content" }}>
            {(["M", "F"] as const).map(g => (
              <button
                key={g}
                onClick={() => setTab(g)}
                style={{
                  ...BEBAS,
                  fontSize: 14,
                  letterSpacing: 1,
                  padding: "9px 28px",
                  borderRadius: g === "M" ? "8px 0 0 0" : "0 8px 0 0",
                  backgroundColor: tab === g ? C.maize : C.navyLight,
                  color: tab === g ? C.navy : C.slate,
                  border: `1px solid ${tab === g ? C.maize : C.navyMid}`,
                  borderBottom: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {g === "M" ? "HOMMES" : "FEMMES"}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ borderRadius: "0 8px 8px 8px", overflow: "hidden", border: `1px solid ${C.navyMid}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: C.navyMid }}>
                  {["ÉPREUVE", "MEILLEUR TEMPS", "NAGEUR(SE)"].map(h => (
                    <th key={h} style={{ ...BEBAS, fontSize: 11, letterSpacing: 2, color: C.maize, padding: "10px 16px", textAlign: "left", fontWeight: 400 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROSTER_ORDER.filter(ev => times[ev]).map((ev, i) => (
                  <tr
                    key={ev}
                    style={{ backgroundColor: i % 2 === 0 ? C.navyLight : C.navy, transition: "background-color 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,203,5,0.05)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? C.navyLight : C.navy)}
                  >
                    <td style={{ ...MONO, fontSize: 13, color: C.slate, padding: "10px 16px" }}>{ev}</td>
                    <td style={{ ...MONO, fontSize: 14, color: "#fff", fontWeight: 700, padding: "10px 16px" }}>{times[ev].best_display}</td>
                    <td style={{ fontSize: 13, color: C.slateLight, padding: "10px 16px" }}>{times[ev].best_swimmer}</td>
                  </tr>
                ))}
                {ROSTER_ORDER.filter(ev => times[ev]).length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: 24, textAlign: "center", color: C.slate, ...MONO, fontSize: 13 }}>
                      Aucun temps disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PROGRAMS AVAILABLE */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ ...BEBAS, fontSize: 18, color: C.maize, letterSpacing: 2 }}>PROGRAMS AVAILABLE</span>
          </div>
          {topPrograms && (
            <p style={{ fontSize: 12, color: C.slate, marginBottom: 14, lineHeight: 1.6 }}>
              Principales filières : <span style={{ color: C.slateLight }}>{topPrograms}</span>
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PROGRAMS.map(({ key, label }) => {
              const available = t[key] === true
              return (
                <span
                  key={key}
                  style={{
                    ...BEBAS,
                    fontSize: 12,
                    letterSpacing: 1,
                    padding: "5px 12px",
                    borderRadius: 4,
                    backgroundColor: available ? "rgba(255,203,5,0.15)" : C.navyLight,
                    color: available ? C.maize : C.slate,
                    border: `1px solid ${available ? C.maize : C.navyMid}`,
                  }}
                >
                  {label}
                </span>
              )
            })}
          </div>
        </div>

        {/* CAMPUS LOCATION */}
        {lat !== null && lng !== null && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 16 }}>
              <span style={{ ...BEBAS, fontSize: 18, color: C.maize, letterSpacing: 2 }}>CAMPUS LOCATION</span>
            </div>
            <div style={{ borderRadius: 8, overflow: "hidden", border: "2px solid rgba(255,203,5,0.3)" }}>
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}&layer=mapnik&marker=${lat},${lng}`}
                width="100%"
                height="300"
                style={{ border: 0, display: "block" }}
                loading="lazy"
              />
            </div>
            {(city || state) && (
              <p style={{ marginTop: 8, fontSize: 12, color: C.slate }}>
                {city}{city && state ? ", " : ""}{state}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
