"use client"

import React, { useState, useRef, useEffect } from "react"
import Draggable from "react-draggable"
import { CanvasElement } from "@/types/canvas"
import { ImageCard } from "./elements/ImageCard"
import { TextCard } from "./elements/TextCard"
import { TaskCard } from "./elements/TaskCard"
import { PostItCard } from "./elements/PostItCard"
import { YoutubeCard } from "./elements/YoutubeCard"
import { SpotifyCard } from "./elements/SpotifyCard"
import { FigmaCard } from "./elements/FigmaCard"
import { NotionCard } from "./elements/NotionCard"
import { LinearCard } from "./elements/LinearCard"
import { LinkedinCard } from "./elements/LinkedinCard"
import { TwitterCard } from "./elements/TwitterCard"
import { LinkCard } from "./elements/LinkCard"
import { PromptCard } from "./elements/PromptCard"
import { WebcamCard } from "./elements/WebcamCard"
import { GifCard } from "./elements/GifCard"
import { ClockCard } from "./elements/ClockCard"
import { AppleMusicCard } from "./elements/AppleMusicCard"
import { X, Copy, Trash2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"

interface CanvasElementProps {
  element: CanvasElement
  isSelected?: boolean
  selectionCount?: number
  isConnected?: boolean
  isConnecting?: boolean
  isFocused?: boolean
  isDimmed?: boolean
  onUpdate: (element: CanvasElement) => void
  onDelete: (id: string) => void
  onDeleteSelection?: () => void
  onBringToFront: (id: string) => void
  onSelect?: (id: string, multi: boolean) => void
  onOrganizeSelection?: () => void
  getSnappingPosition: (id: string, x: number, y: number) => { x: number; y: number; snappedX?: number | null; snappedY?: number | null }
  onSnap?: (lines: { x: number | null; y: number | null; activeX?: number; activeY?: number }) => void
  onDrag?: (id: string, x: number, y: number) => void
  onAIAction?: (id: string, content: string, actionType: 'ideas' | 'tasks' | 'image') => void
  onConnectStart: (elementId: string, x: number, y: number) => void
  onConnectEnd: (elementId: string) => void
  onRunPrompt: (id: string) => void
  onFocusElement?: (id: string) => void
  scale: number
}

export const CanvasElementComponent = React.memo(function CanvasElementComponent({
  element,
  isSelected = false,
  selectionCount = 0,
  isConnected = true,
  isConnecting = false,
  isFocused = false,
  isDimmed = false,
  onUpdate,
  onDelete,
  onDeleteSelection,
  onBringToFront,
  onSelect,
  onOrganizeSelection,
  getSnappingPosition,
  onSnap,
  onDrag: onDragProp,
  onAIAction,
  onConnectStart,
  onConnectEnd,
  onRunPrompt,
  onFocusElement,
  scale,
}: CanvasElementProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [currentPos, setCurrentPos] = useState(element.position)
  const nodeRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  // Observer la taille réelle de l'élément pour ajuster les câbles
  useEffect(() => {
    if (!nodeRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        // On utilise offsetWidth/Height pour avoir la taille bordures incluses sans transformations
        const newW = el.offsetWidth
        const newH = el.offsetHeight

        // On ne met à jour que si la différence est significative (> 2px) pour éviter les boucles
        // et seulement si les dimensions stockées sont différentes
        if (
           Math.abs(newW - (element.width || 0)) > 2 || 
           Math.abs(newH - (element.height || 0)) > 2
        ) {
           // Utilisation de requestAnimationFrame pour ne pas bloquer le rendu
           requestAnimationFrame(() => {
               onUpdate({
                 ...element,
                 width: newW,
                 height: newH
               })
           })
        }
      }
    })

    resizeObserver.observe(nodeRef.current)

    return () => resizeObserver.disconnect()
  }, [element, onUpdate])

  useEffect(() => {
    if (!isDragging) {
      setCurrentPos(element.position)
    }
  }, [element.position, isDragging])

  const handleStart = (e: any, data: { x: number; y: number }) => {
    setIsDragging(true)
    dragStartPosRef.current = { x: element.position.x, y: element.position.y }
    dragCurrentPosRef.current = { x: data.x, y: data.y }
    onBringToFront(element.id)
    // Selection logic
    if (onSelect) {
        // e.shiftKey permet la multiselection clic par clic
        onSelect(element.id, e.shiftKey)
    }
  }

  const handleStop = (e: any, data: { x: number; y: number }) => {
    setIsDragging(false)
    
    if (innerRef.current) {
      innerRef.current.style.setProperty('--tw-rotate', "0deg")
    }
    
    const isSnappingEnabled = e.altKey
    let finalPos = { x: data.x, y: data.y }
    
    if (isSnappingEnabled) {
      const snapped = getSnappingPosition(element.id, data.x, data.y)
      finalPos = { x: snapped.x, y: snapped.y }
      // Mettre à jour la position visuelle pour le snapping
      setCurrentPos(finalPos)
    }
    
    // Mettre à jour la position finale dans l'état (seulement à la fin du drag)
    onUpdate({
      ...element,
      position: finalPos,
    })
    
    // Mettre à jour aussi via onDragProp pour synchroniser les éléments sélectionnés
    // C'est la SEULE fois qu'on met à jour pendant le drag
    if (onDragProp && dragStartPosRef.current) {
      const dx = finalPos.x - dragStartPosRef.current.x
      const dy = finalPos.y - dragStartPosRef.current.y
      onDragProp(element.id, finalPos.x, finalPos.y)
    }
    
    dragStartPosRef.current = null
    dragCurrentPosRef.current = null
    onSnap?.({ x: null, y: null })
  }

  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const dragCurrentPosRef = useRef<{ x: number; y: number } | null>(null)
  
  const handleDrag = (e: any, data: { x: number; y: number; deltaX: number }) => {
    const isSnappingEnabled = e.altKey

    // Rotation basée sur la vélocité (deltaX) - manipulation DOM directe, pas de re-render
    if (innerRef.current) {
      const rotation = Math.max(-10, Math.min(10, data.deltaX * 0.4))
      innerRef.current.style.setProperty('--tw-rotate', `${rotation}deg`)
    }

    // Stocker la position actuelle dans une ref (pas de re-render)
    dragCurrentPosRef.current = { x: data.x, y: data.y }

    // Pour le snapping, on doit mettre à jour la position visuelle
    if (isSnappingEnabled) {
      const snapped = getSnappingPosition(element.id, data.x, data.y)
      setCurrentPos({ x: snapped.x, y: snapped.y })
      onSnap?.({ 
        x: snapped.snappedX ?? null, 
        y: snapped.snappedY ?? null,
        activeX: snapped.x,
        activeY: snapped.y
      })
    } else {
      // Sans snapping, on laisse react-draggable gérer la position visuelle
      // Pas besoin de setCurrentPos - react-draggable utilise déjà les transforms CSS
      onSnap?.({ x: null, y: null })
    }

    // Appeler onDragProp pour permettre le déplacement des autres éléments sélectionnés
    // On utilise requestAnimationFrame pour ne pas bloquer le thread principal
    if (onDragProp && isSelected && selectionCount > 1) {
        requestAnimationFrame(() => {
            onDragProp(element.id, data.x, data.y)
        })
    }
  }

  const renderElement = () => {
    switch (element.type) {
      case "image":
        return <ImageCard element={element} onUpdate={onUpdate} />
      case "text":
        return <TextCard element={element} onUpdate={onUpdate} />
      case "task":
        return <TaskCard element={element} onUpdate={onUpdate} />
      case "postit":
        return <PostItCard element={element} onUpdate={onUpdate} onAIAction={onAIAction} />
      case "youtube":
        return <YoutubeCard element={element} onUpdate={onUpdate} />
      case "spotify":
        return <SpotifyCard element={element} onUpdate={onUpdate} />
      case "figma":
        return <FigmaCard element={element} onUpdate={onUpdate} />
      case "notion":
        return <NotionCard element={element} onUpdate={onUpdate} />
      case "linear":
        return <LinearCard element={element} onUpdate={onUpdate} />
      case "linkedin":
        return <LinkedinCard element={element} onUpdate={onUpdate} />
      case "twitter":
        return <TwitterCard element={element} onUpdate={onUpdate} />
      case "link":
        return <LinkCard element={element} onUpdate={onUpdate} />
      case "prompt":
        return <PromptCard element={element} onUpdate={onUpdate} onRun={onRunPrompt} />
      case "webcam":
        return <WebcamCard element={element} onUpdate={onUpdate} />
      case "gif":
        return <GifCard element={element} onUpdate={onUpdate} />
      case "clock":
        return <ClockCard element={element} onUpdate={onUpdate} />
      case "applemusic":
        return <AppleMusicCard element={element} onUpdate={onUpdate} />
      default:
        return null
    }
  }

  const handleCopy = () => {
    let textToCopy = ""
    switch (element.type) {
      case "image": textToCopy = element.src || ""; break;
      case "gif": textToCopy = element.src || ""; break;
      case "youtube": textToCopy = `https://www.youtube.com/watch?v=${element.videoId}`; break;
      case "twitter": textToCopy = `https://twitter.com/x/status/${element.tweetId}`; break;
      case "link": textToCopy = element.url || ""; break;
      case "figma": textToCopy = element.url || ""; break;
      case "notion": textToCopy = (element as any).embedUrl || ""; break;
      case "linear": textToCopy = (element as any).embedUrl || ""; break;
      case "linkedin": textToCopy = (element as any).embedUrl || ""; break;
      case "spotify": textToCopy = element.spotifyUri || ""; break;
      case "applemusic": textToCopy = (element as any).url || ""; break;
      case "text": textToCopy = element.content || ""; break;
      case "postit": textToCopy = element.content || ""; break;
      case "task": textToCopy = (element as any).title || ""; break;
      case "prompt": textToCopy = element.content || ""; break;
      case "clock": textToCopy = (element as any).timezone || ""; break;
    }
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
    }
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={currentPos}
      onStart={handleStart}
      onDrag={handleDrag}
      onStop={handleStop}
      handle=".drag-handle"
      scale={scale}
    >
      <div
        ref={nodeRef}
        data-id={element.id}
        className={`absolute canvas-element ${
          isDragging ? "cursor-grabbing" : "cursor-default transition-all duration-200"
        }`}
        style={{
          zIndex: isDragging ? 999999 : (element.zIndex || 1),
          willChange: isDragging ? "transform" : "auto",
          opacity: isFocused ? 1 : isDimmed ? 0.15 : (isConnected || isHovered ? 1 : 0.3),
          filter: isFocused
            ? "none"
            : isDimmed
              ? "blur(6px) brightness(0.5)"
              : (isConnected || isConnecting || isHovered ? "none" : "blur(5px)"),
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => e.stopPropagation()} // Empêche de déclencher le drag du canvas
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div 
              ref={innerRef}
              className={`relative group rounded-xl ${
                isDragging
                  ? "scale-105 shadow-2xl pointer-events-none"
                  : isFocused
                    ? "scale-[1.02] shadow-2xl transition-all duration-200"
                    : "transition-all duration-200"
              } ${isSelected && !isFocused ? "ring-2 ring-blue-500 ring-offset-4 shadow-lg" : ""}`}
            >
              {renderElement()}
              
              {isHovered && !isDragging && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(element.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}

              {/* Port de sortie (droite) - Sur tous les éléments */}
              <div 
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full cursor-crosshair hover:border-blue-500 hover:scale-125 hover:bg-blue-50 transition-all z-50 opacity-0 group-hover:opacity-100 shadow-sm"
                title="Tirer un câble"
                onMouseDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault() // Empêche la sélection texte
                  const rect = e.currentTarget.getBoundingClientRect()
                  onConnectStart(element.id, rect.x + rect.width/2, rect.y + rect.height/2)
                }}
              />

              {/* Port d'entrée (gauche) - Sur tous les éléments */}
              <div 
                className={`absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full cursor-crosshair hover:scale-125 transition-all z-50 shadow-sm opacity-0 group-hover:opacity-100 ${
                  element.type === 'prompt' 
                    ? 'bg-yellow-400 border-gray-600 opacity-100' // Toujours visible pour Prompt
                    : 'bg-white border-gray-400 hover:border-blue-500 hover:bg-blue-50' 
                }`}
                title="Connecter une entrée"
                onMouseUp={(e) => {
                  e.stopPropagation()
                  onConnectEnd(element.id)
                }}
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            {isSelected && selectionCount > 1 ? (
              <>
                <ContextMenuItem onClick={onOrganizeSelection}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Organiser la pile
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50" 
                  onClick={onDeleteSelection}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer la sélection ({selectionCount})
                </ContextMenuItem>
              </>
            ) : (
              <>
                <ContextMenuItem onClick={() => onFocusElement?.(element.id)}>
                  Focus sur cette carte
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copier l'URL/Contenu
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50" 
                  onClick={() => onDelete(element.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </Draggable>
  )
})
