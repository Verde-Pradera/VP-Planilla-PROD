import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SYSTEM_USER = 'system-seed';
const TODAY = new Date('2026-01-01T00:00:00.000Z');
const CCSS_DATE = new Date('2024-07-01T00:00:00.000Z');

// ─── Legal params ──────────────────────────────────────────────────────────────

const legalParams = [
  { key: 'WORKDAY_DIURNA_DAILY',    value: 8,       description: 'Horas diarias jornada diurna ordinaria',         category: 'WORKDAY',      validFrom: TODAY,      isCritical: false, source_decree: 'Art. 136 CT' },
  { key: 'WORKDAY_DIURNA_WEEKLY',   value: 48,      description: 'Horas semanales jornada diurna ordinaria',       category: 'WORKDAY',      validFrom: TODAY,      isCritical: false, source_decree: 'Art. 136 CT' },
  { key: 'WORKDAY_MIXTA_DAILY',     value: 7,       description: 'Horas diarias jornada mixta ordinaria',          category: 'WORKDAY',      validFrom: TODAY,      isCritical: false, source_decree: 'Art. 136 CT' },
  { key: 'WORKDAY_MIXTA_WEEKLY',    value: 42,      description: 'Horas semanales jornada mixta ordinaria',        category: 'WORKDAY',      validFrom: TODAY,      isCritical: false, source_decree: 'Art. 136 CT' },
  { key: 'WORKDAY_NOCTURNA_DAILY',  value: 6,       description: 'Horas diarias jornada nocturna ordinaria',       category: 'WORKDAY',      validFrom: TODAY,      isCritical: false, source_decree: 'Art. 136 CT' },
  { key: 'WORKDAY_NOCTURNA_WEEKLY', value: 36,      description: 'Horas semanales jornada nocturna ordinaria',     category: 'WORKDAY',      validFrom: TODAY,      isCritical: false, source_decree: 'Art. 136 CT' },
  { key: 'OT_FACTOR',              value: 1.5,     description: 'Multiplicador horas extra ordinarias (1.5x)',     category: 'OVERTIME',     validFrom: TODAY,      isCritical: true,  source_decree: 'Art. 139 CT' },
  { key: 'HOLIDAY_MANDATORY_FACTOR', value: 2.0,   description: 'Multiplicador feriado obligatorio trabajado (2x)', category: 'OVERTIME',   validFrom: TODAY,      isCritical: true,  source_decree: 'Art. 148 CT' },
  { key: 'HOLIDAY_TRIPLE_FACTOR',  value: 3.0,     description: 'Multiplicador feriado triple (3x)',               category: 'OVERTIME',     validFrom: TODAY,      isCritical: true,  source_decree: 'Art. 148 CT' },
  { key: 'CCSS_OBRERO_SALUD',      value: 5.50,    description: 'Cuota obrera CCSS — seguro de salud (%)',         category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'CCSS_OBRERO_PENSION',    value: 4.00,    description: 'Cuota obrera CCSS — pensión IVM (%)',             category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'CCSS_OBRERO_BP',         value: 1.00,    description: 'Cuota obrera CCSS — Banco Popular (%)',           category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'CCSS_PATRONAL_SALUD',    value: 9.25,    description: 'Cuota patronal CCSS — seguro de salud (%)',       category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'CCSS_PATRONAL_PENSION',  value: 5.25,    description: 'Cuota patronal CCSS — pensión IVM (%)',           category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'CCSS_PATRONAL_INA',      value: 1.50,    description: 'Cuota patronal INA (%)',                          category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'CCSS_PATRONAL_IMAS',     value: 0.50,    description: 'Cuota patronal IMAS (%)',                         category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'CCSS_PATRONAL_ASFAM',    value: 5.00,    description: 'Cuota patronal asignaciones familiares (%)',      category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'CCSS_PATRONAL_FONATEL',  value: 0.25,    description: 'Cuota patronal FONATEL (%)',                      category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'CCSS_PATRONAL_BP',       value: 0.25,    description: 'Cuota patronal Banco Popular (%)',                category: 'CCSS',         validFrom: CCSS_DATE,  isCritical: true,  source_decree: 'Ley CCSS' },
  { key: 'MIN_WAGE_CHECK_ENABLED', value: 1,       description: 'Habilita validación de salario mínimo (1=activo)', category: 'FEATURE_FLAG', validFrom: TODAY,      isCritical: true,  source_decree: 'MTSS' },
  { key: 'GLOBAL_MIN_WAGE_RATE',   value: 1494.20, description: 'Tarifa mínima por hora (MTSS 2024)',              category: 'MIN_WAGE',     validFrom: new Date('2024-01-01T00:00:00.000Z'), isCritical: true, source_decree: 'MTSS 2024' },
  { key: 'GLOBAL_MIN_WAGE_RATE',   value: 1529.62, description: 'Tarifa mínima por hora (MTSS 2025)',              category: 'MIN_WAGE',     validFrom: new Date('2025-01-01T00:00:00.000Z'), isCritical: true, source_decree: 'MTSS 2025' },
];

// ─── Labor events ──────────────────────────────────────────────────────────────

const laborEvents = [
  { name: 'Incapacidad CCSS',          description: 'Incapacidad médica emitida por la CCSS. Días 1–3: patrono paga el 50%. Día 4+: CCSS paga directamente.', payBehavior: 'PARTIAL_PAY' as const, payPercentage: 50.00, maxPaidDays: 3 },
  { name: 'Ausencia injustificada',     description: 'Ausencia sin permiso ni justificación. No genera pago. Puede ser causal de despido (CT Art. 81).',       payBehavior: 'NO_PAY' as const,      payPercentage: null,  maxPaidDays: null },
  { name: 'Permiso sin goce',           description: 'Permiso acordado entre patrono y trabajador sin compensación salarial (CT Art. 31).',                    payBehavior: 'NO_PAY' as const,      payPercentage: null,  maxPaidDays: null },
  { name: 'Permiso con goce',           description: 'Permiso otorgado por el patrono con pago completo del salario.',                                         payBehavior: 'FULL_PAY' as const,    payPercentage: null,  maxPaidDays: null },
  { name: 'Licencia de paternidad',     description: 'Patrono paga el 100% hasta 8 días hábiles por nacimiento o adopción (Ley 9371).',                       payBehavior: 'FULL_PAY' as const,    payPercentage: null,  maxPaidDays: 8 },
  { name: 'Suspensión disciplinaria',   description: 'Suspensión sin goce de salario impuesta por el patrono (CT Art. 81).',                                  payBehavior: 'NO_PAY' as const,      payPercentage: null,  maxPaidDays: null },
  { name: 'Duelo familiar',             description: 'Licencia por fallecimiento de familiar directo, hasta 3 días con goce de salario.',                      payBehavior: 'FULL_PAY' as const,    payPercentage: null,  maxPaidDays: 3 },
  { name: 'Licencia de maternidad',     description: 'La CCSS paga directamente al trabajador durante los 4 meses — sin costo patronal.',                     payBehavior: 'EXTERNAL_PAY' as const,payPercentage: null,  maxPaidDays: null },
  { name: 'Otro',                       description: 'Evento laboral no categorizado. Revisar con RR.HH. para definir impacto en planilla.',                   payBehavior: 'NO_PAY' as const,      payPercentage: null,  maxPaidDays: null },
];

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {

  // 1. Legal params
  console.log('Sembrando parámetros legales...');
  for (const p of legalParams) {
    const id = `seed-${p.key}-${p.validFrom.toISOString().split('T')[0]}`;
    await prisma.vpgLegalParam.upsert({
      where: { id },
      update: {},
      create: { id, key: p.key, value: p.value, description: p.description, category: p.category, validFrom: p.validFrom, validUntil: null, isActive: true, isCritical: p.isCritical, source_decree: p.source_decree ?? null, createdBy: SYSTEM_USER, updatedBy: null },
    });
  }
  console.log(`  ${legalParams.length} parámetros legales.`);

  // 2. Labor events
  console.log('Sembrando catálogo de eventos laborales...');
  for (const ev of laborEvents) {
    const existing = await prisma.vpg_labor_events.findFirst({ where: { labor_events_name: ev.name } });
    if (existing) {
      await prisma.vpg_labor_events.update({ where: { labor_events_id: existing.labor_events_id }, data: { labor_events_description: ev.description, labor_event_pay_behavior: ev.payBehavior, labor_event_max_paid_days: ev.maxPaidDays, labor_event_pay_percentage: ev.payPercentage } });
    } else {
      await prisma.vpg_labor_events.create({ data: { labor_events_name: ev.name, labor_events_description: ev.description, labor_events_version: 1, labor_event_pay_behavior: ev.payBehavior, labor_event_max_paid_days: ev.maxPaidDays, labor_event_pay_percentage: ev.payPercentage } });
    }
  }
  console.log(`  ${laborEvents.length} eventos laborales.`);

  // 3. Enterprise
  console.log('Sembrando empresa...');
  const existingEnterprise = await prisma.vpg_enterprise.findFirst();
  if (!existingEnterprise) {
    await prisma.vpg_enterprise.create({
      data: {
        enterprise_name: 'VP-Planillas Demo',
        enterprise_image: Buffer.from(''),
        enterprise_creation_date: new Date('2020-01-01'),
        enterprise_version: 1,
        enterprise_is_commercial_activity: true,
        enterprise_ordinary_shift_type: 'DIURNA',
        enterprise_pay_unworked_holidays: true,
      },
    });
    console.log('  Empresa creada.');
  } else {
    console.log('  Empresa ya existe, omitiendo.');
  }

  // 4. Positions
  console.log('Sembrando puestos...');
  const positionDefs = [
    { name: 'Asistente Administrativo',    description: 'Apoyo en tareas administrativas generales.',           salary: 500_000 },
    { name: 'Desarrollador de Software',   description: 'Desarrollo y mantenimiento de sistemas internos.',     salary: 900_000 },
    { name: 'Gerente de Recursos Humanos', description: 'Gestión del capital humano y relaciones laborales.',   salary: 1_200_000 },
    { name: 'Supervisor de Operaciones',   description: 'Coordinación y supervisión del área operativa.',       salary: 750_000 },
    { name: 'Contador',                    description: 'Gestión contable, tributaria y planilla.',             salary: 800_000 },
  ];
  const positionIds: Record<string, number> = {};
  for (const p of positionDefs) {
    const existing = await prisma.vpg_positions.findFirst({ where: { position_name: p.name } });
    if (existing) {
      positionIds[p.name] = existing.position_id;
    } else {
      const created = await prisma.vpg_positions.create({ data: { position_name: p.name, position_description: p.description, position_base_salary: p.salary, position_version: 1 } });
      positionIds[p.name] = created.position_id;
    }
  }
  console.log(`  ${positionDefs.length} puestos.`);

  // 5. Payroll types
  console.log('Sembrando tipos de planilla...');
  const payrollTypeDefs = [
    { name: 'Quincenal', description: 'Planilla pagada dos veces al mes (días 15 y último día).' },
    { name: 'Mensual',   description: 'Planilla pagada una vez al mes (último día hábil).' },
  ];
  const payrollTypeIds: Record<string, number> = {};
  for (const pt of payrollTypeDefs) {
    const existing = await prisma.vpg_payroll_types.findFirst({ where: { payroll_types_name: pt.name } });
    if (existing) {
      payrollTypeIds[pt.name] = existing.payroll_types_id;
    } else {
      const created = await prisma.vpg_payroll_types.create({ data: { payroll_types_name: pt.name, payroll_types_description: pt.description, payroll_types_version: 1 } });
      payrollTypeIds[pt.name] = created.payroll_types_id;
    }
  }
  console.log(`  ${payrollTypeDefs.length} tipos de planilla.`);

  // 6. Deductions
  console.log('Sembrando deducciones...');
  const deductionDefs = [
    { name: 'CCSS Obrero', description: 'Deducciones obligatorias de la CCSS a cargo del trabajador (salud 5.5% + pensión 4% + BP 1% = 10.5%).', percentage: 10.50 },
    { name: 'Embargo judicial', description: 'Embargo aplicado por orden judicial. Monto variable por caso.', percentage: null },
  ];
  const deductionIds: Record<string, number> = {};
  for (const d of deductionDefs) {
    const existing = await prisma.vpg_deductions.findFirst({ where: { deductions_name: d.name } });
    if (existing) {
      deductionIds[d.name] = existing.deductions_id;
    } else {
      const created = await prisma.vpg_deductions.create({ data: { deductions_name: d.name, deductions_description: d.description, deductions_percentage: d.percentage, deductions_version: 1 } });
      deductionIds[d.name] = created.deductions_id;
    }
  }
  console.log(`  ${deductionDefs.length} deducciones.`);

  // 7. Users
  console.log('Sembrando usuarios...');
  const SALT = 10;
  const userDefs = [
    { firstName: 'Admin',   lastName: 'Sistema',   middleName: '',          nationalId: '000000001', email: 'admin@vpplanilla.com',   username: 'admin',   password: 'Admin1234!',  role: 'admin' },
    { firstName: 'María',   lastName: 'González',  middleName: 'Elena',     nationalId: '101230456', email: 'mgonzalez@vpplanilla.com', username: 'mgonzalez', password: 'User1234!', role: 'user' },
  ];
  const userIds: Record<string, number> = {};
  for (const u of userDefs) {
    const existing = await prisma.vpg_users.findFirst({ where: { user_username: u.username } });
    if (existing) {
      userIds[u.username] = existing.user_id;
    } else {
      const hash = await bcrypt.hash(u.password, SALT);
      const created = await prisma.vpg_users.create({
        data: { user_first_name: u.firstName, user_last_name: u.lastName, user_middle_name: u.middleName, user_national_id: u.nationalId, user_email: u.email, user_username: u.username, user_password: hash, user_role: u.role, user_version: 1 },
      });
      userIds[u.username] = created.user_id;
    }
  }
  console.log(`  ${userDefs.length} usuarios.`);

  // 8. Employees
  console.log('Sembrando empleados...');
  const employeeDefs = [
    { firstName: 'Carlos',    lastName: 'Ramírez',   middleName: 'Alberto',  nationalId: '101110001', email: 'carlos.ramirez@empresa.com',    position: 'Desarrollador de Software',   hireDate: '2022-03-15', status: 'A', gender: 'M' },
    { firstName: 'Sofía',     lastName: 'Vargas',    middleName: 'María',    nationalId: '205340002', email: 'sofia.vargas@empresa.com',      position: 'Asistente Administrativo',    hireDate: '2021-06-01', status: 'A', gender: 'F' },
    { firstName: 'Andrés',    lastName: 'Mora',      middleName: 'Luis',     nationalId: '303220003', email: 'andres.mora@empresa.com',       position: 'Supervisor de Operaciones',   hireDate: '2020-01-10', status: 'A', gender: 'M' },
    { firstName: 'Gabriela',  lastName: 'Jiménez',   middleName: 'Patricia', nationalId: '108450004', email: 'gabriela.jimenez@empresa.com',  position: 'Contador',                    hireDate: '2023-08-20', status: 'A', gender: 'F' },
    { firstName: 'Roberto',   lastName: 'Solano',    middleName: 'Eduardo',  nationalId: '401120005', email: 'roberto.solano@empresa.com',    position: 'Gerente de Recursos Humanos', hireDate: '2019-04-05', status: 'A', gender: 'M' },
    { firstName: 'Laura',     lastName: 'Castro',    middleName: 'Isabel',   nationalId: '502310006', email: 'laura.castro@empresa.com',      position: 'Desarrollador de Software',   hireDate: '2024-01-08', status: 'A', gender: 'F' },
    { firstName: 'Diego',     lastName: 'Herrera',   middleName: 'Josué',    nationalId: '601780007', email: 'diego.herrera@empresa.com',     position: 'Asistente Administrativo',    hireDate: '2021-11-15', status: 'I', gender: 'M' },
  ];
  for (const e of employeeDefs) {
    const existing = await prisma.vpg_employees.findFirst({ where: { employee_national_id: e.nationalId } });
    if (!existing) {
      await prisma.vpg_employees.create({
        data: {
          employee_first_name: e.firstName,
          employee_last_name: e.lastName,
          employee_middle_name: e.middleName,
          employee_national_id: e.nationalId,
          employee_social_code: `CCSS-${e.nationalId}`,
          employee_email: e.email,
          employee_position_id: positionIds[e.position],
          employee_hire_date: new Date(e.hireDate),
          employee_status: e.status,
          employee_gender: e.gender,
          employee_version: 1,
        },
      });
    }
  }
  console.log(`  ${employeeDefs.length} empleados.`);

  // 9. Company holidays 2026 (feriados obligatorios Costa Rica)
  console.log('Sembrando feriados 2026...');
  const holidays = [
    { name: 'Año Nuevo',                    date: '2026-01-01', mandatory: true,  triple: false },
    { name: 'Día de Juan Santamaría',        date: '2026-04-11', mandatory: true,  triple: false },
    { name: 'Jueves Santo',                  date: '2026-04-02', mandatory: false, triple: false },
    { name: 'Viernes Santo',                 date: '2026-04-03', mandatory: true,  triple: false },
    { name: 'Día del Trabajo',               date: '2026-05-01', mandatory: true,  triple: false },
    { name: 'Anexión de Nicoya',             date: '2026-07-25', mandatory: false, triple: false },
    { name: 'Virgen de los Ángeles',         date: '2026-08-02', mandatory: false, triple: false },
    { name: 'Día de la Madre',               date: '2026-08-15', mandatory: true,  triple: false },
    { name: 'Independencia de Costa Rica',   date: '2026-09-15', mandatory: true,  triple: false },
    { name: 'Día de las Culturas',           date: '2026-10-12', mandatory: false, triple: false },
    { name: 'Navidad',                       date: '2026-12-25', mandatory: true,  triple: false },
  ];
  for (const h of holidays) {
    const existing = await prisma.vpg_company_holidays.findFirst({ where: { company_holidays_date: new Date(h.date) } });
    if (!existing) {
      await prisma.vpg_company_holidays.create({
        data: { company_holidays_name: h.name, company_holidays_date: new Date(h.date), company_holidays_is_mandatory: h.mandatory, company_holidays_is_triple: h.triple, company_holidays_status: 'active', company_holidays_version: 1 },
      });
    }
  }
  console.log(`  ${holidays.length} feriados 2026.`);

  console.log('\nSeed completado.');
  console.log('  Usuarios de prueba:');
  console.log('    admin / Admin1234!  (rol: admin)');
  console.log('    mgonzalez / User1234!  (rol: user)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
