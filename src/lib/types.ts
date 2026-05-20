export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  contact_number: string;
  address: string;
  age: number;
  position: string;
  salary_rate: number;

  // NEW FIELD FOR FINGERPRINT
  fingerprint_registered: boolean;

  // OPTIONAL OLD FIELD (keep temporarily if some code still references it)
  face_data?: string | null;

  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  time_in: string;
  time_out?: string | null;
  total_hours?: number | null;
  status: string;
  created_at: string;

  employee?: Employee;
}

export interface Debt {
  id: string;
  employee_id: string;
  debt_type: 'cash_advance' | 'salary_loan' | 'product_deduction';
  amount: number;
  remaining_balance: number;
  description: string;
  is_fully_paid: boolean;
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export interface Payroll {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  days_worked: number;
  gross_salary: number;
  total_debts: number;
  total_deductions: number;
  net_salary: number;
  status: 'pending' | 'paid';
  created_at: string;
  updated_at: string;
  employee?: Employee;
}

export type DebtType = 'cash_advance' | 'salary_loan' | 'product_deduction';

export const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  cash_advance: 'Cash Advance',
  salary_loan: 'Salary Loan',
  product_deduction: 'Product Deduction',
};
