"use client"

import { useEffect, useState } from "react"
import { X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language"

const UPDATE_KEY = "jumble-update-shown-v1"

const updates = {
  fr: {
    title: "Nouveauté",
    instagram: {
      title: "Carte Instagram",
      description: "Vous pouvez maintenant ajouter des posts, reels et vidéos Instagram directement sur votre canvas !",
    },
    cta: "Découvrir",
    dismiss: "Fermer",
  },
  en: {
    title: "What's New",
    instagram: {
      title: "Instagram Card",
      description: "You can now add Instagram posts, reels and videos directly to your canvas!",
    },
    cta: "Discover",
    dismiss: "Close",
  },
}

export function UpdateModal() {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const t = updates[language]

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const alreadyShown = window.localStorage.getItem(UPDATE_KEY)
      if (!alreadyShown) {
        // Afficher avec un petit délai pour ne pas surcharger l'UI au chargement
        const timer = setTimeout(() => {
          setOpen(true)
        }, 2000)
        return () => clearTimeout(timer)
      }
    } catch (e) {
      console.error("Erreur lecture update modal:", e)
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
    try {
      window.localStorage.setItem(UPDATE_KEY, "1")
    } catch (e) {
      console.error("Erreur écriture update modal:", e)
    }
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-left-5 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 max-w-sm w-full">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">{t.title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex-shrink-0">
              <svg
                className="h-5 w-5 text-purple-600"
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">{t.instagram.title}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{t.instagram.description}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            className="flex-1 text-xs font-medium"
            onClick={handleClose}
          >
            {t.cta}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={handleClose}
          >
            {t.dismiss}
          </Button>
        </div>
      </div>
    </div>
  )
}

