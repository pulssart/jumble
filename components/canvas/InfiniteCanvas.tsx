"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { generateBrainstormingIdeas, generateTasks, generateImage, runPrompt } from "@/lib/ai"
import { CanvasElement, PromptElement, Space } from "@/types/canvas"
import { CanvasElementComponent } from "./CanvasElement"
import { 
  saveElements, loadElements, 
  saveCanvasOffset, loadCanvasOffset, 
  saveCanvasZoom, loadCanvasZoom, 
  saveCanvasBgColor, loadCanvasBgColor,
  getSpaces, createSpace, updateSpace, setCurrentSpaceId, initSpaces, deleteSpace
} from "@/lib/storage"
import { Plus, Image, Type, CheckSquare, StickyNote, Youtube, Music, Figma, FileText, LayoutList, Linkedin, Twitter, Link as LinkIcon, Wand2, Settings, Key, Zap, Download, Upload, Minus, Palette, LayoutGrid, ChevronDown, PenLine, Keyboard, Video, Clock, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import Logo from "../../logo.png"

export function InfiniteCanvas() {
  // Space State
  const [spaces, setSpaces] = useState<Space[]>([])
  const [currentSpaceId, setCurrentSpaceIdState] = useState<string | null>(null)
  const [isSpaceRenameDialogOpen, setIsSpaceRenameDialogOpen] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState("")
  const [isDeleteSpaceDialogOpen, setIsDeleteSpaceDialogOpen] = useState(false)
  const [spaceToDelete, setSpaceToDelete] = useState<Space | null>(null)

  // Canvas State
  const [elements, setElements] = useState<CanvasElement[]>([])
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [bgColor, setBgColor] = useState("bg-gray-50")
  const [openAIKey, setOpenAIKey] = useState("")
  const [isKeyLoaded, setIsKeyLoaded] = useState(false)
  const [isElementsLoaded, setIsElementsLoaded] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // État pour le tracé de câbles
  const [connectionStart, setConnectionStart] = useState<{ id: string; x: number; y: number } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const [showOrganizeWarning, setShowOrganizeWarning] = useState(false)
  const [showMultiDeleteWarning, setShowMultiDeleteWarning] = useState(false)

  // États pour la sélection multiple
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
  const selectionStartRef = useRef<{ x: number, y: number } | null>(null)
  const isSelecting = useRef(false)

  // Initialisation des spaces
  useEffect(() => {
    const init = async () => {
        const activeSpace = await initSpaces()
        setSpaces(getSpaces())
        setCurrentSpaceIdState(activeSpace.id)
        
        // Charger les données du space actif
        loadSpaceData(activeSpace.id)
        
        const savedKey = localStorage.getItem("space_openai_key")
        if (savedKey) setOpenAIKey(savedKey)
        setIsKeyLoaded(true)
    }
    
    init()
  }, [])

  const loadSpaceData = async (spaceId: string) => {
    setIsElementsLoaded(false)
    try {
      const loadedElements = await loadElements(spaceId)
      const loadedOffset = loadCanvasOffset(spaceId)
      const loadedZoom = loadCanvasZoom(spaceId)
      const loadedBgColor = loadCanvasBgColor(spaceId)

      setElements(loadedElements)
      setCanvasOffset(loadedOffset)
      setScale(loadedZoom)
      setBgColor(loadedBgColor)
      setIsElementsLoaded(true)
      
      console.log("Space chargé:", spaceId, {
        elements: loadedElements.length,
        offset: loadedOffset,
        zoom: loadedZoom
      })
    } catch (e) {
      console.error("Erreur chargement space data:", e)
      setIsElementsLoaded(true) // Unblock save even if empty
    }
  }

  const handleSwitchSpace = async (spaceId: string) => {
    if (spaceId === currentSpaceId) return
    
    // Sauvegarder l'état actuel avant de changer (sécurité)
    if (currentSpaceId) {
        await saveElements(currentSpaceId, elements)
        saveCanvasOffset(currentSpaceId, canvasOffset)
        saveCanvasZoom(currentSpaceId, scale)
        saveCanvasBgColor(currentSpaceId, bgColor)
    }

    setCurrentSpaceIdState(spaceId)
    setCurrentSpaceId(spaceId) // Persist
    await loadSpaceData(spaceId)
  }

  const handleCreateSpace = () => {
    const newSpace = createSpace("Nouveau Jumble")
    setSpaces(getSpaces())
    handleSwitchSpace(newSpace.id)
  }

  const handleRenameSpace = () => {
    if (!currentSpaceId || !newSpaceName.trim()) return
    updateSpace(currentSpaceId, { name: newSpaceName })
    setSpaces(getSpaces())
    setIsSpaceRenameDialogOpen(false)
    setNewSpaceName("")
  }

  const openRenameDialog = () => {
    const current = spaces.find(s => s.id === currentSpaceId)
    if (current) {
        setNewSpaceName(current.name)
        setIsSpaceRenameDialogOpen(true)
    }
  }

  const handleConfirmDeleteSpace = async () => {
    if (!spaceToDelete) return

    const deletingId = spaceToDelete.id
    const isDeletingCurrent = currentSpaceId === deletingId

    // Supprimer le space (métadonnées + données associées)
    deleteSpace(deletingId)

    // Recharger la liste des spaces depuis le stockage
    const updatedSpaces = getSpaces()
    setSpaces(updatedSpaces)

    // Fermer la modale
    setIsDeleteSpaceDialogOpen(false)
    setSpaceToDelete(null)

    // Si on ne supprime pas l'espace courant, rien d'autre à faire
    if (!isDeletingCurrent) return

    // Si plus aucun space, on nettoie l'état local
    if (updatedSpaces.length === 0) {
      setCurrentSpaceIdState(null)
      return
    }

    // Sinon, basculer sur le premier space restant sans tenter de sauvegarder l'ancien (déjà supprimé)
    setCurrentSpaceIdState(null)
    await handleSwitchSpace(updatedSpaces[0].id)
  }

  // Sauvegarder la clé OpenAI quand elle change
  useEffect(() => {
    if (!isKeyLoaded) return
    if (openAIKey) {
      localStorage.setItem("space_openai_key", openAIKey)
    } else {
      localStorage.removeItem("space_openai_key")
    }
  }, [openAIKey, isKeyLoaded])

  // Sauvegarder les éléments avec debounce
  useEffect(() => {
    if (!isElementsLoaded || !currentSpaceId) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (currentSpaceId) {
        await saveElements(currentSpaceId, elements)
      }
    }, 500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [elements, isElementsLoaded, currentSpaceId])

  // Sauvegarder la position du canvas avec debounce
  useEffect(() => {
    if (!currentSpaceId) return
    const timeout = setTimeout(() => {
      saveCanvasOffset(currentSpaceId, canvasOffset)
    }, 1000)
    return () => clearTimeout(timeout)
  }, [canvasOffset, currentSpaceId])

  // Sauvegarder le zoom avec debounce
  useEffect(() => {
    if (!currentSpaceId) return
    const timeout = setTimeout(() => {
      saveCanvasZoom(currentSpaceId, scale)
    }, 1000)
    return () => clearTimeout(timeout)
  }, [scale, currentSpaceId])

  // Sauvegarder la couleur de fond
  useEffect(() => {
    if (!currentSpaceId) return
    saveCanvasBgColor(currentSpaceId, bgColor)
  }, [bgColor, currentSpaceId])

  // Sauvegarder avant de quitter la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentSpaceId) {
        // On ne peut pas await dans beforeunload, mais IndexedDB est async...
        // C'est une limitation connue. En général le debounce save suffit pour la plupart des cas.
        // Pour beforeunload, on peut tenter d'envoyer une requête fetch keepalive ou d'utiliser le localStorage comme backup temporaire si vraiment critique,
        // mais ici on va compter sur l'autosave fréquent (500ms).
        
        // On sauvegarde quand même les métadonnées sync
        saveCanvasOffset(currentSpaceId, canvasOffset)
        saveCanvasZoom(currentSpaceId, scale)
        saveCanvasBgColor(currentSpaceId, bgColor)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [elements, canvasOffset, scale, bgColor, currentSpaceId])

  // Écouter les messages de l'extension Chrome
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SPACE_ADD_ELEMENT" && event.data?.payload) {
        const { elementType, data } = event.data.payload
        
        const centerX = ((window.innerWidth / 2) - canvasOffset.x) / scale
        const centerY = ((window.innerHeight / 2) - canvasOffset.y) / scale

        const position = {
          x: centerX - 150 + (Math.random() * 40 - 20),
          y: centerY - 100 + (Math.random() * 40 - 20),
        }

        const newElement: CanvasElement = {
          id: generateId(),
          type: elementType,
          position,
          zIndex: getNextZIndex(),
          ...data
        } as CanvasElement

        setElements((prev) => [...prev, newElement])
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [canvasOffset, scale]) // Ajout de scale aux dépendances

  const handleElementSelect = useCallback((id: string, multi: boolean) => {
    if (multi) {
      setSelectedIds((prev) => 
        prev.includes(id) 
          ? prev.filter((i) => i !== id) 
          : [...prev, id]
      )
    } else {
      setSelectedIds((prev) => {
        if (!prev.includes(id)) {
          return [id]
        }
        return prev
      })
    }
  }, [])

  const handleUpdateElement = useCallback((updatedElement: CanvasElement) => {
    setElements((prev) => {
      const currentSelectedIds = selectedIdsRef.current
      
      // Si l'élément mis à jour fait partie de la sélection et qu'il y a plusieurs éléments sélectionnés
      if (currentSelectedIds.includes(updatedElement.id) && currentSelectedIds.length > 1) {
        const oldElement = prev.find(el => el.id === updatedElement.id)
        if (!oldElement) return prev.map(el => (el.id === updatedElement.id ? updatedElement : el))

        // Calculer le delta de déplacement
        const dx = updatedElement.position.x - oldElement.position.x
        const dy = updatedElement.position.y - oldElement.position.y
        
        // Si le déplacement est significatif, on l'applique à tous les sélectionnés
        // On exclut les mises à jour qui ne sont pas des déplacements (ex: resize, content change)
        // Pour savoir si c'est un déplacement, on regarde si la position a changé
        if (dx !== 0 || dy !== 0) {
          return prev.map(el => {
            if (el.id === updatedElement.id) return updatedElement
            if (currentSelectedIds.includes(el.id)) {
               // Reset du transform CSS temporaire avant de mettre à jour l'état
               const domEl = document.querySelector(`[data-id="${el.id}"]`) as HTMLElement
               if (domEl) {
                 domEl.style.transform = ''
                 domEl.style.transition = ''
                 domEl.style.willChange = 'auto'
               }
               
               return {
                 ...el,
                 position: {
                   x: el.position.x + dx,
                   y: el.position.y + dy
                 }
               }
            }
            return el
          })
        }
      }

      return prev.map((el) => (el.id === updatedElement.id ? updatedElement : el))
    })
  }, [])

  const handleDeleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id))
  }, [])

  const handleDeleteSelection = () => {
    setElements((prev) => prev.filter((el) => !selectedIds.includes(el.id)))
    setSelectedIds([])
    setShowMultiDeleteWarning(false)
  }

  const handleOrganizeSelection = () => {
    if (selectedIds.length <= 1) return

    const selectedElements = elements.filter(el => selectedIds.includes(el.id))
    if (selectedElements.length === 0) return

    selectedElements.sort((a, b) => (a.position.y + a.position.x) - (b.position.y + b.position.x))

    const minX = Math.min(...selectedElements.map(el => el.position.x))
    const minY = Math.min(...selectedElements.map(el => el.position.y))

    const STACK_OFFSET = 30
    
    setElements(prev => {
       return prev.map(el => {
           if (selectedIds.includes(el.id)) {
               const index = selectedElements.findIndex(s => s.id === el.id)
               if (index === -1) return el 

               const newZ = getNextZIndex() + index
               
               return {
                   ...el,
                   position: {
                       x: minX + index * STACK_OFFSET,
                       y: minY + index * STACK_OFFSET
                   },
                   zIndex: newZ
               }
           }
           return el
       })
    })
  }

  const generateId = () => `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const getNextZIndex = () => {
    if (elementsRef.current.length === 0) return 1
    const maxZ = Math.max(...elementsRef.current.map((el) => el.zIndex || 0))
    return maxZ + 1
  }

  const handleBringToFront = useCallback((id: string) => {
    const nextZ = getNextZIndex()
    setElements((prev) =>
      prev.map((el) =>
        el.id === id && el.zIndex !== nextZ ? { ...el, zIndex: nextZ } : el
      )
    )
  }, [])

  const elementsRef = useRef(elements)
  useEffect(() => {
    elementsRef.current = elements
  }, [elements])

  const [snapLines, setSnapLines] = useState<{ x: number | null; y: number | null; activeX?: number; activeY?: number }>({ x: null, y: null })

  // Mode focus sur une carte (zoom/pan temporaire)
  const [focusState, setFocusState] = useState<{ id: string; prevOffset: { x: number; y: number } } | null>(null)

  const getSnappingPosition = useCallback((id: string, x: number, y: number) => {
    const SNAP_THRESHOLD = 10 
    let newX = x
    let newY = y
    let snappedX = null
    let snappedY = null

    for (const el of elementsRef.current) {
      if (el.id === id) continue

      if (Math.abs(el.position.x - x) < SNAP_THRESHOLD) {
        newX = el.position.x
        snappedX = el.position.x
      }
      if (Math.abs(el.position.y - y) < SNAP_THRESHOLD) {
        newY = el.position.y
        snappedY = el.position.y
      }
    }

    return { x: newX, y: newY, snappedX, snappedY }
  }, [])

  const zoomIn = () => {
    const newScale = Math.min(5, scale * 1.2)
    const screenCenterX = window.innerWidth / 2
    const screenCenterY = window.innerHeight / 2
    
    const worldX = (screenCenterX - canvasOffset.x) / scale
    const worldY = (screenCenterY - canvasOffset.y) / scale
    
    const newOffsetX = screenCenterX - worldX * newScale
    const newOffsetY = screenCenterY - worldY * newScale
    
    setScale(newScale)
    setCanvasOffset({ x: newOffsetX, y: newOffsetY })
  }

  const zoomOut = () => {
    const newScale = Math.max(0.1, scale / 1.2)
    const screenCenterX = window.innerWidth / 2
    const screenCenterY = window.innerHeight / 2
    
    const worldX = (screenCenterX - canvasOffset.x) / scale
    const worldY = (screenCenterY - canvasOffset.y) / scale
    
    const newOffsetX = screenCenterX - worldX * newScale
    const newOffsetY = screenCenterY - worldY * newScale
    
    setScale(newScale)
    setCanvasOffset({ x: newOffsetX, y: newOffsetY })
  }

  const scaleRef = useRef(scale)
  const offsetRef = useRef(canvasOffset)

  useEffect(() => {
    scaleRef.current = scale
    offsetRef.current = canvasOffset
  }, [scale, canvasOffset])

  const handleFocusElement = useCallback((id: string) => {
    const target = elementsRef.current.find((el) => el.id === id)
    if (!target) return

    const width = target.width || 320
    const height = target.height || 200

    const worldX = target.position.x + width / 2
    const worldY = target.position.y + height / 2

    const screenCenterX = window.innerWidth / 2
    const screenCenterY = window.innerHeight / 2

    const currentScale = scaleRef.current
    const newOffsetX = screenCenterX - worldX * currentScale
    const newOffsetY = screenCenterY - worldY * currentScale

    setFocusState({
      id,
      prevOffset: { x: canvasOffset.x, y: canvasOffset.y },
    })
    setCanvasOffset({ x: newOffsetX, y: newOffsetY })
    setSelectedIds([id])
  }, [canvasOffset.x, canvasOffset.y])

  const clearFocus = useCallback(() => {
    if (!focusState) return
    setCanvasOffset(focusState.prevOffset)
    setFocusState(null)
  }, [focusState])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault() 

      // Zoom avec Ctrl (ou Cmd) + Scroll
      if (e.ctrlKey || e.metaKey) {
        const currentScale = scaleRef.current
        const currentOffset = offsetRef.current
        
        const ZOOM_SPEED = 0.002
        const delta = -e.deltaY * ZOOM_SPEED
        const newScale = Math.min(Math.max(0.1, currentScale + delta), 5)
        
        const mouseX = e.clientX
        const mouseY = e.clientY
        
        const worldX = (mouseX - currentOffset.x) / currentScale
        const worldY = (mouseY - currentOffset.y) / currentScale
        
        const newOffsetX = mouseX - worldX * newScale
        const newOffsetY = mouseY - worldY * newScale
        
        setScale(newScale)
        setCanvasOffset({ x: newOffsetX, y: newOffsetY })
      } else {
        // Pan (Déplacement) simple
        // On laisse React gérer le batching des mises à jour d'état
        // C'est souvent plus fluide que d'essayer de le battre avec requestAnimationFrame
        setCanvasOffset((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }))
      }
    }

    // Bloquer les gestes natifs de zoom (pinch) pour éviter les conflits
    const preventGesture = (e: Event) => {
      e.preventDefault()
      e.stopPropagation() 
    }

    // On ajoute ces écouteurs sur window/document pour être sûr de tout attraper
    // MAIS ATTENTION : wheel ne doit pas être bloqué globalement sinon plus rien ne marche
    
    document.addEventListener('gesturestart', preventGesture, { capture: true })
    document.addEventListener('gesturechange', preventGesture, { capture: true })
    document.addEventListener('gestureend', preventGesture, { capture: true })
    
    // On attache l'événement wheel sur le container spécifiquement
    // C'est lui qui gère le pan et le zoom custom
    container.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', onWheel)
      document.removeEventListener('gesturestart', preventGesture, { capture: true } as any)
      document.removeEventListener('gesturechange', preventGesture, { capture: true } as any)
      document.removeEventListener('gestureend', preventGesture, { capture: true } as any)
    }
  }, [])

  const addElement = (type: CanvasElement["type"]) => {
    const centerX = ((window.innerWidth / 2) - canvasOffset.x) / scale
    const centerY = ((window.innerHeight / 2) - canvasOffset.y) / scale
    
    const position = {
      x: centerX - 150,
      y: centerY - 100,
    }

    const newElement: CanvasElement = {
      id: generateId(),
      type,
      position,
      zIndex: getNextZIndex(),
      ...(type === "image" && { src: "", alt: "" }),
      ...(type === "text" && { content: "" }),
      ...(type === "task" && { title: "Nouvelle tâche", completed: false }),
      ...(type === "postit" && { content: "", color: "yellow" }),
      ...(type === "youtube" && { videoId: "" }),
      ...(type === "spotify" && { spotifyUri: "" }),
      ...(type === "figma" && { url: "" }),
      ...(type === "notion" && { embedUrl: "" }),
      ...(type === "linear" && { embedUrl: "" }),
      ...(type === "linkedin" && { embedUrl: "" }),
      ...(type === "twitter" && { tweetId: "" }),
      ...(type === "link" && { url: "" }),
      ...(type === "prompt" && { content: "" }),
      ...(type === "webcam" && { isActive: false }),
      ...(type === "gif" && { src: "", alt: "" }),
      ...(type === "clock" && { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, isAnalog: false, showSeconds: false, is24Hour: true }),
      ...(type === "applemusic" && { url: "" }),
    } as CanvasElement
    setElements((prev) => [...prev, newElement])
  }

  const handleCreateElement = (content: string, type: "url" | "text") => {
    const centerX = ((window.innerWidth / 2) - canvasOffset.x) / scale
    const centerY = ((window.innerHeight / 2) - canvasOffset.y) / scale
    
    const basePosition = {
      x: centerX - 150,
      y: centerY - 100,
    }

    let newElement: CanvasElement | null = null
    let text = content.trim()
    
    if (!text) return

    // Si l'utilisateur colle un <iframe>, on essaie d'en extraire le src
    if (text.includes("<iframe") && text.includes("src=")) {
      const m = text.match(/src=["']([^"']+)["']/i)
      if (m) {
        text = m[1]
      }
    }

    if (type === "url" || (type === "text" && /^(http|https):\/\/[^ "]+$/.test(text))) {
      const url = text
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      const youtubeMatch = url.match(youtubeRegex)
      
      if (youtubeMatch) {
        const videoId = youtubeMatch[1]
        newElement = {
          id: generateId(),
          type: "youtube",
          position: basePosition,
          zIndex: getNextZIndex(),
          videoId: videoId,
        }
      }
      else if (url.includes("open.spotify.com")) {
        const uri = url.replace("https://open.spotify.com/", "").replace(/\//g, ":")
        newElement = {
          id: generateId(),
          type: "spotify",
          position: basePosition,
          zIndex: getNextZIndex(),
          spotifyUri: `spotify:${uri}`,
        }
      }
      else if (url.includes("music.apple.com")) {
        newElement = {
          id: generateId(),
          type: "applemusic",
          position: basePosition,
          zIndex: getNextZIndex(),
          url,
        }
      }
      else if (url.includes("figma.com")) {
        newElement = {
          id: generateId(),
          type: "figma",
          position: basePosition,
          zIndex: getNextZIndex(),
          url: url,
        }
      }
      else if (url.includes("notion.so") || url.includes("notion.site")) {
        newElement = {
          id: generateId(),
          type: "notion",
          position: basePosition,
          zIndex: getNextZIndex(),
          embedUrl: url,
        }
      }
      else if (url.includes("linear.app")) {
        newElement = {
          id: generateId(),
          type: "linear",
          position: basePosition,
          zIndex: getNextZIndex(),
          embedUrl: url,
        }
      }
      else if (url.includes("linkedin.com")) {
        newElement = {
          id: generateId(),
          type: "linkedin",
          position: basePosition,
          zIndex: getNextZIndex(),
          embedUrl: url,
        }
      }
      else if (url.includes("twitter.com") || url.includes("x.com")) {
        const tweetId = url.split("/status/")[1]?.split("?")[0]
        if (tweetId) {
          newElement = {
            id: generateId(),
            type: "twitter",
            position: basePosition,
            zIndex: getNextZIndex(),
            tweetId: tweetId,
          }
        }
      }
      else if (url.match(/\.gif$/i)) {
        newElement = {
          id: generateId(),
          type: "gif",
          position: basePosition,
          zIndex: getNextZIndex(),
          src: url,
          alt: "GIF animé",
        }
      }
      else if (url.match(/\.(jpeg|jpg|png|webp)$/i)) {
        newElement = {
          id: generateId(),
          type: "image",
          position: basePosition,
          zIndex: getNextZIndex(),
          src: url,
          alt: "Image via chat",
        }
      }
      else {
        newElement = {
          id: generateId(),
          type: "link",
          position: basePosition,
          zIndex: getNextZIndex(),
          url: url,
        }
      }
    }

    if (!newElement) {
      newElement = {
        id: generateId(),
        type: "text",
        position: basePosition,
        zIndex: getNextZIndex(),
        content: text,
      }
    }

    setElements((prev) => [...prev, newElement as CanvasElement])
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
      const fileType = file.type.toLowerCase()
      
      if (!validTypes.includes(fileType)) {
        alert("Format non supporté. Veuillez utiliser JPG, PNG, GIF ou WebP.")
        e.target.value = ""
        return
      }

      const reader = new FileReader()
      reader.onerror = (error) => {
        console.error("Erreur FileReader:", error)
        alert("Erreur lors du chargement de l'image")
        e.target.value = ""
      }
      reader.onload = (event) => {
        const src = event.target?.result as string
        if (src) {
          const centerX = ((window.innerWidth / 2) - canvasOffset.x) / scale
          const centerY = ((window.innerHeight / 2) - canvasOffset.y) / scale
          
          const img = document.createElement("img")
          img.onload = () => {
             const maxWidth = 600
             const maxHeight = 600
             let width = img.naturalWidth
             let height = img.naturalHeight
             
             if (width > maxWidth || height > maxHeight) {
                 const ratio = Math.min(maxWidth / width, maxHeight / height)
                 width = width * ratio
                 height = height * ratio
             }

             const newElement: CanvasElement = {
                id: generateId(),
                type: "image",
                position: {
                  x: centerX - (width / 2),
                  y: centerY - (height / 2),
                },
                zIndex: getNextZIndex(),
                src,
                alt: file.name,
                width: Math.round(width),
                height: Math.round(height)
             }
             
             setElements((prev) => [...prev, newElement])
          }
          img.src = src
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ""
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = e.clientX - lastMousePos.current.x
        const deltaY = e.clientY - lastMousePos.current.y
        setCanvasOffset((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }))
        lastMousePos.current = { x: e.clientX, y: e.clientY }
      } else if (isSelecting.current && selectionStartRef.current) {
        const containerRect = containerRef.current?.getBoundingClientRect()
        const offsetX = containerRect?.left || 0
        const offsetY = containerRect?.top || 0

        const currentMouseX = (e.clientX - offsetX - canvasOffset.x) / scale
        const currentMouseY = (e.clientY - offsetY - canvasOffset.y) / scale
        
        const startX = selectionStartRef.current.x
        const startY = selectionStartRef.current.y
        
        setSelectionRect({
          x: Math.min(startX, currentMouseX),
          y: Math.min(startY, currentMouseY),
          width: Math.abs(currentMouseX - startX),
          height: Math.abs(currentMouseY - startY)
        })
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging.current) {
        isDragging.current = false
      }
      if (isSelecting.current && selectionRect) {
        const selected = elements.filter(el => {
            const elRight = el.position.x + (el.width || 200)
            const elBottom = el.position.y + (el.height || 100)
            const elLeft = el.position.x
            const elTop = el.position.y
            
            const rectRight = selectionRect.x + selectionRect.width
            const rectBottom = selectionRect.y + selectionRect.height
            const rectLeft = selectionRect.x
            const rectTop = selectionRect.y

            return (
                elLeft < rectRight &&
                elRight > rectLeft &&
                elTop < rectBottom &&
                elBottom > rectTop
            )
        }).map(el => el.id)
        
        if (e.shiftKey) {
             setSelectedIds(prev => {
                 const newIds = new Set(prev)
                 selected.forEach(id => newIds.add(id))
                 return Array.from(newIds)
             })
        } else {
             setSelectedIds(selected)
        }
        
        setSelectionRect(null)
        isSelecting.current = false
        selectionStartRef.current = null
      } else if (isSelecting.current) {
        setSelectedIds([])
        isSelecting.current = false
        selectionStartRef.current = null
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [canvasOffset, scale, selectionRect, elements])

  const [isPanningMode, setIsPanningMode] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "Control") {
        setIsPanningMode(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Meta" || e.key === "Control") {
        setIsPanningMode(false)
        isDragging.current = false 
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (isPanningMode) {
      isDragging.current = true
      lastMousePos.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
      return
    }

    const target = e.target as HTMLElement
    
    if (target === canvasRef.current || target.classList.contains("canvas-bg")) {
       canvasRef.current?.focus()
    }

    if (
      target === canvasRef.current ||
      target === containerRef.current ||
      target.classList.contains("canvas-bg") ||
      target.closest(".canvas-bg") === canvasRef.current
    ) {
      // Si un focus est actif, un clic dans le vide le désactive
      if (focusState && !target.closest(".canvas-element")) {
        clearFocus()
        return
      }

      if (!target.closest(".canvas-element") && !target.closest(".react-draggable")) {
        e.preventDefault()

        const containerRect = containerRef.current?.getBoundingClientRect()
        const offsetX = containerRect?.left || 0
        const offsetY = containerRect?.top || 0

        isSelecting.current = true
        selectionStartRef.current = { 
          x: (e.clientX - offsetX - canvasOffset.x) / scale,
          y: (e.clientY - offsetY - canvasOffset.y) / scale
        }
        if (!e.shiftKey) {
           setSelectedIds([]) 
        }
      }
    }
  }

  const handleCanvasMouseUp = () => {
    isDragging.current = false
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) return

    imageFiles.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const src = event.target?.result as string
        if (src) {
          const dropX = (e.clientX - canvasOffset.x) / scale - (index * 20)
          const dropY = (e.clientY - canvasOffset.y) / scale - (index * 20)

          const img = document.createElement("img")
          img.onload = () => {
             const maxWidth = 600
             const maxHeight = 600
             let width = img.naturalWidth
             let height = img.naturalHeight
             
             if (width > maxWidth || height > maxHeight) {
                 const ratio = Math.min(maxWidth / width, maxHeight / height)
                 width = width * ratio
                 height = height * ratio
             }

             const newElement: CanvasElement = {
                id: `${generateId()}-${index}`,
                type: "image",
                position: {
                  x: dropX - (width / 2),
                  y: dropY - (height / 2),
                },
                zIndex: getNextZIndex() + index,
                src,
                alt: file.name,
                width: Math.round(width),
                height: Math.round(height)
             }
             setElements((prev) => [...prev, newElement])
          }
          img.src = src
        }
      }
      reader.readAsDataURL(file)
    })
  }

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return
      }

      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        const files = Array.from(e.clipboardData.files)
        const imageFiles = files.filter(file => file.type.startsWith('image/'))
        
        if (imageFiles.length > 0) {
            e.preventDefault()
            
            imageFiles.forEach((file, index) => {
                const reader = new FileReader()
                reader.onload = (event) => {
                    const src = event.target?.result as string
                    if (src) {
                        const centerX = ((window.innerWidth / 2) - canvasOffset.x) / scale
                        const centerY = ((window.innerHeight / 2) - canvasOffset.y) / scale

                        const img = document.createElement("img")
                        img.onload = () => {
                            const maxWidth = 600
                            const maxHeight = 600
                            let width = img.naturalWidth
                            let height = img.naturalHeight
                            
                            if (width > maxWidth || height > maxHeight) {
                                const ratio = Math.min(maxWidth / width, maxHeight / height)
                                width = width * ratio
                                height = height * ratio
                            }

                            // Détecter si c'est un GIF
                            const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')
                            
                            const newElement: CanvasElement = isGif ? {
                                id: `${generateId()}-${index}`,
                                type: "gif",
                                position: {
                                    x: centerX - (width / 2) + (index * 20),
                                    y: centerY - (height / 2) + (index * 20),
                                },
                                zIndex: getNextZIndex() + index,
                                src,
                                alt: file.name || "GIF animé collé",
                                width: Math.round(width),
                                height: Math.round(height)
                            } : {
                                id: `${generateId()}-${index}`,
                                type: "image",
                                position: {
                                    x: centerX - (width / 2) + (index * 20),
                                    y: centerY - (height / 2) + (index * 20),
                                },
                                zIndex: getNextZIndex() + index,
                                src,
                                alt: file.name || "Image collée",
                                width: Math.round(width),
                                height: Math.round(height)
                            }
                            
                            setElements((prev) => [...prev, newElement])
                        }
                        img.src = src
                    }
                }
                reader.readAsDataURL(file)
            })
            return
        }
      }
      
      const text = e.clipboardData?.getData("text")
      if (text && text.trim()) {
        handleCreateElement(text, "text")
      }
    }

    window.addEventListener("paste", handleGlobalPaste)
    return () => {
      window.removeEventListener("paste", handleGlobalPaste)
    }
  }, [canvasOffset, scale])

  const handleSnapLines = useCallback((lines: { x: number | null; y: number | null }) => {
    setSnapLines(lines)
  }, [])

  const selectedIdsRef = useRef(selectedIds)
  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])

  const handleElementDrag = useCallback((id: string, x: number, y: number) => {
    // Optimisation : Déplacement visuel direct du DOM pour les éléments sélectionnés
    // Cela évite de mettre à jour l'état React à chaque frame (très lent)
    const currentSelectedIds = selectedIdsRef.current
    
    if (currentSelectedIds.includes(id) && currentSelectedIds.length > 1) {
      const draggedEl = elementsRef.current.find(el => el.id === id)
      if (!draggedEl) return

      const dx = x - draggedEl.position.x
      const dy = y - draggedEl.position.y

      // Appliquer le déplacement aux autres éléments sélectionnés
      currentSelectedIds.forEach(selectedId => {
        if (selectedId === id) return // L'élément draggué est déjà géré par react-draggable

        const el = elementsRef.current.find(e => e.id === selectedId)
        if (el) {
          const domEl = document.querySelector(`[data-id="${selectedId}"]`) as HTMLElement
          if (domEl) {
            // Désactiver la transition pour éviter le lag (effet élastique)
            domEl.style.transition = 'none'
            // On applique directement la transformation CSS
            // React-draggable utilise translate(x, y)
            domEl.style.transform = `translate(${el.position.x + dx}px, ${el.position.y + dy}px)`
          }
        }
      })
    }
  }, [])

  const handleAIAction = async (originId: string, topic: string, actionType: 'ideas' | 'tasks' | 'image') => {
    if (!openAIKey) {
      alert("Veuillez d'abord configurer votre clé API OpenAI dans les paramètres.")
      return
    }

    const originElement = elements.find(el => el.id === originId)
    if (!originElement) return

    const width = originElement.width || 220
    const height = originElement.height || 220
    
    const centerX = originElement.position.x + width / 2
    const centerY = originElement.position.y + height / 2
    const radius = 350

    try {
      if (actionType === 'ideas') {
        const ideas = await generateBrainstormingIdeas(topic, openAIKey)
        if (ideas.length === 0) return

        const newElements = ideas.map((idea, index) => {
          const angle = (index / ideas.length) * 2 * Math.PI
          const x = centerX + radius * Math.cos(angle) - (220 / 2)
          const y = centerY + radius * Math.sin(angle) - (220 / 2)

          return {
            id: `${generateId()}-${index}`,
            type: "postit",
            content: idea,
            color: ["yellow", "blue", "green", "pink", "orange"][index % 5],
            position: { x, y },
            zIndex: getNextZIndex() + index,
            width: 220,
            height: 220,
            parentId: originId
          } as CanvasElement
        })
        setElements(prev => [...prev, ...newElements])

      } else if (actionType === 'tasks') {
        const result = await generateTasks(topic, openAIKey)
        if (result.steps.length === 0) return

        const x = originElement.position.x + width + 50
        const y = originElement.position.y

        const newElements = result.steps.map((step, index) => ({
          id: `${generateId()}-${index}`,
          type: "task",
          title: step,
          completed: false,
          position: { x, y: y + (index * 60) },
          zIndex: getNextZIndex() + index,
          width: 300,
          height: 50,
          parentId: originId
        } as CanvasElement))

        setElements(prev => [...prev, ...newElements])

      } else if (actionType === 'image') {
        const result = await generateImage(topic, openAIKey)
        if (!result.url) {
           if (result.error) alert(`Erreur image: ${result.error}`)
           return
        }

        const x = originElement.position.x - 450
        const y = originElement.position.y

        const newElement: CanvasElement = {
          id: generateId(),
          type: "image",
          src: result.url,
          alt: `Image générée pour: ${topic}`,
          position: { x, y },
          zIndex: getNextZIndex(),
          width: 400,
          height: 400,
          parentId: originId
        }
        
        setElements(prev => [...prev, newElement])
      }

    } catch (e) {
      console.error(e)
      alert("Erreur lors de l'action IA.")
    }
  }

  const organizeElements = () => {
    if (elements.length === 0) return

    const elementsWithDims = elements.map((el) => {
      const domEl = document.querySelector(`[data-id="${el.id}"]`)
      const rect = domEl?.getBoundingClientRect()
      return {
        ...el,
        _width: rect?.width ? rect.width / scale : (el.width || 320),
        _height: rect?.height ? rect.height / scale : (el.height || 200),
      }
    })

    const groups: { [key: string]: typeof elementsWithDims } = {}
    elementsWithDims.forEach(el => {
        if (!groups[el.type]) groups[el.type] = []
        groups[el.type].push(el)
    })

    const typeOrder = ['prompt', 'postit', 'text', 'task', 'image', 'youtube', 'spotify', 'figma', 'notion', 'linear', 'linkedin', 'twitter', 'link']
    const sortedTypes = Object.keys(groups).sort((a, b) => {
        const idxA = typeOrder.indexOf(a)
        const idxB = typeOrder.indexOf(b)
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
    })

    const STACK_OFFSET_X = 30
    const STACK_OFFSET_Y = 30
    const GROUP_PADDING = 150

    const groupLayouts = sortedTypes.map(type => {
        const items = groups[type]
        
        const maxW = Math.max(...items.map(i => i._width))
        const maxH = Math.max(...items.map(i => i._height))
        
        const count = items.length
        const totalW = maxW + (count - 1) * STACK_OFFSET_X
        const totalH = maxH + (count - 1) * STACK_OFFSET_Y
        
        return {
            type,
            items,
            width: totalW,
            height: totalH,
            x: 0,
            y: 0
        }
    })

    const TARGET_WIDTH = 1500 
    let currentLineX = 0
    let currentLineY = 0
    let currentLineHeight = 0
    
    groupLayouts.forEach(group => {
        if (currentLineX + group.width > TARGET_WIDTH && currentLineX > 0) {
            currentLineX = 0
            currentLineY += currentLineHeight + GROUP_PADDING
            currentLineHeight = 0
        }
        
        group.x = currentLineX
        group.y = currentLineY
        
        currentLineX += group.width + GROUP_PADDING
        currentLineHeight = Math.max(currentLineHeight, group.height)
    })

    const contentWidth = Math.max(...groupLayouts.map(g => g.x + g.width))
    const contentHeight = Math.max(...groupLayouts.map(g => g.y + g.height))
    
    const viewCenterX = ((window.innerWidth / 2) - canvasOffset.x) / scale
    const viewCenterY = ((window.innerHeight / 2) - canvasOffset.y) / scale
    
    const startX = viewCenterX - (contentWidth / 2)
    const startY = viewCenterY - (contentHeight / 2)

    const finalElements: CanvasElement[] = []
    let zIndexCounter = 1

    groupLayouts.forEach(group => {
        group.items.forEach((item, index) => {
            const stackX = index * STACK_OFFSET_X
            const stackY = index * STACK_OFFSET_Y
            
            const { _width, _height, ...cleanItem } = item
            
            finalElements.push({
                ...cleanItem,
                position: {
                    x: startX + group.x + stackX,
                    y: startY + group.y + stackY
                },
                zIndex: zIndexCounter++
            })
        })
    })

    setElements(finalElements)
  }

  const handleConnectStart = useCallback((elementId: string, x: number, y: number) => {
    const localX = (x - offsetRef.current.x) / scaleRef.current
    const localY = (y - offsetRef.current.y) / scaleRef.current
    
    setConnectionStart({ id: elementId, x: localX, y: localY })
  }, [])

  // Fonction pour trouver tous les éléments connectés (directement ou indirectement)
  const getConnectedElements = (elementId: string, visited: Set<string> = new Set()): Set<string> => {
    if (visited.has(elementId)) return visited
    
    visited.add(elementId)
    const element = elements.find(el => el.id === elementId)
    
    if (!element || !element.connections) return visited
    
    // Ajouter tous les éléments connectés directement
    element.connections.forEach(connectedId => {
      if (!visited.has(connectedId)) {
        visited.add(connectedId)
        // Récursivement trouver les connexions des éléments connectés
        getConnectedElements(connectedId, visited)
      }
    })
    
    // Trouver les éléments qui pointent vers cet élément
    elements.forEach(el => {
      if (el.connections?.includes(elementId) && !visited.has(el.id)) {
        getConnectedElements(el.id, visited)
      }
    })
    
    return visited
  }

  // Trouver tous les groupes d'éléments connectés
  const getConnectedGroups = (): Set<string> => {
    const allConnected = new Set<string>()
    
    // Trouver tous les éléments qui ont des connexions sortantes
    elements.forEach(el => {
      if (el.connections && el.connections.length > 0) {
        const group = getConnectedElements(el.id)
        group.forEach(id => allConnected.add(id))
      }
    })
    
    // Trouver aussi les éléments qui sont des cibles de connexions (mais n'ont pas de connexions sortantes)
    elements.forEach(el => {
      const isTarget = elements.some(otherEl => otherEl.connections?.includes(el.id))
      if (isTarget && !allConnected.has(el.id)) {
        const group = getConnectedElements(el.id)
        group.forEach(id => allConnected.add(id))
      }
    })
    
    return allConnected
  }

  const handleConnectEnd = useCallback((targetId: string) => {
    setConnectionStart((currentStart) => {
      if (currentStart && currentStart.id !== targetId) {
        const sourceId = currentStart.id
        setElements(prev => {
          const sourceEl = prev.find(el => el.id === sourceId)
          const targetEl = prev.find(el => el.id === targetId)
          
          if (sourceEl && targetEl) {
            return prev.map(el => {
              if (el.id === sourceId) {
                const oldConnections = el.connections || []
                if (!oldConnections.includes(targetId)) {
                  return { ...el, connections: [...oldConnections, targetId] }
                }
              }
              return el
            })
          }
          return prev
        })
      }
      return null
    })
    setMousePos(null)
  }, [])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
       if (connectionStart) {
          setMousePos({
             x: (e.clientX - canvasOffset.x) / scale,
             y: (e.clientY - canvasOffset.y) / scale
          })
       }
    }
    const handleGlobalMouseUp = () => {
       if (connectionStart) {
          setConnectionStart(null)
          setMousePos(null)
       }
    }
    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
       window.removeEventListener('mousemove', handleGlobalMouseMove)
       window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [connectionStart, canvasOffset, scale])

  const handleRunPrompt = async (promptId: string) => {
     const promptElement = elements.find(el => el.id === promptId) as PromptElement
     if (!promptElement || !promptElement.content || !openAIKey) {
        if (!openAIKey) alert("Veuillez configurer votre clé API OpenAI.")
        return
     }

     setElements(prev => prev.map(el => el.id === promptId ? { ...el, isRunning: true } : el))

     const inputElements = elements.filter(el => el.connections?.includes(promptId))
     
     const inputs = inputElements.map(el => {
        let content = ""
        if (el.type === 'text') content = (el as any).content
        if (el.type === 'postit') content = (el as any).content
        if (el.type === 'task') content = (el as any).title
        if (el.type === 'notion') content = `Page Notion: ${(el as any).embedUrl}`
        if (el.type === 'linear') content = `Ticket Linear: ${(el as any).embedUrl}`
        if (el.type === 'link') content = `Lien: ${(el as any).url}`
        if (el.type === 'image') content = (el as any).src
        return { type: el.type, content }
     }).filter(i => i.content)

     try {
        let resultContent = ""
        let resultType: "text" | "image" = "text"

        if (promptElement.outputType === 'image') {
            console.log("Début génération image. Mode: Image")
            let imagePrompt = promptElement.content
            if (inputs.length > 0) {
                console.log("Inputs détectés, génération prompt synthétique...")
                const synthesisPrompt = "Analyse ces inputs et crée une description détaillée et visuelle (en anglais pour DALL-E) pour générer une image qui correspond à la demande suivante : " + promptElement.content
                imagePrompt = await runPrompt(synthesisPrompt, inputs, openAIKey)
                console.log("Prompt synthétique généré:", imagePrompt)
            } else {
                console.log("Pas d'inputs, utilisation du prompt direct:", imagePrompt)
            }
            
            console.log("Appel generateImage avec prompt:", imagePrompt)
            const result = await generateImage(imagePrompt, openAIKey)
            console.log("Retour generateImage:", result)

            if (result.url) {
                resultContent = result.url
                resultType = "image"
            } else {
                resultContent = `Erreur lors de la génération de l'image: ${result.error}`
                resultType = "text"
            }
        } else {
            resultContent = await runPrompt(promptElement.content, inputs, openAIKey)
        }

        const pW = promptElement.width || 300
        const newX = promptElement.position.x + pW + 150
        const newY = promptElement.position.y

        let outputElement: CanvasElement

        if (resultType === 'image') {
             outputElement = {
                id: generateId(),
                type: "image",
                src: resultContent,
                alt: "Image générée par Prompt IA",
                position: { x: newX, y: newY },
                zIndex: getNextZIndex(),
                width: 400,
                height: 400,
             } as any
        } else {
             outputElement = {
                id: generateId(),
                type: "text",
                content: resultContent,
                position: { x: newX, y: newY },
                zIndex: getNextZIndex(),
                width: 300,
             } as any
        }

        setElements(prev => {
            const withNewEl = [...prev, outputElement]
            return withNewEl.map(el => {
               if (el.id === promptId) {
                  return { 
                     ...el, 
                     isRunning: false,
                     connections: [...(el.connections || []), outputElement.id] 
                  }
               }
               return el
            })
        })
     } catch (error) {
         console.error("Erreur handleRunPrompt", error)
         setElements(prev => prev.map(el => el.id === promptId ? { ...el, isRunning: false } : el))
         alert("Une erreur est survenue lors du traitement.")
     }
  }

  const handleExportSpace = async () => {
    // On exporte désormais TOUS les spaces + leur configuration
    const allSpaces = getSpaces()

    const payload: any = {
      version: 2,
      timestamp: Date.now(),
      currentSpaceId,
      spaces: allSpaces,
      dataBySpace: {} as Record<string, any>,
    }

    for (const space of allSpaces) {
      const spaceId = space.id

      // On recharge les données directement depuis le stockage pour être sûr d'avoir la vraie source de vérité
      const spaceElements = await loadElements(spaceId)
      const spaceOffset = loadCanvasOffset(spaceId)
      const spaceZoom = loadCanvasZoom(spaceId)
      const spaceBg = loadCanvasBgColor(spaceId)

      payload.dataBySpace[spaceId] = {
        elements: spaceElements,
        canvasOffset: spaceOffset,
        scale: spaceZoom,
        bgColor: spaceBg,
      }
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `space-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importInputRef = useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportSpace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        const data = JSON.parse(content)
        
        // Nouveau format (version 2) avec plusieurs spaces
        if (data.version === 2 && data.spaces && Array.isArray(data.spaces) && data.dataBySpace) {
          // Importer tous les spaces
          const importedSpaces = data.spaces.map((space: Space) => ({
            ...space,
            id: crypto.randomUUID() // Générer de nouveaux IDs pour éviter les conflits
          }))
          
          // Sauvegarder les spaces
          importedSpaces.forEach((space: Space) => {
            const originalId = data.spaces.find((s: Space) => s.name === space.name)?.id
            if (originalId && data.dataBySpace[originalId]) {
              const spaceData = data.dataBySpace[originalId]
              // Créer le space
              const newSpace = createSpace(space.name)
              // Sauvegarder les données
              saveElements(newSpace.id, spaceData.elements || [])
              saveCanvasOffset(newSpace.id, spaceData.canvasOffset || { x: 0, y: 0 })
              saveCanvasZoom(newSpace.id, spaceData.scale || 1)
              saveCanvasBgColor(newSpace.id, spaceData.bgColor || "bg-gray-50")
            }
          })
          
          // Recharger la liste des spaces
          setSpaces(getSpaces())
          
          // Si un currentSpaceId était défini dans l'export, essayer de le charger
          if (data.currentSpaceId) {
            const matchingSpace = importedSpaces.find((s: Space) => 
              data.spaces.find((os: Space) => os.id === data.currentSpaceId)?.name === s.name
            )
            if (matchingSpace) {
              const foundSpace = getSpaces().find(s => s.name === matchingSpace.name)
              if (foundSpace) {
                await handleSwitchSpace(foundSpace.id)
              }
            }
          } else if (importedSpaces.length > 0) {
            // Sinon, charger le premier space importé
            const firstSpace = getSpaces().find(s => s.name === importedSpaces[0].name)
            if (firstSpace) {
              await handleSwitchSpace(firstSpace.id)
            }
          }
          
          alert(`${importedSpaces.length} Jumble(s) importé(s) avec succès !`)
        }
        // Ancien format (rétrocompatibilité)
        else if (data.elements && Array.isArray(data.elements)) {
          setElements(data.elements)
          if (data.canvasOffset) {
            setCanvasOffset(data.canvasOffset)
          }
          if (typeof data.scale === 'number') {
             setScale(data.scale)
          }
          if (data.bgColor) {
            setBgColor(data.bgColor)
          }
          alert("Jumble importé avec succès !")
        } else {
          alert("Format de fichier invalide.")
        }
      } catch (error) {
        console.error("Erreur import:", error)
        alert("Erreur lors de la lecture du fichier.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-screen overflow-hidden transition-colors duration-300 ${bgColor}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleCanvasMouseDown}
      onMouseUp={handleCanvasMouseUp}
    >
      {isPanningMode && (
        <div 
          className="absolute inset-0 z-[999999999] cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseMove={(e) => {
            if (isDragging.current) {
              const deltaX = e.clientX - lastMousePos.current.x
              const deltaY = e.clientY - lastMousePos.current.y
              setCanvasOffset((prev) => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY,
              }))
              lastMousePos.current = { x: e.clientX, y: e.clientY }
            }
          }}
        />
      )}
      <div
        ref={canvasRef}
        className={`canvas-bg absolute inset-0 transition-colors duration-200 outline-none select-none ${
          isDraggingOver ? "bg-blue-50/50" : ""
        }`}
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`,
          transformOrigin: "0 0",
          cursor: isPanningMode ? (isDragging.current ? "grabbing" : "grab") : "default",
        }}
        tabIndex={0}
      >
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
          {elements.map(el => {
            if (!el.parentId) return null
            const parent = elements.find(p => p.id === el.parentId)
            if (!parent) return null

            const pW = parent.width || 220
            const pH = parent.height || 220
            const cW = el.width || 220
            const cH = el.height || 220

            const startX = parent.position.x + pW / 2
            const startY = parent.position.y + pH / 2
            const endX = el.position.x + cW / 2
            const endY = el.position.y + cH / 2

            const deltaX = endX - startX
            const cp1x = startX + deltaX * 0.5
            const cp1y = startY 
            const cp2x = endX - deltaX * 0.5
            const cp2y = endY

            return (
              <g key={`parent-${parent.id}-${el.id}`}>
                <path
                  d={`M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`}
                  stroke="#E2E8F0"
                  strokeWidth="2"
                  fill="none"
                />
                <circle cx={startX} cy={startY} r="3" fill="#CBD5E1" />
                <circle cx={endX} cy={endY} r="3" fill="#CBD5E1" />
              </g>
            )
          })}

          {elements.map(sourceEl => (
            (sourceEl.connections || []).map(targetId => {
               const targetEl = elements.find(e => e.id === targetId)
               if (!targetEl) return null
               
               const isProcessing = targetEl.type === 'prompt' && (targetEl as any).isRunning

               const sW = sourceEl.width || (sourceEl.type === 'prompt' ? 300 : 300) 
               const sH = sourceEl.height || 200
               const tH = targetEl.height || 200
               
               const startX = sourceEl.position.x + sW + 4
               const startY = sourceEl.position.y + sH / 2
               
               const endX = targetEl.position.x - 4
               const endY = targetEl.position.y + tH / 2
               
               const deltaX = Math.abs(endX - startX) * 0.5
               
               return (
                  <g key={`cable-group-${sourceEl.id}-${targetId}`}>
                     <path 
                        id={`cable-path-${sourceEl.id}-${targetId}`}
                        d={`M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`}
                        stroke="#fbbf24"
                        strokeWidth="3"
                        strokeDasharray={isProcessing ? "10,10" : ""}
                        fill="none"
                        className={`drop-shadow-md opacity-80 cursor-pointer pointer-events-auto hover:stroke-red-500 hover:stroke-[4px] transition-all ${isProcessing ? 'animate-cable-flow' : ''}`}
                        onClick={(e) => {
                           e.stopPropagation()
                           setElements(prev => prev.map(el => {
                              if (el.id === sourceEl.id) {
                                 return { ...el, connections: (el.connections || []).filter(id => id !== targetId) }
                              }
                              return el
                           }))
                        }}
                     >
                        <title>Cliquer pour supprimer la connexion</title>
                     </path>
                  </g>
               )
            })
          ))}

          {connectionStart && mousePos && (
             <path 
                d={`M ${connectionStart.x} ${connectionStart.y} C ${connectionStart.x + 100} ${connectionStart.y}, ${mousePos.x - 100} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                stroke="#fbbf24"
                strokeWidth="3"
                strokeDasharray="5,5"
                fill="none"
                className="animate-pulse"
             />
          )}
        </svg>

        {(() => {
          // Vérifier s'il y a au moins une connexion dans le canvas
          const hasAnyConnection = elements.some(el => el.connections && el.connections.length > 0)
          
          // Calculer les éléments connectés seulement s'il y a des connexions
          const connectedElements = hasAnyConnection ? getConnectedGroups() : new Set<string>()
          
          // Vérifier si une connexion est en cours
          const isConnecting = connectionStart !== null
          
          return elements.map((element) => {
            // Si aucune connexion n'existe, tous les éléments sont considérés comme "connectés" (opacité 100%)
            // Sinon, seuls les éléments du groupe connecté sont à 100%
            const isConnected = !hasAnyConnection || connectedElements.has(element.id)
            const isFocused = focusState?.id === element.id
            const isDimmed = !!focusState && focusState.id !== element.id
            
            return (
              <CanvasElementComponent
                key={element.id}
                element={element}
                isSelected={selectedIds.includes(element.id)}
                selectionCount={selectedIds.length}
                isConnected={isConnected}
                isConnecting={isConnecting}
                isFocused={isFocused}
                isDimmed={isDimmed}
                onSelect={handleElementSelect}
                onUpdate={handleUpdateElement}
                onDelete={handleDeleteElement}
                onDeleteSelection={() => setShowMultiDeleteWarning(true)}
                onOrganizeSelection={handleOrganizeSelection}
                onBringToFront={handleBringToFront}
                getSnappingPosition={getSnappingPosition}
                onSnap={handleSnapLines}
                onDrag={handleElementDrag}
                onAIAction={handleAIAction}
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
                onRunPrompt={handleRunPrompt}
                onFocusElement={handleFocusElement}
                scale={scale}
              />
            )
          })
        })()}
        
        {selectionRect && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-200/30 pointer-events-none z-[999999] rounded-xl"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
        )}
        
        {snapLines.x !== null && (
          <div 
            className="absolute top-0 bottom-0 w-px z-[9999999] pointer-events-none"
            style={{ 
              left: snapLines.x, 
              top: (snapLines.activeY || 0) - 2000,
              height: 4000,
              background: `linear-gradient(to bottom, transparent 0%, rgba(6,182,212,0) 10%, rgba(6,182,212,0.8) 40%, rgba(6,182,212,1) 50%, rgba(6,182,212,0.8) 60%, rgba(6,182,212,0) 90%, transparent 100%)`
            }} 
          />
        )}
        {snapLines.y !== null && (
          <div 
            className="absolute left-0 right-0 h-px z-[9999999] pointer-events-none"
            style={{ 
              top: snapLines.y, 
              left: (snapLines.activeX || 0) - 2000,
              width: 4000,
              background: `linear-gradient(to right, transparent 0%, rgba(6,182,212,0) 10%, rgba(6,182,212,0.8) 40%, rgba(6,182,212,1) 50%, rgba(6,182,212,0.8) 60%, rgba(6,182,212,0) 90%, transparent 100%)`
            }}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Top Bar Minimaliste */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-2 py-2 bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-full shadow-xl transition-all hover:shadow-2xl hover:bg-white/90">
        {/* Logo */}
        <div className="flex items-center gap-2 pl-2 pr-4 min-w-[120px] border-r border-gray-200/60">
          <img
            src={Logo.src}
            alt="Jumble"
            className="h-6 w-auto object-contain"
          />
        </div>

        {/* Space Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-full h-9 px-3 text-gray-700 hover:bg-gray-100 border-r border-gray-200/50 rounded-r-none mr-1">
              <LayoutGrid className="h-4 w-4 mr-2 text-gray-500" />
              <span className="max-w-[100px] truncate font-medium">
                {spaces.find(s => s.id === currentSpaceId)?.name || "Mon Jumble"}
              </span>
              <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs font-medium text-gray-500 uppercase">Mes Jumbles</DropdownMenuLabel>
            {spaces.map(space => (
              <DropdownMenuItem 
                key={space.id} 
                onClick={() => handleSwitchSpace(space.id)}
                className="flex items-center justify-between group"
              >
                <span className={space.id === currentSpaceId ? "font-medium" : ""}>
                  {space.name}
                </span>
                <div className="flex items-center gap-1">
                  {space.id === currentSpaceId && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                  {spaces.length > 1 && (
                    <button
                      type="button"
                      className="ml-1 rounded-full p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSpaceToDelete(space)
                        setIsDeleteSpaceDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateSpace}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Jumble
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openRenameDialog}>
                <PenLine className="h-4 w-4 mr-2" />
                Renommer le Jumble actuel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-full h-9 px-4 text-gray-700 hover:bg-gray-100">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56 my-2">
            <DropdownMenuItem onClick={() => addElement("text")}>
              <Type className="h-4 w-4 mr-2" />
              Texte
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("task")}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Tâche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("postit")}>
              <StickyNote className="h-4 w-4 mr-2" />
              Post-it
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("prompt")}>
              <Zap className="h-4 w-4 mr-2 text-yellow-500" />
              Prompt IA
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("youtube")}>
              <Youtube className="h-4 w-4 mr-2" />
              YouTube
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("spotify")}>
              <Music className="h-4 w-4 mr-2" />
              Spotify
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("applemusic")}>
              <Music className="h-4 w-4 mr-2 text-red-500" />
              Apple Music
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("figma")}>
              <Figma className="h-4 w-4 mr-2" />
              Figma
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("notion")}>
              <FileText className="h-4 w-4 mr-2" />
              Notion
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("linear")}>
              <LayoutList className="h-4 w-4 mr-2" />
              Linear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("linkedin")}>
              <Linkedin className="h-4 w-4 mr-2" />
              LinkedIn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("twitter")}>
              <Twitter className="h-4 w-4 mr-2" />
              X (Twitter)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("link")}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Lien Web
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("webcam")}>
              <Video className="h-4 w-4 mr-2" />
              Webcam
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("gif")}>
              <Image className="h-4 w-4 mr-2" />
              GIF animé
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("image")}>
              <Image className="h-4 w-4 mr-2" />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addElement("clock")}>
              <Clock className="h-4 w-4 mr-2" />
              Horloge
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={zoomOut}>
                <Minus className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-gray-500 w-9 text-center select-none">
                {Math.round(scale * 100)}%
            </span>
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={zoomIn}>
                <Plus className="h-4 w-4" />
            </Button>
        </div>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <Button 
          variant="ghost" 
          size="sm" 
          className="rounded-full h-9 px-4 text-gray-700 hover:bg-gray-100"
          onClick={() => setShowOrganizeWarning(true)}
          title="Réorganiser automatiquement"
        >
          <Wand2 className="h-4 w-4 mr-2" />
          Organiser
        </Button>

        <Dialog open={showOrganizeWarning} onOpenChange={setShowOrganizeWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Organiser les éléments</DialogTitle>
              <DialogDescription>
                L'organisation automatique va réarranger tous vos éléments et modifier leur disposition actuelle. Cette action est irréversible. Voulez-vous continuer ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOrganizeWarning(false)}>
                Annuler
              </Button>
              <Button onClick={() => {
                organizeElements()
                setShowOrganizeWarning(false)
              }}>
                Organiser
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showMultiDeleteWarning} onOpenChange={setShowMultiDeleteWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer la sélection</DialogTitle>
              <DialogDescription>
                Vous êtes sur le point de supprimer {selectedIds.length} éléments. Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMultiDeleteWarning(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDeleteSelection}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Dialog aide raccourcis clavier */}
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9 text-gray-700 hover:bg-gray-100"
              title="Raccourcis clavier"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Raccourcis clavier</DialogTitle>
              <DialogDescription>
                Utilise ces raccourcis pour naviguer plus vite dans ton espace.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium text-gray-700">Navigation dans le canvas</p>
                <ul className="space-y-1 text-gray-600">
                  <li className="flex justify-between gap-4">
                    <span>Panoramique</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      ⌘ / Ctrl + drag
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Zoomer / Dézoomer</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      ⌘ / Ctrl + molette
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-gray-700">Sélection & déplacement</p>
                <ul className="space-y-1 text-gray-600">
                  <li className="flex justify-between gap-4">
                    <span>Sélection multiple (clic)</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      ⇧ Shift + clic
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Sélection rectangulaire</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      Drag sur le fond
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Alignement / snap des cartes</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      ⌥ Alt pendant le drag
                    </span>
                  </li>
                </ul>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-gray-700">IA & câbles</p>
                <ul className="space-y-1 text-gray-600">
                  <li className="flex justify-between gap-4">
                    <span>Tirer un câble</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      Drag depuis le port droit
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Connecter une carte</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                      Lâcher sur le port gauche
                    </span>
                  </li>
                </ul>
              </div>

              <p className="text-xs text-gray-400">
                Astuce : colle du texte ou des images directement dans le canvas (Cmd/Ctrl + V) pour créer des cartes automatiquement.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9 text-gray-700 hover:bg-gray-100"
              title="Paramètres"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Paramètres</DialogTitle>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Onboarding
                </label>
                <p className="text-xs text-gray-500">
                  Rouvrez la présentation de Jumble pour revoir les bases.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new Event("jumble-open-onboarding"))
                    }
                  }}
                >
                  Revoir l’onboarding
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Couleur de fond
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { class: "bg-gray-50", name: "Gris (Défaut)" },
                    { class: "bg-white", name: "Blanc" },
                    { class: "bg-blue-50", name: "Bleu" },
                    { class: "bg-yellow-50", name: "Jaune" },
                    { class: "bg-rose-50", name: "Rose" },
                    { class: "bg-green-50", name: "Vert" },
                    { class: "bg-slate-100", name: "Ardoise" },
                    { class: "bg-stone-100", name: "Pierre" },
                    { class: "bg-orange-50", name: "Orange" },
                    { class: "bg-indigo-50", name: "Indigo" },
                  ].map((color) => (
                    <button
                      key={color.class}
                      className={`w-8 h-8 rounded-full border border-gray-200 ${color.class} ${
                        bgColor === color.class ? "ring-2 ring-black ring-offset-2" : "hover:scale-110 transition-transform"
                      }`}
                      onClick={() => setBgColor(color.class)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Clé API OpenAI
                </label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={openAIKey}
                  onChange={(e) => setOpenAIKey(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Votre clé est stockée localement dans votre navigateur.
                </p>
              </div>

              <div className="border-t pt-4 mt-4 space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  Gestion du Jumble
                </label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={handleExportSpace}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={handleImportClick}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importer
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Sauvegardez ou restaurez l'intégralité de votre Jumble (éléments, positions, réglages).
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Rename Space */}
        <Dialog open={isSpaceRenameDialogOpen} onOpenChange={setIsSpaceRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renommer le Jumble</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Input 
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    placeholder="Nom du Jumble"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSpace()
                    }}
                />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSpaceRenameDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleRenameSpace}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Delete Space */}
        <Dialog open={isDeleteSpaceDialogOpen} onOpenChange={setIsDeleteSpaceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer ce Jumble ?</DialogTitle>
              <DialogDescription>
                Vous allez supprimer définitivement <span className="font-semibold">{spaceToDelete?.name}</span> et tous
                les éléments qu’il contient. Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteSpaceDialogOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteSpace}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
      
      {/* Input caché pour l'import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        onChange={handleImportSpace}
        className="hidden"
      />
    </div>
  )
}
