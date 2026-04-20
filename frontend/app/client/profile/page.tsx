"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const API = "https://rise-match-production.up.railway.app"

const C = {
  navy:       "#0B1628",
  navyLight:  "#152236",
  maize:      "#FFCB05",
  white:      "#FFFFFF",
  slate:      "#8A9BB0",
  slateLight: "#B8C8D8",
  green:      "#2ECC71",
}

const BEBAS: React.CSSProperties = { fontFamily: "Bebas Neue, sans-serif" }
const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" }

const FIELDS_CONFIG = [
  {
    section: "🏊 PROFIL SPORTIF",
    fields: [
      { key: "club_name",   label: "Club de natation",          type: "text",  placeholder: "CN Marseille, Racing Club de France..." },
      { key: "coach_name",  label: "Nom de ton entraîneur",     type: "text",  placeholder: "Prénom Nom" },
      { key: "coach_email", label: "Email de ton entraîneur",   type: "email", placeholder: "coach@club.fr" },
    ],
  },
  {
    section: "📅 PROJET",
    fields: [
      { key: "departure_year", label: "Année de départ souhaitée", type: "select",
        options: ["2025", "2026", "2027", "2028", "2029"] },
      { key: "objective", label: "Objectif principal", type: "select",
        options: [
          "Bourse complète (sport + études)",
          "Bourse partielle acceptée",
          "Partir aux USA avant tout",
          "Explorer les options",
        ] },
      { key: "budget_range", label: "Budget annuel max (scolarité)", type: "select",
        options: ["< $20,000", "< $35,000", "< $50,000", "Pas de limite"] },
    ],
  },
  {
    section: "🎓 ACADÉMIQUE",
    fields: [
      { key: "current_level", label: "Niveau scolaire actuel", type: "select",
        options: ["Collège (3e)", "Lycée (2de)", "Lycée (1ère)", "Terminale", "Post-bac / Prépa", "Licence", "Master"] },
      { key: "english_level", label: "Niveau d'anglais", type: "select",
        options: ["Débutant", "Intermédiaire", "B2", "C1", "Courant", "Natif"] },
      { key: "toefl_score", label: "Score TOEFL (si passé)", type: "number", placeholder: "Ex: 85" },
    ],
  },
  {
    section: "📝 NOTES PERSONNELLES",
    fields: [
      { key: "notes_perso", label: "Informations complémentaires", type: "textarea",
        placeholder: "Préférences de région, sports pratiqués en parallèle, situation particulière..." },
    ],
  },
]

export default function ProfilePage() {
  const router = useRouter()
  const [user,    setUser]    = useState<any>(null)
  const [profile, setProfile] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("rise_user_token")
    if (!token) { router.push("/client"); return }

    Promise.all([
      fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/profile`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : {}),
    ]).then(([userData, profileData]) => {
      if (!userData) { router.push("/client"); return }
      setUser(userData)
      setProfile(profileData || {})
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setSaving(true)
    const token = localStorage.getItem("rise_user_token")
    await fetch(`${API}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "10px 14px",
    color: C.white, fontSize: 14, outline: "none", ...INTER,
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ ...BEBAS, fontSize: 18, color: C.slate, letterSpacing: 2 }}>CHARGEMENT...</span>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.navy, color: C.white, ...INTER }}>

      {/* Header */}
      <header style={{
        background: C.navyLight, borderBottom: `2px solid ${C.maize}`,
        height: 60, padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/client" style={{ textDecoration: "none" }}>
            <span style={{ ...BEBAS, fontSize: 22, color: C.maize }}>RISE</span>
            <span style={{ ...BEBAS, fontSize: 22, color: C.white }}>.MATCH</span>
          </Link>
          <span style={{ color: C.slate }}>|</span>
          <span style={{ color: C.slateLight, fontSize: 13 }}>
            {user?.first_name} {user?.last_name}
          </span>
        </div>
        <Link
          href="/client"
          style={{ color: C.maize, fontSize: 12, textDecoration: "none", ...BEBAS, letterSpacing: 1 }}
        >
          ← RETOUR AU TABLEAU DE BORD
        </Link>
      </header>

      <main style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ ...BEBAS, color: C.maize, fontSize: 12, letterSpacing: 3, margin: "0 0 4px" }}>RISE.MATCH</p>
          <h1 style={{ ...BEBAS, fontSize: 36, color: C.white, margin: "0 0 8px" }}>MON PROFIL</h1>
          <p style={{ color: C.slate, fontSize: 13, margin: 0 }}>
            Ces informations nous permettent de mieux personnaliser ton accompagnement.
            Elles ne sont visibles que par l'équipe RISE.
          </p>
        </div>

        {FIELDS_CONFIG.map(section => (
          <div key={section.section} style={{
            background: C.navyLight, border: "1px solid rgba(255,203,5,0.12)",
            borderRadius: 12, padding: "20px 24px", marginBottom: 20,
          }}>
            <p style={{ ...BEBAS, color: C.maize, fontSize: 13, letterSpacing: 2, margin: "0 0 16px" }}>
              {section.section}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {section.fields.map(field => (
                <div key={field.key}>
                  <label style={{ ...BEBAS, fontSize: 11, color: C.slate, letterSpacing: 2, display: "block", marginBottom: 6 }}>
                    {field.label}
                  </label>

                  {field.type === "select" ? (
                    <select
                      value={profile[field.key] ?? ""}
                      onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="">— Sélectionner —</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={profile[field.key] ?? ""}
                      onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={4}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={profile[field.key] ?? ""}
                      onChange={e => setProfile(p => ({
                        ...p,
                        [field.key]: field.type === "number" ? (parseInt(e.target.value) || "") : e.target.value,
                      }))}
                      placeholder={field.placeholder}
                      style={inputStyle}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 48 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: C.maize, color: C.navy, border: "none",
              borderRadius: 8, padding: "13px 32px",
              ...BEBAS, fontSize: 16, letterSpacing: 1,
              cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "SAUVEGARDE..." : "SAUVEGARDER MON PROFIL →"}
          </button>
          {saved && <span style={{ color: C.green, fontSize: 14, ...INTER }}>✓ Profil mis à jour</span>}
        </div>
      </main>
    </div>
  )
}
