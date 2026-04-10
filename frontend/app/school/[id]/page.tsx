"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"

const API_BASE = "https://rise-match-production.up.railway.app"
const MAPS_KEY = "AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFDd6Y"

const ROSTER_ORDER = [
  "50FR","100FR","200FR","500FR","1000FR","1650FR",
  "50BA","100BA","200BA",
  "50BR","100BR","200BR",
  "50FL","100FL","200FL",
  "200IM","400IM",
]

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

export default function SchoolPage() {
  const router = useRouter()
  const params = useParams()
  const teamId = params.id as string

  const [data, setData] = useState<SchoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"M" | "F">("M")
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE}/api/school/${teamId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [teamId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A0E1A" }}>
        <div className="w-10 h-10 border-2 border-transparent border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data || (data as { error?: string }).error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0A0E1A" }}>
        <div className="text-center">
          <p className="text-gray-400 mb-4">École non trouvée</p>
          <button onClick={() => router.back()} className="text-blue-400 text-sm hover:text-blue-300">
            ← Retour
          </button>
        </div>
      </div>
    )
  }

  const t = data.team
  const counts = data.roster_counts
  const times = tab === "M" ? data.times_men : data.times_women

  const name = t.name as string
  const division = t.division as string
  const state = t.state as string | null
  const city = t.city as string | null
  const website = t.website as string | null
  const lat = t.latitude as number | null
  const lng = t.longitude as number | null

  const logoUrl = !logoError ? getLogoUrl(website) : null
  const initials = name.split(/\s+/).filter((w: string) => /^[A-Z]/.test(w)).slice(0, 2).map((w: string) => w[0]).join("")
  const isCA = division === "division_10"
  const badge = divisionBadge(division)

  const websiteHref = website
    ? (website.startsWith("http") ? website : `https://${website}`)
    : null

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto" style={{ backgroundColor: "#0A0E1A" }}>
      {/* Nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-sm transition-colors"
      >
        ← Retour aux résultats
      </button>

      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            width={64}
            height={64}
            className="w-16 h-16 rounded-xl object-contain shrink-0"
            style={{ backgroundColor: "#f8fafc" }}
            onError={() => setLogoError(true)}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold"
            style={{ backgroundColor: "#1a2236", color: "#60a5fa" }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-black text-white leading-tight mb-2">{name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: isCA ? "#3b0a0a" : "#0a1a3b", color: isCA ? "#fca5a5" : "#93c5fd" }}
            >
              {isCA ? "CA" : "US"}
            </span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
            {(state || city) && (
              <span className="text-gray-500 text-xs">{state}{city ? ` · ${city}` : ""}</span>
            )}
            {websiteHref && (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-colors"
                style={{ color: "#4b6fa8" }}
                onMouseOver={e => (e.currentTarget.style.color = "#60a5fa")}
                onMouseOut={e => (e.currentTarget.style.color = "#4b6fa8")}
              >
                🌐 Site officiel
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Section 1 — Données académiques */}
      {(t.admission_rate !== null || t.tuition_out_state !== null) && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Données académiques</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🎓", label: "Admission",   value: t.admission_rate !== null ? (Number(t.admission_rate) > 80 ? "Non sélectif" : `${t.admission_rate}%`) : "—" },
              { icon: "💰", label: "Scolarité",   value: fmt(t.tuition_out_state as number | null, "$", "/an") },
              { icon: "👥", label: "Effectif",    value: t.enrollment_total !== null ? (Number(t.enrollment_total) < 3000 ? `Petite (${(t.enrollment_total as number).toLocaleString("en-US")})` : Number(t.enrollment_total) <= 10000 ? `Moyenne (${(t.enrollment_total as number).toLocaleString("en-US")})` : `Grande (${(t.enrollment_total as number).toLocaleString("en-US")})`) : "—" },
              { icon: "💼", label: "Salaire 10y", value: fmt(t.median_earnings as number | null, "$") },
              { icon: "📈", label: "Rétention",   value: t.retention_rate !== null ? `${t.retention_rate}%` : "—" },
              { icon: "💳", label: "Dette sortie",value: fmt(t.grad_debt_median as number | null, "$") },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{ backgroundColor: "#111827", border: "1px solid #1e2d45" }}
              >
                <div className="text-lg mb-1">{icon}</div>
                <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                <div className="text-sm font-bold text-white">{value as string}</div>
              </div>
            ))}
          </div>
          {t.school_type && (
            <p className="mt-2 text-xs text-gray-500">
              Type : <span className="text-gray-300">{t.school_type === "public" ? "Université publique" : t.school_type === "private" ? "Université privée" : t.school_type as string}</span>
              {t.pct_pell_grant !== null && (
                <> · Aide financière (Pell) : <span className="text-gray-300">{t.pct_pell_grant as number}% des étudiants</span></>
              )}
            </p>
          )}
        </div>
      )}

      {/* Section 2 — Équipe de natation */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Équipe de natation</h2>

        {/* Roster counts */}
        <div className="flex gap-4 mb-4">
          {[
            { label: "Hommes", value: counts.men },
            { label: "Femmes", value: counts.women },
            { label: "Partants", value: counts.departing },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-black text-white">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          {(["M", "F"] as const).map(g => (
            <button
              key={g}
              onClick={() => setTab(g)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: tab === g ? "#2E75B6" : "#111827",
                color: tab === g ? "#fff" : "#6b7a99",
                border: `1px solid ${tab === g ? "#2E75B6" : "#1e2d45"}`,
              }}
            >
              {g === "M" ? "Hommes" : "Femmes"}
            </button>
          ))}
        </div>

        {/* Times table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e2d45" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: "#0d1525" }}>
                <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">Épreuve</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">Meilleur temps</th>
                <th className="text-left px-4 py-2.5 text-gray-500 font-semibold">Nageur(se)</th>
              </tr>
            </thead>
            <tbody>
              {ROSTER_ORDER.filter(ev => times[ev]).map((ev, i) => (
                <tr
                  key={ev}
                  style={{ backgroundColor: i % 2 === 0 ? "#111827" : "#0f1a2e" }}
                >
                  <td className="px-4 py-2 font-mono text-gray-300 font-semibold">{ev}</td>
                  <td className="px-4 py-2 font-mono text-white">{times[ev].best_display}</td>
                  <td className="px-4 py-2 text-gray-400">{times[ev].best_swimmer}</td>
                </tr>
              ))}
              {ROSTER_ORDER.filter(ev => times[ev]).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    Aucun temps disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3 — Carte */}
      {lat !== null && lng !== null && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Localisation</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1e2d45" }}>
            <iframe
              width="100%"
              height="300"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${lat},${lng}`}
            />
          </div>
          {(city || state) && (
            <p className="mt-2 text-xs text-gray-500">{city}{city && state ? ", " : ""}{state}</p>
          )}
        </div>
      )}
    </div>
  )
}
