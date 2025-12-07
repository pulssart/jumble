import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const coinId = searchParams.get("coinId")
  const symbol = searchParams.get("symbol")

  if (!coinId && !symbol) {
    return NextResponse.json({ error: "coinId or symbol is required" }, { status: 400 })
  }

  try {
    let apiUrl = ""
    
    if (coinId) {
      // Utiliser l'ID CoinGecko directement
      apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    } else if (symbol) {
      // Rechercher d'abord l'ID à partir du symbole
      const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`
      const searchResponse = await fetch(searchUrl)
      
      if (!searchResponse.ok) {
        throw new Error(`CoinGecko Search API error: ${searchResponse.status}`)
      }
      
      const searchData = await searchResponse.json()
      
      if (!searchData.coins || searchData.coins.length === 0) {
        throw new Error("Cryptocurrency not found")
      }
      
      const coin = searchData.coins[0]
      apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd&include_24hr_change=true`
    }

    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Récupérer le premier coin (il n'y en a qu'un)
    const coinData = Object.values(data)[0] as any
    
    if (!coinData || !coinData.usd) {
      throw new Error("Price data not available")
    }

    const price = coinData.usd
    const changePercent = coinData.usd_24h_change || 0
    const change = (price * changePercent) / 100

    // Récupérer le nom complet de la crypto
    let coinName = symbol?.toUpperCase() || ""
    if (coinId) {
      try {
        const coinInfoUrl = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false`
        const coinInfoResponse = await fetch(coinInfoUrl)
        if (coinInfoResponse.ok) {
          const coinInfo = await coinInfoResponse.json()
          coinName = coinInfo.name || coinName
        }
      } catch (e) {
        // Ignorer l'erreur, utiliser le symbole
      }
    }

    return NextResponse.json({
      price: Number(price.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      coinName: coinName,
      coinId: coinId || (symbol ? Object.keys(data)[0] : undefined),
    })
  } catch (error: any) {
    console.error("Error fetching crypto data:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch crypto data" },
      { status: 500 }
    )
  }
}

