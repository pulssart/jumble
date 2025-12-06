import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convertit du markdown simple en HTML
 * Supporte : retours à la ligne, gras (**text**), italique (*text*), listes, titres (H1, H2, H3)
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ""
  
  let html = markdown
  
  // Convertir le gras **text** ou __text__ (en premier pour éviter les conflits)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  
  // Convertir l'italique *text* ou _text_ (mais pas si c'est déjà du gras)
  // On évite les astérisques/double underscores déjà utilisés pour le gras
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  html = html.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>')
  
  // Traiter ligne par ligne pour gérer les titres, listes et paragraphes
  const lines = html.split('\n')
  let result: string[] = []
  let inList = false
  let inParagraph = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    if (!line) {
      // Ligne vide : fermer liste ou paragraphe
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      continue
    }
    
    // Vérifier si c'est un titre H1, H2 ou H3
    const h1Match = line.match(/^#\s+(.+)$/)
    const h2Match = line.match(/^##\s+(.+)$/)
    const h3Match = line.match(/^###\s+(.+)$/)
    
    if (h1Match || h2Match || h3Match) {
      // Fermer liste ou paragraphe avant d'ajouter un titre
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      
      if (h1Match) {
        result.push(`<h1>${h1Match[1]}</h1>`)
      } else if (h2Match) {
        result.push(`<h2>${h2Match[1]}</h2>`)
      } else if (h3Match) {
        result.push(`<h3>${h3Match[1]}</h3>`)
      }
      continue
    }
    
    // Vérifier si c'est une liste à puces
    const bulletMatch = line.match(/^[\-\*]\s+(.+)$/)
    if (bulletMatch) {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      if (!inList) {
        result.push('<ul>')
        inList = true
      }
      result.push(`<li>${bulletMatch[1]}</li>`)
      continue
    }
    
    // Vérifier si c'est une liste numérotée
    const numberMatch = line.match(/^\d+\.\s+(.+)$/)
    if (numberMatch) {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      if (!inList) {
        result.push('<ul>')
        inList = true
      }
      result.push(`<li>${numberMatch[1]}</li>`)
      continue
    }
    
    // Sinon, c'est du texte normal
    if (inList) {
      result.push('</ul>')
      inList = false
    }
    
    if (!inParagraph) {
      result.push('<p>')
      inParagraph = true
    } else {
      result.push('<br>')
    }
    
    result.push(line)
  }
  
  // Fermer les balises ouvertes
  if (inList) {
    result.push('</ul>')
  }
  if (inParagraph) {
    result.push('</p>')
  }
  
  html = result.join('')
  
  // Nettoyer les balises <p> vides
  html = html.replace(/<p><\/p>/g, '')
  
  return html
}

