"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

const API  = "https://rise-match-production.up.railway.app"
const BEBAS = { fontFamily: "'Bebas Neue', sans-serif" } as const
const C = { navy: "#0B1628", navyLight: "#152236", maize: "#FFCB05", slate: "#8A9BB0" }

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  nouveau:    { label: "Nouveau",    bg: C.maize,   color: C.navy },
  prospect:   { label: "Prospect",   bg: "#3B82F6", color: "#fff" },
  accompagné: { label: "Accompagné", bg: "#10B981", color: "#fff" },
  signé:      { label: "Signé",      bg: "#8B5CF6", color: "#fff" },
  archivé:    { label: "Archivé",    bg: "#4B5563", color: "#fff" },
}

type TimeEntry = { event: string; basin: string; time_seconds: number }

type Match = {
  name: string
  division: string
  state: string
  country: string
  score_total: number
  score_sportif: number
  score_academique: number
  score_geo: number
  rang_estime: number | null
}

type Session = {
  id: number
  session_token: string
  gender: string | null
  divisions: string[] | null
  times_input: TimeEntry[] | null
  results_count: number | null
  top_match: string | null
  created_at: string
  admin_label: string | null
  admin_status: string
  admin_notes: string | null
  published_matches: Match[] | null
}

export default function AthleteFilePage() {
  const { id }  = useParams()
  const router  = useRouter()

  const [token,          setToken]          = useState<string | null>(null)
  const [session,        setSession]        = useState<Session | null>(null)
  const [matches,        setMatches]        = useState<Match[]>([])
  const [notes,          setNotes]          = useState("")
  const [loading,        setLoading]        = useState(true)
  const [rematchLoading, setRematchLoading] = useState(false)
  const [notesSaved,      setNotesSaved]      = useState(false)
  const [draftMode,       setDraftMode]       = useState(false)
  const [selectedMatches, setSelectedMatches] = useState<number[]>([])
  const [publishedCount,  setPublishedCount]  = useState(0)
  const [publishLoading,  setPublishLoading]  = useState(false)

  useEffect(() => {
    const t = localStorage.getItem("rise_admin_token")
    if (!t) { router.push("/admin"); return }
    setToken(t)
    loadSession(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSession(t: string) {
    try {
      const res = await fetch(`${API}/api/admin/sessions/${id}/detail`, {
        headers: { "x-admin-token": t },
      })
      if (!res.ok) { router.push("/admin"); return }
      const data = await res.json()
      const s: Session = data.session
      setSession(s)
      setNotes(s.admin_notes ?? "")
      if (s.published_matches && s.published_matches.length > 0) {
        setMatches(s.published_matches)
      }
    } catch {
      router.push("/admin")
    } finally {
      setLoading(false)
    }
  }

  async function rematch() {
    if (!token) return
    setRematchLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/sessions/${id}/rematch`, {
        method: "POST",
        headers: { "x-admin-token": token },
      })
      const data = await res.json()
      setMatches(data.matches ?? [])
    } catch { /* ignore */ }
    finally { setRematchLoading(false) }
  }

  async function saveNotes() {
    if (!token) return
    await fetch(`${API}/api/admin/sessions/${id}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ notes }),
    })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  async function publishDraft() {
    if (!token) return
    setPublishLoading(true)
    const selectedMatchesData = selectedMatches.map(i => matches[i])
    try {
      await fetch(`${API}/api/admin/sessions/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ matches: selectedMatchesData }),
      })
      setPublishedCount(selectedMatches.length)
      setDraftMode(false)
      setSelectedMatches([])
      setSession(s => s ? { ...s, admin_status: "accompagné" } : s)
    } catch { /* ignore */ }
    finally { setPublishLoading(false) }
  }

  async function updateStatus(status: string) {
    if (!token) return
    await fetch(`${API}/api/admin/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ admin_status: status }),
    })
    setSession(s => s ? { ...s, admin_status: status } : s)
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Chargement...
      </div>
    )
  }

  if (!session) return null

  const rawTimes = session?.times_input || [];
  const times = typeof rawTimes === 'string' 
    ? JSON.parse(rawTimes) 
    : (Array.isArray(rawTimes) ? rawTimes : []);
  const statusCfg = STATUS_CFG[session.admin_status] ?? STATUS_CFG.nouveau

  return (
    <div style={{ minHeight: "100vh", background: C.navy, fontFamily: "Inter, sans-serif", padding: "32px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Back button */}
      <button
        onClick={() => router.push("/admin")}
        style={{ background: "transparent", border: "none", color: C.maize, ...BEBAS, fontSize: 14, letterSpacing: 2, cursor: "pointer", padding: 0, marginBottom: 20 }}
      >
        ← RETOUR À LA LISTE
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ ...BEBAS, fontSize: 12, color: C.maize, letterSpacing: 3, margin: "0 0 4px" }}>RISE.MATCH · ADMIN</p>
          <h1 style={{ ...BEBAS, fontSize: 40, color: "#fff", margin: "0 0 6px" }}>
            {session.admin_label ?? `SESSION #${session.id}`}
          </h1>
          <p style={{ color: C.slate, fontSize: 13, margin: 0 }}>
            {new Date(session.created_at).toLocaleDateString("fr-FR", {
              day: "numeric", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
            {session.gender && ` · ${session.gender === "M" ? "Homme" : "Femme"}`}
            {session.results_count != null && ` · ${session.results_count} matchs générés`}
          </p>
        </div>

        {/* Status pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => updateStatus(key)}
              style={{
                padding: "6px 14px", borderRadius: 20, border: "1px solid",
                cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Inter",
                background: session.admin_status === key ? cfg.bg : "transparent",
                color: session.admin_status === key ? cfg.color : C.slate,
                borderColor: session.admin_status === key ? cfg.bg : "rgba(255,255,255,0.15)",
              }}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2-column grid: times + notes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

        {/* Section 1 — Temps saisis */}
        <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 24 }}>
          <h2 style={{ ...BEBAS, fontSize: 20, color: C.maize, letterSpacing: 2, margin: "0 0 16px" }}>TEMPS SAISIS</h2>

          {times.length === 0 ? (
            <p style={{ color: C.slate, fontSize: 13 }}>Aucun temps enregistré.</p>
          ) : (
            times.map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14 }}>
                <span style={{ color: C.slate, fontFamily: "monospace" }}>{t.event} · {t.basin}</span>
                <span style={{ color: "#fff", fontFamily: "monospace", fontWeight: 600 }}>
                  {typeof t.time_seconds === "number" ? t.time_seconds.toFixed(2) : t.time_seconds}s
                </span>
              </div>
            ))
          )}

          {session.top_match && (
            <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(255,203,5,0.06)", borderRadius: 8, fontSize: 13, color: C.slate }}>
              <span style={{ color: C.maize, fontWeight: 600 }}>Top match · </span>
              {session.top_match}
            </div>
          )}

          {session.divisions && session.divisions.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {session.divisions.map(d => (
                <span key={d} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: C.slate }}>
                  {d === "division_10" ? "USports" : d.replace("division_", "D")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Section 2 — Notes internes */}
        <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ ...BEBAS, fontSize: 20, color: C.maize, letterSpacing: 2, margin: 0 }}>NOTES INTERNES</h2>
            {notesSaved && <span style={{ fontSize: 11, color: "#10B981" }}>✓ Sauvegardé</span>}
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Notes de consultation, appels, préférences de l'athlète..."
            style={{
              flex: 1, minHeight: 160,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: 12,
              color: "#fff", fontSize: 14, lineHeight: 1.6,
              resize: "vertical", fontFamily: "Inter, sans-serif",
              boxSizing: "border-box", outline: "none",
            }}
          />
          <p style={{ fontSize: 11, color: C.slate, marginTop: 8, fontStyle: "italic" }}>
            Auto-sauvegarde au blur · Visible uniquement par l'équipe RISE
          </p>
        </div>
      </div>

      {/* Section 3 — Matchs */}
      <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 24 }}>

        {/* Section header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ ...BEBAS, fontSize: 20, color: C.maize, letterSpacing: 2, margin: 0 }}>
            MATCHS {matches.length > 0 && `(${matches.length})`}
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setDraftMode(!draftMode); setSelectedMatches([]) }}
              style={{
                background: draftMode ? "rgba(155,89,182,0.2)" : "transparent",
                color: draftMode ? "#b39ddb" : C.slate,
                border: `1px solid ${draftMode ? "#9b59b6" : "rgba(255,255,255,0.15)"}`,
                borderRadius: 6, padding: "8px 16px",
                ...BEBAS, fontSize: 14, letterSpacing: 1, cursor: "pointer",
              }}
            >
              {draftMode ? "✓ MODE DRAFT ACTIF" : "ACTIVER LE DRAFT MODE"}
            </button>
            <button
              onClick={rematch}
              disabled={rematchLoading}
              style={{ background: C.maize, color: C.navy, border: "none", borderRadius: 6, padding: "8px 18px", ...BEBAS, fontSize: 16, letterSpacing: 1, cursor: rematchLoading ? "wait" : "pointer", opacity: rematchLoading ? 0.7 : 1 }}
            >
              {rematchLoading ? "CALCUL..." : "↻ RELANCER"}
            </button>
          </div>
        </div>

        {/* Published success banner */}
        {publishedCount > 0 && (
          <div style={{ background: "rgba(46,204,113,0.1)", border: "1px solid #2ecc71", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <p style={{ color: "#2ecc71", margin: 0, fontSize: 14 }}>
              ✓ {publishedCount} match{publishedCount !== 1 ? "s" : ""} publié{publishedCount !== 1 ? "s" : ""} · Statut mis à jour : Accompagné
            </p>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: C.slate }}>
              Token : {session.session_token}
            </span>
          </div>
        )}

        {/* Draft mode banner */}
        {draftMode && (
          <div style={{ background: "rgba(155,89,182,0.1)", border: "1px solid #9b59b6", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div>
                <p style={{ color: "#b39ddb", ...BEBAS, fontSize: 16, letterSpacing: 1, margin: "0 0 2px" }}>
                  DRAFT MODE — Sélectionne les matchs à publier
                </p>
                <p style={{ color: C.slate, fontSize: 12, margin: 0 }}>
                  {selectedMatches.length} match{selectedMatches.length !== 1 ? "s" : ""} sélectionné{selectedMatches.length !== 1 ? "s" : ""} sur {matches.length}
                </p>
              </div>
              <button
                onClick={publishDraft}
                disabled={selectedMatches.length === 0 || publishLoading}
                style={{
                  background: selectedMatches.length > 0 ? C.maize : "rgba(255,203,5,0.3)",
                  color: C.navy, border: "none", borderRadius: 6, padding: "10px 20px",
                  ...BEBAS, fontSize: 16, letterSpacing: 1,
                  cursor: selectedMatches.length > 0 ? "pointer" : "not-allowed",
                }}
              >
                {publishLoading ? "PUBLICATION..." : `PUBLIER ${selectedMatches.length} MATCH${selectedMatches.length !== 1 ? "S" : ""} →`}
              </button>
            </div>

            {/* Quick selection */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "TOP 5",   fn: () => setSelectedMatches([0,1,2,3,4].filter(i => i < matches.length)) },
                { label: "TOP 10",  fn: () => setSelectedMatches([...Array(Math.min(10, matches.length))].map((_, i) => i)) },
                { label: "TOUT",    fn: () => setSelectedMatches(matches.map((_, i) => i)) },
                { label: "EFFACER", fn: () => setSelectedMatches([]) },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.fn}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: C.slate, padding: "4px 10px", borderRadius: 4, ...BEBAS, fontSize: 12, letterSpacing: 1, cursor: "pointer" }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 ? (
          <p style={{ color: C.slate, fontSize: 14, textAlign: "center", padding: "32px 0" }}>
            Cliquer « Relancer le matching » pour charger les résultats.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {matches.map((m, i) => {
              const isSelected = selectedMatches.includes(i)
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (!draftMode) return
                    setSelectedMatches(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
                  }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px",
                    background: draftMode && isSelected
                      ? "rgba(255,203,5,0.06)"
                      : i < 3 ? "rgba(255,203,5,0.04)" : "rgba(255,255,255,0.02)",
                    border: "1px solid",
                    borderColor: draftMode && isSelected
                      ? C.maize
                      : (!draftMode && i === 0) ? "rgba(255,203,5,0.25)" : "rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    cursor: draftMode ? "pointer" : "default",
                    transition: "border-color 0.1s, background 0.1s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {draftMode && (
                      <div style={{
                        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${isSelected ? C.maize : "rgba(255,255,255,0.3)"}`,
                        background: isSelected ? C.maize : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, color: C.navy, fontWeight: 700,
                      }}>
                        {isSelected && "✓"}
                      </div>
                    )}
                    <span style={{ ...BEBAS, fontSize: i === 0 ? 28 : 22, color: i === 0 ? C.maize : C.slate, minWidth: 40 }}>
                      #{i + 1}
                    </span>
                    <div>
                      <p style={{ color: "#fff", fontWeight: 600, margin: "0 0 3px", fontSize: 14 }}>{m.name}</p>
                      <p style={{ color: C.slate, fontSize: 12, margin: 0, fontFamily: "monospace" }}>
                        {m.division === "USports" ? "USports" : m.division.replace("division_", "D")}
                        {m.state && ` · ${m.state}`}
                        {m.country === "CA" && " 🇨🇦"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, background: "rgba(255,203,5,0.1)", color: C.maize, fontFamily: "monospace" }}>
                      🏊 {m.score_sportif}/50
                    </span>
                    <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, background: "rgba(93,186,120,0.1)", color: "#5dba78", fontFamily: "monospace" }}>
                      🎓 {m.score_academique}/25
                    </span>
                    <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 700, background: (!draftMode && i === 0) ? C.maize : "rgba(255,255,255,0.08)", color: (!draftMode && i === 0) ? C.navy : "#fff", fontFamily: "monospace" }}>
                      {m.score_total}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
