function getYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getTweetId(url) {
  const match = url.match(/(?:twitter\.com|x\.com)\/.*\/status\/(\d+)/);
  return match ? match[1] : null;
}

// Log au chargement du service worker
console.log("Jumble Clipper: Background Service Worker Initialized");

chrome.action.onClicked.addListener(async (tab) => {
  console.log("Jumble Clipper: Click detected", tab);

  if (!tab.url) {
    console.log("Jumble Clipper: No URL found in tab");
    return;
  }

  // Ignorer les pages système chrome://
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
    console.log("Jumble Clipper: Cannot run on system pages");
    return;
  }

  // 1. Extraire les données de la page active
  let payload = {
    elementType: "link",
    data: {
      url: tab.url,
      title: tab.title || "Lien sans titre"
    }
  };

  const url = tab.url;

  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = getYouTubeId(url);
    if (videoId) {
      payload = {
        elementType: "youtube",
        data: { videoId }
      };
    }
  } else if (url.includes("twitter.com") || url.includes("x.com")) {
    const tweetId = getTweetId(url);
    if (tweetId) {
      payload = {
        elementType: "twitter",
        data: { tweetId }
      };
    }
  } else if (url.includes("linkedin.com")) {
    if (url.includes("/posts/") || url.includes("/activity/")) {
       payload = {
        elementType: "linkedin",
        data: { embedUrl: url }
      };
    }
  } else if (url.includes("notion.so")) {
    payload = {
      elementType: "notion",
      data: { embedUrl: url, customTitle: tab.title }
    };
  } else if (url.includes("linear.app")) {
    payload = {
      elementType: "linear",
      data: { embedUrl: url, customTitle: tab.title }
    };
  } else {
    // Generic Link - Tenter d'extraire plus de métadonnées
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const getMeta = (prop) => document.querySelector(`meta[property="${prop}"]`)?.content || document.querySelector(`meta[name="${prop}"]`)?.content;
          return {
            ogImage: getMeta('og:image'),
            description: getMeta('description') || getMeta('og:description')
          };
        }
      });
      
      if (results && results[0] && results[0].result) {
        const { ogImage, description } = results[0].result;
        if (ogImage) payload.data.imageUrl = ogImage;
        if (description) payload.data.description = description;
      }
    } catch (e) {
      console.log("Could not extract metadata", e);
    }
  }

  console.log("Jumble Clipper: Payload ready", payload);

  // 2. Trouver l'onglet Jumble
  const tabs = await chrome.tabs.query({ url: "https://jumblecanvas.netlify.app/*" });
  console.log("Jumble Clipper: Found Jumble tabs", tabs);
  
  if (tabs.length === 0) {
    console.log("Jumble Clipper: Jumble tab not found");
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => alert("Erreur : Veuillez ouvrir Jumble (https://jumblecanvas.netlify.app) dans un autre onglet pour utiliser le clipper.")
      });
    } catch (e) {
      console.error("Impossible d'afficher l'alerte (page protégée ?)", e);
    }
    return;
  }

  // 3. Envoyer le payload au premier onglet Jumble trouvé
  try {
    await chrome.tabs.sendMessage(tabs[0].id, {
      action: "ADD_TO_SPACE",
      payload: payload
    });
    console.log("Jumble Clipper: Message sent to Jumble tab");
  } catch (err) {
    console.log("Jumble Clipper: Message failed, trying to inject bridge...", err);
    // Tentative d'injection du script si "Receiving end does not exist"
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["bridge.js"]
      });
      // Réessayer d'envoyer après injection
      await new Promise(r => setTimeout(r, 100)); // Attendre un peu
      await chrome.tabs.sendMessage(tabs[0].id, {
        action: "ADD_TO_SPACE",
        payload: payload
      });
      console.log("Jumble Clipper: Message sent after injection");
    } catch (retryErr) {
      console.error("Jumble Clipper: Retry failed", retryErr);
      // Alerte à l'utilisateur
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => alert("Erreur: Veuillez recharger l'onglet Jumble (https://jumblecanvas.netlify.app) et réessayer.")
        });
      } catch(e) {}
      return;
    }
  }
    
  // Feedback de succès sur la page courante (seulement si succès)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (!document || !document.body) return;
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '20px';
        div.style.right = '20px';
        div.style.padding = '12px 24px';
        div.style.background = '#22c55e';
        div.style.color = 'white';
        div.style.borderRadius = '8px';
        div.style.zIndex = '2147483647'; // Max z-index
        div.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        div.style.fontWeight = '500';
        div.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        div.style.transition = 'opacity 0.3s ease';
        div.innerText = '✨ Ajouté au Jumble !';
        div.style.pointerEvents = 'none'; // Ne pas bloquer les clics
        
        document.body.appendChild(div);
        
        setTimeout(() => {
          div.style.opacity = '0';
          setTimeout(() => div.remove(), 300);
        }, 2000);
      }
    });
  } catch (err) {
    console.error("Error sending message or showing feedback", err);
    // Fallback alert si le script d'UI échoue
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (msg) => alert(msg),
        args: ["Erreur lors de l'envoi vers Jumble. Vérifiez que l'onglet est actif."]
      });
    } catch (e) {}
  }
});
