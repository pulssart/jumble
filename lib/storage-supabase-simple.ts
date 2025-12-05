import { CanvasElement, Space } from "@/types/canvas"
import { supabase } from "./supabase"

// Générer un ID de session unique
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Stocker l'ID de session dans le localStorage
const SESSION_ID_KEY = "jumble-session-id"

function getSessionId(): string {
  if (typeof window === "undefined") return generateSessionId()
  let sessionId = localStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

// Structure du backup (identique à l'export)
interface BackupData {
  version: number
  timestamp: number
  currentSpaceId: string | null
  spaces: Space[]
  dataBySpace: Record<string, {
    elements: CanvasElement[]
    canvasOffset: { x: number; y: number }
    scale: number
    bgColor: string
  }>
}

// Sauvegarder un backup complet
export async function saveBackup(
  userId: string,
  spaces: Space[],
  currentSpaceId: string | null,
  dataBySpace: Record<string, {
    elements: CanvasElement[]
    canvasOffset: { x: number; y: number }
    scale: number
    bgColor: string
  }>
): Promise<void> {
  try {
    const sessionId = getSessionId()
    
    const backupData: BackupData = {
      version: 2,
      timestamp: Date.now(),
      currentSpaceId,
      spaces,
      dataBySpace,
    }

    // Vérifier si un backup existe déjà
    const { data: existing } = await supabase
      .from("backups")
      .select("id, session_id")
      .eq("user_id", userId)
      .single()

    if (existing) {
      // Mettre à jour le backup existant
      const { error } = await supabase
        .from("backups")
        .update({
          backup_data: backupData,
          session_id: sessionId,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (error) throw error
      console.log("Backup mis à jour avec succès")
    } else {
      // Créer un nouveau backup
      const { error } = await supabase
        .from("backups")
        .insert({
          user_id: userId,
          backup_data: backupData,
          session_id: sessionId,
        })

      if (error) throw error
      console.log("Backup créé avec succès")
    }
  } catch (error) {
    console.error("Erreur sauvegarde backup:", error)
    throw error
  }
}

// Charger le dernier backup
export async function loadBackup(userId: string): Promise<BackupData | null> {
  try {
    const { data, error } = await supabase
      .from("backups")
      .select("backup_data, session_id, updated_at")
      .eq("user_id", userId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // Aucun backup trouvé
        console.log("Aucun backup trouvé")
        return null
      }
      throw error
    }

    if (!data) return null

    const currentSessionId = getSessionId()
    const lastUpdate = new Date(data.updated_at).getTime()
    const now = Date.now()
    const timeSinceUpdate = now - lastUpdate
    
    // Si c'est une autre session ET que le backup a été mis à jour il y a moins de 5 minutes
    // (signifie qu'une autre session est active), on ferme cette session
    if (data.session_id !== currentSessionId && timeSinceUpdate < 5 * 60 * 1000) {
      console.log("Une autre session est active (backup mis à jour il y a", Math.round(timeSinceUpdate / 1000), "secondes), fermeture de cette session")
      // Déconnecter l'utilisateur pour forcer la reconnexion
      await supabase.auth.signOut({ scope: 'local' })
      // Rediriger vers la page de login
      if (typeof window !== "undefined") {
        alert("Une autre session est active. Cette session va être fermée.")
        window.location.reload()
      }
      return null
    }

    // Si c'est la même session ou si le backup est ancien, on charge les données
    console.log("Backup chargé avec succès (session:", data.session_id === currentSessionId ? "actuelle" : "ancienne", ")")
    return data.backup_data as BackupData
  } catch (error) {
    console.error("Erreur chargement backup:", error)
    return null
  }
}

// Vérifier si une autre session est active
export async function checkActiveSession(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("backups")
      .select("session_id, updated_at")
      .eq("user_id", userId)
      .single()

    if (error || !data) return false

    const currentSessionId = getSessionId()
    const lastUpdate = new Date(data.updated_at).getTime()
    const now = Date.now()
    
    // Si le backup a été mis à jour il y a moins de 5 minutes, considérer la session comme active
    const isActive = data.session_id !== currentSessionId && (now - lastUpdate) < 5 * 60 * 1000
    
    return isActive
  } catch (error) {
    console.error("Erreur vérification session:", error)
    return false
  }
}
