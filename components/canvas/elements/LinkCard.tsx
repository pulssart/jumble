"use client"

import React, { useState, useEffect } from "react"
import { LinkElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExternalLink, Link as LinkIcon, Edit2, Globe } from "lucide-react"
import { fetchUrlMetadata } from "@/app/actions"

interface LinkCardProps {
  element: LinkElement
  onUpdate: (element: LinkElement) => void
}

export function LinkCard({ element, onUpdate }: LinkCardProps) {
  const [isEditingLink, setIsEditingLink] = useState(!element.url)
  const [inputValue, setInputValue] = useState(element.url || "")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(element.title || "")
  const [isLoading, setIsLoading] = useState(false)

  // Récupérer les métadonnées au chargement ou changement d'URL
  useEffect(() => {
    const loadMetadata = async () => {
      if (element.url && (!element.title || !element.description || !element.imageUrl || !element.favicon)) {
        setIsLoading(true)
        try {
          const metadata = await fetchUrlMetadata(element.url)
          if (metadata) {
            onUpdate({
              ...element,
              title: element.title || metadata.title,
              description: element.description || metadata.description,
              imageUrl: element.imageUrl || metadata.image,
              favicon: element.favicon || metadata.favicon
            })
            if (!element.title) setTitleValue(metadata.title)
          }
        } catch (e) {
          console.error("Erreur chargement metadata", e)
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    loadMetadata()
  }, [element.url])

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return ""
    }
  }

  const domain = getDomain(element.url)

  const handleLinkSubmit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (inputValue.trim()) {
      let url = inputValue.trim()
      if (!url.startsWith("http")) {
        url = "https://" + url
      }
      
      // Reset metadata on URL change
      onUpdate({
        ...element,
        url: url,
        title: undefined,
        description: undefined,
        imageUrl: undefined,
        favicon: undefined
      })
      setIsEditingLink(false)
    }
  }

  const handleTitleSubmit = () => {
    onUpdate({ ...element, title: titleValue })
    setIsEditingTitle(false)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.stopPropagation()
  }

  if (isEditingLink) {
    return (
      <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[300px]">
        <Input
          type="text"
          placeholder="Collez une URL (ex: google.com)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLinkSubmit()
            if (e.key === "Escape") setIsEditingLink(false)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="mb-2"
        />
        <div className="flex gap-2">
          <Button 
            onClick={handleLinkSubmit} 
            size="sm" 
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            Valider
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsEditingLink(false)
            }}
            variant="outline"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 w-[320px] overflow-hidden cursor-grab active:cursor-grabbing group hover:shadow-xl transition-shadow flex flex-col">
      {/* Image de couverture (Open Graph) */}
      {element.imageUrl ? (
        <div className="h-40 bg-gray-100 relative overflow-hidden border-b border-gray-100">
          <img 
            src={element.imageUrl} 
            alt="Cover" 
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Favicon flottant si image présente */}
          {element.favicon && (
             <div className="absolute bottom-2 left-2 bg-white p-1 rounded-md shadow-sm">
                <img src={element.favicon} alt="" className="w-4 h-4" />
             </div>
          )}
        </div>
      ) : (
        /* Fallback header si pas d'image */
        <div className="h-24 bg-gray-50 flex items-center justify-center border-b relative overflow-hidden">
          {element.favicon ? (
            <img 
              src={element.favicon} 
              alt="Site Icon" 
              className="w-12 h-12 object-contain drop-shadow-sm"
            />
          ) : (
            <Globe className="w-10 h-10 text-gray-300" />
          )}
        </div>
      )}

      <div className="p-4 flex flex-col gap-2">
        <div className="w-full relative">
          {isEditingTitle ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit()
                e.stopPropagation()
              }}
              onPaste={handlePaste}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
              className="h-8 text-sm font-medium"
            />
          ) : (
            <div 
              className="group/title flex items-start gap-2 cursor-text rounded hover:bg-gray-50 -ml-2 px-2 py-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setTitleValue(element.title || domain)
                setIsEditingTitle(true)
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-gray-900 leading-snug flex-1 line-clamp-2">
                {element.title || (isLoading ? "Chargement..." : domain) || "Site Web"}
              </h3>
              <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover/title:opacity-100 shrink-0 mt-1" />
            </div>
          )}
          
          {element.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-1 px-1">
              {element.description}
            </p>
          )}

          <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-3 px-1 flex items-center gap-1">
            {!element.imageUrl && element.favicon && <img src={element.favicon} className="w-3 h-3" />}
            {domain}
          </p>
        </div>
        
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full gap-2 mt-2 text-xs h-8"
          onClick={() => window.open(element.url, '_blank')}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          Visiter
        </Button>
      </div>

      {/* Bouton edit URL au survol */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-6 w-6 bg-white/90 backdrop-blur shadow-sm hover:bg-white"
          onClick={(e) => {
             e.stopPropagation()
             setIsEditingLink(true)
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Edit2 className="w-3 h-3 text-gray-600" />
        </Button>
      </div>
    </div>
  )
}
