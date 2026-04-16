"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

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
  
  const [appState, setAppState] = useState<"loading" | "auth" | "pending" | "dashboard">("loading")
  const [user, setUser] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    const token = localStorage.getItem("rise_user_token")
    if (token) {
      loadUser(token)
    } else {
      setAppState("auth")
    }
  }, [])

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

      if (!userData.is_active) {
        setAppState("pending")
        return
      }

      const matchRes = await fetch(`${API}/api/auth/my-matches`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const matchData = await matchRes.json()
      setSessions(matchData.sessions || [])
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.navy, color: C.white, ...INTER }}>
      <header style={{ backgroundColor: C.navyLight, height: 72, borderBottom: `1px solid rgba(255,255,255,0.1)`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ ...BEBAS, fontSize: 28, letterSpacing: 1, lineHeight: 1 }}>
              <span style={{ color: C.maize }}>RISE</span><span style={{ color: "#fff" }}>.MATCH</span>
            </div>
          </Link>
          <span style={{ color: C.slate, fontSize: 14 }}>|</span>
          <span style={{ ...BEBAS, fontSize: 18, color: C.white, letterSpacing: 1 }}>DASHBOARD ATHLÈTE</span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={handleLogout} style={{ backgroundColor: "rgba(231,76,60,0.1)", border: `1px solid ${C.red}`, color: C.red, padding: "8px 16px", borderRadius: 6, ...BEBAS, letterSpacing: 1, cursor: "pointer" }}>
            DÉCONNEXION
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ ...BEBAS, fontSize: 40, color: C.white, margin: "0 0 8px", letterSpacing: 1 }}>BIENVENUE, {user?.first_name?.toUpperCase()}</h1>
            <p style={{ color: C.slate, margin: 0, fontSize: 14 }}>Voici tes listes de matchs validées par l'équipe.</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ ...BEBAS, fontSize: 14, color: C.slate, letterSpacing: 1, display: "block" }}>STATUT DU COMPTE</span>
            <span style={{ backgroundColor: "rgba(46,204,113,0.1)", color: C.green, padding: "4px 10px", borderRadius: 4, ...BEBAS, fontSize: 16, letterSpacing: 1 }}>ACTIF</span>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div style={{ backgroundColor: C.navyLight, borderRadius: 12, padding: 48, textAlign: "center", border: `1px solid rgba(255,255,255,0.05)` }}>
            <p style={{ color: C.slate, fontSize: 15, marginBottom: 24 }}>Aucun match n'a encore été publié sur ton profil.</p>
            <button onClick={goToNewSearch} style={{ backgroundColor: "rgba(255,203,5,0.1)", color: C.maize, border: `1px solid ${C.maize}`, padding: "10px 20px", borderRadius: 6, ...BEBAS, fontSize: 16, cursor: "pointer", letterSpacing: 1 }}>
              LANCER UNE NOUVELLE RECHERCHE
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {sessions.map((session, i) => (
              <div key={i} style={{ backgroundColor: C.navyLight, borderRadius: 12, border: `1px solid rgba(255,255,255,0.05)`, overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: `1px solid rgba(255,255,255,0.05)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ ...BEBAS, fontSize: 20, color: C.maize, margin: 0, letterSpacing: 1 }}>{session.label}</h2>
                  <span style={{ fontSize: 12, color: C.slate }}>Publié le {new Date(session.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
                
                <div style={{ padding: 24 }}>
                  {session.published_matches ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {session.published_matches.map((match: any, idx: number) => (
                        <div key={idx} style={{ backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid rgba(255,255,255,0.02)` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <span style={{ ...BEBAS, fontSize: 24, color: C.slate }}>#{idx + 1}</span>
                            <div>
                              <h3 style={{ margin: "0 0 4px", fontSize: 16, color: C.white, fontWeight: 600 }}>{match.name}</h3>
                              <div style={{ fontSize: 12, color: C.slate, ...MONO }}>{match.division} · {match.state}</div>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>TOTAL</div>
                              <div style={{ ...BEBAS, fontSize: 24, color: C.maize, lineHeight: 1 }}>{match.score_total}/100</div>
                            </div>
                            <button onClick={() => router.push(`/school/${match.team_id}`)} style={{ backgroundColor: "transparent", border: `1px solid ${C.slate}`, color: C.white, padding: "8px 16px", borderRadius: 6, ...BEBAS, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = C.maize; e.currentTarget.style.color = C.maize }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = C.slate; e.currentTarget.style.color = C.white }}>
                              DÉTAILS →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: C.slate, fontSize: 14, margin: 0, fontStyle: "italic" }}>Les résultats de cette session sont en cours d'analyse.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
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