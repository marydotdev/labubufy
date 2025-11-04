# Changes Required for New Schema Only

## Summary of Your New Schema

- **`users` table**: Contains `id`, `auth_user_id`, `email`, `is_anonymous`, `credits`, `total_purchased`, `total_spent`
- **`credit_events` table**: Transaction history with `user_id` (auth_user_id)
- **No `user_credits` table**: Credits are stored directly in `users` table
- **`add_credits` function**: Takes `auth_id` parameter (which is `auth_user_id`)

## ✅ Files Already Updated

1. **`app/api/payments/success/route.ts`** ✅
   - Uses `add_credits` function with `auth_id`
   - Gets `auth_user_id` from `users` table using `users.id`

2. **`app/api/credits/spend/route.ts`** ✅
   - Updates `users.credits` directly
   - Uses `users.auth_user_id` to find user
   - Records events in `credit_events` table

3. **`app/api/credits/refund/route.ts`** ✅
   - Updates `users.credits` directly
   - Uses `users.auth_user_id` to find user
   - Records events in `credit_events` table

4. **`lib/auth/index.ts`** ✅
   - Updated `User` interface to include `total_purchased` and `total_spent`
   - Maps `auth_user_id` to `auth_id` in return value
   - Uses `auth_user_id` in queries

5. **`app/api/users/initialize/route.ts`** ✅
   - Returns `auth_user_id` as `auth_id` in response

## ⚠️ Files That May Need Updates (Still Using Old Schema References)

These files may still reference the old schema but won't break immediately:

1. **`components/save-account-modal.tsx`** - May reference old user structure
2. **`lib/auth-service.ts`** - Old file, can be removed after migration
3. **`lib/user-service.ts`** - Old file, can be removed after migration
4. **`app/api/credits/webhook/route.ts`** - Still references old schema, but webhooks aren't used in new flow

## 🔍 Key Changes Made

### Payment Success Handler
- **Before**: Tried multiple strategies with old/new schema
- **After**: Uses `add_credits` function with `auth_id` (auth_user_id)

### Spend/Refund Routes
- **Before**: Queried `user_credits` table with `balance`, `lifetime_spent`
- **After**: Updates `users.credits` and `users.total_spent` directly

### Auth Service
- **Before**: Returned `auth_id` directly
- **After**: Maps `auth_user_id` from database to `auth_id` in interface

## 📝 Testing Checklist

After these changes, test:

1. ✅ User initialization (creates user with 3 credits)
2. ✅ Credit purchase (adds credits via `add_credits` function)
3. ✅ Credit spending (deducts from `users.credits`)
4. ✅ Credit refund (adds back to `users.credits`)
5. ✅ Credit events are recorded in `credit_events` table

## 🗑️ Tables You Can Remove (After Migration)

Once everything is working with the new schema:
- `user_credits` table (if it still exists)
- `credit_transactions` table (if it still exists, replaced by `credit_events`)

## 📌 Important Notes

1. **`userId` in Stripe metadata**: This is `users.id` (the primary key), not `auth_user_id`
2. **`add_credits` function**: Expects `auth_id` which maps to `users.auth_user_id`
3. **Credit events**: Use `user_id` which is `auth_user_id` (not `users.id`)
4. **All queries**: Use `auth_user_id` to find users, not `id`

