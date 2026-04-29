"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const API = "https://rise-match-production.up.railway.app"

const BEBAS: React.CSSProperties = { fontFamily: "'Bebas Neue', sans-serif" }
const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" }
const MONO:  React.CSSProperties = { fontFamily: "Space Mono, monospace" }
const C = {
  navy:       "#0B1628",
  navyLight:  "#152236",
  navyMid:    "#1E3A5F",
  maize:      "#FFCB05",
  maizeDark:  "#E6B800",
  white:      "#FFFFFF",
  slate:      "#8A9BB0",
  slateLight: "#B8C8D8",
  green:      "#2ECC71",
  red:        "#E74C3C",
}

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

  const [activeTab,      setActiveTab]      = useState<"overview" | "athletes">("overview")
  const [search,         setSearch]         = useState("")
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

  const searchLower = search.toLowerCase()
  const baseFiltered = filter === "tous" ? sessions : sessions.filter(s => s.admin_status === filter)
  const filtered = searchLower
    ? baseFiltered.filter(s =>
        (s.admin_label ?? "").toLowerCase().includes(searchLower) ||
        (s.user_email ?? "").toLowerCase().includes(searchLower) ||
        (`${s.first_name ?? ""} ${s.last_name ?? ""}`).toLowerCase().includes(searchLower)
      )
    : baseFiltered

  const pendingUsers = users.filter((u: any) => !u.is_active)
  const activeUsers  = users.filter((u: any) => u.is_active)

  const STATUS_BORDER: Record<string, string> = {
    nouveau:    C.maize,
    prospect:   "#60A5FA",
    accompagné: "#34D399",
    signé:      "#A78BFA",
    archivé:    "rgba(100,116,139,0.35)",
  }
  const PIPELINE = [
    { key: "nouveau",    label: "Nouveau",    color: C.maize    },
    { key: "prospect",   label: "Prospect",   color: "#60A5FA"  },
    { key: "accompagné", label: "Accompagné", color: "#34D399"  },
    { key: "signé",      label: "Signé",      color: "#A78BFA"  },
    { key: "archivé",    label: "Archivé",    color: "#64748B"  },
  ]
  const pipelineTotal = Math.max(Object.values(counts).reduce((a, b) => a + b, 0), 1)

  const SIDENAV = [
    { id: "overview"  as const, label: "Vue d'ensemble", icon: "◈", group: "PILOTAGE" },
    { id: "athletes"  as const, label: "Athlètes",        icon: "◉", group: "PILOTAGE" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: C.navy, color: C.white, ...INTER, display: "flex" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 248, flexShrink: 0, backgroundColor: "#0A1322", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        {/* Logo */}
        <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: C.maize, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0B1628" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 17 L9 11 L13 14 L21 6"/><path d="M15 6 L21 6 L21 12"/>
            </svg>
          </div>
          <div>
            <div style={{ ...BEBAS, fontSize: 22, lineHeight: 1 }}><span style={{ color: C.maize }}>RISE</span><span style={{ color: "#fff" }}>.MATCH</span></div>
            <div style={{ ...BEBAS, fontSize: 9, color: C.slate, marginTop: 3, letterSpacing: "0.3em" }}>ADMIN PORTAL</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "20px 12px" }}>
          <div style={{ ...BEBAS, fontSize: 9, color: "rgba(138,155,176,0.6)", letterSpacing: "0.3em", padding: "0 12px", marginBottom: 8 }}>PILOTAGE</div>
          {SIDENAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "10px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, marginBottom: 2, position: "relative", backgroundColor: activeTab === item.id ? "rgba(255,255,255,0.05)" : "transparent", borderLeft: `3px solid ${activeTab === item.id ? C.maize : "transparent"}`, color: activeTab === item.id ? C.white : C.slate, transition: "all 0.15s" }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              {item.id === "athletes" && users.length > 0 && (
                <span style={{ marginLeft: "auto", ...MONO, fontSize: 10, padding: "1px 6px", borderRadius: 4, backgroundColor: "rgba(255,203,5,0.1)", border: "1px solid rgba(255,203,5,0.2)", color: C.maize }}>{users.length}</span>
              )}
            </button>
          ))}
          <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "16px 0 12px" }} />
          <div style={{ ...BEBAS, fontSize: 9, color: "rgba(138,155,176,0.6)", letterSpacing: "0.3em", padding: "0 12px", marginBottom: 8 }}>OUTILS</div>
          <a href="/admin/stats" style={{ textDecoration: "none", width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: C.slate, fontSize: 14, transition: "color 0.15s" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.white}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.slate}>
            <span style={{ fontSize: 14 }}>◎</span>
            <span style={{ fontWeight: 500 }}>Analytics</span>
          </a>
        </nav>

        {/* Admin card */}
        <div style={{ margin: 12, padding: 16, borderRadius: 12, background: "linear-gradient(135deg, rgba(30,58,95,0.6), rgba(21,34,54,0.4))", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", ...BEBAS, fontSize: 14, color: "#34D399", flexShrink: 0 }}>AD</div>
            <div>
              <div style={{ fontSize: 11, color: C.slate }}>Connecté en tant que</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: C.white }}>Admin · RISE</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.slateLight }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#34D399", flexShrink: 0 }} />
            Session sécurisée
          </div>
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "14px 24px", display: "flex", alignItems: "center", gap: 10, color: C.slate, fontSize: 13, borderTop: "1px solid rgba(255,255,255,0.06)", transition: "color 0.15s", width: "100%", textAlign: "left" }}
          onMouseEnter={e => e.currentTarget.style.color = C.red}
          onMouseLeave={e => e.currentTarget.style.color = C.slate}>
          ✕ Déconnexion
        </button>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* Topbar */}
        <header style={{ height: 64, backgroundColor: "rgba(11,22,40,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", position: "sticky", top: 0, zIndex: 40, flexShrink: 0, backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...BEBAS, fontSize: 13, color: C.slate, letterSpacing: "0.2em" }}>ADMIN</span>
            <span style={{ color: "rgba(138,155,176,0.4)" }}>/</span>
            <span style={{ ...BEBAS, fontSize: 13, color: C.white, letterSpacing: "0.2em" }}>{activeTab === "overview" ? "VUE D'ENSEMBLE" : "ATHLÈTES"}</span>
            <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 4, backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", ...BEBAS, fontSize: 9, color: "#F87171", letterSpacing: "0.2em" }}>RESTRICTED</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", minWidth: 240 }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={C.slate} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Recherche athlète, email…" style={{ background: "none", border: "none", outline: "none", color: C.slateLight, fontSize: 11, ...INTER, flex: 1, minWidth: 0 }} />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: C.slate, cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>}
            </div>
            <button onClick={() => { setOffset(0); fetchSessions(0); fetchUsers() }}
              style={{ padding: "7px 12px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: C.slateLight, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, ...INTER }}>
              ↻ Rafraîchir
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: 32, overflowX: "hidden" }}>

          {/* ──────────────── VUE D'ENSEMBLE ──────────────── */}
          {activeTab === "overview" && (<>

            {/* KPI Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "RECHERCHES",       value: String(total || sessions.length), sub: "sessions",                 badge: null,                    icon: "⌕" },
                { label: "ATHLÈTES ACTIFS",  value: String(activeUsers.length),       sub: `/ ${users.length} inscrits`, badge: null,                   icon: "◉" },
                { label: "EN ATTENTE",       value: String(pendingUsers.length),       sub: "comptes",                  badge: pendingUsers.length > 0 ? "ACTION" : null, icon: "◎" },
                { label: "AVEC RÉSULTATS",   value: String(sessions.filter(s => (s.results_count ?? 0) > 0).length), sub: "sessions publiées", badge: null, icon: "◈" },
              ].map(kpi => (
                <div key={kpi.label} style={{ padding: 20, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(255,203,5,0.1)", border: "1px solid rgba(255,203,5,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: C.maize }}>
                      {kpi.icon}
                    </div>
                    {kpi.badge && (
                      <span style={{ ...BEBAS, fontSize: 9, letterSpacing: "0.2em", color: "#FB923C", padding: "3px 8px", borderRadius: 4, backgroundColor: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>{kpi.badge}</span>
                    )}
                  </div>
                  <div style={{ ...BEBAS, fontSize: 9, color: C.slate, letterSpacing: "0.25em", marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ ...BEBAS, fontSize: 34, color: C.white, lineHeight: 1 }}>{kpi.value}</span>
                    <span style={{ ...MONO, fontSize: 11, color: C.slate }}>{kpi.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pipeline */}
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(135deg, rgba(30,58,95,0.4), rgba(15,28,51,1))", padding: "20px 24px", marginBottom: 28 }}>
              <div style={{ ...BEBAS, fontSize: 9, color: C.slate, letterSpacing: "0.3em", marginBottom: 4 }}>PIPELINE</div>
              <div style={{ ...BEBAS, fontSize: 18, color: C.white, marginBottom: 20 }}>STATUTS RECHERCHES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {PIPELINE.map(p => {
                  const cnt = counts[p.key] ?? 0
                  const pct = Math.round(cnt / pipelineTotal * 100)
                  return (
                    <div key={p.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }} />
                          <span style={{ fontSize: 13, color: C.white }}>{p.label}</span>
                        </div>
                        <span style={{ ...MONO, fontSize: 12, color: C.white }}>{cnt}</span>
                      </div>
                      <div style={{ height: 6, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, backgroundColor: p.color, borderRadius: 999, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sessions table */}
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)", overflow: "hidden", marginBottom: 28 }}>
              {/* Table header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ ...BEBAS, fontSize: 9, color: C.slate, letterSpacing: "0.3em", marginBottom: 2 }}>RECHERCHES RÉCENTES</div>
                  <div style={{ ...BEBAS, fontSize: 20, color: C.white }}>FLUX D'ENTRÉE{loadingSessions && " · ..."}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {(["tous", ...Object.keys(STATUS_CFG)] as string[]).map(f => {
                    const cfg = STATUS_CFG[f]
                    const cnt = f === "tous" ? sessions.length : (counts[f] ?? 0)
                    const active = filter === f
                    return (
                      <button key={f} onClick={() => setFilter(f)}
                        style={{ padding: "5px 14px", borderRadius: 999, border: "none", cursor: "pointer", ...BEBAS, fontSize: 10, letterSpacing: "0.15em", backgroundColor: active ? (cfg?.bg ?? C.maize) : "rgba(255,255,255,0.05)", color: active ? (cfg?.color ?? C.navy) : C.slateLight, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
                        {!active && cfg && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: cfg.bg, display: "inline-block" }} />}
                        {cfg?.label ?? "TOUS"} · {cnt}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Rows */}
              {loadingSessions ? (
                <div style={{ textAlign: "center", color: C.slate, padding: 48, ...BEBAS, fontSize: 14, letterSpacing: 2 }}>CHARGEMENT...</div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: "center", color: C.slate, padding: 48, fontSize: 14 }}>
                  {sessions.length === 0 ? "Aucune recherche enregistrée." : `Aucune recherche correspondant aux filtres.`}
                </div>
              ) : (
                <div>
                  {filtered.map(s => {
                    const cfg       = STATUS_CFG[s.admin_status] ?? STATUS_CFG.nouveau
                    const isEditing = s.id in editingLabel
                    const labelVal  = isEditing ? editingLabel[s.id] : (s.admin_label ?? "")
                    const borderColor = STATUS_BORDER[s.admin_status] ?? C.slate
                    const initials  = s.admin_label
                      ? s.admin_label.split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase()
                      : s.first_name && s.last_name
                        ? `${s.first_name[0]}${s.last_name[0]}`.toUpperCase()
                        : "?"
                    const rawTimes = s.times_input || []
                    const times = typeof rawTimes === "string" ? (() => { try { return JSON.parse(rawTimes) } catch { return [] } })() : (Array.isArray(rawTimes) ? rawTimes : [])

                    return (
                      <div key={s.id} style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", borderLeft: `3px solid ${borderColor}`, display: "flex", alignItems: "center", gap: 16, transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.025)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}>

                        {/* Avatar + name */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 200, flex: "0 0 200px" }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: `${borderColor}22`, border: `1px solid ${borderColor}55`, display: "flex", alignItems: "center", justifyContent: "center", ...BEBAS, fontSize: 12, color: borderColor, flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            {isEditing ? (
                              <input autoFocus value={labelVal}
                                onChange={e => setEditingLabel(prev => ({ ...prev, [s.id]: e.target.value }))}
                                onBlur={() => { patchSession(s.id, { admin_label: labelVal || null }); setEditingLabel(prev => { const n = { ...prev }; delete n[s.id]; return n }) }}
                                onKeyDown={e => {
                                  if (e.key === "Enter") { patchSession(s.id, { admin_label: labelVal || null }); setEditingLabel(prev => { const n = { ...prev }; delete n[s.id]; return n }) }
                                  if (e.key === "Escape") setEditingLabel(prev => { const n = { ...prev }; delete n[s.id]; return n })
                                }}
                                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,203,5,0.5)", borderRadius: 4, padding: "2px 8px", color: "#fff", fontSize: 13, fontWeight: 600, outline: "none", width: "100%", ...INTER }} />
                            ) : (
                              <span onClick={() => setEditingLabel(prev => ({ ...prev, [s.id]: s.admin_label ?? "" }))}
                                style={{ color: s.admin_label ? C.white : C.slate, fontWeight: 600, fontSize: 13, cursor: "text", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {s.admin_label ?? "— sans label —"}
                              </span>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                              {s.user_email && <span style={{ ...MONO, fontSize: 10, color: C.slate, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.user_email}</span>}
                              {s.user_id && unreadByUser[s.user_id] > 0 && (
                                <span style={{ backgroundColor: C.red, color: "#fff", borderRadius: "50%", width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{unreadByUser[s.user_id]}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status + badges */}
                        <div style={{ flex: "0 0 120px" }}>
                          <select value={s.admin_status} disabled={savingId === s.id}
                            onChange={e => patchSession(s.id, { admin_status: e.target.value })}
                            style={{ backgroundColor: cfg.bg, color: cfg.color, border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", outline: "none", ...BEBAS, letterSpacing: "0.15em" }}>
                            {Object.entries(STATUS_CFG).map(([key, c]) => (
                              <option key={key} value={key} style={{ background: C.navyLight, color: "#fff" }}>{c.label}</option>
                            ))}
                          </select>
                          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                            {s.user_id ? (
                              <span style={{ fontSize: 9, backgroundColor: "rgba(46,204,113,0.1)", color: C.green, border: "1px solid rgba(46,204,113,0.2)", borderRadius: 4, padding: "1px 6px", ...BEBAS, letterSpacing: "0.1em" }}>COMPTE</span>
                            ) : (
                              <span style={{ fontSize: 9, backgroundColor: "rgba(255,255,255,0.05)", color: C.slate, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 6px", ...BEBAS, letterSpacing: "0.1em" }}>ANONYME</span>
                            )}
                          </div>
                        </div>

                        {/* Times */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {times.slice(0, 3).map((t: any, i: number) => (
                              <span key={i} style={{ ...MONO, fontSize: 10, padding: "2px 8px", borderRadius: 4, backgroundColor: "rgba(255,203,5,0.08)", border: "1px solid rgba(255,203,5,0.18)", color: C.maize, whiteSpace: "nowrap" }}>
                                {t.event} · {typeof t.time_seconds === "number" ? t.time_seconds.toFixed(2) : t.time_seconds}s
                              </span>
                            ))}
                            {times.length > 3 && <span style={{ ...MONO, fontSize: 10, padding: "2px 8px", borderRadius: 4, backgroundColor: "rgba(255,255,255,0.05)", color: C.slate }}>+{times.length - 3}</span>}
                            {times.length === 0 && Array.isArray(s.divisions) && s.divisions.length > 0 && (
                              <span style={{ fontSize: 11, color: C.slate }}>{s.divisions.map((d: string) => d === "division_10" ? "USports" : d.replace("division_", "D")).join(" · ")}</span>
                            )}
                          </div>
                          {s.top_match && <div style={{ fontSize: 11, color: C.maize, marginTop: 3 }}>→ {s.top_match}</div>}
                        </div>

                        {/* Results count */}
                        <div style={{ flex: "0 0 40px", textAlign: "center" }}>
                          <span style={{ ...MONO, fontSize: 13, color: s.results_count ? C.white : C.slate }}>{s.results_count ?? 0}</span>
                        </div>

                        {/* Date + action */}
                        <div style={{ flex: "0 0 130px", textAlign: "right" }}>
                          <div style={{ ...MONO, fontSize: 10, color: C.slate, marginBottom: 6 }}>{fmt(s.created_at)}</div>
                          <button onClick={() => router.push(`/admin/${s.id}`)}
                            style={{ background: "none", border: "none", cursor: "pointer", ...BEBAS, fontSize: 12, color: C.maize, letterSpacing: "0.15em", padding: 0 }}>
                            VOIR →
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pagination footer */}
              <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <span style={{ ...MONO, fontSize: 11, color: C.slate }}>
                  {filtered.length} sur {total || sessions.length} recherches
                </span>
                {total > LIMIT && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={() => { const n = Math.max(0, offset - LIMIT); setOffset(n); fetchSessions(n) }}
                      disabled={offset === 0}
                      style={{ padding: "6px 14px", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: offset === 0 ? C.slate : C.white, cursor: offset === 0 ? "not-allowed" : "pointer", ...BEBAS, fontSize: 11, letterSpacing: "0.15em" }}>
                      ← PRÉCÉDENT
                    </button>
                    <span style={{ ...MONO, fontSize: 11, color: C.white }}>{Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}</span>
                    <button onClick={() => { const n = offset + LIMIT; setOffset(n); fetchSessions(n) }}
                      disabled={offset + LIMIT >= total}
                      style={{ padding: "6px 14px", borderRadius: 6, backgroundColor: offset + LIMIT >= total ? "rgba(255,255,255,0.05)" : "rgba(255,203,5,0.1)", border: `1px solid ${offset + LIMIT >= total ? "rgba(255,255,255,0.1)" : "rgba(255,203,5,0.3)"}`, color: offset + LIMIT >= total ? C.slate : C.maize, cursor: offset + LIMIT >= total ? "not-allowed" : "pointer", ...BEBAS, fontSize: 11, letterSpacing: "0.15em" }}>
                      SUIVANT →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Activation queue */}
            {pendingUsers.length > 0 && (
              <div style={{ borderRadius: 16, border: "1px solid rgba(249,115,22,0.2)", background: "linear-gradient(135deg, rgba(249,115,22,0.04), transparent)", padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FB923C", fontSize: 16 }}>◎</div>
                  <div>
                    <div style={{ ...BEBAS, fontSize: 9, color: "#FB923C", letterSpacing: "0.3em" }}>ACTION REQUISE</div>
                    <div style={{ ...BEBAS, fontSize: 18, color: C.white }}>FILE D'ACTIVATION · {pendingUsers.length} EN ATTENTE</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pendingUsers.slice(0, 5).map((user: any) => {
                    const uInitials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "?"
                    return (
                      <div key={user.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", ...BEBAS, fontSize: 13, color: "#34D399", flexShrink: 0 }}>{uInitials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, color: C.white, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.first_name} {user.last_name}</div>
                          <div style={{ ...MONO, fontSize: 10, color: C.slate, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email} · inscrit le {new Date(user.created_at).toLocaleDateString("fr-FR")}</div>
                        </div>
                        <select value={planSelect[user.id] ?? "match"} onChange={e => setPlanSelect(prev => ({ ...prev, [user.id]: e.target.value }))}
                          style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", fontSize: 10, color: C.white, cursor: "pointer", ...BEBAS, letterSpacing: "0.1em" }}>
                          <option value="match">MATCH · 29€</option>
                          <option value="accompagne">ACCOMPAGNÉ · 99€</option>
                        </select>
                        <button onClick={() => activateUser(user.id, true, planSelect[user.id] ?? "match")} disabled={activatingUser === user.id}
                          style={{ padding: "7px 16px", borderRadius: 6, backgroundColor: C.maize, color: C.navy, border: "none", cursor: activatingUser === user.id ? "wait" : "pointer", ...BEBAS, fontSize: 12, letterSpacing: "0.15em", opacity: activatingUser === user.id ? 0.6 : 1, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                          {activatingUser === user.id ? "..." : "ACTIVER →"}
                        </button>
                        <button onClick={() => { setActiveTab("athletes"); loadUserSessions(user) }}
                          style={{ padding: "7px 12px", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: C.slateLight, cursor: "pointer", ...BEBAS, fontSize: 11, letterSpacing: "0.15em", whiteSpace: "nowrap" }}>
                          DOSSIER →
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </>)}

          {/* ──────────────── ATHLÈTES ──────────────── */}
          {activeTab === "athletes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {users.length === 0 ? (
                <div style={{ backgroundColor: C.navyLight, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 40, textAlign: "center", color: C.slate }}>
                  Aucun compte athlète créé pour l'instant.
                </div>
              ) : users.map((user: any) => (
                <div key={user.id}
                  style={{ background: selectedUser?.id === user.id ? "rgba(255,203,5,0.04)" : C.navyLight, border: `1px solid ${selectedUser?.id === user.id ? "rgba(255,203,5,0.35)" : user.is_active ? "rgba(46,204,113,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: user.is_active ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${user.is_active ? "rgba(46,204,113,0.3)" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", ...BEBAS, fontSize: 14, color: user.is_active ? C.green : C.slate, flexShrink: 0 }}>
                      {`${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: C.white }}>{user.first_name || ""} {user.last_name || ""}</span>
                        {unreadByUser[user.id] > 0 && (
                          <span style={{ backgroundColor: C.red, color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{unreadByUser[user.id]}</span>
                        )}
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, backgroundColor: user.is_active ? "rgba(46,204,113,0.15)" : "rgba(255,255,255,0.08)", color: user.is_active ? C.green : C.slate, border: `1px solid ${user.is_active ? C.green : "rgba(255,255,255,0.1)"}`, ...BEBAS, letterSpacing: 1 }}>
                          {user.is_active ? `ACTIF · ${(user.plan ?? "").toUpperCase()}` : "INACTIF"}
                        </span>
                      </div>
                      <p style={{ color: C.slate, fontSize: 12, margin: 0, ...MONO }}>
                        {user.email} · {new Date(user.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        {user.sessions_count ? ` · ${user.sessions_count} recherche(s)` : ""}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {!user.is_active && (
                      <>
                        <select value={planSelect[user.id] ?? "match"} onChange={e => setPlanSelect(prev => ({ ...prev, [user.id]: e.target.value }))}
                          style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: C.white, padding: "6px 10px", borderRadius: 6, fontSize: 11, ...BEBAS, letterSpacing: 1, cursor: "pointer" }}>
                          <option value="match">MATCH — 29€/mois</option>
                          <option value="accompagne">ACCOMPAGNÉ — 99€/mois</option>
                        </select>
                        <button onClick={() => activateUser(user.id, true, planSelect[user.id] ?? "match")} disabled={activatingUser === user.id}
                          style={{ backgroundColor: C.maize, color: C.navy, border: "none", borderRadius: 6, padding: "7px 16px", ...BEBAS, fontSize: 12, letterSpacing: 1, cursor: activatingUser === user.id ? "wait" : "pointer", opacity: activatingUser === user.id ? 0.6 : 1 }}>
                          {activatingUser === user.id ? "..." : "ACTIVER →"}
                        </button>
                      </>
                    )}
                    <button onClick={() => { if (selectedUser?.id === user.id) { setSelectedUser(null); setUserSessions([]) } else loadUserSessions(user) }}
                      style={{ backgroundColor: selectedUser?.id === user.id ? "rgba(255,203,5,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${selectedUser?.id === user.id ? "rgba(255,203,5,0.4)" : "rgba(255,255,255,0.15)"}`, color: selectedUser?.id === user.id ? C.maize : C.slate, padding: "7px 16px", borderRadius: 6, ...BEBAS, fontSize: 12, letterSpacing: 1, cursor: "pointer" }}>
                      {selectedUser?.id === user.id ? "FERMER ✕" : "DOSSIER →"}
                    </button>
                  </div>
                </div>
              ))}

              {/* Fiche détaillée */}
              {selectedUser && (
                <div style={{ marginTop: 8, background: C.navyLight, border: "1px solid rgba(255,203,5,0.2)", borderRadius: 16, padding: 28 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <p style={{ ...BEBAS, fontSize: 10, color: C.maize, letterSpacing: 3, margin: "0 0 4px" }}>DOSSIER ATHLÈTE</p>
                      <h2 style={{ ...BEBAS, fontSize: 26, color: C.white, margin: 0 }}>{selectedUser.first_name} {selectedUser.last_name}</h2>
                      <p style={{ color: C.slate, fontSize: 12, margin: "4px 0 0", ...MONO }}>{selectedUser.email}</p>
                    </div>
                    <button onClick={() => { setSelectedUser(null); setUserSessions([]) }}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: C.slate, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>✕ Fermer</button>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={async () => { await activateUser(selectedUser.id, !selectedUser.is_active, selectedUser.plan ?? "match"); setSelectedUser({ ...selectedUser, is_active: !selectedUser.is_active }) }}
                      style={{ padding: "7px 16px", borderRadius: 6, border: "none", cursor: "pointer", ...BEBAS, fontSize: 12, letterSpacing: 1, backgroundColor: selectedUser.is_active ? "rgba(231,76,60,0.15)" : "rgba(46,204,113,0.15)", color: selectedUser.is_active ? C.red : C.green }}>
                      {selectedUser.is_active ? "DÉSACTIVER L'ACCÈS" : "ACTIVER L'ACCÈS"}
                    </button>
                    <select value={selectedUser.plan || "free"}
                      onChange={async e => { const token = localStorage.getItem("rise_admin_token") ?? ""; await fetch(`${API}/api/admin/users/${selectedUser.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-token": token }, body: JSON.stringify({ plan: e.target.value }) }); setSelectedUser({ ...selectedUser, plan: e.target.value }); await fetchUsers() }}
                      style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: C.white, padding: "7px 12px", borderRadius: 6, fontSize: 11, ...BEBAS, letterSpacing: 1, cursor: "pointer" }}>
                      <option value="free">FREE</option>
                      <option value="match">MATCH — 29€/mois</option>
                      <option value="accompagne">ACCOMPAGNÉ — 99€/mois</option>
                    </select>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input id="manualSessionInput" placeholder="Token session à lier…"
                        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: C.white, padding: "7px 12px", borderRadius: 6, fontSize: 11, ...MONO, width: 200, outline: "none" }} />
                      <button onClick={async () => { const input = document.getElementById("manualSessionInput") as HTMLInputElement; const sessionToken = input?.value?.trim(); if (!sessionToken) return; const token = localStorage.getItem("rise_admin_token") ?? ""; await fetch(`${API}/api/admin/users/${selectedUser.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-token": token }, body: JSON.stringify({ add_session_token: sessionToken }) }); input.value = ""; await loadUserSessions(selectedUser) }}
                        style={{ background: "transparent", border: "1px solid rgba(255,203,5,0.3)", color: C.maize, padding: "7px 12px", borderRadius: 6, ...BEBAS, fontSize: 11, letterSpacing: 1, cursor: "pointer" }}>
                        + LIER SESSION
                      </button>
                    </div>
                  </div>

                  <p style={{ ...BEBAS, fontSize: 11, color: C.maize, letterSpacing: 2, margin: "0 0 12px" }}>RECHERCHES LIÉES ({userSessions.length})</p>
                  {userSessionsLoading ? (
                    <p style={{ color: C.slate, fontSize: 13 }}>Chargement...</p>
                  ) : userSessions.length === 0 ? (
                    <p style={{ color: C.slate, fontSize: 13, fontStyle: "italic" }}>Aucune recherche liée. Utilise « Lier session » pour en associer une.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {userSessions.map((s: any) => (
                        <div key={s.id} onClick={() => router.push(`/admin/${s.id}`)}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", transition: "border-color 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,203,5,0.3)")}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}>
                          <div>
                            <p style={{ color: C.white, fontSize: 13, margin: "0 0 2px", fontWeight: 500 }}>Session #{s.id}{s.top_match ? ` · Top match : ${s.top_match}` : ""}</p>
                            <p style={{ color: C.slate, fontSize: 11, margin: 0, ...MONO }}>
                              {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} · {s.results_count ?? 0} résultats{s.published_matches ? " · ✓ Publié" : ""}
                            </p>
                          </div>
                          <span style={{ color: C.maize, fontSize: 12, ...BEBAS, letterSpacing: 1 }}>VOIR →</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
