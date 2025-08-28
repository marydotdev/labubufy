import { NextRequest, NextResponse } from "next/server";
import { AI_CONFIG, getLabubuImageUrl, getLabubuName, generatePrompt } from "@/lib/config";

interface GenerationRequest {
  image: string;
  labubu_id: number;
}

interface ReplicateResponse {
  id: string;
  status: string;
  output?: string | string[];
  error?: string;
  logs?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { image, labubu_id }: GenerationRequest = await request.json();

    // Validation
    if (!image || !labubu_id) {
      return NextResponse.json(
        { error: "Missing required fields: image and labubu_id" },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      );
    }

    // Get Labubu reference image URL and name
    const labubuImageUrl = getLabubuImageUrl(labubu_id);
    const labubuName = getLabubuName(labubu_id);

    console.log(`🚀 GENERATE: Starting single-step generation for Labubu ${labubu_id} (${labubuName})`);

    // Single API call to Nano Banana
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: AI_CONFIG.MODEL,
        input: {
          prompt: generatePrompt(labubu_id),
          image_input: [image, labubuImageUrl],
          output_format: "jpg"
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`🚀 GENERATE: API error: ${response.status} - ${errorText}`);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid API credentials" },
          { status: 401 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: `API request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const result: ReplicateResponse = await response.json();
    
    console.log(`🚀 GENERATE: Single prediction created with ID: ${result.id}`);

    return NextResponse.json({
      success: true,
      prediction_id: result.id,
      status: "processing",
      labubu_id,
      labubu_name: labubuName
    });
    
  } catch (error) {
    console.error("🚀 GENERATE: Generation error:", error);

    // Return different error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes("network") || error.message.includes("fetch")) {
        return NextResponse.json(
          { error: "Network error. Please check your connection." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate image. Please try again." },
      { status: 500 }
    );
  }
}