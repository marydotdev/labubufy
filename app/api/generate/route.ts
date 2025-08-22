import { NextRequest, NextResponse } from 'next/server';
import { retryHandler } from '@/lib/errors';
import { getLabubuImageUrl, getLabubuName } from '@/lib/config';
import { generationSessions } from '@/lib/session-store';

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
        { error: 'Missing required fields: image and labubu_id' },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      // For development, return a mock response
      return NextResponse.json({
        success: true,
        prediction_id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        status: 'starting',
        mock: true,
        labubu_id,
      });
    }

    // Get Labubu reference image URL
    const labubuImageUrl = getLabubuImageUrl(labubu_id);

    // STEP 1: Merge user image with Labubu image using tool-merge-images
    const step1Result = await retryHandler.withRetry(async () => {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: process.env.TOOL_MERGE_IMAGES_VERSION || 'zsxkib/tool-merge-images:d933c8352ca7270ddf7c9c816e1c872f6114675ce43c8d70c924a3347bbeef05',
          input: {
            images: [image, labubuImageUrl],
            orientation: 'horizontal',
            resize_strategy: 'reduce_larger',
            alignment: 'center',
            border_thickness: 0,
            border_color: '#ffffff',
            keep_aspect_ratio: true,
            output_format: 'webp',
            output_quality: 90
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Step 1 - Image merge error: ${response.status} - ${errorText}`);
      }

      return response.json();
    }, 3);

    const step1ReplicateResult = step1Result as ReplicateResponse;

    // Store the session information for status tracking
    const sessionId = step1ReplicateResult.id;
    generationSessions.set(sessionId, {
      step1_prediction_id: step1ReplicateResult.id,
      labubu_id,
      user_image: image,
      labubu_name: getLabubuName(labubu_id),
      status: 'step1_processing',
      created_at: Date.now()
    });
    
    return NextResponse.json({
      success: true,
      prediction_id: sessionId,
      status: 'step1_processing',
      step: 1,
      total_steps: 2,
      labubu_id,
    });

  } catch (error) {
    console.error('Generation error:', error);
    
    // Return different error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        return NextResponse.json(
          { error: 'Invalid API credentials' },
          { status: 401 }
        );
      }
      if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Network error. Please check your connection.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    );
  }
}


