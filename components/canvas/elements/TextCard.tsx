"use client"

import React, { useState, useRef, useEffect } from "react"
import { TextElement } from "@/types/canvas"
import { useLanguage } from "@/lib/language"
import { Sparkles, Loader2, FileText, CheckSquare, Image as ImageIcon, Copy, Check, AlignLeft } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TextCardProps {
  element: TextElement
  onUpdate: (element: TextElement) => void
  onAIAction?: (id: string, content: string, actionType: 'summary-with-action' | 'summary' | 'tasks' | 'image' | 'format') => void
}

export function TextCard({ element, onUpdate, onAIAction }: TextCardProps) {
  const { language } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(element.content)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCopyToast, setShowCopyToast] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const isInitializedRef = useRef(false)

  // Dimensions locales pour la fluidité
  const [dimensions, setDimensions] = useState({
    width: element.width || 300,
    height: element.height || 150
  })

  // Mettre à jour l'état local si les props changent
  useEffect(() => {
    if (element.width && element.height && !isResizing) {
      setDimensions({ width: element.width, height: element.height })
    }
    // Mettre à jour le contenu si l'élément change depuis l'extérieur
    if (element.content !== content && !isEditing) {
      setContent(element.content)
    }
  }, [element.width, element.height, element.content, isResizing, isEditing])

  useEffect(() => {
    if (isEditing && editorRef.current) {
      // Initialiser le contenu HTML seulement la première fois qu'on passe en mode édition
      if (!isInitializedRef.current) {
        editorRef.current.innerHTML = content || ""
        isInitializedRef.current = true
        
        editorRef.current.focus()
        // Sélectionner tout le contenu au début de l'édition
        const range = document.createRange()
        range.selectNodeContents(editorRef.current)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      } else {
        editorRef.current.focus()
      }
    } else {
      // Réinitialiser le flag quand on sort du mode édition
      isInitializedRef.current = false
    }
  }, [isEditing, content])

  const handleBlur = () => {
    setIsEditing(false)
    // Récupérer le contenu HTML de l'éditeur
    const htmlContent = editorRef.current?.innerHTML || ""
    setContent(htmlContent)
    onUpdate({
      ...element,
      content: htmlContent,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd+B ou Ctrl+B pour mettre en gras
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault()
      e.stopPropagation()
      
      // Utiliser document.execCommand pour appliquer le formatage en gras
      document.execCommand("bold", false)
      return
    }
    
    if (e.key === "Enter" && e.ctrlKey) {
      handleBlur()
    }
    if (e.key === "Escape") {
      setContent(element.content)
      setIsEditing(false)
    }
  }

  const handleInput = () => {
    // Mettre à jour le contenu à chaque changement
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
  }

  // Gestion du redimensionnement libre (optimisé)
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = dimensions.width
    const startHeight = dimensions.height
    const container = containerRef.current
    let rafId: number | null = null
    let pendingUpdate: { width: number; height: number } | null = null

    const updateDimensions = () => {
      if (pendingUpdate && container) {
        // Mise à jour directe du DOM pour éviter les re-renders React
        container.style.width = `${pendingUpdate.width}px`
        container.style.height = `${pendingUpdate.height}px`
        setDimensions(pendingUpdate)
        pendingUpdate = null
      }
      rafId = null
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(200, startWidth + (moveEvent.clientX - startX))
      const newHeight = Math.max(100, startHeight + (moveEvent.clientY - startY))
      
      pendingUpdate = { width: newWidth, height: newHeight }
      
      // Utiliser requestAnimationFrame pour optimiser les performances
      if (!rafId) {
        rafId = requestAnimationFrame(updateDimensions)
      }
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      
      // Appliquer la dernière mise à jour
      if (pendingUpdate && container) {
        container.style.width = `${pendingUpdate.width}px`
        container.style.height = `${pendingUpdate.height}px`
        setDimensions(pendingUpdate)
      }
      
      const finalWidth = Math.max(200, startWidth + (upEvent.clientX - startX))
      const finalHeight = Math.max(100, startHeight + (upEvent.clientY - startY))
      
      setIsResizing(false)
      
      // Sauvegarder la taille finale
      onUpdate({
        ...element,
        width: finalWidth,
        height: finalHeight
      })
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleAIActionClick = async (type: 'summary-with-action' | 'summary' | 'tasks' | 'image' | 'format') => {
    // Extraire le texte brut du contenu HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content || ""
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    
    if (!textContent || textContent.trim().length < 3) {
      alert(language === "fr" ? "Écrivez quelque chose avant de lancer l'IA !" : "Write something before launching AI!")
      return
    }
    
    setIsGenerating(true)
    await onAIAction?.(element.id, textContent, type)
    setIsGenerating(false)
  }

  const handleCopy = async () => {
    // Extraire le texte brut du contenu HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content || ""
    const textContent = tempDiv.textContent || tempDiv.innerText || ""
    
    if (!textContent || textContent.trim().length === 0) {
      return
    }
    
    try {
      await navigator.clipboard.writeText(textContent)
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), 2000)
    } catch (err) {
      console.error('Erreur lors de la copie:', err)
    }
  }

  return (
    <div 
      ref={containerRef}
      className={`${isEditing ? "" : "drag-handle"} rounded-xl shadow-lg bg-white border p-4 relative group ${
        isGenerating 
          ? "border-purple-500" 
          : "border-gray-200"
      }`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        // Désactiver la transition pendant le redimensionnement pour plus de fluidité
        transition: (isEditing || isResizing) ? 'none' : 'width 0.1s, height 0.1s',
        ...(isGenerating && {
          animation: 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        })
      }}
    >
      {isEditing ? (
        <div
          ref={editorRef}
          contentEditable
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full h-full resize-none border-none outline-none focus:ring-0 bg-transparent text-sm text-gray-800"
          style={{ minHeight: '100%' }}
          suppressContentEditableWarning
        />
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="cursor-text text-sm text-gray-800 h-full overflow-auto [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:first:mt-0 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:first:mt-0 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-2 [&_h3]:first:mt-0 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p:leading-relaxed] [&_strong]:font-bold [&_em]:italic [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2 [&_ul]:mt-2 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2 [&_ol]:mt-2 [&_li]:mb-1 [&_li]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content || (language === "fr" ? "Cliquez pour éditer..." : "Click to edit...") }}
        />
      )}

      {/* Boutons Magic IA et Copy */}
      {!isEditing && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex flex-col gap-2">
          {onAIAction && (
            <>
              {isGenerating ? (
                <div className="p-1.5 rounded-full bg-white/80 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1.5 rounded-full bg-white/50 hover:bg-white/80 text-purple-600 transition-colors shadow-sm"
                      title={language === "fr" ? "Générer avec l'IA" : "Generate with AI"}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleAIActionClick('summary-with-action')}>
                      <FileText className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Résume avec plan d'action" : "Summary with action plan"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAIActionClick('summary')}>
                      <FileText className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Résume" : "Summary"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAIActionClick('tasks')}>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Tâches" : "Tasks"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAIActionClick('image')}>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Génère une image" : "Generate an image"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAIActionClick('format')}>
                      <AlignLeft className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Formate le texte" : "Format text"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
          <button
            className="p-1.5 rounded-full bg-white/50 hover:bg-white/80 text-gray-700 transition-colors shadow-sm"
            title={language === "fr" ? "Copier le texte" : "Copy text"}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleCopy}
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toast de confirmation */}
      {showCopyToast && (
        <div className="fixed top-4 right-4 z-[9999] bg-black text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-5 fade-in-0 duration-300">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">
            {language === "fr" ? "Texte copié !" : "Text copied!"}
          </span>
        </div>
      )}

      {/* Poignée de redimensionnement */}
      {!isEditing && (
        <div
          className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity z-20"
          onMouseDown={handleResizeStart}
        >
          <div className="w-2 h-2 bg-gray-400/50 rounded-sm" />
        </div>
      )}
    </div>
  )
}
