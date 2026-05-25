-- AlterTable
ALTER TABLE "vpg_payroll_employee" ADD COLUMN IF NOT EXISTS "payroll_employee_worked_days" INTEGER NOT NULL DEFAULT 0;
