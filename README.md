# Labubufy

AI-powered photo generation app that creates realistic photos of people holding Labubu dolls using Nano Banana Pro.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Stripe account (for payments)
- Replicate API account (for AI image generation)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd labubufy
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (see [Environment Variables](#environment-variables) below)

4. **Configure Supabase Auth Settings:**

   - Go to your Supabase project → Authentication → Settings
   - **Disable "Enable email confirmations"** for development (or users will need to confirm email before signing in)
   - Alternatively, set up email templates if you want to keep confirmations enabled

5. Run database migrations:

   - Apply `migrations/001_simplified_auth.sql` to create the users and credit_events tables
   - Apply `migrations/002_add_credits_function.sql` to create the add_credits function

6. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🔧 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key

# Replicate
REPLICATE_API_TOKEN=your_replicate_api_token

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional

```env
# Stripe Webhook (for backward compatibility)
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Stripe Subscription Products (if using subscriptions)
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx

# Cloudflare R2 (for image storage - currently using IndexedDB)
R2_ENDPOINT=your_r2_endpoint
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_CDN_URL=your_cdn_url
```

## 📁 Project Structure

```
labubufy/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── credits/       # Credit management endpoints
│   │   ├── generate/      # Image generation endpoint
│   │   ├── payments/      # Payment handling
│   │   └── users/         # User management
│   ├── auth/              # Auth callbacks
│   └── page.tsx           # Main app page
├── components/            # React components
│   ├── auth/              # Authentication components
│   └── ui/                # UI components
├── lib/                   # Library code
│   ├── auth/              # Auth service (new)
│   ├── payments/          # Stripe service
│   ├── stores/             # Zustand stores
│   └── storage/           # Storage services
├── migrations/            # Database migrations
└── public/                 # Static assets
```

## 🏗️ Architecture

### State Management

- **Zustand**: Centralized state management with `useUserStore`
- **Session Storage**: Persists user state across page reloads

### Authentication

- **Supabase Auth**: Handles anonymous, email, and OAuth (Google/Apple) authentication
- **AuthService**: Singleton service managing auth state and user records

### Payments

- **Stripe**: Payment processing for credit purchases
- **Session Verification**: New payment flow uses session verification instead of webhooks
- **Webhook Support**: Backward compatibility webhook handler (uses new schema)

### Database Schema

#### `users` table

- `id` (UUID, primary key)
- `auth_user_id` (UUID, unique, references auth.users)
- `email` (TEXT, nullable)
- `is_anonymous` (BOOLEAN, default true)
- `credits` (INTEGER, default 3)
- `total_purchased` (INTEGER, default 0)
- `total_spent` (INTEGER, default 0)

#### `credit_events` table

- `id` (UUID, primary key)
- `user_id` (UUID, references users.auth_user_id)
- `type` (TEXT) - 'welcome', 'purchase', 'spend', 'refund'
- `amount` (INTEGER)
- `description` (TEXT, nullable)
- `metadata` (JSONB)
- `created_at` (TIMESTAMPTZ)

### Database Functions

- `ensure_user_exists(auth_id, email, is_anonymous)`: Creates or updates user record
- `add_credits(auth_id, amount, transaction_type, description, metadata)`: Adds credits and records event

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set all required environment variables in your deployment platform:

- Supabase credentials
- Stripe keys
- Replicate API token
- `NEXT_PUBLIC_APP_URL` (your production URL)

## 🧪 Testing

The app includes test photo functionality for development. Test photos are located in `/public/test-photos/`.

## 📝 Features

- ✅ Anonymous user creation with 3 free credits
- ✅ Email authentication (sign up/sign in)
- ✅ OAuth authentication (Google/Apple)
- ✅ Credit purchase via Stripe
- ✅ AI image generation using Nano Banana Pro
- ✅ Image history (stored in IndexedDB)
- ✅ Smart auth prompts for anonymous users
- ✅ Credit refunds for failed generations

## 🔮 Future Enhancements

- [ ] Migrate image storage from IndexedDB to Cloudflare R2
- [ ] Subscription support (monthly plans)
- [ ] Image sharing via CDN URLs
- [ ] User dashboard with generation history

## 📚 Documentation

- `IMPLEMENTATION_STATUS.md` - Current implementation status
- `PRD.md` - Product requirements document
- `NEW_SCHEMA_CHANGES.md` - Schema migration details

## 🤝 Contributing

This is a private project. For questions or issues, please contact the maintainer.

## 📄 License

Private - All rights reserved
