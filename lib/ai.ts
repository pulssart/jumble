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
  provider: AIProvider = "openai"
): Promise<string[]> {
  try {
    if (provider === "openai") {
      const data = await callOpenAI([
        {
          role: "system",
          content: "Tu es un assistant créatif. L'utilisateur te donne un sujet, tu dois générer une liste d'idées courtes et percutantes (max 10 mots par idée). Réponds UNIQUEMENT par un tableau JSON de chaînes de caractères.",
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
      const prompt = `Tu es un assistant créatif. L'utilisateur te donne un sujet, tu dois générer une liste d'idées courtes et percutantes (max 10 mots par idée). Réponds UNIQUEMENT par un tableau JSON de chaînes de caractères.\n\nDonne-moi ${count} idées créatives liées à : "${topic}". Format JSON strict: ["idée 1", "idée 2", ...]`
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
  provider: AIProvider = "openai"
): Promise<{ title: string, steps: string[] }> {
  try {
    if (provider === "openai") {
      const data = await callOpenAI([
        {
          role: "system",
          content: "Tu es un gestionnaire de projet expert. L'utilisateur te donne un objectif, tu dois créer un plan d'action concret. Réponds UNIQUEMENT par un objet JSON avec un titre et un tableau d'étapes (strings).",
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
      const prompt = `Tu es un gestionnaire de projet expert. L'utilisateur te donne un objectif, tu dois créer un plan d'action concret. Réponds UNIQUEMENT par un objet JSON avec un titre et un tableau d'étapes (strings).\n\nCrée un plan d'action pour : "${topic}". Format JSON strict: { "title": "Titre du plan", "steps": ["étape 1", "étape 2", ...] }`
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
  provider: AIProvider = "openai"
): Promise<{ url: string | null, error?: string }> {
  try {
    if (provider === "openai") {
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
    } else {
      // Gemini 2.5 Flash Image (Nano Banana) supporte la génération d'images
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
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

        const data = await response.json()
        
        if (data.error) {
          console.error("Gemini Image Error:", data.error)
          return { url: null, error: data.error.message || "Erreur de l'API Gemini" }
        }
        
        // Gemini retourne l'image en base64 dans candidates[0].content.parts[].inlineData
        const parts = data.candidates?.[0]?.content?.parts || []
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            const base64Data = part.inlineData.data
            const mimeType = part.inlineData.mimeType || "image/png"
            console.log("Image generated successfully with Gemini")
            return { url: `data:${mimeType};base64,${base64Data}` }
          }
        }

        console.log("Aucune image générée trouvée dans la réponse Gemini")
        return { url: null, error: "Aucune donnée d'image dans la réponse Gemini" }
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
  provider: AIProvider = "openai"
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
    } else {
      // Pour Gemini, on construit un prompt texte simple (Gemini supporte les images mais nécessite une structure différente)
      let promptText = instruction + "\n\nVoici les données d'entrée à traiter:\n"
      
      inputs.forEach((input, index) => {
        if (input.type === 'image') {
          promptText += `[Input ${index + 1} - Image fournie comme référence stylistique]\n`
        } else {
          promptText += `[Input ${index + 1}]:\n${input.content}\n\n`
        }
      })
      
      promptText += "\n---\nRÉSULTAT :"
      
      const data = await callGemini(promptText, apiKey, "gemini-2.5-flash")
      
      if (data.error) {
        console.error("Gemini Error:", data.error)
        return "Erreur API Gemini: " + (data.error.message || "Erreur inconnue")
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
    }
  } catch (error) {
    console.error("Erreur Run Prompt:", error)
    return "Erreur de connexion ou de traitement."
  }
}
