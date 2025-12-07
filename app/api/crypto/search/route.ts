import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 })
  }

  try {
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    const response = await fetch(searchUrl, {
      headers: {
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`CoinGecko Search API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.coins && Array.isArray(data.coins)) {
      const results = data.coins
        .filter((coin: any) => coin.id && coin.symbol && coin.name)
        .map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          coinId: coin.id,
        }))
        .slice(0, 5)

      return NextResponse.json(results)
    }

    return NextResponse.json([])
  } catch (error: any) {
    console.error("Error searching crypto:", error)
    return NextResponse.json(
      { error: error.message || "Failed to search crypto" },
      { status: 500 }
    )
  }
}

