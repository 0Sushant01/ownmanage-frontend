import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Download,
  Search,
  ArrowLeft,
  Eye,
  Building2,
  Clock,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Send,
  Calendar,
  CreditCard,
  Banknote,
  Wallet,
  Receipt,
  Trash2,
  Edit2,
  Info,
} from 'lucide-react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CentreSelector } from '../components/CentreSelector'
import type { Payroll, PayrollAdjustment } from '../types'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnFilterBar } from '../design-system/components/OwnFilterBar'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { OwnCard } from '../design-system/components/OwnCard'
import { OwnStatusBadge } from '../design-system/components/OwnBadge'
import { OwnDialog } from '../design-system/components/OwnDialog'
import { OwnEmptyState } from '../design-system/components/OwnEmptyState'

export interface EmployeeSalaryOverviewItem {
  id: string
  employee_id: string
  full_name: string
  email: string
  phone: string
  centre_id: string | null
  centre_name: string
  department_name: string
  employment_status: string
  has_payroll: boolean
  total_payrolls_count: number
  last_salary: number | null
  last_salary_formatted: string
  currency: string
  status: string
  status_display: string
  next_salary_date?: string | null
  latest_payroll: {
    id: string
    period_start: string
    period_end: string
    gross_amount: number
    total_deductions: number
    net_amount: number
    paid_amount?: number
    balance_amount?: number
    currency: string
    status: string
    status_display: string
    generated_at: string | null
    finalized_at: string | null
    released_at: string | null
    receipt_number?: string | null
    generation_date?: string | null
    expected_payment_date: string | null
    actual_payment_date?: string | null
    next_period_start?: string | null
    next_period_end?: string | null
    next_generation_date?: string | null
    next_salary_date?: string | null
  } | null
}

export const Salary: React.FC = () => {
  const { role } = useAuth()

  // 1. Main Employee Table State (One row per employee)
  const [employees, setEmployees] = useState<EmployeeSalaryOverviewItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filters (No month/date filter on main overview)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCentre, setSelectedCentre] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Pagination
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(25)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)

  // 2. Selected Employee & Salary Details State
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSalaryOverviewItem | null>(null)
  const [employeeHistory, setEmployeeHistory] = useState<Payroll[]>([])
  const [activeRecord, setActiveRecord] = useState<Payroll | null>(null)
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Action states
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // 3. Add / Edit Component Modal State
  const [compModalOpen, setCompModalOpen] = useState<boolean>(false)
  const [compModalType, setCompModalType] = useState<'BASIC' | 'ALLOWANCE' | 'BONUS' | 'DEDUCTION'>('ALLOWANCE')
  const [editingAdjId, setEditingAdjId] = useState<string | null>(null)
  const [compName, setCompName] = useState<string>('')
  const [compAmount, setCompAmount] = useState<string>('')
  const [compReason, setCompReason] = useState<string>('')
  const [compSaving, setCompSaving] = useState<boolean>(false)
  const [compError, setCompError] = useState<string | null>(null)

  // 4. Remove Component Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [deletingAdj, setDeletingAdj] = useState<PayrollAdjustment | null>(null)
  const [deletingItemName, setDeletingItemName] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  // 5. Make Payment Modal State
  const [showPayModal, setShowPayModal] = useState<boolean>(false)
  const [payAmount, setPayAmount] = useState<string>('')
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CARD' | 'OTHER'>('BANK_TRANSFER')
  const [payTransactionId, setPayTransactionId] = useState<string>('')
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [payNotes, setPayNotes] = useState<string>('')
  const [paying, setPaying] = useState<boolean>(false)
  const [payError, setPayError] = useState<string | null>(null)

  // 6. Payment History Modal State
  const [showPayHistoryModal, setShowPayHistoryModal] = useState<boolean>(false)

  // 7. Calculation Details Modal State
  const [showCalcDetailsModal, setShowCalcDetailsModal] = useState<boolean>(false)

  // 8. Generate Salary Modal State (for employee with 0 records)
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false)
  const [genPeriodStart, setGenPeriodStart] = useState<string>('')
  const [genPeriodEnd, setGenPeriodEnd] = useState<string>('')
  const [generating, setGenerating] = useState<boolean>(false)

  // 9. PDF Downloading State
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false)

  // 10. Status Dropdown State
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<boolean>(false)
  const statusDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Date formatters
  const formatPeriodMonth = (startStr?: string | null) => {
    if (!startStr) return '—'
    try {
      const [y, m] = startStr.split('-')
      const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } catch {
      return startStr
    }
  }

  const formatDateDisplay = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const formatDateTimeDisplay = (dtStr?: string | null) => {
    if (!dtStr) return '—'
    try {
      const d = new Date(dtStr)
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dtStr
    }
  }

  // 1. Fetch Employee-Centric Salary Directory (1 row per employee)
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = {
        page,
        page_size: pageSize,
      }
      if (searchQuery.trim()) params.search = searchQuery.trim()
      if (selectedCentre && selectedCentre !== 'all') params.centre_id = selectedCentre
      if (statusFilter) params.status = statusFilter

      const res = await apiClient.get('/salary/employee-overview/', { params })
      const data = res.data
      if (data && Array.isArray(data.results)) {
        setEmployees(data.results)
        setTotalCount(data.count || data.results.length)
        setTotalPages(data.total_pages || 1)
      } else if (Array.isArray(data)) {
        setEmployees(data)
        setTotalCount(data.length)
        setTotalPages(1)
      } else {
        setEmployees([])
        setTotalCount(0)
        setTotalPages(1)
      }
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employee salary overview.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, searchQuery, selectedCentre, statusFilter])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setPage(1)
  }

  const handleCentreChange = (val: string) => {
    setSelectedCentre(val)
    setPage(1)
  }

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val)
    setPage(1)
  }

  // 2. View Employee: Load Salary History & Open Latest Generated Record Directly
  const handleViewEmployee = async (emp: EmployeeSalaryOverviewItem) => {
    setSelectedEmployee(emp)
    setDetailsLoading(true)
    setHistoryError(null)
    setActionError(null)
    setActionSuccess(null)

    try {
      const res = await apiClient.get('/salary/payrolls/', {
        params: { employee_id: emp.id },
      })
      const records: Payroll[] = Array.isArray(res.data)
        ? res.data
        : res.data.results || []

      // Order chronologically reverse by period_start
      records.sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime())
      setEmployeeHistory(records)

      if (records.length > 0) {
        // Open latest existing record directly
        setActiveRecord(records[0])
      } else {
        setActiveRecord(null)
        // Setup initial default period for Generate Salary dialog (current month)
        const now = new Date()
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
        setGenPeriodStart(`${y}-${m}-01`)
        setGenPeriodEnd(`${y}-${m}-${lastDay}`)
      }
    } catch (err: any) {
      setHistoryError(err.response?.data?.detail || 'Failed to load salary records for this employee.')
      setActiveRecord(null)
    } finally {
      setDetailsLoading(false)
    }
  }

  // 3. Select an Older Record from the Salary History Table
  const handleSelectHistoryRecord = (record: Payroll) => {
    setActiveRecord(record)
    setActionError(null)
    setActionSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 4. Status Transition Handler (Enforces backend permissions and state rules)
  const handleStatusTransition = async (newStatus: 'RELEASED') => {
    if (!activeRecord) return
    const confirmMsg = 'Officially release this salary record? This will make the payslip available to the employee.'

    if (!window.confirm(confirmMsg)) return

    setActionLoading(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      const res = await apiClient.patch(`/salary/payrolls/${activeRecord.id}/`, {
        status: newStatus,
      })
      const updatedRecord: Payroll = res.data
      setActiveRecord(updatedRecord)
      setEmployeeHistory((prev) =>
        prev.map((p) => (p.id === updatedRecord.id ? updatedRecord : p))
      )
      setActionSuccess(`Salary record released successfully.`)
      loadEmployees()
    } catch (err: any) {
      setActionError(err.response?.data?.status || err.response?.data?.detail || 'Failed to update salary status.')
    } finally {
      setActionLoading(false)
    }
  }

  // 5. Open Add Component Modal
  const handleOpenAddComponent = (type: 'ALLOWANCE' | 'BONUS' | 'DEDUCTION') => {
    setCompModalType(type)
    setEditingAdjId(null)
    setCompName('')
    setCompAmount('')
    setCompReason('')
    setCompError(null)
    setCompModalOpen(true)
  }

  // Open Edit Base Salary Modal
  const handleOpenEditBaseSalary = () => {
    setCompModalType('BASIC')
    setEditingAdjId(null)
    setCompName('Base Salary')
    setCompAmount(String(baseSalaryAmount))
    setCompReason('')
    setCompError(null)
    setCompModalOpen(true)
  }

  // Open Edit Component Modal (for matching adjustment)
  const handleOpenEditComponent = (adj: PayrollAdjustment) => {
    setCompModalType(
      adj.adjustment_type === 'BONUS'
        ? 'BONUS'
        : adj.adjustment_type === 'BASIC'
        ? 'BASIC'
        : adj.is_deduction
        ? 'DEDUCTION'
        : 'ALLOWANCE'
    )
    setEditingAdjId(adj.id)
    setCompName(adj.name)
    setCompAmount(String(adj.new_amount))
    setCompReason(adj.reason || '')
    setCompError(null)
    setCompModalOpen(true)
  }

  // Open Edit Line Item Modal (supports both matching adjustments and profile items)
  const handleOpenEditLineItem = (
    item: { name: string; amount: number | string },
    matchingAdj: PayrollAdjustment | undefined,
    defaultType: 'ALLOWANCE' | 'BONUS' | 'DEDUCTION'
  ) => {
    if (matchingAdj) {
      handleOpenEditComponent(matchingAdj)
      return
    }
    setCompModalType(defaultType)
    setEditingAdjId(null)
    setCompName(item.name)
    setCompAmount(String(item.amount))
    setCompReason('')
    setCompError(null)
    setCompModalOpen(true)
  }


  // Open Delete Line Item Modal (supports items with or without adjustment records)
  const handleOpenDeleteLineItem = (itemName: string, matchingAdj: PayrollAdjustment | undefined) => {
    setDeletingAdj(matchingAdj || null)
    setDeletingItemName(itemName)
    setDeleteModalOpen(true)
  }

  // Save Component Handler (POST /salary/payrolls/<pk>/adjust/)
  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRecord) return

    if (!compName.trim()) {
      setCompError('Component name is required.')
      return
    }
    const amt = parseFloat(compAmount)
    if (isNaN(amt) || amt <= 0) {
      setCompError('Please enter a valid amount greater than zero.')
      return
    }

    setCompSaving(true)
    setCompError(null)
    try {
      const payload: any = {
        name: compName.trim(),
        amount: amt.toFixed(2),
        adjustment_type: compModalType,
        is_deduction: compModalType === 'DEDUCTION',
        reason: compReason.trim() || (compModalType === 'BASIC' ? 'Adjusted base salary by administrator' : `Adjusted by administrator`),
      }
      if (editingAdjId) {
        payload.adjustment_id = editingAdjId
      }

      const res = await apiClient.post(`/salary/payrolls/${activeRecord.id}/adjust/`, payload)
      const updatedPayroll: Payroll = res.data.payroll || res.data
      setActiveRecord(updatedPayroll)
      setEmployeeHistory((prev) =>
        prev.map((p) => (p.id === updatedPayroll.id ? updatedPayroll : p))
      )
      setCompModalOpen(false)
      setActionSuccess(`${compModalType === 'BASIC' ? 'Base salary' : compModalType} "${compName.trim()}" updated successfully!`)
      loadEmployees()
    } catch (err: any) {
      setCompError(
        err.response?.data?.name ||
        err.response?.data?.amount ||
        err.response?.data?.reason ||
        err.response?.data?.detail ||
        'Failed to save component.'
      )
    } finally {
      setCompSaving(false)
    }
  }

  // Confirm Delete Component (DELETE /salary/payrolls/<pk>/adjust/)
  const handleConfirmDeleteComponent = async () => {
    if (!activeRecord || (!deletingAdj && !deletingItemName)) return
    setDeleting(true)
    try {
      const params: any = {
        reason: 'Removed by administrator',
      }
      if (deletingAdj) {
        params.adjustment_id = deletingAdj.id
      } else if (deletingItemName) {
        params.name = deletingItemName
      }

      const res = await apiClient.delete(`/salary/payrolls/${activeRecord.id}/adjust/`, { params })
      const updatedPayroll: Payroll = res.data.payroll || res.data
      setActiveRecord(updatedPayroll)
      setEmployeeHistory((prev) =>
        prev.map((p) => (p.id === updatedPayroll.id ? updatedPayroll : p))
      )
      const removedLabel = deletingItemName || deletingAdj?.name || 'Component'
      setDeleteModalOpen(false)
      setDeletingAdj(null)
      setDeletingItemName(null)
      setActionSuccess(`Component "${removedLabel}" removed successfully!`)
      loadEmployees()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to remove component.')
    } finally {
      setDeleting(false)
    }
  }

  // 6. Record Payment Modal & Handlers
  const openPayModal = () => {
    if (!activeRecord) return
    const bal = Number(activeRecord.balance_amount !== undefined ? activeRecord.balance_amount : activeRecord.net_amount)
    setPayAmount(bal > 0 ? bal.toFixed(2) : '')
    setPayMethod('BANK_TRANSFER')
    setPayTransactionId('')
    setPayDate(new Date().toISOString().split('T')[0])
    setPayNotes('')
    setPayError(null)
    setShowPayModal(true)
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRecord) return
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) {
      setPayError('Please enter a valid payment amount greater than zero.')
      return
    }
    const currentBalance = Number(activeRecord.balance_amount !== undefined ? activeRecord.balance_amount : activeRecord.net_amount)
    if (amt > currentBalance) {
      setPayError(`Payment amount cannot exceed the remaining balance (${activeRecord.currency} ${currentBalance.toLocaleString()}).`)
      return
    }

    if (payMethod !== 'CASH' && !payTransactionId.trim()) {
      setPayError(`Transaction / UTR Reference ID is required for ${payMethod.replace('_', ' ')} payments.`)
      return
    }

    setPaying(true)
    setPayError(null)
    try {
      const payload: any = {
        amount: amt,
        payment_method: payMethod,
        payment_date: payDate,
        notes: payNotes.trim(),
      }
      if (payMethod !== 'CASH') {
        payload.transaction_id = payTransactionId.trim()
      } else {
        payload.transaction_id = payTransactionId.trim() || ''
      }

      const res = await apiClient.post(`/salary/payrolls/${activeRecord.id}/pay/`, payload)
      const updatedPayroll: Payroll = res.data.payroll || res.data
      setActiveRecord(updatedPayroll)
      setEmployeeHistory((prev) =>
        prev.map((p) => (p.id === updatedPayroll.id ? updatedPayroll : p))
      )
      setShowPayModal(false)
      setActionSuccess(`Payment of ${activeRecord.currency} ${amt.toLocaleString()} recorded successfully via ${payMethod.replace('_', ' ')}!`)
      loadEmployees()
    } catch (err: any) {
      setPayError(
        err.response?.data?.amount ||
        err.response?.data?.transaction_id ||
        err.response?.data?.payment_method ||
        err.response?.data?.detail ||
        'Failed to record payment.'
      )
    } finally {
      setPaying(false)
    }
  }

  // 7. Generate Real Downloadable PDF Payslip
  const handleDownloadPdf = async () => {
    if (!activeRecord) return
    setDownloadingPdf(true)
    try {
      const res = await apiClient.get(`/salary/payrolls/${activeRecord.id}/pdf/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      const empCode = activeRecord.employee_id_code || selectedEmployee?.employee_id || 'EMP'
      link.setAttribute('download', `payslip_${empCode}_${activeRecord.period_start}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download PDF payslip.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // 8. Generate Salary Modal for Employee with 0 Records
  const handleGenerateSalary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return
    if (!genPeriodStart || !genPeriodEnd) {
      setActionError('Please select period start and end dates.')
      return
    }

    setGenerating(true)
    setActionError(null)
    try {
      const payload: any = {
        period_start: genPeriodStart,
        period_end: genPeriodEnd,
        employee_id: selectedEmployee.id,
      }
      if (selectedEmployee.centre_id) {
        payload.centre_id = selectedEmployee.centre_id
      }
      await apiClient.post('/payroll/runs/', payload)
      setShowGenerateModal(false)
      setActionSuccess(`Salary calculation generated successfully for ${selectedEmployee.full_name}!`)
      await loadEmployees()
      await handleViewEmployee(selectedEmployee)
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Failed to generate payroll calculation.')
    } finally {
      setGenerating(false)
    }
  }

  // 9. Export Payroll Register CSV
  const handleExportPayrollRegister = async () => {
    try {
      const params = new URLSearchParams({ format: 'csv' })
      if (selectedCentre && selectedCentre !== 'all') {
        params.append('centre_id', selectedCentre)
      }
      if (statusFilter && statusFilter !== 'NO_SALARY') {
        params.append('status', statusFilter)
      }
      const res = await apiClient.get(`/salary/reports/payroll-register/?${params.toString()}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payroll_register_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to export payroll register.')
    }
  }

  // Check if editing deadline has passed
  const isDeadlinePassed = Boolean(
    activeRecord?.editing_deadline && new Date() > new Date(activeRecord.editing_deadline)
  )

  // Determine if editing is allowed on the active record
  const isEditingAllowed = Boolean(
    activeRecord &&
    activeRecord.is_editing_open !== false &&
    !isDeadlinePassed &&
    !['FINALIZED', 'RELEASED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED'].includes(activeRecord.status) &&
    role !== 'STAFF'
  )

  // Canonical 4-state payroll status
  const canonicalStatus: 'DRAFT' | 'RELEASED' | 'PARTIALLY_PAID' | 'PAID' = activeRecord
    ? activeRecord.status === 'PAID'
      ? 'PAID'
      : activeRecord.status === 'PARTIALLY_PAID'
      ? 'PARTIALLY_PAID'
      : activeRecord.status === 'RELEASED'
      ? 'RELEASED'
      : activeRecord.status === 'FINALIZED'
      ? (activeRecord.released_at ? 'RELEASED' : 'DRAFT')
      : 'DRAFT'
    : 'DRAFT'

  // Informational label: Payment Pending (when salary is released and no payment has been recorded)
  const isPaymentPending = Boolean(
    activeRecord &&
    canonicalStatus === 'RELEASED' &&
    (!activeRecord.paid_amount || Number(activeRecord.paid_amount) === 0 || !activeRecord.payments || activeRecord.payments.length === 0)
  )

  // Informational label: Upcoming Generation date from configured payroll schedule
  const upcomingGenerationDate = activeRecord?.next_generation_date || activeRecord?.next_salary_date || null

  // Line items categorizations for the activeRecord
  const lineItems = activeRecord?.line_items || []
  const adjustments = activeRecord?.adjustments || []

  // Base salary: check numeric value greater than zero first to prevent "0.00" string falsy bug
  const baseLineItem = lineItems.find((l) => l.line_type === 'BASIC' || l.name.toLowerCase().startsWith('base') || l.name.toLowerCase().startsWith('basic') || l.name.toLowerCase().startsWith('daily wage') || l.name.toLowerCase().startsWith('weekly base'))
  const baseSalaryAmount = Number(
    Number(activeRecord?.base_salary_amount) > 0
      ? activeRecord?.base_salary_amount
      : (baseLineItem?.amount || 0)
  )

  // Overtime
  const otLineItem = lineItems.find((l) => l.line_type === 'OVERTIME')
  const otHours = Number(activeRecord?.ot_hours || 0)
  const otAmount = Number(otLineItem?.amount || 0)
  const isOvertimeApplicable = otHours > 0 || otAmount > 0

  // Allowances (include ALLOWANCE or EARNING that is not basic/overtime/bonus)
  const allowancesList = lineItems.filter(
    (l) =>
      !l.is_deduction &&
      (l.line_type === 'ALLOWANCE' ||
        (l.line_type === 'EARNING' &&
          !l.name.toLowerCase().includes('bonus') &&
          !l.name.toLowerCase().includes('incentive') &&
          !l.name.toLowerCase().startsWith('base') &&
          !l.name.toLowerCase().startsWith('basic') &&
          !l.name.toLowerCase().startsWith('daily wage') &&
          !l.name.toLowerCase().startsWith('weekly base') &&
          !l.name.toLowerCase().includes('contract') &&
          !l.name.toLowerCase().includes('overtime')))
  )

  // Bonuses (include BONUS or EARNING with 'bonus' or 'incentive')
  const bonusesList = lineItems.filter(
    (l) =>
      !l.is_deduction &&
      (l.line_type === 'BONUS' ||
        (l.line_type === 'EARNING' &&
          (l.name.toLowerCase().includes('bonus') || l.name.toLowerCase().includes('incentive'))))
  )

  // Deductions
  const deductionsList = lineItems.filter((l) => l.is_deduction)

  // Helper to find matching adjustment record for a line item
  const findMatchingAdjustment = (name: string, isDed: boolean) => {
    return adjustments.find((adj) => adj.name.toLowerCase() === name.toLowerCase() && adj.is_deduction === isDed)
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Page Header (Only shown on directory list view) */}
      {!selectedEmployee && (
        <OwnPageHeader
          title="Payslips & Register"
          description={
            role === 'STAFF'
              ? 'View your generated payslips and compensation breakdowns.'
              : 'Employee-based salary directory and historical payroll register.'
          }
          breadcrumbs={[
            { label: 'Workspace', href: '/' },
            { label: 'Payroll & Compensation', href: '/compensation' },
            { label: 'Payslips & Register' },
          ]}
          actions={
            role !== 'STAFF' ? (
              <OwnButton
                onClick={handleExportPayrollRegister}
                variant="secondary"
                size="md"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                title="Download accounting & disbursal payroll register CSV"
              >
                Export Register (CSV)
              </OwnButton>
            ) : undefined
          }
        />
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: MAIN EMPLOYEE SALARY TABLE (ONE ROW PER EMPLOYEE)               */}
      {/* ========================================================================= */}
      {!selectedEmployee ? (
        <>
          {/* Filters Bar: Search, Centre, Status (NO Month Filter) */}
          <OwnFilterBar
            filters={
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full">
                {/* Search by Name, Employee ID, or Email */}
                <div className="flex-1 min-w-[240px] max-w-md">
                  <OwnInput
                    placeholder="Search employee by name, ID, or email..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
                    size="md"
                  />
                </div>

                {/* Centre Selector */}
                {role !== 'STAFF' && (
                  <div className="w-48 sm:w-56">
                    <CentreSelector
                      value={selectedCentre}
                      onChange={handleCentreChange}
                      showAllOption={true}
                    />
                  </div>
                )}

                {/* Status Filter */}
                <div className="w-44 sm:w-48">
                  <OwnSelect
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'DRAFT', label: 'Draft' },
                      { value: 'RELEASED', label: 'Released' },
                      { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                      { value: 'PAID', label: 'Paid in Full' },
                      { value: 'NO_SALARY', label: 'No Salary Generated' },
                    ]}
                    size="md"
                  />
                </div>
              </div>
            }
          />

          {/* Directory Content */}
          {loading ? (
            <OwnCard className="p-12 text-center text-muted-foreground">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
              <p className="text-sm font-medium">Loading employee salary records...</p>
            </OwnCard>
          ) : error ? (
            <OwnCard className="p-8 text-center text-destructive">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-medium">{error}</p>
            </OwnCard>
          ) : employees.length === 0 ? (
            <OwnEmptyState
              title="No employees found"
              description="No employees matched the specified filters or centre scope."
            />
          ) : (
            <OwnCard className="overflow-hidden border-border bg-card shadow-xs">
              {/* Mobile View: Cards */}
              <div className="block md:hidden divide-y divide-border">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => handleViewEmployee(emp)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{emp.full_name}</h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          {emp.employee_id} • {emp.centre_name}
                        </p>
                      </div>
                      {emp.has_payroll ? (
                        <OwnStatusBadge status={emp.status} size="sm" />
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                          No salary generated
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Last Salary:</span>
                        <span className="font-mono font-bold text-foreground">
                          {emp.last_salary !== null
                            ? `${emp.currency} ${Number(emp.last_salary).toLocaleString()}`
                            : '—'}
                        </span>
                        {emp.latest_payroll && (
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            {formatPeriodMonth(emp.latest_payroll.period_start)}
                          </span>
                        )}
                      </div>

                      <OwnButton
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewEmployee(emp)
                        }}
                        variant="secondary"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        View Statement
                      </OwnButton>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Wide Table with Exactly 1 Row Per Employee */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-muted/60 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Centre</th>
                      <th className="px-6 py-4">Last Salary</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => handleViewEmployee(emp)}
                      >
                        {/* Employee Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {emp.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {emp.employee_id} {emp.department_name ? `• ${emp.department_name}` : ''}
                          </div>
                        </td>

                        {/* Centre Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-foreground">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{emp.centre_name}</span>
                          </div>
                        </td>

                        {/* Last Salary Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {emp.has_payroll ? (
                            <div>
                              <span className="font-mono text-sm font-bold text-foreground">
                                {emp.currency} {Number(emp.last_salary).toLocaleString()}
                              </span>
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border">
                                {formatPeriodMonth(emp.latest_payroll?.period_start)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground font-mono text-sm">—</span>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {emp.has_payroll ? (
                            <OwnStatusBadge status={emp.status} size="sm" />
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                              No salary generated
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <OwnButton
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewEmployee(emp)
                            }}
                            variant="ghost"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            View
                          </OwnButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} employees
                  </span>
                  <div className="flex items-center gap-2">
                    <OwnButton
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      variant="secondary"
                      size="sm"
                      leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                    >
                      Previous
                    </OwnButton>
                    <span className="font-mono text-xs">
                      Page {page} of {totalPages}
                    </span>
                    <OwnButton
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      variant="secondary"
                      size="sm"
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Next
                    </OwnButton>
                  </div>
                </div>
              )}
            </OwnCard>
          )}
        </>
      ) : (
        /* ========================================================================= */
        /* SCREEN 2: COMPACT PROFESSIONAL SALARY STATEMENT                           */
        /* ========================================================================= */
        <div className="space-y-5">
          {/* Action and feedback alerts */}
          {(actionError || historyError) && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError || historyError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {detailsLoading ? (
            <OwnCard className="p-12 text-center text-muted-foreground">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
              <p className="text-sm font-medium">
                Loading salary statement for {selectedEmployee.full_name}...
              </p>
            </OwnCard>
          ) : activeRecord ? (
            <>
              {/* ================================================================= */}
              {/* SECTION 1: COMPACT EMPLOYEE HEADER                                */}
              {/* ================================================================= */}
              <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedEmployee(null)
                        setActiveRecord(null)
                      }}
                      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer mr-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Register
                    </button>
                    <span className="text-muted-foreground/40 hidden sm:inline">|</span>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                      {selectedEmployee.full_name}
                    </h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
                      {selectedEmployee.employee_id}
                    </span>
                    <OwnStatusBadge status={activeRecord.status} size="sm" />
                    {activeRecord.receipt_number && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground border border-border font-medium flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-primary" />
                        {activeRecord.receipt_number}
                      </span>
                    )}
                    {employeeHistory.length > 0 && activeRecord.id === employeeHistory[0].id && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                        <Sparkles className="w-3 h-3" /> Latest
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {selectedEmployee.department_name && (
                      <span>{selectedEmployee.department_name}</span>
                    )}
                    {selectedEmployee.centre_name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          {selectedEmployee.centre_name}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span className="font-mono font-medium text-foreground">
                      Period: {formatPeriodMonth(activeRecord.period_start)} ({activeRecord.period_start} → {activeRecord.period_end})
                    </span>
                  </div>
                </div>

                {/* Header Action Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <OwnButton
                    onClick={handleDownloadPdf}
                    variant="secondary"
                    size="sm"
                    disabled={downloadingPdf}
                    leftIcon={<FileText className="w-3.5 h-3.5 text-primary" />}
                  >
                    {downloadingPdf
                      ? 'Generating PDF...'
                      : ['DRAFT', 'PROCESSED'].includes(activeRecord.status)
                      ? 'Preview Draft PDF'
                      : 'Generate PDF Payslip'}
                  </OwnButton>

                  <OwnButton
                    onClick={() => setShowCalcDetailsModal(true)}
                    variant="secondary"
                    size="sm"
                    leftIcon={<Info className="w-3.5 h-3.5" />}
                  >
                    Calculation Details
                  </OwnButton>

                  {canonicalStatus === 'DRAFT' && role !== 'STAFF' && (
                    <OwnButton
                      onClick={() => handleStatusTransition('RELEASED')}
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      Release Salary
                    </OwnButton>
                  )}

                  {['RELEASED', 'PARTIALLY_PAID'].includes(canonicalStatus) && Number(activeRecord.balance_amount ?? activeRecord.net_amount) > 0 && role !== 'STAFF' && (
                    <OwnButton
                      onClick={openPayModal}
                      variant="primary"
                      size="sm"
                      leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                    >
                      Record Payment
                    </OwnButton>
                  )}
                </div>
              </div>

              {/* ================================================================= */}
              {/* EDITING WINDOW DEADLINE NOTIFICATION BANNER                       */}
              {/* ================================================================= */}
              {activeRecord.editing_deadline && (
                <div
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm ${
                    isEditingAllowed
                      ? 'bg-primary/5 border-primary/20 text-foreground'
                      : ['FINALIZED', 'RELEASED', 'PAID'].includes(activeRecord.status)
                      ? 'bg-muted/40 border-border text-muted-foreground'
                      : 'bg-warning/10 border-warning/20 text-warning'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isEditingAllowed ? (
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                    ) : ['FINALIZED', 'RELEASED', 'PAID'].includes(activeRecord.status) ? (
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                    )}
                    <div>
                      {isEditingAllowed ? (
                        <>
                          <span className="font-semibold text-foreground">Editing Window Open: </span>
                          <span>
                            Ordinary edits and component adjustments are permitted until{' '}
                            <strong className="font-mono text-primary">
                              {formatDateTimeDisplay(activeRecord.editing_deadline)}
                            </strong>.
                          </span>
                        </>
                      ) : ['FINALIZED', 'RELEASED', 'PAID'].includes(activeRecord.status) ? (
                        <>
                          <span className="font-semibold text-foreground">Payroll Record Frozen: </span>
                          <span>
                            This salary record is in <strong className="font-mono">{activeRecord.status}</strong> state.
                            Calculation snapshots and attendance records are permanently locked.
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-foreground">Editing Window Closed: </span>
                          <span>
                            The configured editing deadline was{' '}
                            <strong className="font-mono">
                              {formatDateTimeDisplay(activeRecord.editing_deadline)}
                            </strong>.
                            Ordinary edits and manual adjustments are now disabled.
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground shrink-0">
                    Window: Configured Schedule
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* SECTION 5 & 6: NEXT SALARY & PAYMENT MANAGEMENT (COMPACT STRIP)   */}
              {/* ================================================================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Section 5: Salary Schedule & Cycle Dates */}
                <OwnCard className="p-4 border-border bg-card shadow-xs">
                  <div className="flex items-center justify-between mb-3 border-b border-border/70 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Salary Schedule & Cycle Dates
                    </h4>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Schedule Rules
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                      <span className="text-[11px] text-muted-foreground block">Record Generation Date</span>
                      <span className="font-mono font-bold text-foreground text-sm mt-0.5 block">
                        {activeRecord.generation_date
                          ? formatDateDisplay(activeRecord.generation_date)
                          : formatDateDisplay(activeRecord.generated_at)}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                        Cycle {activeRecord.period_start} → {activeRecord.period_end}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                      <span className="text-[11px] text-muted-foreground block">
                        {activeRecord.actual_payment_date ? 'Payment Disbursed On' : 'Expected Payment Date'}
                      </span>
                      <span className="font-mono font-bold text-foreground text-sm mt-0.5 block">
                        {activeRecord.actual_payment_date
                          ? formatDateDisplay(activeRecord.actual_payment_date)
                          : activeRecord.expected_payment_date
                          ? formatDateDisplay(activeRecord.expected_payment_date)
                          : 'Not configured'}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                        {activeRecord.actual_payment_date ? 'Disbursed in ledger' : 'Configured disbursement rule'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                      <span className="text-[11px] text-muted-foreground block">Next Salary Period</span>
                      <span className="font-mono font-bold text-foreground text-sm mt-0.5 block truncate">
                        {activeRecord.next_period_start && activeRecord.next_period_end
                          ? `${formatDateDisplay(activeRecord.next_period_start)} – ${formatDateDisplay(activeRecord.next_period_end)}`
                          : 'Following cycle'}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                        Contiguous next cycle
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                      <span className="text-[11px] text-muted-foreground block">Upcoming Generation</span>
                      <span className="font-mono font-bold text-primary text-sm mt-0.5 block">
                        {activeRecord.next_generation_date || activeRecord.next_salary_date
                          ? formatDateDisplay(activeRecord.next_generation_date || activeRecord.next_salary_date)
                          : 'Not scheduled'}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                        Configured payroll schedule
                      </span>
                    </div>
                  </div>
                </OwnCard>

                {/* Section 6: Payment Management */}
                <OwnCard className="p-4 border-border bg-card shadow-xs">
                  <div className="flex items-center justify-between mb-3 border-b border-border/70 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                      Payment Management
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground">
                        Status: <OwnStatusBadge status={canonicalStatus} size="sm" />
                      </span>
                      {isPaymentPending && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Payment Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs mb-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Net Payable:</span>
                      <span className="font-mono font-bold text-sm text-foreground">
                        {activeRecord.currency} {Number(activeRecord.net_amount).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Total Paid:</span>
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {activeRecord.currency} {Number(activeRecord.paid_amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Balance Due:</span>
                      <span className="font-mono font-bold text-sm text-primary">
                        {activeRecord.currency}{' '}
                        {Number(
                          activeRecord.balance_amount !== undefined
                            ? activeRecord.balance_amount
                            : activeRecord.net_amount
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    {activeRecord.payments && activeRecord.payments.length > 0 && (
                      <OwnButton
                        onClick={() => setShowPayHistoryModal(true)}
                        variant="secondary"
                        size="sm"
                        leftIcon={<Receipt className="w-3.5 h-3.5" />}
                      >
                        Payment History ({activeRecord.payments.length})
                      </OwnButton>
                    )}

                    {role !== 'STAFF' && (
                      <OwnButton
                        onClick={openPayModal}
                        variant="primary"
                        size="sm"
                        disabled={Number(activeRecord.balance_amount ?? activeRecord.net_amount) <= 0}
                        leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                      >
                        {Number(activeRecord.balance_amount ?? activeRecord.net_amount) <= 0
                          ? 'Fully Paid'
                          : 'Record Payment'}
                      </OwnButton>
                    )}
                  </div>
                </OwnCard>
              </div>

              {/* ================================================================= */}
              {/* SECTION 2 & 4: PRIMARY SALARY STATEMENT BREAKDOWN & TOTALS        */}
              {/* ================================================================= */}
              <OwnCard className="border-border bg-card shadow-xs overflow-hidden">
                {/* Statement Title Bar */}
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-primary" />
                      Salary Statement & Itemized Breakdown
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Authoritative compensation components for period {activeRecord.period_start} to {activeRecord.period_end}.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5" ref={statusDropdownRef}>
                    {/* Informational Label 1: Upcoming Generation (Displayed separately from status) */}
                    {upcomingGenerationDate && (
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted/60 text-foreground border border-border shadow-2xs"
                        title="Next scheduled payroll generation date calculated from configured schedule"
                      >
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-[11px] text-muted-foreground font-normal">Upcoming Generation:</span>
                        <span className="font-mono font-bold text-primary">
                          {formatDateDisplay(upcomingGenerationDate)}
                        </span>
                      </div>
                    )}

                    {/* Informational Label 2: Payment Pending (Displayed when salary is released and no payment recorded) */}
                    {isPaymentPending && (
                      <div
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-warning/10 text-warning border border-warning/30 shadow-2xs"
                        title="Salary has been released but payment has not yet been recorded in the ledger"
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Payment Pending</span>
                      </div>
                    )}

                    {/* Payroll Status Control Beside Currency Badge */}
                    <div className="relative">
                      <button
                        onClick={() => setStatusDropdownOpen((prev) => !prev)}
                        disabled={actionLoading || role === 'STAFF'}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-border bg-background hover:bg-muted/80 text-foreground transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed shadow-2xs"
                        title="Payroll lifecycle status and permitted actions"
                      >
                        <span className="text-muted-foreground text-[11px] font-normal">Status:</span>
                        <OwnStatusBadge status={canonicalStatus} size="sm" />
                        {role !== 'STAFF' && ['DRAFT', 'RELEASED', 'PARTIALLY_PAID'].includes(canonicalStatus) && (
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                              statusDropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </button>

                      {statusDropdownOpen && role !== 'STAFF' && (
                        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-border bg-popover text-popover-foreground p-1.5 shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
                          <div className="px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground border-b border-border/70 flex items-center justify-between mb-1">
                            <span>Payroll Status</span>
                            <span className="font-mono text-[10px] text-muted-foreground/80">
                              {canonicalStatus}
                            </span>
                          </div>

                          <div className="space-y-1">
                            {canonicalStatus === 'DRAFT' && (
                              <>
                                <div className="p-2 rounded-md bg-muted/40 text-[11px] text-muted-foreground space-y-0.5">
                                  <p className="font-semibold text-foreground">Draft</p>
                                  <p>Salary generated and awaiting review or release.</p>
                                  {isEditingAllowed ? (
                                    <p className="text-primary font-medium">Permitted editing is open during editing window.</p>
                                  ) : (
                                    <p className="text-amber-600 dark:text-amber-400">Editing window is closed.</p>
                                  )}
                                </div>

                                <button
                                  onClick={() => {
                                    setStatusDropdownOpen(false)
                                    handleStatusTransition('RELEASED')
                                  }}
                                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-muted text-xs flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Send className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <div>
                                    <div className="font-semibold text-foreground">Release Salary</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Officially release; makes payslip available to employee
                                    </div>
                                  </div>
                                </button>
                              </>
                            )}

                            {canonicalStatus === 'RELEASED' && (
                              <div className="p-2 space-y-2">
                                <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground space-y-0.5">
                                  <p className="font-semibold text-foreground">Released</p>
                                  <p>Salary officially released; payment may still be pending.</p>
                                </div>
                                <button
                                  onClick={() => {
                                    setStatusDropdownOpen(false)
                                    openPayModal()
                                  }}
                                  className="w-full text-left px-2.5 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-xs flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <div>
                                    <div className="font-semibold text-foreground">Record Payment</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Disburse via Cash, Bank Transfer, or UPI
                                    </div>
                                  </div>
                                </button>
                              </div>
                            )}

                            {canonicalStatus === 'PARTIALLY_PAID' && (
                              <div className="p-2 space-y-2">
                                <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground space-y-0.5">
                                  <p className="font-semibold text-foreground">Partially Paid</p>
                                  <p>Partial payment received, with an outstanding balance.</p>
                                </div>
                                <button
                                  onClick={() => {
                                    setStatusDropdownOpen(false)
                                    openPayModal()
                                  }}
                                  className="w-full text-left px-2.5 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-xs flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <div>
                                    <div className="font-semibold text-foreground">Record Payment</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      Disburse remaining balance
                                    </div>
                                  </div>
                                </button>
                              </div>
                            )}

                            {canonicalStatus === 'PAID' && (
                              <div className="p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div>
                                  <div className="font-semibold text-foreground">Paid</div>
                                  <div className="text-[10px]">
                                    Full salary payment completed and recorded.
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-mono font-semibold text-muted-foreground px-2 py-1 rounded bg-background border border-border shadow-2xs">
                      Currency: {activeRecord.currency}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-6">
                  {/* GROUP A: BASE SALARY */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Base Salary
                      </h4>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {activeRecord.salary_unit ? `${activeRecord.salary_unit.toLowerCase()} basis` : 'Monthly basis'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border/50 text-sm">
                      <div>
                        <span className="font-semibold text-foreground">Base Salary Remuneration</span>
                        <p className="text-xs text-muted-foreground">
                          {activeRecord.paid_days !== undefined ? (
                            <>Paid days: <span className="font-mono text-foreground font-medium">{activeRecord.paid_days}</span> of <span className="font-mono text-foreground font-medium">{activeRecord.working_days || 30}</span> scheduled days.</>
                          ) : (
                            'Standard compensation base.'
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-base text-foreground">
                          {activeRecord.currency} {baseSalaryAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {isEditingAllowed && (
                          <button
                            onClick={handleOpenEditBaseSalary}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            title="Edit base salary for this period"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* GROUP B: OVERTIME (RENDERED ONLY IF APPLICABLE) */}
                  {isOvertimeApplicable && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Overtime
                        </h4>
                        <span className="text-[11px] text-primary font-mono font-medium">
                          {otHours} hrs approved
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20 border border-border/50 text-sm">
                        <div>
                          <span className="font-semibold text-foreground">Overtime Compensation</span>
                          <p className="text-xs text-muted-foreground">
                            {otHours} hours logged at overtime rate.
                          </p>
                        </div>
                        <span className="font-mono font-bold text-sm text-foreground">
                          +{activeRecord.currency} {otAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* GROUP C: ALLOWANCES */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Allowances
                        </h4>
                        <span className="text-xs text-muted-foreground">({allowancesList.length})</span>
                      </div>
                      {isEditingAllowed ? (
                        <OwnButton
                          onClick={() => handleOpenAddComponent('ALLOWANCE')}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          leftIcon={<Plus className="w-3 h-3 text-primary" />}
                        >
                          Add Allowance
                        </OwnButton>
                      ) : (
                        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60">
                          {isDeadlinePassed ? 'Window closed' : 'Locked'}
                        </span>
                      )}
                    </div>

                    {allowancesList.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2 px-3">
                        No allowances applicable for this period.
                      </p>
                    ) : (
                      <div className="divide-y divide-border/60 border border-border/50 rounded-lg overflow-hidden bg-muted/10">
                        {allowancesList.map((item, idx) => {
                          const matchingAdj = findMatchingAdjustment(item.name, false)
                          return (
                            <div key={item.id || idx} className="p-3 flex items-center justify-between gap-4 text-sm hover:bg-muted/30 transition-colors">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{item.name}</span>
                                  {matchingAdj ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                                      One-Time Adjustment
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
                                      Recurring Profile
                                    </span>
                                  )}
                                </div>
                                {matchingAdj?.reason && (
                                  <p className="text-xs text-muted-foreground">
                                    Reason: {matchingAdj.reason}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-foreground">
                                  +{activeRecord.currency} {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>

                                {isEditingAllowed && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOpenEditLineItem(item, matchingAdj, 'ALLOWANCE')}
                                      className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                      title="Edit allowance"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenDeleteLineItem(item.name, matchingAdj)}
                                      className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                      title="Remove allowance"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* GROUP D: BONUSES */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Bonuses
                        </h4>
                        <span className="text-xs text-muted-foreground">({bonusesList.length})</span>
                      </div>
                      {isEditingAllowed ? (
                        <OwnButton
                          onClick={() => handleOpenAddComponent('BONUS')}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          leftIcon={<Plus className="w-3 h-3 text-primary" />}
                        >
                          Add Bonus
                        </OwnButton>
                      ) : (
                        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60">
                          {isDeadlinePassed ? 'Window closed' : 'Locked'}
                        </span>
                      )}
                    </div>

                    {bonusesList.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2 px-3">
                        No bonuses applicable for this period.
                      </p>
                    ) : (
                      <div className="divide-y divide-border/60 border border-border/50 rounded-lg overflow-hidden bg-muted/10">
                        {bonusesList.map((item, idx) => {
                          const matchingAdj = findMatchingAdjustment(item.name, false)
                          return (
                            <div key={item.id || idx} className="p-3 flex items-center justify-between gap-4 text-sm hover:bg-muted/30 transition-colors">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{item.name}</span>
                                  {matchingAdj && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                                      One-Time Adjustment
                                    </span>
                                  )}
                                </div>
                                {matchingAdj?.reason && (
                                  <p className="text-xs text-muted-foreground">
                                    Reason: {matchingAdj.reason}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-foreground">
                                  +{activeRecord.currency} {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>

                                {isEditingAllowed && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOpenEditLineItem(item, matchingAdj, 'BONUS')}
                                      className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                      title="Edit bonus"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenDeleteLineItem(item.name, matchingAdj)}
                                      className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                      title="Remove bonus"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* GROUP E: DEDUCTIONS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Deductions
                        </h4>
                        <span className="text-xs text-muted-foreground">({deductionsList.length})</span>
                      </div>
                      {isEditingAllowed ? (
                        <OwnButton
                          onClick={() => handleOpenAddComponent('DEDUCTION')}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          leftIcon={<Plus className="w-3 h-3 text-destructive" />}
                        >
                          Add Deduction
                        </OwnButton>
                      ) : (
                        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60">
                          {isDeadlinePassed ? 'Window closed' : 'Locked'}
                        </span>
                      )}
                    </div>

                    {deductionsList.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2 px-3">
                        No deductions applied for this period.
                      </p>
                    ) : (
                      <div className="divide-y divide-border/60 border border-border/50 rounded-lg overflow-hidden bg-muted/10">
                        {deductionsList.map((item, idx) => {
                          const matchingAdj = findMatchingAdjustment(item.name, true)
                          const isAttendancePolicy =
                            item.name.toLowerCase().includes('absence') ||
                            item.name.toLowerCase().includes('late') ||
                            item.name.toLowerCase().includes('half') ||
                            item.name.toLowerCase().includes('leave')

                          return (
                            <div key={item.id || idx} className="p-3 flex items-center justify-between gap-4 text-sm hover:bg-muted/30 transition-colors">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{item.name}</span>
                                  {matchingAdj ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                                      One-Time Adjustment
                                    </span>
                                  ) : isAttendancePolicy ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20 font-medium">
                                      System Policy
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
                                      Recurring Profile
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {matchingAdj?.reason || (isAttendancePolicy ? 'Evaluated from attendance exceptions & policy rules' : 'Configured statutory or voluntary deduction')}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-destructive">
                                  -{activeRecord.currency} {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>

                                {isEditingAllowed && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleOpenEditLineItem(item, matchingAdj, 'DEDUCTION')}
                                      className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                      title="Edit deduction"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenDeleteLineItem(item.name, matchingAdj)}
                                      className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                      title="Remove deduction"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* =============================================================== */}
                {/* SECTION 4: AUTHORITATIVE TOTALS SUMMARY BAR                     */}
                {/* =============================================================== */}
                <div className="p-4 sm:p-6 bg-muted/40 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-sm">
                    <div>
                      <span className="text-xs uppercase font-bold text-muted-foreground block">
                        Total Earnings (Gross)
                      </span>
                      <span className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                        +{activeRecord.currency} {Number(activeRecord.gross_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs uppercase font-bold text-muted-foreground block">
                        Total Deductions
                      </span>
                      <span className="text-lg font-bold font-mono text-destructive mt-0.5 block">
                        -{activeRecord.currency} {Number(activeRecord.total_deductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right pt-3 sm:pt-0 border-t sm:border-t-0 border-border/70">
                    <span className="text-xs uppercase font-bold text-primary block">
                      Net Salary
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold font-mono text-primary mt-0.5 block">
                      {activeRecord.currency} {Number(activeRecord.net_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </OwnCard>

              {/* ================================================================= */}
              {/* SECTION 8: SALARY HISTORY TABLE (AT BOTTOM OF PAGE)               */}
              {/* ================================================================= */}
              <OwnCard className="border-border bg-card shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Salary History
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Chronological ledger of all generated salary records for {selectedEmployee.full_name}.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {employeeHistory.length} record{employeeHistory.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-foreground">
                    <thead className="bg-muted/60 uppercase font-semibold text-[11px] text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-5 py-3.5">Salary Period</th>
                        <th className="px-5 py-3.5">Base Salary</th>
                        <th className="px-5 py-3.5">Net Salary</th>
                        <th className="px-5 py-3.5">Payroll Status</th>
                        <th className="px-5 py-3.5">Payment Status / Date</th>
                        <th className="px-5 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {employeeHistory.map((rec) => {
                        const isCurrentActive = rec.id === activeRecord.id
                        const recPaid = Number(rec.paid_amount || 0)
                        const recNet = Number(rec.net_amount)
                        const isFullyPaid = recPaid >= recNet && recNet > 0
                        const isPartiallyPaid = recPaid > 0 && recPaid < recNet
                        const recCanonicalStatus: 'DRAFT' | 'RELEASED' | 'PARTIALLY_PAID' | 'PAID' =
                          rec.status === 'PAID'
                            ? 'PAID'
                            : rec.status === 'PARTIALLY_PAID'
                            ? 'PARTIALLY_PAID'
                            : rec.status === 'RELEASED'
                            ? 'RELEASED'
                            : rec.status === 'FINALIZED'
                            ? (rec.released_at ? 'RELEASED' : 'DRAFT')
                            : 'DRAFT'

                        return (
                          <tr
                            key={rec.id}
                            className={`hover:bg-muted/20 transition-colors ${
                              isCurrentActive ? 'bg-primary/5 font-medium' : ''
                            }`}
                          >
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="font-semibold text-foreground">
                                {formatPeriodMonth(rec.period_start)}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono block">
                                {rec.period_start} → {rec.period_end}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap font-mono">
                              {rec.currency} {Number(rec.base_salary_amount || 0).toLocaleString()}
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-foreground">
                              {rec.currency} {recNet.toLocaleString()}
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <OwnStatusBadge status={recCanonicalStatus} size="sm" />
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {isFullyPaid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
                                </span>
                              ) : isPartiallyPaid ? (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                  <Clock className="w-3.5 h-3.5" /> Partial ({rec.currency} {recPaid.toLocaleString()})
                                </span>
                              ) : recCanonicalStatus === 'RELEASED' ? (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                  <Clock className="w-3.5 h-3.5" /> Payment Pending
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  Awaiting Release
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap text-right">
                              {isCurrentActive ? (
                                <span className="text-[11px] font-semibold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                                  Viewing Active
                                </span>
                              ) : (
                                <OwnButton
                                  onClick={() => handleSelectHistoryRecord(rec)}
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<Eye className="w-3 h-3" />}
                                >
                                  View
                                </OwnButton>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </OwnCard>
            </>
          ) : (
            /* ================================================================= */
            /* ZERO SALARY RECORDS STATE (1-CLICK GENERATE SALARY)               */
            /* ================================================================= */
            <OwnCard className="p-12 text-center border-border bg-card shadow-xs space-y-4">
              <Banknote className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">
                  No Generated Salary Records Found
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {selectedEmployee.full_name} does not have any processed or finalized salary records yet.
                  You can calculate and generate their initial salary statement now.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <OwnButton
                  onClick={() => {
                    setSelectedEmployee(null)
                    setActiveRecord(null)
                  }}
                  variant="secondary"
                  size="md"
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Back to Register
                </OwnButton>

                {role !== 'STAFF' && (
                  <OwnButton
                    onClick={() => setShowGenerateModal(true)}
                    variant="primary"
                    size="md"
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Generate Initial Salary
                  </OwnButton>
                )}
              </div>
            </OwnCard>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT COMPONENT (ALLOWANCE / BONUS / DEDUCTION / BASIC)        */}
      {/* ========================================================================= */}
      {compModalOpen && activeRecord && (
        <OwnDialog
          open={compModalOpen}
          onOpenChange={(open) => {
            if (!open) setCompModalOpen(false)
          }}
          title={
            compModalType === 'BASIC'
              ? 'Edit Base Salary Remuneration'
              : editingAdjId
              ? `Edit ${compModalType.toLowerCase()}`
              : compModalType === 'ALLOWANCE'
              ? 'Add Allowance'
              : compModalType === 'BONUS'
              ? 'Add Bonus'
              : 'Add Deduction'
          }
          description={
            compModalType === 'BASIC'
              ? `Adjust base salary for ${activeRecord.employee_name} (${activeRecord.period_start} to ${activeRecord.period_end}). Does not alter master compensation configuration.`
              : `One-time ${compModalType.toLowerCase()} adjustment for ${activeRecord.employee_name} (${activeRecord.period_start} to ${activeRecord.period_end}).`
          }
          size="md"
        >
          <form onSubmit={handleSaveComponent} className="space-y-4">
            {compError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{compError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Component Name *
              </label>
              <OwnInput
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                disabled={compModalType === 'BASIC'}
                placeholder={
                  compModalType === 'BASIC'
                    ? 'Base Salary'
                    : compModalType === 'ALLOWANCE'
                    ? 'e.g. Special Project Allowance, Travel Stippend'
                    : compModalType === 'BONUS'
                    ? 'e.g. Quarterly Performance Bonus, Festival Bonus'
                    : 'e.g. Advance Salary Recovery, Equipment Damage Cut'
                }
                required
                size="md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Amount ({activeRecord.currency}) *
              </label>
              <OwnInput
                type="number"
                step="0.01"
                min="0.01"
                value={compAmount}
                onChange={(e) => setCompAmount(e.target.value)}
                placeholder="0.00"
                required
                size="md"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Description / Reason *
              </label>
              <OwnInput
                value={compReason}
                onChange={(e) => setCompReason(e.target.value)}
                placeholder={
                  compModalType === 'BASIC'
                    ? 'e.g. Approved ad-hoc base salary adjustment for this period'
                    : 'Reason or justification for this adjustment (audit logged)...'
                }
                required
                size="md"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              {compModalType === 'BASIC'
                ? 'This adjustment updates the base salary for this pay period only. The employee\'s permanent compensation configuration remains untouched.'
                : 'This adjustment is specific to this selected salary record and will not alter future compensation configurations.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <OwnButton
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setCompModalOpen(false)}
              >
                Cancel
              </OwnButton>
              <OwnButton
                type="submit"
                variant="primary"
                size="md"
                disabled={compSaving}
              >
                {compSaving ? 'Saving...' : compModalType === 'BASIC' ? 'Update Base Salary' : 'Save Component'}
              </OwnButton>
            </div>
          </form>
        </OwnDialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM REMOVE COMPONENT                                           */}
      {/* ========================================================================= */}
      {deleteModalOpen && (deletingAdj || deletingItemName) && activeRecord && (
        <OwnDialog
          open={deleteModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteModalOpen(false)
              setDeletingAdj(null)
              setDeletingItemName(null)
            }
          }}
          title="Remove Component"
          description={`Are you sure you want to remove "${deletingItemName || deletingAdj?.name}" from this salary record?`}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              This will remove the line item ({activeRecord.currency} {Number(deletingAdj ? deletingAdj.new_amount : (activeRecord.line_items?.find(li => li.name === deletingItemName)?.amount || 0)).toLocaleString()}) and recalculate the net salary payable.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <OwnButton
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setDeleteModalOpen(false)
                  setDeletingAdj(null)
                  setDeletingItemName(null)
                }}
              >
                Cancel
              </OwnButton>
              <OwnButton
                type="button"
                variant="destructive"
                size="md"
                disabled={deleting}
                onClick={handleConfirmDeleteComponent}
              >
                {deleting ? 'Removing...' : 'Remove Component'}
              </OwnButton>
            </div>
          </div>
        </OwnDialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD PAYMENT                                                     */}
      {/* ========================================================================= */}
      {showPayModal && activeRecord && (
        <OwnDialog
          open={showPayModal}
          onOpenChange={(open) => {
            if (!open) setShowPayModal(false)
          }}
          title={`Record Payment — ${activeRecord.employee_name}`}
          description={`Record partial or full salary disbursement for ${activeRecord.period_start} to ${activeRecord.period_end}.`}
          size="md"
        >
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {payError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            {/* Balance Overview */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-muted/40 rounded-xl border border-border text-xs">
              <div>
                <p className="text-[11px] text-muted-foreground">Net Salary</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {activeRecord.currency} {Number(activeRecord.net_amount || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Paid so far</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {activeRecord.currency} {Number(activeRecord.paid_amount || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Remaining Balance</p>
                <p className="font-bold text-primary mt-0.5">
                  {activeRecord.currency} {Number(activeRecord.balance_amount !== undefined ? activeRecord.balance_amount : activeRecord.net_amount).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Quick Amount Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Payment Amount ({activeRecord.currency}) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const rem = Number(activeRecord.balance_amount !== undefined ? activeRecord.balance_amount : activeRecord.net_amount)
                    setPayAmount(rem > 0 ? rem.toFixed(2) : '0')
                  }}
                  className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Pay Full Balance
                </button>
              </div>
              <OwnInput
                type="number"
                step="0.01"
                min="0.01"
                max={Number(activeRecord.balance_amount !== undefined ? activeRecord.balance_amount : activeRecord.net_amount)}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount to pay..."
                required
                size="md"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Payment Method *
              </label>
              <OwnSelect
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                options={[
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer (NEFT / RTGS / IMPS)' },
                  { value: 'UPI', label: 'UPI / QR Code' },
                  { value: 'CASH', label: 'Cash (No Transaction ID required)' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'CARD', label: 'Card Payment' },
                  { value: 'OTHER', label: 'Other Electronic Method' },
                ]}
                size="md"
              />
            </div>

            {/* Transaction ID / UTR or Cash Info */}
            {payMethod === 'CASH' ? (
              <div className="p-3 bg-muted/30 border border-dashed border-border rounded-xl text-xs text-muted-foreground flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Cash payment selected. No Transaction ID or UTR reference is required.
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Transaction ID / UTR Reference *</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Required for {payMethod.replace('_', ' ')}</span>
                </label>
                <OwnInput
                  type="text"
                  value={payTransactionId}
                  onChange={(e) => setPayTransactionId(e.target.value)}
                  placeholder="e.g. UTR / Ref / Check No. / Transaction ID"
                  required
                  size="md"
                />
              </div>
            )}

            {/* Payment Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Payment Date *
              </label>
              <OwnInput
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                required
                size="md"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Payment Notes / Remarks (Optional)
              </label>
              <OwnInput
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Optional remarks (e.g. advance deduction, bonus included)..."
                size="md"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <OwnButton
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setShowPayModal(false)}
              >
                Cancel
              </OwnButton>
              <OwnButton
                type="submit"
                variant="primary"
                size="md"
                disabled={paying}
                leftIcon={<CreditCard className="w-3.5 h-3.5" />}
              >
                {paying ? 'Recording Payment...' : 'Record Payment'}
              </OwnButton>
            </div>
          </form>
        </OwnDialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAYMENT HISTORY                                                    */}
      {/* ========================================================================= */}
      {showPayHistoryModal && activeRecord && (
        <OwnDialog
          open={showPayHistoryModal}
          onOpenChange={(open) => {
            if (!open) setShowPayHistoryModal(false)
          }}
          title={`Payment History — ${activeRecord.employee_name}`}
          description={`Historical payment disbursements recorded for period ${activeRecord.period_start} to ${activeRecord.period_end}.`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-[11px] uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Transaction / UTR Reference</th>
                    <th className="px-4 py-3">Recorded By</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {activeRecord.payments && activeRecord.payments.length > 0 ? (
                    activeRecord.payments.map((pmt) => (
                      <tr key={pmt.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-foreground">
                          {formatDateDisplay(pmt.payment_date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {activeRecord.currency} {Number(pmt.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border">
                            {pmt.payment_method_display || pmt.payment_method.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono">
                          {pmt.payment_method === 'CASH' ? (
                            <span className="text-muted-foreground">Cash Payment — No Txn ID</span>
                          ) : pmt.transaction_id ? (
                            <span className="font-semibold text-foreground">{pmt.transaction_id}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {pmt.recorded_by_name || 'Administrator'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                          {pmt.notes || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No payments recorded yet for this salary record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <OwnButton
                onClick={() => setShowPayHistoryModal(false)}
                variant="secondary"
                size="md"
              >
                Close
              </OwnButton>
            </div>
          </div>
        </OwnDialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CALCULATION DETAILS (SECONDARY TECHNICAL METRICS DRAWER)           */}
      {/* ========================================================================= */}
      {showCalcDetailsModal && activeRecord && (
        <OwnDialog
          open={showCalcDetailsModal}
          onOpenChange={(open) => {
            if (!open) setShowCalcDetailsModal(false)
          }}
          title={`Calculation Details — ${activeRecord.employee_name}`}
          description={`Policy evaluations and attendance metrics for ${activeRecord.period_start} to ${activeRecord.period_end}.`}
          size="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">Working Days</span>
                <span className="font-mono font-bold text-foreground text-base mt-0.5 block">
                  {activeRecord.working_days ?? 30}
                </span>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">Paid Days</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5 block">
                  {activeRecord.paid_days ?? 30}
                </span>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">Unpaid Days</span>
                <span className="font-mono font-bold text-destructive text-base mt-0.5 block">
                  {activeRecord.unpaid_days ?? 0}
                </span>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">Half Days</span>
                <span className="font-mono font-bold text-foreground text-base mt-0.5 block">
                  {activeRecord.half_days ?? 0}
                </span>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">Overtime Hours</span>
                <span className="font-mono font-bold text-primary text-base mt-0.5 block">
                  {activeRecord.ot_hours ?? '0.00'} hrs
                </span>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">Exceptions Logged</span>
                <span className="font-mono font-bold text-foreground text-base mt-0.5 block">
                  {activeRecord.exceptions?.length || 0}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-muted/30 rounded-xl border border-border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Snapshot Generated:</span>
                <span className="font-mono text-foreground">{formatDateDisplay(activeRecord.generated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Finalized At:</span>
                <span className="font-mono text-foreground">{formatDateDisplay(activeRecord.finalized_at) || 'Not finalized'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Released At:</span>
                <span className="font-mono text-foreground">{formatDateDisplay(activeRecord.released_at) || 'Not released'}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <OwnButton
                onClick={() => setShowCalcDetailsModal(false)}
                variant="secondary"
                size="md"
              >
                Close
              </OwnButton>
            </div>
          </div>
        </OwnDialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERATE SALARY (FOR EMPLOYEE WITH NO GENERATED SALARY)            */}
      {/* ========================================================================= */}
      {showGenerateModal && selectedEmployee && (
        <OwnDialog
          open={showGenerateModal}
          onOpenChange={(open) => {
            if (!open) setShowGenerateModal(false)
          }}
          title={`Generate Initial Salary — ${selectedEmployee.full_name}`}
          description={`Calculate payroll for ${selectedEmployee.centre_name} (${selectedEmployee.employee_id}).`}
          size="md"
        >
          <form onSubmit={handleGenerateSalary} className="space-y-4">
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-semibold text-foreground">{selectedEmployee.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Centre:</span>
                <span className="font-semibold text-foreground">{selectedEmployee.centre_name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Period Start Date
                </label>
                <OwnInput
                  type="date"
                  value={genPeriodStart}
                  onChange={(e) => setGenPeriodStart(e.target.value)}
                  required
                  size="md"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Period End Date
                </label>
                <OwnInput
                  type="date"
                  value={genPeriodEnd}
                  onChange={(e) => setGenPeriodEnd(e.target.value)}
                  required
                  size="md"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              This will execute the policy-driven salary calculation engine for the selected period, incorporating attendance, working hours, and approved compensation components.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <OwnButton
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </OwnButton>
              <OwnButton
                type="submit"
                variant="primary"
                size="md"
                disabled={generating}
                leftIcon={<Play className="w-3.5 h-3.5" />}
              >
                {generating ? 'Calculating...' : 'Calculate Payroll'}
              </OwnButton>
            </div>
          </form>
        </OwnDialog>
      )}
    </div>
  )
}

export default Salary
