"use client"

import { useEffect, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language"
import Logo from "../logo.png"

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
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        {/* Overlay personnalisé avec background Figma #F7F7F7 */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[110] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ backgroundColor: '#F7F7F7' }}
        />
        {/* Content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[111] w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] border-0 bg-white p-8 shadow-lg rounded-[12px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
          style={{ 
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
        <div className="flex flex-col items-center text-center">
          {/* Logo Jumble */}
          <img
            src={Logo.src}
            alt="Jumble"
            className="mb-6"
            style={{ 
              height: 'auto',
              maxWidth: '200px'
            }}
          />

          {/* Tagline - #282828, regular, large */}
          <p 
            className="mb-12"
            style={{ 
              color: '#282828',
              fontSize: '20px',
              lineHeight: '1.5',
              fontWeight: 400
            }}
          >
            {language === "fr" 
              ? "Organisez vos idées dans un canvas infini"
              : "Organize your ideas in an infinite canvas"}
          </p>

          {/* 3 Cartes horizontales avec rotation légère */}
          <div className="grid w-full max-w-3xl mx-auto grid-cols-3 gap-0 mb-10">
            {/* Carte 1: DÉPOSEZ */}
            <div 
              className="bg-white rounded-[6px] p-6 shadow-md relative z-10"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                border: '1px solid #F0F0F0',
                transform: 'rotate(4deg)',
                padding: '24px',
                marginRight: '0px'
              }}
            >
              <p 
                className="mb-2"
                style={{ 
                  color: '#808080',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  fontWeight: 400
                }}
              >
                {language === "fr" ? "1. DÉPOSEZ" : "1. DEPOSIT"}
              </p>
              <p 
                className="mb-3 font-bold"
                style={{ 
                  color: '#282828',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  fontWeight: 700
                }}
              >
                {language === "fr" ? "Ajoutez des cartes" : "Add cards"}
              </p>
              <p 
                className="leading-relaxed"
                style={{ 
                  color: '#5B5B5B',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  fontWeight: 400
                }}
              >
                {language === "fr"
                  ? "Collez des URLs, écrivez des notes, capturez des idées. Chaque élément devient une carte sur votre canvas"
                  : "Paste URLs, write notes, capture ideas. Each element becomes a card on your canvas"}
              </p>
            </div>

            {/* Carte 2: ORDONNEZ */}
            <div 
              className="bg-white rounded-[6px] p-6 shadow-md relative z-20"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                border: '1px solid #F0F0F0',
                transform: 'rotate(-3deg)',
                padding: '24px',
                marginLeft: '0px',
                marginRight: '0px'
              }}
            >
              <p 
                className="mb-2"
                style={{ 
                  color: '#808080',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  fontWeight: 400
                }}
              >
                {language === "fr" ? "2. ORDONNEZ" : "2. ARRANGE"}
              </p>
              <p 
                className="mb-3 font-bold"
                style={{ 
                  color: '#282828',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  fontWeight: 700
                }}
              >
                {language === "fr" ? "Déplacer dans l'espace" : "Move in space"}
              </p>
              <p 
                className="leading-relaxed"
                style={{ 
                  color: '#5B5B5B',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  fontWeight: 400
                }}
              >
                {language === "fr"
                  ? "Organisez vos cartes librement, par zones, par projets ou par humeurs. Aucune structure rigide ne vous limite."
                  : "Organize your cards freely, by zones, by projects or by moods. No rigid structure limits you."}
              </p>
            </div>

            {/* Carte 3: NAVIGUEZ */}
            <div 
              className="bg-white rounded-[6px] p-6 shadow-md relative z-30"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderRadius: '6px',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                border: '1px solid #F0F0F0',
                transform: 'rotate(3.5deg)',
                padding: '24px',
                marginLeft: '0px'
              }}
            >
              <p 
                className="mb-2"
                style={{ 
                  color: '#808080',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  fontWeight: 400
                }}
              >
                {language === "fr" ? "3. NAVIGUEZ" : "3. NAVIGATE"}
              </p>
              <p 
                className="mb-3 font-bold"
                style={{ 
                  color: '#282828',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  fontWeight: 700
                }}
              >
                {language === "fr" ? "Zoomez dans vos idées" : "Zoom into your ideas"}
              </p>
              <p 
                className="leading-relaxed"
                style={{ 
                  color: '#5B5B5B',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  fontWeight: 400
                }}
              >
                {language === "fr"
                  ? "Utilisez le zoom et le déplacement pour passer des détails à la vision d'ensemble en un geste"
                  : "Use zoom and pan to switch from details to the big picture in one gesture"}
              </p>
            </div>
          </div>

          {/* Disclaimer - #5B5B5B, italic, very small */}
          <p 
            className="mb-8 italic"
            style={{ 
              color: '#5B5B5B',
              fontSize: '12px',
              lineHeight: '1.5',
              fontWeight: 400,
              fontStyle: 'italic'
            }}
          >
            {language === "fr" ? "* c'est gratuit pour le moment" : "* it's free for now"}
          </p>

          {/* Bouton - #000000 background, #FFFFFF text, bold, rounded 8px */}
          <Button
            onClick={handleClose}
            className="w-full py-8 text-base font-bold rounded-[8px]"
            style={{ 
              backgroundColor: '#000000',
              color: '#FFFFFF',
              fontSize: '16px',
              lineHeight: '1.5',
              fontWeight: 700,
              borderRadius: '8px',
              padding: '24px 32px',
              border: 'none'
            }}
          >
            {language === "fr" ? "Commencer sur le canvas" : "Start on the canvas"}
          </Button>
        </div>
      </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
