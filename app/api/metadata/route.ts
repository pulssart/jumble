import { NextRequest, NextResponse } from "next/server"
import { fetchUrlMetadata } from "@/app/actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url } = body

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      )
    }

    // Valider l'URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      )
    }

    const metadata = await fetchUrlMetadata(url)
    
    if (!metadata) {
      return NextResponse.json(
        { error: "Failed to fetch metadata" },
        { status: 404 }
      )
    }

    return NextResponse.json(metadata)
  } catch (error: any) {
    console.error("Error in metadata API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

