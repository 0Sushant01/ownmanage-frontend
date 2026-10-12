import React, { useState, useEffect } from 'react'
import {
  Wallet,
  Building2,
  Users,
  Shield,
  Plus,
  Edit3,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  ArrowRight,
} from 'lucide-react'
import apiClient from '../services/api'
import { CentreSelector } from '../components/CentreSelector'
import { EmployeeProfileModal } from '../components/EmployeeProfileModal'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnCard } from '../design-system/components/OwnCard'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { OwnDialog, OwnDialogFooter } from '../design-system/components/OwnDialog'
import { OwnEmptyState } from '../design-system/components/OwnEmptyState'

interface EmployeeListItem {
  id: string
  employee_id?: string
  full_name: string
  email?: string
  department_name?: string
  branch_name?: string
  branch?: string
  designation_name?: string
  employment_status?: string
  current_salary?: string
}

interface CompensationItem {
  id: string
  name: string
  component_type: string
  calculation_type: string
  frequency: string
  amount: number
  effective_from: string
  effective_to?: string | null
  affects_payroll: boolean
  is_active: boolean
  source?: string
  source_display?: string
}

interface ScheduleConfig {
  generation_type?: string
  generation_weekday?: number
  generation_date?: number
  generation_day_of_month?: number
  editable_period_duration?: number
  editing_period_unit?: string
  visibility_policy?: string
  compensation_type?: string
  has_override?: boolean
}

export const Compensation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'enterprise' | 'centres'>('employees')

  // --- TAB 1: EMPLOYEE COMPENSATION STATE ---
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCentre, setSelectedCentre] = useState<string>('all')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false)

  // --- TAB 2: ENTERPRISE DEFAULTS STATE ---
  const [enterpriseSchedule, setEnterpriseSchedule] = useState<ScheduleConfig | null>(null)
  const [enterpriseItems, setEnterpriseItems] = useState<CompensationItem[]>([])
  const [loadingEnterprise, setLoadingEnterprise] = useState<boolean>(false)

  // Modals for Enterprise
  const [showEnterpriseSchedModal, setShowEnterpriseSchedModal] = useState<boolean>(false)
  const [enterpriseSchedForm, setEnterpriseSchedForm] = useState({
    generation_type: 'MONTHLY',
    generation_date: 1,
    generation_weekday: 0,
    editable_period_duration: 3,
    editing_period_unit: 'DAYS',
    visibility_policy: 'ON_FINALIZATION',
    compensation_type: 'MONTHLY_SALARY',
    change_reason: 'Updated enterprise payroll schedule defaults',
  })

  const [showEnterpriseItemModal, setShowEnterpriseItemModal] = useState<boolean>(false)
  const [itemForm, setItemForm] = useState({
    name: '',
    component_type: 'EARNING',
    calculation_type: 'FIXED_AMOUNT',
    frequency: 'RECURRING',
    amount: '',
    effective_from: new Date().toISOString().slice(0, 10),
    affects_payroll: true,
    reason: '',
  })

  // --- TAB 3: CENTRE OVERRIDES STATE ---
  const [selectedOverrideCentre, setSelectedOverrideCentre] = useState<string>('')
  const [centreScheduleData, setCentreScheduleData] = useState<any>(null)
  const [centreItems, setCentreItems] = useState<CompensationItem[]>([])
  const [loadingCentreData, setLoadingCentreData] = useState<boolean>(false)
  const [showCentreSchedModal, setShowCentreSchedModal] = useState<boolean>(false)
  const [showCentreItemModal, setShowCentreItemModal] = useState<boolean>(false)

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // 1. Fetch Employees
  const loadEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const params: Record<string, string> = { employment_status: 'ACTIVE' }
      if (selectedCentre && selectedCentre !== 'all') {
        params.branch_id = selectedCentre
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }
      const res = await apiClient.get('/employees/', { params })
      const list = Array.isArray(res.data) ? res.data : (res.data.results || [])
      setEmployees(list)
    } catch {
      // Fallback
    } finally {
      setLoadingEmployees(false)
    }
  }

  // 2. Fetch Enterprise Defaults
  const loadEnterpriseData = async () => {
    setLoadingEnterprise(true)
    try {
      const [schedRes, itemsRes] = await Promise.all([
        apiClient.get('/payroll/schedule-enterprise/'),
        apiClient.get('/payroll/enterprise-compensation-items/'),
      ])
      const eff = schedRes.data?.effective_config || {}
      setEnterpriseSchedule(eff)
      setEnterpriseSchedForm({
        generation_type: eff.generation_type || 'MONTHLY',
        generation_date: eff.generation_date ?? eff.generation_day_of_month ?? 1,
        generation_weekday: eff.generation_weekday ?? 0,
        editable_period_duration: eff.editable_period_duration ?? 3,
        editing_period_unit: eff.editing_period_unit || 'DAYS',
        visibility_policy: eff.visibility_policy || 'ON_FINALIZATION',
        compensation_type: eff.compensation_type || 'MONTHLY_SALARY',
        change_reason: '',
      })
      setEnterpriseItems(Array.isArray(itemsRes.data) ? itemsRes.data : [])
    } catch {
      // Fallback
    } finally {
      setLoadingEnterprise(false)
    }
  }

  // 3. Fetch Centre Overrides
  const loadCentreData = async (centreId: string) => {
    if (!centreId || centreId === 'all') {
      setCentreScheduleData(null)
      setCentreItems([])
      return
    }
    setLoadingCentreData(true)
    try {
      const [schedRes, itemsRes] = await Promise.all([
        apiClient.get(`/centres/${centreId}/payroll-schedule/`),
        apiClient.get(`/centres/${centreId}/compensation-items/`),
      ])
      setCentreScheduleData(schedRes.data)
      setCentreItems(Array.isArray(itemsRes.data) ? itemsRes.data : [])
    } catch {
      // Fallback
    } finally {
      setLoadingCentreData(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'employees') {
      loadEmployees()
    } else if (activeTab === 'enterprise') {
      loadEnterpriseData()
    } else if (activeTab === 'centres' && selectedOverrideCentre) {
      loadCentreData(selectedOverrideCentre)
    }
  }, [activeTab, selectedCentre, searchQuery, selectedOverrideCentre])

  // Save Enterprise Schedule
  const handleSaveEnterpriseSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await apiClient.post('/payroll/schedule-enterprise/', enterpriseSchedForm)
      setShowEnterpriseSchedModal(false)
      setFeedbackMsg({ type: 'success', text: 'Enterprise default schedule updated successfully!' })
      await loadEnterpriseData()
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update schedule.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Save Enterprise Item
  const handleSaveEnterpriseItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemForm.name.trim() || !itemForm.amount) {
      alert('Please fill in component name and amount.')
      return
    }
    setSubmitting(true)
    try {
      await apiClient.post('/payroll/enterprise-compensation-items/', {
        name: itemForm.name.trim(),
        component_type: itemForm.component_type,
        calculation_type: itemForm.calculation_type,
        frequency: itemForm.frequency,
        amount: parseFloat(itemForm.amount),
        effective_from: itemForm.effective_from,
        affects_payroll: itemForm.affects_payroll,
        reason: itemForm.reason.trim() || 'Enterprise default compensation component',
      })
      setShowEnterpriseItemModal(false)
      setItemForm({
        name: '',
        component_type: 'EARNING',
        calculation_type: 'FIXED_AMOUNT',
        frequency: 'RECURRING',
        amount: '',
        effective_from: new Date().toISOString().slice(0, 10),
        affects_payroll: true,
        reason: '',
      })
      setFeedbackMsg({ type: 'success', text: 'Enterprise component created successfully!' })
      await loadEnterpriseData()
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.detail || err.response?.data?.amount?.[0] || 'Failed to save component.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Save Centre Item
  const handleSaveCentreItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOverrideCentre) return
    if (!itemForm.name.trim() || !itemForm.amount) {
      alert('Please fill in component name and amount.')
      return
    }
    setSubmitting(true)
    try {
      await apiClient.post(`/centres/${selectedOverrideCentre}/compensation-items/`, {
        name: itemForm.name.trim(),
        component_type: itemForm.component_type,
        calculation_type: itemForm.calculation_type,
        frequency: itemForm.frequency,
        amount: parseFloat(itemForm.amount),
        effective_from: itemForm.effective_from,
        affects_payroll: itemForm.affects_payroll,
        reason: itemForm.reason.trim() || 'Centre override compensation component',
      })
      setShowCentreItemModal(false)
      setItemForm({
        name: '',
        component_type: 'EARNING',
        calculation_type: 'FIXED_AMOUNT',
        frequency: 'RECURRING',
        amount: '',
        effective_from: new Date().toISOString().slice(0, 10),
        affects_payroll: true,
        reason: '',
      })
      setFeedbackMsg({ type: 'success', text: 'Centre component override added successfully!' })
      await loadCentreData(selectedOverrideCentre)
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to save centre component.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Save Centre Schedule Override
  const handleSaveCentreSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOverrideCentre) return
    setSubmitting(true)
    try {
      await apiClient.post(`/centres/${selectedOverrideCentre}/payroll-schedule/`, enterpriseSchedForm)
      setShowCentreSchedModal(false)
      setFeedbackMsg({ type: 'success', text: 'Centre schedule override saved successfully!' })
      await loadCentreData(selectedOverrideCentre)
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to save centre schedule.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Reset Centre Schedule
  const handleResetCentreSchedule = async () => {
    if (!selectedOverrideCentre) return
    if (!window.confirm('Reset this centre to inherit Enterprise Default schedule?')) return
    try {
      await apiClient.post(`/centres/${selectedOverrideCentre}/payroll-schedule/reset/`, {})
      setFeedbackMsg({ type: 'success', text: 'Centre schedule reverted to Enterprise Default.' })
      await loadCentreData(selectedOverrideCentre)
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to reset centre schedule.' })
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <OwnPageHeader
        title="Compensation Management"
        description="Configure enterprise compensation baselines, centre-level overrides, and employee salary structures."
        breadcrumbs={[
          { label: 'Workspace', href: '/' },
          { label: 'Payroll & Compensation' },
          { label: 'Compensation' },
        ]}
      />

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'employees'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Employee Directory & Salaries</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enterprise')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'enterprise'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Enterprise Defaults</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('centres')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'centres'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Centre Overrides</span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEE COMPENSATION */}
      {activeTab === 'employees' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="w-full sm:w-64 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search employee name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="shrink-0">
                <CentreSelector
                  value={selectedCentre}
                  onChange={(val: string) => setSelectedCentre(val)}
                  showAllOption={true}
                  size="sm"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground self-center shrink-0">
              Showing <strong>{employees.length}</strong> active staff
            </div>
          </div>

          {/* Table */}
          <OwnCard className="overflow-hidden border-border bg-card shadow-sm">
            {loadingEmployees ? (
              <div className="p-12 text-center text-muted-foreground">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                <p className="text-sm">Loading employee compensation records...</p>
              </div>
            ) : employees.length === 0 ? (
              <OwnEmptyState
                title="No employees found"
                description="No active employees match the selected search criteria."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-5 py-3.5">Employee</th>
                      <th className="px-5 py-3.5">Centre / Branch</th>
                      <th className="px-5 py-3.5">Designation</th>
                      <th className="px-5 py-3.5">Current Base Salary</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-foreground text-xs">{emp.full_name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {emp.employee_id || 'ID: --'} {emp.department_name ? `• ${emp.department_name}` : ''}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-medium text-xs text-foreground">{emp.branch_name || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="text-xs text-muted-foreground">{emp.designation_name || 'Staff'}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-semibold text-xs font-mono text-foreground">
                            {emp.current_salary || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <OwnButton
                            onClick={() => {
                              setSelectedEmployeeId(emp.id)
                              setShowEmployeeModal(true)
                            }}
                            variant="secondary"
                            size="sm"
                            rightIcon={<ArrowRight className="w-3 h-3" />}
                          >
                            Manage Compensation
                          </OwnButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </OwnCard>
        </div>
      )}

      {/* TAB 2: ENTERPRISE DEFAULTS */}
      {activeTab === 'enterprise' && (
        <div className="space-y-6">
          {/* Hierarchy Banner */}
          <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3">
            <Shield className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Enterprise Default Master Configuration</strong>
              <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 mt-0.5">
                Settings defined here apply as the organizational standard. Centre-level overrides take precedence
                for centre staff, and employee-specific overrides take highest precedence.
              </p>
            </div>
          </div>

          {/* Schedule Defaults Card */}
          <OwnCard className="p-5 border-border bg-card shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Default Salary Slip Generation Schedule
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Universal generation frequency and editing window deadlines across all centres.
                </p>
              </div>

              <OwnButton
                onClick={() => setShowEnterpriseSchedModal(true)}
                variant="secondary"
                size="sm"
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Edit Enterprise Schedule
              </OwnButton>
            </div>

            {loadingEnterprise ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading enterprise schedule...</div>
            ) : enterpriseSchedule ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Generation Frequency
                  </span>
                  <span className="font-semibold text-foreground text-xs block">
                    {enterpriseSchedule.generation_type || 'MONTHLY'}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    {enterpriseSchedule.generation_type === 'MONTHLY'
                      ? `Generated on Day ${enterpriseSchedule.generation_date ?? enterpriseSchedule.generation_day_of_month ?? 1} of month`
                      : enterpriseSchedule.generation_type === 'WEEKLY'
                      ? `Generated on Weekday ${enterpriseSchedule.generation_weekday ?? 0}`
                      : 'Generated daily at 12:01 AM'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Editable Window
                  </span>
                  <span className="font-semibold text-foreground text-xs block">
                    {enterpriseSchedule.editable_period_duration || 3} {enterpriseSchedule.editing_period_unit || 'DAYS'}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">Manager review period</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Visibility Policy
                  </span>
                  <span className="font-semibold text-foreground text-xs block">
                    {enterpriseSchedule.visibility_policy === 'ON_FINALIZATION'
                      ? 'On Finalization'
                      : enterpriseSchedule.visibility_policy === 'ON_RELEASE'
                      ? 'On Explicit Release'
                      : 'On Payment Date'}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">Employee self-service rule</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                    Default Compensation Type
                  </span>
                  <span className="font-semibold text-foreground text-xs block">
                    {enterpriseSchedule.compensation_type || 'MONTHLY_SALARY'}
                  </span>
                  <span className="text-[11px] text-muted-foreground block">Fixed Monthly Salary</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No enterprise schedule configured.</div>
            )}
          </OwnCard>

          {/* Itemized Components Card */}
          <OwnCard className="p-5 border-border bg-card shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Default Itemized Compensation Components
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Standard allowances, recurring bonuses, and deductions inherited by all eligible employees.
                </p>
              </div>

              <OwnButton
                onClick={() => setShowEnterpriseItemModal(true)}
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Enterprise Component
              </OwnButton>
            </div>

            {loadingEnterprise ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading components...</div>
            ) : enterpriseItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                <p className="font-medium text-foreground">No enterprise compensation items configured.</p>
                <p className="text-muted-foreground mt-0.5">Click &quot;Add Enterprise Component&quot; to configure standard organizational allowances or deductions.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Component Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Calculation</th>
                      <th className="px-4 py-3">Amount / Rate</th>
                      <th className="px-4 py-3">Recurrence</th>
                      <th className="px-4 py-3">Affects Payroll</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enterpriseItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              item.component_type === 'DEDUCTION'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {item.component_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.calculation_type === 'PERCENTAGE' ? 'Percentage (%)' : 'Fixed Amount'}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold">
                          {item.calculation_type === 'PERCENTAGE' ? `${item.amount}%` : `₹${Number(item.amount).toLocaleString()}`}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.frequency}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.affects_payroll
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {item.affects_payroll ? 'ON' : 'OFF'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </OwnCard>
        </div>
      )}

      {/* TAB 3: CENTRE OVERRIDES */}
      {activeTab === 'centres' && (
        <div className="space-y-6">
          {/* Centre Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-foreground">Select Centre:</span>
              <CentreSelector
                value={selectedOverrideCentre}
                onChange={(val: string) => setSelectedOverrideCentre(val)}
                showAllOption={false}
                size="sm"
              />
            </div>
            {selectedOverrideCentre && (
              <span className="text-xs text-muted-foreground">
                Showing overrides for selected work location.
              </span>
            )}
          </div>

          {!selectedOverrideCentre ? (
            <OwnEmptyState
              title="Select a centre to view overrides"
              description="Choose a branch or centre from the dropdown above to manage its specific compensation rules and schedule overrides."
            />
          ) : loadingCentreData ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
              <p className="text-sm">Loading centre override configuration...</p>
            </div>
          ) : (
            <>
              {/* Centre Schedule Override */}
              <OwnCard className="p-5 border-border bg-card shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">Centre Payroll Schedule</h4>
                      {centreScheduleData?.source === 'CENTRE' ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Centre Override Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Inheriting Enterprise Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generation schedule specific to employees assigned to this centre.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {centreScheduleData?.source === 'CENTRE' && (
                      <OwnButton
                        onClick={handleResetCentreSchedule}
                        variant="ghost"
                        size="sm"
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        Reset to Enterprise
                      </OwnButton>
                    )}
                    <OwnButton
                      onClick={() => setShowCentreSchedModal(true)}
                      variant="secondary"
                      size="sm"
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    >
                      {centreScheduleData?.source === 'CENTRE' ? 'Edit Centre Override' : 'Configure Centre Override'}
                    </OwnButton>
                  </div>
                </div>

                {centreScheduleData?.effective_config ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Generation Frequency
                      </span>
                      <span className="font-semibold text-foreground text-xs block">
                        {centreScheduleData.effective_config.generation_type || 'MONTHLY'}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {centreScheduleData.effective_config.generation_type === 'MONTHLY'
                          ? `Day ${centreScheduleData.effective_config.generation_date ?? centreScheduleData.effective_config.generation_day_of_month ?? 1}`
                          : centreScheduleData.effective_config.generation_type === 'WEEKLY'
                          ? `Weekday ${centreScheduleData.effective_config.generation_weekday ?? 0}`
                          : 'Daily'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Editable Period
                      </span>
                      <span className="font-semibold text-foreground text-xs block">
                        {centreScheduleData.effective_config.editable_period_duration || 3}{' '}
                        {centreScheduleData.effective_config.editing_period_unit || 'DAYS'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Visibility
                      </span>
                      <span className="font-semibold text-foreground text-xs block">
                        {centreScheduleData.effective_config.visibility_policy || 'ON_FINALIZATION'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">
                        Provenance Source
                      </span>
                      <span className="font-semibold text-primary text-xs block">
                        {centreScheduleData.source_display || 'Enterprise Default'}
                      </span>
                    </div>
                  </div>
                ) : null}
              </OwnCard>

              {/* Centre Components Card */}
              <OwnCard className="p-5 border-border bg-card shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Centre-Level Compensation Components</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Components applied specifically to staff working at this location.
                    </p>
                  </div>

                  <OwnButton
                    onClick={() => setShowCentreItemModal(true)}
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Centre Component
                  </OwnButton>
                </div>

                {centreItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    <p className="font-medium text-foreground">No centre-specific overrides configured.</p>
                    <p className="text-muted-foreground mt-0.5">Employees at this centre inherit Enterprise defaults.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-foreground">
                      <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-3">Component Name</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Calculation</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Recurrence</th>
                          <th className="px-4 py-3">Affects Payroll</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {centreItems.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-semibold text-foreground">{item.name}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  item.component_type === 'DEDUCTION'
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                              >
                                {item.component_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{item.calculation_type}</td>
                            <td className="px-4 py-3 font-mono font-semibold">
                              {item.calculation_type === 'PERCENTAGE' ? `${item.amount}%` : `₹${Number(item.amount).toLocaleString()}`}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{item.frequency}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.affects_payroll
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                              >
                                {item.affects_payroll ? 'ON' : 'OFF'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </OwnCard>
            </>
          )}
        </div>
      )}

      {/* MODAL: Employee Profile on Salary Tab */}
      {selectedEmployeeId && (
        <EmployeeProfileModal
          employeeId={selectedEmployeeId}
          isOpen={showEmployeeModal}
          onClose={() => {
            setShowEmployeeModal(false)
            setSelectedEmployeeId(null)
          }}
          initialTab="salary"
          onUpdate={loadEmployees}
        />
      )}

      {/* MODAL: Enterprise Schedule Edit */}
      <OwnDialog
        open={showEnterpriseSchedModal}
        onOpenChange={setShowEnterpriseSchedModal}
        title="Edit Enterprise Default Schedule"
        description="Configure default salary slip generation schedule and deadlines across the enterprise."
        size="md"
      >
        <form onSubmit={handleSaveEnterpriseSchedule} className="space-y-4">
          <OwnSelect
            label="Generation Frequency"
            value={enterpriseSchedForm.generation_type}
            onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, generation_type: e.target.value }))}
            options={[
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'WEEKLY', label: 'Weekly' },
              { value: 'DAILY', label: 'Daily' },
            ]}
          />

          {enterpriseSchedForm.generation_type === 'MONTHLY' && (
            <OwnInput
              type="number"
              label="Monthly Generation Date (1 - 31)"
              min={1}
              max={31}
              value={enterpriseSchedForm.generation_date}
              onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, generation_date: parseInt(e.target.value, 10) || 1 }))}
            />
          )}

          {enterpriseSchedForm.generation_type === 'WEEKLY' && (
            <OwnSelect
              label="Weekly Generation Day"
              value={String(enterpriseSchedForm.generation_weekday ?? 0)}
              onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, generation_weekday: parseInt(e.target.value, 10) || 0 }))}
              options={[
                { value: '0', label: 'Monday' },
                { value: '1', label: 'Tuesday' },
                { value: '2', label: 'Wednesday' },
                { value: '3', label: 'Thursday' },
                { value: '4', label: 'Friday' },
                { value: '5', label: 'Saturday' },
                { value: '6', label: 'Sunday' },
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <OwnInput
              type="number"
              label="Editing Window Duration"
              min={1}
              max={30}
              value={enterpriseSchedForm.editable_period_duration}
              onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, editable_period_duration: parseInt(e.target.value, 10) || 3 }))}
            />
            <OwnSelect
              label="Editing Window Unit"
              value={enterpriseSchedForm.editing_period_unit}
              onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, editing_period_unit: e.target.value }))}
              options={[
                { value: 'DAYS', label: 'Days' },
                { value: 'HOURS', label: 'Hours' },
              ]}
            />
          </div>

          <OwnSelect
            label="Salary Slip Visibility Policy"
            value={enterpriseSchedForm.visibility_policy}
            onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, visibility_policy: e.target.value }))}
            options={[
              { value: 'ON_FINALIZATION', label: 'On Payroll Finalization' },
              { value: 'ON_RELEASE', label: 'On Explicit Release' },
              { value: 'ON_PAYMENT_DATE', label: 'On Expected Payment Date' },
            ]}
          />

          <OwnInput
            type="text"
            label="Audit Change Reason"
            required
            value={enterpriseSchedForm.change_reason}
            onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, change_reason: e.target.value }))}
            placeholder="Explain reason for schedule update..."
          />

          <OwnDialogFooter>
            <OwnButton type="button" variant="ghost" onClick={() => setShowEnterpriseSchedModal(false)}>
              Cancel
            </OwnButton>
            <OwnButton type="submit" variant="primary" loading={submitting}>
              Save Enterprise Schedule
            </OwnButton>
          </OwnDialogFooter>
        </form>
      </OwnDialog>

      {/* MODAL: Enterprise / Centre Item Create */}
      <OwnDialog
        open={showEnterpriseItemModal || showCentreItemModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowEnterpriseItemModal(false)
            setShowCentreItemModal(false)
          }
        }}
        title={showEnterpriseItemModal ? 'Add Enterprise Compensation Component' : 'Add Centre Compensation Override'}
        description="Configure a new itemized allowance, bonus, or deduction."
        size="md"
      >
        <form onSubmit={showEnterpriseItemModal ? handleSaveEnterpriseItem : handleSaveCentreItem} className="space-y-4">
          <OwnInput
            label="Component Name"
            required
            value={itemForm.name}
            onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Travel Allowance, Performance Bonus, Health Deduction"
          />

          <div className="grid grid-cols-2 gap-3">
            <OwnSelect
              label="Component Type"
              value={itemForm.component_type}
              onChange={(e) => setItemForm((f) => ({ ...f, component_type: e.target.value }))}
              options={[
                { value: 'EARNING', label: 'Earning / Allowance' },
                { value: 'BONUS', label: 'Bonus' },
                { value: 'ALLOWANCE', label: 'Allowance' },
                { value: 'DEDUCTION', label: 'Deduction' },
              ]}
            />

            <OwnSelect
              label="Calculation Type"
              value={itemForm.calculation_type}
              onChange={(e) => setItemForm((f) => ({ ...f, calculation_type: e.target.value }))}
              options={[
                { value: 'FIXED_AMOUNT', label: 'Fixed Amount (₹)' },
                { value: 'PERCENTAGE', label: 'Percentage of Base (%)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <OwnInput
              type="number"
              step="0.01"
              label={itemForm.calculation_type === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount (₹)'}
              required
              value={itemForm.amount}
              onChange={(e) => setItemForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder={itemForm.calculation_type === 'PERCENTAGE' ? '10' : '2000'}
            />

            <OwnSelect
              label="Payment Frequency"
              value={itemForm.frequency}
              onChange={(e) => setItemForm((f) => ({ ...f, frequency: e.target.value }))}
              options={[
                { value: 'RECURRING', label: 'Recurring Monthly' },
                { value: 'WEEKLY', label: 'Recurring Weekly' },
                { value: 'ONE_TIME', label: 'One-Time' },
              ]}
            />
          </div>

          <OwnInput
            type="date"
            label="Effective From"
            required
            value={itemForm.effective_from}
            onChange={(e) => setItemForm((f) => ({ ...f, effective_from: e.target.value }))}
          />

          <OwnInput
            type="text"
            label="Reason / Audit Note"
            value={itemForm.reason}
            onChange={(e) => setItemForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Audit notes or rationale..."
          />

          <OwnDialogFooter>
            <OwnButton
              type="button"
              variant="ghost"
              onClick={() => {
                setShowEnterpriseItemModal(false)
                setShowCentreItemModal(false)
              }}
            >
              Cancel
            </OwnButton>
            <OwnButton type="submit" variant="primary" loading={submitting}>
              Save Component
            </OwnButton>
          </OwnDialogFooter>
        </form>
      </OwnDialog>

      {/* MODAL: Centre Schedule Override */}
      <OwnDialog
        open={showCentreSchedModal}
        onOpenChange={setShowCentreSchedModal}
        title="Configure Centre Schedule Override"
        description="Set custom payroll generation frequency and deadlines for this centre."
        size="md"
      >
        <form onSubmit={handleSaveCentreSchedule} className="space-y-4">
          <OwnSelect
            label="Generation Frequency"
            value={enterpriseSchedForm.generation_type}
            onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, generation_type: e.target.value }))}
            options={[
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'WEEKLY', label: 'Weekly' },
              { value: 'DAILY', label: 'Daily' },
            ]}
          />

          {enterpriseSchedForm.generation_type === 'MONTHLY' && (
            <OwnInput
              type="number"
              label="Monthly Generation Date (1 - 31)"
              min={1}
              max={31}
              value={enterpriseSchedForm.generation_date}
              onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, generation_date: parseInt(e.target.value, 10) || 1 }))}
            />
          )}

          {enterpriseSchedForm.generation_type === 'WEEKLY' && (
            <OwnSelect
              label="Weekly Generation Day"
              value={String(enterpriseSchedForm.generation_weekday ?? 0)}
              onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, generation_weekday: parseInt(e.target.value, 10) || 0 }))}
              options={[
                { value: '0', label: 'Monday' },
                { value: '1', label: 'Tuesday' },
                { value: '2', label: 'Wednesday' },
                { value: '3', label: 'Thursday' },
                { value: '4', label: 'Friday' },
                { value: '5', label: 'Saturday' },
                { value: '6', label: 'Sunday' },
              ]}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <OwnInput
              type="number"
              label="Editing Window Duration"
              min={1}
              max={30}
              value={enterpriseSchedForm.editable_period_duration}
              onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, editable_period_duration: parseInt(e.target.value, 10) || 3 }))}
            />
            <OwnSelect
              label="Editing Window Unit"
              value={enterpriseSchedForm.editing_period_unit}
              onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, editing_period_unit: e.target.value }))}
              options={[
                { value: 'DAYS', label: 'Days' },
                { value: 'HOURS', label: 'Hours' },
              ]}
            />
          </div>

          <OwnSelect
            label="Salary Slip Visibility Policy"
            value={enterpriseSchedForm.visibility_policy}
            onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, visibility_policy: e.target.value }))}
            options={[
              { value: 'ON_FINALIZATION', label: 'On Payroll Finalization' },
              { value: 'ON_RELEASE', label: 'On Explicit Release' },
              { value: 'ON_PAYMENT_DATE', label: 'On Expected Payment Date' },
            ]}
          />

          <OwnInput
            type="text"
            label="Audit Change Reason"
            required
            value={enterpriseSchedForm.change_reason}
            onChange={(e) => setEnterpriseSchedForm((f) => ({ ...f, change_reason: e.target.value }))}
            placeholder="Reason for centre schedule override..."
          />

          <OwnDialogFooter>
            <OwnButton type="button" variant="ghost" onClick={() => setShowCentreSchedModal(false)}>
              Cancel
            </OwnButton>
            <OwnButton type="submit" variant="primary" loading={submitting}>
              Save Centre Override
            </OwnButton>
          </OwnDialogFooter>
        </form>
      </OwnDialog>
    </div>
  )
}

export default Compensation
