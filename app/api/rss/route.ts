import { NextRequest, NextResponse } from "next/server"
import Parser from "rss-parser"

// Type pour les champs personnalisés
interface CustomItem {
  media?: Array<{ $: { url: string } }>
  thumbnail?: Array<{ $: { url: string } } | string>
  enclosure?: Array<{ url: string; type?: string }>
}

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media', { keepArray: true }],
      ['media:thumbnail', 'thumbnail', { keepArray: true }],
      ['enclosure', 'enclosure', { keepArray: true }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const feedUrl = searchParams.get("url")

  if (!feedUrl) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  try {
    const feed = await parser.parseURL(feedUrl)

    if (!feed.items || feed.items.length === 0) {
      return NextResponse.json({ error: "No items found in RSS feed" }, { status: 404 })
    }

    // Récupérer plusieurs articles (jusqu'à 10)
    const items = feed.items.slice(0, 10).map((item) => {

      // Extraire l'image de l'article - essayer plusieurs méthodes
      let image = ""
      
      // Méthode 1: enclosure (image jointe)
      if (item.enclosure && Array.isArray(item.enclosure) && item.enclosure.length > 0) {
        const enclosure = item.enclosure[0]
        if (enclosure.url && (enclosure.type?.startsWith('image/') || enclosure.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i))) {
          image = enclosure.url
        }
      } else if (item.enclosure && typeof item.enclosure === 'object' && item.enclosure.url) {
        if (item.enclosure.type?.startsWith('image/') || item.enclosure.url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) {
          image = item.enclosure.url
        }
      }
      
      // Méthode 2: media:content ou media:thumbnail
      if (!image && item.media && Array.isArray(item.media) && item.media.length > 0) {
        const media = item.media[0]
        if (media.$ && media.$.url) {
          image = media.$.url
        } else if (typeof media === 'string') {
          image = media
        }
      }
      
      // Méthode 3: thumbnail
      if (!image && item.thumbnail && Array.isArray(item.thumbnail) && item.thumbnail.length > 0) {
        const thumb = item.thumbnail[0]
        if (thumb.$ && thumb.$.url) {
          image = thumb.$.url
        } else if (typeof thumb === 'string') {
          image = thumb
        }
      }
      
      // Méthode 4: Extraire de content:encoded (priorité pour WordPress/FeedBurner)
      if (!image && (item as any).contentEncoded) {
        const contentEncodedStr = typeof (item as any).contentEncoded === 'string' 
          ? (item as any).contentEncoded 
          : String((item as any).contentEncoded)
        // Chercher toutes les images dans le contenu
        const imgMatches = contentEncodedStr.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)
        if (imgMatches && imgMatches.length > 0) {
          // Prendre la première image qui n'est pas un pixel de tracking
          for (const imgTag of imgMatches) {
            const srcMatch = imgTag.match(/src=["']([^"']+)["']/i)
            if (srcMatch && srcMatch[1]) {
              const imgUrl = srcMatch[1]
              // Ignorer les pixels de tracking (1x1, transparent, etc.)
              if (!imgUrl.match(/1x1|pixel|tracking|beacon|analytics/i) && 
                  imgUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) {
                image = imgUrl
                break
              }
            }
          }
          // Si aucune image valide trouvée, prendre la première quand même
          if (!image && imgMatches[0]) {
            const srcMatch = imgMatches[0].match(/src=["']([^"']+)["']/i)
            if (srcMatch && srcMatch[1]) {
              image = srcMatch[1]
            }
          }
        }
      }
      
      // Méthode 5: Extraire de content (HTML)
      if (!image && item.content) {
        const contentStr = typeof item.content === 'string' ? item.content : String(item.content)
        // Chercher toutes les images dans le contenu
        const imgMatches = contentStr.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)
        if (imgMatches && imgMatches.length > 0) {
          // Prendre la première image qui n'est pas un pixel de tracking
          for (const imgTag of imgMatches) {
            const srcMatch = imgTag.match(/src=["']([^"']+)["']/i)
            if (srcMatch && srcMatch[1]) {
              const imgUrl = srcMatch[1]
              // Ignorer les pixels de tracking (1x1, transparent, etc.)
              if (!imgUrl.match(/1x1|pixel|tracking|beacon|analytics/i) && 
                  imgUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)) {
                image = imgUrl
                break
              }
            }
          }
          // Si aucune image valide trouvée, prendre la première quand même
          if (!image && imgMatches[0]) {
            const srcMatch = imgMatches[0].match(/src=["']([^"']+)["']/i)
            if (srcMatch && srcMatch[1]) {
              image = srcMatch[1]
            }
          }
        }
      }
      
      // Méthode 6: Extraire de contentSnippet
      if (!image && item.contentSnippet) {
        const snippetStr = typeof item.contentSnippet === 'string' ? item.contentSnippet : String(item.contentSnippet)
        const imgMatch = snippetStr.match(/<img[^>]+src=["']([^"']+)["']/i)
        if (imgMatch && imgMatch[1]) {
          image = imgMatch[1]
        }
      }
      
      // Méthode 7: Extraire de description
      if (!image && (item as any).description) {
        const descStr = typeof (item as any).description === 'string' ? (item as any).description : String((item as any).description)
        const imgMatch = descStr.match(/<img[^>]+src=["']([^"']+)["']/i)
        if (imgMatch && imgMatch[1]) {
          image = imgMatch[1]
        }
      }
      
      // Méthode 7: Chercher dans itunes:image ou autres champs personnalisés
      if (!image && (item as any)['itunes:image']) {
        const itunesImg = (item as any)['itunes:image']
        if (typeof itunesImg === 'string') {
          image = itunesImg
        } else if (itunesImg?.href) {
          image = itunesImg.href
        }
      }
      
      // Nettoyer l'URL de l'image (enlever les paramètres de taille si nécessaire)
      if (image) {
        // Décoder les entités HTML
        image = image.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        // Enlever les paramètres de taille pour obtenir l'image originale
        image = image.replace(/[?&](w|width|h|height|s|size)=\d+/gi, '')
        // Convertir les URLs relatives en absolues si nécessaire (basique)
        if (image.startsWith('//')) {
          image = 'https:' + image
        } else if (image.startsWith('/')) {
          // Essayer de construire l'URL complète depuis le feed
          try {
            const feedUrlObj = new URL(feedUrl)
            image = feedUrlObj.origin + image
          } catch (e) {
            // Ignorer si l'URL est invalide
          }
        }
      }

      // Formater la date
      let pubDate = ""
      if (item.pubDate) {
        const date = new Date(item.pubDate)
        pubDate = date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      return {
        title: item.title || "",
        link: item.link || "",
        image: image,
        pubDate: pubDate,
        description: (item as any).contentSnippet || (item as any).content || (item as any).description || "",
      }
    })

    return NextResponse.json({
      siteName: feed.title || "",
      articles: items,
    })
  } catch (error: any) {
    console.error("Error fetching RSS feed:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch RSS feed" },
      { status: 500 }
    )
  }
}

