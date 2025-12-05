import { CanvasElement, Space } from "@/types/canvas"
import { supabase } from "./supabase"

// Fonction utilitaire pour s'assurer que la session est chargée
async function ensureSession(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error("Aucune session active. Veuillez vous connecter.")
  }
}

// Types pour la base de données
interface SpaceRow {
  id: string
  user_id: string
  name: string
  last_modified: number
  canvas_offset: { x: number; y: number }
  canvas_zoom: number
  bg_color: string
}

interface ElementRow {
  id: string
  space_id: string
  user_id: string
  type: string
  position: { x: number; y: number }
  width?: number
  height?: number
  z_index?: number
  parent_id?: string | null
  connections?: string[]
  data: Record<string, any>
}

// --- Space Management ---

export async function getSpaces(userId: string): Promise<Space[]> {
  try {
    // S'assurer que la session est chargée
    await ensureSession()
    
    const { data, error } = await supabase
      .from("spaces")
      .select("*")
      .eq("user_id", userId)
      .order("last_modified", { ascending: false })

    if (error) {
      console.error("Erreur Supabase getSpaces:", error)
      throw error
    }

    const spaces = (data || []).map((row: SpaceRow) => ({
      id: row.id,
      name: row.name,
      lastModified: row.last_modified,
    }))
    
    console.log(`Chargé ${spaces.length} spaces pour l'utilisateur ${userId}`)
    return spaces
  } catch (error) {
    console.error("Erreur chargement spaces:", error)
    return []
  }
}

export async function getCurrentSpaceId(userId: string): Promise<string | null> {
  try {
    // On récupère le dernier space modifié comme space courant
    const { data, error } = await supabase
      .from("spaces")
      .select("id")
      .eq("user_id", userId)
      .order("last_modified", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") throw error // PGRST116 = no rows
    return data?.id || null
  } catch (error) {
    console.error("Erreur récupération space courant:", error)
    return null
  }
}

export async function createSpace(userId: string, name: string): Promise<Space> {
  try {
    const newSpace: Omit<SpaceRow, "id" | "user_id"> = {
      name,
      last_modified: Date.now(),
      canvas_offset: { x: 0, y: 0 },
      canvas_zoom: 1,
      bg_color: "bg-gray-50",
    }

    const { data, error } = await supabase
      .from("spaces")
      .insert({ ...newSpace, user_id: userId })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      lastModified: data.last_modified,
    }
  } catch (error) {
    console.error("Erreur création space:", error)
    throw error
  }
}

export async function updateSpace(
  userId: string,
  id: string,
  updates: Partial<Space>
): Promise<void> {
  try {
    const updateData: Partial<SpaceRow> = {
      last_modified: Date.now(),
    }

    if (updates.name !== undefined) updateData.name = updates.name

    const { error } = await supabase
      .from("spaces")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", userId)

    if (error) throw error
  } catch (error) {
    console.error("Erreur mise à jour space:", error)
    throw error
  }
}

export async function deleteSpace(userId: string, id: string): Promise<void> {
  try {
    // Les éléments seront supprimés automatiquement grâce à ON DELETE CASCADE
    const { error } = await supabase
      .from("spaces")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) throw error
  } catch (error) {
    console.error("Erreur suppression space:", error)
    throw error
  }
}

export async function initSpaces(userId: string): Promise<Space> {
  try {
    console.log(`Initialisation spaces pour l'utilisateur ${userId}`)
    const spaces = await getSpaces(userId)
    console.log(`Spaces trouvés: ${spaces.length}`, spaces)

    if (spaces.length === 0) {
      console.log("Aucun space trouvé, création d'un space par défaut")
      // Créer un space par défaut
      const newSpace = await createSpace(userId, "Mon Espace")
      console.log("Space par défaut créé:", newSpace)
      return newSpace
    }

    // Retourner le space le plus récemment modifié
    const activeSpace = spaces[0]
    console.log("Space actif sélectionné:", activeSpace)
    return activeSpace
  } catch (error) {
    console.error("Erreur initialisation spaces:", error)
    // En cas d'erreur, créer un space par défaut
    return await createSpace(userId, "Mon Espace")
  }
}

// --- Canvas State Management ---

export async function saveCanvasOffset(
  userId: string,
  spaceId: string,
  offset: { x: number; y: number }
): Promise<void> {
  try {
    const { error } = await supabase
      .from("spaces")
      .update({ canvas_offset: offset })
      .eq("id", spaceId)
      .eq("user_id", userId)

    if (error) throw error
  } catch (error) {
    console.error("Erreur sauvegarde offset:", error)
  }
}

export async function loadCanvasOffset(
  userId: string,
  spaceId: string
): Promise<{ x: number; y: number }> {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .select("canvas_offset")
      .eq("id", spaceId)
      .eq("user_id", userId)
      .single()

    if (error) throw error
    return data?.canvas_offset || { x: 0, y: 0 }
  } catch (error) {
    console.error("Erreur chargement offset:", error)
    return { x: 0, y: 0 }
  }
}

export async function saveCanvasZoom(
  userId: string,
  spaceId: string,
  zoom: number
): Promise<void> {
  try {
    const { error } = await supabase
      .from("spaces")
      .update({ canvas_zoom: zoom })
      .eq("id", spaceId)
      .eq("user_id", userId)

    if (error) throw error
  } catch (error) {
    console.error("Erreur sauvegarde zoom:", error)
  }
}

export async function loadCanvasZoom(
  userId: string,
  spaceId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .select("canvas_zoom")
      .eq("id", spaceId)
      .eq("user_id", userId)
      .single()

    if (error) throw error
    return data?.canvas_zoom || 1
  } catch (error) {
    console.error("Erreur chargement zoom:", error)
    return 1
  }
}

export async function saveCanvasBgColor(
  userId: string,
  spaceId: string,
  color: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("spaces")
      .update({ bg_color: color })
      .eq("id", spaceId)
      .eq("user_id", userId)

    if (error) throw error
  } catch (error) {
    console.error("Erreur sauvegarde bg_color:", error)
  }
}

export async function loadCanvasBgColor(
  userId: string,
  spaceId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .select("bg_color")
      .eq("id", spaceId)
      .eq("user_id", userId)
      .single()

    if (error) throw error
    return data?.bg_color || "bg-gray-50"
  } catch (error) {
    console.error("Erreur chargement bg_color:", error)
    return "bg-gray-50"
  }
}

// --- Elements Management ---

// Fonction pour valider et convertir un ID en UUID valide
function ensureValidUUID(id: string): string {
  // Vérifier si c'est déjà un UUID valide (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(id)) {
    return id
  }
  // Si ce n'est pas un UUID valide, en générer un nouveau
  console.warn(`ID invalide détecté: ${id}, génération d'un nouvel UUID`)
  return crypto.randomUUID()
}

function elementToRow(element: CanvasElement, spaceId: string, userId: string): ElementRow {
  const { id, type, position, width, height, zIndex, parentId, connections, ...rest } = element

  // S'assurer que l'ID est un UUID valide
  const validId = ensureValidUUID(id)
  const validParentId = parentId ? ensureValidUUID(parentId) : null
  const validConnections = connections?.map(connId => ensureValidUUID(connId)) || []

  return {
    id: validId,
    space_id: spaceId,
    user_id: userId,
    type,
    position,
    width,
    height,
    z_index: zIndex,
    parent_id: validParentId,
    connections: validConnections,
    data: rest, // Toutes les autres propriétés spécifiques au type
  }
}

function rowToElement(row: ElementRow): CanvasElement {
  const { id, type, position, width, height, z_index, parent_id, connections, data } = row

  const baseElement = {
    id,
    type: type as CanvasElement["type"],
    position,
    ...(width !== null && width !== undefined ? { width } : {}),
    ...(height !== null && height !== undefined ? { height } : {}),
    ...(z_index !== null && z_index !== undefined ? { zIndex: z_index } : {}),
    ...(parent_id ? { parentId: parent_id } : {}),
    ...(connections && connections.length > 0 ? { connections } : {}),
    ...data, // Propriétés spécifiques au type
  }

  return baseElement as CanvasElement
}

export async function saveElements(
  userId: string,
  spaceId: string,
  elements: CanvasElement[]
): Promise<void> {
  try {
    // Supprimer tous les éléments existants pour ce space
    await supabase.from("elements").delete().eq("space_id", spaceId).eq("user_id", userId)

    if (elements.length === 0) return

    // Créer un mapping des anciens IDs vers les nouveaux UUIDs valides
    const idMapping = new Map<string, string>()
    elements.forEach(el => {
      const validId = ensureValidUUID(el.id)
      if (validId !== el.id) {
        idMapping.set(el.id, validId)
      } else {
        idMapping.set(el.id, el.id)
      }
    })

    // Mettre à jour les éléments avec les nouveaux IDs et références
    const updatedElements = elements.map(el => {
      const newId = idMapping.get(el.id)!
      return {
        ...el,
        id: newId,
        parentId: el.parentId ? idMapping.get(el.parentId) || null : null,
        connections: el.connections?.map(connId => idMapping.get(connId) || connId) || []
      }
    })

    // Insérer tous les éléments avec des IDs valides
    const rows = updatedElements.map((el) => elementToRow(el, spaceId, userId))

    const { error } = await supabase.from("elements").insert(rows)

    if (error) throw error

    // Mettre à jour last_modified du space
    await supabase
      .from("spaces")
      .update({ last_modified: Date.now() })
      .eq("id", spaceId)
      .eq("user_id", userId)
  } catch (error) {
    console.error("Erreur sauvegarde éléments:", error)
    throw error
  }
}

export async function loadElements(
  userId: string,
  spaceId: string
): Promise<CanvasElement[]> {
  try {
    const { data, error } = await supabase
      .from("elements")
      .select("*")
      .eq("space_id", spaceId)
      .eq("user_id", userId)
      .order("z_index", { ascending: true })

    if (error) throw error

    return (data || []).map(rowToElement)
  } catch (error) {
    console.error("Erreur chargement éléments:", error)
    return []
  }
}

// --- Migration depuis le stockage local ---

export async function migrateLocalDataToSupabase(userId: string): Promise<void> {
  try {
    console.log(`Vérification migration pour l'utilisateur ${userId}`)
    // Vérifier si l'utilisateur a déjà des données dans Supabase
    const existingSpaces = await getSpaces(userId)
    console.log(`Spaces existants dans Supabase: ${existingSpaces.length}`)
    if (existingSpaces.length > 0) {
      console.log("L'utilisateur a déjà des données dans Supabase, pas de migration nécessaire")
      return
    }

    // Charger les données depuis localStorage/IndexedDB
    const SPACES_KEY = "spaces-list"
    const spacesData = localStorage.getItem(SPACES_KEY)
    if (!spacesData) {
      console.log("Aucune donnée locale à migrer")
      return
    }

    const localSpaces: Space[] = JSON.parse(spacesData)

    console.log(`Migration de ${localSpaces.length} spaces vers Supabase...`)

    // Importer le storage local pour accéder aux fonctions de chargement
    const {
      loadElements: loadLocalElements,
      loadCanvasOffset: loadLocalOffset,
      loadCanvasZoom: loadLocalZoom,
      loadCanvasBgColor: loadLocalBgColor,
    } = await import("./storage")

    // Migrer chaque space
    for (const localSpace of localSpaces) {
      try {
        // Créer le space dans Supabase
        const newSpace = await createSpace(userId, localSpace.name)

        // Charger les éléments locaux
        const localElements = await loadLocalElements(localSpace.id)
        if (localElements.length > 0) {
          await saveElements(userId, newSpace.id, localElements)
        }

        // Migrer les paramètres du canvas
        const offset = loadLocalOffset(localSpace.id)
        await saveCanvasOffset(userId, newSpace.id, offset)

        const zoom = loadLocalZoom(localSpace.id)
        await saveCanvasZoom(userId, newSpace.id, zoom)

        const bgColor = loadLocalBgColor(localSpace.id)
        await saveCanvasBgColor(userId, newSpace.id, bgColor)

        console.log(`Space "${localSpace.name}" migré avec succès`)
      } catch (error) {
        console.error(`Erreur migration space "${localSpace.name}":`, error)
      }
    }

    console.log("Migration terminée")
  } catch (error) {
    console.error("Erreur lors de la migration:", error)
  }
}
