import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil',
    })
  : null

export interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number // in cents
  popular?: boolean
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'credits_1000',
    name: '1,000 Credits',
    credits: 1000,
    price: 999, // $9.99
  },
  {
    id: 'credits_2500',
    name: '2,500 Credits',
    credits: 2500,
    price: 1999, // $19.99
    popular: true,
  },
  {
    id: 'credits_5000',
    name: '5,000 Credits',
    credits: 5000,
    price: 3499, // $34.99
  },
  {
    id: 'credits_10000',
    name: '10,000 Credits',
    credits: 10000,
    price: 5999, // $59.99
  },
]

export class StripeService {
  static async createCheckoutSession(
    userId: string,
    packageId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    try {
      if (!stripe) {
        throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.')
      }

      const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId)
      if (!creditPackage) {
        throw new Error('Invalid credit package')
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: creditPackage.name,
                description: `${creditPackage.credits.toLocaleString()} credits for Labubufy image generation`,
                images: ['https://your-domain.com/labubu-icon.png'], // Optional: add your logo
              },
              unit_amount: creditPackage.price,
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          packageId,
          credits: creditPackage.credits.toString(),
        },
      })

      return { success: true, sessionId: session.id, url: session.url }
    } catch (error) {
      console.error('Stripe checkout session creation error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create checkout session' 
      }
    }
  }

  static async constructWebhookEvent(body: string, signature: string) {
    try {
      if (!stripe) {
        throw new Error('Stripe is not configured')
      }
      
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
      return { success: true, event }
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook verification failed' 
      }
    }
  }

  static async retrieveCheckoutSession(sessionId: string) {
    try {
      if (!stripe) {
        throw new Error('Stripe is not configured')
      }
      
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      return { success: true, session }
    } catch (error) {
      console.error('Failed to retrieve checkout session:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to retrieve session' 
      }
    }
  }
}

export { stripe }