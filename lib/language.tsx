"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type Language = "fr" | "en"

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = "jumble-language-v1"

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr")

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null
      if (stored === "fr" || stored === "en") {
        setLanguageState(stored)
      }
    } catch {
      // ignore
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, lang)
      }
    } catch {
      // ignore
    }
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage doit être utilisé à l'intérieur de LanguageProvider")
  }
  return ctx
}
