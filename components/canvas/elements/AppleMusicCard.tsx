"use client"

import React, { useState, useEffect } from "react"
import { AppleMusicElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface AppleMusicCardProps {
  element: AppleMusicElement
  onUpdate: (element: AppleMusicElement) => void
}

// Transforme une URL Apple Music classique en URL d'embed
function toEmbedUrl(input: string): string | null {
  try {
    const url = new URL(input)
    if (!url.hostname.includes("music.apple.com")) return null

    // Remplace music.apple.com par embed.music.apple.com
    url.hostname = "embed.music.apple.com"
    return url.toString()
  } catch (e) {
    console.error("Erreur parsing Apple Music URL", e)
    return null
  }
}

export function AppleMusicCard({ element, onUpdate }: AppleMusicCardProps) {
  const [isEditing, setIsEditing] = useState(!element.url)
  const [inputValue, setInputValue] = useState(element.url || "")
  const [isInteractive, setIsInteractive] = useState(false)
  const [isCommandPressed, setIsCommandPressed] = useState(false)

  // Dimensions locales pour une expérience fluide
  const [dimensions, setDimensions] = useState({
    width: element.width || 360,
    height: element.height || 260,
  })

  // Détection de la touche Command (Meta sur Mac, Ctrl sur Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setIsCommandPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsCommandPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const handleSubmit = () => {
    let raw = inputValue.trim()

    // Si l'utilisateur colle directement un <iframe> complet, on extrait le src
    const iframeMatch = raw.match(/src=["']([^"']+)["']/i)
    if (iframeMatch) {
      raw = iframeMatch[1]
    }

    const embedUrl = toEmbedUrl(raw)
    if (!embedUrl) {
      alert("Lien Apple Music invalide. Utilise une URL du type music.apple.com.")
      return
    }

    onUpdate({
      ...element,
      url: embedUrl,
    })
    setIsEditing(false)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = dimensions.width
    const startHeight = dimensions.height

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(260, startWidth + (moveEvent.clientX - startX))
      const newHeight = Math.max(160, startHeight + (moveEvent.clientY - startY))
      setDimensions({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)

      onUpdate({
        ...element,
        width: Math.max(260, startWidth + (upEvent.clientX - startX)),
        height: Math.max(160, startHeight + (upEvent.clientY - startY)),
      })
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  if (isEditing) {
    return (
      <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[320px]">
        <Input
          type="text"
          placeholder="Colle ici un lien Apple Music (album, playlist, station...)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
            if (e.key === "Escape") setIsEditing(false)
          }}
          className="mb-2"
        />
        <div className="flex gap-2">
          <Button onClick={handleSubmit} size="sm">
            Valider
          </Button>
          <Button
            onClick={() => setIsEditing(false)}
            variant="outline"
            size="sm"
          >
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  const embedUrl = element.url || ""

  const handleMouseEnter = () => {
    if (isCommandPressed) {
      setIsInteractive(true)
    }
  }

  return (
    <div
      className="relative rounded-2xl shadow-lg bg-white border border-gray-200 overflow-hidden group"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transition: "width 0.1s, height 0.1s",
      }}
      onMouseEnter={handleMouseEnter}
    >
      {/* Overlay pour permettre le drag quand non interactif */}
      {!isInteractive && (
        <div className="drag-handle absolute inset-0 z-10 cursor-grab active:cursor-grabbing bg-transparent" />
      )}

      <iframe
        allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
        frameBorder={0}
        height="100%"
        style={{ width: "100%", maxWidth: "660px", overflow: "hidden", borderRadius: "10px", border: "none" }}
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
        src={embedUrl}
        className={`w-full h-full ${isInteractive ? "pointer-events-auto" : "pointer-events-none"}`}
      />

      {!isInteractive && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs px-2"
            onClick={(e) => {
              e.stopPropagation()
              setIsInteractive(true)
            }}
          >
            Interagir
          </Button>
        </div>
      )}

      {isInteractive && (
        <div className="absolute top-2 right-2 z-20">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs px-2"
            onClick={(e) => {
              e.stopPropagation()
              setIsInteractive(false)
            }}
          >
            Terminer
          </Button>
        </div>
      )}

      {/* Poignée de redimensionnement */}
      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity z-20"
        onMouseDown={handleResizeStart}
      >
        <div className="w-2 h-2 bg-gray-400/50 rounded-sm" />
      </div>
    </div>
  )
}


