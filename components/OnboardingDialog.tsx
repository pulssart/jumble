"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language"

const ONBOARDING_KEY = "jumble-onboarding-shown-v1"

export function OnboardingDialog() {
  const [open, setOpen] = useState(false)
  const { language } = useLanguage()

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const alreadyShown = window.localStorage.getItem(ONBOARDING_KEY)
      if (!alreadyShown) {
        setOpen(true)
        window.localStorage.setItem(ONBOARDING_KEY, "1")
      }
    } catch (e) {
      console.error("Erreur lecture onboarding:", e)
    }

    const handleReopen = () => {
      setOpen(true)
    }

    window.addEventListener("jumble-open-onboarding", handleReopen)
    return () => {
      window.removeEventListener("jumble-open-onboarding", handleReopen)
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
    try {
      window.localStorage.setItem(ONBOARDING_KEY, "1")
    } catch (e) {
      console.error("Erreur écriture onboarding:", e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl border-0 bg-white p-16 shadow-none">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Titre Jumble */}
          <h1 className="text-6xl font-bold text-gray-900 tracking-tight">
            Jumble
          </h1>

          {/* Tagline */}
          <p className="text-xl text-gray-700 font-normal">
            {language === "fr" 
              ? "Organisez vos idées dans un canavs infini"
              : "Organize your ideas in an infinite canvas"}
          </p>

          {/* 3 Cartes horizontales */}
          <div className="grid w-full grid-cols-3 gap-6 mt-10">
            {/* Carte 1: DÉPOSEZ */}
            <div className="bg-gray-100 rounded-xl p-6 shadow-md">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {language === "fr" ? "1. DÉPOSEZ" : "1. DEPOSIT"}
              </p>
              <p className="text-sm font-medium text-gray-800 mb-3">
                {language === "fr" ? "Ajoutez des cartes" : "Add cards"}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {language === "fr"
                  ? "Coller des URLs, écrivrez des notes, capturez des idées. Chaque élément devient une carte sur votre canvas"
                  : "Paste URLs, write notes, capture ideas. Each element becomes a card on your canvas"}
              </p>
            </div>

            {/* Carte 2: ORDONNEZ */}
            <div className="bg-gray-100 rounded-xl p-6 shadow-md">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {language === "fr" ? "2. ORDONNEZ" : "2. ORGANIZE"}
              </p>
              <p className="text-sm font-medium text-gray-800 mb-3">
                {language === "fr" ? "Déplacer dans l'espace" : "Move in space"}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {language === "fr"
                  ? "Organisez vos cartes librement, par zones, par projets ou par humeurs. Aucune structure rigide ne vous limite."
                  : "Organize your cards freely, by zones, by projects or by moods. No rigid structure limits you."}
              </p>
            </div>

            {/* Carte 3: NAVIGUEZ */}
            <div className="bg-gray-100 rounded-xl p-6 shadow-md">
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {language === "fr" ? "3. NAVIGUEZ" : "3. NAVIGATE"}
              </p>
              <p className="text-sm font-medium text-gray-800 mb-3">
                {language === "fr" ? "Zoomez dans vos idées" : "Zoom into your ideas"}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                {language === "fr"
                  ? "Utilisez le zoom et le déplacement pour passer du détails à la vision d'ensemble en un gest"
                  : "Use zoom and movement to go from details to the overview in one gesture"}
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-sm text-gray-600 mt-6">
            {language === "fr" ? "* c'est gratuit pour le moment" : "* it's free for now"}
          </p>

          {/* Bouton */}
          <Button
            onClick={handleClose}
            className="w-full max-w-lg bg-black text-white hover:bg-gray-900 rounded-xl py-4 text-base font-medium mt-6"
          >
            {language === "fr" ? "Commencer sur le canvas" : "Start on the canvas"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
