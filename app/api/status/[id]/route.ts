import { NextRequest, NextResponse } from 'next/server';
import { retryHandler } from '@/lib/errors';
import { generationSessions, type GenerationSession } from '@/lib/session-store';

interface ReplicateStatus {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
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

    // Handle mock predictions for development
    if (id.startsWith('mock_')) {
      return handleMockStatus(id);
    }

    // Check if this is a multi-step generation session
    const session = generationSessions.get(id);
    if (session) {
      return handleMultiStepStatus(id, session);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }

    // Handle single-step predictions (legacy or direct API calls)
    const response = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Prediction not found' },
          { status: 404 }
        );
      }
      throw new Error(`Status API error: ${response.status} ${response.statusText}`);
    }

    const result: ReplicateStatus = await response.json();

    // Normalize the response
    const normalizedResponse = {
      id: result.id,
      status: result.status,
      output: result.output,
      error: result.error,
      logs: result.logs,
      progress: getProgressFromStatus(result.status),
      estimated_time: getEstimatedTime(result.status, result.created_at, result.started_at),
    };

    return NextResponse.json(normalizedResponse);

  } catch (error) {
    console.error('Status check error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Invalid API credentials' },
          { status: 401 }
        );
      }
      if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}

// Handle multi-step generation status
async function handleMultiStepStatus(sessionId: string, session: GenerationSession): Promise<NextResponse> {
  try {
    if (session.status === 'step1_processing') {
      // Check step 1 status
      const step1Response = await fetch(`https://api.replicate.com/v1/predictions/${session.step1_prediction_id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!step1Response.ok) {
        throw new Error(`Step 1 status check failed: ${step1Response.status}`);
      }

      const step1Result: ReplicateStatus = await step1Response.json();

      if (step1Result.status === 'succeeded' && step1Result.output) {
        // Step 1 completed, start step 2
        const mergedImageUrl = Array.isArray(step1Result.output) ? step1Result.output[0] : step1Result.output;
        
        // Start step 2: Qwen image edit
        const step2Response = await retryHandler.withRetry(async () => {
          const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              version: process.env.QWEN_IMAGE_EDIT_VERSION || 'qwen/qwen-image-edit',
              input: {
                image: mergedImageUrl,
                prompt: "have the woman on the left hold the doll on the right",
                // Add additional parameters as needed for qwen-image-edit
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Step 2 - Qwen edit error: ${response.status} - ${errorText}`);
          }

          return response.json();
        }, 3);

        const step2Result = step2Response as ReplicateStatus;
        
        // Update session
        const updatedSession: GenerationSession = {
          ...session,
          step1_output: mergedImageUrl,
          step2_prediction_id: step2Result.id,
          status: 'step2_processing'
        };
        generationSessions.set(sessionId, updatedSession);

        return NextResponse.json({
          id: sessionId,
          status: 'step2_processing',
          step: 2,
          total_steps: 2,
          progress: 60,
          estimated_time: 15,
          step1_output: mergedImageUrl,
        });

      } else if (step1Result.status === 'failed') {
        const failedSession: GenerationSession = {
          ...session,
          status: 'failed',
          error: step1Result.error || 'Step 1 failed'
        };
        generationSessions.set(sessionId, failedSession);
        session = failedSession;

        return NextResponse.json({
          id: sessionId,
          status: 'failed',
          error: session.error,
          progress: 0,
        });

      } else {
        // Step 1 still processing
        return NextResponse.json({
          id: sessionId,
          status: 'step1_processing',
          step: 1,
          total_steps: 2,
          progress: Math.min(40, getProgressFromStatus(step1Result.status)),
          estimated_time: getEstimatedTime(step1Result.status, step1Result.created_at, step1Result.started_at) + 15,
        });
      }

    } else if (session.status === 'step2_processing') {
      // Check step 2 status
      const step2Response = await fetch(`https://api.replicate.com/v1/predictions/${session.step2_prediction_id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!step2Response.ok) {
        throw new Error(`Step 2 status check failed: ${step2Response.status}`);
      }

      const step2Result: ReplicateStatus = await step2Response.json();

      if (step2Result.status === 'succeeded' && step2Result.output) {
        const finalOutput = Array.isArray(step2Result.output) ? step2Result.output[0] : step2Result.output;
        
        // Update session
        const completedSession: GenerationSession = {
          ...session,
          final_output: finalOutput,
          status: 'completed'
        };
        generationSessions.set(sessionId, completedSession);
        session = completedSession;

        return NextResponse.json({
          id: sessionId,
          status: 'succeeded',
          output: [finalOutput],
          progress: 100,
          estimated_time: 0,
          step: 2,
          total_steps: 2,
        });

      } else if (step2Result.status === 'failed') {
        const failedSession: GenerationSession = {
          ...session,
          status: 'failed',
          error: step2Result.error || 'Step 2 failed'
        };
        generationSessions.set(sessionId, failedSession);
        session = failedSession;

        return NextResponse.json({
          id: sessionId,
          status: 'failed',
          error: session.error,
          progress: 0,
        });

      } else {
        // Step 2 still processing
        return NextResponse.json({
          id: sessionId,
          status: 'processing',
          step: 2,
          total_steps: 2,
          progress: Math.min(90, 60 + getProgressFromStatus(step2Result.status) / 2),
          estimated_time: getEstimatedTime(step2Result.status, step2Result.created_at, step2Result.started_at),
        });
      }
    }

    // Session already completed
    return NextResponse.json({
      id: sessionId,
      status: session.status === 'completed' ? 'succeeded' : session.status,
      output: session.final_output ? [session.final_output] : undefined,
      error: session.error,
      progress: session.status === 'completed' ? 100 : 0,
      estimated_time: 0,
    });

  } catch (error) {
    console.error('Multi-step status error:', error);
    const errorSession: GenerationSession = {
      ...session,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    generationSessions.set(sessionId, errorSession);
    session = errorSession;

    return NextResponse.json({
      id: sessionId,
      status: 'failed',
      error: session.error,
      progress: 0,
    });
  }
}


// Handle mock status for development/testing
function handleMockStatus(id: string): NextResponse {
  const createdTime = parseInt(id.split('_')[1] || '0');
  const elapsedTime = Date.now() - createdTime;
  
  // Simulate different statuses based on elapsed time
  if (elapsedTime < 2000) {
    return NextResponse.json({
      id,
      status: 'starting',
      progress: 10,
      estimated_time: 25,
    });
  } else if (elapsedTime < 5000) {
    return NextResponse.json({
      id,
      status: 'processing',
      progress: Math.min(90, 30 + (elapsedTime - 2000) / 50),
      estimated_time: Math.max(5, 25 - (elapsedTime / 1000)),
    });
  } else {
    // Mock successful completion with a generated image URL
    return NextResponse.json({
      id,
      status: 'succeeded',
      output: ['/magical-labubu-photo.png'], // Mock output URL
      progress: 100,
      estimated_time: 0,
    });
  }
}

// Calculate progress percentage from status
function getProgressFromStatus(status: string): number {
  switch (status) {
    case 'starting':
      return 10;
    case 'processing':
      return 50; // This could be more sophisticated with actual progress data
    case 'succeeded':
      return 100;
    case 'failed':
    case 'canceled':
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
  if (status === 'succeeded' || status === 'failed' || status === 'canceled') {
    return 0;
  }

  // If we have timing data, use it for better estimates
  if (started_at) {
    const startTime = new Date(started_at).getTime();
    const elapsed = Date.now() - startTime;
    
    // Typical AI generation takes 10-30 seconds
    const estimatedTotal = 25000; // 25 seconds
    const remaining = Math.max(0, estimatedTotal - elapsed);
    
    return Math.ceil(remaining / 1000);
  }

  // Default estimates based on status
  switch (status) {
    case 'starting':
      return 25;
    case 'processing':
      return 15;
    default:
      return 20;
  }
}