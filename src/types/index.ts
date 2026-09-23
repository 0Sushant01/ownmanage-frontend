export type UserRole = 'SUPERADMIN' | 'BUSINESS_ADMIN' | 'MANAGER' | 'STAFF' | 'BROKER'

export interface BrokerProfile {
  id: string
  name: string
  referral_code: string
  commission_rate: number
  is_active: boolean
}

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  full_name: string
  is_superuser: boolean
  broker_profile?: BrokerProfile
}

export interface BusinessSummary {
  id: string
  name: string
}

export interface EmployeeSummary {
  id: string
  employee_id?: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  designation: string
  employment_status: string
  joining_date: string
  department_name?: string
  branch_name?: string
  manager_name?: string
}

export interface Business {
  id: string
  name: string
  legal_name: string
  email: string
  phone: string
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  postal_code: string
  country: string
  timezone: string
  currency: string
  employee_id_enabled: boolean
  employee_id_prefix: string
  employee_id_next_number: number
  is_active: boolean
  created_at: string
}

export interface Plan {
  id: string
  name: string
  monthly_charge: string
  max_centres: number
  total_employee_capacity: number
  features: Record<string, any>
  is_active: boolean
  created_at: string
}

export interface CentreCapacityAllocation {
  id: string
  centre: string
  centre_name: string
  centre_code: string
  allocated_capacity: number
  active_employees_count: number
  available_capacity: number
}

export interface Subscription {
  id: string
  business: string
  business_name?: string
  plan: Plan
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'CANCELLED'
  start_date: string
  end_date?: string
  current_period_start: string
  current_period_end: string
  total_allocated_capacity: number
  unallocated_capacity: number
  centre_allocations: CentreCapacityAllocation[]
}

export interface Broker {
  id: string
  user_email?: string
  name: string
  referral_code: string
  commission_rate: string
  is_active: boolean
  referrals_count?: number
  created_at: string
}

export interface Referral {
  id: string
  broker: string
  broker_name: string
  business: string
  business_name: string
  referral_code_used: string
  referred_at: string
}

export interface Commission {
  id: string
  broker: string
  broker_name?: string
  business_name?: string
  period_start: string
  period_end: string
  base_revenue: string
  commission_rate: string
  commission_amount: string
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'
  paid_at?: string
  created_at: string
}

export interface AttendanceDay {
  id: string
  employee: string
  employee_name: string
  employee_id_code?: string
  attendance_date: string
  status: string
  total_work_seconds: number
  work_hours_display: string
  is_locked: boolean
  notes: string
  events?: AttendanceEvent[]
}

export interface AttendanceEvent {
  id: string
  event_type: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END'
  event_time: string
  source: string
  notes?: string
}

export interface LeaveRequest {
  id: string
  employee: string
  employee_name: string
  employee_id_code?: string
  leave_type: string
  leave_type_name: string
  leave_type_code: string
  start_date: string
  end_date: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  approved_by_name?: string
  approved_at?: string
  rejected_at?: string
  rejection_reason?: string
  created_at: string
}

export interface LeaveType {
  id: string
  name: string
  code: string
  description: string
  is_paid: boolean
}

export interface Payroll {
  id: string
  employee: string
  employee_name: string
  employee_id_code?: string
  department_name?: string
  period_start: string
  period_end: string
  gross_amount: string
  total_deductions: string
  net_amount: string
  currency: string
  status: 'DRAFT' | 'PROCESSED' | 'PAID' | 'CANCELLED'
  generated_at: string
}

export interface Department {
  id: string
  name: string
  code: string
}

export interface Branch {
  id: string
  name: string
  code: string
  address?: string
  city?: string
  state?: string
  timezone?: string
  is_active: boolean
  allocated_capacity?: number
  active_employees_count?: number
}

export type Centre = Branch

export interface PeriodRange {
  key: string
  start_date: string
  end_date: string
}

export interface KPIMetrics {
  total_businesses: number
  new_businesses: number
  business_growth_pct: number
  active_businesses: number
  active_pct: number
  total_employees: number
  employee_growth_pct: number
  subscription_revenue: number
  revenue_growth_pct: number
  paid_subscriptions: number
  paid_pct: number
  payment_due_count: number
  payment_due_amount: number
}

export interface GrowthChartPoint {
  month: string
  total: number
  new: number
  active: number
  churned: number
}

export interface RevenueChartPoint {
  month: string
  total_revenue: number
  paid_amount: number
  pending_amount: number
}

export interface SubscriptionStatusItem {
  key: string
  label: string
  count: number
  percentage: number
}

export interface StatusBreakdown {
  statuses: SubscriptionStatusItem[]
  paid_revenue: number
  pending_revenue: number
}

export interface PlanDistributionItem {
  id: string
  name: string
  monthly_charge: number
  max_centres: number
  total_capacity: number
  businesses_count: number
  active_count: number
  paid_count: number
  revenue: number
}

export interface BrokerPerformanceItem {
  id: string
  name: string
  referral_code: string
  commission_rate: number
  referred_businesses: number
  active_businesses: number
  total_revenue: number
  commissions_paid: number
  commissions_pending: number
}

export interface ActionRequiredAlerts {
  payments_overdue_count: number
  payments_overdue_amount: number
  subscriptions_expiring_soon: number
  businesses_suspended: number
  commissions_pending_count: number
  commissions_pending_amount: number
  trials_count: number
}

export interface RecentActivityItem {
  id: string
  type: string
  title: string
  description: string
  timestamp: string
  status_color: string
}

export interface SuperAdminAnalyticsData {
  period: PeriodRange
  kpis: KPIMetrics
  growth_chart: GrowthChartPoint[]
  revenue_chart: RevenueChartPoint[]
  status_breakdown: StatusBreakdown
  plan_distribution: PlanDistributionItem[]
  broker_performance: BrokerPerformanceItem[]
  action_required: ActionRequiredAlerts
  recent_activity: RecentActivityItem[]
}
