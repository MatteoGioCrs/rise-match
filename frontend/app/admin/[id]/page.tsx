"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import ChatWidget from "../../components/ChatWidget"

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
  user_id: number | null
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
  const [checklist,       setChecklist]       = useState<any>(null)
  const [athleteProfile,  setAthleteProfile]  = useState<any>(null)
  const [documents,       setDocuments]       = useState<any[]>([])

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
      const rawPm = s.published_matches
      const parsedPm: Match[] = Array.isArray(rawPm) ? rawPm
        : typeof rawPm === "string" ? (() => { try { return JSON.parse(rawPm) } catch { return [] } })()
        : []
      if (parsedPm.length > 0) setMatches(parsedPm)
      if (s.user_id) {
        const [clRes, profRes, docsRes] = await Promise.all([
          fetch(`${API}/api/admin/checklist/${s.user_id}`,  { headers: { "x-admin-token": t } }),
          fetch(`${API}/api/admin/profile/${s.user_id}`,    { headers: { "x-admin-token": t } }),
          fetch(`${API}/api/admin/documents/${s.user_id}`,  { headers: { "x-admin-token": t } }),
        ])
        if (clRes.ok)   setChecklist(await clRes.json())
        if (profRes.ok) setAthleteProfile(await profRes.json())
        if (docsRes.ok) setDocuments((await docsRes.json()).documents ?? [])
      }
    } catch {
      router.push("/admin")
    } finally {
      setLoading(false)
    }
  }

  async function toggleStep(stepId: string, currentDone: boolean) {
    if (!token || !session?.user_id) return
    const res = await fetch(`${API}/api/admin/checklist/${session.user_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ step_id: stepId, done: !currentDone }),
    })
    if (res.ok) {
      const data = await res.json()
      setChecklist((prev: any) => ({ ...prev, ...data }))
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

      {/* ── Sticky section nav ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: C.navy,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        margin: "0 -32px 28px",
        padding: "0 32px",
        display: "flex", overflowX: "auto",
      }}>
        {([
          { anchor: "sec-notes",     label: "NOTES" },
          ...(athleteProfile ? [{ anchor: "sec-profil",    label: "PROFIL" }]    : []),
          ...(checklist      ? [{ anchor: "sec-checklist", label: "CHECKLIST" }] : []),
          { anchor: "sec-messages",  label: "MESSAGES" },
          { anchor: "sec-documents", label: "DOCS" },
          { anchor: "sec-matches",   label: "MATCHS" },
        ] as { anchor: string; label: string }[]).map(({ anchor, label }) => (
          <button
            key={anchor}
            onClick={() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" })}
            style={{
              background: "none", border: "none", borderBottom: "2px solid transparent",
              cursor: "pointer", padding: "12px 16px", marginBottom: -1,
              ...BEBAS, fontSize: 13, letterSpacing: 1, color: C.slate,
              whiteSpace: "nowrap", flexShrink: 0,
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.maize; e.currentTarget.style.borderBottomColor = C.maize }}
            onMouseLeave={e => { e.currentTarget.style.color = C.slate; e.currentTarget.style.borderBottomColor = "transparent" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 2-column grid: times + notes */}
      <div id="sec-notes" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>

        {/* Section 1 — Temps saisis */}
        <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 24 }}>
          <h2 style={{ ...BEBAS, fontSize: 20, color: C.maize, letterSpacing: 2, margin: "0 0 16px" }}>TEMPS SAISIS</h2>

          {times.length === 0 ? (
            <p style={{ color: C.slate, fontSize: 13 }}>Aucun temps enregistré.</p>
          ) : (
            times.map((t: any, i: number) => (
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

          {Array.isArray(session.divisions) && session.divisions.length > 0 && (
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

      {/* Section 3 — Profil athlète */}
      {athleteProfile && Object.keys(athleteProfile).length > 1 && (
        <div id="sec-profil" style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ ...BEBAS, fontSize: 20, color: C.maize, letterSpacing: 2, margin: "0 0 16px" }}>PROFIL ATHLÈTE</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
            {[
              { label: "Club",            value: athleteProfile.club_name },
              { label: "Entraîneur",      value: athleteProfile.coach_name },
              { label: "Email coach",     value: athleteProfile.coach_email },
              { label: "Niveau scolaire", value: athleteProfile.current_level },
              { label: "Anglais",         value: athleteProfile.english_level },
              { label: "Score TOEFL",     value: athleteProfile.toefl_score },
              { label: "Départ",          value: athleteProfile.departure_year },
              { label: "Objectif",        value: athleteProfile.objective },
              { label: "Budget",          value: athleteProfile.budget_range },
            ]
              .filter(row => row.value != null && row.value !== "")
              .map(row => (
                <div key={row.label} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 8 }}>
                  <div style={{ fontSize: 10, color: C.slate, fontFamily: "Bebas Neue, sans-serif", letterSpacing: 2, marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: "#fff", fontFamily: "Inter, sans-serif" }}>{String(row.value)}</div>
                </div>
              ))}
          </div>
          {athleteProfile.notes_perso && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, borderLeft: `3px solid rgba(255,203,5,0.3)` }}>
              <div style={{ fontSize: 10, color: C.slate, fontFamily: "Bebas Neue, sans-serif", letterSpacing: 2, marginBottom: 4 }}>NOTES PERSONNELLES</div>
              <p style={{ fontSize: 13, color: C.slate, margin: 0, fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>{athleteProfile.notes_perso}</p>
            </div>
          )}
        </div>
      )}

      {/* Section 4 — Checklist NCAA */}
      {checklist && (
        <div id="sec-checklist" style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ ...BEBAS, color: C.maize, fontSize: 12, letterSpacing: 2, margin: 0 }}>
              CHECKLIST — {checklist.done}/{checklist.total} ({checklist.progress_pct}%)
            </p>
            {checklist.updated_at && (
              <span style={{ fontSize: 11, color: C.slate, fontStyle: "italic" }}>
                Modifié le {new Date(checklist.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${checklist.progress_pct}%`, background: `linear-gradient(90deg, ${C.maize}, #E6B800)`, transition: "width 0.3s" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(Array.isArray(checklist.steps) ? checklist.steps : []).map((step: any) => (
              <div
                key={step.id}
                onClick={() => toggleStep(step.id, step.done)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, cursor: "pointer", background: step.done ? "rgba(46,204,113,0.06)" : "rgba(255,255,255,0.02)", transition: "background 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = step.done ? "rgba(46,204,113,0.1)" : "rgba(255,203,5,0.04)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = step.done ? "rgba(46,204,113,0.06)" : "rgba(255,255,255,0.02)" }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: step.done ? "#2ECC71" : "transparent", border: `2px solid ${step.done ? "#2ECC71" : "rgba(255,255,255,0.25)"}`, fontSize: 11, color: "#fff", transition: "all 0.2s" }}>
                  {step.done && "✓"}
                </div>
                <span style={{ fontSize: 13, fontFamily: "Inter, sans-serif", color: step.done ? "#B8C8D8" : C.slate, textDecoration: step.done ? "line-through" : "none" }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5 — Messagerie */}
      {session.user_id ? (
        <div id="sec-messages" style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 12, letterSpacing: 2, margin: "0 0 16px" }}>MESSAGERIE</p>
          <ChatWidget
            mode="admin"
            userId={session.user_id}
            adminToken={token ?? undefined}
            userName={session.admin_label ?? undefined}
          />
        </div>
      ) : (
        <div id="sec-messages" style={{ background: C.navyLight, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <p style={{ color: C.slate, fontSize: 13, margin: 0, fontStyle: "italic" }}>
            💬 Messagerie indisponible — cette session n'est pas encore liée à un compte athlète.
          </p>
        </div>
      )}

      {/* Section 6 — Documents */}
      {session.user_id ? (
        <div id="sec-documents" style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ ...BEBAS, color: C.maize, fontSize: 12, letterSpacing: 2, margin: 0 }}>
              DOCUMENTS ({documents.length})
            </p>
            <label style={{ background: "transparent", border: "1px solid rgba(255,203,5,0.3)", color: C.maize, padding: "5px 12px", borderRadius: 6, cursor: "pointer", ...BEBAS, fontSize: 12, letterSpacing: 1 }}>
              + AJOUTER UN FICHIER
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file || !token) return
                  const formData = new FormData()
                  formData.append("file", file)
                  formData.append("label", "Document RISE")
                  const res = await fetch(`${API}/api/admin/documents/${session.user_id}/upload`, {
                    method: "POST",
                    headers: { "x-admin-token": token },
                    body: formData,
                  })
                  if (res.ok) {
                    const newDoc = await res.json()
                    setDocuments(prev => [{ ...newDoc, uploaded_by: "admin", created_at: new Date().toISOString() }, ...prev])
                  }
                  e.target.value = ""
                }}
              />
            </label>
          </div>

          {documents.length === 0 ? (
            <p style={{ color: C.slate, fontSize: 13, fontFamily: "Inter, sans-serif", fontStyle: "italic", margin: 0 }}>
              Aucun document pour ce dossier.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {documents.map((doc: any) => (
                <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{doc.file_type === "pdf" ? "📄" : "🖼️"}</span>
                    <div>
                      <p style={{ color: "#fff", fontSize: 13, margin: "0 0 2px", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                        {doc.label || doc.file_name}
                      </p>
                      <p style={{ color: C.slate, fontSize: 11, margin: 0, fontFamily: "Space Mono, monospace" }}>
                        {doc.uploaded_by === "admin" ? "🏢 RISE" : "👤 Athlète"}
                        {" · "}
                        {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: C.maize, fontSize: 12, ...BEBAS, letterSpacing: 1, textDecoration: "none" }}>
                    OUVRIR →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div id="sec-documents" style={{ background: C.navyLight, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <p style={{ color: C.slate, fontSize: 13, margin: 0, fontStyle: "italic" }}>
            📁 Documents indisponibles — cette session n'est pas encore liée à un compte athlète.
          </p>
        </div>
      )}

      {/* Section 7 — Matchs */}
      <div id="sec-matches" style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 24 }}>

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
