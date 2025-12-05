"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, Session, AuthError } from "@supabase/supabase-js"
import { supabase } from "./supabase"

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    try {
      console.log("Déconnexion en cours...")
      
      // Nettoyer d'abord le state local pour une déconnexion immédiate
      setSession(null)
      setUser(null)
      
      // Nettoyer le localStorage AVANT l'appel API pour forcer la déconnexion
      try {
        // Nettoyer tous les tokens Supabase
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
        // Nettoyer les données Jumble du localStorage
        localStorage.removeItem('spaces-list')
        localStorage.removeItem('current-space-id')
        localStorage.removeItem('jumble-session-id')
        localStorage.removeItem('space_openai_key')
        
        // Nettoyer IndexedDB
        if (typeof indexedDB !== 'undefined') {
          const deleteRequest = indexedDB.deleteDatabase('SpaceCanvasDB')
          deleteRequest.onerror = () => {
            console.warn("Erreur suppression IndexedDB (non bloquant)")
          }
          deleteRequest.onsuccess = () => {
            console.log("IndexedDB supprimé avec succès")
          }
        }
      } catch (e) {
        console.warn("Erreur nettoyage localStorage:", e)
      }
      
      // Essayer de se déconnecter avec Supabase (avec timeout pour éviter les blocages)
      try {
        const signOutPromise = supabase.auth.signOut({ scope: 'local' })
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 5000)
        )
        
        await Promise.race([signOutPromise, timeoutPromise])
        console.log("Déconnexion Supabase réussie")
      } catch (err: any) {
        // Ignorer les erreurs de déconnexion Supabase (timeout, réseau, etc.)
        // On a déjà nettoyé le state local, donc la déconnexion est effective
        if (err?.message === "Timeout") {
          console.warn("Timeout lors de la déconnexion Supabase (non bloquant)")
        } else {
          console.warn("Erreur lors de la déconnexion Supabase (non bloquant):", err)
        }
      }
      
      // Forcer un rechargement de la page pour s'assurer que tout est bien nettoyé
      // Cela garantit que l'application revient à l'état de connexion
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (err) {
      console.error("Erreur critique lors de la déconnexion:", err)
      // Même en cas d'erreur critique, forcer le rechargement
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
