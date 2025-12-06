"use client"

import React, { useState } from "react"
import { PromptElement } from "@/types/canvas"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Play, Loader2, Zap, Type, Image as ImageIcon, ChevronDown } from "lucide-react"
import { useLanguage } from "@/lib/language"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PromptCardProps {
  element: PromptElement
  onUpdate: (element: PromptElement) => void
  onRun: (id: string) => void
  hasConnectedInputs?: boolean
}

const PROMPT_PRESETS = {
  fr: {
    "summary-with-action": "Résume ce transcript et crée un plan d'action détaillé avec les points clés et les prochaines étapes.",
    "simple-summary": "Fais un résumé simple et concis de ce contenu.",
    "linkedin-post": "Génère un post LinkedIn professionnel et engageant basé sur ce contenu.",
    "x-post": "Génère un post X (Twitter) concis et percutant basé sur ce contenu.",
    "improve-text": "Améliore ce texte en le rendant plus clair, professionnel et engageant.",
    "translate": "Traduis ce contenu dans une autre langue en conservant le ton et le style."
  },
  en: {
    "summary-with-action": "Summarize this transcript and create a detailed action plan with key points and next steps.",
    "simple-summary": "Make a simple and concise summary of this content.",
    "linkedin-post": "Generate a professional and engaging LinkedIn post based on this content.",
    "x-post": "Generate a concise and impactful X (Twitter) post based on this content.",
    "improve-text": "Improve this text by making it clearer, more professional and engaging.",
    "translate": "Translate this content into another language while preserving the tone and style."
  }
}

const IMAGE_STYLES = {
  fr: {
    "realistic": "Réaliste",
    "cartoon": "Dessin animé",
    "anime": "Anime",
    "watercolor": "Aquarelle",
    "oil-painting": "Peinture à l'huile",
    "sketch": "Croquis",
    "wireframe": "Wireframe"
  },
  en: {
    "realistic": "Realistic",
    "cartoon": "Cartoon",
    "anime": "Anime",
    "watercolor": "Watercolor",
    "oil-painting": "Oil painting",
    "sketch": "Sketch",
    "wireframe": "Wireframe"
  }
}

export function PromptCard({ element, onUpdate, onRun, hasConnectedInputs = false }: PromptCardProps) {
  const { language } = useLanguage()
  const [prompt, setPrompt] = useState(element.content || "")

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRun(element.id)
  }

  const handleBlur = () => {
    onUpdate({ ...element, content: prompt })
  }

  const handlePresetSelect = (presetKey: keyof typeof PROMPT_PRESETS.fr) => {
    const presetText = PROMPT_PRESETS[language][presetKey]
    setPrompt(presetText)
    onUpdate({ ...element, content: presetText })
  }

  const handleStyleSelect = (style: PromptElement['imageStyle']) => {
    onUpdate({ ...element, imageStyle: style })
  }

  return (
    <div className="drag-handle relative w-[300px] rounded-xl shadow-2xl bg-gray-900 border border-gray-700 text-white overflow-hidden flex flex-col group">
      {/* Header */}
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{language === "fr" ? "Prompt IA" : "AI Prompt"}</span>
        </div>
        
        {/* Output Selector */}
        <div className="flex bg-gray-950 rounded-md p-0.5 border border-gray-700">
            <button
              className={`p-1 rounded transition-colors ${(!element.outputType || element.outputType === 'text') ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...element, outputType: 'text' }) }}
              onMouseDown={(e) => e.stopPropagation()}
              title={language === "fr" ? "Générer du texte" : "Generate text"}
            >
              <Type className="w-3 h-3" />
            </button>
            <button
              className={`p-1 rounded transition-colors ${element.outputType === 'image' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...element, outputType: 'image' }) }}
              onMouseDown={(e) => e.stopPropagation()}
              title={language === "fr" ? "Générer une image" : "Generate an image"}
            >
              <ImageIcon className="w-3 h-3" />
            </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        {element.outputType !== 'image' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white justify-between"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="text-xs">
                  {language === "fr" ? "Presets de prompts" : "Prompt presets"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="bg-gray-800 border-gray-700 text-gray-100 min-w-[200px]"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuItem
                className="text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                onSelect={() => handlePresetSelect("summary-with-action")}
              >
                {language === "fr" ? "Résumé transcript avec résumé et plan d'action" : "Summary transcript with summary and action plan"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                onSelect={() => handlePresetSelect("simple-summary")}
              >
                {language === "fr" ? "Simple résumé" : "Simple summary"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                onSelect={() => handlePresetSelect("linkedin-post")}
              >
                {language === "fr" ? "Génère un post LinkedIn" : "Generate a LinkedIn post"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                onSelect={() => handlePresetSelect("x-post")}
              >
                {language === "fr" ? "Génère un post X" : "Generate an X post"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                onSelect={() => handlePresetSelect("improve-text")}
              >
                {language === "fr" ? "Améliore le texte" : "Improve the text"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                onSelect={() => handlePresetSelect("translate")}
              >
                {language === "fr" ? "Traduit dans une langue" : "Translate to a language"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {element.outputType === 'image' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white justify-between"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="text-xs">
                  {element.imageStyle 
                    ? IMAGE_STYLES[language][element.imageStyle]
                    : (language === "fr" ? "Style d'image" : "Image style")}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="bg-gray-800 border-gray-700 text-gray-100 min-w-[200px]"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuItem
                className={`text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer ${element.imageStyle === 'realistic' ? 'bg-gray-700' : ''}`}
                onSelect={() => handleStyleSelect('realistic')}
              >
                {IMAGE_STYLES[language].realistic}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer ${element.imageStyle === 'cartoon' ? 'bg-gray-700' : ''}`}
                onSelect={() => handleStyleSelect('cartoon')}
              >
                {IMAGE_STYLES[language].cartoon}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer ${element.imageStyle === 'anime' ? 'bg-gray-700' : ''}`}
                onSelect={() => handleStyleSelect('anime')}
              >
                {IMAGE_STYLES[language].anime}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer ${element.imageStyle === 'watercolor' ? 'bg-gray-700' : ''}`}
                onSelect={() => handleStyleSelect('watercolor')}
              >
                {IMAGE_STYLES[language].watercolor}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer ${element.imageStyle === 'oil-painting' ? 'bg-gray-700' : ''}`}
                onSelect={() => handleStyleSelect('oil-painting')}
              >
                {IMAGE_STYLES[language]['oil-painting']}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer ${element.imageStyle === 'sketch' ? 'bg-gray-700' : ''}`}
                onSelect={() => handleStyleSelect('sketch')}
              >
                {IMAGE_STYLES[language].sketch}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`text-sm text-gray-100 hover:bg-gray-700 focus:bg-gray-700 cursor-pointer ${element.imageStyle === 'wireframe' ? 'bg-gray-700' : ''}`}
                onSelect={() => handleStyleSelect('wireframe')}
              >
                {IMAGE_STYLES[language].wireframe}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={handleBlur}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder={element.outputType === 'image' 
            ? (language === "fr" ? "Décrivez l'image à générer..." : "Describe the image to generate...")
            : (language === "fr" ? "Instructions (ex: Résume ces textes...)" : "Instructions (e.g.: Summarize these texts...)")
          }
          className="bg-gray-800 border-gray-700 text-gray-100 text-sm min-h-[100px] resize-none focus-visible:ring-yellow-500/50 placeholder:text-gray-500"
        />
        
        <Button 
          onClick={handleRun}
          disabled={element.isRunning || (!prompt.trim() && !hasConnectedInputs)}
          className={`w-full ${element.isRunning ? 'bg-gray-700' : 'bg-yellow-500 hover:bg-yellow-600'} text-gray-900 font-bold transition-all`}
          size="sm"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {element.isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {language === "fr" ? "Traitement..." : "Processing..."}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2 fill-current" />
              {language === "fr" ? "Exécuter" : "Run"}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

