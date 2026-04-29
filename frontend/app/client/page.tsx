"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import ChatWidget from "../components/ChatWidget"
import DocumentsSection from "../components/DocumentsSection"

const API = "https://rise-match-production.up.railway.app"

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
  orange:     "#F39C12",
  red:        "#E74C3C",
}
const BEBAS: React.CSSProperties = { fontFamily: "Bebas Neue, sans-serif" }
const MONO:  React.CSSProperties = { fontFamily: "Space Mono, monospace" }
const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" }

// ─────────────────────────────────────────────────────────────
// PARTIE 2 : AuthForm
// ─────────────────────────────────────────────────────────────

function AuthForm({
  sessionToken,
  onSuccess,
}: {
  sessionToken: string | null
  onSuccess: (userData: any) => void
}) {
  const [mode,      setMode]      = useState<"register" | "login">("register")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName,  setLastName]  = useState("")
  const [error,     setError]     = useState("")
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login"
    const payload = mode === "register"
      ? { email, password, first_name: firstName, last_name: lastName, session_token: sessionToken }
      : { email, password, session_token: sessionToken }

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || "Une erreur est survenue")
        setLoading(false)
        return
      }

      localStorage.setItem("rise_user_token", data.access_token)
      onSuccess(data.user)
    } catch {
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.navy, color: C.white, ...INTER }}>
      <header style={{ backgroundColor: C.navy, height: 72, borderBottom: `2px solid ${C.maize}`, display: "flex", alignItems: "center", padding: "0 24px" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ ...BEBAS, fontSize: 28, letterSpacing: 1, lineHeight: 1 }}>
            <span style={{ color: C.maize }}>RISE</span><span style={{ color: "#fff" }}>.MATCH</span>
          </div>
          <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>PORTAIL ATHLÈTE</div>
        </Link>
      </header>

      <main style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px" }}>
        {sessionToken && mode === "register" && (
          <div style={{ backgroundColor: "rgba(46, 204, 113, 0.1)", border: "1px solid #2ECC71", padding: 16, borderRadius: 8, marginBottom: 24, textAlign: "center" }}>
            <p style={{ margin: 0, color: "#2ECC71", fontSize: 14 }}>
              ✅ Tes résultats sont sauvegardés ! Crée ton compte pour les débloquer.
            </p>
          </div>
        )}

        <div style={{ backgroundColor: C.navyLight, border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 12, padding: 32 }}>
          <h1 style={{ ...BEBAS, fontSize: 32, margin: "0 0 24px", color: C.maize, textAlign: "center", letterSpacing: 1 }}>
            {mode === "login" ? "CONNEXION" : "CRÉER UN COMPTE"}
          </h1>

          {error && (
            <div style={{ backgroundColor: "rgba(231,76,60,0.1)", color: C.red, padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {mode === "register" && (
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: C.slate, marginBottom: 6, ...BEBAS, letterSpacing: 1 }}>PRÉNOM</label>
                  <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                    style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "12px", color: C.white, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, color: C.slate, marginBottom: 6, ...BEBAS, letterSpacing: 1 }}>NOM</label>
                  <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                    style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "12px", color: C.white, outline: "none" }} />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 12, color: C.slate, marginBottom: 6, ...BEBAS, letterSpacing: 1 }}>EMAIL</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "12px", color: C.white, outline: "none" }} />
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: 12, color: C.slate, marginBottom: 6, ...BEBAS, letterSpacing: 1 }}>MOT DE PASSE</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "12px", color: C.white, outline: "none" }} />
            </div>

            <button disabled={loading} style={{ backgroundColor: C.maize, color: C.navy, border: "none", borderRadius: 6, padding: "14px", ...BEBAS, fontSize: 18, letterSpacing: 1, cursor: loading ? "wait" : "pointer", marginTop: 8, opacity: loading ? 0.7 : 1 }}>
              {loading ? "CHARGEMENT..." : (mode === "login" ? "SE CONNECTER" : "DÉBLOQUER MES MATCHS →")}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError("") }}
              style={{ background: "none", border: "none", color: C.slate, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
              {mode === "login" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PARTIE 3 : ClientPortalInner (Anciennement ClientPortal)
// ─────────────────────────────────────────────────────────────

function ClientPortalInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionToken = searchParams.get('session')
  
  const [appState, setAppState]   = useState<"loading" | "auth" | "pending" | "dashboard">("loading")
  const [user, setUser]           = useState<any>(null)
  const [sessions, setSessions]   = useState<any[]>([])
  const [userToken, setUserToken] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [checklist, setChecklist] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"matches" | "messages" | "documents" | "parcours">("matches")

  useEffect(() => {
    const token = localStorage.getItem("rise_user_token")
    if (token) {
      loadUser(token)
    } else {
      setAppState("auth")
    }
  }, [])

  useEffect(() => {
    if (appState === "dashboard" && userToken) {
      fetch(`${API}/api/checklist`, { headers: { Authorization: `Bearer ${userToken}` } })
        .then(r => r.json())
        .then(setChecklist)
        .catch(() => {})
    }
  }, [appState, userToken])

  async function loadUser(token: string) {
    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        localStorage.removeItem("rise_user_token")
        setAppState("auth")
        return
      }
      const userData = await res.json()
      setUser(userData)
      setUserToken(token)

      if (!userData.is_active) {
        setAppState("pending")
        return
      }

      const [matchRes, unreadRes] = await Promise.all([
        fetch(`${API}/api/auth/my-matches`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const matchData = await matchRes.json()
      setSessions(matchData.sessions || [])
      if (unreadRes.ok) {
        const unreadData = await unreadRes.json()
        setUnreadCount(unreadData.count || 0)
      }
      setAppState("dashboard")
    } catch {
      setAppState("auth")
    }
  }

  function handleAuthSuccess(userData: any) {
    setUser(userData)
    if (userData.is_active) {
      loadUser(localStorage.getItem("rise_user_token")!)
    } else {
      setAppState("pending")
    }
  }

  function handleLogout() {
    localStorage.removeItem("rise_user_token")
    setUser(null)
    setSessions([])
    setAppState("auth")
  }

  if (appState === "loading") return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ ...BEBAS, fontSize: 18, color: C.slate, letterSpacing: 2 }}>CHARGEMENT...</span>
    </div>
  )

  if (appState === "auth") return (
    <AuthForm sessionToken={sessionToken as string | null} onSuccess={handleAuthSuccess} />
  )

  if (appState === "pending") return (
    <div style={{ minHeight: "100vh", background: C.navy, color: C.white, ...INTER }}>
      <header style={{ backgroundColor: C.navy, height: 72, borderBottom: `2px solid ${C.maize}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <div style={{ ...BEBAS, fontSize: 28, letterSpacing: 1, lineHeight: 1 }}>
          <span style={{ color: C.maize }}>RISE</span><span style={{ color: "#fff" }}>.MATCH</span>
        </div>
        <button onClick={handleLogout} style={{ background: "transparent", border: `1px solid ${C.slate}`, color: C.slate, padding: "6px 12px", borderRadius: 4, ...BEBAS, cursor: "pointer" }}>
          DÉCONNEXION
        </button>
      </header>
      <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h1 style={{ ...BEBAS, fontSize: 32, color: C.maize, letterSpacing: 1, marginBottom: 16 }}>COMPTE EN ATTENTE D'ACTIVATION</h1>
        <p style={{ color: C.slate, lineHeight: 1.6, marginBottom: 32 }}>
          Merci pour ton inscription {user?.first_name} !<br/><br/>
          L'accès complet à RISE.MATCH est actuellement réservé à nos athlètes accompagnés.
          Ton profil est en cours de révision par notre équipe.
        </p>
        <a href="https://riseathletics.fr/contact" target="_blank" rel="noopener noreferrer"
           style={{ display: "inline-block", backgroundColor: C.maize, color: C.navy, padding: "12px 24px", borderRadius: 6, ...BEBAS, fontSize: 18, textDecoration: "none", letterSpacing: 1 }}>
          CONTACTER RISE ATHLETICS →
        </a>
      </div>
    </div>
  )

  function goToNewSearch() {
    localStorage.setItem("rise_link_next_session", "true")
    router.push("/")
  }

  // ── Derived data ──
  const allPublishedMatches: any[] = sessions.flatMap(s => {
    if (Array.isArray(s.published_matches)) return s.published_matches
    if (typeof s.published_matches === "string") {
      try { return JSON.parse(s.published_matches) } catch { return [] }
    }
    return []
  })
  const topMatches = [...allPublishedMatches].sort((a, b) => b.score_total - a.score_total).slice(0, 3)
  const avgScore = allPublishedMatches.length > 0
    ? Math.round(allPublishedMatches.reduce((s, m) => s + (m.score_total || 0), 0) / allPublishedMatches.length)
    : 0
  const topDivision = topMatches[0]?.division ?? "—"
  const CIRC = 213.63

  const NAV = [
    { id: "matches"   as const, label: "TABLEAU DE BORD", icon: "◈" },
    { id: "messages"  as const, label: "MESSAGERIE",      icon: "✉" },
    { id: "documents" as const, label: "DOCUMENTS",       icon: "⊞" },
    { id: "parcours"  as const, label: "MON PARCOURS",    icon: "◎" },
  ]
  const userInitials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase()
  const sectionLabel = NAV.find(n => n.id === activeTab)?.label ?? "TABLEAU DE BORD"

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.navy, color: C.white, ...INTER, display: "flex" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 248, flexShrink: 0, backgroundColor: C.navyLight, borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <Link href="/" style={{ textDecoration: "none", display: "block", padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ ...BEBAS, fontSize: 26, letterSpacing: 1, lineHeight: 1 }}>
            <span style={{ color: C.maize }}>RISE</span><span style={{ color: "#fff" }}>.MATCH</span>
          </div>
          <div style={{ fontSize: 10, color: C.slate, marginTop: 3, letterSpacing: 2 }}>PORTAIL ATHLÈTE</div>
        </Link>

        <nav style={{ flex: 1, padding: "12px 0" }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{
                width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer",
                padding: "11px 20px", display: "flex", alignItems: "center", gap: 12,
                borderLeft: `3px solid ${activeTab === item.id ? C.maize : "transparent"}`,
                backgroundColor: activeTab === item.id ? "rgba(255,203,5,0.06)" : "transparent",
                color: activeTab === item.id ? C.white : C.slate,
                ...BEBAS, fontSize: 13, letterSpacing: 1,
                transition: "all 0.15s",
              }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
              {item.label}
              {item.id === "messages" && unreadCount > 0 && (
                <span style={{ marginLeft: "auto", backgroundColor: C.maize, color: C.navy, borderRadius: 999, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, padding: "0 5px" }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}

          <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.05)", margin: "12px 0" }} />

          <button onClick={() => router.push("/client/profile")}
            style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "11px 20px", display: "flex", alignItems: "center", gap: 12, borderLeft: "3px solid transparent", color: C.slate, ...BEBAS, fontSize: 13, letterSpacing: 1, transition: "color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.color = C.white}
            onMouseLeave={e => e.currentTarget.style.color = C.slate}>
            <span style={{ fontSize: 14 }}>◉</span>
            MON PROFIL
          </button>
        </nav>

        <button onClick={handleLogout}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10, color: C.slate, ...BEBAS, fontSize: 12, letterSpacing: 1, borderTop: "1px solid rgba(255,255,255,0.06)", transition: "color 0.15s", width: "100%", textAlign: "left" }}
          onMouseEnter={e => e.currentTarget.style.color = C.red}
          onMouseLeave={e => e.currentTarget.style.color = C.slate}>
          ✕ DÉCONNEXION
        </button>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

        {/* Topbar */}
        <header style={{ height: 64, backgroundColor: C.navyLight, borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", position: "sticky", top: 0, zIndex: 40, flexShrink: 0 }}>
          <span style={{ ...BEBAS, fontSize: 15, color: C.slate, letterSpacing: 2 }}>{sectionLabel}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ backgroundColor: "rgba(46,204,113,0.1)", color: C.green, padding: "3px 10px", borderRadius: 4, ...BEBAS, fontSize: 11, letterSpacing: 1 }}>ACTIF</span>
            <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: C.maize, display: "flex", alignItems: "center", justifyContent: "center", ...BEBAS, fontSize: 14, color: C.navy }}>
              {userInitials}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, padding: "28px 28px 64px", overflowX: "hidden" }}>

          {/* ── Tableau de bord ── */}
          {activeTab === "matches" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Welcome Hero */}
              <div style={{
                borderRadius: 16,
                background: `linear-gradient(135deg, ${C.navyMid} 0%, ${C.navyLight} 100%)`,
                border: "1px solid rgba(255,203,5,0.18)",
                boxShadow: "0 0 0 1px rgba(255,203,5,0.18), 0 18px 50px -20px rgba(255,203,5,0.35)",
                padding: "32px 36px",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 12px)", borderRadius: 16, pointerEvents: "none", opacity: 0.6 }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: C.green }} />
                    <span style={{ ...BEBAS, fontSize: 11, color: C.green, letterSpacing: 2 }}>PROFIL ACTIF</span>
                  </div>
                  <p style={{ ...BEBAS, fontSize: 13, color: C.slate, letterSpacing: 2, margin: "0 0 2px" }}>BIENVENUE,</p>
                  <h1 style={{ ...BEBAS, fontSize: 52, color: C.white, margin: "0 0 18px", lineHeight: 1, letterSpacing: 1 }}>
                    {(user?.first_name ?? "").toUpperCase()} {(user?.last_name ?? "").toUpperCase()}
                  </h1>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ backgroundColor: "rgba(255,203,5,0.12)", border: "1px solid rgba(255,203,5,0.25)", color: C.maize, padding: "4px 12px", borderRadius: 4, ...BEBAS, fontSize: 11, letterSpacing: 1 }}>
                      RISE PREMIUM
                    </span>
                    {sessions[0]?.times_input && (
                      <span style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: C.slateLight, padding: "4px 12px", borderRadius: 4, fontSize: 11 }}>
                        {sessions[0].times_input}
                      </span>
                    )}
                    <button onClick={goToNewSearch}
                      style={{ backgroundColor: C.maize, color: C.navy, border: "none", padding: "5px 14px", borderRadius: 4, ...BEBAS, fontSize: 11, letterSpacing: 1, cursor: "pointer" }}>
                      NOUVELLE RECHERCHE →
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {[
                  { label: "MATCHS PUBLIÉS",  value: String(allPublishedMatches.length), sub: null },
                  { label: "DIVISION CIBLE",  value: topDivision,                         sub: null },
                  { label: "SCORE MOYEN",      value: String(avgScore),                   sub: "/100" },
                  { label: "PARCOURS",         value: checklist ? `${checklist.done}/${checklist.total}` : "—", sub: null },
                ].map(stat => (
                  <div key={stat.label} style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px" }}>
                    <p style={{ ...BEBAS, fontSize: 10, color: C.slate, letterSpacing: 2, margin: "0 0 10px" }}>{stat.label}</p>
                    <div style={{ ...BEBAS, fontSize: 30, color: C.white, lineHeight: 1 }}>
                      {stat.value}
                      {stat.sub && <span style={{ fontSize: 13, color: C.slate }}>{stat.sub}</span>}
                    </div>
                    {checklist && stat.label === "PARCOURS" && (
                      <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: 10 }}>
                        <div style={{ height: "100%", width: `${checklist.progress_pct}%`, background: C.maize, borderRadius: 2 }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Top 3 Match Cards */}
              {topMatches.length > 0 ? (
                <div>
                  <p style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 3, margin: "0 0 14px" }}>TOP MATCHS</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                    {topMatches.map((match, idx) => {
                      const score = match.score_total ?? 0
                      const gaugeOffset = CIRC * (1 - score / 100)
                      const isNCAA = typeof match.team_id === "number"
                      const mInitials = (match.name ?? "?").split(/\s+/).map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase()
                      const sSport = match.score_sportif   != null ? Math.round(match.score_sportif   / 50 * 100) : null
                      const sAcad  = match.score_academique != null ? Math.round(match.score_academique / 25 * 100) : null
                      const sGeo   = match.score_geo        != null ? Math.round(match.score_geo        / 15 * 100) : null
                      const ribbonBg = idx === 0 ? C.maize : idx === 1 ? "rgba(138,155,176,0.3)" : "rgba(255,255,255,0.08)"
                      const ribbonColor = idx === 0 ? C.navy : C.white

                      return (
                        <div key={idx} style={{ backgroundColor: C.navyLight, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                          {/* Rank ribbon */}
                          <div style={{ backgroundColor: ribbonBg, padding: "7px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ ...BEBAS, fontSize: 12, color: ribbonColor, letterSpacing: 1 }}>#{idx + 1}</span>
                            {isNCAA && <span style={{ ...BEBAS, fontSize: 10, color: idx === 0 ? C.navyMid : C.slate, letterSpacing: 1 }}>NCAA 🇺🇸</span>}
                            {!isNCAA && <span style={{ ...BEBAS, fontSize: 10, color: C.slate, letterSpacing: 1 }}>CA 🇨🇦</span>}
                          </div>

                          {/* School + Gauge */}
                          <div style={{ padding: "18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                              <div style={{ width: 42, height: 42, borderRadius: "50%", backgroundColor: "rgba(255,203,5,0.1)", border: "1px solid rgba(255,203,5,0.2)", display: "flex", alignItems: "center", justifyContent: "center", ...BEBAS, fontSize: 15, color: C.maize, flexShrink: 0 }}>
                                {mInitials}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.white, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.name}</p>
                                <p style={{ margin: "3px 0 0", fontSize: 10, color: C.slate, ...MONO }}>{match.division} · {match.state}</p>
                              </div>
                            </div>

                            {/* SVG gauge */}
                            <div style={{ position: "relative", flexShrink: 0, width: 76, height: 76 }}>
                              <svg width="76" height="76" viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                                <circle cx="40" cy="40" r="34" fill="none"
                                  stroke={C.maize} strokeWidth="5" strokeLinecap="round"
                                  strokeDasharray={`${CIRC}`}
                                  strokeDashoffset={`${gaugeOffset}`}
                                  transform="rotate(-90 40 40)" />
                              </svg>
                              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                                <span style={{ ...BEBAS, fontSize: 19, color: C.white, lineHeight: 1 }}>{score}</span>
                                <span style={{ fontSize: 9, color: C.slate }}>/ 100</span>
                              </div>
                            </div>
                          </div>

                          {/* Sub-score bars */}
                          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
                            {([
                              { label: "SPORTIF",     pct: sSport },
                              { label: "ACADÉMIQUE",  pct: sAcad  },
                              { label: "GÉO",         pct: sGeo   },
                            ] as { label: string; pct: number | null }[]).filter(s => s.pct !== null).map(sub => (
                              <div key={sub.label}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                  <span style={{ fontSize: 9, color: C.slate, ...BEBAS, letterSpacing: 1 }}>{sub.label}</span>
                                  <span style={{ fontSize: 9, color: C.slateLight, ...MONO }}>{sub.pct}%</span>
                                </div>
                                <div style={{ height: 3, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                                  <div style={{ height: "100%", width: `${sub.pct}%`, backgroundColor: C.maize, borderRadius: 2, opacity: 0.75 }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* CTA */}
                          <div style={{ padding: "10px 16px 14px", marginTop: "auto" }}>
                            {isNCAA ? (
                              <button onClick={() => router.push(`/school/${match.team_id}`)}
                                style={{ width: "100%", backgroundColor: "rgba(255,203,5,0.08)", border: "1px solid rgba(255,203,5,0.2)", color: C.maize, padding: "9px", borderRadius: 8, ...BEBAS, fontSize: 12, cursor: "pointer", letterSpacing: 1, transition: "background 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,203,5,0.16)" }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,203,5,0.08)" }}>
                                VOIR LE PROFIL →
                              </button>
                            ) : (
                              <span style={{ ...BEBAS, fontSize: 10, color: C.slate, letterSpacing: 1 }}>Fiche détail non disponible (USports)</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: C.navyLight, borderRadius: 12, padding: 48, textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p style={{ color: C.slate, fontSize: 15, marginBottom: 24 }}>Aucun match n'a encore été publié sur ton profil.</p>
                  <button onClick={goToNewSearch} style={{ backgroundColor: "rgba(255,203,5,0.1)", color: C.maize, border: `1px solid ${C.maize}`, padding: "10px 20px", borderRadius: 6, ...BEBAS, fontSize: 16, cursor: "pointer", letterSpacing: 1 }}>
                    LANCER UNE NOUVELLE RECHERCHE
                  </button>
                </div>
              )}

              {/* Next Steps */}
              {checklist && Array.isArray(checklist.steps) && checklist.steps.filter((s: any) => !s.done).length > 0 && (
                <div>
                  <p style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 3, margin: "0 0 14px" }}>PROCHAINES ÉTAPES</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    {(checklist.steps as any[]).filter((s: any) => !s.done).slice(0, 4).map((step: any, i: number) => (
                      <div key={step.id} style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,203,5,0.3)", display: "flex", alignItems: "center", justifyContent: "center", ...BEBAS, fontSize: 13, color: C.maize, flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.label}</p>
                            <p style={{ margin: "3px 0 0", fontSize: 10, color: C.slate }}>{checklist.category_labels?.[step.category] || step.category}</p>
                          </div>
                        </div>
                        <span style={{ color: C.slate, fontSize: 14, marginLeft: 12, flexShrink: 0 }}>→</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── Messagerie ── */}
          {activeTab === "messages" && (
            <ChatWidget mode="athlete" userToken={userToken ?? undefined} />
          )}

          {/* ── Documents ── */}
          {activeTab === "documents" && (
            <DocumentsSection mode="athlete" userToken={userToken ?? undefined} />
          )}

          {/* ── Mon Parcours ── */}
          {activeTab === "parcours" && (
            checklist ? (
              <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: "20px 24px", maxWidth: 640 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ ...BEBAS, color: C.maize, fontSize: 12, letterSpacing: 2, margin: 0 }}>
                    {checklist.done}/{checklist.total} ÉTAPES COMPLÉTÉES
                  </p>
                  <span style={{ ...MONO, color: C.maize, fontSize: 14, fontWeight: 700 }}>
                    {checklist.progress_pct}%
                  </span>
                </div>

                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, marginBottom: 24, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${checklist.progress_pct}%`, background: `linear-gradient(90deg, ${C.maize}, ${C.maizeDark})`, borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>

                {(Object.entries(
                  (checklist.steps as any[]).reduce((acc: Record<string, any[]>, step: any) => {
                    if (!acc[step.category]) acc[step.category] = []
                    acc[step.category].push(step)
                    return acc
                  }, {})
                ) as [string, any[]][]).map(([cat, catSteps]) => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <p style={{ ...BEBAS, color: C.slate, fontSize: 11, letterSpacing: 2, margin: "0 0 8px" }}>
                      {checklist.category_labels[cat] || cat}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {catSteps.map((step: any) => (
                        <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, background: step.done ? "rgba(46,204,113,0.06)" : "rgba(255,255,255,0.02)" }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: step.done ? C.green : "transparent", border: `2px solid ${step.done ? C.green : "rgba(255,255,255,0.2)"}`, fontSize: 10, color: C.white }}>
                            {step.done && "✓"}
                          </div>
                          <span style={{ fontSize: 13, fontFamily: "Inter, sans-serif", color: step.done ? C.slateLight : C.slate, textDecoration: step.done ? "line-through" : "none" }}>
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <p style={{ color: C.slate, fontSize: 11, margin: "12px 0 0", fontStyle: "italic", fontFamily: "Inter, sans-serif" }}>
                  Les étapes sont validées par l'équipe RISE Athletics
                </p>
              </div>
            ) : (
              <p style={{ color: C.slate, fontSize: 14, fontStyle: "italic" }}>Chargement du parcours...</p>
            )
          )}

        </main>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PARTIE 4 : Suspense Boundary Wrapper (ClientPortal)
// ─────────────────────────────────────────────────────────────

export default function ClientPortal() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#0B1628',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, 
          color: '#8A9BB0', letterSpacing: 2 }}>
          CHARGEMENT...
        </span>
      </div>
    }>
      <ClientPortalInner />
    </Suspense>
  )
}