"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Folder, GripVertical, Maximize2, Minimize2, Pencil } from "lucide-react"
import { GroupElement } from "@/types/canvas"

interface GroupCardProps {
  element: GroupElement
  onUpdate: (updated: GroupElement) => void
}

export function GroupCard({ element, onUpdate }: GroupCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(element.title || "Groupe")

  useEffect(() => {
    setTitle(element.title || "Groupe")
  }, [element.title])

  const collapsedSize = element.collapsedSize ?? 160
  const width = useMemo(
    () => (element.collapsed ? collapsedSize : Math.max(120, element.width || 420)),
    [element.collapsed, element.width, collapsedSize]
  )
  const height = useMemo(
    () => (element.collapsed ? collapsedSize : Math.max(80, element.height || 260)),
    [element.collapsed, element.height, collapsedSize]
  )

  const commit = () => {
    const nextTitle = (title || "").trim() || "Groupe"
    setIsEditing(false)
    if (nextTitle !== (element.title || "")) {
      onUpdate({ ...element, title: nextTitle })
    }
  }

  const toggleCollapsed = () => {
    const nextCollapsed = !element.collapsed
    onUpdate({
      ...element,
      collapsed: nextCollapsed,
      collapsedSize,
      ...(nextCollapsed ? { width: collapsedSize, height: collapsedSize } : {}),
    })
  }

  return (
    <div
      className={`relative rounded-2xl border border-black/10 bg-black/10 backdrop-blur-xl shadow-sm ${
        element.collapsed ? "hover:shadow-md drag-handle cursor-grab active:cursor-grabbing group/folder" : ""
      }`}
      style={{ width, height }}
      onDoubleClick={() => {
        if (element.collapsed) toggleCollapsed()
      }}
    >
      {element.collapsed ? (
        <>
          {/* Contenu folder : drag sur toute la surface via `.drag-handle` sur le container */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Folder className="w-20 h-20 text-black/40" />
            <div className="mt-2 px-3 text-center text-sm font-medium text-black/70 truncate max-w-[140px]">
              {element.title || "Groupe"}
            </div>
          </div>

          {/* Bouton maximiser (sans header) - visible au hover uniquement */}
          <button
            type="button"
            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/60 text-black/70 hover:text-black hover:bg-white/80 border border-black/10 shadow-sm opacity-0 group-hover/folder:opacity-100 transition-opacity"
            title="Agrandir"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              toggleCollapsed()
            }}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="absolute left-0 right-0 top-0 flex items-center gap-2 px-3 py-2">
          <div
            className="drag-handle flex items-center justify-center w-7 h-7 rounded-md bg-black/10 hover:bg-black/15 cursor-grab active:cursor-grabbing"
            title="Déplacer le groupe"
          >
            <GripVertical className="w-4 h-4 text-black/60" />
          </div>

          {isEditing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit()
                if (e.key === "Escape") {
                  setTitle(element.title || "Groupe")
                  setIsEditing(false)
                }
              }}
              autoFocus
              className="flex-1 min-w-0 bg-white/70 border border-black/10 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              type="button"
              className="flex-1 min-w-0 text-left text-sm font-medium text-black/80 truncate hover:text-black"
              title="Renommer"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
            >
              {element.title || "Groupe"}
            </button>
          )}

          {!isEditing && (
            <button
              type="button"
              className="p-1.5 rounded-md text-black/60 hover:text-black hover:bg-black/10"
              title="Renommer"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            className="p-1.5 rounded-md text-black/60 hover:text-black hover:bg-black/10"
            title="Minimiser"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              toggleCollapsed()
            }}
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Zone de fond uniquement */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none" />
    </div>
  )
}


