# Schema Migration Guide - New Schema Only

## Your New Schema Summary

Based on your migration, you have:
- **`users`** table: Contains `id`, `auth_user_id`, `email`, `is_anonymous`, `credits`, `total_purchased`, `total_spent`
- **`credit_events`** table: Transaction history
- **`add_credits`** function: Takes `auth_id` (not `user_id`) and updates `users.credits` directly
- **`ensure_user_exists`** function: Returns `auth_user_id` (not `auth_id`) in the JSON

## Key Differences from Old Schema

1. **No separate `user_credits` table** - Credits are in `users` table
2. **Field names**: `credits`, `total_purchased`, `total_spent` (not `balance`, `lifetime_purchased`, `lifetime_spent`)
3. **Function parameters**: `add_credits` takes `auth_id`, not `user_id`
4. **User ID**: Use `users.id` or `users.auth_user_id` depending on context

## Files That Need Updates

1. ✅ `app/api/payments/success/route.ts` - Update to use new schema
2. ✅ `app/api/credits/spend/route.ts` - Update to use `users.credits`
3. ✅ `app/api/credits/refund/route.ts` - Update to use `users.credits`
4. ✅ `lib/auth/index.ts` - Update return type to match new schema
5. ✅ `app/api/users/initialize/route.ts` - Already correct, but verify
6. ✅ `components/user-credits.tsx` - May need updates if using old user structure

## Migration Checklist

- [ ] Update payment success handler
- [ ] Update spend credits route
- [ ] Update refund credits route
- [ ] Update auth service return types
- [ ] Remove references to `user_credits` table
- [ ] Remove references to `balance` and `lifetime_purchased`
- [ ] Test all flows

