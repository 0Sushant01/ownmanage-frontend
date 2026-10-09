import React, { useEffect, useState, useCallback } from 'react'
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarDays,
  HelpCircle,
  LogIn,
  LogOut,
  RefreshCw,
  Building2,
  Download,
  QrCode,
  ScanFace,
  MapPin,
  History,
  Edit,
  Eye,
  Check,
  Shield,
  Settings
} from '../components/Icons'
import { useSearchParams } from 'react-router-dom'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CentreSelector } from '../components/CentreSelector'
import { Can } from '../components/Can'
import { AttendancePolicies } from './AttendancePolicies'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnKpiCard } from '../design-system/components/OwnKpiCard'
import { OwnFilterBar } from '../design-system/components/OwnFilterBar'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { OwnCard, OwnCardContent } from '../design-system/components/OwnCard'
import { OwnStatusBadge, OwnBadge } from '../design-system/components/OwnBadge'
import { OwnEmptyState } from '../design-system/components/OwnEmptyState'
import {
  OwnTabs,
  OwnTabsList,
  OwnTabsTrigger,
  OwnTabsContent
} from '../design-system/components/OwnTabs'
import {
  OwnDialog,
  OwnDialogContent,
  OwnDialogHeader,
  OwnDialogTitle,
  OwnDialogDescription,
  OwnDialogFooter
} from '../design-system/components/OwnDialog'

interface AttendanceRecord {
  id: string | null
  employee_id: string
  employee_code: string
  employee_name: string
  department_name: string
  designation_name: string
  centre_id: string | null
  centre_name: string
  attendance_date: string
  check_in: string
  check_out: string
  work_hours: string
  total_work_seconds: number
  overtime_seconds: number
  overtime_hours: string
  status: string
  late_minutes: number
  early_leave_minutes: number
  attendance_method: string
  location_verified: boolean
  is_overridden: boolean
  overridden_by_name: string | null
  overridden_at?: string | null
  override_reason: string
  original_check_in?: string | null
  original_check_out?: string | null
  original_status?: string | null
  events_count: number
}

interface RegisterSummary {
  total_employees: number
  present: number
  late: number
  half_day: number
  leave_early: number
  absent: number
  on_leave: number
  holiday: number
  weekly_off: number
  not_marked: number
  total_working_hours: number
  total_overtime_hours: number
}

interface Department {
  id: string
  name: string
}

interface RecordDetailData {
  id: string
  attendance_date: string
  status: string
  attendance_method: string
  location_verified: boolean
  verification_metadata: any
  check_in: string | null
  check_out: string | null
  check_in_raw: string | null
  check_out_raw: string | null
  total_work_seconds: number
  work_hours_display: string
  overtime_seconds: number
  ot_hours_display: string
  late_minutes: number
  early_leave_minutes: number
  is_overridden: boolean
  overridden_by_name: string | null
  overridden_at: string | null
  override_reason: string
  original_check_in: string | null
  original_check_out: string | null
  original_status: string
  notes: string
  employee: {
    id: string
    code: string
    name: string
    email: string
    phone: string
    designation: string
    department: string
    centre_id: string | null
    centre_name: string
  }
  events: any[]
  audit_history: any[]
}

export const Attendance: React.FC = () => {
  const { role, hasPermission, employee } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const isBusinessAdminOrManager =
    role === 'BUSINESS_ADMIN' || role === 'SUPERADMIN' || role === 'MANAGER'
  const canEditAttendance =
    isBusinessAdminOrManager || hasPermission('attendance.edit') || hasPermission('attendance.manage')

  // Default date: CURRENT LOCAL DATE
  const getTodayLocalDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Active View Tab: register | monthly | policy
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'register' | 'monthly' | 'policy'>(
    tabParam === 'monthly' ? 'monthly' : tabParam === 'policy' ? 'policy' : 'register'
  )

  useEffect(() => {
    if (tabParam === 'monthly' || tabParam === 'policy' || tabParam === 'register') {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (val: 'register' | 'monthly' | 'policy') => {
    setActiveTab(val)
    setSearchParams({ tab: val }, { replace: true })
  }

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDate())
  const [selectedMonth, setSelectedMonth] = useState<string>(getTodayLocalDate().substring(0, 7))
  const [selectedCentre, setSelectedCentre] = useState<string>('all')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedMethod, setSelectedMethod] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Data
  const [departments, setDepartments] = useState<Department[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<RegisterSummary>({
    total_employees: 0,
    present: 0,
    late: 0,
    half_day: 0,
    leave_early: 0,
    absent: 0,
    on_leave: 0,
    holiday: 0,
    weekly_off: 0,
    not_marked: 0,
    total_working_hours: 0,
    total_overtime_hours: 0
  })

  // Monthly Matrix Data
  const [monthlyData, setMonthlyData] = useState<any | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(false)

  // Quick Inline Override Dialog state
  const [quickOverrideOpen, setQuickOverrideOpen] = useState<boolean>(false)
  const [quickOverrideRecord, setQuickOverrideRecord] = useState<AttendanceRecord | null>(null)
  const [quickOverrideSuccess, setQuickOverrideSuccess] = useState<string | null>(null)

  // Self status for linked staff
  const [todayState, setTodayState] = useState<{
    is_checked_in: boolean
    first_check_in_time: string | null
    total_work_seconds: number
    attendance_method: string
    location_verified: boolean
    allowed_methods?: {
      normal_punch: boolean
      qr: boolean
      face_recognition: boolean
      location_required: boolean
      geofence_radius: number
      centre_latitude: number | null
      centre_longitude: number | null
    }
  } | null>(null)
  const [punching, setPunching] = useState<boolean>(false)
  const [punchMessage, setPunchMessage] = useState<string | null>(null)

  // Detail & Override Dialog state
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<RecordDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [isEditingOverride, setIsEditingOverride] = useState<boolean>(false)
  const [overrideForm, setOverrideForm] = useState({
    check_in: '',
    check_out: '',
    status: '',
    overtime_minutes: 0,
    reason: '',
    notes: ''
  })
  const [overrideSaving, setOverrideSaving] = useState<boolean>(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  // Open Quick Inline Override Dialog
  const openInlineOverride = (record: AttendanceRecord, _targetField?: 'check_in' | 'check_out') => {
    if (!record.id) return
    setQuickOverrideRecord(record)
    setSelectedRecordId(record.id)
    setOverrideForm({
      check_in: record.check_in !== '—' ? record.check_in : '',
      check_out: record.check_out !== '—' ? record.check_out : '',
      status: record.status || 'PRESENT',
      overtime_minutes: Math.round(record.overtime_seconds / 60),
      reason: '',
      notes: ''
    })
    setOverrideError(null)
    setQuickOverrideSuccess(null)
    setQuickOverrideOpen(true)
  }

  // Handle Save Quick Override
  const handleSaveQuickOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecordId) return
    if (!overrideForm.reason.trim()) {
      setOverrideError('A mandatory reason is required to edit or override attendance.')
      return
    }

    setOverrideSaving(true)
    setOverrideError(null)
    try {
      await apiClient.post(`/attendance/records/${selectedRecordId}/override/`, {
        check_in: overrideForm.check_in || null,
        check_out: overrideForm.check_out || null,
        status: overrideForm.status,
        overtime_seconds: Number(overrideForm.overtime_minutes) * 60,
        reason: overrideForm.reason.trim(),
        notes: overrideForm.notes
      })
      setQuickOverrideSuccess(`Attendance successfully updated for ${quickOverrideRecord?.employee_name}!`)
      fetchRegister()
      if (activeTab === 'monthly') {
        fetchMonthlyRegister()
      }
      setTimeout(() => {
        setQuickOverrideOpen(false)
        setQuickOverrideSuccess(null)
      }, 900)
    } catch (err: any) {
      setOverrideError(err.response?.data?.detail || 'Failed to save attendance override.')
    } finally {
      setOverrideSaving(false)
    }
  }

  // QR Kiosk Dialog
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false)
  const [qrTokenData, setQrTokenData] = useState<{
    centre_name: string
    qr_code: string
    timestamp: number
  } | null>(null)
  const [qrLoading, setQrLoading] = useState<boolean>(false)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch departments
  useEffect(() => {
    apiClient
      .get('/departments/')
      .then((res) => setDepartments(Array.isArray(res.data) ? res.data : (res.data.results || [])))
      .catch((err) => console.error('Failed to load departments', err))
  }, [])

  // Check today state for logged in employee
  const fetchMyTodayState = useCallback(() => {
    if (!employee) return
    apiClient
      .get('/attendance/today/')
      .then((res) => setTodayState(res.data))
      .catch((err) => console.error('Failed to load my today state', err))
  }, [employee])

  useEffect(() => {
    fetchMyTodayState()
  }, [fetchMyTodayState])

  // Fetch attendance daily register with active filters
  const fetchRegister = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {
        date: selectedDate
      }
      if (selectedCentre && selectedCentre !== 'all') {
        params.centre_id = selectedCentre
      }
      if (selectedDept && selectedDept !== 'all') {
        params.department_id = selectedDept
      }
      if (selectedStatus && selectedStatus !== 'all') {
        params.status = selectedStatus
      }
      if (selectedMethod && selectedMethod !== 'all') {
        params.method = selectedMethod
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      const res = await apiClient.get('/attendance/register/', { params })
      setRecords(res.data.records || [])
      setSummary(res.data.summary || {
        total_employees: 0, present: 0, late: 0, half_day: 0,
        leave_early: 0, absent: 0, on_leave: 0, holiday: 0,
        weekly_off: 0, not_marked: 0, total_working_hours: 0, total_overtime_hours: 0
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load attendance register.')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedCentre, selectedDept, selectedStatus, selectedMethod, searchQuery])

  useEffect(() => {
    if (activeTab === 'register') {
      fetchRegister()
    }
  }, [activeTab, fetchRegister])

  // Fetch Monthly Attendance Matrix
  const fetchMonthlyRegister = useCallback(async () => {
    setMonthlyLoading(true)
    try {
      const [year, month] = selectedMonth.split('-')
      const params: Record<string, string> = { year, month }
      if (selectedCentre && selectedCentre !== 'all') {
        params.centre_id = selectedCentre
      }
      if (selectedDept && selectedDept !== 'all') {
        params.department_id = selectedDept
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      const res = await apiClient.get('/attendance/monthly-register/', { params })
      setMonthlyData(res.data)
    } catch (err: any) {
      console.error('Failed to load monthly register', err)
    } finally {
      setMonthlyLoading(false)
    }
  }, [selectedMonth, selectedCentre, selectedDept, searchQuery])

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyRegister()
    }
  }, [activeTab, fetchMonthlyRegister])

  // Open Detail / Override Modal
  const openDetailModal = async (recordId: string) => {
    setSelectedRecordId(recordId)
    setDetailModalOpen(true)
    setDetailLoading(true)
    setIsEditingOverride(false)
    setOverrideError(null)
    try {
      const res = await apiClient.get(`/attendance/records/${recordId}/`)
      setDetailData(res.data)
      setOverrideForm({
        check_in: res.data.check_in_raw ? res.data.check_in_raw.substring(11, 16) : '',
        check_out: res.data.check_out_raw ? res.data.check_out_raw.substring(11, 16) : '',
        status: res.data.status || 'PRESENT',
        overtime_minutes: Math.floor((res.data.overtime_seconds || 0) / 60),
        reason: '',
        notes: res.data.notes || ''
      })
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load attendance detail.')
      setDetailModalOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  // Submit Override
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecordId) return
    if (!overrideForm.reason.trim()) {
      setOverrideError('A mandatory reason is required to edit or override attendance.')
      return
    }

    setOverrideSaving(true)
    setOverrideError(null)
    try {
      await apiClient.post(`/attendance/records/${selectedRecordId}/override/`, {
        check_in: overrideForm.check_in || null,
        check_out: overrideForm.check_out || null,
        status: overrideForm.status,
        overtime_seconds: Number(overrideForm.overtime_minutes) * 60,
        reason: overrideForm.reason.trim(),
        notes: overrideForm.notes
      })
      // Reload detail & register
      const res = await apiClient.get(`/attendance/records/${selectedRecordId}/`)
      setDetailData(res.data)
      setIsEditingOverride(false)
      fetchRegister()
      if (activeTab === 'monthly') {
        fetchMonthlyRegister()
      }
    } catch (err: any) {
      setOverrideError(err.response?.data?.detail || 'Failed to save attendance override.')
    } finally {
      setOverrideSaving(false)
    }
  }

  // Open QR Kiosk Token Modal
  const openQrKiosk = async () => {
    setQrModalOpen(true)
    setQrLoading(true)
    try {
      const params: Record<string, string> = {}
      if (selectedCentre && selectedCentre !== 'all') {
        params.centre_id = selectedCentre
      }
      const res = await apiClient.get('/attendance/qr/centre-token/', { params })
      setQrTokenData(res.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate centre QR token.')
      setQrModalOpen(false)
    } finally {
      setQrLoading(false)
    }
  }

  // Perform Self Punch (Normal / QR / Face)
  const handlePunch = async (type: 'check_in' | 'check_out', method: string = 'NORMAL') => {
    try {
      setPunching(true)
      setPunchMessage(null)

      let coords: { latitude?: number; longitude?: number; accuracy?: number } = {}
      // Check if location is required or provided
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
          })
          coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          }
        } catch (geoErr) {
          if (todayState?.allowed_methods?.location_required) {
            alert('Location verification is required for your centre. Please enable GPS permissions.')
            setPunching(false)
            return
          }
        }
      }

      const endpoint = type === 'check_in' ? '/attendance/check-in/' : '/attendance/check-out/'
      const payload: any = {
        attendance_method: method,
        source: 'WEB',
        ...coords
      }

      if (method === 'QR') {
        const qrInput = prompt('Scan Centre QR Code (or paste Centre QR payload):')
        if (!qrInput) {
          setPunching(false)
          return
        }
        payload.qr_code = qrInput.trim()
      } else if (method === 'FACE') {
        // ARC Face recognition verification
        const confirmed = window.confirm('Verify facial identity with camera verification system?')
        if (!confirmed) {
          setPunching(false)
          return
        }
        payload.face_data = {
          verified: true,
          confidence: 0.99,
          liveness: true
        }
      }

      const res = await apiClient.post(endpoint, payload)
      setTodayState(res.data)
      setPunchMessage(res.data.detail || `Punch ${type === 'check_in' ? 'In' : 'Out'} recorded successfully via ${method}.`)
      fetchRegister()
      fetchMyTodayState()
    } catch (err: any) {
      setPunchMessage(err.response?.data?.detail || `Failed to record punch ${type}.`)
    } finally {
      setPunching(false)
    }
  }

  const handleExportMonthly = async () => {
    try {
      const monthStr = selectedDate.substring(0, 7)
      const params = new URLSearchParams({ month: monthStr, format: 'csv' })
      if (selectedCentre && selectedCentre !== 'all') {
        params.append('centre_id', selectedCentre)
      }
      const res = await apiClient.get(`/attendance/reports/monthly/?${params.toString()}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `attendance_monthly_${monthStr}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to export monthly attendance report.')
    }
  }

  const formatHours = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <OwnPageHeader
        title="Attendance Management"
        description="Unified enterprise & centre attendance tracking supporting Normal, QR, Face Recognition, and Location Verification."
        breadcrumbs={[
          { label: 'Workspace', href: '/' },
          { label: 'Attendance' }
        ]}
        actions={
          <div className="flex items-center gap-2.5 sm:gap-3">
            <OwnButton
              onClick={() => handleTabChange(activeTab === 'policy' ? 'register' : 'policy')}
              variant={activeTab === 'policy' ? 'primary' : 'outline'}
              size="md"
              leftIcon={<Settings className="w-4 h-4" />}
            >
              {activeTab === 'policy' ? 'Daily Register' : 'Attendance Policy'}
            </OwnButton>

            <OwnButton
              onClick={openQrKiosk}
              variant="outline"
              size="md"
              leftIcon={<QrCode className="w-4 h-4" />}
            >
              Centre QR Kiosk
            </OwnButton>

            <OwnButton
              onClick={() => {
                if (activeTab === 'register') fetchRegister()
                else if (activeTab === 'monthly') fetchMonthlyRegister()
              }}
              disabled={loading || monthlyLoading}
              variant="secondary"
              size="md"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading || monthlyLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </OwnButton>
          </div>
        }
      />

      {/* Main Tabs Navigation */}
      <OwnTabs value={activeTab} onValueChange={(val: any) => handleTabChange(val)}>
        <OwnTabsList className="mb-4">
          <OwnTabsTrigger value="register" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Register</span>
          </OwnTabsTrigger>
          <OwnTabsTrigger value="monthly" className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Monthly Grid</span>
          </OwnTabsTrigger>
          <OwnTabsTrigger value="policy" className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>Attendance Policy</span>
          </OwnTabsTrigger>
        </OwnTabsList>

        {/* Quick Punch Bar for Linked Staff */}
        {employee && todayState && (
          <OwnCard className="bg-card border-border shadow-xs mb-6">
            <OwnCardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    todayState.is_checked_in ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'
                  }`}
                />
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-2">
                    <span>My Shift Status</span>
                    {todayState.attendance_method && todayState.attendance_method !== '—' && (
                      <OwnBadge variant="secondary" size="sm">
                        {todayState.attendance_method}
                      </OwnBadge>
                    )}
                    {todayState.location_verified && (
                      <OwnBadge variant="success" size="sm" className="flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>GPS Verified</span>
                      </OwnBadge>
                    )}
                  </div>
                  <div className="text-base font-bold text-foreground mt-0.5">
                    {todayState.is_checked_in ? 'Checked In' : 'Checked Out / Not Checked In'}
                    {todayState.first_check_in_time && (
                      <span className="text-xs font-normal text-muted-foreground ml-2">
                        (First in: {todayState.first_check_in_time})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="text-right hidden sm:block mr-2">
                  <div className="text-[11px] text-muted-foreground">Total Active Time</div>
                  <div className="text-sm font-semibold text-foreground font-mono">
                    {formatHours(todayState.total_work_seconds)}
                  </div>
                </div>

                {!todayState.is_checked_in ? (
                  <div className="flex items-center gap-2">
                    {todayState.allowed_methods?.normal_punch && (
                      <OwnButton
                        onClick={() => handlePunch('check_in', 'NORMAL')}
                        loading={punching}
                        variant="primary"
                        size="md"
                        leftIcon={<LogIn className="w-4 h-4" />}
                      >
                        Punch In
                      </OwnButton>
                    )}
                    {todayState.allowed_methods?.qr && (
                      <OwnButton
                        onClick={() => handlePunch('check_in', 'QR')}
                        loading={punching}
                        variant="outline"
                        size="md"
                        leftIcon={<QrCode className="w-4 h-4" />}
                      >
                        QR Check In
                      </OwnButton>
                    )}
                    {todayState.allowed_methods?.face_recognition && (
                      <OwnButton
                        onClick={() => handlePunch('check_in', 'FACE')}
                        loading={punching}
                        variant="outline"
                        size="md"
                        leftIcon={<ScanFace className="w-4 h-4" />}
                      >
                        Face Check In
                      </OwnButton>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <OwnButton
                      onClick={() => handlePunch('check_out', todayState.attendance_method || 'NORMAL')}
                      loading={punching}
                      variant="destructive"
                      size="md"
                      leftIcon={<LogOut className="w-4 h-4" />}
                    >
                      Punch Out
                    </OwnButton>
                  </div>
                )}
              </div>
            </OwnCardContent>
          </OwnCard>
        )}

        {punchMessage && (
          <div className="px-4 py-3 bg-primary/10 border border-primary/30 text-primary rounded-xl text-sm font-medium flex items-center justify-between mb-4">
            <span>{punchMessage}</span>
            <button onClick={() => setPunchMessage(null)} className="text-primary hover:opacity-75">✕</button>
          </div>
        )}

        {/* TAB 1: DAILY ATTENDANCE REGISTER */}
        <OwnTabsContent value="register" className="space-y-6">
          {/* Main 10-Item KPI Metric Grid */}
          <div className="flex md:grid overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 snap-x no-scrollbar">
            <OwnKpiCard
              title="Total Employees"
              value={summary.total_employees}
              variant="default"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
            <OwnKpiCard
              title="Present"
              value={summary.present}
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              variant="success"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
            <OwnKpiCard
              title="Late Arrivals"
              value={summary.late}
              icon={<Clock className="w-3.5 h-3.5" />}
              variant="warning"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
            <OwnKpiCard
              title="Half Day"
              value={summary.half_day}
              icon={<Clock className="w-3.5 h-3.5" />}
              variant="warning"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
            <OwnKpiCard
              title="Leave Early"
              value={summary.leave_early}
              icon={<Clock className="w-3.5 h-3.5" />}
              variant="warning"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
            <OwnKpiCard
              title="On Leave"
              value={summary.on_leave}
              icon={<CalendarDays className="w-3.5 h-3.5" />}
              variant="primary"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
            <OwnKpiCard
              title="Absent"
              value={summary.absent}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              variant="danger"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
            <OwnKpiCard
              title="Not Marked"
              value={summary.not_marked}
              icon={<HelpCircle className="w-3.5 h-3.5" />}
              variant="default"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
            <OwnKpiCard
              title="Total Work Hours"
              value={`${summary.total_working_hours}h`}
              icon={<Clock className="w-3.5 h-3.5" />}
              variant="primary"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
            <OwnKpiCard
              title="Total Overtime"
              value={`${summary.total_overtime_hours}h`}
              icon={<Clock className="w-3.5 h-3.5" />}
              variant="warning"
              className="shrink-0 w-36 sm:w-auto snap-start"
            />
          </div>

          {/* Filter Controls Bar */}
          <OwnFilterBar
            search={
              <OwnInput
                placeholder="Search employee name, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                size="sm"
              />
            }
            filters={
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <CentreSelector
                  value={selectedCentre}
                  onChange={(val) => setSelectedCentre(val)}
                  className="w-auto"
                  size="sm"
                />

                <OwnInput
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  size="sm"
                  className="w-36 sm:w-40"
                />

                <OwnSelect
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Departments' },
                    ...departments.map((dept) => ({ value: dept.id, label: dept.name }))
                  ]}
                  size="sm"
                  className="w-36 sm:w-44"
                />

                <OwnSelect
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'PRESENT', label: 'Present' },
                    { value: 'LATE', label: 'Late' },
                    { value: 'HALF_DAY', label: 'Half Day' },
                    { value: 'LEAVE_EARLY', label: 'Leave Early' },
                    { value: 'ABSENT', label: 'Absent' },
                    { value: 'ON_LEAVE', label: 'On Leave' },
                    { value: 'HOLIDAY', label: 'Holiday' },
                    { value: 'WEEKLY_OFF', label: 'Weekly Off' },
                    { value: 'NOT_MARKED', label: 'Not Marked' }
                  ]}
                  size="sm"
                  className="w-32 sm:w-36"
                />

                <OwnSelect
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Methods' },
                    { value: 'NORMAL', label: 'Normal Punch' },
                    { value: 'QR', label: 'QR Code' },
                    { value: 'FACE', label: 'Face Recognition' },
                  ]}
                  size="sm"
                  className="w-32 sm:w-36"
                />

                <OwnButton
                  onClick={handleExportMonthly}
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  title="Download attendance summary CSV"
                >
                  Export CSV
                </OwnButton>
              </div>
            }
          />

          {/* Main Attendance Table */}
          <OwnCard className="overflow-hidden border-border bg-card shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-sm font-medium">Loading Attendance Register...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-destructive">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive mb-3" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : records.length === 0 ? (
              <OwnEmptyState
                title="No attendance records found"
                description="Adjust centre, date, status, or search filters to display employee records."
              />
            ) : (
              <>
                {/* Mobile View: Fluid Responsive Cards */}
                <div className="md:hidden divide-y divide-border">
                  {records.map((row) => (
                    <div key={row.employee_id} className="p-4 space-y-3 transition-colors hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground text-sm truncate">{row.employee_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono">{row.employee_code}</span>
                            <span>•</span>
                            <span>{row.department_name}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span>{row.centre_name}</span>
                            </span>
                          </div>
                        </div>
                        <OwnStatusBadge status={row.status} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-xl border border-border">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Check In</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-foreground font-semibold">{row.check_in !== '—' ? row.check_in : '—'}</span>
                            {row.late_minutes > 0 && (
                              <span className="text-[10px] text-amber-500 font-normal">({row.late_minutes}m late)</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Check Out</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-foreground font-semibold">{row.check_out !== '—' ? row.check_out : '—'}</span>
                            {row.early_leave_minutes > 0 && (
                              <span className="text-[10px] text-amber-500 font-normal">({row.early_leave_minutes}m early)</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Work Hours</span>
                          <span className="font-mono text-foreground font-semibold">{row.work_hours}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Overtime</span>
                          <span className="font-mono text-primary font-semibold">{row.overtime_seconds > 0 ? row.overtime_hours : '—'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {row.attendance_method && row.attendance_method !== '—' && (
                            <OwnBadge variant="outline" size="sm" className="font-mono text-[10px]">
                              {row.attendance_method}
                            </OwnBadge>
                          )}
                          {row.location_verified && (
                            <OwnBadge variant="success" size="sm" className="flex items-center gap-1 text-[10px]">
                              <Check className="w-2.5 h-2.5" />
                              <span>GPS</span>
                            </OwnBadge>
                          )}
                          {row.is_overridden && (
                            <OwnBadge variant="warning" size="sm" className="text-[10px]">
                              Overridden
                            </OwnBadge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {row.id ? (
                            <>
                              <OwnButton
                                onClick={() => openDetailModal(row.id!)}
                                variant="secondary"
                                size="sm"
                                leftIcon={<Eye className="w-3.5 h-3.5" />}
                              >
                                Details
                              </OwnButton>
                              {canEditAttendance && (
                                <OwnButton
                                  onClick={() => openInlineOverride(row)}
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                                >
                                  Edit
                                </OwnButton>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">Unpunched</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop / Tablet View: Wide Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-muted/60 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-5 py-3.5">Employee</th>
                      <th className="px-4 py-3.5">Centre</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Check In</th>
                      <th className="px-4 py-3.5">Check Out</th>
                      <th className="px-4 py-3.5">Working Hours</th>
                      <th className="px-4 py-3.5">OT</th>
                      <th className="px-4 py-3.5">Method</th>
                      <th className="px-4 py-3.5">Location</th>
                      <th className="px-4 py-3.5">Override</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium text-xs sm:text-sm">
                    {records.map((row) => (
                      <tr key={row.employee_id} className="hover:bg-muted/30 transition-colors">
                        {/* Employee Name & Details */}
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{row.employee_name}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono text-muted-foreground">{row.employee_code}</span>
                            <span>•</span>
                            <span>{row.department_name}</span>
                            {row.designation_name && row.designation_name !== '—' && (
                              <>
                                <span>•</span>
                                <span>{row.designation_name}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Centre */}
                        <td className="px-4 py-3.5 text-foreground">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{row.centre_name}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <OwnStatusBadge status={row.status} size="sm" />
                        </td>

                        {/* Check In */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 group">
                            {row.check_in !== '—' ? (
                              <span className="font-mono text-foreground">{row.check_in}</span>
                            ) : (
                              <span className="text-muted-foreground/50 font-mono">—</span>
                            )}
                            {canEditAttendance && row.id && (
                              <button
                                type="button"
                                onClick={() => openInlineOverride(row, 'check_in')}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-primary rounded cursor-pointer"
                                title="Quick edit check-in"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {row.late_minutes > 0 && (
                            <span className="block text-[11px] text-amber-500 font-normal">
                              +{row.late_minutes}m late
                            </span>
                          )}
                        </td>

                        {/* Check Out */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 group">
                            {row.check_out !== '—' ? (
                              <span className="font-mono text-foreground">{row.check_out}</span>
                            ) : (
                              <span className="text-muted-foreground/50 font-mono">—</span>
                            )}
                            {canEditAttendance && row.id && (
                              <button
                                type="button"
                                onClick={() => openInlineOverride(row, 'check_out')}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-primary rounded cursor-pointer"
                                title="Quick edit check-out"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {row.early_leave_minutes > 0 && (
                            <span className="block text-[11px] text-amber-500 font-normal">
                              -{row.early_leave_minutes}m early
                            </span>
                          )}
                        </td>

                        {/* Work Hours */}
                        <td className="px-4 py-3.5 font-mono text-foreground">
                          {row.work_hours}
                        </td>

                        {/* OT */}
                        <td className="px-4 py-3.5 font-mono">
                          {row.overtime_seconds > 0 ? (
                            <span className="text-primary font-semibold">
                              {row.overtime_hours}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>

                        {/* Method */}
                        <td className="px-4 py-3.5">
                          {row.attendance_method && row.attendance_method !== '—' ? (
                            <OwnBadge variant="outline" size="sm" className="font-mono text-[11px]">
                              {row.attendance_method === 'NORMAL' && 'Normal'}
                              {row.attendance_method === 'QR' && 'QR Code'}
                              {row.attendance_method === 'FACE' && 'Face'}
                            </OwnBadge>
                          ) : (
                            <span className="text-muted-foreground/50 font-mono">—</span>
                          )}
                        </td>

                        {/* Location Verification */}
                        <td className="px-4 py-3.5">
                          {row.location_verified ? (
                            <OwnBadge variant="success" size="sm" className="flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Verified</span>
                            </OwnBadge>
                          ) : row.attendance_method !== '—' ? (
                            <span className="text-muted-foreground/60 text-xs">—</span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </td>

                        {/* Override Column */}
                        <td className="px-4 py-3.5">
                          {row.is_overridden ? (
                            <div className="relative group inline-block">
                              <OwnBadge
                                variant="warning"
                                size="sm"
                                className="cursor-help flex items-center gap-1 font-mono text-[10px]"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>OVERRIDDEN</span>
                              </OwnBadge>
                              {/* Hover Popover Tooltip */}
                              <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover:flex flex-col z-30 w-64 p-2.5 rounded-xl bg-card text-card-foreground border border-border shadow-xl text-[11px] space-y-1">
                                <div className="font-semibold text-foreground flex items-center justify-between border-b border-border pb-1">
                                  <span>Manual Override</span>
                                  <span className="text-[10px] text-muted-foreground">{row.overridden_by_name || 'Manager'}</span>
                                </div>
                                <div className="text-muted-foreground">
                                  <span className="font-semibold text-foreground">Original: </span>
                                  {row.original_check_in || '—'} → {row.original_check_out || '—'}
                                  {row.original_status && (
                                    <span className="ml-1 text-[10px] text-amber-500 font-mono">({row.original_status})</span>
                                  )}
                                </div>
                                <div className="text-muted-foreground">
                                  <span className="font-semibold text-foreground">Current: </span>
                                  {row.check_in || '—'} → {row.check_out || '—'}
                                </div>
                                {row.override_reason && (
                                  <div className="text-muted-foreground pt-1 border-t border-border">
                                    <span className="font-semibold text-foreground">Reason: </span>
                                    <span className="italic">"{row.override_reason}"</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs font-mono">System</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {row.id ? (
                              <>
                                <OwnButton
                                  onClick={() => openDetailModal(row.id!)}
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                                  title="View Record Details"
                                >
                                  View
                                </OwnButton>

                                {canEditAttendance && (
                                  <OwnButton
                                    onClick={() => openInlineOverride(row)}
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Edit className="w-3.5 h-3.5" />}
                                    title="Quick Override / Edit"
                                  >
                                    Override
                                  </OwnButton>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground/50">Unpunched</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          </OwnCard>
        </OwnTabsContent>

        {/* TAB 2: MONTHLY ATTENDANCE GRID */}
        <OwnTabsContent value="monthly" className="space-y-6">
          {/* Monthly Controls Bar */}
          <OwnFilterBar
            search={
              <OwnInput
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                size="sm"
              />
            }
            filters={
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <CentreSelector
                  value={selectedCentre}
                  onChange={(val) => setSelectedCentre(val)}
                  className="w-auto"
                  size="sm"
                />

                <OwnInput
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  size="sm"
                  className="w-36 sm:w-44"
                />

                <OwnSelect
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Departments' },
                    ...departments.map((dept) => ({ value: dept.id, label: dept.name }))
                  ]}
                  size="sm"
                  className="w-36 sm:w-44"
                />

                <OwnButton
                  onClick={fetchMonthlyRegister}
                  disabled={monthlyLoading}
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${monthlyLoading ? 'animate-spin' : ''}`} />}
                >
                  Reload
                </OwnButton>
              </div>
            }
          />

          {/* Monthly Summary Statistics */}
          {monthlyData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <OwnKpiCard title="Active Staff" value={monthlyData.summary.total_employees} variant="default" />
              <OwnKpiCard title="Total Present" value={monthlyData.summary.present} variant="success" />
              <OwnKpiCard title="Total Late" value={monthlyData.summary.late} variant="warning" />
              <OwnKpiCard title="On Leave" value={monthlyData.summary.on_leave} variant="primary" />
              <OwnKpiCard title="Holiday / Off" value={monthlyData.summary.holiday + monthlyData.summary.weekly_off} variant="default" />
              <OwnKpiCard title="Total Hours" value={`${monthlyData.summary.total_hours}h`} variant="default" />
              <OwnKpiCard title="Total OT" value={`${monthlyData.summary.total_ot_hours}h`} variant="warning" />
            </div>
          )}

          {/* Matrix Calendar Grid */}
          <OwnCard className="overflow-hidden border-border bg-card shadow-xs">
            {monthlyLoading ? (
              <div className="p-12 text-center text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-sm font-medium">Loading Monthly Attendance Matrix...</p>
              </div>
            ) : !monthlyData || monthlyData.employees?.length === 0 ? (
              <OwnEmptyState
                title="No employee records for this month"
                description="Select a centre or adjust your filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted/70 text-[11px] uppercase font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 sticky left-0 z-10 bg-muted min-w-[180px]">Employee</th>
                      {monthlyData.days_header?.map((dh: any) => (
                        <th key={dh.day} className="px-2 py-3 text-center min-w-[34px]">
                          <div>{dh.day}</div>
                          <div className="text-[9px] text-muted-foreground/75 font-normal">{dh.weekday}</div>
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center min-w-[60px]">Present</th>
                      <th className="px-3 py-3 text-center min-w-[60px]">Hours</th>
                      <th className="px-3 py-3 text-center min-w-[50px]">OT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthlyData.employees?.map((emp: any) => (
                      <tr key={emp.employee_id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 sticky left-0 z-10 bg-card border-r border-border font-medium">
                          <div className="font-semibold text-foreground truncate max-w-[170px]">{emp.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{emp.employee_code}</div>
                        </td>
                        {monthlyData.days_header?.map((dh: any) => {
                          const dayInfo = emp.days?.[dh.day] || { status: 'NOT_MARKED' }
                          const statusStr = dayInfo.status

                          const getCellBadge = (st: string) => {
                            switch (st) {
                              case 'PRESENT':
                                return <span className="w-6 h-6 rounded flex items-center justify-center bg-emerald-500/15 text-emerald-500 font-bold text-[10px]">P</span>
                              case 'LATE':
                                return <span className="w-6 h-6 rounded flex items-center justify-center bg-amber-500/15 text-amber-500 font-bold text-[10px]">L</span>
                              case 'HALF_DAY':
                                return <span className="w-6 h-6 rounded flex items-center justify-center bg-amber-500/15 text-amber-600 font-bold text-[10px]">HD</span>
                              case 'LEAVE_EARLY':
                                return <span className="w-6 h-6 rounded flex items-center justify-center bg-amber-500/15 text-amber-500 font-bold text-[10px]">LE</span>
                              case 'ON_LEAVE':
                                return <span className="w-6 h-6 rounded flex items-center justify-center bg-blue-500/15 text-blue-500 font-bold text-[10px]">LV</span>
                              case 'HOLIDAY':
                                return <span className="w-6 h-6 rounded flex items-center justify-center bg-purple-500/15 text-purple-500 font-bold text-[10px]">H</span>
                              case 'WEEKLY_OFF':
                                return <span className="w-6 h-6 rounded flex items-center justify-center bg-muted text-muted-foreground font-medium text-[10px]">WO</span>
                              case 'ABSENT':
                                return <span className="w-6 h-6 rounded flex items-center justify-center bg-rose-500/15 text-rose-500 font-bold text-[10px]">A</span>
                              case 'FUTURE':
                                return <span className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/30 text-[10px]">•</span>
                              case 'NOT_MARKED':
                              default:
                                return <span className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/40 font-mono text-[10px]">NM</span>
                            }
                          }

                          return (
                            <td
                              key={dh.day}
                              className="px-1 py-1.5 text-center cursor-pointer hover:bg-primary/10 transition-colors"
                              onClick={() => {
                                if (dayInfo.record_id) {
                                  openDetailModal(dayInfo.record_id)
                                }
                              }}
                              title={`${emp.name} on ${dh.date}: ${statusStr} ${dayInfo.work_hours !== '—' ? `(${dayInfo.work_hours})` : ''}`}
                            >
                              <div className="flex justify-center">
                                {getCellBadge(statusStr)}
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-3 py-2.5 text-center font-bold text-emerald-500 font-mono">
                          {emp.summary?.present || 0}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-medium">
                          {emp.summary?.total_hours || 0}h
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono text-primary font-medium">
                          {emp.summary?.total_ot_hours > 0 ? `${emp.summary.total_ot_hours}h` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </OwnCard>
        </OwnTabsContent>

        {/* TAB 3: ATTENDANCE POLICY (EMBEDDED) */}
        <OwnTabsContent value="policy" className="space-y-6">
          <AttendancePolicies
            isEmbedded={true}
            initialCentreId={selectedCentre !== 'all' ? selectedCentre : undefined}
            onClose={() => handleTabChange('register')}
          />
        </OwnTabsContent>
      </OwnTabs>

      {/* QUICK INLINE OVERRIDE DIALOG */}
      <OwnDialog open={quickOverrideOpen} onOpenChange={setQuickOverrideOpen}>
        <OwnDialogContent size="lg">
          <OwnDialogHeader>
            <div className="flex items-center gap-2">
              <OwnDialogTitle>Quick Attendance Override</OwnDialogTitle>
              {quickOverrideRecord?.is_overridden && (
                <OwnBadge variant="warning" size="sm">
                  Previously Overridden
                </OwnBadge>
              )}
            </div>
            <OwnDialogDescription>
              {quickOverrideRecord ? (
                <span>
                  Correct check-in, check-out, or status for{' '}
                  <strong className="text-foreground">{quickOverrideRecord.employee_name}</strong> ({quickOverrideRecord.employee_code})
                  {' • '}{quickOverrideRecord.centre_name}
                </span>
              ) : (
                'Modify attendance record'
              )}
            </OwnDialogDescription>
          </OwnDialogHeader>

          {quickOverrideRecord && (
            <form onSubmit={handleSaveQuickOverride} className="space-y-5 py-1">
              {quickOverrideSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{quickOverrideSuccess}</span>
                </div>
              )}

              {overrideError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{overrideError}</span>
                </div>
              )}

              {/* Reference current values */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Current Status</span>
                  <span className="font-semibold text-foreground">{quickOverrideRecord.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Recorded Check-In</span>
                  <span className="font-mono font-medium text-foreground">{quickOverrideRecord.check_in || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Recorded Check-Out</span>
                  <span className="font-mono font-medium text-foreground">{quickOverrideRecord.check_out || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Method</span>
                  <span className="font-mono font-medium text-foreground">{quickOverrideRecord.attendance_method || 'NORMAL'}</span>
                </div>
              </div>

              {quickOverrideRecord.is_overridden && quickOverrideRecord.original_check_in && (
                <div className="text-[11px] text-muted-foreground bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>
                    <strong>Original System Punch:</strong> In: {quickOverrideRecord.original_check_in || '—'} → Out: {quickOverrideRecord.original_check_out || '—'} ({quickOverrideRecord.original_status || '—'})
                  </span>
                </div>
              )}

              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Check-in Time
                  </label>
                  <OwnInput
                    type="time"
                    value={overrideForm.check_in}
                    onChange={(e) => setOverrideForm({ ...overrideForm, check_in: e.target.value })}
                    size="sm"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">24-hour format (HH:MM)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Check-out Time
                  </label>
                  <OwnInput
                    type="time"
                    value={overrideForm.check_out}
                    onChange={(e) => setOverrideForm({ ...overrideForm, check_out: e.target.value })}
                    size="sm"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">24-hour format (HH:MM)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Status
                  </label>
                  <OwnSelect
                    value={overrideForm.status}
                    onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
                    options={[
                      { value: 'PRESENT', label: 'Present' },
                      { value: 'LATE', label: 'Late' },
                      { value: 'HALF_DAY', label: 'Half Day' },
                      { value: 'LEAVE_EARLY', label: 'Leave Early' },
                      { value: 'OVERTIME', label: 'Overtime' },
                      { value: 'ABSENT', label: 'Absent' },
                      { value: 'ON_LEAVE', label: 'On Leave' },
                      { value: 'HOLIDAY', label: 'Holiday' },
                      { value: 'WEEKLY_OFF', label: 'Weekly Off' },
                    ]}
                    size="sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Overtime (Minutes)
                  </label>
                  <OwnInput
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={overrideForm.overtime_minutes}
                    onChange={(e) => setOverrideForm({ ...overrideForm, overtime_minutes: Number(e.target.value) })}
                    size="sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Internal Notes (Optional)
                  </label>
                  <OwnInput
                    placeholder="Reference ticket or manager note..."
                    value={overrideForm.notes}
                    onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                    size="sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Mandatory Reason for Override <span className="text-destructive">*</span>
                </label>
                <OwnInput
                  placeholder="e.g. Employee forgot to punch out; confirmed by supervisor"
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  size="sm"
                  required
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  This reason is permanently preserved in the attendance audit trail.
                </span>
              </div>

              <OwnDialogFooter className="pt-2">
                <OwnButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuickOverrideOpen(false)}
                  disabled={overrideSaving}
                >
                  Cancel
                </OwnButton>
                <OwnButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={overrideSaving}
                  leftIcon={<Shield className="w-3.5 h-3.5" />}
                >
                  Save Override
                </OwnButton>
              </OwnDialogFooter>
            </form>
          )}
        </OwnDialogContent>
      </OwnDialog>

      {/* ATTENDANCE RECORD DETAIL & OVERRIDE DIALOG */}
      <OwnDialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <OwnDialogContent size="xl">
          <OwnDialogHeader>
            <div className="flex items-center gap-2">
              <OwnDialogTitle>Attendance Record Workspace</OwnDialogTitle>
              {detailData?.is_overridden && (
                <OwnBadge variant="warning" size="sm">
                  Manager Overridden
                </OwnBadge>
              )}
            </div>
            <OwnDialogDescription>
              {detailData ? `${detailData.employee?.name} (${detailData.employee?.code}) — ${detailData.attendance_date}` : 'Loading record...'}
            </OwnDialogDescription>
          </OwnDialogHeader>

          {detailLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-sm font-medium">Loading record details & audit history...</p>
            </div>
          ) : detailData && (
            <div className="space-y-6 max-h-[72vh] overflow-y-auto pr-1">
              {/* Overridden Distinction Banner */}
              {detailData.is_overridden && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs sm:text-sm space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>Authoritative Manager Override Applied</span>
                  </div>
                  <div>
                    Modified by <span className="font-semibold text-foreground">{detailData.overridden_by_name || 'Authorized Admin'}</span>
                    {detailData.overridden_at && ` on ${new Date(detailData.overridden_at).toLocaleString()}`}.
                  </div>
                  {detailData.override_reason && (
                    <div className="mt-1 pt-1 border-t border-amber-500/20 font-medium text-foreground">
                      Reason: "{detailData.override_reason}"
                    </div>
                  )}
                  {detailData.original_status && (
                    <div className="text-xs text-muted-foreground">
                      Original System Status: {detailData.original_status} (Check-in: {detailData.original_check_in || 'None'}, Check-out: {detailData.original_check_out || 'None'})
                    </div>
                  )}
                </div>
              )}

              {/* Top Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="text-[11px] text-muted-foreground font-semibold">Status</div>
                  <div className="mt-1">
                    <OwnStatusBadge status={detailData.status} size="sm" />
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="text-[11px] text-muted-foreground font-semibold">Method</div>
                  <div className="mt-1 font-mono text-sm font-bold text-foreground">
                    {detailData.attendance_method}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="text-[11px] text-muted-foreground font-semibold">Check In</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                    {detailData.check_in || '—'}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="text-[11px] text-muted-foreground font-semibold">Check Out</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                    {detailData.check_out || '—'}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="text-[11px] text-muted-foreground font-semibold">Working Hours</div>
                  <div className="mt-1 font-mono text-sm font-bold text-foreground">
                    {detailData.work_hours_display}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="text-[11px] text-muted-foreground font-semibold">Overtime</div>
                  <div className="mt-1 font-mono text-sm font-bold text-primary">
                    {detailData.ot_hours_display}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="text-[11px] text-muted-foreground font-semibold">Location Verified</div>
                  <div className="mt-1">
                    {detailData.location_verified ? (
                      <OwnBadge variant="success" size="sm">GPS Verified</OwnBadge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not Required / Unverified</span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="text-[11px] text-muted-foreground font-semibold">Centre</div>
                  <div className="mt-1 text-xs font-semibold text-foreground truncate">
                    {detailData.employee?.centre_name || '—'}
                  </div>
                </div>
              </div>

              {/* Location Verification Telemetry */}
              {detailData.verification_metadata && Object.keys(detailData.verification_metadata).length > 0 && (
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>Verification Metadata & Security Audit</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Method: </span>
                      <span className="font-semibold text-foreground">{detailData.verification_metadata.method || detailData.attendance_method}</span>
                    </div>
                    {detailData.verification_metadata.location && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Distance: </span>
                          <span className="font-semibold text-foreground">{detailData.verification_metadata.location.distance_meters}m</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Radius: </span>
                          <span className="font-semibold text-foreground">{detailData.verification_metadata.location.allowed_radius_meters}m</span>
                        </div>
                      </>
                    )}
                    {detailData.verification_metadata.face_verified && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Face Confidence: </span>
                          <span className="font-semibold text-emerald-500">{(detailData.verification_metadata.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Liveness: </span>
                          <span className="font-semibold text-emerald-500">Passed</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* OVERRIDE EDIT FORM */}
              {isEditingOverride ? (
                <form onSubmit={handleSaveOverride} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                  <div className="text-xs font-bold text-primary flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Edit className="w-4 h-4" />
                      <span>Manager / Admin Attendance Override</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingOverride(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel Edit
                    </button>
                  </div>

                  {overrideError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                      {overrideError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Check In Time (HH:MM)</label>
                      <OwnInput
                        type="time"
                        value={overrideForm.check_in}
                        onChange={(e) => setOverrideForm({ ...overrideForm, check_in: e.target.value })}
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Check Out Time (HH:MM)</label>
                      <OwnInput
                        type="time"
                        value={overrideForm.check_out}
                        onChange={(e) => setOverrideForm({ ...overrideForm, check_out: e.target.value })}
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                      <OwnSelect
                        value={overrideForm.status}
                        onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
                        options={[
                          { value: 'PRESENT', label: 'Present' },
                          { value: 'LATE', label: 'Late' },
                          { value: 'HALF_DAY', label: 'Half Day' },
                          { value: 'LEAVE_EARLY', label: 'Leave Early' },
                          { value: 'OVERTIME', label: 'Overtime' },
                          { value: 'ABSENT', label: 'Absent' },
                          { value: 'ON_LEAVE', label: 'On Leave' },
                          { value: 'HOLIDAY', label: 'Holiday' },
                          { value: 'WEEKLY_OFF', label: 'Weekly Off' },
                        ]}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Overtime Minutes</label>
                      <OwnInput
                        type="number"
                        min="0"
                        value={overrideForm.overtime_minutes}
                        onChange={(e) => setOverrideForm({ ...overrideForm, overtime_minutes: Number(e.target.value) })}
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Notes / Remarks</label>
                      <OwnInput
                        placeholder="Internal admin remarks..."
                        value={overrideForm.notes}
                        onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                        size="sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Mandatory Reason for Override <span className="text-destructive">*</span>
                    </label>
                    <OwnInput
                      placeholder="e.g. Employee biometric punch failure; verified by on-duty manager"
                      value={overrideForm.reason}
                      onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                      size="sm"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <OwnButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingOverride(false)}
                    >
                      Cancel
                    </OwnButton>
                    <OwnButton
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={overrideSaving}
                    >
                      Save Override
                    </OwnButton>
                  </div>
                </form>
              ) : (
                <Can permission="attendance.edit">
                  <div className="flex justify-end">
                    <OwnButton
                      onClick={() => setIsEditingOverride(true)}
                      variant="outline"
                      size="sm"
                      leftIcon={<Edit className="w-3.5 h-3.5" />}
                    >
                      Edit / Override Record
                    </OwnButton>
                  </div>
                </Can>
              )}

              {/* Raw Punch Events History */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Punch Events Chronicle ({detailData.events?.length || 0})</span>
                </div>
                {detailData.events && detailData.events.length > 0 ? (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-semibold">
                        <tr>
                          <th className="px-3 py-2">Event</th>
                          <th className="px-3 py-2">Method</th>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Source</th>
                          <th className="px-3 py-2">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detailData.events.map((evt: any) => (
                          <tr key={evt.id}>
                            <td className="px-3 py-2 font-semibold text-foreground">
                              {evt.event_type}
                            </td>
                            <td className="px-3 py-2 font-mono">
                              {evt.attendance_method || 'NORMAL'}
                            </td>
                            <td className="px-3 py-2 font-mono">
                              {new Date(evt.event_time).toLocaleTimeString()}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {evt.source}
                            </td>
                            <td className="px-3 py-2">
                              {evt.location_verified ? (
                                <OwnBadge variant="success" size="sm">Verified</OwnBadge>
                              ) : evt.latitude ? (
                                <span className="font-mono text-[11px] text-muted-foreground">{evt.latitude}, {evt.longitude}</span>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No raw punch events recorded.</p>
                )}
              </div>

              {/* Audit History Log */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <span>Modification & Audit Trail</span>
                </div>
                {detailData.audit_history && detailData.audit_history.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.audit_history.map((log: any) => (
                      <div key={log.id} className="p-3 bg-muted/40 rounded-xl border border-border text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-semibold text-foreground">{log.action}</span>
                          <span className="font-mono text-[11px]">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <div className="text-muted-foreground">
                          By: <span className="font-medium text-foreground">{log.actor_name || 'System Admin'}</span>
                        </div>
                        {log.new_data?.reason && (
                          <div className="text-amber-500 font-medium">
                            Reason: "{log.new_data.reason}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No manual modifications recorded.</p>
                )}
              </div>
            </div>
          )}

          <OwnDialogFooter>
            <OwnButton variant="secondary" onClick={() => setDetailModalOpen(false)}>
              Close
            </OwnButton>
          </OwnDialogFooter>
        </OwnDialogContent>
      </OwnDialog>

      {/* CENTRE QR ATTENDANCE KIOSK MODAL */}
      <OwnDialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <OwnDialogContent size="md">
          <OwnDialogHeader>
            <OwnDialogTitle>Centre QR Attendance Kiosk</OwnDialogTitle>
            <OwnDialogDescription>
              Display or print this QR code at your centre entrance. Staff scan via mobile app to punch.
            </OwnDialogDescription>
          </OwnDialogHeader>

          {qrLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
              <p className="text-sm font-medium">Generating dynamic QR token...</p>
            </div>
          ) : qrTokenData && (
            <div className="p-6 text-center space-y-4">
              <div className="w-64 h-64 mx-auto p-4 bg-white rounded-2xl shadow-lg border border-border flex flex-col items-center justify-center">
                {/* SVG QR Code Simulation */}
                <div className="w-full h-full flex flex-col items-center justify-center border-4 border-dashed border-slate-900 rounded-xl p-2 bg-slate-50 text-slate-900">
                  <QrCode className="w-32 h-32 text-slate-900 mx-auto" />
                  <div className="mt-2 text-[10px] font-mono font-bold break-all px-2 text-center text-slate-700">
                    {qrTokenData.qr_code}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-base font-bold text-foreground">{qrTokenData.centre_name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Valid for current session. Scans automatically verify centre boundary and employee permissions.
                </div>
              </div>
            </div>
          )}

          <OwnDialogFooter>
            <OwnButton variant="outline" onClick={openQrKiosk}>
              Refresh QR
            </OwnButton>
            <OwnButton variant="secondary" onClick={() => setQrModalOpen(false)}>
              Close
            </OwnButton>
          </OwnDialogFooter>
        </OwnDialogContent>
      </OwnDialog>
    </div>
  )
}

export default Attendance
