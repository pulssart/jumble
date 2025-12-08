"use client"

import { useEffect, useState } from "react"
import { X, Sparkles, Volume2 } from "lucide-react"
import { useLanguage } from "@/lib/language"

const UPDATE_KEY = "jumble-update-shown-v4-sounds"

const updates = {
  fr: {
    title: "Nouveautés",
    sounds: {
      title: "Sons d'interface",
      description: "Jumble prend vie avec de nouveaux effets sonores ! Profitez d'une expérience plus immersive lors de vos interactions. Vous pouvez désactiver les sons dans les paramètres.",
    },
    cta: "Découvrir",
    dismiss: "Fermer",
  },
  en: {
    title: "What's New",
    sounds: {
      title: "Interface Sounds",
      description: "Jumble comes alive with new sound effects! Enjoy a more immersive experience during your interactions. You can disable sounds in the settings.",
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
        <div className="flex items-start justify-between gap-3 mb-6">
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

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex-shrink-0">
              <Volume2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">{t.sounds.title}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{t.sounds.description}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

