"use client"

import React, { useState, useEffect } from "react"
import { TwitterElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmbeddedTweet, TweetSkeleton } from "react-tweet"
// Utiliser l'API route au lieu de la server action pour compatibilité Netlify
async function fetchTweet(tweetId: string) {
  try {
    const response = await fetch("/api/tweet", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tweetId }),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch tweet: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching tweet:", error)
    return null
  }
}

interface TwitterCardProps {
  element: TwitterElement
  onUpdate: (element: TwitterElement) => void
  bgColor?: string
}

function extractTweetId(url: string): string | null {
  try {
    const match = url.match(/status\/(\d+)/)
    if (match) {
      return match[1]
    }
  } catch (e) {
    console.error("Erreur parsing Twitter URL", e)
  }
  return null
}

export function TwitterCard({ element, onUpdate, bgColor = "bg-gray-50" }: TwitterCardProps) {
  const [isEditing, setIsEditing] = useState(!element.tweetId)
  const [inputValue, setInputValue] = useState("")
  const [isInteractive, setIsInteractive] = useState(false)
  const [tweetData, setTweetData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCommandPressed, setIsCommandPressed] = useState(false)

  useEffect(() => {
    const loadTweet = async () => {
      if (element.tweetId) {
        setIsLoading(true)
        const data = await fetchTweet(element.tweetId)
        setTweetData(data)
        setIsLoading(false)
      }
    }
    loadTweet()
  }, [element.tweetId])

  // Détection de la touche Command (Meta sur Mac, Ctrl sur Windows/Linux)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setIsCommandPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsCommandPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  const handleSubmit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const tweetId = extractTweetId(inputValue)
    if (tweetId) {
      onUpdate({
        ...element,
        tweetId,
      })
      setIsEditing(false)
    } else {
      alert("Veuillez entrer une URL de Tweet valide")
    }
  }

  if (isEditing) {
    return (
      <div className="drag-handle rounded-xl shadow-lg bg-white border dark:border-none border-gray-200 p-4 min-w-[300px]">
        <Input
          type="text"
          placeholder="URL du Tweet (X)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit()
            if (e.key === "Escape") setIsEditing(false)
          }}
          className="mb-2"
        />
        <div className="flex gap-2">
          <Button 
            onClick={handleSubmit} 
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            Valider
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsEditing(false)
            }}
            variant="outline"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  const handleMouseEnter = () => {
    if (isCommandPressed) {
      setIsInteractive(true)
    }
  }

  return (
    <div className="rounded-xl shadow-lg bg-white border dark:border-none border-gray-200 overflow-hidden w-[400px] flex flex-col">
      <div className="relative group min-h-[150px]" onMouseEnter={handleMouseEnter}>
        {/* Overlay pour le drag */}
        {!isInteractive && (
          <div className="drag-handle absolute inset-0 z-10 cursor-grab active:cursor-grabbing bg-transparent" />
        )}
        
          <div className={`w-full ${isInteractive ? "pointer-events-auto" : "pointer-events-none select-none"}`} data-theme={bgColor === "bg-[#303030]" ? "dark" : "light"}>
            {isLoading ? (
                <div className="flex justify-center py-8">
                   <TweetSkeleton />
                </div>
            ) : tweetData ? (
                // On applique un margin négatif ajusté pour plus de hauteur visible
                <div className="-my-[26px]">
                    <EmbeddedTweet tweet={tweetData} />
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    Tweet introuvable
                </div>
            )}
        </div>

        {/* Bouton pour activer l'interaction */}
        {!isInteractive && (
          <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={(e) => {
                e.stopPropagation()
                setIsInteractive(true)
              }}
            >
              Interagir
            </Button>
          </div>
        )}

        {/* Bouton pour désactiver l'interaction */}
        {isInteractive && (
          <div className="absolute top-2 right-2 z-20">
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={(e) => {
                e.stopPropagation()
                setIsInteractive(false)
              }}
            >
              Terminer
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

