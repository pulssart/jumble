"use client"

import React, { useState, useEffect } from "react"
import { SpotifyElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SpotifyCardProps {
  element: SpotifyElement
  onUpdate: (element: SpotifyElement) => void
}

function extractSpotifyId(input: string): string | null {
  // Supporte:
  // - https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  // - https://open.spotify.com/track/123...
  // - https://open.spotify.com/album/123...
  // - spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
  
  try {
    if (input.startsWith("spotify:")) {
      const parts = input.split(":")
      return `${parts[1]}/${parts[2]}`
    }
    
    if (input.includes("open.spotify.com")) {
      const url = new URL(input)
      const pathParts = url.pathname.split("/").filter(Boolean)
      // pathParts = ['playlist', 'ID'] ou ['intl-fr', 'playlist', 'ID']
      if (pathParts.length >= 2) {
        const type = pathParts[pathParts.length - 2]
        const id = pathParts[pathParts.length - 1]
        return `${type}/${id}`
      }
    }
  } catch (e) {
    console.error("Erreur parsing Spotify URL", e)
  }
  
  return null
}

export function SpotifyCard({ element, onUpdate }: SpotifyCardProps) {
  const [isEditing, setIsEditing] = useState(!element.spotifyUri)
  const [inputValue, setInputValue] = useState("")
  const [isInteractive, setIsInteractive] = useState(false)
  const [isCommandPressed, setIsCommandPressed] = useState(false)

  // Dimensions locales pour la fluidité
  const [dimensions, setDimensions] = useState({
    width: element.width || 300,
    height: element.height || 380
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
    const embedId = extractSpotifyId(inputValue)
    if (embedId) {
      onUpdate({
        ...element,
        spotifyUri: embedId,
      })
      setIsEditing(false)
    } else {
        alert("Lien Spotify invalide. Utilisez un lien de playlist, album ou titre.")
    }
  }

  // Gestion du redimensionnement
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = dimensions.width
    const startHeight = dimensions.height

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(250, startWidth + (moveEvent.clientX - startX))
      const newHeight = Math.max(80, startHeight + (moveEvent.clientY - startY))
      
      setDimensions({ width: newWidth, height: newHeight })
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      
      // Sauvegarder la taille finale
      onUpdate({
        ...element,
        width: Math.max(250, startWidth + (upEvent.clientX - startX)),
        height: Math.max(80, startHeight + (upEvent.clientY - startY))
      })
    };

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  if (isEditing) {
    return (
      <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[300px]">
        <Input
          type="text"
          placeholder="Lien Spotify (Playlist, Album, Titre)"
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

  const handleMouseEnter = () => {
    if (isCommandPressed) {
      setIsInteractive(true)
    }
  }

  return (
    <div 
      className="rounded-xl shadow-lg bg-white border border-gray-200 overflow-hidden flex flex-col relative group"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transition: 'width 0.1s, height 0.1s'
      }}
      onMouseEnter={handleMouseEnter}
    >
      {/* Overlay pour le drag */}
      {!isInteractive && (
        <div className="drag-handle absolute inset-0 z-10 cursor-grab active:cursor-grabbing bg-transparent" />
      )}

      <div className="relative flex-1 w-full min-h-0">
        <iframe
          style={{ borderRadius: "12px" }}
          src={`https://open.spotify.com/embed/${element.spotifyUri}?utm_source=generator`}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className={`w-full h-full absolute inset-0 ${isInteractive ? "pointer-events-auto" : "pointer-events-none"}`}
        />
      </div>

      {/* Bouton pour activer l'interaction */}
      {!isInteractive && (
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={(e) => {
              e.stopPropagation()
              setIsInteractive(true)
            }}
          >
            Interagir
          </Button>
        </div>
      )}

      {/* Bouton pour désactiver l'interaction */}
      {isInteractive && (
        <div className="absolute top-2 right-2 z-20">
          <Button 
            size="sm" 
            variant="secondary" 
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
