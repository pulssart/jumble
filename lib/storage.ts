import { CanvasElement, Space } from "@/types/canvas"

const SPACES_KEY = "spaces-list"
const CURRENT_SPACE_KEY = "current-space-id"

// Old keys for migration
const LEGACY_STORAGE_KEY = "space-canvas-elements"
const LEGACY_OFFSET_KEY = "space-canvas-offset"
const LEGACY_ZOOM_KEY = "space-canvas-zoom"
const LEGACY_BG_COLOR_KEY = "space-canvas-bg-color"

// Helper to generate keys per space (for localStorage)
const getSpaceKey = (spaceId: string, suffix: string) => `space-${spaceId}-${suffix}`

// --- IndexedDB Setup ---
const DB_NAME = "SpaceCanvasDB"
const DB_VERSION = 1
const STORE_ELEMENTS = "elements"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_ELEMENTS)) {
        db.createObjectStore(STORE_ELEMENTS)
      }
    }
  })
}

async function dbPut(storeName: string, key: string, value: any): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)
    const request = store.put(value, key)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly")
    const store = transaction.objectStore(storeName)
    const request = store.get(key)
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function dbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)
    
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export interface CanvasState {
  elements: CanvasElement[]
  canvasOffset: { x: number; y: number }
  zoom: number
  bgColor: string
}

// --- Space Management ---

export function getSpaces(): Space[] {
  try {
    const data = localStorage.getItem(SPACES_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error("Erreur chargement spaces:", error)
    return []
  }
}

export function saveSpaces(spaces: Space[]) {
  localStorage.setItem(SPACES_KEY, JSON.stringify(spaces))
}

export function getCurrentSpaceId(): string | null {
  return localStorage.getItem(CURRENT_SPACE_KEY)
}

export function setCurrentSpaceId(id: string) {
  localStorage.setItem(CURRENT_SPACE_KEY, id)
}

export function createSpace(name: string): Space {
  const spaces = getSpaces()
  const newSpace: Space = {
    id: crypto.randomUUID(),
    name,
    lastModified: Date.now(),
  }
  spaces.push(newSpace)
  saveSpaces(spaces)
  
  // Initialize default values for the new space
  saveCanvasBgColor(newSpace.id, "bg-gray-50")
  saveCanvasZoom(newSpace.id, 1)
  saveCanvasOffset(newSpace.id, { x: 0, y: 0 })
  // Initial save to DB (empty)
  saveElements(newSpace.id, [])

  return newSpace
}

export function updateSpace(id: string, updates: Partial<Space>) {
  const spaces = getSpaces()
  const index = spaces.findIndex(s => s.id === id)
  if (index !== -1) {
    spaces[index] = { ...spaces[index], ...updates, lastModified: Date.now() }
    saveSpaces(spaces)
  }
}

export function deleteSpace(id: string) {
  const spaces = getSpaces()
  const newSpaces = spaces.filter(s => s.id !== id)
  saveSpaces(newSpaces)
  
  // Cleanup space data
  dbDelete(STORE_ELEMENTS, id).catch(console.error)
  
  localStorage.removeItem(getSpaceKey(id, "elements")) // Clean legacy/fallback
  localStorage.removeItem(getSpaceKey(id, "offset"))
  localStorage.removeItem(getSpaceKey(id, "zoom"))
  localStorage.removeItem(getSpaceKey(id, "bg-color"))
}

export async function initSpaces(): Promise<Space> {
  const spaces = getSpaces()
  
  // Migration logic
  if (spaces.length === 0) {
    const legacyElements = localStorage.getItem(LEGACY_STORAGE_KEY)
    
    const defaultSpace: Space = {
      id: crypto.randomUUID(),
      name: "Mon Espace",
      lastModified: Date.now()
    }
    
    if (legacyElements) {
      // Migrate legacy data directly to IndexedDB
      console.log("Migration des données existantes vers IndexedDB...")
      
      try {
        const elements = JSON.parse(legacyElements) as CanvasElement[]
        // Save directly to DB, skipping intermediate localStorage to avoid QuotaExceededError
        await saveElements(defaultSpace.id, elements)
        
        // Only remove legacy data after successful save
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch (e) {
        console.error("Erreur lors de la migration des éléments:", e)
      }
      
      const legacyOffset = localStorage.getItem(LEGACY_OFFSET_KEY)
      if (legacyOffset) localStorage.setItem(getSpaceKey(defaultSpace.id, "offset"), legacyOffset)
      
      const legacyZoom = localStorage.getItem(LEGACY_ZOOM_KEY)
      if (legacyZoom) localStorage.setItem(getSpaceKey(defaultSpace.id, "zoom"), legacyZoom)
      
      const legacyBg = localStorage.getItem(LEGACY_BG_COLOR_KEY)
      if (legacyBg) localStorage.setItem(getSpaceKey(defaultSpace.id, "bg-color"), legacyBg)
      
      // Cleanup other legacy keys
      localStorage.removeItem(LEGACY_OFFSET_KEY)
      localStorage.removeItem(LEGACY_ZOOM_KEY)
      localStorage.removeItem(LEGACY_BG_COLOR_KEY)
    } else {
        // Initial save for empty space
        await saveElements(defaultSpace.id, [])
    }
    
    saveSpaces([defaultSpace])
    setCurrentSpaceId(defaultSpace.id)
    return defaultSpace
  }
  
  // Ensure a current space is selected
  let currentId = getCurrentSpaceId()
  if (!currentId || !spaces.find(s => s.id === currentId)) {
    currentId = spaces[0].id
    setCurrentSpaceId(currentId)
  }
  
  return spaces.find(s => s.id === currentId)!
}

// --- Data Access (Space-aware) ---

export async function saveElements(spaceId: string, elements: CanvasElement[]): Promise<void> {
  try {
    // 1. Try saving to IndexedDB
    await dbPut(STORE_ELEMENTS, spaceId, elements)
    
    // 2. If successful, try to clean up localStorage version if it exists to free quota
    try {
        if (localStorage.getItem(getSpaceKey(spaceId, "elements"))) {
            localStorage.removeItem(getSpaceKey(spaceId, "elements"))
        }
    } catch (e) {
        // Ignore localStorage errors
    }

    updateSpace(spaceId, {}) // Update last modified
  } catch (error) {
    console.error("Erreur lors de la sauvegarde dans IndexedDB:", error)
  }
}

export async function loadElements(spaceId: string): Promise<CanvasElement[]> {
  try {
    // 1. Try loading from IndexedDB
    const dbData = await dbGet<CanvasElement[]>(STORE_ELEMENTS, spaceId)
    if (dbData) {
        return dbData
    }

    // 2. Fallback: Check localStorage (Migration path)
    // Note: This path is risky if LS is huge, but it's a fallback. 
    // The initSpaces migration handles the initial massive migration safely.
    const lsData = localStorage.getItem(getSpaceKey(spaceId, "elements"))
    if (lsData) {
        console.log("Migration: Chargement depuis localStorage vers IndexedDB...")
        const elements = JSON.parse(lsData) as CanvasElement[]
        
        // Async migrate to DB
        await saveElements(spaceId, elements)
        
        return elements
    }

    return []
  } catch (error) {
    console.error("Erreur lors du chargement:", error)
    return []
  }
}

// Offset, Zoom, and BgColor remain in LocalStorage for now (lightweight)

export function saveCanvasOffset(spaceId: string, offset: { x: number; y: number }): void {
  try {
    localStorage.setItem(getSpaceKey(spaceId, "offset"), JSON.stringify(offset))
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la position:", error)
  }
}

export function loadCanvasOffset(spaceId: string): { x: number; y: number } {
  try {
    const data = localStorage.getItem(getSpaceKey(spaceId, "offset"))
    if (!data) return { x: 0, y: 0 }
    return JSON.parse(data) as { x: number; y: number }
  } catch (error) {
    console.error("Erreur lors du chargement de la position:", error)
    return { x: 0, y: 0 }
  }
}

export function saveCanvasZoom(spaceId: string, zoom: number): void {
  try {
    localStorage.setItem(getSpaceKey(spaceId, "zoom"), JSON.stringify(zoom))
  } catch (error) {
    console.error("Erreur sauvegarde zoom:", error)
  }
}

export function loadCanvasZoom(spaceId: string): number {
  try {
    const data = localStorage.getItem(getSpaceKey(spaceId, "zoom"))
    if (!data) return 1
    return JSON.parse(data) as number
  } catch (error) {
    console.error("Erreur chargement zoom:", error)
    return 1
  }
}

export function saveCanvasBgColor(spaceId: string, color: string): void {
  try {
    localStorage.setItem(getSpaceKey(spaceId, "bg-color"), color)
  } catch (error) {
    console.error("Erreur sauvegarde couleur de fond:", error)
  }
}

export function loadCanvasBgColor(spaceId: string): string {
  try {
    const data = localStorage.getItem(getSpaceKey(spaceId, "bg-color"))
    return data || "bg-gray-50"
  } catch (error) {
    console.error("Erreur chargement couleur de fond:", error)
    return "bg-gray-50"
  }
}
