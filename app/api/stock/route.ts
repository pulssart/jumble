import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0]
      const meta = result.meta

      const currentPrice = meta.regularMarketPrice ?? meta.previousClose ?? meta.chartPreviousClose
      const previousClose = meta.previousClose ?? meta.chartPreviousClose ?? currentPrice

      if (!currentPrice || currentPrice === 0) {
        throw new Error("Price not available")
      }

      const change = currentPrice - previousClose
      const changePercent = previousClose && previousClose !== 0 ? (change / previousClose) * 100 : 0

      return NextResponse.json({
        price: Number(currentPrice.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        companyName: meta.longName || meta.shortName || meta.symbol || symbol,
      })
    }

    throw new Error("Invalid response format")
  } catch (error: any) {
    console.error("Error fetching stock data:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch stock data" },
      { status: 500 }
    )
  }
}

