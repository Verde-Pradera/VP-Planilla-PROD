-- Aguinaldo fiscal period configuration (Ley N° 2412 CR)
-- Default: Dec 1 – Nov 30, payment deadline Dec 20
ALTER TABLE "verdepradera"."vpg_enterprise"
  ADD COLUMN IF NOT EXISTS "enterprise_aguinaldo_period_start_month"   INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "enterprise_aguinaldo_period_start_day"     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "enterprise_aguinaldo_payment_deadline_day" INTEGER NOT NULL DEFAULT 20;
