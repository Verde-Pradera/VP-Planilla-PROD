-- AlterTable (idempotent — columns may already exist from prior db push)
ALTER TABLE "vpg_employees" ADD COLUMN IF NOT EXISTS "employee_gender" VARCHAR(20);
ALTER TABLE "vpg_employees" ADD COLUMN IF NOT EXISTS "employee_phone" VARCHAR(20);
