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

export async function fetchLinearData(url: string) {
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

    // Extraire le titre
    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
    title = title.replace(/ - Linear$/, "").replace(/ \| Linear$/, "");

    // Extraire la description
    let description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "";

    // Essayer d'extraire les données structurées JSON depuis les scripts
    let status = "";
    let priority = "";
    let assignee = "";
    let labels: string[] = [];

    // Chercher les données dans les scripts JSON-LD ou dans les scripts inline
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '{}');
        if (json['@type'] === 'Article' || json['@type'] === 'Issue') {
          if (json.name) title = json.name;
          if (json.description) description = json.description;
        }
      } catch (e) {
        // Ignore
      }
    });

    // Chercher dans les scripts inline pour des données Linear
    $('script').each((_, el) => {
      const scriptContent = $(el).html() || '';
      // Chercher des patterns Linear courants
      if (scriptContent.includes('"status"') || scriptContent.includes("'status'")) {
        const statusMatch = scriptContent.match(/"status"\s*:\s*"([^"]+)"/) || scriptContent.match(/'status'\s*:\s*'([^']+)'/);
        if (statusMatch) status = statusMatch[1];
      }
      if (scriptContent.includes('"priority"') || scriptContent.includes("'priority'")) {
        const priorityMatch = scriptContent.match(/"priority"\s*:\s*"([^"]+)"/) || scriptContent.match(/'priority'\s*:\s*'([^']+)'/);
        if (priorityMatch) priority = priorityMatch[1];
      }
      if (scriptContent.includes('"assignee"') || scriptContent.includes("'assignee'")) {
        const assigneeMatch = scriptContent.match(/"assignee"\s*:\s*"([^"]+)"/) || scriptContent.match(/'assignee'\s*:\s*'([^']+)'/);
        if (assigneeMatch) assignee = assigneeMatch[1];
      }
    });

    // Chercher dans le HTML pour le statut (souvent dans des spans ou divs avec des classes spécifiques)
    $('[class*="status"], [class*="Status"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !status) {
        const statusText = text.toLowerCase();
        if (statusText.includes('in progress') || statusText.includes('en cours')) {
          status = 'In Progress';
        } else if (statusText.includes('done') || statusText.includes('terminé')) {
          status = 'Done';
        } else if (statusText.includes('backlog')) {
          status = 'Backlog';
        } else if (statusText.includes('todo') || statusText.includes('à faire')) {
          status = 'Todo';
        } else if (statusText.includes('canceled') || statusText.includes('annulé')) {
          status = 'Canceled';
        } else {
          status = text;
        }
      }
    });

    // Chercher la priorité
    $('[class*="priority"], [class*="Priority"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !priority) {
        const priorityText = text.toLowerCase();
        if (priorityText.includes('urgent')) {
          priority = 'Urgent';
        } else if (priorityText.includes('high') || priorityText.includes('haute')) {
          priority = 'High';
        } else if (priorityText.includes('medium') || priorityText.includes('moyenne')) {
          priority = 'Medium';
        } else if (priorityText.includes('low') || priorityText.includes('basse')) {
          priority = 'Low';
        } else {
          priority = text;
        }
      }
    });

    // Chercher l'assigné (souvent dans des avatars ou des noms)
    $('[class*="assignee"], [class*="Assignee"], [class*="avatar"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !assignee && text.length < 50) {
        assignee = text;
      }
    });

    // Chercher les labels
    $('[class*="label"], [class*="Label"], [class*="tag"], [class*="Tag"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 30 && !labels.includes(text)) {
        labels.push(text);
      }
    });

    return { title, description, status, priority, assignee, labels };
  } catch (error) {
    console.error("Erreur Linear scraping:", error);
    return null;
  }
}

export async function fetchUrlMetadata(url: string) {
  try {
    // Si c'est une URL Linear, utiliser la fonction spécialisée
    if (url.includes('linear.app')) {
      return await fetchLinearData(url);
    }

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
