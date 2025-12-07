import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Yahoo Finance Search API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.quotes && Array.isArray(data.quotes)) {
      const results = data.quotes
        .filter((quote: any) => quote.symbol && quote.shortname)
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          exchange: quote.exchange,
        }))
        .slice(0, 5)

      return NextResponse.json(results)
    }

    return NextResponse.json([])
  } catch (error: any) {
    console.error("Error searching stocks:", error)
    return NextResponse.json(
      { error: error.message || "Failed to search stocks" },
      { status: 500 }
    )
  }
}

