export type AIProvider = "openai" | "gemini"

async function callOpenAI(messages: any[], apiKey: string, model: string = "gpt-4o", temperature: number = 0.7): Promise<any> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  })
  return response.json()
}

async function callGemini(prompt: string, apiKey: string, model: string = "gemini-2.5-flash"): Promise<any> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    }
  )
  return response.json()
}

export async function generateBrainstormingIdeas(
  topic: string, 
  apiKey: string, 
  count: number = 5,
  provider: AIProvider = "openai",
  context?: string
): Promise<string[]> {
  try {
    const contextPrompt = context ? `CONTEXTE GLOBAL (à respecter impérativement) : ${context}\n\n` : ""

    if (provider === "openai") {
      const data = await callOpenAI([
          {
            role: "system",
            content: `${contextPrompt}Tu es un assistant créatif. L'utilisateur te donne un sujet, tu dois générer une liste d'idées courtes et percutantes (max 10 mots par idée). Réponds UNIQUEMENT par un tableau JSON de chaînes de caractères.`,
          },
          {
            role: "user",
            content: `Donne-moi ${count} idées créatives liées à : "${topic}". Format JSON strict: ["idée 1", "idée 2", ...]`,
          },
      ], apiKey, "gpt-4o", 0.8)

    if (data.error) {
      console.error("OpenAI Error:", data.error)
      return []
    }
    
    const content = data.choices[0].message.content
      const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim()
      return JSON.parse(cleanContent)
    } else {
      const contextPrompt = context ? `CONTEXTE GLOBAL (à respecter impérativement) : ${context}\n\n` : ""
      const prompt = `${contextPrompt}Tu es un assistant créatif. L'utilisateur te donne un sujet, tu dois générer une liste d'idées courtes et percutantes (max 10 mots par idée). Réponds UNIQUEMENT par un tableau JSON de chaînes de caractères.\n\nDonne-moi ${count} idées créatives liées à : "${topic}". Format JSON strict: ["idée 1", "idée 2", ...]`
      const data = await callGemini(prompt, apiKey)
      
      if (data.error) {
        console.error("Gemini Error:", data.error)
        return []
      }
      
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
      const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim()
    return JSON.parse(cleanContent)
    }
  } catch (error) {
    console.error(`Erreur ${provider}:`, error)
    return []
  }
}

export async function generateTasks(
  topic: string, 
  apiKey: string,
  provider: AIProvider = "openai",
  context?: string
): Promise<{ title: string, steps: string[] }> {
  try {
    const contextPrompt = context ? `CONTEXTE GLOBAL (à respecter impérativement) : ${context}\n\n` : ""

    if (provider === "openai") {
      const data = await callOpenAI([
          {
            role: "system",
            content: `${contextPrompt}Tu es un gestionnaire de projet expert. L'utilisateur te donne un objectif, tu dois créer un plan d'action concret. Réponds UNIQUEMENT par un objet JSON avec un titre et un tableau d'étapes (strings).`,
          },
          {
            role: "user",
            content: `Crée un plan d'action pour : "${topic}". Format JSON strict: { "title": "Titre du plan", "steps": ["étape 1", "étape 2", ...] }`,
          },
      ], apiKey)

    if (data.error) return { title: "Erreur", steps: [] }
    
    const content = data.choices[0].message.content
    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim()
      return JSON.parse(cleanContent)
    } else {
      const contextPrompt = context ? `CONTEXTE GLOBAL (à respecter impérativement) : ${context}\n\n` : ""
      const prompt = `${contextPrompt}Tu es un gestionnaire de projet expert. L'utilisateur te donne un objectif, tu dois créer un plan d'action concret. Réponds UNIQUEMENT par un objet JSON avec un titre et un tableau d'étapes (strings).\n\nCrée un plan d'action pour : "${topic}". Format JSON strict: { "title": "Titre du plan", "steps": ["étape 1", "étape 2", ...] }`
      const data = await callGemini(prompt, apiKey)
      
      if (data.error) return { title: "Erreur", steps: [] }
      
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
      const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim()
    return JSON.parse(cleanContent)
    }
  } catch (error) {
    console.error(`Erreur ${provider}:`, error)
    return { title: "Erreur", steps: [] }
  }
}

export async function generateImage(
  prompt: string, 
  apiKey: string,
  provider: AIProvider = "openai",
  imageInput?: string, // Base64 de l'image d'entrée optionnelle
  context?: string,
  aspectRatio?: "1:1" | "16:9" | "9:16"
): Promise<{ url: string | null, error?: string }> {
  try {
    const finalPrompt = context ? `CONTEXTE GLOBAL DU PROJET : ${context}. PROMPT IMAGE : ${prompt}` : prompt

    if (provider === "openai") {
    // OpenAI ne supporte pas l'image-to-image via cette API pour l'instant
    // DALL-E 3 supporte 1024x1024, 1024x1792 (Portrait), 1792x1024 (Paysage)
    let size = "1024x1024"
    if (aspectRatio === "16:9") size = "1792x1024"
    if (aspectRatio === "9:16") size = "1024x1792"

    const body = JSON.stringify({
        model: "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: size,
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
    } else {
      // Gemini 2.5 Flash Image (pour tout : Text-to-Image et Image-to-Image)
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`
        
        let geminiAspectRatio = "1:1"
        if (aspectRatio === "16:9") geminiAspectRatio = "16:9"
        if (aspectRatio === "9:16") geminiAspectRatio = "9:16"

        const parts: any[] = [{ text: finalPrompt }]
        
        // Pour Gemini via REST, le ratio est souvent inféré ou nécessite un paramètre de configuration spécifique
        // Dans l'API standard generateContent, on peut ajouter des instructions de ratio dans le prompt
        // ou utiliser generationConfig si supporté pour les images (dépend de la version exacte)
        
        // Ajout explicite au prompt pour Gemini, car l'API REST v1beta simple ne prend pas toujours 'aspectRatio' en top-level
        parts[0].text = `${finalPrompt} (Aspect Ratio: ${geminiAspectRatio})`
        
        const generationConfig = {
            responseMimeType: "application/json"
        }

        if (imageInput) {
            console.log("Image input detected for Gemini")
            // Extraction du base64 pur (sans le header data:image/...)
            const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, "")
            
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg", // On assume jpeg par défaut
                    data: base64Data
                }
            })
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{ parts }]
            }),
        })

        const data = await response.json()
        
        console.log("Gemini Response Full Data:", JSON.stringify(data, null, 2))

        if (data.error) {
          console.error("Gemini Error:", data.error)
          return { url: null, error: data.error.message || "Erreur de l'API Gemini" }
        }
        
        // Gemini retourne l'image en base64 dans candidates[0].content.parts[].inlineData
        const responseParts = data.candidates?.[0]?.content?.parts || []
        for (const part of responseParts) {
          if (part.inlineData?.data) {
            const base64Data = part.inlineData.data
            const mimeType = part.inlineData.mimeType || "image/png"
            console.log("Image generated successfully with Gemini")
            return { url: `data:${mimeType};base64,${base64Data}` }
          }
        }

        console.log("Aucune image générée trouvée dans la réponse Gemini")
        const textResponse = responseParts.find((p: any) => p.text)?.text
        return { url: null, error: textResponse || "Aucune donnée d'image dans la réponse Gemini" }
      } catch (error: any) {
        console.error("Erreur Gemini Image:", error)
        return { url: null, error: error.message || "Erreur réseau ou inconnue" }
      }
    }
  } catch (error: any) {
    console.error(`Erreur ${provider} Image:`, error)
    return { url: null, error: error.message || "Erreur réseau ou inconnue" }
  }
}

export async function runPrompt(
  instruction: string,
  inputs: { type: string; content: string }[],
  apiKey: string,
  provider: AIProvider = "openai",
  context?: string
): Promise<string> {
  try {
    const contextPrompt = context ? `CONTEXTE GLOBAL (à respecter impérativement) : ${context}\n\n` : ""

    // Construction du contenu du message utilisateur (multimodal)
    const contentParts: any[] = []

    // Ajouter l'instruction principale
    contentParts.push({
        type: "text",
        text: `${contextPrompt}INSTRUCTION :\n${instruction}\n\nVoici les données d'entrée à traiter. IMPORTANT : Si des images sont fournies, elles servent UNIQUEMENT de référence stylistique (ambiance, couleurs, composition, style graphique). Ne pas décrire le contenu littéral de l'image, mais s'inspirer de son style pour traiter la demande.`
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

    if (provider === "openai") {
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
            content: `${contextPrompt}Tu es un processeur de données intelligent capable d'analyser du texte et des images. Ta tâche est de traiter les inputs fournis en suivant l'instruction donnée. Si des images sont fournies, considère-les comme des références de STYLE (ambiance, rendu visuel, direction artistique) et non de contenu, sauf instruction contraire explicite.`,
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
    } else {
      // Construction du payload pour Gemini (Multimodal)
      const parts: any[] = []
      
      parts.push({
        text: `${contextPrompt}${instruction}\n\nVoici les données d'entrée à traiter (images et/ou texte). Si des images sont présentes, utilise-les comme contexte visuel ou référence de style selon l'instruction.`
      })

      inputs.forEach((input, index) => {
        parts.push({ text: `\n[Input ${index + 1} - Type: ${input.type}]` })

        if (input.type === 'image' && input.content.startsWith('data:image')) {
            // Extraction du base64 et du mimeType
            const matches = input.content.match(/^data:(.+);base64,(.+)$/)
            if (matches && matches.length === 3) {
                parts.push({
                    inlineData: {
                        mimeType: matches[1],
                        data: matches[2]
                    }
                })
            }
        } else {
            parts.push({ text: input.content })
        }
      })

      parts.push({ text: "\n---\nRÉSULTAT :" })

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{ parts }]
            }),
            }
        )
        
        const data = await response.json()
        
        if (data.error) {
            console.error("Gemini Error:", data.error)
            return "Erreur API Gemini: " + (data.error.message || "Erreur inconnue")
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
      } catch (error: any) {
         console.error("Erreur appel Gemini:", error)
         return "Erreur réseau ou inconnue avec Gemini."
      }
    }
  } catch (error) {
    console.error("Erreur Run Prompt:", error)
    return "Erreur de connexion ou de traitement."
  }
}
