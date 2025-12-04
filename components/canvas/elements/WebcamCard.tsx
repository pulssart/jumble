"use client"

import React, { useState, useEffect, useRef } from "react"
import { WebcamElement } from "@/types/canvas"
import { Button } from "@/components/ui/button"
import { Video, VideoOff, Settings, Power, FlipHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

interface WebcamCardProps {
  element: WebcamElement
  onUpdate: (element: WebcamElement) => void
}

interface MediaDevice {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

export function WebcamCard({ element, onUpdate }: WebcamCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [devices, setDevices] = useState<MediaDevice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(element.isActive ?? false)

  // Dimensions locales pour la fluidité
  const [dimensions, setDimensions] = useState({
    width: element.width || 400,
    height: element.height || 300
  })

  // Mettre à jour l'état local si les props changent
  useEffect(() => {
    if (element.width && element.height) {
      setDimensions({ width: element.width, height: element.height })
    }
  }, [element.width, element.height])

  // Lister les caméras disponibles
  useEffect(() => {
    const listDevices = async () => {
      try {
        // Demander l'autorisation d'accès aux caméras
        await navigator.mediaDevices.getUserMedia({ video: true })
        
        const deviceList = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = deviceList
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Caméra ${device.deviceId.substring(0, 8)}`,
            kind: device.kind
          }))
        
        setDevices(videoDevices)
        
        // Si aucune caméra n'est sélectionnée et qu'il y a des caméras disponibles
        if (!element.deviceId && videoDevices.length > 0) {
          onUpdate({ ...element, deviceId: videoDevices[0].deviceId })
        }
      } catch (err) {
        console.error("Erreur lors de la liste des caméras:", err)
        setError("Impossible d'accéder aux caméras")
      }
    }
    
    listDevices()
  }, [])

  // Démarrer/arrêter le flux vidéo
  useEffect(() => {
    const startStream = async () => {
      if (!isActive || !element.deviceId) return

      setIsLoading(true)
      setError(null)

      try {
        // Arrêter le flux précédent s'il existe
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: element.deviceId }
          }
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsLoading(false)
        }
      } catch (err: any) {
        console.error("Erreur lors du démarrage de la caméra:", err)
        setError(err.message || "Impossible de démarrer la caméra")
        setIsActive(false)
        setIsLoading(false)
        onUpdate({ ...element, isActive: false })
      }
    }

    if (isActive) {
      startStream()
    } else {
      // Arrêter le flux si désactivé
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }

    // Cleanup au démontage
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, element.deviceId])

  // Mettre à jour l'état actif dans l'élément
  useEffect(() => {
    if (element.isActive !== isActive) {
      onUpdate({ ...element, isActive })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  const handleToggle = () => {
    setIsActive(!isActive)
  }

  const handleDeviceChange = (deviceId: string) => {
    const wasActive = isActive
    setIsActive(false) // Arrêter temporairement pour changer de caméra
    
    setTimeout(() => {
      onUpdate({ ...element, deviceId, isActive: wasActive })
      setIsActive(wasActive) // Redémarrer avec la nouvelle caméra
    }, 100)
  }

  // Gestion du redimensionnement proportionnel
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = dimensions.width
    const startHeight = dimensions.height
    const aspectRatio = startWidth / startHeight

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      
      // On se base sur la largeur pour calculer la hauteur proportionnelle
      const newWidth = Math.max(200, startWidth + deltaX)
      const newHeight = newWidth / aspectRatio
      
      setDimensions({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      
      const deltaX = upEvent.clientX - startX
      const finalWidth = Math.max(200, startWidth + deltaX)
      const finalHeight = finalWidth / aspectRatio

      onUpdate({
        ...element,
        width: Math.round(finalWidth),
        height: Math.round(finalHeight)
      })
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div 
      className="drag-handle rounded-xl shadow-lg overflow-hidden bg-gray-900 border border-gray-700 relative cursor-grab active:cursor-grabbing group flex flex-col"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transition: 'width 0.05s, height 0.05s'
      }}
    >
      {/* Zone vidéo */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{
            transform: element.mirrored ? 'scaleX(-1)' : 'none'
          }}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-white text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Chargement...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-red-400 text-sm text-center px-4">
              <VideoOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {!isActive && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-gray-400 text-sm text-center">
              <VideoOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Caméra inactive</p>
            </div>
          </div>
        )}
      </div>

      {/* Barre de contrôles */}
      <div className="bg-gray-800 border-t border-gray-700 p-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Menu de sélection de caméra */}
          {devices.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-gray-300 hover:text-white hover:bg-gray-700"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  <span className="text-xs">Caméra</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs">Sélectionner une caméra</DropdownMenuLabel>
                {devices.map((device) => (
                  <DropdownMenuItem
                    key={device.deviceId}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeviceChange(device.deviceId)
                    }}
                    className={element.deviceId === device.deviceId ? "bg-gray-100" : ""}
                  >
                    <Video className="w-3.5 h-3.5 mr-2" />
                    <span className="text-xs">{device.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {devices.length === 0 && !error && (
            <span className="text-xs text-gray-500 px-2">Aucune caméra détectée</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Bouton miroir */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 px-2 ${
              element.mirrored 
                ? "text-blue-400 hover:text-blue-300 hover:bg-gray-700 bg-gray-700/50" 
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
            onClick={(e) => {
              e.stopPropagation()
              onUpdate({ ...element, mirrored: !element.mirrored })
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Miroir horizontal"
          >
            <FlipHorizontal className="w-3.5 h-3.5 mr-1.5" />
            <span className="text-xs">Miroir</span>
          </Button>

          {/* Bouton on/off */}
          <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 ${
            isActive 
              ? "text-green-400 hover:text-green-300 hover:bg-gray-700" 
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isActive ? (
            <>
              <Power className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-xs">Arrêter</span>
            </>
          ) : (
            <>
              <Video className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-xs">Démarrer</span>
            </>
          )}
        </Button>
        </div>
      </div>

      {/* Poignée de redimensionnement */}
      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded-sm shadow-sm border border-gray-200 z-10"
        onMouseDown={handleResizeStart}
      >
        <div className="w-2 h-2 bg-gray-600 rounded-full" />
      </div>
    </div>
  )
}

