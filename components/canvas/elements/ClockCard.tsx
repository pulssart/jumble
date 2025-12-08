"use client"

import React, { useState, useEffect } from "react"
import { ClockElement } from "@/types/canvas"
import { Settings, Clock as ClockIcon, Globe, ToggleLeft, ToggleRight } from "lucide-react"
import { useLanguage } from "@/lib/language"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

interface ClockCardProps {
  element: ClockElement
  onUpdate: (element: ClockElement) => void
  bgColor?: string
}

// Liste des timezones courantes
const COMMON_TIMEZONES = [
  { label: "Paris", value: "Europe/Paris" },
  { label: "Londres", value: "Europe/London" },
  { label: "New York", value: "America/New_York" },
  { label: "San Francisco", value: "America/Los_Angeles" },
  { label: "Tokyo", value: "Asia/Tokyo" },
  { label: "Sydney", value: "Australia/Sydney" },
  { label: "Dubaï", value: "Asia/Dubai" },
  { label: "UTC", value: "UTC" },
]

export function ClockCard({ element, onUpdate, bgColor = "bg-gray-50" }: ClockCardProps) {
  const { language } = useLanguage()
  const [time, setTime] = useState(new Date())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Mise à jour de l'heure chaque seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Récupération de l'heure formattée
  const formatTime = (date: Date, timezone: string, is24Hour: boolean = true, showSeconds: boolean = false) => {
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined,
        hour12: !is24Hour,
      }).format(date)
    } catch (e) {
      return "--:--"
    }
  }

  // Date du jour
  const formatDate = (date: Date, timezone: string) => {
    try {
      return new Intl.DateTimeFormat('fr-FR', {
        timeZone: timezone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(date)
    } catch (e) {
      return ""
    }
  }

  // Pour l'horloge analogique
  const getAnalogRotation = (date: Date, timezone: string) => {
    // On crée une date "locale" simulée pour le fuseau choisi
    // C'est un peu tricky en JS pur sans library type date-fns-tz, mais on fait une astuce avec toLocaleString
    const tzString = date.toLocaleString("en-US", { timeZone: timezone })
    const tzDate = new Date(tzString)

    const seconds = tzDate.getSeconds()
    const minutes = tzDate.getMinutes()
    const hours = tzDate.getHours() % 12

    const secondDeg = seconds * 6
    const minuteDeg = minutes * 6 + seconds * 0.1
    const hourDeg = hours * 30 + minutes * 0.5

    return { secondDeg, minuteDeg, hourDeg }
  }

  return (
    <div className="group drag-handle rounded-3xl shadow-lg bg-white/80 backdrop-blur-md border border-white/50 dark:border-none w-[220px] h-[220px] flex flex-col items-center justify-center relative overflow-hidden select-none transition-all hover:shadow-xl hover:scale-[1.02]">
      
      {/* Bouton de configuration (visible au survol) */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 backdrop-blur-sm">
              <Settings className="w-4 h-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{language === "fr" ? "Configuration de l'horloge" : "Clock settings"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <div className="p-2">
                <label className="text-xs text-gray-500 mb-1 block">{language === "fr" ? "Label personnalisé" : "Custom label"}</label>
                <Input 
                    value={element.label || ""} 
                    onChange={(e) => onUpdate({ ...element, label: e.target.value })}
                    placeholder="ex: Paris"
                    className="h-8 text-sm"
                />
            </div>
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Globe className="w-4 h-4 mr-2" />
                <span>{language === "fr" ? "Fuseau horaire" : "Time zone"}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                {COMMON_TIMEZONES.map((tz) => (
                  <DropdownMenuItem 
                    key={tz.value}
                    onClick={() => onUpdate({ ...element, timezone: tz.value, label: element.label || tz.label })}
                    className="justify-between"
                  >
                    {tz.label}
                    {element.timezone === tz.value && <span className="text-blue-500 text-xs">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onUpdate({ ...element, isAnalog: !element.isAnalog })}>
              <ClockIcon className="w-4 h-4 mr-2" />
              <span>{element.isAnalog 
                ? (language === "fr" ? "Passer en digital" : "Switch to digital")
                : (language === "fr" ? "Passer en analogique" : "Switch to analog")
              }</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onUpdate({ ...element, showSeconds: !element.showSeconds })}>
              {element.showSeconds ? <ToggleRight className="w-4 h-4 mr-2 text-green-500" /> : <ToggleLeft className="w-4 h-4 mr-2 text-gray-400" />}
              <span>{language === "fr" ? "Afficher les secondes" : "Show seconds"}</span>
            </DropdownMenuItem>

            {!element.isAnalog && (
                <DropdownMenuItem onClick={() => onUpdate({ ...element, is24Hour: !element.is24Hour })}>
                  <span className="text-xs font-bold border border-gray-400 rounded px-1 mr-2">24h</span>
                  <span>{element.is24Hour 
                    ? (language === "fr" ? "Format 12h (AM/PM)" : "12h format (AM/PM)")
                    : (language === "fr" ? "Format 24h" : "24h format")
                  }</span>
                </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Contenu de l'horloge */}
      <div className="flex flex-col items-center justify-center w-full h-full p-4">
        
        {element.isAnalog ? (
          <div className="relative w-32 h-32 rounded-full border-4 border-gray-800 bg-white shadow-inner mb-3">
             {/* Cadran simplifié */}
             {[...Array(12)].map((_, i) => (
               <div 
                 key={i} 
                 className="absolute w-1 h-2 bg-gray-300 left-1/2 top-0 origin-bottom"
                 style={{ 
                    transform: `translateX(-50%) rotate(${i * 30}deg)`, 
                    transformOrigin: "50% 64px" // Rayon du cercle (32 * 4px / 2 = 64px)
                 }}
               />
             ))}
             
             {/* Aiguilles */}
             {(() => {
                const { hourDeg, minuteDeg, secondDeg } = getAnalogRotation(time, element.timezone)
                return (
                    <>
                        {/* Heures */}
                        <div 
                            className="absolute w-1.5 h-8 bg-gray-800 rounded-full left-1/2 top-[24px] origin-bottom shadow-sm"
                            style={{ transform: `translateX(-50%) rotate(${hourDeg}deg)`, transformOrigin: "50% 100%" }}
                        />
                        {/* Minutes */}
                        <div 
                            className="absolute w-1 h-12 bg-gray-600 rounded-full left-1/2 top-[8px] origin-bottom shadow-sm"
                            style={{ transform: `translateX(-50%) rotate(${minuteDeg}deg)`, transformOrigin: "50% 100%" }}
                        />
                        {/* Secondes */}
                        {element.showSeconds && (
                            <div 
                                className="absolute w-0.5 h-14 bg-red-500 rounded-full left-1/2 top-[4px] origin-bottom"
                                style={{ transform: `translateX(-50%) rotate(${secondDeg}deg)`, transformOrigin: "50% 100%" }}
                            />
                        )}
                        {/* Point central */}
                        <div className="absolute w-3 h-3 bg-gray-800 rounded-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 border-2 border-white z-10" />
                    </>
                )
             })()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center mb-2">
            <span className={`font-mono font-bold text-gray-800 tabular-nums leading-none tracking-tight ${element.showSeconds ? 'text-4xl' : 'text-5xl'}`}>
              {formatTime(time, element.timezone, element.is24Hour, element.showSeconds)}
            </span>
            <span className="text-sm text-gray-500 font-medium mt-2 uppercase tracking-wider">
                {formatDate(time, element.timezone)}
            </span>
          </div>
        )}

        {/* Label du fuseau horaire */}
        <div className="bg-gray-100 px-3 py-1 rounded-full max-w-[90%]">
            <p className="text-xs font-semibold text-gray-600 truncate text-center">
                {element.label || element.timezone.split('/')[1].replace('_', ' ')}
            </p>
        </div>
      </div>
    </div>
  )
}

