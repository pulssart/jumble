"use client"

import React, { useState, useEffect, useRef } from "react"
import { RSSElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Edit2, RefreshCw, ExternalLink, Rss, ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "@/lib/language"

interface RSSCardProps {
  element: RSSElement
  onUpdate: (element: RSSElement) => void
  bgColor?: string
}

// Fonction pour obtenir les données RSS
async function fetchRSSData(feedUrl: string) {
  try {
    const response = await fetch(`/api/rss?url=${encodeURIComponent(feedUrl)}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `RSS API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    // Retourner les articles et les informations du site
    return {
      siteName: data.siteName || "",
      articles: data.articles || [],
    }
  } catch (error) {
    console.error("Erreur fetch RSS:", error)
    throw error
  }
}

export function RSSCard({ element, onUpdate, bgColor = "bg-gray-50" }: RSSCardProps) {
  const { language } = useLanguage()
  const [isEditingUrl, setIsEditingUrl] = useState(false)
  const [urlValue, setUrlValue] = useState(element.feedUrl || "")
  const [isLoading, setIsLoading] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!fetchedRef.current && element.feedUrl && !element.title) {
      fetchedRef.current = true
      loadRSSData()
    } else if (element.feedUrl && !element.title && !isLoading) {
      // Si l'URL est définie mais pas de titre, charger les données
      loadRSSData()
    }
  }, [element.feedUrl])

  // Rafraîchissement automatique toutes les 10 minutes
  useEffect(() => {
    if (!element.feedUrl || !element.title) return

    const interval = setInterval(() => {
      loadRSSData()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [element.feedUrl, element.title, element.id])

  const loadRSSData = async () => {
    if (!element.feedUrl) return
    
    setIsLoading(true)
    try {
      const data = await fetchRSSData(element.feedUrl)
      const articles = data.articles || []
      
      if (articles.length > 0) {
        const currentIndex = element.currentArticleIndex ?? 0
        const article = articles[currentIndex] || articles[0]
        
        onUpdate({
          ...element,
          siteName: data.siteName,
          title: article.title,
          link: article.link,
          image: article.image,
          pubDate: article.pubDate,
          description: article.description,
          currentArticleIndex: currentIndex,
          articlesCount: articles.length,
          isLoading: false
        })
      } else {
        onUpdate({
          ...element,
          isLoading: false
        })
      }
    } catch (error) {
      console.error("Erreur chargement RSS:", error)
      onUpdate({
        ...element,
        isLoading: false
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreviousArticle = async () => {
    if (!element.feedUrl || element.currentArticleIndex === undefined || element.currentArticleIndex <= 0) return
    
    setIsLoading(true)
    try {
      const data = await fetchRSSData(element.feedUrl)
      const articles = data.articles || []
      const newIndex = (element.currentArticleIndex || 0) - 1
      
      if (articles[newIndex]) {
        const article = articles[newIndex]
        onUpdate({
          ...element,
          title: article.title,
          link: article.link,
          image: article.image,
          pubDate: article.pubDate,
          description: article.description,
          currentArticleIndex: newIndex,
          isLoading: false
        })
      }
    } catch (error) {
      console.error("Erreur navigation article:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextArticle = async () => {
    if (!element.feedUrl || element.currentArticleIndex === undefined || !element.articlesCount) return
    
    const maxIndex = (element.articlesCount || 0) - 1
    if (element.currentArticleIndex >= maxIndex) return
    
    setIsLoading(true)
    try {
      const data = await fetchRSSData(element.feedUrl)
      const articles = data.articles || []
      const newIndex = (element.currentArticleIndex || 0) + 1
      
      if (articles[newIndex]) {
        const article = articles[newIndex]
        onUpdate({
          ...element,
          title: article.title,
          link: article.link,
          image: article.image,
          pubDate: article.pubDate,
          description: article.description,
          currentArticleIndex: newIndex,
          isLoading: false
        })
      }
    } catch (error) {
      console.error("Erreur navigation article:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUrlSubmit = async () => {
    if (urlValue.trim()) {
      const url = urlValue.trim()
      setIsLoading(true)
      try {
        const data = await fetchRSSData(url)
        const articles = data.articles || []
        
        if (articles.length > 0) {
          const article = articles[0]
          onUpdate({
            ...element,
            feedUrl: url,
            siteName: data.siteName,
            title: article.title,
            link: article.link,
            image: article.image,
            pubDate: article.pubDate,
            description: article.description,
            currentArticleIndex: 0,
            articlesCount: articles.length,
            isLoading: false
          })
        } else {
          onUpdate({
            ...element,
            feedUrl: url,
            isLoading: false
          })
        }
        setIsEditingUrl(false)
      } catch (error) {
        console.error("Erreur fetch RSS:", error)
        setIsLoading(false)
      }
    }
  }

  const hasContent = element.title && element.feedUrl

  return (
    <div className="drag-handle rounded-xl shadow-lg bg-gray-100 border dark:border-none border-gray-200 w-[400px] h-[350px] overflow-hidden cursor-grab active:cursor-grabbing group relative">
      {/* Image de fond en full width/height */}
      {element.image ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${element.image})` }}
        >
          {/* Overlay sombre pour la lisibilité */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
      )}

      {/* Contenu en overlay */}
      <div className="relative h-full flex flex-col p-6">
        {/* Header avec URL */}
        <div className="flex items-center justify-between mb-auto">
          <div className="flex items-center gap-2 flex-1 relative">
            <Rss className="w-4 h-4 flex-shrink-0 text-white" />
            {isEditingUrl ? (
              <div className="flex-1 relative">
                <Input
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  onBlur={() => {
                    setTimeout(() => {
                      handleUrlSubmit()
                    }, 200)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUrlSubmit()
                    } else if (e.key === "Escape") {
                      setIsEditingUrl(false)
                      setUrlValue(element.feedUrl || "")
                    }
                    e.stopPropagation()
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder={language === "fr" ? "URL du flux RSS..." : "RSS feed URL..."}
                  className="h-6 text-sm bg-white/90 border-white/30 text-gray-900 placeholder:text-gray-500 pr-8"
                  autoFocus
                />
              </div>
            ) : (
              <div 
                className="flex items-center gap-1 cursor-text hover:bg-white/10 rounded px-2 py-1 -ml-2 transition-colors flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setUrlValue(element.feedUrl || "")
                  setIsEditingUrl(true)
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-white/80 truncate">
                  {element.feedUrl || (language === "fr" ? "Ajouter un flux RSS" : "Add RSS feed")}
                </span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-white" />
              </div>
            )}
          </div>
          {hasContent && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                loadRSSData()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors ml-2"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Contenu de l'article */}
        {isLoading && !hasContent ? (
          <div className="flex items-center justify-center flex-1">
            <RefreshCw className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : hasContent ? (
          <div className="mt-auto">
            {/* Titre de l'article */}
            {element.title && (
              <h3 className="text-2xl font-bold text-white mb-3 line-clamp-3 drop-shadow-lg">
                {element.title}
              </h3>
            )}

            {/* Site et date en sous-titre */}
            <div className="flex items-center gap-3 text-xs text-white/90 mb-4">
              {element.siteName && (
                <span className="font-medium">{element.siteName}</span>
              )}
              {element.pubDate && (
                <>
                  <span className="text-white/60">•</span>
                  <span className="text-white/70">{element.pubDate}</span>
                </>
              )}
            </div>

            {/* Bouton pour ouvrir l'article et flèches de navigation */}
            <div className="flex items-center justify-between">
              {/* Bouton pour ouvrir l'article */}
              {element.link && (
                <a
                  href={element.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg transition-colors text-sm font-medium"
                >
                  <span>{language === "fr" ? "Lire l'article" : "Read article"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              
              {/* Flèches de navigation */}
              {hasContent && element.articlesCount && element.articlesCount > 1 && (
                <div className="flex items-center gap-1">
                  {/* Flèche précédente */}
                  {element.currentArticleIndex !== undefined && element.currentArticleIndex > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePreviousArticle()
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white/80 hover:text-white"
                      disabled={isLoading}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Flèche suivante */}
                  {element.currentArticleIndex !== undefined && 
                   element.articlesCount && 
                   element.currentArticleIndex < element.articlesCount - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleNextArticle()
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white/80 hover:text-white"
                      disabled={isLoading}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center flex-1 text-white/60">
            <div className="text-center">
              <Rss className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {language === "fr" ? "Ajoutez une URL de flux RSS" : "Add an RSS feed URL"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

