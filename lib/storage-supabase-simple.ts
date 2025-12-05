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

    // Ajouter un timeout pour éviter les blocages
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), 10000) // 10 secondes max
    })

    const saveOperation = async () => {
      // Vérifier si un backup existe déjà
      const { data: existing, error: selectError } = await supabase
        .from("backups")
        .select("id, session_id")
        .eq("user_id", userId)
        .single()

      // Si la table n'existe pas, ignorer silencieusement
      if (selectError && (selectError.code === "42P01" || selectError.message?.includes("does not exist"))) {
        console.warn("Table backups n'existe pas encore, sauvegarde ignorée")
        return
      }

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

        if (error) {
          // Si erreur de table inexistante, ignorer
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("Table backups n'existe pas encore, sauvegarde ignorée")
            return
          }
          throw error
        }
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

        if (error) {
          // Si erreur de table inexistante, ignorer
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.warn("Table backups n'existe pas encore, sauvegarde ignorée")
            return
          }
          throw error
        }
        console.log("Backup créé avec succès")
      }
    }

    await Promise.race([saveOperation(), timeoutPromise])
  } catch (error: any) {
    // Ne pas bloquer l'application si la sauvegarde échoue
    if (error?.message === "Timeout") {
      console.warn("Timeout lors de la sauvegarde du backup")
    } else {
      console.error("Erreur sauvegarde backup:", error?.message || error)
    }
    // Ne pas throw pour ne pas bloquer l'application
  }
}

// Charger le dernier backup
export async function loadBackup(userId: string): Promise<BackupData | null> {
  try {
    // Ajouter un timeout pour éviter les blocages
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 10000) // 10 secondes max
    })

    const queryPromise = supabase
      .from("backups")
      .select("backup_data, session_id, updated_at")
      .eq("user_id", userId)
      .single()

    const result = await Promise.race([queryPromise, timeoutPromise])
    
    // Si timeout, retourner null
    if (result === null) {
      console.warn("Timeout lors du chargement du backup")
      return null
    }

    const { data, error } = result as any

    if (error) {
      // Gérer tous les cas d'erreur possibles
      if (error.code === "PGRST116" || error.code === "42P01" || error.message?.includes("does not exist")) {
        // Aucun backup trouvé OU table n'existe pas encore
        console.log("Aucun backup trouvé ou table inexistante:", error.code)
        return null
      }
      // Pour toute autre erreur, logger et retourner null (ne pas bloquer)
      console.warn("Erreur lors du chargement du backup:", error.code, error.message)
      return null
    }

    if (!data) return null

    const currentSessionId = getSessionId()
    const lastUpdate = new Date(data.updated_at).getTime()
    const now = Date.now()
    const timeSinceUpdate = now - lastUpdate
    
    // Si c'est une autre session ET que le backup a été mis à jour il y a moins de 5 minutes
    // (signifie qu'une autre session est active), on prend le contrôle
    if (data.session_id !== currentSessionId && timeSinceUpdate < 5 * 60 * 1000) {
      console.log("Une autre session est active (backup mis à jour il y a", Math.round(timeSinceUpdate / 1000), "secondes), prise de contrôle de la session")
      
      // Mettre à jour le session_id pour prendre le contrôle (sans attendre pour ne pas bloquer)
      supabase
        .from("backups")
        .update({
          session_id: currentSessionId,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .then(() => {
          console.log("Contrôle de la session pris")
        })
        .catch((err) => {
          console.warn("Erreur lors de la prise de contrôle:", err)
        })
    }

    // Charger les données (soit de la session actuelle, soit de la session dont on vient de prendre le contrôle)
    console.log("Backup chargé avec succès")
    return data.backup_data as BackupData
  } catch (error: any) {
    // Gérer toutes les erreurs possibles sans bloquer
    console.error("Erreur chargement backup:", error?.message || error)
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
