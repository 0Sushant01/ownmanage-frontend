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
  branch_id?: string
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
  current_plan_name?: string
  current_plan_id?: string
  subscription_status?: string
  payment_status?: string
  start_date?: string
  expiry_date?: string
  days_remaining?: number
  total_centres?: number
  employee_capacity?: number
  active_employees_count?: number
  managers_count?: number
  broker_name?: string
  broker_code?: string
}


export interface Plan {
  id: string
  name: string
  monthly_charge: string
  max_centres: number
  total_employee_capacity: number
  features: Record<string, any>
  is_active: boolean
  active_subscribers_count?: number
  total_subscribers_count?: number
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
  days_remaining?: number
  payment_status?: string
  last_payment?: { amount?: number; date?: string }
  broker?: { name?: string; referral_code?: string }
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
  total_revenue?: number | string
  commissions_paid?: number | string
  commissions_pending?: number | string
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

export interface PayrollLineItem {
  id: string
  name: string
  line_type: 'BASIC' | 'ALLOWANCE' | 'BONUS' | 'OVERTIME' | 'DEDUCTION' | 'OTHER'
  amount: string
  rate?: string
  units?: string
  is_deduction: boolean
  compensation_item?: string
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
  line_items?: PayrollLineItem[]
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
  active_businesses: number
  inactive_businesses?: number
  new_businesses: number
  business_growth_pct: number
  active_pct: number

  active_subscriptions?: number
  paid_subscriptions: number
  paid_pct: number
  expiring_soon_subscriptions?: number
  expired_subscriptions?: number

  total_employees: number
  active_employees?: number
  inactive_employees?: number
  employee_growth_pct: number

  subscription_revenue: number
  monthly_revenue?: number
  prev_month_revenue?: number
  revenue_growth_pct: number

  payment_due_count: number
  payment_due_amount: number
  payment_due_businesses_count?: number

  broker_commission_payable?: number
  broker_commission_payable_count?: number
}

export interface GrowthChartPoint {
  month: string
  total: number
  new: number
  active: number
  churned: number
}

export interface SubscriptionGrowthPoint {
  month: string
  new: number
  renewals: number
  upgrades: number
  downgrades: number
  expired: number
  cancelled: number
  total_activity: number
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

export interface ExpiringSubscriptionItem {
  id: string
  business_id: string
  business_name: string
  business_email?: string
  plan_name?: string
  current_plan?: string
  monthly_charge?: number
  expiry_date: string
  days_remaining: number
  urgency: 'critical' | 'warning' | 'upcoming'
  payment_status?: string
  assigned_broker?: string
}

export interface SuperAdminAnalyticsData {
  period: PeriodRange
  kpis: KPIMetrics
  growth_chart: GrowthChartPoint[]
  revenue_chart: RevenueChartPoint[]
  subscription_growth_chart?: SubscriptionGrowthPoint[]
  status_breakdown: StatusBreakdown
  plan_distribution: PlanDistributionItem[]
  broker_performance: BrokerPerformanceItem[]
  action_required: ActionRequiredAlerts
  recent_activity: RecentActivityItem[]
  expiring_subscriptions?: ExpiringSubscriptionItem[]
}

// Enterprise Workforce & Policy Architecture Types
export interface PermissionItem {
  id: string
  key: string
  name: string
  description: string
  module: string
  scope: 'GLOBAL' | 'ENTERPRISE' | 'CENTER' | 'SELF'
  is_granted?: boolean
}

export interface PermissionModuleGroup {
  module: string
  module_display: string
  permissions: PermissionItem[]
}

export interface ManagerAccessControlData {
  manager: {
    id: string
    user_id?: string
    name: string
    email: string
    branch_name: string
  }
  has_override?: boolean
  manager_id?: string
  granted_count: number
  total_permissions: number
  modules: Record<string, {
    module_display: string
    permissions: PermissionItem[]
  }>
}

export interface AttendancePolicyEffective {
  office_start: string
  office_end: string
  grace_period_minutes: number
  minimum_present_minutes: number
  minimum_half_day_minutes: number
  weekly_off: number
  auto_attendance: boolean
  ot_enabled: boolean
  ot_grace_minutes: number
  ot_approval_required: boolean
  max_daily_ot_minutes: number
  allow_normal_punch: boolean
  allow_gps: boolean
  allow_geofencing: boolean
  allow_qr: boolean
  allow_face_recognition: boolean
  allow_biometric: boolean
  [key: string]: any
}

export interface AttendancePolicyResponse {
  effective: AttendancePolicyEffective
  source: Record<string, 'enterprise' | 'center' | 'system'>
  enterprise_default: Record<string, any>
  center_override: Record<string, any>
  has_override: boolean
  allow_center_override: boolean
  can_edit: boolean
  centre_id?: string
  centre_name?: string
  business_id?: string
}

export interface EmployeeDocument {
  id: string
  title: string
  category: string
  category_display: string
  document_type: string
  document_url: string
  file_name: string
  file_size?: number
  mime_type?: string
  issue_date?: string
  expiry_date?: string
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  verification_notes?: string
  verified_at?: string
  verified_by_name?: string
  uploaded_by_name?: string
  remarks?: string
  version: number
  created_at: string
}

export interface Holiday {
  id: string
  name: string
  holiday_date: string
  holiday_type: 'NATIONAL' | 'STATE' | 'FESTIVAL' | 'OPTIONAL' | 'OTHER'
  holiday_type_display?: string
  description?: string
  applies_to_all_centres: boolean
  centres: string[]
  is_optional: boolean
  created_at: string
}

export interface Designation {
  id: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface SalaryRevision {
  id: string
  basic_salary: string | number
  hra: string | number
  transport_allowance: string | number
  special_allowance: string | number
  other_allowances: string | number
  currency: string
  effective_from: string
  effective_to?: string
  reason?: string
  revised_by_name?: string
  created_at: string
}

export interface PayrollRun {
  id: string
  period_start: string
  period_end: string
  centre_id?: string
  centre_name?: string
  status: 'DRAFT' | 'CALCULATED' | 'REVIEWED' | 'APPROVED' | 'FINALIZED'
  status_display?: string
  total_employees: number
  total_gross: string | number
  total_deductions: string | number
  total_net: string | number
  approved_by_name?: string
  finalized_at?: string
  expected_payment_date?: string
  generation_mode?: string
  pay_frequency?: string
  created_at: string
}

export type CompensationType = 'MONTHLY_SALARY' | 'DAILY_WAGE' | 'HOURLY_WAGE' | 'FIXED_CONTRACT'
export type PayFrequency = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY_CALENDAR' | 'MONTHLY_CUSTOM' | 'CUSTOM_PERIOD'
export type MonthEndRule = 'CLAMP_TO_LAST_DAY' | 'NEXT_AVAILABLE_DAY'
export type PayrollGenerationMode = 'MANUAL' | 'AUTOMATIC_DRAFT_AFTER_PERIOD_END' | 'AUTOMATIC_DRAFT_ON_CONFIGURED_DATE' | 'AUTOMATIC_DRAFT_BEFORE_PERIOD_END'
export type PaymentScheduleRule = 'SAME_DAY_AS_PERIOD_END' | 'DAYS_AFTER_PERIOD_END' | 'SPECIFIED_WEEKDAY' | 'DAY_OF_FOLLOWING_MONTH' | 'CUSTOM_RULE' | 'MANUAL'

export interface PayrollScheduleConfig {
  id?: string
  scope: 'ENTERPRISE' | 'CENTRE' | 'EMPLOYEE'
  has_override: boolean
  is_active: boolean
  effective_from: string
  effective_to?: string | null
  compensation_type: CompensationType
  pay_frequency: PayFrequency
  week_start_day: number
  custom_cycle_start_day: number
  anchor_date?: string | null
  month_end_rule: MonthEndRule
  generation_mode: PayrollGenerationMode
  generation_delay_days: number
  generation_day_of_month?: number | null
  approval_required: boolean
  approver_role: string
  review_deadline_days: number
  payment_rule: PaymentScheduleRule
  payment_offset_days: number
  payment_day_of_month: number
  payment_weekday: number
  change_reason?: string
  changed_by_name?: string | null
  updated_at?: string
}

export interface PayrollScheduleResolution {
  effective_config: PayrollScheduleConfig
  source: 'EMPLOYEE' | 'CENTRE' | 'ENTERPRISE'
  source_display: string
  has_override: boolean
  effective_from: string
  effective_to?: string | null
  change_reason?: string
  changed_by_name?: string | null
  updated_at?: string
  current_period: {
    start: string
    end: string
    label: string
  }
  expected_payment_date: string
  employee_override?: PayrollScheduleConfig | null
  centre_override?: PayrollScheduleConfig | null
  enterprise_default?: PayrollScheduleConfig | null
  can_manage?: boolean
}

export type MeetingStatus = 'DRAFT' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
export type MeetingLocationType = 'ONLINE' | 'IN_PERSON' | 'OTHER'
export type ParticipantResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'

export interface MeetingParticipant {
  id: string
  employee: string
  employee_id_code?: string
  full_name: string
  email: string
  designation?: string
  branch_name?: string
  response_status: ParticipantResponseStatus
  response_note?: string
  responded_at?: string | null
  is_organizer: boolean
  is_optional: boolean
}

export interface MeetingExternalGuest {
  id: string
  email: string
  name?: string
  response_status: ParticipantResponseStatus
  responded_at?: string | null
}

export interface MeetingAuditEvent {
  id: string
  event_type: string
  summary: string
  diff_data: Record<string, any>
  actor_name: string
  created_at: string
}

export interface Meeting {
  id: string
  title: string
  description?: string
  meeting_date: string
  start_time: string
  end_time: string
  timezone: string
  location_type: MeetingLocationType
  location_details?: string
  meeting_url?: string | null
  status: MeetingStatus
  cancellation_reason?: string
  cancelled_at?: string | null
  branch?: string | null
  branch_name?: string | null
  organizer: string
  organizer_name: string
  participants?: MeetingParticipant[]
  external_guests?: MeetingExternalGuest[]
  audit_events?: MeetingAuditEvent[]
  participant_count?: {
    total: number
    internal: number
    external: number
    accepted: number
    declined: number
    pending: number
  }
  my_response_status?: ParticipantResponseStatus | null
  can_edit?: boolean
  can_cancel?: boolean
  created_at: string
  updated_at?: string
}

export interface MeetingConflict {
  entity_type: 'ORGANIZER' | 'PARTICIPANT'
  employee_id?: string
  user_id?: string
  name: string
  conflict_meeting_id: string
  meeting_title: string
  start_time: string
  end_time: string
  warning: string
}

export interface EligibleEmployee {
  id: string
  employee_id: string
  full_name: string
  email: string
  designation: string
  branch_id: string | null
  branch_name: string
  department_name: string
  user_id: string | null
}


