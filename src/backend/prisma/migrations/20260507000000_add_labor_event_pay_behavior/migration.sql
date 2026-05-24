-- CreateEnum (idempotent — type may already exist from prior db push)
DO $$ BEGIN
  CREATE TYPE "verdepradera"."LaborEventPayBehavior" AS ENUM ('FULL_PAY', 'PARTIAL_PAY', 'NO_PAY', 'EXTERNAL_PAY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable vpg_labor_events (idempotent)
ALTER TABLE "verdepradera"."vpg_labor_events" ADD COLUMN IF NOT EXISTS "labor_event_pay_behavior" "verdepradera"."LaborEventPayBehavior" NOT NULL DEFAULT 'NO_PAY';
ALTER TABLE "verdepradera"."vpg_labor_events" ADD COLUMN IF NOT EXISTS "labor_event_max_paid_days" INTEGER;
ALTER TABLE "verdepradera"."vpg_labor_events" ADD COLUMN IF NOT EXISTS "labor_event_pay_percentage" DECIMAL(5,2);
