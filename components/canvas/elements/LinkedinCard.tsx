"use client"

import React, { useState, useEffect } from "react"
import { LinkedinElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExternalLink, Linkedin, Edit2 } from "lucide-react"
import { fetchUrlMetadata } from "@/app/actions"

interface LinkedinCardProps {
  element: LinkedinElement
  onUpdate: (element: LinkedinElement) => void
}

// Fonction utilitaire pour extraire un titre lisible de l'URL LinkedIn
const extractLinkedinTitle = (url: string): string => {
  try {
    // Essayer de trouver le nom d'utilisateur ou de l'entreprise
    const urlObj = new URL(url)
    const path = urlObj.pathname
    
    if (path.includes("/posts/")) {
      // ex: /posts/adrien-donot_activity-123...
      const parts = path.split("/posts/")
      if (parts[1]) {
        const slug = parts[1].split("_")[0]
        return `Post de ${slug.replace(/-/g, " ")}`
      }
    } else if (path.includes("/feed/update/")) {
      return "Post LinkedIn"
    } else if (path.includes("/in/")) {
      const parts = path.split("/in/")
      if (parts[1]) {
        const slug = parts[1].split("/")[0]
        return `Profil de ${slug.replace(/-/g, " ")}`
      }
    }
    
    return "Post LinkedIn"
  } catch (e) {
    return "Lien LinkedIn"
  }
}

// Fonction utilitaire pour décoder les entités HTML (ex: &quot; -> ")
const decodeHTMLEntities = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
}

export function LinkedinCard({ element, onUpdate }: LinkedinCardProps) {
  const [isEditingLink, setIsEditingLink] = useState(!element.embedUrl)
  const [inputValue, setInputValue] = useState(element.embedUrl || "")
  const [isLoading, setIsLoading] = useState(false)

  // Gestion du titre personnalisé
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(element.customTitle || element.title || "")

  // Récupérer les métadonnées au chargement ou changement d'URL
  useEffect(() => {
    const loadMetadata = async () => {
      if (element.embedUrl && (!element.title || !element.description || !element.imageUrl)) {
        setIsLoading(true)
        try {
          const metadata = await fetchUrlMetadata(element.embedUrl)
          if (metadata) {
            // Nettoyage du titre pour ne garder que le texte du post si possible
            let cleanTitle = metadata.title;
            
            // Si le titre commence par l'auteur (doublon), on le retire
            if (metadata.author && cleanTitle.startsWith(metadata.author)) {
                cleanTitle = cleanTitle.replace(metadata.author, '').trim();
                // Retire les séparateurs communs
                cleanTitle = cleanTitle.replace(/^( on LinkedIn: | sur LinkedIn : | : | - )/, '');
            }

            // Nettoyage résiduel
            cleanTitle = cleanTitle
              .replace(/ \| LinkedIn$/, '')
              .replace(/ sur LinkedIn : .*$/, '')
              .replace(/Post de .*? \| /, '')
            
            const decodedTitle = decodeHTMLEntities(cleanTitle)
            const decodedDesc = decodeHTMLEntities(element.description || metadata.description || "")

            onUpdate({
              ...element,
              title: decodedTitle,
              description: decodedDesc,
              imageUrl: element.imageUrl || metadata.image,
              favicon: element.favicon || metadata.favicon,
              // On ne garde le titre que dans un seul endroit pour éviter la répétition
              customTitle: element.customTitle || decodedTitle,
              author: element.author || metadata.author
            })
            if (!element.customTitle && !element.title) {
              setTitleValue(decodedTitle)
            }
          }
        } catch (e) {
          console.error("Erreur chargement metadata LinkedIn", e)
        } finally {
          setIsLoading(false)
        }
      }
    }
    
    loadMetadata()
  }, [element.embedUrl])

  const handleLinkSubmit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (inputValue.trim()) {
      // Reset metadata on URL change
      onUpdate({
        ...element,
        embedUrl: inputValue,
        title: undefined,
        description: undefined,
        imageUrl: undefined,
        favicon: undefined,
        customTitle: undefined,
        author: undefined
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
          placeholder="Collez le lien LinkedIn ici..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLinkSubmit()
            if (e.key === "Escape") setIsEditingLink(false)
          }}
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

  // Choix du contenu à afficher : pour LinkedIn on se base UNIQUEMENT sur la description
  // (le body du post), pour éviter tout doublon avec le title.
  const mainText = element.description || element.customTitle || element.title

  return (
    <div className="drag-handle rounded-xl shadow-sm bg-white border border-gray-300 w-[400px] overflow-hidden cursor-grab active:cursor-grabbing group hover:shadow-md transition-shadow flex flex-col font-sans text-sm text-[rgba(0,0,0,0.9)]">
      
      {/* Bouton d’édition du lien (Overlay en haut à droite) */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-6 w-6 bg-white/90 backdrop-blur shadow-sm hover:bg-white"
          onClick={(e) => {
             e.stopPropagation()
             setIsEditingLink(true)
          }}
        >
          <Edit2 className="w-3 h-3 text-gray-600" />
        </Button>
      </div>

      {/* Contenu du post (texte unique) */}
      <div className="px-3 pt-3 pb-2">
          {isEditingTitle ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit()
                e.stopPropagation()
              }}
              autoFocus
              className="text-sm mb-2"
            />
          ) : (
            <div 
                className="mb-1 cursor-text"
                onClick={(e) => {
                    e.stopPropagation()
                    setTitleValue(mainText || "")
                    setIsEditingTitle(true)
                }}
            >
                <p className="text-sm whitespace-pre-wrap break-words" dir="ltr">
                    {mainText || (isLoading ? "Chargement..." : "Voir ce post sur LinkedIn")}
                </p>
            </div>
          )}
      </div>

      {/* Media Content (Image/Link Preview) */}
      {element.imageUrl ? (
        <div className="w-full bg-[#eef3f8] border-t border-gray-100">
          <img 
            src={element.imageUrl} 
            alt="Post media" 
            className="w-full h-auto object-contain max-h-[400px]"
            draggable={false}
          />
        </div>
      ) : (
        <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
            Media indisponible
        </div>
      )}

      {/* Footer simplified: Open button only */}
      <div className="px-2 py-2 flex items-center justify-center border-t border-gray-100 bg-gray-50/50">
         <Button 
            variant="ghost" 
            size="sm" 
            className="w-full gap-2 text-[#0a66c2] font-semibold hover:bg-blue-50 rounded py-1 h-8 text-sm"
            onClick={() => window.open(element.embedUrl, '_blank')}
         >
            <ExternalLink className="w-4 h-4" />
            <span>Voir le post original sur LinkedIn</span>
         </Button>
      </div>
    </div>
  )
}


