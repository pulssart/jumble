"use client"

import React, { useState } from "react"
import { TaskElement } from "@/types/canvas"
import { Check, Square } from "lucide-react"

interface TaskCardProps {
  element: TaskElement
  onUpdate: (element: TaskElement) => void
}

export function TaskCard({ element, onUpdate }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(element.title)

  const handleToggle = () => {
    onUpdate({
      ...element,
      completed: !element.completed,
    })
  }

  const handleBlur = () => {
    setIsEditing(false)
    onUpdate({
      ...element,
      title,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur()
    }
    if (e.key === "Escape") {
      setTitle(element.title)
      setIsEditing(false)
    }
  }

  return (
    <div className={`${isEditing ? "" : "drag-handle"} rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[250px] max-w-md`}>
      <div className="flex items-start gap-3">
        <button
          onClick={handleToggle}
          onMouseDown={(e) => e.stopPropagation()}
          className="mt-0.5 flex-shrink-0"
          type="button"
        >
          {element.completed ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <Square className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex-1 border-none outline-none focus:ring-0 bg-transparent text-sm"
            autoFocus
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex-1 cursor-text text-sm ${
              element.completed
                ? "line-through text-gray-500"
                : "text-gray-800"
            }`}
          >
            {title || "Nouvelle tâche..."}
          </div>
        )}
      </div>
    </div>
  )
}

