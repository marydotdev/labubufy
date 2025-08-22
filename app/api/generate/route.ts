import { NextRequest, NextResponse } from 'next/server';
import { retryHandler } from '@/lib/errors';

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
        prediction_id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'starting',
        mock: true,
        labubu_id,
      });
    }

    // Get Labubu reference image (for future use in two-stage generation)
    // const labubuImageUrl = getLabubuImage(labubu_id);

    // Use retry handler for API calls
    const result = await retryHandler.withRetry(async () => {
      // For now, we'll use a single model approach
      // In production, you might want to use a two-stage approach as originally planned
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Using a generic image editing model - replace with actual model version
          version: process.env.IMAGE_GENERATION_MODEL || 'stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478',
          input: {
            image: image,
            prompt: `A person naturally holding a cute ${getLabubuName(labubu_id)} Labubu doll, photorealistic, natural lighting, casual pose`,
            negative_prompt: 'blurry, low quality, distorted, unnatural pose, fake looking',
            num_inference_steps: 20,
            guidance_scale: 7.5,
            strength: 0.7,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    }, 3);

    const replicateResult = result as ReplicateResponse;

    return NextResponse.json({
      success: true,
      prediction_id: replicateResult.id,
      status: replicateResult.status,
      output: replicateResult.output,
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


// Helper function to get Labubu name by ID
function getLabubuName(labubu_id: number): string {
  const labubuNames: Record<number, string> = {
    1: 'pink',
    2: 'blue',
    3: 'yellow',
    4: 'purple',
    5: 'green',
    6: 'orange',
  };

  return labubuNames[labubu_id] || 'pink';
}
