"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const API = "https://rise-match-production.up.railway.app"

const C = {
  navy:       "#0B1628",
  navyLight:  "#152236",
  maize:      "#FFCB05",
  maizeDark:  "#E6B800",
  white:      "#FFFFFF",
  slate:      "#8A9BB0",
  slateLight: "#B8C8D8",
  green:      "#2ECC71",
  orange:     "#F39C12",
  red:        "#E74C3C",
}

const BEBAS: React.CSSProperties = { fontFamily: "Bebas Neue, sans-serif" }
const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" }
const MONO:  React.CSSProperties = { fontFamily: "Space Mono, monospace" }

const DIVISION_LABELS: Record<string, string> = {
  division_1:  "NCAA D1",
  division_2:  "NCAA D2",
  division_3:  "NCAA D3",
  division_4:  "NAIA",
  division_5:  "NJCAA",
  division_10: "USports",
}

const STATUS_COLORS: Record<string, string> = {
  "nouveau":    C.slate,
  "prospect":   "#6fa3d8",
  "accompagné": C.green,
  "signé":      "#b39ddb",
  "archivé":    "#555",
}

export default function StatsPage() {
  const router  = useRouter()
  const [stats,   setStats]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("rise_admin_token")
    if (!token) { router.push("/admin"); return }

    fetch(`${API}/api/admin/stats`, { headers: { "x-admin-token": token } })
      .then(r => { if (!r.ok) { router.push("/admin"); return null } return r.json() })
      .then(data => { if (data) { setStats(data); setLoading(false) } })
      .catch(() => router.push("/admin"))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ ...BEBAS, fontSize: 18, color: C.slate, letterSpacing: 2 }}>CHARGEMENT...</span>
    </div>
  )

  const ov = stats.overview

  return (
    <div style={{ minHeight: "100vh", background: C.navy, color: C.white, ...INTER }}>

      {/* Header */}
      <header style={{
        background: C.navyLight, borderBottom: `2px solid ${C.maize}`,
        height: 60, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/admin" style={{ textDecoration: "none" }}>
            <span style={{ ...BEBAS, fontSize: 22, color: C.maize }}>RISE</span>
            <span style={{ ...BEBAS, fontSize: 22, color: C.white }}>.MATCH</span>
          </Link>
          <span style={{ color: C.slate }}>|</span>
          <span style={{ ...BEBAS, color: C.white, fontSize: 16, letterSpacing: 1 }}>ANALYTICS</span>
        </div>
        <Link href="/admin" style={{ color: C.maize, fontSize: 12, textDecoration: "none", ...BEBAS, letterSpacing: 1 }}>
          ← RETOUR AU CRM
        </Link>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>

        {/* KPI tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "RECHERCHES TOTALES", value: ov.total_sessions,   color: C.maize },
            { label: "COMPTES CRÉÉS",      value: ov.total_registered, color: C.maize },
            { label: "COMPTES ACTIFS",     value: ov.total_active,     color: C.green },
            { label: "DOSSIERS SIGNÉS",    value: ov.total_signed,     color: "#b39ddb" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)", borderRadius: 12, padding: "20px 24px" }}>
              <p style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 2, margin: "0 0 8px" }}>{kpi.label}</p>
              <p style={{ ...BEBAS, fontSize: 40, color: kpi.color, margin: 0, lineHeight: 1 }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Conversion rates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          {[
            {
              label: "TAUX DE CONVERSION",
              sub:   "Visiteurs → Inscrits",
              value: ov.conversion_rate,
              note:  `${ov.total_registered} inscrits sur ${ov.total_sessions} recherches`,
              color: ov.conversion_rate > 5 ? C.green : C.orange,
            },
            {
              label: "TAUX D'ACTIVATION",
              sub:   "Inscrits → Actifs",
              value: ov.activation_rate,
              note:  `${ov.total_active} actifs sur ${ov.total_registered} inscrits`,
              color: ov.activation_rate > 50 ? C.green : C.orange,
            },
          ].map(m => (
            <div key={m.label} style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)", borderRadius: 12, padding: "20px 24px" }}>
              <p style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 2, margin: "0 0 2px" }}>{m.label}</p>
              <p style={{ color: C.slate, fontSize: 12, margin: "0 0 12px" }}>{m.sub}</p>
              <p style={{ ...BEBAS, fontSize: 36, color: m.color, margin: "0 0 10px", lineHeight: 1 }}>{m.value}%</p>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(m.value, 100)}%`, background: m.color, transition: "width 0.5s" }} />
              </div>
              <p style={{ color: C.slate, fontSize: 11, margin: 0 }}>{m.note}</p>
            </div>
          ))}
        </div>

        {/* Three columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>

          {/* Divisions */}
          <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)", borderRadius: 12, padding: "20px 24px" }}>
            <p style={{ ...BEBAS, fontSize: 11, color: C.maize, letterSpacing: 2, margin: "0 0 16px" }}>DIVISIONS DEMANDÉES</p>
            {stats.divisions.slice(0, 8).map((d: any) => (
              <div key={d.division} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ ...BEBAS, fontSize: 12, color: C.slateLight, letterSpacing: 1 }}>
                    {DIVISION_LABELS[d.division] || d.division}
                  </span>
                  <span style={{ ...MONO, fontSize: 11, color: C.maize }}>{d.count}</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: C.maize, width: `${(d.count / stats.divisions[0].count) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Pipeline statuses */}
          <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)", borderRadius: 12, padding: "20px 24px" }}>
            <p style={{ ...BEBAS, fontSize: 11, color: C.maize, letterSpacing: 2, margin: "0 0 16px" }}>PIPELINE DOSSIERS</p>
            {stats.statuses.map((s: any) => (
              <div key={s.status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: 4, background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: STATUS_COLORS[s.status] || C.slate, textTransform: "capitalize", ...INTER }}>
                  {s.status}
                </span>
                <span style={{ ...MONO, fontSize: 12, color: C.maize }}>{s.count}</span>
              </div>
            ))}
          </div>

          {/* Top schools */}
          <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)", borderRadius: 12, padding: "20px 24px" }}>
            <p style={{ ...BEBAS, fontSize: 11, color: C.maize, letterSpacing: 2, margin: "0 0 16px" }}>TOP MATCHS #1</p>
            {stats.top_schools.slice(0, 8).map((s: any, i: number) => (
              <div key={s.school} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...BEBAS, fontSize: 14, color: C.maize, width: 22, flexShrink: 0 }}>#{i + 1}</span>
                  <span style={{ fontSize: 11, color: C.slateLight, ...INTER, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.school}</span>
                </div>
                <span style={{ ...MONO, fontSize: 11, color: C.slate, flexShrink: 0 }}>{s.count}x</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly bar chart */}
        <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)", borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <p style={{ ...BEBAS, fontSize: 11, color: C.maize, letterSpacing: 2, margin: "0 0 24px" }}>
            ACTIVITÉ HEBDOMADAIRE — 8 DERNIÈRES SEMAINES
          </p>

          {/* Searches chart */}
          {stats.weekly_searches.length > 0 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120, marginBottom: 24 }}>
              {stats.weekly_searches.map((w: any, i: number) => {
                const max = Math.max(...stats.weekly_searches.map((x: any) => x.searches), 1)
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
                    <span style={{ ...MONO, fontSize: 9, color: C.maize }}>{w.searches}</span>
                    <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", height: `${(w.searches / max) * 100}%`, minHeight: 4, background: `linear-gradient(180deg, ${C.maize}, ${C.maizeDark})`, borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
                    </div>
                    <span style={{ ...MONO, fontSize: 9, color: C.slate }}>{w.week}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: C.slate, fontSize: 13, marginBottom: 24 }}>Aucune donnée</p>
          )}

          {/* Signups chart */}
          <p style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 2, margin: "0 0 16px" }}>NOUVELLES INSCRIPTIONS</p>
          {stats.weekly_signups.length > 0 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 60 }}>
              {stats.weekly_signups.map((w: any, i: number) => {
                const max = Math.max(...stats.weekly_signups.map((x: any) => x.signups), 1)
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                    <span style={{ ...MONO, fontSize: 9, color: C.green }}>{w.signups}</span>
                    <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", height: `${(w.signups / max) * 100}%`, minHeight: 2, background: C.green, borderRadius: "3px 3px 0 0" }} />
                    </div>
                    <span style={{ ...MONO, fontSize: 9, color: C.slate }}>{w.week}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: C.slate, fontSize: 13 }}>Aucune donnée</p>
          )}
        </div>

        {/* Gender split */}
        {stats.genders.length > 0 && (
          <div style={{ display: "flex", gap: 16 }}>
            {stats.genders.map((g: any) => (
              <div key={g.gender} style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)", borderRadius: 12, padding: "16px 24px", flex: 1, textAlign: "center" }}>
                <p style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 2, margin: "0 0 8px" }}>
                  {g.gender === "M" ? "♂ HOMMES" : "♀ FEMMES"}
                </p>
                <p style={{ ...BEBAS, fontSize: 32, color: C.maize, margin: 0 }}>{g.count}</p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
