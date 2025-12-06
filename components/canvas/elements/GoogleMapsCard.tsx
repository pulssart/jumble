"use client"

import React, { useState, useRef, useEffect } from "react"
import { GoogleMapsElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language"

interface GoogleMapsCardProps {
  element: GoogleMapsElement
  onUpdate: (element: GoogleMapsElement) => void
}

// Convertir un lien Google Maps en URL d'embed
async function convertToEmbedUrl(url: string): Promise<string> {
  // Nettoyer l'URL (peut contenir des guillemets ou autres caractères)
  const cleanUrl = url.trim().replace(/^["']|["']$/g, '')
  
  // Si c'est déjà une URL d'embed complète, la retourner telle quelle
  if (cleanUrl.includes('google.com/maps/embed')) {
    try {
      // Extraire l'URL de base et les paramètres
      const urlObj = new URL(cleanUrl)
      const pb = urlObj.searchParams.get('pb')
      if (pb) {
        return `https://www.google.com/maps/embed?pb=${pb}`
      }
      // Si pas de pb mais d'autres paramètres, les garder
      return `https://www.google.com/maps/embed?${urlObj.searchParams.toString()}`
    } catch (e) {
      // Si l'URL n'est pas valide, essayer d'extraire pb manuellement
      // Cela peut arriver si l'utilisateur colle directement depuis le code iframe
      const pbMatch = cleanUrl.match(/[?&]pb=([^&"'\s<>]+)/)
      if (pbMatch) {
        return `https://www.google.com/maps/embed?pb=${pbMatch[1]}`
      }
      // Si l'URL contient déjà le format embed, essayer de la nettoyer
      if (cleanUrl.startsWith('https://www.google.com/maps/embed')) {
        return cleanUrl
      }
      // Sinon retourner l'URL telle quelle
      return cleanUrl
    }
  }

  // Pour les liens courts maps.app.goo.gl
  if (cleanUrl.includes('maps.app.goo.gl')) {
    // Les liens courts ne peuvent pas être facilement convertis en embed
    // car ils nécessitent une résolution côté serveur
    // On retourne une URL qui pourrait fonctionner, mais l'utilisateur
    // devrait obtenir l'URL d'embed depuis Google Maps pour un meilleur résultat
    return `https://www.google.com/maps?q=${encodeURIComponent(cleanUrl)}&output=embed`
  }

  // Pour les liens maps.google.com complets, extraire le paramètre pb si présent
  if (cleanUrl.includes('maps.google.com') || cleanUrl.includes('google.com/maps')) {
    // Essayer d'extraire le paramètre pb depuis l'URL (peut être dans l'URL complète)
    const pbMatch = cleanUrl.match(/[?&]pb=([^&"'\s]+)/)
    if (pbMatch) {
      return `https://www.google.com/maps/embed?pb=${pbMatch[1]}`
    }
    
    // Si l'URL contient déjà le format embed, extraire juste le paramètre pb
    if (cleanUrl.includes('/embed')) {
      const urlObj = new URL(cleanUrl)
      const pb = urlObj.searchParams.get('pb')
      if (pb) {
        return `https://www.google.com/maps/embed?pb=${pb}`
      }
    }
    
    // Extraire les coordonnées depuis le format @lat,lng,zoom
    const coordMatch = cleanUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+\.?\d*)z/)
    if (coordMatch) {
      const lat = coordMatch[1]
      const lng = coordMatch[2]
      const zoom = coordMatch[3] || '15'
      return `https://www.google.com/maps?q=${lat},${lng}&hl=fr&z=${zoom}&output=embed`
    }

    // Si c'est un lien avec place_id ou place name
    const placeMatch = cleanUrl.match(/place\/([^\/\?]+)/)
    if (placeMatch) {
      const place = encodeURIComponent(placeMatch[1])
      return `https://www.google.com/maps?q=${place}&hl=fr&output=embed`
    }

    // Si c'est un lien avec directions
    const dirMatch = cleanUrl.match(/dir\/([^\/]+)/)
    if (dirMatch) {
      const destination = encodeURIComponent(dirMatch[1])
      return `https://www.google.com/maps?q=${destination}&hl=fr&output=embed`
    }
  }

  // Par défaut, retourner l'URL nettoyée
  return cleanUrl
}

export function GoogleMapsCard({ element, onUpdate }: GoogleMapsCardProps) {
  const { language } = useLanguage()
  const [isEditing, setIsEditing] = useState(!element.url)
  const [inputValue, setInputValue] = useState(element.url || "")
  const [isInteractive, setIsInteractive] = useState(false)
  const [isCommandPressed, setIsCommandPressed] = useState(false)
  const [embedUrl, setEmbedUrl] = useState<string>("")
  const [isLoadingEmbed, setIsLoadingEmbed] = useState(false)
  
  const [dimensions, setDimensions] = useState({
    width: element.width || 600,
    height: element.height || 450
  })

  // Charger l'URL d'embed au montage et quand l'URL change
  useEffect(() => {
    if (element.url && !isEditing) {
      setIsLoadingEmbed(true)
      convertToEmbedUrl(element.url)
        .then((url) => {
          setEmbedUrl(url)
          setIsLoadingEmbed(false)
        })
        .catch((error) => {
          console.error("Erreur conversion URL Google Maps:", error)
          setEmbedUrl(element.url)
          setIsLoadingEmbed(false)
        })
    } else if (!element.url) {
      setEmbedUrl("")
    }
  }, [element.url, isEditing])

  useEffect(() => {
    if (element.width && element.height) {
      setDimensions({ width: element.width, height: element.height })
    }
  }, [element.width, element.height])

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

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = dimensions.width
    const startHeight = dimensions.height
    const aspectRatio = startWidth / startHeight

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      
      // Redimensionnement proportionnel basé sur la largeur
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

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (inputValue.trim()) {
      setIsLoadingEmbed(true)
      try {
        const convertedUrl = await convertToEmbedUrl(inputValue.trim())
        onUpdate({
          ...element,
          url: inputValue.trim(),
          embedUrl: convertedUrl !== inputValue.trim() ? convertedUrl : undefined
        })
        setEmbedUrl(convertedUrl)
        setIsEditing(false)
      } catch (error) {
        console.error("Erreur conversion URL:", error)
        onUpdate({
          ...element,
          url: inputValue.trim(),
        })
        setEmbedUrl(inputValue.trim())
        setIsEditing(false)
      } finally {
        setIsLoadingEmbed(false)
      }
    }
  }

  const handleMouseEnter = () => {
    if (isCommandPressed) {
      setIsInteractive(true)
    }
  }

  if (isEditing) {
    return (
      <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[400px]">
        <Input
          type="text"
          placeholder={language === "fr" ? "Lien Google Maps ou URL d'embed (maps.app.goo.gl, maps.google.com, ou iframe src)" : "Google Maps link or embed URL (maps.app.goo.gl, maps.google.com, or iframe src)"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
            if (e.key === "Escape") setIsEditing(false)
          }}
          className="mb-2"
        />
        {language === "fr" ? (
          <div className="text-xs text-gray-500 mb-2 space-y-1">
            <p>💡 <strong>Astuce :</strong> Pour les liens courts (maps.app.goo.gl), obtenez l'URL d'embed :</p>
            <ol className="list-decimal list-inside ml-2 space-y-0.5">
              <li>Ouvrez le lien dans Google Maps</li>
              <li>Cliquez sur "Partager" → "Intégrer une carte"</li>
              <li>Copiez l'URL depuis le code iframe (attribut src)</li>
              <li>Collez-la ici</li>
            </ol>
            <p className="mt-1">Vous pouvez aussi coller directement l'URL d'embed complète.</p>
          </div>
        ) : (
          <div className="text-xs text-gray-500 mb-2 space-y-1">
            <p>💡 <strong>Tip:</strong> For short links (maps.app.goo.gl), get the embed URL:</p>
            <ol className="list-decimal list-inside ml-2 space-y-0.5">
              <li>Open the link in Google Maps</li>
              <li>Click "Share" → "Embed a map"</li>
              <li>Copy the URL from the iframe code (src attribute)</li>
              <li>Paste it here</li>
            </ol>
            <p className="mt-1">You can also paste the complete embed URL directly.</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button 
            onClick={handleSubmit} 
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            {language === "fr" ? "Valider" : "Submit"}
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsEditing(false)
            }}
            variant="outline"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            {language === "fr" ? "Annuler" : "Cancel"}
          </Button>
        </div>
      </div>
    )
  }

  const finalEmbedUrl = element.embedUrl || embedUrl || element.url

  return (
    <div 
      className="rounded-xl shadow-lg bg-white border border-gray-200 overflow-hidden relative group"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transition: 'width 0.1s, height 0.1s'
      }}
      onMouseEnter={handleMouseEnter}
    >
      {/* Overlay pour le drag - ne bloque pas les boutons */}
      {!isInteractive && (
        <div 
          className="drag-handle absolute inset-0 z-10 cursor-grab active:cursor-grabbing bg-transparent"
          onMouseDown={(e) => {
            // Ne pas bloquer les clics sur les boutons ou leurs conteneurs
            const target = e.target as HTMLElement
            const buttonContainer = target.closest('button') || target.closest('[role="button"]') || target.closest('.z-30')
            if (buttonContainer) {
              e.stopPropagation()
              return
            }
          }}
        />
      )}

      <div className="relative w-full h-full">
        {isLoadingEmbed ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-sm text-gray-500">
              {language === "fr" ? "Chargement de la carte..." : "Loading map..."}
            </p>
          </div>
        ) : finalEmbedUrl ? (
          <iframe
            src={finalEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className={`w-full h-full absolute inset-0 ${isInteractive ? "pointer-events-auto" : "pointer-events-none"}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-sm text-gray-500">
              {language === "fr" ? "Aucune carte à afficher" : "No map to display"}
            </p>
          </div>
        )}
      </div>

      {/* Bouton pour activer l'interaction */}
      {!isInteractive && (
        <div 
          className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ pointerEvents: 'auto' }}
        >
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setIsInteractive(true)
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
          >
            {language === "fr" ? "Interagir" : "Interact"}
          </Button>
        </div>
      )}

      {/* Bouton pour désactiver l'interaction */}
      {isInteractive && (
        <div 
          className="absolute top-2 right-2 z-30"
          style={{ pointerEvents: 'auto' }}
        >
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              setIsInteractive(false)
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
          >
            {language === "fr" ? "Terminer" : "Done"}
          </Button>
        </div>
      )}

      {/* Bouton pour éditer */}
      <div 
        className="absolute top-2 left-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ pointerEvents: 'auto' }}
      >
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setIsEditing(true)
            setInputValue(element.url)
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
        >
          {language === "fr" ? "Modifier" : "Edit"}
        </Button>
      </div>

      {/* Poignée de redimensionnement */}
      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity z-30"
        style={{ pointerEvents: 'auto' }}
        onMouseDown={(e) => {
          e.stopPropagation()
          handleResizeStart(e)
        }}
      >
        <div className="w-2 h-2 bg-gray-400/50 rounded-sm" />
      </div>
    </div>
  )
}
