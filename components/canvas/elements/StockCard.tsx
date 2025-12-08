"use client"

import React, { useState, useEffect, useRef } from "react"
import { StockElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Edit2, RefreshCw, TrendingUp, TrendingDown, Search, DollarSign } from "lucide-react"
import { useLanguage } from "@/lib/language"

interface StockCardProps {
  element: StockElement
  onUpdate: (element: StockElement) => void
  bgColor?: string
}

interface SymbolOption {
  symbol: string
  name: string
  exchange?: string
}

// Liste de symboles populaires pour les suggestions
const POPULAR_SYMBOLS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "UNH", name: "UnitedHealth Group Inc." },
  { symbol: "HD", name: "The Home Depot, Inc." },
]

// Fonction pour rechercher des symboles
async function searchSymbols(query: string): Promise<SymbolOption[]> {
  if (!query || query.length < 1) {
    // Si la requête est vide, retourner les symboles populaires
    return POPULAR_SYMBOLS.slice(0, 5)
  }
  
  const queryUpper = query.toUpperCase()
  
  // D'abord, filtrer les symboles populaires qui correspondent
  const popularMatches = POPULAR_SYMBOLS.filter(
    item => item.symbol.includes(queryUpper) || item.name.toUpperCase().includes(queryUpper)
  )
  
  // Si on trouve des correspondances dans les populaires, les retourner
  if (popularMatches.length > 0) {
    return popularMatches.slice(0, 5)
  }
  
  // Sinon, utiliser l'API Next.js pour rechercher
  try {
    const searchUrl = `/api/stock/search?q=${encodeURIComponent(query)}`
    const response = await fetch(searchUrl)
    
    if (!response.ok) {
      throw new Error("Search API error")
    }
    
    const data = await response.json()
    
    if (Array.isArray(data) && data.length > 0) {
      return data as SymbolOption[]
    }
  } catch (error) {
    console.error("Erreur recherche symboles:", error)
  }
  
  return []
}

// Fonction pour obtenir les données boursières
async function fetchStockData(symbol: string) {
  try {
    // Utiliser l'API Next.js pour récupérer les données (contourne les problèmes CORS)
    const response = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Stock API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.price !== undefined) {
      return {
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        companyName: data.companyName || symbol
      }
    }
    
    throw new Error("Format de réponse invalide")
  } catch (error) {
    console.error("Erreur fetch stock:", error)
    throw error
  }
}

export function StockCard({ element, onUpdate, bgColor = "bg-gray-50" }: StockCardProps) {
  const { language } = useLanguage()
  const [isEditingSymbol, setIsEditingSymbol] = useState(false)
  const [symbolValue, setSymbolValue] = useState(element.symbol || "AAPL")
  const [isLoading, setIsLoading] = useState(false)
  const [symbolOptions, setSymbolOptions] = useState<SymbolOption[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolOption | null>(null)
  const fetchedRef = useRef(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!fetchedRef.current && !element.price) {
      fetchedRef.current = true
      loadStockData()
    }
  }, [])

  // Rafraîchissement automatique toutes les 10 minutes
  useEffect(() => {
    if (!element.price || !element.symbol) return

    const interval = setInterval(() => {
      loadStockData()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [element.price, element.symbol, element.id]) // Ajout de element.id pour forcer le re-render si nécessaire

  const loadStockData = async () => {
    const symbol = element.symbol || "AAPL"
    setIsLoading(true)
    try {
      const data = await fetchStockData(symbol)
      onUpdate({
        ...element,
        symbol: symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        companyName: data.companyName,
        isLoading: false
      })
    } catch (error) {
      console.error("Erreur chargement stock:", error)
      onUpdate({
        ...element,
        isLoading: false
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSymbolSearch = async (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchSymbols(query)
      setSymbolOptions(results)
      setShowSuggestions(true)
    }, 300)
  }

  const handleSymbolSelect = async (symbolOption: SymbolOption) => {
    setSelectedSymbol(symbolOption)
    setSymbolValue(symbolOption.symbol)
    setShowSuggestions(false)
    setIsLoading(true)
    try {
      const data = await fetchStockData(symbolOption.symbol)
      onUpdate({
        ...element,
        symbol: symbolOption.symbol,
        ...data,
        isLoading: false
      })
      setIsEditingSymbol(false)
    } catch (error) {
      console.error("Erreur fetch stock:", error)
      setIsLoading(false)
    }
  }

  const handleSymbolSubmit = async () => {
    if (selectedSymbol) {
      await handleSymbolSelect(selectedSymbol)
    } else if (symbolValue.trim()) {
      const symbol = symbolValue.trim().toUpperCase()
      setIsLoading(true)
      try {
        const data = await fetchStockData(symbol)
        onUpdate({
          ...element,
          symbol: symbol,
          ...data,
          isLoading: false
        })
        setIsEditingSymbol(false)
      } catch (error) {
        console.error("Erreur fetch stock:", error)
        setIsLoading(false)
      }
    }
  }

  const isPositive = (element.change || 0) >= 0
  const changeColor = isPositive ? "text-green-300" : "text-red-300"
  const bgGradient = isPositive ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"

  return (
    <div className={`drag-handle rounded-xl shadow-lg bg-gradient-to-br ${bgGradient} border border-opacity-30 dark:border-none w-[280px] overflow-hidden cursor-grab active:cursor-grabbing group`}>
      <div className="p-5 text-white">
        {/* Header avec symbole */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 relative">
            <DollarSign className="w-4 h-4 flex-shrink-0" />
            {isEditingSymbol ? (
              <div className="flex-1 relative">
                <Input
                  value={symbolValue}
                  onChange={(e) => {
                    setSymbolValue(e.target.value.toUpperCase())
                    handleSymbolSearch(e.target.value)
                    setSelectedSymbol(null)
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowSuggestions(false)
                      handleSymbolSubmit()
                    }, 200)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && symbolOptions.length > 0) {
                      e.preventDefault()
                      handleSymbolSelect(symbolOptions[0])
                    } else if (e.key === "Enter") {
                      handleSymbolSubmit()
                    } else if (e.key === "Escape") {
                      setIsEditingSymbol(false)
                      setSymbolValue(element.symbol || "AAPL")
                      setShowSuggestions(false)
                      setSelectedSymbol(null)
                    }
                    e.stopPropagation()
                  }}
                  onFocus={() => {
                    if (symbolValue.length >= 1) {
                      handleSymbolSearch(symbolValue)
                    } else {
                      setSymbolOptions(POPULAR_SYMBOLS.slice(0, 5))
                      setShowSuggestions(true)
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder={language === "fr" ? "Symbole (ex: AAPL)..." : "Symbol (e.g. AAPL)..."}
                  className="h-6 text-sm bg-white/20 border-white/30 text-white placeholder:text-white/70 pr-8 uppercase"
                  autoFocus
                />
                <Search className="w-3 h-3 absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70" />
                
                {/* Suggestions */}
                {showSuggestions && symbolOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-48 overflow-y-auto">
                    {symbolOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSymbolSelect(option)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors text-sm text-gray-900"
                      >
                        <div className="font-medium">{option.symbol}</div>
                        <div className="text-xs text-gray-500">{option.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="flex items-center gap-1 cursor-text hover:bg-white/10 rounded px-2 py-1 -ml-2 transition-colors flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setSymbolValue(element.symbol || "AAPL")
                  setIsEditingSymbol(true)
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="text-sm font-medium truncate">
                  {element.symbol || "AAPL"}
                </span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              loadStockData()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Contenu boursier */}
        {isLoading && !element.price ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Nom de l'entreprise */}
            {element.companyName && (
              <div className="text-xs text-white/90 mb-3 truncate">
                {element.companyName}
              </div>
            )}

            {/* Prix principal */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold">
                ${element.price?.toFixed(2) || "0.00"}
              </div>
            </div>

            {/* Variation */}
            {element.change !== undefined && element.changePercent !== undefined && (
              <div className={`flex items-center gap-2 text-sm font-medium ${changeColor}`}>
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>
                  {isPositive ? "+" : ""}{element.change.toFixed(2)} ({isPositive ? "+" : ""}{element.changePercent.toFixed(2)}%)
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

