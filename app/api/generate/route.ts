import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image, labubu_id } = await request.json();

    if (!image || !labubu_id) {
      return NextResponse.json(
        { error: 'Missing required fields: image and labubu_id' },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }

    // Stage 1: Image merge using tool-merge-images
    const mergeResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: process.env.MERGE_MODEL_VERSION || 'zsxkib/tool-merge-images',
        input: {
          image_1: image,
          image_2: getLabubuImage(labubu_id),
          // Additional merge parameters as needed
        },
      }),
    });

    if (!mergeResponse.ok) {
      throw new Error(`Merge API error: ${mergeResponse.statusText}`);
    }

    const mergeResult = await mergeResponse.json();

    // Stage 2: Refinement using Qwen image edit
    const refineResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: process.env.QWEN_MODEL_VERSION || 'qwen/qwen-image-edit',
        input: {
          image: mergeResult.output,
          prompt: 'Make this image look natural and realistic, ensuring the person is naturally holding the Labubu doll',
          // Additional refinement parameters
        },
      }),
    });

    if (!refineResponse.ok) {
      throw new Error(`Refinement API error: ${refineResponse.statusText}`);
    }

    const refineResult = await refineResponse.json();

    return NextResponse.json({
      success: true,
      prediction_id: refineResult.id,
      status: refineResult.status,
      output: refineResult.output,
    });

  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}

// Helper function to get Labubu image URL by ID
function getLabubuImage(labubu_id: number): string {
  const labubuImages: Record<number, string> = {
    1: '/labubu-images/pink-labubu.png',
    2: '/labubu-images/blue-labubu.png',
    3: '/labubu-images/yellow-labubu.png',
    4: '/labubu-images/purple-labubu.png',
    5: '/labubu-images/green-labubu.png',
    6: '/labubu-images/orange-labubu.png',
  };

  return labubuImages[labubu_id] || labubuImages[1];
}