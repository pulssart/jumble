export type ElementType = "image" | "text" | "task" | "postit" | "youtube" | "spotify" | "figma" | "notion" | "linear" | "linkedin" | "twitter" | "link" | "prompt" | "webcam" | "gif" | "clock" | "applemusic" | "instagram"

export interface Position {
  x: number
  y: number
}

export interface BaseElement {
  id: string
  type: ElementType
  position: Position
  width?: number
  height?: number
  zIndex?: number
  parentId?: string
  connections?: string[] // IDs des éléments connectés en sortie (droite -> gauche)
}

export interface ImageElement extends BaseElement {
  type: "image"
  src: string
  alt?: string
}

export interface TextElement extends BaseElement {
  type: "text"
  content: string
}

export interface TaskElement extends BaseElement {
  type: "task"
  title: string
  completed: boolean
}

export interface PostItElement extends BaseElement {
  type: "postit"
  content: string
  color?: "yellow" | "pink" | "blue" | "green" | "purple"
}

export interface YoutubeElement extends BaseElement {
  type: "youtube"
  videoId: string
}

export interface SpotifyElement extends BaseElement {
  type: "spotify"
  spotifyUri: string // Peut être une URL ou un URI spotify:playlist:...
  width?: number
  height?: number
}

export interface FigmaElement extends BaseElement {
  type: "figma"
  url: string
}

export interface NotionElement extends BaseElement {
  type: "notion"
  embedUrl: string
  customTitle?: string
}

export interface LinearElement extends BaseElement {
  type: "linear"
  embedUrl: string
  customTitle?: string
}

export interface LinkedinElement extends BaseElement {
  type: "linkedin"
  embedUrl: string
  customTitle?: string
  title?: string
  description?: string
  imageUrl?: string
  favicon?: string
  author?: string
}

export interface TwitterElement extends BaseElement {
  type: "twitter"
  tweetId: string
  customTitle?: string
}

export interface LinkElement extends BaseElement {
  type: "link"
  url: string
  title?: string
  description?: string
  imageUrl?: string
  favicon?: string
}

export interface PromptElement extends BaseElement {
  type: "prompt"
  content: string
  isRunning?: boolean
  outputType?: "text" | "image"
}

export interface WebcamElement extends BaseElement {
  type: "webcam"
  deviceId?: string
  isActive?: boolean
  mirrored?: boolean
}

export interface GifElement extends BaseElement {
  type: "gif"
  src: string
  alt?: string
}

export interface ClockElement extends BaseElement {
  type: "clock"
  timezone: string // ex: "Europe/Paris", "America/New_York"
  label?: string // Nom de la ville ou label perso
  isAnalog?: boolean // Analogique vs Digital
  showSeconds?: boolean // Afficher les secondes
  is24Hour?: boolean // Format 24h (si digital)
}

export interface AppleMusicElement extends BaseElement {
  type: "applemusic"
  url: string // URL Apple Music d'origine
  title?: string
}

export interface InstagramElement extends BaseElement {
  type: "instagram"
  shortcode: string // Ex: "DRu_DUkiCSj" pour un reel ou "ABC123" pour un post
  embedUrl?: string // URL complète d'embed
}

export type CanvasElement =
  | ImageElement
  | TextElement
  | TaskElement
  | PostItElement
  | YoutubeElement
  | SpotifyElement
  | FigmaElement
  | NotionElement
  | LinearElement
  | LinkedinElement
  | TwitterElement
  | LinkElement
  | PromptElement
  | WebcamElement
  | GifElement
  | ClockElement
  | AppleMusicElement
  | InstagramElement

export interface Space {
  id: string
  name: string
  lastModified: number
}
