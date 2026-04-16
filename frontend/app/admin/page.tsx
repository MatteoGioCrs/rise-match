"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const API = "https://rise-match-production.up.railway.app"

const BEBAS = { fontFamily: "'Bebas Neue', sans-serif" } as const
const C = { navy: "#0B1628", navyLight: "#152236", maize: "#FFCB05", slate: "#8A9BB0" }

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  nouveau:    { label: "Nouveau",    bg: C.maize,   color: C.navy },
  prospect:   { label: "Prospect",   bg: "#3B82F6", color: "#fff" },
  accompagné: { label: "Accompagné", bg: "#10B981", color: "#fff" },
  signé:      { label: "Signé",      bg: "#8B5CF6", color: "#fff" },
  archivé:    { label: "Archivé",    bg: "#4B5563", color: "#fff" },
}

type Session = {
  id: number
  session_token: string
  gender: string | null
  divisions: string[] | null
  times_input: Array<{ event: string; basin: string; time_seconds: number }> | null
  results_count: number | null
  top_match: string | null
  created_at: string
  admin_label: string | null
  admin_status: string
  admin_notes: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const [state,    setState]    = useState<"login" | "dashboard">("login")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  const [sessions,        setSessions]        = useState<Session[]>([])
  const [filter,          setFilter]          = useState("tous")
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [editingLabel,    setEditingLabel]    = useState<Record<number, string>>({})
  const [savingId,        setSavingId]        = useState<number | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("rise_admin_token")
    if (stored) verifyToken(stored)
  }, [])

  useEffect(() => {
    if (state === "dashboard") fetchSessions()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  async function verifyToken(t: string) {
    try {
      const res = await fetch(`${API}/api/admin/verify?token=${t}`)
      if (res.ok) setState("dashboard")
      else localStorage.removeItem("rise_admin_token")
    } catch { /* ignore */ }
  }

  async function handleLogin() {
    setLoading(true); setError("")
    try {
      const res = await fetch(`${API}/api/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setError("Mot de passe incorrect"); return }
      const data = await res.json()
      localStorage.setItem("rise_admin_token", data.token)
      setState("dashboard")
    } catch { setError("Erreur de connexion") }
    finally { setLoading(false) }
  }

  function handleLogout() {
    localStorage.removeItem("rise_admin_token")
    setState("login")
  }

  async function fetchSessions() {
    setLoadingSessions(true)
    try {
      const token = localStorage.getItem("rise_admin_token") ?? ""
      const res = await fetch(`${API}/api/admin/sessions`, {
        headers: { "x-admin-token": token },
      })
      if (res.ok) setSessions(await res.json())
    } catch { /* ignore */ }
    finally { setLoadingSessions(false) }
  }

  async function patchSession(id: number, updates: Partial<Session>) {
    setSavingId(id)
    try {
      const token = localStorage.getItem("rise_admin_token") ?? ""
      await fetch(`${API}/api/admin/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify(updates),
      })
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    } catch { /* ignore */ }
    finally { setSavingId(null) }
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    })
  }

  // ── Login ────────────────────────────────────────────────────────────────
  if (state === "login") {
    return (
      <div style={{ minHeight: "100vh", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.2)", borderRadius: 16, padding: 48, width: "100%", maxWidth: 400 }}>
          <p style={{ ...BEBAS, fontSize: 14, color: C.maize, letterSpacing: 3, marginBottom: 8 }}>RISE.MATCH</p>
          <h1 style={{ ...BEBAS, fontSize: 36, color: "#fff", margin: "0 0 32px" }}>ADMIN PORTAL</h1>

          <label style={{ display: "block", fontSize: 11, color: C.slate, letterSpacing: 2, marginBottom: 8, ...BEBAS }}>MOT DE PASSE</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••••••"
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: 16, marginBottom: 16, boxSizing: "border-box", outline: "none" }}
          />

          {error && <p style={{ color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading || !password}
            style={{ width: "100%", background: C.maize, color: C.navy, border: "none", borderRadius: 8, padding: 14, ...BEBAS, fontSize: 18, letterSpacing: 1, cursor: loading ? "wait" : "pointer", opacity: (!password || loading) ? 0.6 : 1 }}
          >
            {loading ? "VÉRIFICATION..." : "ACCÉDER →"}
          </button>
        </div>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  const counts = sessions.reduce((acc, s) => {
    acc[s.admin_status] = (acc[s.admin_status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const filtered = filter === "tous" ? sessions : sessions.filter(s => s.admin_status === filter)

  return (
    <div style={{ minHeight: "100vh", background: C.navy, padding: 32, fontFamily: "Inter, sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <p style={{ ...BEBAS, fontSize: 12, color: C.maize, letterSpacing: 3, margin: 0 }}>RISE.MATCH</p>
          <h1 style={{ ...BEBAS, fontSize: 40, color: "#fff", margin: "4px 0 0" }}>ADMIN PORTAL</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.slate }}>
            {sessions.length} recherche{sessions.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={fetchSessions}
            style={{ background: "rgba(255,203,5,0.1)", border: "1px solid rgba(255,203,5,0.3)", color: C.maize, padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "Inter" }}
          >
            ↻ Rafraîchir
          </button>
          <button
            onClick={handleLogout}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: C.slate, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: "Inter", fontSize: 13 }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {(["tous", ...Object.keys(STATUS_CFG)] as string[]).map(f => {
          const cfg    = STATUS_CFG[f]
          const cnt    = f === "tous" ? sessions.length : (counts[f] ?? 0)
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer",
                background: active ? (cfg?.bg ?? C.maize) : "rgba(255,255,255,0.07)",
                color: active ? (cfg?.color ?? C.navy) : C.slate,
                fontFamily: "Inter", fontSize: 13, fontWeight: 600,
              }}
            >
              {cfg?.label ?? "Tous"}{cnt > 0 ? ` (${cnt})` : ""}
            </button>
          )
        })}
      </div>

      {/* Sessions */}
      {loadingSessions ? (
        <div style={{ textAlign: "center", color: C.slate, padding: 64 }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: C.slate, padding: 64, fontSize: 15 }}>
          {sessions.length === 0
            ? "Aucune recherche enregistrée pour l'instant."
            : `Aucune recherche avec le statut "${filter}".`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(s => {
            const cfg       = STATUS_CFG[s.admin_status] ?? STATUS_CFG.nouveau
            const isEditing = s.id in editingLabel
            const labelVal  = isEditing ? editingLabel[s.id] : (s.admin_label ?? "")

            return (
              <div
                key={s.id}
                style={{
                  background: C.navyLight,
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderLeft: `3px solid ${cfg.bg}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>

                  {/* Row 1: label + status selector */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    {isEditing ? (
                      <input
                        autoFocus
                        value={labelVal}
                        onChange={e => setEditingLabel(prev => ({ ...prev, [s.id]: e.target.value }))}
                        onBlur={() => {
                          patchSession(s.id, { admin_label: labelVal || null })
                          setEditingLabel(prev => { const n = { ...prev }; delete n[s.id]; return n })
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            patchSession(s.id, { admin_label: labelVal || null })
                            setEditingLabel(prev => { const n = { ...prev }; delete n[s.id]; return n })
                          }
                          if (e.key === "Escape") {
                            setEditingLabel(prev => { const n = { ...prev }; delete n[s.id]; return n })
                          }
                        }}
                        placeholder="Nom du nageur..."
                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,203,5,0.5)", borderRadius: 6, padding: "3px 10px", color: "#fff", fontSize: 14, fontWeight: 600, outline: "none", minWidth: 160, fontFamily: "Inter" }}
                      />
                    ) : (
                      <span
                        onClick={() => setEditingLabel(prev => ({ ...prev, [s.id]: s.admin_label ?? "" }))}
                        title="Cliquer pour modifier"
                        style={{
                          color: s.admin_label ? "#fff" : C.slate,
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: "text",
                          borderBottom: "1px dashed rgba(255,255,255,0.2)",
                          paddingBottom: 1,
                        }}
                      >
                        {s.admin_label ?? "— sans label —"}
                      </span>
                    )}

                    <select
                      value={s.admin_status}
                      disabled={savingId === s.id}
                      onChange={e => patchSession(s.id, { admin_status: e.target.value })}
                      style={{ background: cfg.bg, color: cfg.color, border: "none", borderRadius: 12, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", outline: "none", fontFamily: "Inter" }}
                    >
                      {Object.entries(STATUS_CFG).map(([key, c]) => (
                        <option key={key} value={key} style={{ background: C.navyLight, color: "#fff" }}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 2: metadata */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", fontSize: 12, color: C.slate, marginBottom: 6 }}>
                    {s.gender && (
                      <span>{s.gender === "M" ? "♂ Homme" : "♀ Femme"}</span>
                    )}
                    {s.divisions && s.divisions.length > 0 && (
                      <span>
                        {s.divisions
                          .map(d => d === "division_10" ? "USports" : d.replace("division_", "D"))
                          .join(" · ")}
                      </span>
                    )}
                    {s.results_count !== null && (
                      <span>{s.results_count} résultat{s.results_count !== 1 ? "s" : ""}</span>
                    )}
                    {s.top_match && (
                      <span style={{ color: C.maize }}>→ {s.top_match}</span>
                    )}
                  </div>

                  {/* Row 3: times badges */}
                  {s.times_input && s.times_input.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {s.times_input.map((t, i) => (
                        <span
                          key={i}
                          style={{ background: "rgba(255,203,5,0.08)", border: "1px solid rgba(255,203,5,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: C.maize, fontFamily: "monospace" }}
                        >
                          {t.event} {t.basin} {typeof t.time_seconds === "number" ? t.time_seconds.toFixed(2) : t.time_seconds}s
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date + token + link */}
                <div style={{ textAlign: "right", flexShrink: 0, paddingTop: 2, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ fontSize: 12, color: C.slate }}>{fmt(s.created_at)}</div>
                  <div style={{ fontSize: 10, color: "rgba(138,155,176,0.4)", fontFamily: "monospace" }}>
                    {s.session_token?.slice(0, 8)}…
                  </div>
                  <button
                    onClick={() => router.push(`/admin/${s.id}`)}
                    style={{ background: "rgba(255,203,5,0.1)", border: "1px solid rgba(255,203,5,0.3)", color: C.maize, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "Inter", whiteSpace: "nowrap" }}
                  >
                    Voir →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
