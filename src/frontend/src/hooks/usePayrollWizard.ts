import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { LegalParamService } from '@/services/legalParamService';
import { NomineeService } from '@/services/nomineeService';
import { PayrollService } from '@/services/payrollService';
import { formatDateDisplay } from '@/utils/formatters';
import type { CalculationResult, CalculationEmployee, DeductionBreakdown as WizardDeductionBreakdown } from '@/types/payrollWizard';
import type { Employee } from '@/types/employee';
import type { PayrollCalculationResult, EmployeePayroll, DeductionBreakdown, Inconsistency } from '@/types/payrollTypes';

export interface BiweeklyPeriod {
  start: Date;
  end: Date;
  label: string;
  isCurrent: boolean;
}

export interface WizardState {
  currentStep: 1 | 2 | 3 | 4;
  selectedPeriod: {
    start: string;
    end: string;
    label: string;
    preCalculated?: boolean;
  } | null;
  calculationData: CalculationResult | null;
  payrollId: number | null;
}

export function usePayrollWizard() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPeriod, setSelectedPeriod] = useState<WizardState['selectedPeriod']>(null);
  const [calculationData, setCalculationData] = useState<CalculationResult | null>(null);
  const [payrollId, setPayrollId] = useState<number | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [periodType, setPeriodType] = useState<'quincenal' | 'mensual' | 'rango_libre'>('quincenal');
  const [minWageCheckEnabled, setMinWageCheckEnabled] = useState<number | null>(null);
  const [globalMinWageRate, setGlobalMinWageRate] = useState<number | null>(null);

  // Step 1 state
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedQuincena, setSelectedQuincena] = useState<1 | 2 | null>(null);

  // Step 2 state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState('');

  // Step 3 state
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<PayrollCalculationResult | null>(null);
  const [adjustingEmpId, setAdjustingEmpId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number | string>>(new Set());

  // Stores transient nomination data (not persisted to DB) keyed by employee_id
  const nominationTransientRef = useRef<Map<number, {
    baseHourlySalary: number;
    deductionsBreakdown: DeductionBreakdown[];
    inconsistencies: Inconsistency[];
    generalMessages: string[];
  }>>(new Map());

  useEffect(() => {
    const fetchParams = async () => {
      try {
        const [enabledRes, rateRes] = await Promise.all([
          LegalParamService.getParam('MIN_WAGE_CHECK_ENABLED'),
          LegalParamService.getParam('GLOBAL_MIN_WAGE_RATE'),
        ]);

        if (enabledRes) setMinWageCheckEnabled(Number(enabledRes.value));
        if (rateRes) setGlobalMinWageRate(Number(rateRes.value));
      } catch (error) {
        console.error('Error fetching legal parameters:', error);
      }
    };

    fetchParams();
  }, []);

  const formatDate = (d: Date): string => {
    return d.toISOString().split('T')[0];
  };

  const getMonthBounds = (year: number, month: number): { start: string; end: string } => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start: formatDate(start), end: formatDate(end) };
  };

  const applyQuincenaPreset = useCallback((half: 1 | 2) => {
    setSelectedQuincena(half);
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    if (half === 1) {
      setDateStart(formatDate(new Date(year, month, 1)));
      setDateEnd(formatDate(new Date(year, month, 15)));
    } else {
      setDateStart(formatDate(new Date(year, month, 16)));
      setDateEnd(formatDate(new Date(year, month + 1, 0)));
    }
  }, []);

  const applyMonthPreset = useCallback((ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    const bounds = getMonthBounds(y, m - 1);
    setDateStart(bounds.start);
    setDateEnd(bounds.end);
    setSelectedMonth(ym);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPeriod = useCallback((period: {
    start: string;
    end: string;
    label: string;
    preCalculated?: boolean;
  }) => {
    setSelectedPeriod({
      start: period.start,
      end: period.end,
      label: period.label,
      preCalculated: period.preCalculated ?? true,
    });
  }, []);

  const goToStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setCurrentStep(step);
  }, []);

  const setCalculationDataState = useCallback((data: CalculationResult) => {
    setCalculationData(data);
  }, []);

  const setPayrollIdState = useCallback((id: number) => {
    setPayrollId(id);
  }, []);

  const toggleAll = useCallback(() => {
    const filteredEmployees = employees.filter(e => 
      e.name.toLowerCase().includes(filterText.toLowerCase()) ||
      e.position_name?.toLowerCase().includes(filterText.toLowerCase()) ||
      e.position?.toLowerCase().includes(filterText.toLowerCase())
    );
    
    if (checkedIds.size === filteredEmployees.length && filteredEmployees.length > 0) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  }, [checkedIds.size, employees, filterText]);

  const toggleEmployee = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const mergeWithTransientData = useCallback((freshEmployees: unknown[]): EmployeePayroll[] => {
    return freshEmployees.map(fresh => {
      const f = fresh as Record<string, unknown>;
      const empId = Number(f.employee_id ?? f.id);
      const transient = nominationTransientRef.current.get(empId);
      return {
        ...f,
        baseHourlySalary: transient?.baseHourlySalary ?? Number(f.baseHourlySalary ?? 0),
        deductionsBreakdown: (transient?.deductionsBreakdown ?? f.deductionsBreakdown ?? []) as DeductionBreakdown[],
        inconsistencies: (transient?.inconsistencies ?? f.inconsistencies ?? []) as Inconsistency[],
        generalMessages: (transient?.generalMessages ?? f.generalMessages ?? []) as string[],
      } as EmployeePayroll;
    });
  }, []);

  const toggleExpand = useCallback((id: number | string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const mapToWizardResult = useCallback((res: PayrollCalculationResult): CalculationResult => {
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;

    const mappedEmployees: CalculationEmployee[] = res.employees.map(emp => {
      const gross = emp.grossSalary ?? emp.gross_salary ?? 0;
      const net = emp.netSalary ?? emp.net_salary ?? 0;
      const deductions = emp.totalDeductions ?? emp.total_deductions ?? 0;

      totalGross += gross;
      totalNet += net;
      totalDeductions += deductions;

      return {
        id: Number(emp.id ?? emp.employee_id ?? emp.employeeId),
        name: emp.name ?? emp.employeeName ?? emp.employee_name ?? 'Empleado',
        position_name: emp.position_name || emp.position,
        grossSalary: gross,
        netSalary: net,
        regularHours: Number(emp.regularHours ?? emp.regular_hours ?? 0),
        overtimeHours: Number(emp.overtimeHours ?? emp.overtime_hours ?? 0),
        totalDeductions: deductions,
        deductions: (emp.deductionsBreakdown ?? []).map(d => ({
          type: d.type,
          amount: d.amount
        })) as WizardDeductionBreakdown[],
        inconsistencies: (emp.inconsistencies ?? []).map(i => typeof i === 'string' ? i : i.message)
      };
    });

    return {
      period: {
        label: `${formatDateDisplay(res.period.startDate)} – ${formatDateDisplay(res.period.endDate)}`,
        start: res.period.startDate,
        end: res.period.endDate
      },
      employees: mappedEmployees,
      totalGross,
      totalNet,
      totalDeductions,
      createdAt: new Date().toISOString()
    };
  }, []);

  const handleCalculate = useCallback(async (onSuccess?: () => Promise<void>) => {
    setIsCalculating(true);
    setCalcError(null);
    setCalcResult(null);
    try {
      let currentId = payrollId;

      if (currentId === null) {
        const payroll = await PayrollService.createPayroll({
          payroll_type_id: 1,
          period_start: dateStart,
          period_end: dateEnd,
          payment_date: dateEnd,
          status: 'BORRADOR',
        });
        currentId = payroll.id;
        setPayrollId(currentId);
      }

      const result = await NomineeService.calculatePayrollForPeriod(
        dateStart,
        dateEnd,
        currentId,
        selectedEmployeeIds,
      );

      // Persist transient nomination data (not stored in DB) for merge after refresh
      nominationTransientRef.current.clear();
      result.employees.forEach(calc => {
        const empId = Number(calc.employeeId ?? calc.employee_id ?? calc.id);
        if (!empId) return;
        nominationTransientRef.current.set(empId, {
          baseHourlySalary: calc.baseHourlySalary ?? 0,
          deductionsBreakdown: calc.deductionsBreakdown ?? [],
          inconsistencies: calc.inconsistencies ?? [],
          generalMessages: calc.generalMessages ?? [],
        });
      });

      const freshEmployees = await PayrollService.getPayrollEmployees(currentId!);
      const normalizedData: PayrollCalculationResult = { ...result, employees: mergeWithTransientData(freshEmployees) };

      setCalcResult(normalizedData);
      setCalculationData(mapToWizardResult(normalizedData));
      if (onSuccess) await onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al calcular la planilla';
      setCalcError(msg);
      toast.error(msg);
    } finally {
      setIsCalculating(false);
    }
  }, [dateStart, dateEnd, selectedEmployeeIds, payrollId, mergeWithTransientData, mapToWizardResult, setCalculationData]);

  const refreshPayrollData = useCallback(async (onSuccess?: () => Promise<void>) => {
    if (payrollId === null) return;
    try {
      const updatedEmployees = await PayrollService.getPayrollEmployees(payrollId);

      const newResult: PayrollCalculationResult = {
        ...(calcResult as PayrollCalculationResult),
        employees: mergeWithTransientData(updatedEmployees),
      };
      
      setCalcResult(newResult);
      setCalculationData(mapToWizardResult(newResult));
      if (onSuccess) await onSuccess();
      toast.success('Datos actualizados');
    } catch {
      toast.error('Error al refrescar datos de la planilla');
    }
  }, [payrollId, calcResult, mergeWithTransientData, mapToWizardResult, setCalculationData]);

  const reset = useCallback(() => {
    setCurrentStep(1);
    setSelectedPeriod(null);
    setCalculationData(null);
    setPayrollId(null);
    setSelectedEmployeeIds([]);
    setPeriodType('quincenal');
    setMinWageCheckEnabled(null);
    setGlobalMinWageRate(null);
    setDateStart('');
    setDateEnd('');
    setSelectedQuincena(null);
    setSelectedMonth(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    
    // Reset Step 2
    setEmployees([]);
    setLoadingEmployees(false);
    setCheckedIds(new Set());
    setFilterText('');

    // Reset Step 3
    setIsCalculating(false);
    setCalcError(null);
    setCalcResult(null);
    setAdjustingEmpId(null);
    setExpandedIds(new Set());
    nominationTransientRef.current.clear();
  }, []);

  const handleApprove = useCallback(async (pid: number) => {
    await PayrollService.approvePayroll(pid);
    toast.success('Planilla aprobada exitosamente');
    reset();
    setDateStart('');
    setDateEnd('');
    setCalcResult(null);
  }, [reset]);

  return {
    currentStep,
    selectedPeriod,
    calculationData,
    payrollId,
    selectedEmployeeIds,
    setSelectedEmployeeIds,
    periodType,
    setPeriodType,
    minWageCheckEnabled,
    setMinWageCheckEnabled,
    globalMinWageRate,
    setGlobalMinWageRate,
    dateStart,
    setDateStart,
    dateEnd,
    setDateEnd,
    selectedMonth,
    setSelectedMonth,
    selectedQuincena,
    setSelectedQuincena,
    applyQuincenaPreset,
    applyMonthPreset,
    selectPeriod,
    goToStep,
    setCalculationData: setCalculationDataState,
    setPayrollId: setPayrollIdState,
    reset,
    // Step 2
    employees,
    setEmployees,
    loadingEmployees,
    setLoadingEmployees,
    checkedIds,
    setCheckedIds,
    filterText,
    setFilterText,
    toggleAll,
    toggleEmployee,
    // Step 3
    isCalculating,
    calcError,
    calcResult,
    adjustingEmpId,
    setAdjustingEmpId,
    expandedIds,
    setExpandedIds,
    toggleExpand,
    handleCalculate,
    refreshPayrollData,
    handleApprove,
  };
}

// Generate biweekly periods for selection
export function generateBiweeklyPeriods(monthsBack: number = 2): BiweeklyPeriod[] {
  const periods: BiweeklyPeriod[] = [];
  const today = new Date();

  for (let i = 0; i < monthsBack * 2; i++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const q1Start = new Date(year, month, 1);
    const q1End = new Date(year, month, 15);

    const q2Start = new Date(year, month, 16);
    const q2End = new Date(year, month + 1, 0);

    const monthName = monthDate.toLocaleDateString('es-CR', { month: 'long' });

    periods.push({
      start: q1Start,
      end: q1End,
      label: `1ª Quincena ${monthName}`,
      isCurrent: i === 0 && today.getDate() <= 15
    });

    periods.push({
      start: q2Start,
      end: q2End,
      label: `2ª Quincena ${monthName}`,
      isCurrent: i === 0 && today.getDate() > 15
    });
  }

  return periods;
}