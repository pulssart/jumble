"use client"

import React, { useState, useEffect, useRef } from "react"
import { LinearElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExternalLink, LayoutList, Edit2 } from "lucide-react"
import { fetchUrlMetadata } from "@/app/actions"

interface LinearCardProps {
  element: LinearElement
  onUpdate: (element: LinearElement) => void
}

// Fonction utilitaire pour extraire un titre lisible de l'URL Linear
const extractLinearTitle = (url: string): string => {
  try {
    const urlObj = new URL(url)
    // Ex: /team/issue/ENG-123/fix-login-bug
    const path = urlObj.pathname
    const parts = path.split("/")
    
    // Trouver la partie ID (souvent en majuscules + tiret + chiffres)
    const idIndex = parts.findIndex(p => /^[A-Z]+-\d+$/.test(p))
    
    if (idIndex !== -1 && idIndex + 1 < parts.length) {
      // Si on a ID et titre
      const id = parts[idIndex]
      const titleSlug = parts[idIndex + 1]
      const title = titleSlug.split("-").join(" ")
      return `${id}: ${title}`
    } else if (idIndex !== -1) {
      return `Ticket ${parts[idIndex]}`
    }
    
    return "Ticket Linear"
  } catch (e) {
    return "Ticket Linear"
  }
}

export function LinearCard({ element, onUpdate }: LinearCardProps) {
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
          // 1. Fallback immédiat
          if (!element.customTitle) {
             const extracted = extractLinearTitle(element.embedUrl)
             onUpdate({ ...element, customTitle: extracted })
             setTitleValue(extracted)
          }
          
          // 2. Fetch serveur pour le vrai titre
          try {
            const meta = await fetchUrlMetadata(element.embedUrl)
            if (meta?.title) {
               // Linear titres sont souvent "Title - Linear" ou "ID Title | Linear"
               const cleanTitle = meta.title.replace(/ - Linear$/, "").replace(/ \| Linear$/, "")
               onUpdate({ ...element, customTitle: cleanTitle })
               setTitleValue(cleanTitle)
            }
          } catch (e) {
            console.error("Erreur fetch linear title", e)
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
      // Reset ref pour forcer un nouveau fetch
      fetchedUrlRef.current = ""
      
      onUpdate({
        ...element,
        embedUrl: inputValue,
        customTitle: undefined, // Reset pour laisser le fetch agir
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
          placeholder="Collez le lien Linear ici..."
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
    <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 w-[300px] overflow-hidden cursor-grab active:cursor-grabbing group">
      <div className="p-6 flex flex-col items-center gap-4 hover:bg-gray-50 transition-colors">
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
          <LayoutList className="w-6 h-6 text-indigo-600" />
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
                e.stopPropagation() // Empêcher le drag
                setTitleValue(element.customTitle || extractLinearTitle(element.embedUrl))
                setIsEditingTitle(true)
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 className="font-medium text-gray-900 truncate max-w-[200px]">
                {element.customTitle || "Ticket Linear"}
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
          Ouvrir dans Linear
        </Button>
      </div>

      <div className="p-2 border-t bg-gray-50 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditingLink(true)}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
          onMouseDown={(e) => e.stopPropagation()}
        >
          Modifier le lien
        </button>
      </div>
    </div>
  )
}
