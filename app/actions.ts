"use server"

import * as cheerio from 'cheerio';
import { getTweet } from 'react-tweet/api';

export async function fetchTweet(id: string) {
  try {
    const tweet = await getTweet(id);
    return tweet;
  } catch (error) {
    console.error("Error fetching tweet:", error);
    return null;
  }
}

export async function fetchUrlMetadata(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 3600 } // Cache 1h
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
    let description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "";
    const image = $('meta[property="og:image"]').attr('content') || "";
    
    // Tentative de récupération de l'auteur
    let author = $('meta[name="author"]').attr('content') || $('meta[property="article:author"]').attr('content') || "";
    
    // Parsing spécifique LinkedIn pour séparer Auteur et Contenu
    if (url.includes('linkedin.com')) {
        // Formats courants : "Prenom Nom on LinkedIn: Content..." ou "Prenom Nom sur LinkedIn : Contenu..."
        // Regex qui cherche " on LinkedIn: " ou " sur LinkedIn : "
        const linkedinRegex = /^(.*?) (?:on|sur) LinkedIn\s?:\s?(.*)$/i;
        const match = title.match(linkedinRegex);
        
        if (match) {
            // Si on trouve le pattern, on a l'auteur et le vrai contenu
            if (!author) author = match[1]; // "Prenom Nom"
            title = match[2]; // "Le début du post..." (On remplace le title par le contenu pur)
        }

        // Pour LinkedIn on décide d'utiliser UNIQUEMENT la description
        // pour afficher le corps du post dans la carte, afin d'éviter
        // toute logique de doublon entre title et description.
        description = title;
        title = "";
    }
    
    let favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || $('link[rel="apple-touch-icon"]').attr('href') || "";

    // Gestion des URLs relatives
    const urlObj = new URL(url);
    const baseUrl = urlObj.origin;

    if (favicon && !favicon.startsWith('http')) {
        if (favicon.startsWith('//')) {
            favicon = 'https:' + favicon;
        } else if (favicon.startsWith('/')) {
            favicon = baseUrl + favicon;
        } else {
            // Relatif au path courant (complexe sans l'URL finale après redirection, mais on tente)
            favicon = new URL(favicon, url).toString();
        }
    }

    if (image && !image.startsWith('http')) {
        if (image.startsWith('//')) {
            // image = 'https:' + image; // Modifiable car const
        } else if (image.startsWith('/')) {
            // image = baseUrl + image;
        }
    }

    // Fallback favicon si vide
    if (!favicon) {
        favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`
    }

    return { title, description, image, favicon, author };
  } catch (error) {
    console.error("Erreur metadata:", error);
    return null;
  }
}
