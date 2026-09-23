-- Premium plan, daily AI usage, and webhook idempotency.
-- Apply with the project's schema push (`npm run db:push`) or run this SQL
-- against the existing database. It does not rewrite users, Stripe ids, or
-- learning data.
--
-- Existing rows stay on subscription_plan = 'pro' or 'free'. The new enum
-- value is additive. Active subscriptions whose price is not the Premium
-- price continue to sync as Pro.

ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'premium';

CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  usage_date date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_usage_count_nonnegative CHECK (count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_user_feature_date_unique
  ON ai_usage (user_id, feature, usage_date);

CREATE TABLE IF NOT EXISTS ai_usage_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  usage_date date NOT NULL,
  subject_id text,
  status text NOT NULL DEFAULT 'reserved',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_reservations_user_feature_date_idx
  ON ai_usage_reservations (user_id, feature, usage_date);

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_reservations_subject_unique
  ON ai_usage_reservations (user_id, feature, usage_date, subject_id)
  WHERE subject_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
