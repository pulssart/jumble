"use client"

import React, { useState, useEffect, useRef } from "react"
import { NotionElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText, Edit2 } from "lucide-react"
// Utiliser l'API route au lieu de la server action pour compatibilité Netlify
async function fetchUrlMetadata(url: string) {
  try {
    const response = await fetch("/api/metadata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching metadata:", error)
    return null
  }
}

interface NotionCardProps {
  element: NotionElement
  onUpdate: (element: NotionElement) => void
}

// Fonction utilitaire pour extraire un titre lisible de l'URL Notion
const extractNotionTitle = (url: string): string => {
  try {
    const urlObj = new URL(url)
    // Ex: /workspace/Mon-Titre-De-Page-123abc456...
    const path = urlObj.pathname
    const lastPart = path.split("/").pop() || ""
    
    // Enlever l'ID à la fin (souvent 32 chars hex ou similaire après un tiret)
    // Notion utilise souvent titre-ID
    const parts = lastPart.split("-")
    if (parts.length > 1) {
      // Si la dernière partie ressemble à un ID long, on l'enlève
      const potentialId = parts[parts.length - 1]
      if (potentialId.length >= 32) {
        parts.pop()
      }
    }
    
    const title = parts.join(" ")
    return title || "Page Notion"
  } catch (e) {
    return "Page Notion"
  }
}

export function NotionCard({ element, onUpdate }: NotionCardProps) {
  const [isEditingLink, setIsEditingLink] = useState(!element.embedUrl)
  const [inputValue, setInputValue] = useState(element.embedUrl || "")
  
  // Gestion du titre personnalisé
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(element.customTitle || "")
  const fetchedUrlRef = useRef("")

  useEffect(() => {
    if (element.embedUrl && element.embedUrl !== fetchedUrlRef.current) {
      fetchedUrlRef.current = element.embedUrl
      
      const load = async () => {
          // 1. Fallback immédiat si pas de titre
          if (!element.customTitle) {
             const extracted = extractNotionTitle(element.embedUrl)
             onUpdate({ ...element, customTitle: extracted })
             setTitleValue(extracted)
          }
          
          // 2. Fetch serveur pour le vrai titre
          try {
            const meta = await fetchUrlMetadata(element.embedUrl)
            if (meta?.title) {
               const cleanTitle = meta.title.replace(/ \| Notion$/, "")
               // On met à jour seulement si l'utilisateur n'a pas déjà changé le titre manuellement entre temps
               // (Difficile à savoir, on écrase pour l'instant si c'est la première fois)
               onUpdate({ ...element, customTitle: cleanTitle })
               setTitleValue(cleanTitle)
            }
          } catch (e) {
            console.error("Erreur fetch notion title", e)
          }
      }
      load()
    }
  }, [element.embedUrl])

  const handleLinkSubmit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (inputValue.trim()) {
      // On reset le fetchedUrlRef pour forcer un nouveau fetch
      fetchedUrlRef.current = ""
      
      onUpdate({
        ...element,
        embedUrl: inputValue,
        customTitle: undefined, // On reset pour laisser le fetch faire son travail
      })
      setIsEditingLink(false)
    }
  }

  const handleTitleSubmit = () => {
    onUpdate({ ...element, customTitle: titleValue })
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
          placeholder="Collez le lien Notion ici..."
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
          <Button onClick={handleLinkSubmit} size="sm" onMouseDown={(e) => e.stopPropagation()}>
            Valider
          </Button>
          <Button
            onClick={() => setIsEditingLink(false)}
            variant="outline"
            size="sm"
            onMouseDown={(e) => e.stopPropagation()}
          >
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 w-[300px] overflow-hidden cursor-grab active:cursor-grabbing group">
      <div className="p-6 flex flex-col items-center gap-4 hover:bg-gray-50 transition-colors">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          <FileText className="w-6 h-6 text-gray-600" />
        </div>
        
        <div className="text-center w-full relative">
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
              className="text-center h-8 text-sm font-medium"
            />
          ) : (
            <div 
              className="group/title flex items-center justify-center gap-2 cursor-text rounded hover:bg-gray-200/50 py-1 px-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setTitleValue(element.customTitle || "Page Notion")
                setIsEditingTitle(true)
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 className="font-medium text-gray-900 truncate max-w-[200px]">
                {element.customTitle || "Page Notion"}
              </h3>
              <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover/title:opacity-100" />
            </div>
          )}
          
          <p className="text-xs text-gray-500 truncate max-w-[250px] mx-auto mt-1">
            {element.embedUrl}
          </p>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2"
          onClick={() => window.open(element.embedUrl, '_blank')}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
          Ouvrir dans Notion
        </Button>
      </div>

    </div>
  )
}
