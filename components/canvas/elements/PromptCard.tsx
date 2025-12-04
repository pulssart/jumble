"use client"

import React, { useState } from "react"
import { PromptElement } from "@/types/canvas"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Play, Loader2, Zap, Type, Image as ImageIcon } from "lucide-react"

interface PromptCardProps {
  element: PromptElement
  onUpdate: (element: PromptElement) => void
  onRun: (id: string) => void
}

export function PromptCard({ element, onUpdate, onRun }: PromptCardProps) {
  const [prompt, setPrompt] = useState(element.content || "")

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRun(element.id)
  }

  const handleBlur = () => {
    onUpdate({ ...element, content: prompt })
  }

  return (
    <div className="drag-handle relative w-[300px] rounded-xl shadow-2xl bg-gray-900 border border-gray-700 text-white overflow-hidden flex flex-col group">
      {/* Header */}
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Prompt IA</span>
        </div>
        
        {/* Output Selector */}
        <div className="flex bg-gray-950 rounded-md p-0.5 border border-gray-700">
            <button
              className={`p-1 rounded transition-colors ${(!element.outputType || element.outputType === 'text') ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...element, outputType: 'text' }) }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Générer du texte"
            >
              <Type className="w-3 h-3" />
            </button>
            <button
              className={`p-1 rounded transition-colors ${element.outputType === 'image' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...element, outputType: 'image' }) }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Générer une image"
            >
              <ImageIcon className="w-3 h-3" />
            </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={handleBlur}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder={element.outputType === 'image' ? "Décrivez l'image à générer..." : "Instructions (ex: Résume ces textes...)"}
          className="bg-gray-800 border-gray-700 text-gray-100 text-sm min-h-[100px] resize-none focus-visible:ring-yellow-500/50 placeholder:text-gray-500"
        />
        
        <Button 
          onClick={handleRun}
          disabled={element.isRunning || !prompt.trim()}
          className={`w-full ${element.isRunning ? 'bg-gray-700' : 'bg-yellow-500 hover:bg-yellow-600'} text-gray-900 font-bold transition-all`}
          size="sm"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {element.isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2 fill-current" />
              Exécuter
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

