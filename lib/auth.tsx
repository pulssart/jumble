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
      // Essayer de se déconnecter avec scope local (au lieu de global) pour éviter les problèmes Safari
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) {
        console.warn("Erreur lors de la déconnexion Supabase:", error)
        // Même en cas d'erreur, on nettoie le state local
      }
    } catch (err) {
      console.error("Erreur lors de la déconnexion:", err)
      // Même en cas d'erreur, on nettoie le state local
    } finally {
      // Toujours nettoyer le state local, même si l'appel API échoue
      // Cela permet de fonctionner même si Safari bloque les cookies tiers
      setSession(null)
      setUser(null)
      
      // Nettoyer aussi le localStorage pour forcer la déconnexion
      try {
        localStorage.removeItem('sb-ogmohzywzjcngxggozbz-auth-token')
        // Nettoyer tous les tokens Supabase potentiels
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        // Ignorer les erreurs de localStorage
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
