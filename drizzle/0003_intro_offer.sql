-- Lifetime first-month introductory offer (50% off first invoice once per user).
-- Apply with `npm run db:push` or run this SQL manually.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS intro_offer_used_at timestamptz;
