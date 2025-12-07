"use client"

import React, { useState, useEffect, useRef } from "react"
import { CryptoElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Edit2, RefreshCw, TrendingUp, TrendingDown, Search, Coins } from "lucide-react"
import { useLanguage } from "@/lib/language"

interface CryptoCardProps {
  element: CryptoElement
  onUpdate: (element: CryptoElement) => void
}

interface CryptoOption {
  symbol: string
  name: string
  coinId: string
}

// Liste de cryptos populaires pour les suggestions
const POPULAR_CRYPTO = [
  { symbol: "BTC", name: "Bitcoin", coinId: "bitcoin" },
  { symbol: "ETH", name: "Ethereum", coinId: "ethereum" },
  { symbol: "BNB", name: "BNB", coinId: "binancecoin" },
  { symbol: "SOL", name: "Solana", coinId: "solana" },
  { symbol: "XRP", name: "XRP", coinId: "ripple" },
  { symbol: "ADA", name: "Cardano", coinId: "cardano" },
  { symbol: "DOGE", name: "Dogecoin", coinId: "dogecoin" },
  { symbol: "MATIC", name: "Polygon", coinId: "matic-network" },
  { symbol: "DOT", name: "Polkadot", coinId: "polkadot" },
  { symbol: "AVAX", name: "Avalanche", coinId: "avalanche-2" },
  { symbol: "LINK", name: "Chainlink", coinId: "chainlink" },
  { symbol: "UNI", name: "Uniswap", coinId: "uniswap" },
  { symbol: "ATOM", name: "Cosmos", coinId: "cosmos" },
  { symbol: "LTC", name: "Litecoin", coinId: "litecoin" },
  { symbol: "ALGO", name: "Algorand", coinId: "algorand" },
]

// Fonction pour rechercher des cryptos
async function searchCrypto(query: string): Promise<CryptoOption[]> {
  if (!query || query.length < 1) {
    // Si la requête est vide, retourner les cryptos populaires
    return POPULAR_CRYPTO.slice(0, 5)
  }
  
  const queryUpper = query.toUpperCase()
  
  // D'abord, filtrer les cryptos populaires qui correspondent
  const popularMatches = POPULAR_CRYPTO.filter(
    item => item.symbol.includes(queryUpper) || item.name.toUpperCase().includes(queryUpper)
  )
  
  // Si on trouve des correspondances dans les populaires, les retourner
  if (popularMatches.length > 0) {
    return popularMatches.slice(0, 5)
  }
  
  // Sinon, utiliser l'API Next.js pour rechercher
  try {
    const searchUrl = `/api/crypto/search?q=${encodeURIComponent(query)}`
    const response = await fetch(searchUrl)
    
    if (!response.ok) {
      throw new Error("Search API error")
    }
    
    const data = await response.json()
    
    if (Array.isArray(data) && data.length > 0) {
      return data as CryptoOption[]
    }
  } catch (error) {
    console.error("Erreur recherche crypto:", error)
  }
  
  return []
}

// Fonction pour obtenir les données crypto
async function fetchCryptoData(coinId?: string, symbol?: string) {
  try {
    let apiUrl = `/api/crypto?`
    if (coinId) {
      apiUrl += `coinId=${encodeURIComponent(coinId)}`
    } else if (symbol) {
      apiUrl += `symbol=${encodeURIComponent(symbol)}`
    } else {
      throw new Error("coinId or symbol is required")
    }
    
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Crypto API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.price !== undefined) {
      return {
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        coinName: data.coinName || symbol || coinId,
        coinId: data.coinId || coinId
      }
    }
    
    throw new Error("Format de réponse invalide")
  } catch (error) {
    console.error("Erreur fetch crypto:", error)
    throw error
  }
}

export function CryptoCard({ element, onUpdate }: CryptoCardProps) {
  const { language } = useLanguage()
  const [isEditingSymbol, setIsEditingSymbol] = useState(false)
  const [symbolValue, setSymbolValue] = useState(element.symbol || "BTC")
  const [isLoading, setIsLoading] = useState(false)
  const [cryptoOptions, setCryptoOptions] = useState<CryptoOption[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoOption | null>(null)
  const fetchedRef = useRef(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!fetchedRef.current && !element.price) {
      fetchedRef.current = true
      loadCryptoData()
    }
  }, [])

  // Rafraîchissement automatique toutes les 10 minutes
  useEffect(() => {
    if (!element.price || !element.coinId) return

    const interval = setInterval(() => {
      loadCryptoData()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [element.price, element.coinId, element.id])

  const loadCryptoData = async () => {
    const coinId = element.coinId
    const symbol = element.symbol || "BTC"
    setIsLoading(true)
    try {
      const data = await fetchCryptoData(coinId, symbol)
      onUpdate({
        ...element,
        symbol: symbol,
        coinId: data.coinId || coinId,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        coinName: data.coinName,
        isLoading: false
      })
    } catch (error) {
      console.error("Erreur chargement crypto:", error)
      onUpdate({
        ...element,
        isLoading: false
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCryptoSearch = async (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchCrypto(query)
      setCryptoOptions(results)
      setShowSuggestions(true)
    }, 300)
  }

  const handleCryptoSelect = async (cryptoOption: CryptoOption) => {
    setSelectedCrypto(cryptoOption)
    setSymbolValue(cryptoOption.symbol)
    setShowSuggestions(false)
    setIsLoading(true)
    try {
      const data = await fetchCryptoData(cryptoOption.coinId, cryptoOption.symbol)
      onUpdate({
        ...element,
        symbol: cryptoOption.symbol,
        coinId: cryptoOption.coinId,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        coinName: data.coinName,
        isLoading: false
      })
      setIsEditingSymbol(false)
    } catch (error) {
      console.error("Erreur fetch crypto:", error)
      setIsLoading(false)
    }
  }

  const handleCryptoSubmit = async () => {
    if (selectedCrypto) {
      await handleCryptoSelect(selectedCrypto)
    } else if (symbolValue.trim()) {
      const symbol = symbolValue.trim().toUpperCase()
      setIsLoading(true)
      try {
        const data = await fetchCryptoData(undefined, symbol)
        onUpdate({
          ...element,
          symbol: symbol,
          coinId: data.coinId || undefined,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          coinName: data.coinName,
          isLoading: false
        })
        setIsEditingSymbol(false)
      } catch (error) {
        console.error("Erreur fetch crypto:", error)
        setIsLoading(false)
      }
    }
  }

  const isPositive = (element.change || 0) >= 0
  const changeColor = isPositive ? "text-green-300" : "text-red-300"
  const bgGradient = isPositive ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"

  return (
    <div className={`drag-handle rounded-xl shadow-lg bg-gradient-to-br ${bgGradient} border border-opacity-30 w-[280px] overflow-hidden cursor-grab active:cursor-grabbing group`}>
      <div className="p-5 text-white">
        {/* Header avec symbole */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 relative">
            <Coins className="w-4 h-4 flex-shrink-0" />
            {isEditingSymbol ? (
              <div className="flex-1 relative">
                <Input
                  value={symbolValue}
                  onChange={(e) => {
                    setSymbolValue(e.target.value.toUpperCase())
                    handleCryptoSearch(e.target.value)
                    setSelectedCrypto(null)
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowSuggestions(false)
                      handleCryptoSubmit()
                    }, 200)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && cryptoOptions.length > 0) {
                      e.preventDefault()
                      handleCryptoSelect(cryptoOptions[0])
                    } else if (e.key === "Enter") {
                      handleCryptoSubmit()
                    } else if (e.key === "Escape") {
                      setIsEditingSymbol(false)
                      setSymbolValue(element.symbol || "BTC")
                      setShowSuggestions(false)
                      setSelectedCrypto(null)
                    }
                    e.stopPropagation()
                  }}
                  onFocus={() => {
                    if (symbolValue.length >= 1) {
                      handleCryptoSearch(symbolValue)
                    } else {
                      setCryptoOptions(POPULAR_CRYPTO.slice(0, 5))
                      setShowSuggestions(true)
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder={language === "fr" ? "Crypto (ex: BTC)..." : "Crypto (e.g. BTC)..."}
                  className="h-6 text-sm bg-white/20 border-white/30 text-white placeholder:text-white/70 pr-8 uppercase"
                  autoFocus
                />
                <Search className="w-3 h-3 absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70" />
                
                {/* Suggestions */}
                {showSuggestions && cryptoOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-48 overflow-y-auto">
                    {cryptoOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCryptoSelect(option)
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
                  setSymbolValue(element.symbol || "BTC")
                  setIsEditingSymbol(true)
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="text-sm font-medium truncate">
                  {element.symbol || "BTC"}
                </span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              loadCryptoData()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Contenu crypto */}
        {isLoading && !element.price ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Nom de la crypto */}
            {element.coinName && (
              <div className="text-xs text-white/90 mb-3 truncate">
                {element.coinName}
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

