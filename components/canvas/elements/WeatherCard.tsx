"use client"

import React, { useState, useEffect, useRef } from "react"
import { WeatherElement } from "@/types/canvas"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MapPin, Edit2, RefreshCw, Cloud, CloudRain, Sun, CloudSun, Wind, Droplets, Search } from "lucide-react"
import { useLanguage } from "@/lib/language"

interface WeatherCardProps {
  element: WeatherElement
  onUpdate: (element: WeatherElement) => void
  bgColor?: string
}

// Fonction pour obtenir l'icône météo basée sur le code météo
const getWeatherIcon = (iconCode?: string, description?: string) => {
  if (!iconCode && !description) return <Sun className="w-12 h-12 text-yellow-500" />
  
  const desc = description?.toLowerCase() || ""
  const code = iconCode || ""
  
  // Codes OpenWeatherMap ou descriptions
  if (code.includes("01") || desc.includes("clear")) {
    return <Sun className="w-12 h-12 text-yellow-500" />
  }
  if (code.includes("02") || desc.includes("few clouds")) {
    return <CloudSun className="w-12 h-12 text-yellow-400" />
  }
  if (code.includes("03") || code.includes("04") || desc.includes("cloud")) {
    return <Cloud className="w-12 h-12 text-gray-400" />
  }
  if (code.includes("09") || code.includes("10") || desc.includes("rain")) {
    return <CloudRain className="w-12 h-12 text-blue-400" />
  }
  if (code.includes("11") || desc.includes("thunder")) {
    return <CloudRain className="w-12 h-12 text-purple-500" />
  }
  if (code.includes("13") || desc.includes("snow")) {
    return <Cloud className="w-12 h-12 text-blue-200" />
  }
  if (code.includes("50") || desc.includes("mist") || desc.includes("fog")) {
    return <Cloud className="w-12 h-12 text-gray-300" />
  }
  
  return <Sun className="w-12 h-12 text-yellow-500" />
}

// Fonction pour obtenir le dégradé de couleur selon les conditions météo
const getWeatherGradient = (iconCode?: string, description?: string, temperature?: number) => {
  if (!iconCode && !description) return "from-blue-400 to-blue-600"
  
  const desc = description?.toLowerCase() || ""
  const code = iconCode || ""
  const temp = temperature || 20
  
  // Nuit (code se termine par 'n')
  if (code.endsWith("n")) {
    if (code.includes("01")) {
      return "from-indigo-600 to-purple-800" // Nuit claire
    }
    if (code.includes("02") || code.includes("03") || code.includes("04")) {
      return "from-slate-600 to-slate-800" // Nuit nuageuse
    }
    if (code.includes("09") || code.includes("10") || desc.includes("rain")) {
      return "from-slate-700 to-slate-900" // Nuit pluvieuse
    }
    if (code.includes("11") || desc.includes("thunder")) {
      return "from-purple-800 to-indigo-900" // Nuit orageuse
    }
  }
  
  // Jour (code se termine par 'd' ou pas de code)
  if (code.includes("01") || desc.includes("clear")) {
    // Ensoleillé - dégradé selon la température
    if (temp >= 30) {
      return "from-orange-400 to-red-500" // Très chaud
    } else if (temp >= 25) {
      return "from-yellow-400 to-orange-500" // Chaud
    } else if (temp >= 20) {
      return "from-blue-400 to-cyan-500" // Tempéré
    } else {
      return "from-blue-300 to-blue-500" // Frais
    }
  }
  if (code.includes("02") || desc.includes("few clouds")) {
    return "from-blue-300 to-blue-500" // Peu nuageux
  }
  if (code.includes("03") || code.includes("04") || desc.includes("cloud")) {
    return "from-gray-400 to-gray-600" // Nuageux
  }
  if (code.includes("09") || code.includes("10") || desc.includes("rain")) {
    return "from-blue-500 to-blue-700" // Pluvieux
  }
  if (code.includes("11") || desc.includes("thunder")) {
    return "from-purple-600 to-indigo-800" // Orageux
  }
  if (code.includes("13") || desc.includes("snow")) {
    return "from-blue-200 to-blue-400" // Neigeux
  }
  if (code.includes("50") || desc.includes("mist") || desc.includes("fog")) {
    return "from-gray-300 to-gray-500" // Brumeux
  }
  
  return "from-blue-400 to-blue-600" // Par défaut
}

// Fonction pour rechercher des villes
async function searchCities(query: string) {
  const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || "1071342b41f615e1d72caeb1843a8c0d"
  
  if (!query || query.length < 2) return []
  
  try {
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error("City search API error")
    }
    const data = await response.json()
    return data.map((item: any) => ({
      name: item.name,
      country: item.country,
      state: item.state,
      lat: item.lat,
      lon: item.lon,
      displayName: `${item.name}${item.state ? `, ${item.state}` : ''}, ${item.country}`
    }))
  } catch (error) {
    console.error("Erreur recherche ville:", error)
    return []
  }
}

// Fonction pour obtenir la météo
async function fetchWeather(city?: string, lat?: number, lon?: number) {
  const API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || "1071342b41f615e1d72caeb1843a8c0d"
  
  let url = ""
  if (city) {
    url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=fr`
  } else if (lat && lon) {
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=fr`
  } else {
    throw new Error("City or coordinates required")
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error("Weather API error")
    }
    const data = await response.json()
    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      city: data.name,
      country: data.sys.country
    }
  } catch (error) {
    console.error("Erreur fetch météo:", error)
    // Fallback avec des données simulées pour le développement
    return {
      temperature: 22,
      description: "Ensoleillé",
      icon: "01d",
      humidity: 65,
      windSpeed: 15,
      city: city || "Local",
      country: ""
    }
  }
}

interface CityOption {
  name: string
  country: string
  state?: string
  lat: number
  lon: number
  displayName: string
}

export function WeatherCard({ element, onUpdate, bgColor = "bg-gray-50" }: WeatherCardProps) {
  const { language } = useLanguage()
  const [isEditingCity, setIsEditingCity] = useState(false)
  const [cityValue, setCityValue] = useState(element.city || "")
  const [isLoading, setIsLoading] = useState(false)
  const [cityOptions, setCityOptions] = useState<CityOption[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null)
  const fetchedRef = useRef(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!fetchedRef.current && !element.temperature) {
      fetchedRef.current = true
      loadWeather()
    }
  }, [])

  // Rafraîchissement automatique toutes les 10 minutes
  useEffect(() => {
    if (!element.temperature) return // Ne pas rafraîchir si pas encore chargé

    const interval = setInterval(() => {
      loadWeather()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [element.temperature, element.city])

  const loadWeather = async () => {
    setIsLoading(true)
    try {
      if (element.city) {
        // Utiliser la ville spécifiée
        const weather = await fetchWeather(element.city)
        onUpdate({
          ...element,
          city: weather.city || element.city,
          temperature: weather.temperature,
          description: weather.description,
          icon: weather.icon,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          isLoading: false
        })
      } else {
        // Utiliser la géolocalisation
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const weather = await fetchWeather(undefined, position.coords.latitude, position.coords.longitude)
            onUpdate({
              ...element,
              city: weather.city,
              temperature: weather.temperature,
              description: weather.description,
              icon: weather.icon,
              humidity: weather.humidity,
              windSpeed: weather.windSpeed,
              isLoading: false
            })
          },
          async () => {
            // Si la géolocalisation échoue, utiliser une ville par défaut
            const weather = await fetchWeather("Paris")
            onUpdate({
              ...element,
              city: weather.city,
              temperature: weather.temperature,
              description: weather.description,
              icon: weather.icon,
              humidity: weather.humidity,
              windSpeed: weather.windSpeed,
              isLoading: false
            })
          }
        )
      }
    } catch (error) {
      console.error("Erreur chargement météo:", error)
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCitySearch = async (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    if (query.length < 2) {
      setCityOptions([])
      setShowSuggestions(false)
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchCities(query)
      setCityOptions(results)
      setShowSuggestions(true)
    }, 300)
  }

  const handleCitySelect = async (city: CityOption) => {
    setSelectedCity(city)
    setCityValue(city.displayName)
    setShowSuggestions(false)
    setIsLoading(true)
    try {
      const weather = await fetchWeather(undefined, city.lat, city.lon)
      onUpdate({
        ...element,
        city: city.displayName,
        temperature: weather.temperature,
        description: weather.description,
        icon: weather.icon,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        isLoading: false
      })
      setIsEditingCity(false)
    } catch (error) {
      console.error("Erreur fetch météo:", error)
      setIsLoading(false)
    }
  }

  const handleCitySubmit = async () => {
    if (selectedCity) {
      // Si une ville est sélectionnée, utiliser ses coordonnées
      await handleCitySelect(selectedCity)
    } else if (cityValue.trim()) {
      // Sinon, essayer avec le nom de la ville
      onUpdate({ ...element, city: cityValue.trim() })
      setIsEditingCity(false)
      setIsLoading(true)
      try {
        const weather = await fetchWeather(cityValue.trim())
        onUpdate({
          ...element,
          city: cityValue.trim(),
          temperature: weather.temperature,
          description: weather.description,
          icon: weather.icon,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          isLoading: false
        })
      } catch (error) {
        console.error("Erreur fetch météo:", error)
        setIsLoading(false)
      }
    } else {
      // Si vide, utiliser la géolocalisation
      onUpdate({ ...element, city: undefined })
      setIsEditingCity(false)
      loadWeather()
    }
  }

  const gradientClass = getWeatherGradient(element.icon, element.description, element.temperature)

  return (
    <div className={`drag-handle rounded-xl shadow-lg bg-gradient-to-br ${gradientClass} border border-opacity-30 dark:border-none w-[280px] overflow-hidden cursor-grab active:cursor-grabbing group`}>
      <div className="p-5 text-white">
        {/* Header avec ville */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 relative">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            {isEditingCity ? (
              <div className="flex-1 relative">
                <Input
                  value={cityValue}
                  onChange={(e) => {
                    setCityValue(e.target.value)
                    handleCitySearch(e.target.value)
                    setSelectedCity(null)
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowSuggestions(false)
                      handleCitySubmit()
                    }, 200)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && cityOptions.length > 0) {
                      e.preventDefault()
                      handleCitySelect(cityOptions[0])
                    } else if (e.key === "Enter") {
                      handleCitySubmit()
                    } else if (e.key === "Escape") {
                      setIsEditingCity(false)
                      setCityValue(element.city || "")
                      setShowSuggestions(false)
                      setSelectedCity(null)
                    }
                    e.stopPropagation()
                  }}
                  onFocus={() => {
                    if (cityValue.length >= 2) {
                      handleCitySearch(cityValue)
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder={language === "fr" ? "Rechercher une ville..." : "Search for a city..."}
                  className="h-6 text-sm bg-white/20 border-white/30 text-white placeholder:text-white/70 pr-8"
                  autoFocus
                />
                <Search className="w-3 h-3 absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70" />
                
                {/* Suggestions */}
                {showSuggestions && cityOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-48 overflow-y-auto">
                    {cityOptions.map((city, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCitySelect(city)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors text-sm text-gray-900"
                      >
                        <div className="font-medium">{city.name}</div>
                        <div className="text-xs text-gray-500">{city.state ? `${city.state}, ` : ''}{city.country}</div>
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
                  setCityValue(element.city || "")
                  setIsEditingCity(true)
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="text-sm font-medium truncate">
                  {element.city || (language === "fr" ? "Local" : "Local")}
                </span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              loadWeather()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Contenu météo */}
        {isLoading && !element.temperature ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Température principale */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {getWeatherIcon(element.icon, element.description)}
                <div>
                  <div className="text-4xl font-bold">
                    {element.temperature}°
                  </div>
                  <div className="text-sm text-white/90 capitalize">
                    {element.description || (language === "fr" ? "Chargement..." : "Loading...")}
                  </div>
                </div>
              </div>
            </div>

            {/* Détails */}
            {(element.humidity !== undefined || element.windSpeed !== undefined) && (
              <div className="flex items-center gap-4 text-xs text-white/90 pt-3 border-t border-white/20">
                {element.humidity !== undefined && (
                  <div className="flex items-center gap-1">
                    <Droplets className="w-4 h-4" />
                    <span>{element.humidity}%</span>
                  </div>
                )}
                {element.windSpeed !== undefined && (
                  <div className="flex items-center gap-1">
                    <Wind className="w-4 h-4" />
                    <span>{element.windSpeed} km/h</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

