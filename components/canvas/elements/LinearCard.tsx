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
    const path = urlObj.pathname
    const parts = path.split("/").filter(p => p.length > 0)
    
    // Format 1: /team/issue/ENG-123/fix-login-bug
    const idIndex = parts.findIndex(p => /^[A-Z]+-\d+$/.test(p))
    if (idIndex !== -1 && idIndex + 1 < parts.length) {
      const id = parts[idIndex]
      const titleSlug = parts[idIndex + 1]
      // Enlever l'ID à la fin si présent (ex: case-manager-stopwatch-6c3050815f28)
      const cleanSlug = titleSlug.replace(/-\w+$/, '')
      const title = cleanSlug.split("-").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" ")
      return `${id}: ${title}`
    } else if (idIndex !== -1) {
      return `Ticket ${parts[idIndex]}`
    }
    
    // Format 2: /dotfile/project/case-manager-stopwatch-6c3050815f28
    const projectIndex = parts.findIndex(p => p === "project")
    if (projectIndex !== -1 && projectIndex + 1 < parts.length) {
      const projectSlug = parts[projectIndex + 1]
      // Enlever l'ID à la fin (ex: case-manager-stopwatch-6c3050815f28)
      const cleanSlug = projectSlug.replace(/-\w+$/, '')
      const title = cleanSlug.split("-").map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(" ")
      return title || "Project Linear"
    }
    
    // Format 3: Dernier segment comme titre potentiel
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1]
      // Si c'est un slug (contient des tirets), le convertir en titre
      if (lastPart.includes("-") && !/^[A-Z]+-\d+$/.test(lastPart)) {
        const cleanSlug = lastPart.replace(/-\w+$/, '')
        const title = cleanSlug.split("-").map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(" ")
        if (title.length > 0) {
          return title
        }
      }
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
          
          // 2. Fetch serveur pour toutes les données Linear
          try {
            const data = await fetchUrlMetadata(element.embedUrl)
            if (data) {
              const updates: Partial<LinearElement> = {}
              
              if (data.title && data.title.trim()) {
                // Nettoyer le titre : enlever "Linear", "| Linear", etc.
                let cleanTitle = data.title
                  .replace(/ - Linear$/, "")
                  .replace(/ \| Linear$/, "")
                  .replace(/^Linear:?\s*/i, "")
                  .trim()
                
                // Si le titre contient l'ID du ticket (ex: "ENG-123: Title"), le garder
                // Sinon, essayer d'extraire l'ID de l'URL et l'ajouter
                if (!cleanTitle.match(/^[A-Z]+-\d+/)) {
                  const extracted = extractLinearTitle(element.embedUrl)
                  if (extracted && extracted !== "Ticket Linear") {
                    // Si extracted contient un ID, on peut l'utiliser comme préfixe
                    const idMatch = extracted.match(/^([A-Z]+-\d+):/)
                    if (idMatch && !cleanTitle.includes(idMatch[1])) {
                      cleanTitle = `${idMatch[1]}: ${cleanTitle}`
                    }
                  }
                }
                
                if (cleanTitle) {
                  updates.customTitle = cleanTitle
                  setTitleValue(cleanTitle)
                }
              }
              
              if ('status' in data && data.status) {
                updates.status = data.status as string
              }
              
              if ('priority' in data && data.priority) {
                updates.priority = data.priority as string
              }
              
              if ('assignee' in data && data.assignee) {
                updates.assignee = data.assignee as string
              }
              
              if ('labels' in data && Array.isArray(data.labels) && data.labels.length > 0) {
                updates.labels = data.labels as string[]
              }
              
              if ('description' in data && data.description) {
                updates.description = data.description as string
              }
              
              if (Object.keys(updates).length > 0) {
                onUpdate({ ...element, ...updates })
              }
            }
          } catch (e) {
            console.error("Erreur fetch linear data", e)
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
                e.stopPropagation()
                setTitleValue(element.customTitle || extractLinearTitle(element.embedUrl))
                setIsEditingTitle(true)
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 className="font-medium text-gray-900 truncate max-w-[200px]">
                {element.customTitle || extractLinearTitle(element.embedUrl) || "Ticket Linear"}
              </h3>
              <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover/title:opacity-100" />
            </div>
          )}

          {/* Afficher seulement la description si disponible, sinon l'URL */}
          {element.description ? (
            <p className="text-xs text-gray-600 line-clamp-2 mt-2 leading-relaxed px-2">
              {element.description}
            </p>
          ) : (
            <p className="text-xs text-gray-500 truncate max-w-[250px] mx-auto mt-1">
              {element.embedUrl}
            </p>
          )}
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
    </div>
  )
}
