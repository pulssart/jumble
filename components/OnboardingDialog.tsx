"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Logo from "../logo.png"
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
      <DialogContent className="max-w-3xl border border-gray-200 bg-white text-gray-900 shadow-2xl sm:rounded-3xl">
        <div className="space-y-8 py-2 sm:py-4">
          <DialogHeader className="space-y-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <img
                src={Logo.src}
                alt="Jumble"
                className="h-16 w-auto rounded-2xl object-contain"
              />
            </div>
            <DialogTitle className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              {language === "fr" ? "Organisez vos idées dans un " : "Organize your ideas in an "}
              <span className="bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
                {language === "fr" ? "canvas infini" : "infinite canvas"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed text-gray-600">
              {language === "fr"
                ? "Jumble est un espace libre où vous déposez tout ce qui compte pour vous : textes, liens, captures, tâches, inspirations… Glissez, zoomez, et composez votre propre cartographie mentale, sans contrainte de grille."
                : "Jumble is a free-form space where you drop everything that matters to you: text, links, captures, tasks, inspirations… Drag, zoom, and compose your own mental map, without any rigid grid."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 rounded-2xl bg-gray-50 p-6 ring-1 ring-gray-100 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {language === "fr" ? "1 · Déposez" : "1 · Drop"}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {language === "fr" ? "Ajoutez des cartes" : "Add cards"}
              </p>
              <p className="text-xs text-gray-600">
                {language === "fr"
                  ? "Glissez des liens, écrivez des notes, capturez des idées. Chaque élément devient une carte sur votre canvas."
                  : "Drop links, write notes, capture ideas. Every item becomes a card on your canvas."}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {language === "fr" ? "2 · Ordonnez" : "2 · Arrange"}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {language === "fr" ? "Déplacez dans l’espace" : "Move in space"}
              </p>
              <p className="text-xs text-gray-600">
                {language === "fr"
                  ? "Organisez vos cartes librement, par zones, par projets ou par humeurs. Aucune structure rigide ne vous limite."
                  : "Arrange your cards freely: by areas, by projects, or by mood. No rigid structure limits you."}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {language === "fr" ? "3 · Naviguez" : "3 · Navigate"}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {language === "fr" ? "Zoomez dans vos idées" : "Zoom into your ideas"}
              </p>
              <p className="text-xs text-gray-600">
                {language === "fr"
                  ? "Utilisez le zoom et le déplacement pour passer du détail à la vision d’ensemble en un geste."
                  : "Use zoom and pan to switch from details to the big picture in one move."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
            <p className="text-xs text-gray-500">
              {language === "fr" ? "Astuce : essayez de " : "Tip: try to "}
              <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-800">
                {language === "fr" ? "déposer un lien ou écrire une note" : "drop a link or write a note"}
              </span>{" "}
              {language === "fr" ? "au centre du canvas." : "in the center of the canvas."}
            </p>
            <DialogFooter className="sm:justify-end gap-2">
              <Button
                size="sm"
                className="text-xs font-medium shadow-sm"
                onClick={handleClose}
              >
                {language === "fr" ? "Commencer sur le canvas" : "Start on the canvas"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


