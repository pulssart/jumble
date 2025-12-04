"use client"

import React, { useState, useEffect } from "react"
import { TwitterElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmbeddedTweet, TweetSkeleton } from "react-tweet"
import { fetchTweet } from "@/app/actions"

interface TwitterCardProps {
  element: TwitterElement
  onUpdate: (element: TwitterElement) => void
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

export function TwitterCard({ element, onUpdate }: TwitterCardProps) {
  const [isEditing, setIsEditing] = useState(!element.tweetId)
  const [inputValue, setInputValue] = useState("")
  const [isInteractive, setIsInteractive] = useState(false)
  const [tweetData, setTweetData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const handleSubmit = () => {
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
      <div className="drag-handle rounded-xl shadow-lg bg-white border border-gray-200 p-4 min-w-[300px]">
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
          <Button onClick={handleSubmit} size="sm">
            Valider
          </Button>
          <Button
            onClick={() => setIsEditing(false)}
            variant="outline"
            size="sm"
          >
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl shadow-lg bg-white border border-gray-200 overflow-hidden w-[400px] flex flex-col">
      <div className="relative group min-h-[150px]">
        {/* Overlay pour le drag */}
        {!isInteractive && (
          <div className="drag-handle absolute inset-0 z-10 cursor-grab active:cursor-grabbing bg-transparent" />
        )}
        
        <div className={`w-full ${isInteractive ? "pointer-events-auto" : "pointer-events-none select-none"}`}>
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

