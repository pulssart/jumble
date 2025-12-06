"use client"

import React, { useState } from "react"
import { FigmaElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface FigmaCardProps {
  element: FigmaElement
  onUpdate: (element: FigmaElement) => void
}

export function FigmaCard({ element, onUpdate }: FigmaCardProps) {
  const [isEditing, setIsEditing] = useState(!element.url)
  const [inputValue, setInputValue] = useState(element.url || "")

  const handleSubmit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (inputValue.includes("figma.com")) {
      onUpdate({
        ...element,
        url: inputValue,
      })
      setIsEditing(false)
    } else {
      alert("Veuillez entrer une URL Figma valide (figma.com/file/...)")
    }
  }

  if (isEditing) {
    return (
      <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[300px]">
        <Input
          type="text"
          placeholder="URL du fichier Figma"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
            if (e.key === "Escape") setIsEditing(false)
          }}
          className="mb-2"
        />
        <div className="flex gap-2">
          <Button 
            onClick={handleSubmit} 
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
              setIsEditing(false)
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

  const embedUrl = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(element.url)}`

  return (
    <div className="rounded-xl shadow-lg bg-white border border-gray-200 overflow-hidden">
      <div className="relative w-[450px] h-[300px] group">
        <iframe
          style={{ border: "1px solid rgba(0, 0, 0, 0.1)" }}
          width="450"
          height="300"
          src={embedUrl}
          allowFullScreen
          className="w-full h-full"
        />
      </div>
      <div className="p-2 text-center bg-white drag-handle cursor-grab active:cursor-grabbing">
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Modifier le lien Figma
        </button>
      </div>
    </div>
  )
}

