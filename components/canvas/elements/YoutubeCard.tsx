"use client"

import React, { useState, useRef, useEffect } from "react"
import { YoutubeElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language"

interface YoutubeCardProps {
  element: YoutubeElement
  onUpdate: (element: YoutubeElement) => void
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function YoutubeCard({ element, onUpdate }: YoutubeCardProps) {
  const { language } = useLanguage()
  const [isEditing, setIsEditing] = useState(!element.videoId)
  const [inputValue, setInputValue] = useState("")
  const [isInteractive, setIsInteractive] = useState(false)
  
  const [dimensions, setDimensions] = useState({
    width: element.width || 400,
    height: element.height || 225
  })

  useEffect(() => {
    if (element.width && element.height) {
      setDimensions({ width: element.width, height: element.height })
    }
  }, [element.width, element.height])

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const startX = e.clientX
    const startWidth = dimensions.width
    const aspectRatio = 16 / 9

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newWidth = Math.max(300, startWidth + deltaX)
      const newHeight = newWidth / aspectRatio
      
      setDimensions({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      
      const deltaX = upEvent.clientX - startX
      const finalWidth = Math.max(300, startWidth + deltaX)
      const finalHeight = finalWidth / aspectRatio

      onUpdate({
        ...element,
        width: Math.round(finalWidth),
        height: Math.round(finalHeight)
      })
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleSubmit = () => {
    const videoId = extractVideoId(inputValue) || inputValue
    if (videoId) {
      onUpdate({
        ...element,
        videoId,
      })
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[300px]">
        <Input
          type="text"
          placeholder={language === "fr" ? "URL YouTube ou ID vidéo" : "YouTube URL or video ID"}
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

  // URL simple, pas d'autoplay forcé, on laisse YouTube gérer
  const embedUrl = `https://www.youtube.com/embed/${element.videoId}`

  return (
    <div 
      className="rounded-xl shadow-lg bg-black border border-gray-200 overflow-hidden relative group"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transition: 'width 0.05s, height 0.05s'
      }}
      onMouseLeave={() => setIsInteractive(false)}
    >
      <div className="relative w-full h-full">
        <iframe
          width="100%"
          height="100%"
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={`w-full h-full block ${isInteractive ? 'pointer-events-auto' : 'pointer-events-none'}`}
        />
        
        {/* 
            ZONE MAGIQUE : On couvre tout SAUF le centre pour laisser cliquer Play.
            Une fois cliqué (isInteractive), tout disparait et on a accès à toute l'iframe.
        */}
        {!isInteractive && (
          <>
            {/* Zone Drag Gauche */}
            <div className="drag-handle absolute left-0 top-0 bottom-0 w-[40%] z-10 bg-transparent cursor-grab active:cursor-grabbing" title={language === "fr" ? "Déplacer" : "Move"} />
            {/* Zone Drag Droite */}
            <div className="drag-handle absolute right-0 top-0 bottom-0 w-[40%] z-10 bg-transparent cursor-grab active:cursor-grabbing" title={language === "fr" ? "Déplacer" : "Move"} />
            {/* Zone Drag Haut */}
            <div className="drag-handle absolute left-[40%] right-[40%] top-0 h-[30%] z-10 bg-transparent cursor-grab active:cursor-grabbing" title={language === "fr" ? "Déplacer" : "Move"} />
            {/* Zone Drag Bas */}
            <div className="drag-handle absolute left-[40%] right-[40%] bottom-0 h-[30%] z-10 bg-transparent cursor-grab active:cursor-grabbing" title={language === "fr" ? "Déplacer" : "Move"} />
            
            {/* 
                Zone Centrale "Trouée" : 
                Ici on ne met RIEN. C'est le trou au milieu (20% width / 40% height).
                Le clic passe au travers et touche directement l'iframe => Play natif.
            */}
            
            {/* On détecte juste le clic au centre pour activer le mode interactif complet */}
            <div 
              className="absolute left-[40%] right-[40%] top-[30%] bottom-[30%] z-0"
              onClick={() => setIsInteractive(true)}
              title="Cliquer pour lire"
            />
          </>
        )}
        
        {/* Poignée de redimensionnement */}
        <div
          className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded-sm shadow-sm border border-gray-200 z-20"
          onMouseDown={handleResizeStart}
        >
          <div className="w-2 h-2 bg-gray-600 rounded-full" />
        </div>
      </div>
    </div>
  )
}
