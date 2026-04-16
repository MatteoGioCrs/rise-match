"use client"

import { useState, useEffect } from "react"
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
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")

  async function handleSubmit() {
    setLoading(true)
    setError("")
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login"
      const body = mode === "register"
        ? { email, password, first_name: firstName, last_name: lastName, session_token: sessionToken }
        : { email, password }

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || "Erreur"); return }
      localStorage.setItem("rise_user_token", data.token)
      onSuccess(data)
    } catch {
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "11px 14px",
    color: C.white, fontSize: 14, outline: "none",
    ...INTER,
  }

  return (
    <div style={{ minHeight: "100vh", background: C.navy, ...INTER, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ ...BEBAS, fontSize: 26, color: C.maize }}>RISE</span>
            <span style={{ ...BEBAS, fontSize: 26, color: C.white }}>.MATCH</span>
          </Link>
        </div>

        {sessionToken && (
          <div style={{ background: "rgba(255,203,5,0.07)", border: "1px solid rgba(255,203,5,0.25)", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <div>
              <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 1, margin: "0 0 3px" }}>
                TA RECHERCHE EST SAUVEGARDÉE
              </p>
              <p style={{ color: C.slateLight, fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                {mode === "register"
                  ? "Crée ton compte pour débloquer ta liste complète."
                  : "Connecte-toi pour retrouver tes résultats."}
              </p>
            </div>
          </div>
        )}

        <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 16, padding: 28 }}>

          {/* Toggle register / login */}
          <div style={{ display: "flex", marginBottom: 24, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3 }}>
            {(["register", "login"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: "8px 0", border: "none", borderRadius: 6,
                cursor: "pointer", transition: "all 0.2s",
                background: mode === m ? C.maize : "transparent",
                color: mode === m ? C.navy : C.slate,
                ...BEBAS, fontSize: 13, letterSpacing: 1,
              }}>
                {m === "register" ? "CRÉER UN COMPTE" : "SE CONNECTER"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {mode === "register" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "PRÉNOM", val: firstName, set: setFirstName, ph: "Lucas" },
                  { label: "NOM",    val: lastName,  set: setLastName,  ph: "Martin" },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 2, display: "block", marginBottom: 5 }}>
                      {f.label}
                    </label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} style={inputStyle} />
                  </div>
                ))}
              </div>
            )}

            {[
              { label: "EMAIL",         val: email,    set: setEmail,    type: "email",    ph: "ton@email.com" },
              { label: "MOT DE PASSE",  val: password, set: setPassword, type: "password", ph: "••••••••" },
            ].map(f => (
              <div key={f.label}>
                <label style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 2, display: "block", marginBottom: 5 }}>
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder={f.ph}
                  style={inputStyle}
                />
              </div>
            ))}

            {error && <p style={{ color: C.red, fontSize: 13, margin: 0 }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !email || !password}
              style={{
                width: "100%", padding: "13px 0",
                background: (!email || !password || loading) ? "rgba(255,203,5,0.4)" : C.maize,
                color: C.navy, border: "none", borderRadius: 8,
                ...BEBAS, fontSize: 17, letterSpacing: 1,
                cursor: (!email || !password || loading) ? "not-allowed" : "pointer",
                marginTop: 4,
              }}
            >
              {loading ? "CHARGEMENT..."
                : mode === "register" ? "CRÉER MON COMPTE →"
                : "SE CONNECTER →"}
            </button>
          </div>
        </div>

        {mode === "register" && (
          <p style={{ color: C.slate, fontSize: 11, textAlign: "center", marginTop: 14, lineHeight: 1.6, ...INTER }}>
            En créant un compte, tu acceptes d'être contacté par RISE Athletics.
          </p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PARTIE 3 : PendingView
// ─────────────────────────────────────────────────────────────

function PendingView({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div style={{ minHeight: "100vh", background: C.navy, ...INTER, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>

        <div style={{ marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ ...BEBAS, fontSize: 26, color: C.maize }}>RISE</span>
            <span style={{ ...BEBAS, fontSize: 26, color: C.white }}>.MATCH</span>
          </Link>
        </div>

        <div style={{ fontSize: 56, marginBottom: 20 }}>⏳</div>

        <h1 style={{ ...BEBAS, fontSize: 34, color: C.white, letterSpacing: 1, margin: "0 0 12px" }}>
          DOSSIER EN COURS DE VALIDATION
        </h1>
        <p style={{ color: C.slateLight, fontSize: 15, lineHeight: 1.7, maxWidth: 400, margin: "0 auto 28px" }}>
          Bonjour {user.first_name || user.email.split("@")[0]} 👋
          <br />
          Ton compte a été créé. L'équipe RISE va examiner ton profil
          et te contacter dans les{" "}
          <strong style={{ color: C.maize }}>24 heures</strong>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto 28px", textAlign: "left" }}>
          {[
            { label: "Compte créé",                                    done: true },
            { label: "Examen du profil par RISE Athletics",            done: false },
            { label: "Accès activé — liste complète débloquée",        done: false },
          ].map(({ label, done }, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: done ? C.maize : "rgba(255,255,255,0.07)",
                border: `2px solid ${done ? C.maize : "rgba(255,255,255,0.12)"}`,
                ...BEBAS, fontSize: 12,
                color: done ? C.navy : C.slate,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ color: done ? C.white : C.slate, fontSize: 14 }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)", borderRadius: 12, padding: "16px 20px", maxWidth: 380, margin: "0 auto 20px", textAlign: "left" }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 12, letterSpacing: 2, margin: "0 0 10px" }}>
            COMMENT ÇA MARCHE ?
          </p>
          <p style={{ color: C.slateLight, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            L'équipe RISE te contacte pour présenter les formules disponibles.
            Une fois le virement reçu, ton accès complet est activé sous 2h.
          </p>
        </div>

        <a href="mailto:contact@riseathletics.fr" style={{ display: "inline-block", marginBottom: 20, color: C.maize, fontSize: 13, textDecoration: "none" }}>
          📧 contact@riseathletics.fr
        </a>

        <br />
        <button onClick={onLogout} style={{ background: "transparent", border: "none", color: C.slate, fontSize: 12, cursor: "pointer", textDecoration: "underline", ...INTER }}>
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PARTIE 4 : DashboardView
// ─────────────────────────────────────────────────────────────

function DashboardView({
  user,
  sessions,
  onLogout,
}: {
  user: any
  sessions: any[]
  onLogout: () => void
}) {
  const router = useRouter()
  const [activeSession, setActiveSession] = useState(sessions[0] || null)

  const rawMatches = activeSession?.published_matches
  const matches = rawMatches
    ? (typeof rawMatches === "string" ? JSON.parse(rawMatches) : rawMatches)
    : null

  const STATUS_PIPELINE = [
    { key: "nouveau",     label: "Nouveau" },
    { key: "prospect",    label: "Dossier ouvert" },
    { key: "accompagné",  label: "Matchs validés" },
    { key: "signé",       label: "Offre reçue" },
  ]
  const currentStatusIdx = STATUS_PIPELINE.findIndex(s => s.key === activeSession?.admin_status)

  return (
    <div style={{ minHeight: "100vh", background: C.navy, ...INTER }}>

      {/* Header */}
      <div style={{ background: C.navyLight, borderBottom: `2px solid ${C.maize}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ ...BEBAS, fontSize: 22, color: C.maize }}>RISE</span>
            <span style={{ ...BEBAS, fontSize: 22, color: C.white }}>.MATCH</span>
          </Link>
          <span style={{ color: C.slate, fontSize: 12 }}>|</span>
          <span style={{ color: C.slateLight, fontSize: 13 }}>
            {user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.email}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{
            ...BEBAS, fontSize: 11, letterSpacing: 1,
            padding: "3px 10px", borderRadius: 20,
            background: user.plan === "accompagne" ? "rgba(155,89,182,0.2)" : "rgba(255,203,5,0.1)",
            color: user.plan === "accompagne" ? "#b39ddb" : C.maize,
            border: `1px solid ${user.plan === "accompagne" ? "#9b59b6" : C.maize}`,
          }}>
            {user.plan === "accompagne" ? "ACCOMPAGNÉ" : "MATCH"}
          </span>
          <button onClick={onLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: C.slate, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, ...INTER }}>
            Déconnexion
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>

        {/* Pipeline statut */}
        {activeSession && (
          <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)", borderRadius: 12, padding: "14px 20px", marginBottom: 20 }}>
            <p style={{ ...BEBAS, color: C.maize, fontSize: 11, letterSpacing: 2, margin: "0 0 10px" }}>
              STATUT DE TON DOSSIER
            </p>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {STATUS_PIPELINE.map(({ key, label }, i) => {
                const isDone = i <= currentStatusIdx
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "3px 10px", borderRadius: 20,
                      background: isDone ? "rgba(255,203,5,0.1)" : "transparent",
                      border: `1px solid ${isDone ? C.maize : "rgba(255,255,255,0.1)"}`,
                    }}>
                      <span style={{ fontSize: 10 }}>{isDone ? "✓" : "○"}</span>
                      <span style={{ ...BEBAS, fontSize: 11, letterSpacing: 1, color: isDone ? C.maize : C.slate }}>
                        {label}
                      </span>
                    </div>
                    {i < STATUS_PIPELINE.length - 1 && (
                      <span style={{ color: isDone ? C.maize : C.slate, fontSize: 14 }}>→</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Note équipe RISE */}
        {activeSession?.admin_notes && (
          <div style={{ background: "rgba(255,203,5,0.04)", border: "1px solid rgba(255,203,5,0.2)", borderLeft: `4px solid ${C.maize}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
            <p style={{ ...BEBAS, color: C.maize, fontSize: 11, letterSpacing: 2, margin: "0 0 8px" }}>
              📋 MESSAGE DE L'ÉQUIPE RISE
            </p>
            <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              {activeSession.admin_notes}
            </p>
          </div>
        )}

        {/* Onglets si plusieurs sessions */}
        {sessions.length > 1 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {sessions.map((s, i) => (
              <button
                key={s.session_token}
                onClick={() => setActiveSession(s)}
                style={{
                  padding: "6px 14px", borderRadius: 6, border: "1px solid", cursor: "pointer",
                  ...BEBAS, fontSize: 12, letterSpacing: 1,
                  background: activeSession?.session_token === s.session_token ? C.maize : "transparent",
                  color: activeSession?.session_token === s.session_token ? C.navy : C.slate,
                  borderColor: activeSession?.session_token === s.session_token ? C.maize : "rgba(255,255,255,0.12)",
                }}
              >
                RECHERCHE #{i + 1} · {new Date(s.created_at).toLocaleDateString("fr-FR")}
              </button>
            ))}
          </div>
        )}

        {/* Matchs */}
        {matches === null ? (
          <div style={{ background: C.navyLight, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "44px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔬</div>
            <h2 style={{ ...BEBAS, color: C.white, fontSize: 26, letterSpacing: 1, margin: "0 0 10px" }}>
              ANALYSE EN COURS
            </h2>
            <p style={{ color: C.slateLight, fontSize: 14, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 20px" }}>
              L'équipe RISE prépare ta liste personnalisée.
              Tu seras notifié dès qu'elle est prête.
            </p>
            <a href="mailto:contact@riseathletics.fr" style={{ color: C.maize, fontSize: 13, textDecoration: "none" }}>
              📧 contact@riseathletics.fr
            </a>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <h2 style={{ ...BEBAS, fontSize: 28, color: C.white, letterSpacing: 1, margin: 0 }}>
                TES {matches.length} MATCHS VALIDÉS
              </h2>
              <span style={{ color: C.slate, fontSize: 11, ...INTER }}>Sélection RISE Athletics</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {matches.map((match: any, i: number) => {
                const domain = match.academic?.website
                  ? match.academic.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
                  : null

                return (
                  <div
                    key={match.team_id ?? i}
                    onClick={() => router.push(`/school/${match.team_id}`)}
                    style={{
                      background: C.navyLight,
                      borderLeft: `4px solid ${C.maize}`,
                      borderRadius: 10, padding: "14px 18px",
                      cursor: "pointer", transition: "transform 0.15s",
                      display: "grid",
                      gridTemplateColumns: "36px 32px 1fr auto",
                      gap: 12, alignItems: "center",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    <span style={{ ...BEBAS, fontSize: 24, color: C.maize }}>#{i + 1}</span>

                    {domain ? (
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                        width={28} height={28}
                        style={{ borderRadius: 5, objectFit: "contain" }}
                        onError={e => { e.currentTarget.style.display = "none" }}
                        alt=""
                      />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 5, background: C.navyMid, display: "flex", alignItems: "center", justifyContent: "center", ...BEBAS, fontSize: 13, color: C.maize }}>
                        {match.name?.[0]}
                      </div>
                    )}

                    <div>
                      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 10, fontWeight: 700, background: match.country === "CA" ? "#c0392b" : C.navyMid, color: "white" }}>
                          {match.country}
                        </span>
                        <span style={{ color: C.white, fontWeight: 600, fontSize: 14 }}>{match.name}</span>
                      </div>
                      <p style={{ color: C.slate, fontSize: 11, margin: "3px 0 0", ...MONO }}>
                        {match.division} · {match.state}
                        {match.rang_estime && ` · Rang estimé #${match.rang_estime}`}
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ ...BEBAS, fontSize: 22, color: C.maize }}>
                        {match.score_total ?? "—"}/100
                      </div>
                      <div style={{ color: C.slate, fontSize: 11, ...MONO }}>
                        🏊{match.score_sportif ?? "—"} 🎓{match.score_academique ?? "—"}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ textAlign: "center", marginTop: 32, padding: 20, background: C.navyLight, borderRadius: 12, border: "1px solid rgba(255,203,5,0.08)" }}>
              <p style={{ color: C.slateLight, fontSize: 13, marginBottom: 14 }}>
                Tes temps ont évolué ? Lance une nouvelle recherche.
              </p>
              <Link href="/" style={{ display: "inline-block", background: "transparent", border: `1px solid ${C.maize}`, color: C.maize, padding: "9px 22px", borderRadius: 8, ...BEBAS, fontSize: 15, letterSpacing: 1, textDecoration: "none" }}>
                ↩ NOUVELLE RECHERCHE
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PARTIE 5 : ClientPage (orchestrateur)
// ─────────────────────────────────────────────────────────────

export default function ClientPage() {
  const searchParams  = useSearchParams()
  const sessionToken  = searchParams.get("session")

  const [appState, setAppState] = useState<"loading" | "auth" | "pending" | "dashboard">("loading")
  const [user,     setUser]     = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    const storedToken = localStorage.getItem("rise_user_token")
    if (storedToken) {
      loadUser(storedToken)
    } else {
      setAppState("auth")
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    <AuthForm sessionToken={sessionToken} onSuccess={handleAuthSuccess} />
  )

  if (appState === "pending") return (
    <PendingView user={user!} onLogout={handleLogout} />
  )

  return (
    <DashboardView user={user!} sessions={sessions} onLogout={handleLogout} />
  )
}
