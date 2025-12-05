"use client"

import React, { useState, useRef, useEffect } from "react"
import { TextElement } from "@/types/canvas"
import { useLanguage } from "@/lib/language"

interface TextCardProps {
  element: TextElement
  onUpdate: (element: TextElement) => void
}

export function TextCard({ element, onUpdate }: TextCardProps) {
  const { language } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(element.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)

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
  }, [element.width, element.height, isResizing])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
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

  return (
    <div 
      ref={containerRef}
      className={`${isEditing ? "" : "drag-handle"} rounded-xl shadow-lg bg-white border border-gray-200 p-4 relative group`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        // Désactiver la transition pendant le redimensionnement pour plus de fluidité
        transition: (isEditing || isResizing) ? 'none' : 'width 0.1s, height 0.1s'
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
          className="w-full h-full resize-none border-none outline-none focus:ring-0 bg-transparent text-sm"
          style={{ minHeight: '100%' }}
        />
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="cursor-text whitespace-pre-wrap text-sm text-gray-800 h-full overflow-auto"
        >
          {content || (language === "fr" ? "Cliquez pour éditer..." : "Click to edit...")}
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
