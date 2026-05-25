-- AlterTable: add missing columns to vpg_positions
ALTER TABLE "vpg_positions"
  ADD COLUMN IF NOT EXISTS "position_occupation_code" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "position_risk_class" VARCHAR(10);
