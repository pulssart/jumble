"use client"

import React, { useState, useEffect, useRef } from "react"
import { ImageElement } from "@/types/canvas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Link as LinkIcon, Image as ImageIcon } from "lucide-react"

interface ImageCardProps {
  element: ImageElement
  onUpdate: (element: ImageElement) => void
}

export function ImageCard({ element, onUpdate }: ImageCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dimensions locales pour la fluidité
  const [dimensions, setDimensions] = useState({
    width: element.width || 300,
    height: element.height || 200
  })

  // Mettre à jour l'état local si les props changent
  useEffect(() => {
    if (element.width && element.height) {
      setDimensions({ width: element.width, height: element.height })
    }
  }, [element.width, element.height])

  // Gestion du redimensionnement proportionnel
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const startX = e.clientX
    const startWidth = dimensions.width
    const startHeight = dimensions.height
    const aspectRatio = startWidth / startHeight

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      
      // On se base sur la largeur pour calculer la hauteur proportionnelle
      const newWidth = Math.max(100, startWidth + deltaX)
      const newHeight = newWidth / aspectRatio
      
      setDimensions({ width: newWidth, height: newHeight })
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      
      // Sauvegarder la taille finale
      const finalWidth = Math.max(100, startWidth + (window.event as MouseEvent).clientX - startX)
      const finalHeight = finalWidth / aspectRatio

      // On fige la hauteur calculée dans le state pour éviter les sauts si l'image charge mal
      // Mais le rendu principal restera en 'auto' via le composant, sauf si on veut supporter le ratio libre non-image
      // Ici pour une ImageCard, le ratio est TOUJOURS celui de l'image.
      // Donc on met juste à jour la largeur, la hauteur suivra.
      
      onUpdate({
        ...element,
        width: Math.round(finalWidth),
        // On ne force pas la hauteur dans le modèle, on la laisse suivre le ratio image
        // sauf si on veut stocker pour persistance. On stocke la hauteur théorique.
        height: Math.round(finalHeight)
      })
      
      setDimensions({ width: Math.round(finalWidth), height: Math.round(finalHeight) })
    };

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const naturalWidth = img.naturalWidth
    const naturalHeight = img.naturalHeight
    const naturalRatio = naturalWidth / naturalHeight
    
    const currentWidth = element.width || 300
    const currentHeight = element.height || 200
    
    // Correction pour les bordures (border-1 = 1px de chaque côté = 2px total)
    // Le ratio doit s'appliquer à la zone de contenu (inside), pas à la boîte externe (border-box)
    const borderOffset = 2 
    
    const contentWidth = currentWidth - borderOffset
    const contentHeight = currentHeight - borderOffset
    const currentContentRatio = contentWidth / contentHeight

    // Calculer les dimensions cibles basées sur l'image naturelle
    // On conserve la largeur actuelle si possible, sinon on initialise
    let targetWidth = currentWidth
    
    // Calcul de la hauteur cible pour respecter le ratio du contenu
    // Hauteur Contenu = Largeur Contenu / Ratio Image
    // Hauteur Totale = Hauteur Contenu + Bordures
    let targetHeight = ((targetWidth - borderOffset) / naturalRatio) + borderOffset

    // Si c'est un chargement initial ou si les dimensions ne sont pas encore définies
    if (!element.width || (element.width === 300 && element.height === 200) || (element.width === 400 && element.height === 400)) {
        const maxWidth = 600
        const maxHeight = 600
        
        // Pour l'initialisation, on part de la taille naturelle + bordures
        targetWidth = naturalWidth + borderOffset
        targetHeight = naturalHeight + borderOffset

        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const scale = Math.min(maxWidth / targetWidth, maxHeight / targetHeight)
          targetWidth *= scale
          targetHeight *= scale
        }
    }

    const finalWidth = Math.round(targetWidth)
    const finalHeight = Math.round(targetHeight)

    // Forcer la mise à jour si les dimensions diffèrent
    if (Math.abs(finalWidth - currentWidth) > 1 || Math.abs(finalHeight - currentHeight) > 1) {
        onUpdate({
          ...element,
          width: finalWidth,
          height: finalHeight,
        })
        setDimensions({ width: finalWidth, height: finalHeight })
    }
    setImageLoaded(true)
  }

  // Vérifier le cache
  useEffect(() => {
    if (element.src && imgRef.current && imgRef.current.complete) {
       if (imgRef.current.naturalWidth > 0) {
           handleImageLoad({ currentTarget: imgRef.current } as any)
       }
    }
  }, [])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const src = event.target?.result as string
        if (src) {
          onUpdate({ ...element, src, alt: file.name })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onUpdate({ ...element, src: urlInput.trim(), alt: "Image URL" })
    }
  }

  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const src = event.target?.result as string
        if (src) {
          onUpdate({ ...element, src, alt: file.name })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  if (!element.src) {
    return (
      <div 
        className={`drag-handle w-[300px] rounded-xl shadow-lg bg-white border dark:border-none transition-colors p-4 flex flex-col gap-4 ${
          isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-2 text-gray-700 font-medium border-b border-gray-100 pb-2">
          <ImageIcon className="w-4 h-4" />
          <span>Ajouter une image</span>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button 
            variant="outline" 
            className="w-full justify-start text-gray-600" 
            onClick={handleUploadClick}
            onMouseDown={(e) => e.stopPropagation()} // Empêcher le drag du parent
          >
            <Upload className="w-4 h-4 mr-2" />
            Uploader un fichier
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">ou lien</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Input 
              placeholder="https://..." 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="h-9 text-sm"
              onMouseDown={(e) => e.stopPropagation()} // Empêcher le drag du parent
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <Button 
              size="sm" 
              variant="secondary"
              onClick={handleUrlSubmit}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={!urlInput.trim()}
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (imageError) {
    return (
      <div className="drag-handle rounded-xl shadow-lg bg-white border dark:border-none border-gray-200 p-4 min-w-[200px]">
        <p className="text-sm text-red-500">Erreur de chargement de l'image</p>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
                setImageError(false)
                onUpdate({ ...element, src: "" }) // Reset pour réafficher le formulaire
            }}
            className="mt-2"
            onMouseDown={(e) => e.stopPropagation()}
        >
            Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div 
        className="drag-handle rounded-xl shadow-lg overflow-hidden bg-white border dark:border-none border-gray-200 relative cursor-grab active:cursor-grabbing group flex items-center justify-center"
        style={{
            width: dimensions.width,
            // On laisse la hauteur en auto pour coller parfaitement à l'image, sauf si on redimensionne
            height: 'auto',
            minHeight: 100,
            transition: 'width 0.05s'
        }}
    >
      <img
        ref={imgRef}
        src={element.src}
        alt={element.alt || "Image"}
        className="block select-none pointer-events-none w-full h-auto"
        draggable={false}
        onLoad={handleImageLoad}
        onError={() => setImageError(true)}
      />
      
      {/* Overlay transparent pour faciliter le drag */}
      <div className="absolute inset-0 bg-transparent" />
      
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      )}

      {/* Poignée de redimensionnement */}
      <div
        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 rounded-sm shadow-sm border border-gray-200"
        onMouseDown={handleResizeStart}
      >
        <div className="w-2 h-2 bg-gray-600 rounded-full" />
      </div>
    </div>
  )
}
