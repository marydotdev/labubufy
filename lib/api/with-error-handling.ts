// lib/api/with-error-handling.ts
// Error handling wrapper for API routes
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors
          },
          { status: 400 }
        );
      }

      if (error instanceof Error) {
        // Don't expose internal error messages in production
        const isDevelopment = process.env.NODE_ENV === 'development';
        return NextResponse.json(
          {
            error: isDevelopment ? error.message : 'Internal server error'
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

