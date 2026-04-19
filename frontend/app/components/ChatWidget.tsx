"use client"

import { useState, useEffect, useRef, useCallback } from "react"

const API = "https://rise-match-production.up.railway.app"

interface Message {
  id: number
  sender: "admin" | "athlete"
  sender_name: string | null
  content: string
  is_read: boolean
  created_at: string
  session_id: number | null
}

interface ChatWidgetProps {
  mode: "athlete" | "admin"
  userId?: number
  userToken?: string
  adminToken?: string
  userName?: string
}

const C = {
  navy:      "#0B1628",
  navyLight: "#152236",
  navyMid:   "#1E3A5F",
  maize:     "#FFCB05",
  white:     "#FFFFFF",
  slate:     "#8A9BB0",
}
const BEBAS: React.CSSProperties = { fontFamily: "Bebas Neue, sans-serif" }
const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" }

export default function ChatWidget({ mode, userId, userToken, adminToken, userName }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState("")
  const [sending, setSending]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  const fetchMessages = useCallback(async () => {
    if (mode === "admin" && !userId) return
    if (mode === "athlete" && !userToken) return

    const url = mode === "athlete"
      ? `${API}/api/messages`
      : `${API}/api/admin/messages/${userId}`

    const headers: Record<string, string> = mode === "athlete"
      ? { Authorization: `Bearer ${userToken}` }
      : { "x-admin-token": adminToken ?? "" }

    try {
      const res = await fetch(url, { headers })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
    } catch { /* ignore */ }
  }, [mode, userId, userToken, adminToken])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchMessages()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage() {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)

    const url = mode === "athlete"
      ? `${API}/api/messages`
      : `${API}/api/admin/messages/${userId}`

    const headers: Record<string, string> = mode === "athlete"
      ? { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` }
      : { "Content-Type": "application/json", "x-admin-token": adminToken ?? "" }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ content }),
      })
      if (!res.ok) return
      setInput("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
      await fetchMessages()
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    })
  }

  return (
    <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, overflow: "hidden", ...INTER }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>💬</span>
        <span style={{ ...BEBAS, fontSize: 18, color: C.maize, letterSpacing: 2 }}>MESSAGES</span>
        {userName && (
          <span style={{ color: C.slate, fontSize: 13 }}>— {userName}</span>
        )}
        {mode === "admin" && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.slate, fontStyle: "italic" }}>
            Équipe RISE → Athlète
          </span>
        )}
      </div>

      {/* Messages list */}
      <div style={{ minHeight: 200, maxHeight: 400, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.length === 0 ? (
          <p style={{ color: C.slate, fontSize: 14, textAlign: "center", margin: "auto", fontStyle: "italic" }}>
            Aucun message pour l'instant.
          </p>
        ) : (
          messages.map(msg => {
            const isAdmin = msg.sender === "admin"
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isAdmin ? "flex-start" : "flex-end" }}>
                <div style={{
                  maxWidth: "78%",
                  background: isAdmin ? "rgba(255,203,5,0.08)" : "rgba(255,255,255,0.05)",
                  borderLeft:  isAdmin ? `3px solid ${C.maize}` : "none",
                  borderRight: isAdmin ? "none" : `3px solid ${C.slate}`,
                  borderRadius: isAdmin ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                  padding: "10px 14px",
                }}>
                  <p style={{ margin: 0, color: C.white, fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {msg.content}
                  </p>
                </div>
                <span style={{ color: C.slate, fontSize: 11, marginTop: 4, paddingLeft: isAdmin ? 3 : 0, paddingRight: isAdmin ? 0 : 3 }}>
                  {msg.sender_name || (isAdmin ? "Équipe RISE" : "Vous")} · {formatDate(msg.created_at)}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Votre message… (Entrée pour envoyer, Maj+Entrée pour sauter une ligne)"
          rows={1}
          style={{
            flex: 1, resize: "none", overflow: "hidden",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "10px 14px",
            color: C.white, fontSize: 14, lineHeight: 1.5,
            outline: "none", ...INTER,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          style={{
            background: input.trim() && !sending ? C.maize : "rgba(255,203,5,0.2)",
            color: C.navy, border: "none", borderRadius: 8,
            width: 42, height: 42, flexShrink: 0,
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
        >
          {sending ? "…" : "→"}
        </button>
      </div>
    </div>
  )
}
