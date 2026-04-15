"use client"

import { useState, useEffect } from "react"

const API = "https://rise-match-production.up.railway.app"

const BEBAS = { fontFamily: "'Bebas Neue', sans-serif" } as const
const C = { navy: "#0B1628", navyLight: "#152236", maize: "#FFCB05", slate: "#8A9BB0" }

export default function AdminPage() {
  const [state,    setState]    = useState<"login" | "dashboard">("login")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("rise_admin_token")
    if (stored) verifyToken(stored)
  }, [])

  async function verifyToken(t: string) {
    try {
      const res = await fetch(`${API}/api/admin/verify?token=${t}`)
      if (res.ok) { setState("dashboard") }
      else { localStorage.removeItem("rise_admin_token") }
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

  return (
    <div style={{ minHeight: "100vh", background: C.navy, padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <p style={{ ...BEBAS, fontSize: 12, color: C.maize, letterSpacing: 3 }}>RISE.MATCH</p>
          <h1 style={{ ...BEBAS, fontSize: 40, color: "#fff", margin: 0 }}>ADMIN PORTAL</h1>
        </div>
        <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: C.slate, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: "Inter", fontSize: 13 }}>
          Déconnexion
        </button>
      </div>
      <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, padding: 32, textAlign: "center", color: C.slate, fontFamily: "Inter" }}>
        Dashboard en construction — token valide ✓
      </div>
    </div>
  )
}
