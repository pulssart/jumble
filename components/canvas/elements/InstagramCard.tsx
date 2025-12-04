"use client"

import React, { useState, useEffect } from "react"
import { InstagramElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Instagram, Edit2 } from "lucide-react"
import { useLanguage } from "@/lib/language"

interface InstagramCardProps {
  element: InstagramElement
  onUpdate: (element: InstagramElement) => void
}

// Fonction pour extraire le shortcode d'une URL Instagram
function extractShortcode(url: string): string | null {
  try {
    // Patterns pour différents types de contenus Instagram
    // Post: instagram.com/p/{shortcode}/
    // Reel: instagram.com/reel/{shortcode}/
    // Story: instagram.com/stories/{username}/{shortcode}/
    const patterns = [
      /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
      /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
      /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]+)$/, // Shortcode direct
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }
  } catch (e) {
    console.error("Erreur parsing Instagram URL", e)
  }
  return null
}

// Fonction pour déterminer le type de contenu et construire l'URL d'embed
function getEmbedUrl(shortcode: string, originalUrl?: string): string {
  // Paramètres pour masquer le footer et les icônes
  const hideParams = "?hide_story=true&hidecaption=true"
  
  // Si on a l'URL originale, on peut déterminer le type
  if (originalUrl) {
    if (originalUrl.includes("/reel/")) {
      return `https://www.instagram.com/reel/${shortcode}/embed/${hideParams}`
    } else if (originalUrl.includes("/tv/")) {
      return `https://www.instagram.com/tv/${shortcode}/embed/${hideParams}`
    }
  }
  // Par défaut, on essaie avec /p/ (post)
  return `https://www.instagram.com/p/${shortcode}/embed/${hideParams}`
}

export function InstagramCard({ element, onUpdate }: InstagramCardProps) {
  const { language } = useLanguage()
  const [isEditing, setIsEditing] = useState(!element.shortcode)
  const [inputValue, setInputValue] = useState("")
  const [isInteractive, setIsInteractive] = useState(false)
  const [embedUrl, setEmbedUrl] = useState<string>("")

  useEffect(() => {
    if (element.shortcode) {
      const url = getEmbedUrl(element.shortcode, element.embedUrl)
      setEmbedUrl(url)
    }
  }, [element.shortcode, element.embedUrl])

  const handleSubmit = () => {
    const shortcode = extractShortcode(inputValue)
    if (shortcode) {
      const embed = getEmbedUrl(shortcode, inputValue)
      onUpdate({
        ...element,
        shortcode,
        embedUrl: embed,
      })
      setIsEditing(false)
      setInputValue("")
    } else {
      alert(language === "fr" ? "Veuillez entrer une URL Instagram valide" : "Please enter a valid Instagram URL")
    }
  }

  if (isEditing) {
    return (
      <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[300px]">
        <Input
          type="text"
          placeholder={language === "fr" ? "URL Instagram (post, reel, etc.)" : "Instagram URL (post, reel, etc.)"}
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
            {language === "fr" ? "Valider" : "Validate"}
          </Button>
          <Button
            onClick={() => setIsEditing(false)}
            variant="outline"
            size="sm"
          >
            {language === "fr" ? "Annuler" : "Cancel"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="rounded-xl shadow-lg bg-white border border-gray-200 overflow-hidden relative group"
      style={{
        width: element.width || 400,
        minHeight: element.height || 500,
      }}
      onMouseLeave={() => setIsInteractive(false)}
    >
      {/* Bouton d'édition (visible au survol) */}
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-7 w-7 bg-white/90 backdrop-blur shadow-sm hover:bg-white"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-600" />
        </Button>
      </div>

      <div className="relative w-full">
        {/* Zone de drag (si non interactif) */}
        {!isInteractive && (
          <>
            <div className="drag-handle absolute left-0 top-0 bottom-0 w-[40%] z-10 bg-transparent cursor-grab active:cursor-grabbing" />
            <div className="drag-handle absolute right-0 top-0 bottom-0 w-[40%] z-10 bg-transparent cursor-grab active:cursor-grabbing" />
            <div className="drag-handle absolute left-[40%] right-[40%] top-0 h-[30%] z-10 bg-transparent cursor-grab active:cursor-grabbing" />
            <div className="drag-handle absolute left-[40%] right-[40%] bottom-0 h-[30%] z-10 bg-transparent cursor-grab active:cursor-grabbing" />
          </>
        )}

        {/* Iframe Instagram */}
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          allowTransparency
          allow="encrypted-media"
          className={`w-full ${isInteractive ? "pointer-events-auto" : "pointer-events-none select-none"}`}
          style={{
            minHeight: "500px",
            border: "none",
          }}
        />

        {/* Bouton pour activer l'interaction */}
        {!isInteractive && (
          <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="sm" 
              variant="secondary" 
              className="bg-white/90 backdrop-blur shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                setIsInteractive(true)
              }}
            >
              <Instagram className="w-4 h-4 mr-2" />
              {language === "fr" ? "Interagir" : "Interact"}
            </Button>
          </div>
        )}

        {/* Bouton pour désactiver l'interaction */}
        {isInteractive && (
          <div className="absolute top-2 left-2 z-20">
            <Button 
              size="sm" 
              variant="secondary"
              className="bg-white/90 backdrop-blur shadow-sm"
              onClick={(e) => {
                e.stopPropagation()
                setIsInteractive(false)
              }}
            >
              {language === "fr" ? "Terminer" : "Done"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

