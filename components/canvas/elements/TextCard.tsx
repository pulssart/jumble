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

  return (
    <div 
      className={`${isEditing ? "" : "drag-handle"} rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[200px] max-w-md`}
      style={{
        width: element.width || undefined,
        height: element.height || undefined,
        transition: isEditing ? 'none' : 'width 0.1s, height 0.1s'
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
          rows={Math.max(3, content.split("\n").length)}
        />
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="cursor-text whitespace-pre-wrap text-sm text-gray-800"
        >
          {content || (language === "fr" ? "Cliquez pour éditer..." : "Click to edit...")}
        </div>
      )}
    </div>
  )
}

