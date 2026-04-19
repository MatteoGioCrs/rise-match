"use client"

import { useState, useEffect, useRef, useCallback } from "react"

const API = "https://rise-match-production.up.railway.app"

interface Document {
  id: number
  file_name: string
  file_url: string
  file_type: "pdf" | "image" | "other"
  file_size: number | null
  label: string | null
  uploaded_by: "admin" | "athlete"
  created_at: string
}

interface DocumentsSectionProps {
  mode: "athlete" | "admin"
  userToken?: string
  adminToken?: string
  userId?: number
}

const C = {
  navy:      "#0B1628",
  navyLight: "#152236",
  maize:     "#FFCB05",
  white:     "#FFFFFF",
  slate:     "#8A9BB0",
  green:     "#2ECC71",
  red:       "#E74C3C",
}
const BEBAS: React.CSSProperties = { fontFamily: "Bebas Neue, sans-serif" }
const INTER: React.CSSProperties = { fontFamily: "Inter, sans-serif" }

function formatBytes(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  })
}

function fileIcon(type: string): string {
  return type === "pdf" ? "📄" : "🖼️"
}

export default function DocumentsSection({ mode, userToken, adminToken, userId }: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [label, setLabel]         = useState("")
  const [error, setError]         = useState("")
  const [success, setSuccess]     = useState("")
  const inputRef                  = useRef<HTMLInputElement>(null)

  const docsUrl = mode === "athlete"
    ? `${API}/api/documents`
    : `${API}/api/admin/documents/${userId}`

  const uploadUrl = mode === "athlete"
    ? `${API}/api/documents/upload`
    : `${API}/api/admin/documents/${userId}/upload`

  const fetchDocuments = useCallback(async () => {
    if (mode === "admin" && !userId) return
    if (mode === "athlete" && !userToken) return
    try {
      const headers: Record<string, string> = mode === "athlete"
        ? { Authorization: `Bearer ${userToken}` }
        : { "x-admin-token": adminToken ?? "" }
      const res = await fetch(docsUrl, { headers })
      if (!res.ok) return
      const data = await res.json()
      setDocuments(data.documents ?? [])
    } catch { /* ignore */ }
  }, [docsUrl, mode, userToken, adminToken, userId])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  function validateFile(file: File): string | null {
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if (!allowed.includes(file.type)) return "Type non autorisé. Formats acceptés : PDF, JPG, PNG"
    if (file.size > 10 * 1024 * 1024) return "Fichier trop lourd (max 10 MB)"
    return null
  }

  function handleUpload(file: File) {
    setError("")
    setSuccess("")
    const validationError = validateFile(file)
    if (validationError) { setError(validationError); return }

    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("label", label)

    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = async () => {
      setUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        setLabel("")
        setSuccess("Fichier uploadé avec succès !")
        setTimeout(() => setSuccess(""), 3500)
        await fetchDocuments()
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          setError(err.detail || "Erreur lors de l'upload")
        } catch {
          setError("Erreur lors de l'upload")
        }
      }
    }
    xhr.onerror = () => { setUploading(false); setError("Erreur réseau") }

    xhr.open("POST", uploadUrl)
    if (mode === "athlete") {
      xhr.setRequestHeader("Authorization", `Bearer ${userToken ?? ""}`)
    } else {
      xhr.setRequestHeader("x-admin-token", adminToken ?? "")
    }
    xhr.send(formData)
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Supprimer "${doc.file_name}" ?`)) return
    try {
      const url = mode === "admin"
        ? `${API}/api/admin/documents/${doc.id}`
        : `${API}/api/documents/${doc.id}`
      const headers: Record<string, string> = mode === "athlete"
        ? { Authorization: `Bearer ${userToken ?? ""}` }
        : { "x-admin-token": adminToken ?? "" }
      await fetch(url, { method: "DELETE", headers })
      await fetchDocuments()
    } catch { /* ignore */ }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ""
  }

  const canDelete = (doc: Document) =>
    mode === "admin" || doc.uploaded_by === "athlete"

  return (
    <div style={{ background: C.navyLight, border: "1px solid rgba(255,203,5,0.15)", borderRadius: 12, overflow: "hidden", ...INTER }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>📁</span>
        <span style={{ ...BEBAS, fontSize: 18, color: C.maize, letterSpacing: 2 }}>DOCUMENTS</span>
        {documents.length > 0 && (
          <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, padding: "1px 8px", fontSize: 11, color: C.slate }}>
            {documents.length}
          </span>
        )}
        {mode === "admin" && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.slate, fontStyle: "italic" }}>
            CV · Relevés · Contrats
          </span>
        )}
      </div>

      <div style={{ padding: 20 }}>
        {/* Document list */}
        {documents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {documents.map(doc => (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{fileIcon(doc.file_type)}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: C.white, fontSize: 14, fontWeight: 500, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.maize)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.white)}
                  >
                    {doc.file_name}
                  </a>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3, flexWrap: "wrap" }}>
                    {doc.label && <span style={{ fontSize: 12, color: C.slate }}>{doc.label}</span>}
                    {doc.label && <span style={{ fontSize: 11, color: "rgba(138,155,176,0.35)" }}>·</span>}
                    {doc.file_size && <span style={{ fontSize: 11, color: C.slate }}>{formatBytes(doc.file_size)}</span>}
                    <span style={{ fontSize: 11, color: "rgba(138,155,176,0.35)" }}>·</span>
                    <span style={{ fontSize: 11, color: C.slate }}>{formatDate(doc.created_at)}</span>
                    {mode === "admin" && (
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4, ...BEBAS, letterSpacing: 1,
                        background: doc.uploaded_by === "admin" ? "rgba(255,203,5,0.12)" : "rgba(255,255,255,0.06)",
                        color: doc.uploaded_by === "admin" ? C.maize : C.slate,
                      }}>
                        {doc.uploaded_by === "admin" ? "RISE" : "ATHLÈTE"}
                      </span>
                    )}
                  </div>
                </div>

                {canDelete(doc) && (
                  <button
                    onClick={() => handleDelete(doc)}
                    title="Supprimer"
                    style={{ background: "transparent", border: "none", color: "rgba(231,76,60,0.4)", cursor: "pointer", fontSize: 16, padding: 4, flexShrink: 0, lineHeight: 1, transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.red)}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(231,76,60,0.4)")}
                  >
                    🗑
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Feedback */}
        {error && (
          <div style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: C.red, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: "rgba(46,204,113,0.1)", border: "1px solid rgba(46,204,113,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, color: C.green, fontSize: 13 }}>
            ✓ {success}
          </div>
        )}

        {/* Label input */}
        {!uploading && (
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder='Description optionnelle (ex: "Relevé de notes Terminale")'
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 12px", color: C.white, fontSize: 13, outline: "none", ...INTER }}
            />
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? C.maize : "rgba(255,255,255,0.12)"}`,
            borderRadius: 10,
            padding: "24px 16px",
            textAlign: "center",
            cursor: uploading ? "wait" : "pointer",
            background: dragging ? "rgba(255,203,5,0.04)" : "rgba(255,255,255,0.01)",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          {uploading ? (
            <div>
              <p style={{ color: C.slate, fontSize: 13, margin: "0 0 12px" }}>
                Upload en cours… {progress}%
              </p>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, height: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: C.maize, borderRadius: 999, transition: "width 0.2s" }} />
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
              <p style={{ color: C.white, fontSize: 14, margin: "0 0 4px", fontWeight: 500 }}>
                Glisse tes fichiers ici ou clique pour sélectionner
              </p>
              <p style={{ color: C.slate, fontSize: 12, margin: 0 }}>PDF · JPG · PNG · Max 10 MB</p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onFileInput}
          style={{ display: "none" }}
        />
      </div>
    </div>
  )
}
