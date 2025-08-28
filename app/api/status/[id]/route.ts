import { NextRequest, NextResponse } from "next/server";

interface ReplicateStatus {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  logs?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🔍 STATUS: Checking prediction ${id}`);

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      );
    }

    // Single prediction check - much simpler!
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Prediction not found" },
          { status: 404 }
        );
      }
      throw new Error(`Status API error: ${response.status} ${response.statusText}`);
    }

    const result: ReplicateStatus = await response.json();
    console.log(`🔍 STATUS: Result for ${id}:`, result.status);

    return NextResponse.json({
      id: result.id,
      status: result.status,
      output: result.output,
      error: result.error,
      progress: getProgressFromStatus(result.status),
      estimated_time: getEstimatedTime(result.status, result.created_at, result.started_at)
    });

  } catch (error) {
    console.error("🔍 STATUS: Error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

// Calculate progress percentage from status
function getProgressFromStatus(status: string): number {
  switch (status) {
    case "starting":
      return 10;
    case "processing":
      return 50;
    case "succeeded":
      return 100;
    case "failed":
    case "canceled":
      return 0;
    default:
      return 0;
  }
}

// Estimate remaining time based on status and timestamps
function getEstimatedTime(
  status: string,
  created_at?: string,
  started_at?: string
): number {
  if (status === "succeeded" || status === "failed" || status === "canceled") {
    return 0;
  }

  if (started_at) {
    const startTime = new Date(started_at).getTime();
    const elapsed = Date.now() - startTime;
    const estimatedTotal = 45000; // 45 seconds for Nano Banana
    const remaining = Math.max(0, estimatedTotal - elapsed);
    return Math.ceil(remaining / 1000);
  }

  switch (status) {
    case "starting":
      return 45;
    case "processing":
      return 25;
    default:
      return 35;
  }
}