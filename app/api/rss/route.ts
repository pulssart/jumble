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

      // Extraire l'image de l'article
      let image = ""
      
      // Essayer différentes sources d'images
      if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image/')) {
        image = item.enclosure.url
      } else if (item.media && item.media.length > 0 && item.media[0].$.url) {
        image = item.media[0].$.url
      } else if (item.thumbnail && item.thumbnail.length > 0) {
        image = item.thumbnail[0].$.url || item.thumbnail[0]
      } else if (item.contentSnippet) {
        // Essayer d'extraire l'image du contenu HTML
        const imgMatch = item.contentSnippet.match(/<img[^>]+src="([^"]+)"/i) || 
                         item.content?.match(/<img[^>]+src="([^"]+)"/i)
        if (imgMatch) {
          image = imgMatch[1]
        }
      }

      // Si pas d'image trouvée, essayer d'extraire de la description
      if (!image && item.content) {
        const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/i)
        if (imgMatch) {
          image = imgMatch[1]
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
        description: item.contentSnippet || item.content || "",
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

