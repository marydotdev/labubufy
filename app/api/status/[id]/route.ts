// FIXED DEBUG version of app/api/status/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  generationSessions,
  type GenerationSession,
} from "@/lib/session-store";

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
    console.log(`🔍 STATUS API: Checking prediction ${id}`);

    // Check if this is a multi-step generation session
    const session = generationSessions.get(id);
    console.log(`🔍 STATUS API: Session found?`, !!session);
    if (session) {
      console.log(
        `🔍 STATUS API: Session details:`,
        JSON.stringify(session, null, 2)
      );
      return handleMultiStepStatus(id, session);
    } else {
      console.log(`🔍 STATUS API: No session found, using single-step handler`);
      // Check all sessions to see what we have
      const allSessions = generationSessions.getAllSessions();
      console.log(`🔍 STATUS API: All session IDs:`, allSessions);
    }

    // Handle single-step predictions (legacy or direct API calls)
    return handleSingleStepStatus(id);
  } catch (error) {
    console.error("GET function error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle single-step generation status (existing logic)
async function handleSingleStepStatus(id: string): Promise<NextResponse> {
  console.log(`🔍 STATUS API: Using single-step handler for ${id}`);

  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: "Replicate API token not configured" },
      { status: 500 }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${id}`,
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Prediction not found" },
          { status: 404 }
        );
      }
      throw new Error(
        `Status API error: ${response.status} ${response.statusText}`
      );
    }

    const result: ReplicateStatus = await response.json();
    console.log(
      `🔍 STATUS API: Single-step result:`,
      JSON.stringify(result, null, 2)
    );

    return NextResponse.json({
      id: result.id,
      status: result.status,
      output: result.output,
      error: result.error,
      logs: result.logs,
      progress: getProgressFromStatus(result.status),
      estimated_time: getEstimatedTime(
        result.status,
        result.created_at,
        result.started_at
      ),
    });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

// FIXED multi-step status handler
async function handleMultiStepStatus(
  sessionId: string,
  session: GenerationSession
): Promise<NextResponse> {
  try {
    console.log(
      `🔍 MULTI-STEP: Checking status for session ${sessionId}, current status: ${session.status}`
    );

    // Handle completed states first - ONLY return succeeded when Step 2 is done
    if (session.status === "completed") {
      console.log(
        `✅ MULTI-STEP: Session ${sessionId} is completed, returning final output`
      );
      return NextResponse.json({
        id: sessionId,
        status: "succeeded",
        output: session.final_output ? [session.final_output] : undefined,
        progress: 100,
        estimated_time: 0,
        step: 2,
        total_steps: 2,
      });
    }

    if (session.status === "failed") {
      console.log(
        `❌ MULTI-STEP: Session ${sessionId} failed: ${session.error}`
      );
      return NextResponse.json({
        id: sessionId,
        status: "failed",
        error: session.error || "Generation failed",
        progress: 0,
        step: session.step2_prediction_id ? 2 : 1,
        total_steps: 2,
      });
    }

    // Handle Step 1 processing
    if (session.status === "step1_processing") {
      console.log(`🔄 MULTI-STEP: Checking Step 1 for session ${sessionId}`);

      const step1Response = await fetch(
        `https://api.replicate.com/v1/predictions/${session.step1_prediction_id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!step1Response.ok) {
        throw new Error(`Step 1 status check failed: ${step1Response.status}`);
      }

      const step1Result: ReplicateStatus = await step1Response.json();
      console.log(`🔄 MULTI-STEP: Step 1 status: ${step1Result.status}`);

      if (step1Result.status === "failed") {
        const failedSession: GenerationSession = {
          ...session,
          status: "failed",
          error: step1Result.error || "Step 1 failed",
        };
        generationSessions.set(sessionId, failedSession);

        return NextResponse.json({
          id: sessionId,
          status: "failed",
          error: failedSession.error,
          progress: 0,
          step: 1,
          total_steps: 2,
        });
      }

      // CRITICAL: Never return succeeded for Step 1 - always return processing
      console.log(`🔄 MULTI-STEP: Returning processing status for Step 1`);
      return NextResponse.json({
        id: sessionId,
        status: "processing",
        step: 1,
        total_steps: 2,
        progress: Math.min(45, getProgressFromStatus(step1Result.status)),
        estimated_time:
          getEstimatedTime(
            step1Result.status,
            step1Result.created_at,
            step1Result.started_at
          ) + 25,
      });
    }

    // Handle Step 2 processing
    if (session.status === "step2_processing") {
      console.log(`🔄 MULTI-STEP: Checking Step 2 for session ${sessionId}`);

      if (!session.step2_prediction_id) {
        throw new Error("Step 2 prediction ID missing");
      }

      const step2Response = await fetch(
        `https://api.replicate.com/v1/predictions/${session.step2_prediction_id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!step2Response.ok) {
        throw new Error(`Step 2 status check failed: ${step2Response.status}`);
      }

      const step2Result: ReplicateStatus = await step2Response.json();
      console.log(`🔄 MULTI-STEP: Step 2 status: ${step2Result.status}`);

      if (step2Result.status === "failed") {
        const failedSession: GenerationSession = {
          ...session,
          status: "failed",
          error: step2Result.error || "Step 2 failed",
        };
        generationSessions.set(sessionId, failedSession);

        return NextResponse.json({
          id: sessionId,
          status: "failed",
          error: failedSession.error,
          progress: 0,
          step: 2,
          total_steps: 2,
        });
      }

      console.log(`🔄 MULTI-STEP: Returning processing status for Step 2`);
      return NextResponse.json({
        id: sessionId,
        status: "processing",
        step: 2,
        total_steps: 2,
        progress:
          50 + Math.min(40, getProgressFromStatus(step2Result.status) * 0.4),
        estimated_time: getEstimatedTime(
          step2Result.status,
          step2Result.created_at,
          step2Result.started_at
        ),
      });
    }

    // Handle unknown states
    console.log(`🤔 MULTI-STEP: Unknown session state: ${session.status}`);
    return NextResponse.json({
      id: sessionId,
      status: "processing",
      step: 1,
      total_steps: 2,
      progress: 0,
      estimated_time: 30,
    });
  } catch (error) {
    console.error("Multi-step status error:", error);
    const errorSession: GenerationSession = {
      ...session,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    generationSessions.set(sessionId, errorSession);

    return NextResponse.json({
      id: sessionId,
      status: "failed",
      error: errorSession.error,
      progress: 0,
      step: session.step2_prediction_id ? 2 : 1,
      total_steps: 2,
    });
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
  _created_at?: string,
  started_at?: string
): number {
  if (status === "succeeded" || status === "failed" || status === "canceled") {
    return 0;
  }

  if (started_at) {
    const startTime = new Date(started_at).getTime();
    const elapsed = Date.now() - startTime;
    const estimatedTotal = 25000; // 25 seconds
    const remaining = Math.max(0, estimatedTotal - elapsed);
    return Math.ceil(remaining / 1000);
  }

  switch (status) {
    case "starting":
      return 25;
    case "processing":
      return 15;
    default:
      return 20;
  }
}
