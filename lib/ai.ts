
export async function generateBrainstormingIdeas(
  topic: string, 
  apiKey: string, 
  count: number = 5
): Promise<string[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant créatif. L'utilisateur te donne un sujet, tu dois générer une liste d'idées courtes et percutantes (max 10 mots par idée). Réponds UNIQUEMENT par un tableau JSON de chaînes de caractères.",
          },
          {
            role: "user",
            content: `Donne-moi ${count} idées créatives liées à : "${topic}". Format JSON strict: ["idée 1", "idée 2", ...]`,
          },
        ],
        temperature: 0.8,
      }),
    })

    const data = await response.json()
    if (data.error) {
      console.error("OpenAI Error:", data.error)
      return []
    }
    
    const content = data.choices[0].message.content
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim()
    
    return JSON.parse(cleanContent)
  } catch (error) {
    console.error("Erreur OpenAI:", error)
    return []
  }
}

export async function generateTasks(
  topic: string, 
  apiKey: string
): Promise<{ title: string, steps: string[] }> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Tu es un gestionnaire de projet expert. L'utilisateur te donne un objectif, tu dois créer un plan d'action concret. Réponds UNIQUEMENT par un objet JSON avec un titre et un tableau d'étapes (strings).",
          },
          {
            role: "user",
            content: `Crée un plan d'action pour : "${topic}". Format JSON strict: { "title": "Titre du plan", "steps": ["étape 1", "étape 2", ...] }`,
          },
        ],
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    if (data.error) return { title: "Erreur", steps: [] }
    
    const content = data.choices[0].message.content
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim()
    
    return JSON.parse(cleanContent)
  } catch (error) {
    console.error("Erreur OpenAI:", error)
    return { title: "Erreur", steps: [] }
  }
}

export async function generateImage(
  prompt: string, 
  apiKey: string
): Promise<{ url: string | null, error?: string }> {
  try {
    const body = JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "b64_json"
      })
    
    console.log("Sending Image Request to OpenAI (Images API):", body)

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: body,
    })

    console.log("OpenAI Image Response Status:", response.status)
    const data = await response.json()
    
    if (data.error) {
      console.error("OpenAI Image Error:", data.error)
      return { url: null, error: data.error.message || "Erreur de l'API OpenAI" }
    }
    
    if (data.data && data.data.length > 0 && data.data[0].b64_json) {
        console.log("Image generated successfully")
        return { url: `data:image/png;base64,${data.data[0].b64_json}` }
    }

    console.log("Aucune image générée trouvée dans la réponse")
    return { url: null, error: "Aucune donnée d'image dans la réponse" }
  } catch (error: any) {
    console.error("Erreur OpenAI Image:", error)
    return { url: null, error: error.message || "Erreur réseau ou inconnue" }
  }
}

export async function runPrompt(
  instruction: string,
  inputs: { type: string; content: string }[],
  apiKey: string
): Promise<string> {
  try {
    // Construction du contenu du message utilisateur (multimodal)
    const contentParts: any[] = []

    // Ajouter l'instruction principale
    contentParts.push({
        type: "text",
        text: `INSTRUCTION :\n${instruction}\n\nVoici les données d'entrée à traiter. IMPORTANT : Si des images sont fournies, elles servent UNIQUEMENT de référence stylistique (ambiance, couleurs, composition, style graphique). Ne pas décrire le contenu littéral de l'image, mais s'inspirer de son style pour traiter la demande.`
    })

    // Ajouter chaque input comme partie du message
    inputs.forEach((input, index) => {
        const inputLabel = `\n[Input ${index + 1} - Type: ${input.type}]`
        
        contentParts.push({
            type: "text",
            text: inputLabel
        })

        if (input.type === 'image' && input.content.startsWith('data:image')) {
            // Si c'est une image en base64 (ou URL data), on l'ajoute comme image_url
            contentParts.push({
                type: "image_url",
                image_url: {
                    url: input.content
                }
            })
        } else if (input.type === 'image' && input.content.startsWith('http')) {
             // Si c'est une URL d'image standard
             contentParts.push({
                type: "image_url",
                image_url: {
                    url: input.content
                }
            })
        } else {
            // Texte standard
            contentParts.push({
                type: "text",
                text: input.content
            })
        }
    })

    contentParts.push({
        type: "text",
        text: "\n---\nRÉSULTAT :"
    })

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // Supporte Vision
        messages: [
          {
            role: "system",
            content: "Tu es un processeur de données intelligent capable d'analyser du texte et des images. Ta tâche est de traiter les inputs fournis en suivant l'instruction donnée. Si des images sont fournies, considère-les comme des références de STYLE (ambiance, rendu visuel, direction artistique) et non de contenu, sauf instruction contraire explicite.",
          },
          {
            role: "user",
            content: contentParts,
          },
        ],
        temperature: 0.7,
        max_completion_tokens: 1000,
      }),
    })

    const data = await response.json()
    
    if (data.error) {
      console.error("OpenAI Error:", data.error)
      return "Erreur API OpenAI: " + data.error.message
    }

    return data.choices[0].message.content || ""
  } catch (error) {
    console.error("Erreur Run Prompt:", error)
    return "Erreur de connexion ou de traitement."
  }
}
