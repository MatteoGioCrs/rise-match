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
  user_id: number | null
  user_email: string | null
  first_name: string | null
  last_name: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const [state,    setState]    = useState<"login" | "dashboard">("login")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  const LIMIT = 50
  const [sessions,        setSessions]        = useState<Session[]>([])
  const [filter,          setFilter]          = useState("tous")
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [editingLabel,    setEditingLabel]    = useState<Record<number, string>>({})
  const [savingId,        setSavingId]        = useState<number | null>(null)
  const [offset,          setOffset]          = useState(0)
  const [total,           setTotal]           = useState(0)

  const [activeTab,      setActiveTab]      = useState<"sessions" | "comptes">("sessions")
  const [users,          setUsers]          = useState<any[]>([])
  const [activatingUser, setActivatingUser] = useState<number | null>(null)
  const [planSelect,     setPlanSelect]     = useState<Record<number, string>>({})

  const [selectedUser,         setSelectedUser]         = useState<any | null>(null)
  const [userSessions,         setUserSessions]         = useState<any[]>([])
  const [userSessionsLoading,  setUserSessionsLoading]  = useState(false)
  const [unreadByUser,         setUnreadByUser]         = useState<Record<number, number>>({})

  useEffect(() => {
    const stored = localStorage.getItem("rise_admin_token")
    if (stored) verifyToken(stored)
  }, [])

  useEffect(() => {
    if (state === "dashboard") { fetchSessions(0); fetchUsers() }
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

  async function fetchSessions(newOffset = 0) {
    setLoadingSessions(true)
    try {
      const token = localStorage.getItem("rise_admin_token") ?? ""
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) })
      const res = await fetch(`${API}/api/admin/sessions?${params}`, {
        headers: { "x-admin-token": token },
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions ?? data)
        if (data.total !== undefined) setTotal(data.total)
      }
    } catch { /* ignore */ }
    finally { setLoadingSessions(false) }
  }

  async function fetchUsers() {
    try {
      const token = localStorage.getItem("rise_admin_token") ?? ""
      const [usersRes, unreadRes] = await Promise.all([
        fetch(`${API}/api/admin/users`,            { headers: { "x-admin-token": token } }),
        fetch(`${API}/api/admin/messages/unread`,  { headers: { "x-admin-token": token } }),
      ])
      if (usersRes.ok) setUsers((await usersRes.json()).users ?? [])
      if (unreadRes.ok) {
        const data = await unreadRes.json()
        const map: Record<number, number> = {}
        for (const item of (data.unread ?? [])) map[item.user_id] = item.unread_count
        setUnreadByUser(map)
      }
    } catch { /* ignore */ }
  }

  async function activateUser(userId: number, isActive: boolean, plan: string) {
    setActivatingUser(userId)
    try {
      const token = localStorage.getItem("rise_admin_token") ?? ""
      await fetch(`${API}/api/admin/users/${userId}/activate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ is_active: isActive, plan }),
      })
      await fetchUsers()
    } catch { /* ignore */ }
    finally { setActivatingUser(null) }
  }

  async function loadUserSessions(user: any) {
    setSelectedUser(user)
    setUserSessionsLoading(true)
    try {
      const token = localStorage.getItem("rise_admin_token") ?? ""
      const res = await fetch(`${API}/api/admin/users/${user.id}/sessions`, {
        headers: { "x-admin-token": token },
      })
      const data = await res.json()
      setUserSessions(data.sessions || [])
    } catch { /* ignore */ }
    finally { setUserSessionsLoading(false) }
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <p style={{ ...BEBAS, fontSize: 12, color: C.maize, letterSpacing: 3, margin: 0 }}>RISE.MATCH</p>
          <h1 style={{ ...BEBAS, fontSize: 40, color: "#fff", margin: "4px 0 0" }}>ADMIN PORTAL</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.slate }}>
            {sessions.length} recherche{sessions.length !== 1 ? "s" : ""}
          </span>
          <a
            href="/admin/stats"
            style={{ color: C.slate, fontSize: 12, textDecoration: "none", ...BEBAS, letterSpacing: 1, border: "1px solid rgba(255,255,255,0.12)", padding: "6px 12px", borderRadius: 6 }}
          >
            📊 ANALYTICS
          </a>
          <button
            onClick={() => { setOffset(0); fetchSessions(0); fetchUsers() }}
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

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {([
          { key: "sessions", label: "RECHERCHES" },
          { key: "comptes",  label: "COMPTES ATHLÈTES" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              if (tab.key !== "comptes") {
                setSelectedUser(null)
                setUserSessions([])
              }
            }}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              ...BEBAS, fontSize: 14, letterSpacing: 1,
              background: activeTab === tab.key ? C.maize : "rgba(255,255,255,0.05)",
              color: activeTab === tab.key ? C.navy : C.slate,
            }}
          >
            {tab.key === "comptes" && users.length > 0
              ? `${tab.label} (${users.length})`
              : tab.label}
          </button>
        ))}
      </div>

      {/* ── Sessions tab ─────────────────────────────────────────────────── */}
      {activeTab === "sessions" && (<>

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

        {/* Sessions list */}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                          style={{ color: s.admin_label ? "#fff" : C.slate, fontWeight: 600, fontSize: 14, cursor: "text", borderBottom: "1px dashed rgba(255,255,255,0.2)", paddingBottom: 1 }}
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
                          <option key={key} value={key} style={{ background: C.navyLight, color: "#fff" }}>{c.label}</option>
                        ))}
                      </select>
                      {s.user_id ? (
                        <span style={{ fontSize: 11, background: "rgba(46,204,113,0.12)", color: "#2ECC71", border: "1px solid rgba(46,204,113,0.3)", borderRadius: 10, padding: "2px 8px", fontFamily: "Inter", display: "flex", alignItems: "center", gap: 4 }}>
                          👤 {s.user_email ?? `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Compte lié"}
                          {unreadByUser[s.user_id] > 0 && (
                            <span style={{ background: "#E74C3C", color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                              {unreadByUser[s.user_id]}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "rgba(138,155,176,0.5)", fontFamily: "Inter", fontStyle: "italic" }}>sans compte</span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", fontSize: 12, color: C.slate, marginBottom: 6 }}>
                      {s.gender && <span>{s.gender === "M" ? "♂ Homme" : "♀ Femme"}</span>}
                      {s.divisions && s.divisions.length > 0 && (
                        <span>{s.divisions.map(d => d === "division_10" ? "USports" : d.replace("division_", "D")).join(" · ")}</span>
                      )}
                      {s.results_count !== null && <span>{s.results_count} résultat{s.results_count !== 1 ? "s" : ""}</span>}
                      {s.top_match && <span style={{ color: C.maize }}>→ {s.top_match}</span>}
                    </div>

                    {(() => {
                    // 1. On sécurise la lecture des temps (String -> Array)
                    const rawTimes = s.times_input || [];
                    const times = typeof rawTimes === 'string' 
                      ? JSON.parse(rawTimes) 
                      : (Array.isArray(rawTimes) ? rawTimes : []);

                    // 2. Si le tableau est vide, on n'affiche rien
                    if (times.length === 0) return null;

                    // 3. S'il y a des temps, on affiche les "pilules"
                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {times.map((t: any, i: number) => (
                          <span key={i} style={{ background: "rgba(255,203,5,0.08)", border: "1px solid rgba(255,203,5,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: C.maize, fontFamily: "monospace" }}>
                            {t.event} {t.basin} {typeof t.time_seconds === "number" ? t.time_seconds.toFixed(2) : t.time_seconds}s
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0, paddingTop: 2, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <div style={{ fontSize: 12, color: C.slate }}>{fmt(s.created_at)}</div>
                    <div style={{ fontSize: 10, color: "rgba(138,155,176,0.4)", fontFamily: "monospace" }}>{s.session_token?.slice(0, 8)}…</div>
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

        {total > LIMIT && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16, alignItems: "center" }}>
            <button
              onClick={() => { const n = Math.max(0, offset - LIMIT); setOffset(n); fetchSessions(n) }}
              disabled={offset === 0}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: offset === 0 ? C.slate : C.maize, padding: "6px 16px", borderRadius: 6, cursor: offset === 0 ? "not-allowed" : "pointer", ...BEBAS, fontSize: 13, letterSpacing: 1 }}
            >
              ← PRÉCÉDENT
            </button>
            <span style={{ color: C.slate, fontSize: 13, fontFamily: "Inter, sans-serif" }}>
              {offset + 1}–{Math.min(offset + LIMIT, total)} sur {total}
            </span>
            <button
              onClick={() => { const n = offset + LIMIT; setOffset(n); fetchSessions(n) }}
              disabled={offset + LIMIT >= total}
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: offset + LIMIT >= total ? C.slate : C.maize, padding: "6px 16px", borderRadius: 6, cursor: offset + LIMIT >= total ? "not-allowed" : "pointer", ...BEBAS, fontSize: 13, letterSpacing: 1 }}
            >
              SUIVANT →
            </button>
          </div>
        )}
      </>)}

      {/* ── Comptes tab ──────────────────────────────────────────────────── */}
      {activeTab === "comptes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {users.length === 0 ? (
            <div style={{ background: C.navyLight, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 40, textAlign: "center", color: C.slate }}>
              Aucun compte athlète créé pour l'instant.
            </div>
          ) : users.map((user: any) => (
            <div
              key={user.id}
              style={{
                background: selectedUser?.id === user.id ? "rgba(255,203,5,0.04)" : C.navyLight,
                border: `1px solid ${selectedUser?.id === user.id ? "rgba(255,203,5,0.35)" : user.is_active ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {/* Infos */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 15, color: "#fff" }}>
                    {user.first_name || ""} {user.last_name || ""}
                  </span>
                  {unreadByUser[user.id] > 0 && (
                    <span style={{ background: "#e74c3c", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "Inter", flexShrink: 0 }}>
                      {unreadByUser[user.id]}
                    </span>
                  )}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: user.is_active ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.08)",
                    color: user.is_active ? "#2ecc71" : C.slate,
                    border: `1px solid ${user.is_active ? "#2ecc71" : "rgba(255,255,255,0.1)"}`,
                    ...BEBAS, letterSpacing: 1,
                  }}>
                    {user.is_active ? `ACTIF · ${(user.plan ?? "").toUpperCase()}` : "INACTIF"}
                  </span>
                </div>
                <p style={{ color: C.slate, fontSize: 13, margin: 0, fontFamily: "monospace" }}>
                  {user.email}
                  {" · "}
                  {new Date(user.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  {user.sessions_count ? ` · ${user.sessions_count} recherche(s)` : ""}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!user.is_active && (
                  <>
                    <select
                      value={planSelect[user.id] ?? "match"}
                      onChange={e => setPlanSelect(prev => ({ ...prev, [user.id]: e.target.value }))}
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "6px 10px", borderRadius: 6, fontSize: 12, ...BEBAS, letterSpacing: 1, cursor: "pointer" }}
                    >
                      <option value="match">MATCH — 29€/mois</option>
                      <option value="accompagne">ACCOMPAGNÉ — 99€/mois</option>
                    </select>
                    <button
                      onClick={() => activateUser(user.id, true, planSelect[user.id] ?? "match")}
                      disabled={activatingUser === user.id}
                      style={{ background: C.maize, color: C.navy, border: "none", borderRadius: 6, padding: "7px 16px", ...BEBAS, fontSize: 13, letterSpacing: 1, cursor: activatingUser === user.id ? "wait" : "pointer", opacity: activatingUser === user.id ? 0.6 : 1 }}
                    >
                      {activatingUser === user.id ? "..." : "ACTIVER →"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    if (selectedUser?.id === user.id) { setSelectedUser(null); setUserSessions([]) }
                    else loadUserSessions(user)
                  }}
                  style={{ background: selectedUser?.id === user.id ? "rgba(255,203,5,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${selectedUser?.id === user.id ? "rgba(255,203,5,0.4)" : "rgba(255,255,255,0.15)"}`, color: selectedUser?.id === user.id ? C.maize : C.slate, padding: "7px 16px", borderRadius: 6, ...BEBAS, fontSize: 13, letterSpacing: 1, cursor: "pointer" }}
                >
                  {selectedUser?.id === user.id ? "FERMER ✕" : "DOSSIER →"}
                </button>
              </div>
            </div>
          ))}

          {/* ── Fiche détaillée ─────────────────────────────────────────── */}
          {selectedUser && (
            <div style={{ marginTop: 12, background: C.navyLight, border: "1px solid rgba(255,203,5,0.2)", borderRadius: 16, padding: 28 }}>

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <p style={{ ...BEBAS, fontSize: 11, color: C.maize, letterSpacing: 3, margin: "0 0 4px" }}>DOSSIER ATHLÈTE</p>
                  <h2 style={{ ...BEBAS, fontSize: 28, color: "#fff", margin: 0 }}>
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h2>
                  <p style={{ color: C.slate, fontSize: 13, margin: "4px 0 0", fontFamily: "Space Mono, monospace" }}>
                    {selectedUser.email}
                  </p>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setUserSessions([]) }}
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: C.slate, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 12 }}
                >
                  ✕ Fermer
                </button>
              </div>

              {/* Contrôles */}
              <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>

                {/* Toggle actif/inactif */}
                <button
                  onClick={async () => {
                    await activateUser(selectedUser.id, !selectedUser.is_active, selectedUser.plan ?? "match")
                    setSelectedUser({ ...selectedUser, is_active: !selectedUser.is_active })
                  }}
                  style={{ padding: "7px 16px", borderRadius: 6, border: "none", cursor: "pointer", ...BEBAS, fontSize: 13, letterSpacing: 1, background: selectedUser.is_active ? "rgba(231,76,60,0.15)" : "rgba(46,204,113,0.15)", color: selectedUser.is_active ? "#e74c3c" : "#2ecc71" }}
                >
                  {selectedUser.is_active ? "DÉSACTIVER L'ACCÈS" : "ACTIVER L'ACCÈS"}
                </button>

                {/* Changer le plan */}
                <select
                  value={selectedUser.plan || "free"}
                  onChange={async e => {
                    const token = localStorage.getItem("rise_admin_token") ?? ""
                    await fetch(`${API}/api/admin/users/${selectedUser.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json", "x-admin-token": token },
                      body: JSON.stringify({ plan: e.target.value }),
                    })
                    setSelectedUser({ ...selectedUser, plan: e.target.value })
                    await fetchUsers()
                  }}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "7px 12px", borderRadius: 6, fontSize: 12, ...BEBAS, letterSpacing: 1, cursor: "pointer" }}
                >
                  <option value="free">FREE</option>
                  <option value="match">MATCH — 29€/mois</option>
                  <option value="accompagne">ACCOMPAGNÉ — 99€/mois</option>
                </select>

                {/* Lier une session manuellement */}
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    id="manualSessionInput"
                    placeholder="Token session à lier..."
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "7px 12px", borderRadius: 6, fontSize: 12, fontFamily: "Space Mono, monospace", width: 200, outline: "none" }}
                  />
                  <button
                    onClick={async () => {
                      const input = document.getElementById("manualSessionInput") as HTMLInputElement
                      const sessionToken = input?.value?.trim()
                      if (!sessionToken) return
                      const token = localStorage.getItem("rise_admin_token") ?? ""
                      await fetch(`${API}/api/admin/users/${selectedUser.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", "x-admin-token": token },
                        body: JSON.stringify({ add_session_token: sessionToken }),
                      })
                      input.value = ""
                      await loadUserSessions(selectedUser)
                    }}
                    style={{ background: "transparent", border: "1px solid rgba(255,203,5,0.3)", color: C.maize, padding: "7px 12px", borderRadius: 6, ...BEBAS, fontSize: 12, letterSpacing: 1, cursor: "pointer" }}
                  >
                    + LIER SESSION
                  </button>
                </div>
              </div>

              {/* Sessions liées */}
              <div>
                <p style={{ ...BEBAS, fontSize: 12, color: C.maize, letterSpacing: 2, margin: "0 0 12px" }}>
                  RECHERCHES LIÉES ({userSessions.length})
                </p>

                {userSessionsLoading ? (
                  <p style={{ color: C.slate, fontSize: 13, fontFamily: "Inter, sans-serif" }}>Chargement...</p>
                ) : userSessions.length === 0 ? (
                  <p style={{ color: C.slate, fontSize: 13, fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>
                    Aucune recherche liée à ce compte. Utilise « Lier session » pour en associer une manuellement.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {userSessions.map((s: any) => (
                      <div
                        key={s.id}
                        onClick={() => router.push(`/admin/${s.id}`)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "border-color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,203,5,0.3)")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
                      >
                        <div>
                          <p style={{ color: "#fff", fontSize: 13, margin: "0 0 2px", fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                            Session #{s.id}{s.top_match ? ` · Top match : ${s.top_match}` : ""}
                          </p>
                          <p style={{ color: C.slate, fontSize: 11, margin: 0, fontFamily: "Space Mono, monospace" }}>
                            {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                            {" · "}{s.results_count ?? 0} résultats
                            {s.published_matches ? " · ✓ Publié" : ""}
                          </p>
                        </div>
                        <span style={{ color: C.maize, fontSize: 12, ...BEBAS, letterSpacing: 1 }}>VOIR →</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
