-- Configurable pago de feriados no trabajados (Código de Trabajo CR)
-- Default TRUE: feriados obligatorios no trabajados siempre se pagan (comportamiento estándar CR)
ALTER TABLE "verdepradera"."vpg_enterprise"
  ADD COLUMN IF NOT EXISTS "enterprise_pay_unworked_holidays" BOOLEAN NOT NULL DEFAULT true;
