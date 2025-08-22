import { NextRequest, NextResponse } from 'next/server';

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Handle mock predictions for development
    if (id.startsWith('mock_')) {
      return handleMockStatus(id);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }

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
  created_at?: string, 
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