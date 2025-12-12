"use client"

import React, { useState, useRef, useEffect } from "react"
import Draggable from "react-draggable"
import { CanvasElement, GroupElement } from "@/types/canvas"
import { ActionType } from "@/types/action"
import { useLanguage } from "@/lib/language"
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
import { InstagramCard } from "./elements/InstagramCard"
import { GoogleMapsCard } from "./elements/GoogleMapsCard"
import { WeatherCard } from "./elements/WeatherCard"
import { StockCard } from "./elements/StockCard"
import { CryptoCard } from "./elements/CryptoCard"
import { RSSCard } from "./elements/RSSCard"
import { GroupCard } from "./elements/GroupCard"
import { X, Copy, Trash2, Wand2, FolderPlus, FolderMinus, MoveDiagonal2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"

interface CanvasElementProps {
  element: CanvasElement
  forcedZIndex?: number
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
  onGroupSelection?: () => void
  onGroupElement?: (id: string) => void
  onUngroup?: (groupId: string) => void
  existingGroups?: { id: string; title: string }[]
  onAddToExistingGroup?: (elementId: string, groupId: string) => void
  onRemoveFromGroup?: (elementId: string) => void
  getSnappingPosition: (id: string, x: number, y: number) => { x: number; y: number; snappedX?: number | null; snappedY?: number | null }
  onSnap?: (lines: { x: number | null; y: number | null; activeX?: number; activeY?: number }) => void
  onDrag?: (id: string, x: number, y: number) => void
  onGroupDrag?: (groupId: string, x: number, y: number) => void
  onGroupDragStart?: (groupId: string) => void
  onGroupDragEnd?: () => void
  onAIAction?: (id: string, content: string, actionType: ActionType) => void
  onConnectStart: (elementId: string, x: number, y: number) => void
  onConnectEnd: (elementId: string) => void
  onRunPrompt: (id: string) => void
  onFocusElement?: (id: string) => void
  scale: number
  hasConnectedInputs?: boolean
  soundEnabled?: boolean
}

export const CanvasElementComponent = React.memo(function CanvasElementComponent({
  element,
  forcedZIndex,
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
  onGroupSelection,
  onGroupElement,
  onUngroup,
  existingGroups = [],
  onAddToExistingGroup,
  onRemoveFromGroup,
  getSnappingPosition,
  onSnap,
  onDrag: onDragProp,
  onGroupDrag,
  onGroupDragStart,
  onGroupDragEnd,
  onAIAction,
  onConnectStart,
  onConnectEnd,
  onRunPrompt,
  onFocusElement,
  scale,
  hasConnectedInputs = false,
  soundEnabled = true,
}: CanvasElementProps) {
  const { language } = useLanguage()
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizingGroup, setIsResizingGroup] = useState(false)
  const [currentPos, setCurrentPos] = useState(element.position)
  const nodeRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const groupResizeStartRef = useRef<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  // Observer la taille réelle de l'élément pour ajuster les câbles
  useEffect(() => {
    // Les groupes ont une taille pilotée par la logique (bounds des enfants / mode minimisé).
    // On évite que le ResizeObserver écrase width/height.
    if (element.type === "group") return
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

  useEffect(() => {
    if (!isResizingGroup) return

    const onMove = (e: MouseEvent) => {
      if (!groupResizeStartRef.current) return
      const start = groupResizeStartRef.current
      const dx = (e.clientX - start.x) / scale
      const dy = (e.clientY - start.y) / scale

      const minW = 180
      const minH = 120
      const newW = Math.max(minW, start.width + dx)
      const newH = Math.max(minH, start.height + dy)

      onUpdate({
        ...element,
        width: Math.round(newW),
        height: Math.round(newH),
        minWidth: Math.round(newW),
        minHeight: Math.round(newH),
      } as any)
    }

    const onUp = () => {
      setIsResizingGroup(false)
      groupResizeStartRef.current = null
    }

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [isResizingGroup, element, onUpdate, scale])

  const handleStart = (e: any, data: { x: number; y: number }) => {
    // Play sound on grab
    if (soundEnabled) {
      const audio = new Audio("/sounds/type_01.wav")
      audio.volume = 1
      audio.play().catch(e => console.error("Error playing sound:", e))
    }

    setIsDragging(true)
    dragStartPosRef.current = { x: element.position.x, y: element.position.y }
    dragCurrentPosRef.current = { x: data.x, y: data.y }
    // Un groupe doit rester en arrière-plan (fond), on évite de le mettre au premier plan
    if (element.type !== "group") {
      onBringToFront(element.id)
    } else {
      // Signaler le début du drag du groupe (pour le z-index des enfants via React)
      onGroupDragStart?.(element.id)
    }
    // Selection logic
    if (onSelect) {
        // e.shiftKey permet la multiselection clic par clic
        onSelect(element.id, e.shiftKey)
    }
  }

  const handleStop = (e: any, data: { x: number; y: number }) => {
    // Play sound on drop
    if (soundEnabled) {
      const audio = new Audio("/sounds/type_05.wav")
      audio.volume = 1
      audio.play().catch(e => console.error("Error playing sound:", e))
    }

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

    // Signaler la fin du drag du groupe (reset z-index des enfants via React)
    if (element.type === "group") {
      onGroupDragEnd?.()
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
    // Désactivé pour les groupes (pas d'effet physique)
    if (innerRef.current && element.type !== "group") {
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

    // Drag d'un groupe : déplacer visuellement ses enfants pendant le drag
    if (element.type === "group" && onGroupDrag) {
      requestAnimationFrame(() => {
        onGroupDrag(element.id, data.x, data.y)
      })
    }
  }

  const renderElement = () => {
    switch (element.type) {
      case "image":
        return <ImageCard element={element} onUpdate={onUpdate} />
      case "text":
        return <TextCard element={element} onUpdate={onUpdate} onAIAction={onAIAction} />
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
        return <PromptCard element={element} onUpdate={onUpdate} onRun={onRunPrompt} hasConnectedInputs={hasConnectedInputs} />
      case "webcam":
        return <WebcamCard element={element} onUpdate={onUpdate} />
      case "gif":
        return <GifCard element={element} onUpdate={onUpdate} />
      case "clock":
        return <ClockCard element={element} onUpdate={onUpdate} />
      case "applemusic":
        return <AppleMusicCard element={element} onUpdate={onUpdate} />
      case "instagram":
        return <InstagramCard element={element} onUpdate={onUpdate} />
      case "googlemaps":
        return <GoogleMapsCard element={element} onUpdate={onUpdate} />
      case "weather":
        return <WeatherCard element={element} onUpdate={onUpdate} />
      case "stock":
        return <StockCard element={element} onUpdate={onUpdate} />
      case "crypto":
        return <CryptoCard element={element} onUpdate={onUpdate} />
      case "rss":
        return <RSSCard element={element} onUpdate={onUpdate} />
      case "group":
        return <GroupCard element={element as GroupElement} onUpdate={(updated) => onUpdate(updated)} />
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
      case "instagram": textToCopy = (element as any).embedUrl || `https://www.instagram.com/p/${(element as any).shortcode}/`; break;
      case "googlemaps": textToCopy = (element as any).url || ""; break;
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

  const handleCopyImage = async () => {
    if (element.type !== 'image' || !element.src) return

    try {
        const response = await fetch(element.src)
        const blob = await response.blob()
        
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ])
    } catch (err) {
        console.error("Failed to copy image to clipboard", err)
        alert(language === "fr" ? "Impossible de copier l'image." : "Failed to copy image.")
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
          // Pendant un drag, l'élément passe au-dessus de tout dans le canvas.
          // Pour un groupe, on le met juste en dessous afin que ses enfants puissent passer au-dessus.
          // La top bar reste au-dessus via son propre z-index / stacking context.
          zIndex: isDragging
            ? (element.type === "group" ? 999998 : 999999)
            : (forcedZIndex ?? element.zIndex || 1),
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
                  ? (element.type === "group" ? "shadow-2xl pointer-events-none" : "scale-105 shadow-2xl pointer-events-none")
                  : isFocused
                    ? "scale-[1.02] shadow-2xl transition-all duration-200"
                    : "transition-all duration-200"
              } ${isSelected && !isFocused ? "ring-2 ring-blue-500 ring-offset-4 shadow-lg" : ""}`}
            >
              {renderElement()}

              {/* Poignée de resize pour les groupes (désactivée si minimisé) */}
              {element.type === "group" && !(element as any).collapsed && (
                <div
                  className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-white/70 border border-black/10 shadow-md cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title={language === "fr" ? "Redimensionner le groupe" : "Resize group"}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const w = (element.width ?? 420)
                    const h = (element.height ?? 260)
                    groupResizeStartRef.current = {
                      x: e.clientX,
                      y: e.clientY,
                      width: w,
                      height: h,
                    }
                    setIsResizingGroup(true)
                  }}
                >
                  <MoveDiagonal2 className="w-4 h-4 text-black/50" />
                </div>
              )}
              
              {isHovered && !isDragging && !(element.type === "group" && (element as any).collapsed) && (
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

              {element.type !== "group" && (
                <>
                  {/* Port de sortie (droite) - Sur tous les éléments */}
                  <div 
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-400 rounded-full cursor-crosshair hover:border-blue-500 hover:scale-125 hover:bg-blue-50 transition-all z-50 opacity-0 group-hover:opacity-100 shadow-sm"
                    title={language === "fr" ? "Tirer un câble" : "Start a cable"}
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
                    title={language === "fr" ? "Connecter une entrée" : "Connect an input"}
                    onMouseUp={(e) => {
                      e.stopPropagation()
                      onConnectEnd(element.id)
                    }}
                  />
                </>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-64">
            {isSelected && selectionCount > 1 ? (
              <>
                {onGroupSelection && (
                  <>
                    <ContextMenuItem onClick={onGroupSelection}>
                      <FolderPlus className="mr-2 h-4 w-4" />
                      {language === "fr" ? "Grouper la sélection" : "Group selection"}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                {onOrganizeSelection && (
                  <>
                    <ContextMenuItem onClick={onOrganizeSelection}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      {language === "fr" ? "Organiser la pile" : "Organize stack"}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                <ContextMenuItem 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50" 
                  onClick={onDeleteSelection}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {language === "fr" ? `Supprimer la sélection (${selectionCount})` : `Delete selection (${selectionCount})`}
                </ContextMenuItem>
              </>
            ) : (
              <>
                <ContextMenuItem onClick={() => onFocusElement?.(element.id)}>
                  {language === "fr" 
                    ? (element.type === "group" ? "Focus sur ce groupe" : "Focus sur cette carte") 
                    : (element.type === "group" ? "Focus on this group" : "Focus on this card")}
                </ContextMenuItem>
                <ContextMenuSeparator />
                {element.type !== "group" ? (
                  onGroupElement ? (
                    <>
                      <ContextMenuItem onClick={() => onGroupElement(element.id)}>
                        <FolderPlus className="mr-2 h-4 w-4" />
                        {language === "fr" ? "Grouper" : "Group"}
                      </ContextMenuItem>
                      {onAddToExistingGroup && existingGroups.length > 0 && (
                        <ContextMenuSub>
                          <ContextMenuSubTrigger>
                            <FolderPlus className="mr-2 h-4 w-4" />
                            {language === "fr" ? "Ajouter à un groupe existant" : "Add to existing group"}
                          </ContextMenuSubTrigger>
                          <ContextMenuSubContent className="w-56">
                            {existingGroups
                              .filter(g => g.id !== element.id)
                              .map(g => (
                                <ContextMenuItem
                                  key={g.id}
                                  disabled={element.parentId === g.id}
                                  onClick={() => onAddToExistingGroup(element.id, g.id)}
                                >
                                  <span className="truncate">
                                    {g.title || (language === "fr" ? "Groupe" : "Group")}
                                  </span>
                                  {element.parentId === g.id && (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                      {language === "fr" ? "Déjà dedans" : "Already"}
                                    </span>
                                  )}
                                </ContextMenuItem>
                              ))}
                          </ContextMenuSubContent>
                        </ContextMenuSub>
                      )}
                      {element.parentId && onRemoveFromGroup && (
                        <ContextMenuItem onClick={() => onRemoveFromGroup(element.id)}>
                          <FolderMinus className="mr-2 h-4 w-4" />
                          {language === "fr" ? "Retirer du groupe" : "Remove from group"}
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator />
                    </>
                  ) : null
                ) : (
                  onUngroup ? (
                    <>
                      <ContextMenuItem onClick={() => onUngroup(element.id)}>
                        <FolderMinus className="mr-2 h-4 w-4" />
                        {language === "fr" ? "Dégrouper" : "Ungroup"}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                    </>
                  ) : null
                )}
                {element.type === 'image' && (
                    <ContextMenuItem onClick={handleCopyImage}>
                        <Copy className="mr-2 h-4 w-4" />
                        {language === "fr" ? "Copier l'image" : "Copy Image"}
                    </ContextMenuItem>
                )}
                <ContextMenuItem onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  {language === "fr" ? "Copier l'URL/Contenu" : "Copy URL/Content"}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem 
                  className="text-red-600 focus:text-red-600 focus:bg-red-50" 
                  onClick={() => onDelete(element.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {language === "fr" ? "Supprimer" : "Delete"}
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </Draggable>
  )
})
