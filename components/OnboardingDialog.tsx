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

const ONBOARDING_KEY = "jumble-onboarding-shown-v1"

export function OnboardingDialog() {
  const [open, setOpen] = useState(false)

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
              Organisez vos idées dans un{" "}
              <span className="bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
                canvas infini
              </span>
            </DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed text-gray-600">
              Jumble est un espace libre où vous déposez tout ce qui compte pour vous : textes, liens, captures, tâches,
              inspirations… Glissez, zoomez, et composez votre propre cartographie mentale, sans contrainte de grille.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 rounded-2xl bg-gray-50 p-6 ring-1 ring-gray-100 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">1 · Déposez</p>
              <p className="text-sm font-medium text-gray-900">Ajoutez des cartes</p>
              <p className="text-xs text-gray-600">
                Glissez des liens, écrivez des notes, capturez des idées. Chaque élément devient une carte sur votre
                canvas.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">2 · Ordonnez</p>
              <p className="text-sm font-medium text-gray-900">Déplacez dans l’espace</p>
              <p className="text-xs text-gray-600">
                Organisez vos cartes librement, par zones, par projets ou par humeurs. Aucune structure rigide ne vous limite.
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">3 · Naviguez</p>
              <p className="text-sm font-medium text-gray-900">Zoomez dans vos idées</p>
              <p className="text-xs text-gray-600">
                Utilisez le zoom et le déplacement pour passer du détail à la vision d’ensemble en un geste.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
            <p className="text-xs text-gray-500">
              Astuce : essayez de{" "}
              <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-800">
                déposer un lien ou écrire une note
              </span>{" "}
              au centre du canvas.
            </p>
            <DialogFooter className="sm:justify-end gap-2">
              <Button
                size="sm"
                className="text-xs font-medium shadow-sm"
                onClick={handleClose}
              >
                Commencer sur le canvas
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


