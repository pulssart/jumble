import { NextRequest, NextResponse } from "next/server"
import { fetchTweet } from "@/app/actions"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tweetId } = body

    if (!tweetId || typeof tweetId !== "string") {
      return NextResponse.json(
        { error: "Tweet ID is required" },
        { status: 400 }
      )
    }

    const tweet = await fetchTweet(tweetId)
    
    if (!tweet) {
      return NextResponse.json(
        { error: "Tweet not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(tweet)
  } catch (error: any) {
    console.error("Error in tweet API:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

