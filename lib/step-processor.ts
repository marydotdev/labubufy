// Fixed lib/step-processor.ts with better Step 2 prompt
import { retryHandler } from "./errors";
import { generationSessions, type GenerationSession } from "./session-store";
import { LABUBU_OPTIONS } from "./config";

interface ReplicateStatus {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
}

class StepProcessor {
  private processingIntervals = new Map<string, NodeJS.Timeout>();
  private processingStates = new Map<
    string,
    { lastChecked: number; attempts: number }
  >();

  /**
   * Start automatic processing for a session
   */
  startProcessing(sessionId: string): void {
    console.log(`Starting processing for session: ${sessionId}`);

    // Clear any existing processing for this session
    this.stopProcessing(sessionId);

    // Initialize processing state
    this.processingStates.set(sessionId, {
      lastChecked: Date.now(),
      attempts: 0,
    });

    const processSteps = async () => {
      try {
        const session = generationSessions.get(sessionId);
        if (!session) {
          console.log(`Session ${sessionId} not found, stopping processing`);
          this.stopProcessing(sessionId);
          return;
        }

        const processingState = this.processingStates.get(sessionId);
        if (processingState) {
          processingState.attempts++;

          // Prevent infinite processing - stop after 40 attempts (2 minutes)
          if (processingState.attempts > 40) {
            console.error(`Processing timeout for session ${sessionId}`);
            const timeoutSession: GenerationSession = {
              ...session,
              status: "failed",
              error: "Processing timeout - please try again",
            };
            generationSessions.set(sessionId, timeoutSession);
            this.stopProcessing(sessionId);
            return;
          }
        }

        console.log(
          `Processing step for session ${sessionId}, status: ${session.status}, attempt: ${processingState?.attempts}`
        );

        if (session.status === "step1_processing") {
          await this.checkAndProgressStep1(sessionId, session);
        } else if (session.status === "step2_processing") {
          await this.checkAndProgressStep2(sessionId, session);
        } else if (
          session.status === "completed" ||
          session.status === "failed"
        ) {
          console.log(
            `Processing complete for session ${sessionId}: ${session.status}`
          );
          this.stopProcessing(sessionId);
          return;
        }

        // Continue processing if not complete
        const interval = setTimeout(processSteps, 3000); // Check every 3 seconds
        this.processingIntervals.set(sessionId, interval);
      } catch (error) {
        console.error(`Step processing error for session ${sessionId}:`, error);

        // Mark session as failed and stop processing
        const session = generationSessions.get(sessionId);
        if (session) {
          const failedSession: GenerationSession = {
            ...session,
            status: "failed",
            error:
              error instanceof Error
                ? error.message
                : "Unknown processing error",
          };
          generationSessions.set(sessionId, failedSession);
        }

        this.stopProcessing(sessionId);
      }
    };

    // Start processing immediately
    processSteps();
  }

  /**
   * Stop processing for a session
   */
  stopProcessing(sessionId: string): void {
    const interval = this.processingIntervals.get(sessionId);
    if (interval) {
      clearTimeout(interval);
      this.processingIntervals.delete(sessionId);
    }
    this.processingStates.delete(sessionId);
    console.log(`Stopped processing for session: ${sessionId}`);
  }

  /**
   * Stop all processing
   */
  stopAllProcessing(): void {
    console.log("Stopping all processing");
    this.processingIntervals.forEach((interval) => clearTimeout(interval));
    this.processingIntervals.clear();
    this.processingStates.clear();
  }

  /**
   * Check Step 1 status and progress to Step 2 if ready
   */
  private async checkAndProgressStep1(
    sessionId: string,
    session: GenerationSession
  ): Promise<void> {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("Replicate API token not configured");
    }

    console.log(`Checking Step 1 for session ${sessionId}`);

    // Check Step 1 status
    const step1Response = await retryHandler.withRetry(
      async () => {
        const response = await fetch(
          `https://api.replicate.com/v1/predictions/${session.step1_prediction_id}`,
          {
            headers: {
              Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Step 1 status check failed: ${response.status}`);
        }

        return response.json();
      },
      2,
      1000
    );

    const step1Result: ReplicateStatus = step1Response;
    console.log(
      `Step 1 result for ${sessionId}:`,
      step1Result.status,
      step1Result.output ? "with output" : "no output"
    );

    if (step1Result.status === "succeeded" && step1Result.output) {
      // Step 1 completed, start Step 2
      const mergedImageUrl = Array.isArray(step1Result.output)
        ? step1Result.output[0]
        : step1Result.output;

      // Validate the merged image URL
      if (
        !mergedImageUrl ||
        (typeof mergedImageUrl === "string" && mergedImageUrl.trim() === "")
      ) {
        throw new Error("Step 1 completed but produced no merged image");
      }

      console.log(
        `Step 1 completed for ${sessionId}, starting Step 2 with image: ${mergedImageUrl.substring(
          0,
          50
        )}...`
      );

      // Determine if it's a doll or keychain for the prompt
      const selectedLabubu = LABUBU_OPTIONS.find(l => l.id === session.labubu_id);
      const itemType = selectedLabubu?.type === 'keychain' ? 'keychain' : 'doll';
      const prompt = `have the person on the left hold the ${itemType} on the right`;
      
      console.log(`Step 2 for ${sessionId}: Using ${itemType} prompt for Labubu ID ${session.labubu_id}: "${prompt}"`);

      // Start Step 2: Qwen image edit with improved prompt
      const step2Response = await retryHandler.withRetry(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const response = await fetch(
            "https://api.replicate.com/v1/predictions",
            {
              method: "POST",
              headers: {
                Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                version:
                  process.env.QWEN_IMAGE_EDIT_VERSION || "qwen/qwen-image-edit",
                input: {
                  image: mergedImageUrl,
                  prompt: prompt,
                },
              }),
              signal: controller.signal,
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => "Unknown error");
            throw new Error(
              `Step 2 - Qwen edit error: ${response.status} - ${errorText}`
            );
          }

          const result = await response.json();

          if (!result.id) {
            throw new Error("Step 2 - Invalid response: missing prediction ID");
          }

          return result;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }, 3);

      const step2Result = step2Response as ReplicateStatus;
      console.log(
        `Step 2 started for ${sessionId} with prediction ID: ${step2Result.id}`
      );

      // Update session to Step 2 processing
      const updatedSession: GenerationSession = {
        ...session,
        step1_output: mergedImageUrl,
        step2_prediction_id: step2Result.id,
        status: "step2_processing",
      };
      generationSessions.set(sessionId, updatedSession);
      console.log(`Session ${sessionId} updated to step2_processing`);
    } else if (step1Result.status === "failed") {
      console.error(`Step 1 failed for ${sessionId}:`, step1Result.error);
      // Step 1 failed
      const failedSession: GenerationSession = {
        ...session,
        status: "failed",
        error: step1Result.error || "Step 1 failed",
      };
      generationSessions.set(sessionId, failedSession);
    }
    // If still processing, continue polling
  }

  /**
   * Check Step 2 status and complete if ready
   */
  private async checkAndProgressStep2(
    sessionId: string,
    session: GenerationSession
  ): Promise<void> {
    if (!process.env.REPLICATE_API_TOKEN || !session.step2_prediction_id) {
      throw new Error("Missing configuration for Step 2");
    }

    console.log(`Checking Step 2 for session ${sessionId}`);

    // Check Step 2 status
    const step2Response = await retryHandler.withRetry(
      async () => {
        const response = await fetch(
          `https://api.replicate.com/v1/predictions/${session.step2_prediction_id}`,
          {
            headers: {
              Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Step 2 status check failed: ${response.status}`);
        }

        return response.json();
      },
      2,
      1000
    );

    const step2Result: ReplicateStatus = step2Response;
    console.log(
      `Step 2 result for ${sessionId}:`,
      step2Result.status,
      step2Result.output ? "with output" : "no output"
    );

    if (step2Result.status === "succeeded" && step2Result.output) {
      const finalOutput = Array.isArray(step2Result.output)
        ? step2Result.output[0]
        : step2Result.output;

      // Validate the final output
      if (
        !finalOutput ||
        (typeof finalOutput === "string" && finalOutput.trim() === "")
      ) {
        throw new Error("Step 2 completed but produced empty output");
      }

      console.log(
        `Step 2 completed for ${sessionId}, final output: ${finalOutput.substring(
          0,
          50
        )}...`
      );

      // Update session to completed
      const completedSession: GenerationSession = {
        ...session,
        final_output: finalOutput,
        status: "completed",
      };
      generationSessions.set(sessionId, completedSession);
      console.log(`Session ${sessionId} marked as completed`);
    } else if (step2Result.status === "failed") {
      console.error(`Step 2 failed for ${sessionId}:`, step2Result.error);
      // Step 2 failed
      const failedSession: GenerationSession = {
        ...session,
        status: "failed",
        error: step2Result.error || "Step 2 failed",
      };
      generationSessions.set(sessionId, failedSession);
    }
    // If still processing, continue polling
  }
}

// Singleton instance
export const stepProcessor = new StepProcessor();

// Cleanup on process termination
if (typeof process !== "undefined") {
  process.on("SIGTERM", () => {
    stepProcessor.stopAllProcessing();
  });
  process.on("SIGINT", () => {
    stepProcessor.stopAllProcessing();
  });
}
