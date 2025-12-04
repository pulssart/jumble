"use client"

import React, { useState, useRef, useEffect } from "react"
import { PostItElement } from "@/types/canvas"
import { GripHorizontal, Sparkles, Loader2, Image as ImageIcon, CheckSquare } from "lucide-react"
import { useLanguage } from "@/lib/language"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PostItCardProps {
  element: PostItElement
  onUpdate: (element: PostItElement) => void
  onAIAction?: (id: string, content: string, actionType: 'ideas' | 'tasks' | 'image') => void
}

const colorClasses = {
  yellow: "bg-yellow-200 border-yellow-300",
  pink: "bg-pink-200 border-pink-300",
  blue: "bg-blue-200 border-blue-300",
  green: "bg-green-200 border-green-300",
  purple: "bg-purple-200 border-purple-300",
}

export function PostItCard({ element, onUpdate, onAIAction }: PostItCardProps) {
  const { language } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(element.content)
  const [isGenerating, setIsGenerating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const color = element.color || "yellow"
  
  // Dimensions locales pour la fluidité
  const [dimensions, setDimensions] = useState({
    width: element.width || 220,
    height: element.height || 220
  })

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    onUpdate({
      ...element,
      content,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleBlur()
    }
    if (e.key === "Escape") {
      setContent(element.content)
      setIsEditing(false)
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
      const newWidth = Math.max(150, startWidth + (moveEvent.clientX - startX))
      const newHeight = Math.max(150, startHeight + (moveEvent.clientY - startY))
      
      setDimensions({ width: newWidth, height: newHeight })
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      
      // Sauvegarder la taille finale
      onUpdate({
        ...element,
        width: Math.max(150, startWidth + (window.event as MouseEvent).clientX - startX),
        height: Math.max(150, startHeight + (window.event as MouseEvent).clientY - startY)
      })
    };

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleAIActionClick = async (type: 'ideas' | 'tasks' | 'image') => {
    if (!content || content.trim().length < 3) {
      alert(language === "fr" ? "Écrivez quelque chose avant de lancer l'IA !" : "Write something before launching AI!")
      return
    }
    
    setIsGenerating(true)
    await onAIAction?.(element.id, content, type)
    setIsGenerating(false)
  }

  return (
    <div
      ref={cardRef}
      className={`drag-handle rounded-xl shadow-lg border-2 p-4 flex flex-col relative group cursor-move ${colorClasses[color]}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transition: isEditing ? 'none' : 'width 0.1s, height 0.1s' // Transition douce sauf en édit
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full h-full resize-none border-none outline-none focus:ring-0 bg-transparent text-sm cursor-text"
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          onMouseDown={(e) => e.stopPropagation()}
          className="cursor-text whitespace-pre-wrap text-sm text-gray-800 h-full w-full overflow-y-auto no-scrollbar"
        >
          {content || (language === "fr" ? "Cliquez pour écrire..." : "Click to write...")}
        </div>
      )}

      {/* Bouton Magic IA */}
      {onAIAction && !isEditing && (
         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    onMouseDown={(e) => e.stopPropagation()} // Important pour ne pas drag
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAIActionClick('ideas')}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Idées similaires" : "Similar ideas"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAIActionClick('tasks')}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Plan d'action (Tâches)" : "Action plan (Tasks)"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAIActionClick('image')}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {language === "fr" ? "Générer une image" : "Generate an image"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
         </div>
       )}

      {/* Poignée de redimensionnement */}
      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
        onMouseDown={handleResizeStart}
      >
        <div className="w-2 h-2 bg-gray-400/50 rounded-sm" />
      </div>
    </div>
  )
}

