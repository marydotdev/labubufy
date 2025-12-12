// app/api/credits/purchase/route.ts
// Updated to use new StripeService with subscription support
import { NextRequest, NextResponse } from "next/server";
import { stripeService, PRICING } from "@/lib/payments/stripe-service";

interface PurchaseRequest {
  userId: string;
  packageId: string;
  type?: 'credits' | 'subscription';
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, packageId, type = 'credits' }: PurchaseRequest = body;

    // Validation
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!packageId) {
      return NextResponse.json({ error: "Missing packageId" }, { status: 400 });
    }

    // Validate product exists
    if (type === 'credits') {
      const product = PRICING.credits.find(p => p.id === packageId);
      if (!product) {
        return NextResponse.json({ error: "Invalid credit package" }, { status: 400 });
      }
    } else {
      const product = Object.values(PRICING.subscriptions).find(p => p.id === packageId);
      if (!product) {
        return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
      }
      if (!product.price_id) {
        return NextResponse.json({
          error: `Subscription price ID not configured for ${packageId}`
        }, { status: 400 });
      }
    }

    // Create checkout session
    const url = await stripeService.createCheckoutSession(
      userId,
      packageId,
      type
    );

    return NextResponse.json({
      success: true,
      url,
    });
  } catch (error) {
    console.error("Credit purchase error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error
          ? error.message
          : "Failed to create checkout session"
      },
      { status: 500 }
    );
  }
}
