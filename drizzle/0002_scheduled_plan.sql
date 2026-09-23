-- Scheduled paid-plan downgrades (e.g. Premium → Pro at period end).
-- Effective entitlements stay on subscription_plan until Stripe applies the
-- new price. Apply with `npm run db:push` or run this SQL manually.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS scheduled_subscription_plan subscription_plan,
  ADD COLUMN IF NOT EXISTS stripe_schedule_id text;
