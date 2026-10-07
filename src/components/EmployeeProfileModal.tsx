import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  User,
  FileText,
  History,
  Clock,
  CalendarCheck,
  CalendarDays,
  DollarSign,
  Plus,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Building2,
  Trash2,
  Edit,
  Mail,
  Phone,
  Download,
  Eye,
  Upload,
  ScanFace,
  Shield,
  CheckCircle2
} from './Icons'
import { ThemeToggle } from './ThemeToggle'
import { ToggleSwitch } from './ToggleSwitch'
import apiClient from '../services/api'

import { useAuth } from '../context/AuthContext'

interface EmployeeProfileModalProps {
  employeeId: string
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employeeId,
  isOpen,
  onClose,
  onUpdate
}) => {
  const { role, hasPermission } = useAuth()
  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 'activity' | 'hours' | 'attendance' | 'leave' | 'salary' | 'biometrics'
  >('overview')

  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Sub-data states
  const [documents, setDocuments] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [revisions, setRevisions] = useState<any[]>([])
  const [comparisons, setComparisons] = useState<any[]>([])
  const [compItems, setCompItems] = useState<any[]>([])
  const [leaves, setLeaves] = useState<any[]>([])
  const [workingHours, setWorkingHours] = useState<any>(null)

  // Attendance states
  const now = new Date()
  const [attYear, setAttYear] = useState<number>(now.getFullYear())
  const [attMonth, setAttMonth] = useState<number>(now.getMonth() + 1)
  const [attendanceCalendar, setAttendanceCalendar] = useState<any[]>([])
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null)
  const [attFilterStatus, setAttFilterStatus] = useState<string>('ALL')

  // Leave filters
  const [leaveFilterStatus, setLeaveFilterStatus] = useState<string>('ALL')

  // Form modals / sub-states
  const [showPersonalModal, setShowPersonalModal] = useState<boolean>(false)
  const [personalForm, setPersonalForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    emergency_contact: ''
  })

  const [showEmploymentModal, setShowEmploymentModal] = useState<boolean>(false)
  const [employmentForm, setEmploymentForm] = useState({
    branch: '',
    department: '',
    designation: '',
    manager: '',
    employment_status: 'ACTIVE'
  })
  const [metadata, setMetadata] = useState<{
    branches: any[]
    departments: any[]
    managers: any[]
  }>({ branches: [], departments: [], managers: [] })

  const [showCompModal, setShowCompModal] = useState<boolean>(false)
  const [compType, setCompType] = useState<'EARNING' | 'BONUS' | 'ALLOWANCE' | 'DEDUCTION' | 'OVERTIME'>('EARNING')
  const [compForm, setCompForm] = useState({
    name: '',
    calculation_type: 'FIXED_AMOUNT',
    amount: '',
    frequency: 'RECURRING',
    effective_from: new Date().toISOString().split('T')[0],
    reason: '',
    notes: ''
  })

  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false)
  const [revisionForm, setRevisionForm] = useState({
    basic_salary: '',
    hourly_rate: '0',
    ot_rate: '0',
    effective_from: new Date().toISOString().split('T')[0],
    reason: '',
    confirm_backdated: false
  })
  const [backdatedWarning, setBackdatedWarning] = useState<any>(null)

  const [showDocUpload, setShowDocUpload] = useState<boolean>(false)
  const [docTitle, setDocTitle] = useState<string>('')
  const [docCategory, setDocCategory] = useState<string>('IDENTITY_PROOF')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docUploading, setDocUploading] = useState<boolean>(false)

  // Permissions check
  const isSuperAdminOrAdmin = role === 'SUPERADMIN' || role === 'BUSINESS_ADMIN'
  const canEditEmployee = isSuperAdminOrAdmin || hasPermission('employees.edit')
  const canManageSalary = isSuperAdminOrAdmin || hasPermission('salary.edit')
  const canUploadDoc = isSuperAdminOrAdmin || hasPermission('documents.upload')
  const canDeleteDoc = isSuperAdminOrAdmin || hasPermission('documents.delete')
  const canEnrollFace = isSuperAdminOrAdmin || hasPermission('employee.face_enrollment')

  // Biometrics States
  const [biometricStatus, setBiometricStatus] = useState<any>(null)
  const [bioLoading, setBioLoading] = useState<boolean>(false)
  const [bioError, setBioError] = useState<string | null>(null)
  const [bioSuccess, setBioSuccess] = useState<string | null>(null)
  const [enrollFile, setEnrollFile] = useState<File | null>(null)
  const [enrolling, setEnrolling] = useState<boolean>(false)
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false)
  const [revokeReason, setRevokeReason] = useState<string>('')

  const fetchBiometricStatus = useCallback(async () => {
    if (!employeeId) return
    try {
      setBioLoading(true)
      const res = await apiClient.get(`/biometrics/employees/${employeeId}/status/`)
      setBiometricStatus(res.data)
      setBioError(null)
    } catch {
      // ignore
    } finally {
      setBioLoading(false)
    }
  }, [employeeId])

  // Fetch complete employee profile
  const fetchEmployeeData = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get(`/employees/${employeeId}/`)
      setEmployee(res.data)
      setPersonalForm({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        date_of_birth: res.data.date_of_birth || '',
        address: res.data.address || '',
        emergency_contact: res.data.emergency_contact || ''
      })
      setEmploymentForm({
        branch: res.data.branch || '',
        department: res.data.department || '',
        designation: res.data.designation || '',
        manager: res.data.manager || '',
        employment_status: res.data.employment_status || 'ACTIVE'
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employee details.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  // Fetch metadata for employment dropdowns
  const fetchMetadata = useCallback(async () => {
    try {
      const res = await apiClient.get('/employees/metadata/')
      setMetadata({
        branches: res.data.branches || [],
        departments: res.data.departments || [],
        managers: res.data.managers || []
      })
    } catch (err) {
      console.error('Failed to load metadata', err)
    }
  }, [])

  // Fetch Attendance Calendar & Summary for selected month
  const fetchAttendanceCalendar = useCallback(async (yr: number, mo: number) => {
    if (!employeeId) return
    try {
      const res = await apiClient.get(`/attendance/calendar/?employee_id=${employeeId}&year=${yr}&month=${mo}`)
      setAttendanceCalendar(res.data.days || [])
      setAttendanceSummary(res.data.summary || null)
    } catch (err) {
      console.error('Failed to load attendance calendar', err)
    }
  }, [employeeId])

  // Fetch Working Hours & Provenance
  const fetchWorkingHours = useCallback(async () => {
    if (!employeeId) return
    try {
      const res = await apiClient.get(`/employees/${employeeId}/working-hours/`)
      setWorkingHours(res.data)
    } catch {
      // Fallback to centre policy if available
      if (employee?.branch) {
        apiClient.get(`/centres/${employee.branch}/attendance-policy/`)
          .then((pRes) => {
            setWorkingHours({
              configuration_source: 'Centre Policy',
              source_badge: 'Inherited from Centre',
              shift_timings: {
                office_start: pRes.data.effective?.office_start || '09:00',
                office_end: pRes.data.effective?.office_end || '18:00',
                break_start: pRes.data.effective?.break_start || '13:00',
                break_end: pRes.data.effective?.break_end || '14:00',
              },
              rules: {
                grace_period_minutes: pRes.data.effective?.grace_period_minutes || 15,
                minimum_present_minutes: pRes.data.effective?.minimum_present_minutes || 480,
                minimum_half_day_minutes: pRes.data.effective?.minimum_half_day_minutes || 240,
                working_days_per_week: pRes.data.effective?.working_days || 5,
                weekly_off_days: ['Sunday'],
                ot_enabled: pRes.data.effective?.ot_enabled || false,
              }
            })
          })
          .catch(() => {})
      }
    }
  }, [employeeId, employee?.branch])

  useEffect(() => {
    if (isOpen) {
      fetchEmployeeData()
      fetchMetadata()
      fetchAttendanceCalendar(attYear, attMonth)
      fetchWorkingHours()
    }
  }, [isOpen, fetchEmployeeData, fetchMetadata, fetchAttendanceCalendar, fetchWorkingHours, attYear, attMonth])

  // Lazy load tab data
  useEffect(() => {
    if (!isOpen || !employeeId) return

    if (activeTab === 'documents') {
      apiClient.get(`/employees/${employeeId}/documents/`)
        .then((res) => setDocuments(Array.isArray(res.data) ? res.data : (res.data.results || [])))
        .catch(() => {})
    } else if (activeTab === 'activity') {
      apiClient.get(`/employees/${employeeId}/activity/`)
        .then((res) => setActivityLogs(Array.isArray(res.data) ? res.data : []))
        .catch(() => {})
    } else if (activeTab === 'salary' || activeTab === 'overview') {
      apiClient.get(`/employees/${employeeId}/salary-revisions/`)
        .then((res) => setRevisions(Array.isArray(res.data) ? res.data : []))
        .catch(() => {})
      apiClient.get(`/employees/${employeeId}/salary-comparison/`)
        .then((res) => setComparisons(res.data.comparisons || []))
        .catch(() => {})
      apiClient.get(`/employees/${employeeId}/compensation-items/`)
        .then((res) => setCompItems(Array.isArray(res.data) ? res.data : []))
        .catch(() => {})
    } else if (activeTab === 'leave') {
      apiClient.get(`/leaves/requests/?employee_id=${employeeId}`)
        .then((res) => setLeaves(Array.isArray(res.data) ? res.data : (res.data.results || [])))
        .catch(() => {})
    } else if (activeTab === 'hours') {
      fetchWorkingHours()
    } else if (activeTab === 'biometrics') {
      fetchBiometricStatus()
    }
  }, [activeTab, isOpen, employeeId, fetchWorkingHours, fetchBiometricStatus])

  // Face Enrollment Handler
  const handleEnrollFace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollFile) {
      setBioError('Please select a face image to enroll.')
      return
    }
    try {
      setEnrolling(true)
      setBioError(null)
      setBioSuccess(null)
      const formData = new FormData()
      formData.append('image', enrollFile)
      const res = await apiClient.post(`/biometrics/employees/${employeeId}/enroll/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setBioSuccess(res.data.detail || 'Face enrollment successfully created.')
      setEnrollFile(null)
      fetchBiometricStatus()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.code || 'Face enrollment failed. Ensure image has exactly one clear face.'
      setBioError(msg)
    } finally {
      setEnrolling(false)
    }
  }

  // Face Revocation Handler
  const handleRevokeFace = async () => {
    try {
      setEnrolling(true)
      setBioError(null)
      setBioSuccess(null)
      const res = await apiClient.post(`/biometrics/employees/${employeeId}/revoke/`, {
        reason: revokeReason || 'Revoked by administrator'
      })
      setBioSuccess(res.data.detail || 'Face enrollment has been revoked.')
      setShowRevokeModal(false)
      setRevokeReason('')
      fetchBiometricStatus()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      setBioError(err.response?.data?.detail || 'Failed to revoke face enrollment.')
    } finally {
      setEnrolling(false)
    }
  }

  if (!isOpen) return null

  // Save Personal Details
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await apiClient.patch(`/employees/${employeeId}/`, personalForm)
      setEmployee(res.data)
      setShowPersonalModal(false)
      if (onUpdate) onUpdate()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update personal details.')
    }
  }

  // Save Employment Details
  const handleSaveEmployment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await apiClient.patch(`/employees/${employeeId}/`, {
        branch: employmentForm.branch || null,
        department: employmentForm.department || null,
        designation: employmentForm.designation,
        manager: employmentForm.manager || null,
        employment_status: employmentForm.employment_status
      })
      setEmployee(res.data)
      setShowEmploymentModal(false)
      fetchWorkingHours()
      if (onUpdate) onUpdate()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update employment details.')
    }
  }

  // Save new compensation item
  const handleSaveCompItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.post(`/employees/${employeeId}/compensation-items/`, {
        ...compForm,
        component_type: compType,
        frequency: compForm.frequency,
        amount: parseFloat(compForm.amount)
      })
      setShowCompModal(false)
      setCompForm({
        name: '',
        calculation_type: 'FIXED_AMOUNT',
        amount: '',
        frequency: 'RECURRING',
        effective_from: new Date().toISOString().split('T')[0],
        reason: '',
        notes: ''
      })
      const res = await apiClient.get(`/employees/${employeeId}/compensation-items/`)
      setCompItems(res.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add compensation item.')
    }
  }

  // Deactivate compensation item
  const handleDeactivateCompItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Deactivate compensation component '${itemName}'? Historical payroll snapshots will remain unchanged.`)) return
    try {
      await apiClient.delete(`/employees/${employeeId}/compensation-items/${itemId}/`)
      const res = await apiClient.get(`/employees/${employeeId}/compensation-items/`)
      setCompItems(res.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to deactivate item.')
    }
  }

  // Save Salary Revision
  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault()
    setBackdatedWarning(null)
    try {
      await apiClient.post(`/employees/${employeeId}/salary-revisions/`, {
        basic_salary: parseFloat(revisionForm.basic_salary),
        hourly_rate: parseFloat(revisionForm.hourly_rate) || 0,
        ot_rate: parseFloat(revisionForm.ot_rate) || 0,
        effective_from: revisionForm.effective_from,
        reason: revisionForm.reason,
        confirm_backdated: revisionForm.confirm_backdated
      })
      setShowRevisionModal(false)
      setRevisionForm({
        basic_salary: '',
        hourly_rate: '0',
        ot_rate: '0',
        effective_from: new Date().toISOString().split('T')[0],
        reason: '',
        confirm_backdated: false
      })
      const revRes = await apiClient.get(`/employees/${employeeId}/salary-revisions/`)
      setRevisions(revRes.data)
      const compRes = await apiClient.get(`/employees/${employeeId}/salary-comparison/`)
      setComparisons(compRes.data.comparisons || [])
      if (onUpdate) onUpdate()
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.requires_confirmation) {
        setBackdatedWarning(err.response.data)
      } else {
        alert(err.response?.data?.detail || 'Failed to save salary revision.')
      }
    }
  }

  // Upload Document
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docFile) return
    setDocUploading(true)
    try {
      const formData = new FormData()
      formData.append('title', docTitle || docFile.name)
      formData.append('category', docCategory)
      formData.append('file', docFile)

      await apiClient.post(`/employees/${employeeId}/documents/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setShowDocUpload(false)
      setDocFile(null)
      setDocTitle('')
      const res = await apiClient.get(`/employees/${employeeId}/documents/`)
      setDocuments(Array.isArray(res.data) ? res.data : (res.data.results || []))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload document.')
    } finally {
      setDocUploading(false)
    }
  }

  // Download Document Authenticated
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null)
  const handleDownloadDocument = async (doc: any) => {
    setDownloadingDocId(doc.id)
    try {
      const res = await apiClient.get(`/documents/${doc.id}/download/`, {
        responseType: 'blob'
      })
      const contentType = (res.headers['content-type'] as string) || 'application/octet-stream'
      const blob = new Blob([res.data], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name || `${doc.title}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download document from server storage.')
    } finally {
      setDownloadingDocId(null)
    }
  }

  // View Document in Preview / New Tab
  const handleViewDocument = async (doc: any) => {
    try {
      const res = await apiClient.get(`/documents/${doc.id}/download/?inline=1`, {
        responseType: 'blob'
      })
      const contentType = (res.headers['content-type'] as string) || 'application/pdf'
      const blob = new Blob([res.data], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err: any) {
      alert('Failed to preview document.')
    }
  }

  // Delete Document
  const handleDeleteDocument = async (docId: string, title: string) => {
    if (!window.confirm(`Delete document '${title}'?`)) return
    try {
      await apiClient.delete(`/documents/${docId}/`)
      const res = await apiClient.get(`/employees/${employeeId}/documents/`)
      setDocuments(Array.isArray(res.data) ? res.data : (res.data.results || []))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete document.')
    }
  }

  // Local date helper (YYYY-MM-DD)
  const getLocalDateStr = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const todayDateStr = getLocalDateStr()

  // Current active revision today vs Upcoming scheduled revisions
  const currentRevision =
    revisions.find((r) => r.is_current) ||
    revisions.find((r) => r.effective_from <= todayDateStr && (!r.effective_to || r.effective_to >= todayDateStr)) ||
    revisions.find((r) => r.effective_from <= todayDateStr) ||
    revisions[0] ||
    null

  const upcomingRevisions = revisions
    .filter((r) => r.is_upcoming || r.status === 'UPCOMING' || (r.effective_from && r.effective_from > todayDateStr))
    .sort((a, b) => (a.effective_from || '').localeCompare(b.effective_from || ''))
  const upcomingRevision = upcomingRevisions[0] || null

  // Compensation items (instances): check upcoming vs active now
  const isItemUpcoming = (item: any) =>
    item.is_upcoming || item.status_display === 'UPCOMING' || (item.effective_from && item.effective_from > todayDateStr)

  const isItemActiveNow = (item: any) =>
    Boolean(item.is_active &&
    !isItemUpcoming(item) &&
    item.status_display !== 'EXPIRED' &&
    (!item.effective_to || item.effective_to >= todayDateStr))

  // Active earnings and deductions calculations for Overview Section D (only currently active)
  const activeEarnings = compItems.filter((i) => isItemActiveNow(i) && (i.component_type === 'EARNING' || i.component_type === 'ALLOWANCE'))
  const activeBonuses = compItems.filter((i) => isItemActiveNow(i) && i.component_type === 'BONUS')
  const activeDeductions = compItems.filter((i) => isItemActiveNow(i) && i.component_type === 'DEDUCTION')
  const upcomingCompItems = compItems.filter((i) => i.is_active && isItemUpcoming(i))

  // Filtered attendance days
  const filteredAttendance = attendanceCalendar.filter((day) => {
    if (attFilterStatus === 'ALL') return true
    return day.status === attFilterStatus
  })

  // Filtered leaves
  const filteredLeaves = leaves.filter((l) => {
    if (leaveFilterStatus === 'ALL') return true
    return l.status === leaveFilterStatus
  })

  // Status badge styling helper
  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || 'ACTIVE').toUpperCase()
    if (s === 'ACTIVE') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
          ACTIVE
        </span>
      )
    }
    if (s === 'PROBATION') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800">
          PROBATION
        </span>
      )
    }
    if (s === 'SUSPENDED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-800">
          SUSPENDED
        </span>
      )
    }
    if (s === 'TERMINATED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800">
          TERMINATED
        </span>
      )
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        {s}
      </span>
    )
  }

  // Attendance status badge styling
  const getAttendanceStatusBadge = (statusStr: string) => {
    const s = (statusStr || 'PRESENT').toUpperCase()
    switch (s) {
      case 'PRESENT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">PRESENT</span>
      case 'LATE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800">LATE</span>
      case 'HALF_DAY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800">HALF DAY</span>
      case 'LEAVE_EARLY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800">EARLY LEAVE</span>
      case 'ABSENT':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800">ABSENT</span>
      case 'LEAVE':
      case 'ON_LEAVE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800">ON LEAVE</span>
      case 'HOLIDAY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800">HOLIDAY</span>
      case 'WEEK_OFF':
      case 'WEEKLY_OFF':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">WEEKLY OFF</span>
      case 'NOT_MARKED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800">NOT MARKED</span>
      case 'FUTURE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-900/40">FUTURE</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{s}</span>
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-0 md:border border-slate-200 dark:border-slate-800 rounded-none md:rounded-2xl w-full md:w-[94vw] max-w-7xl h-[100dvh] md:h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        
        {/* EMPLOYEE HEADER */}
        <div className="px-3.5 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            {/* Avatar */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/30 border border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm sm:text-base shadow-sm shrink-0">
              {employee ? `${employee.first_name[0] || 'E'}${employee.last_name ? employee.last_name[0] : ''}` : 'E'}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-none">
                  {employee?.full_name || 'Employee Profile'}
                </h2>
                {employee?.employee_id && (
                  <span className="text-[11px] sm:text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shrink-0">
                    {employee.employee_id}
                  </span>
                )}
                {employee && getStatusBadge(employee.employment_status)}
              </div>

              <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {employee?.designation_name || employee?.designation || 'Staff'}
                </span>
                <span>•</span>
                <span>{employee?.department_name || 'General Department'}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  {employee?.branch_name || 'Headquarters'}
                </span>
                {employee?.joining_date && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline text-slate-500">Joined {employee.joining_date}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <ThemeToggle size="sm" />
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              title="Close workspace"
              aria-label="Close workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 7-TAB HORIZONTAL NAVIGATION */}
        <div className="px-3 sm:px-6 bg-slate-100/90 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-2 text-xs font-semibold shrink-0 touch-pan-x">
          {[
            { key: 'overview', label: 'Overview', icon: User },
            { key: 'documents', label: 'Documents', icon: FileText },
            { key: 'activity', label: 'Activity Log', icon: History },
            { key: 'hours', label: 'Working Hours', icon: Clock },
            { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
            { key: 'leave', label: 'Leave', icon: CalendarDays },
            { key: 'salary', label: 'Salary & Compensation', icon: DollarSign },
            { key: 'biometrics', label: 'Face Recognition', icon: ScanFace }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800/60 font-medium'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* WORKSPACE BODY */}
        <div className="p-3.5 sm:p-5 md:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6 bg-white dark:bg-slate-900 transition-colors">

          {loading ? (
            <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading employee details workspace...
            </div>
          ) : error ? (
            <div className="py-20 text-center text-rose-500 text-sm font-semibold">{error}</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-5 sm:space-y-6">
                  {/* Section A & Section B Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* SECTION A — PERSONAL INFORMATION */}
                    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          Personal Information
                        </h3>
                        {canEditEmployee && (
                          <button
                            onClick={() => setShowPersonalModal(true)}
                            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" /> Edit Personal Details
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Full Name</span>
                          <span className="text-slate-900 dark:text-slate-100 font-semibold text-right break-words">{employee.full_name}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Employee ID</span>
                          <span className="text-slate-900 dark:text-slate-100 font-mono text-right">{employee.employee_id || 'Not assigned'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 shrink-0" /> Email
                          </span>
                          <span className="text-slate-900 dark:text-slate-200 text-right break-all max-w-[65%]">{employee.email || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 shrink-0" /> Phone
                          </span>
                          <span className="text-slate-900 dark:text-slate-200 text-right">{employee.phone || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Date of Birth</span>
                          <span className="text-slate-900 dark:text-slate-200 text-right">{employee.date_of_birth || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Address</span>
                          <span className="text-slate-900 dark:text-slate-200 text-right break-words max-w-[65%]">{employee.address || 'Not provided'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Emergency Contact</span>
                          <span className="text-slate-900 dark:text-slate-200 text-right break-words">{employee.emergency_contact || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    {/* SECTION B — EMPLOYMENT INFORMATION */}
                    <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                          Employment Information
                        </h3>
                        {canEditEmployee && (
                          <button
                            onClick={() => setShowEmploymentModal(true)}
                            className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" /> Edit Employment Details
                          </button>
                        )}
                      </div>

                      <div className="space-y-1 text-xs sm:text-sm">
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Centre / Branch</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold text-right">{employee.branch_name || 'Unassigned Centre'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Department</span>
                          <span className="text-slate-900 dark:text-slate-100 text-right">{employee.department_name || 'General'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Designation</span>
                          <span className="text-slate-900 dark:text-slate-100 font-medium text-right">{employee.designation_name || employee.designation || 'Staff'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Reporting Manager</span>
                          <span className="text-slate-900 dark:text-slate-100 text-right">{employee.manager_name || 'None / Independent'}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Joining Date</span>
                          <span className="text-slate-900 dark:text-slate-100 text-right">{employee.joining_date || 'Not recorded'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-2">
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">Current Status</span>
                          <div>{getStatusBadge(employee.employment_status)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION C — ATTENDANCE SUMMARY */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          Attendance Summary
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Calculated for {new Date(attYear, attMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Month & Year Selectors */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={attMonth}
                          onChange={(e) => setAttMonth(parseInt(e.target.value))}
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs cursor-pointer"
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={attYear}
                          onChange={(e) => setAttYear(parseInt(e.target.value))}
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs cursor-pointer"
                        >
                          {[2024, 2025, 2026, 2027].map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 8 Metric KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 shadow-xs flex flex-col justify-between min-w-0">
                        <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider truncate">Present</div>
                        <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">{attendanceSummary?.present ?? 0}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950/60 shadow-xs flex flex-col justify-between min-w-0">
                        <div className="text-[10px] sm:text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider truncate">Late</div>
                        <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">{attendanceSummary?.late ?? 0}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-950/60 shadow-xs flex flex-col justify-between min-w-0">
                        <div className="text-[10px] sm:text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider truncate">Half Day</div>
                        <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">{attendanceSummary?.half_day ?? 0}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-950/60 shadow-xs flex flex-col justify-between min-w-0">
                        <div className="text-[10px] sm:text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider truncate">Leave</div>
                        <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">{attendanceSummary?.leave ?? 0}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950/60 shadow-xs flex flex-col justify-between min-w-0">
                        <div className="text-[10px] sm:text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider truncate">Absent</div>
                        <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">{attendanceSummary?.absent ?? 0}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between min-w-0">
                        <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">Weekly Off</div>
                        <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">{attendanceSummary?.week_off ?? attendanceSummary?.weekly_off ?? 0}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-950/60 shadow-xs flex flex-col justify-between min-w-0">
                        <div className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate">Holidays</div>
                        <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1 truncate">{attendanceSummary?.holiday ?? 0}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 shadow-xs flex flex-col justify-between min-w-0">
                        <div className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">OT Hours</div>
                        <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 truncate">{attendanceSummary?.ot_hours ?? '0.0'}h</div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION D — CURRENT COMPENSATION SUMMARY */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" /> Current Compensation Summary
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 truncate">
                          {currentRevision
                            ? `${currentRevision.currency} ${Number(currentRevision.basic_salary).toLocaleString('en-IN')} / month`
                            : 'Salary Not Configured'}
                        </div>
                        {currentRevision && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span>OT Rate: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentRevision.currency} {currentRevision.ot_rate}/hr</strong></span>
                            <span>•</span>
                            <span>Effective: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{currentRevision.effective_from}</strong></span>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">Current Active</span>
                          </div>
                        )}
                        {upcomingRevision && (
                          <div className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex-wrap">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Upcoming Revision: <strong>{upcomingRevision.currency} {Number(upcomingRevision.basic_salary).toLocaleString('en-IN')} / month</strong> takes effect on {upcomingRevision.effective_from}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setActiveTab('salary')}
                        className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        Manage Compensation →
                      </button>
                    </div>

                    {/* Breakdown Chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mt-4 sm:mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider block mb-2">Active Earnings ({activeEarnings.length})</span>
                        {activeEarnings.length === 0 ? (
                          <span className="text-slate-400 dark:text-slate-500 italic text-xs">None configured</span>
                        ) : (
                          <div className="space-y-1.5">
                            {activeEarnings.slice(0, 3).map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-slate-700 dark:text-slate-200 gap-2">
                                <span className="truncate">{item.name}</span>
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                  {item.calculation_type === 'PERCENTAGE' ? `${item.amount}%` : `₹${Number(item.amount).toLocaleString('en-IN')}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider block mb-2">Active Bonuses ({activeBonuses.length})</span>
                        {activeBonuses.length === 0 ? (
                          <span className="text-slate-400 dark:text-slate-500 italic text-xs">
                            {upcomingCompItems.some((i) => i.component_type === 'BONUS') ? 'None active today (1 upcoming)' : 'None active'}
                          </span>
                        ) : (
                          <div className="space-y-1.5">
                            {activeBonuses.slice(0, 3).map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-slate-700 dark:text-slate-200 gap-2">
                                <span className="truncate">{item.name}</span>
                                <span className="font-mono text-purple-600 dark:text-purple-400 font-bold shrink-0">
                                  {item.calculation_type === 'PERCENTAGE' ? `${item.amount}%` : `₹${Number(item.amount).toLocaleString('en-IN')}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider block mb-2">Active Deductions ({activeDeductions.length})</span>
                        {activeDeductions.length === 0 ? (
                          <span className="text-slate-400 dark:text-slate-500 italic text-xs">None configured</span>
                        ) : (
                          <div className="space-y-1.5">
                            {activeDeductions.slice(0, 3).map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-slate-700 dark:text-slate-200 gap-2">
                                <span className="truncate">{item.name}</span>
                                <span className="font-mono text-rose-600 dark:text-rose-400 font-bold shrink-0">
                                  -{item.calculation_type === 'PERCENTAGE' ? `${item.amount}%` : `₹${Number(item.amount).toLocaleString('en-IN')}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {upcomingCompItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 flex-wrap">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          <strong>Upcoming Compensation ({upcomingCompItems.length}):</strong>{' '}
                          {upcomingCompItems.map((i) => `${i.name} (starts ${i.effective_from})`).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* TAB 2: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Employee Documents Repository</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Official contracts, identification, and compliance verification records archived to <code className="font-mono text-slate-700 dark:text-slate-300">/home/s/projects/ownmanage/document</code>.</p>
                    </div>
                    {canUploadDoc && (
                      <button
                        onClick={() => setShowDocUpload(true)}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition-colors self-start cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Upload Document
                      </button>
                    )}
                  </div>

                  {documents.length === 0 ? (
                    <div className="py-14 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No documents uploaded yet for this employee</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
                        Uploaded documents (ID proofs, contracts, certifications) are saved directly into <code className="font-mono text-slate-700 dark:text-slate-300">/home/s/projects/ownmanage/document</code>.
                      </p>
                      {canUploadDoc && (
                        <button
                          onClick={() => setShowDocUpload(true)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Upload First Document
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 shadow-xs">
                        <table className="w-full min-w-[640px] text-left text-xs text-slate-700 dark:text-slate-300">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3">Document Title</th>
                              <th className="px-4 py-3">Category</th>
                              <th className="px-4 py-3">Uploaded Date</th>
                              <th className="px-4 py-3">Uploaded By</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                            {documents.map((doc) => (
                              <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-3 text-slate-900 dark:text-white">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">{doc.title}</div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                                        <span className="truncate max-w-[200px]">{doc.file_name}</span>
                                        {doc.file_size_bytes > 0 && (
                                          <>
                                            <span>•</span>
                                            <span>{doc.file_size_bytes < 1024 ? `${doc.file_size_bytes} B` : `${(doc.file_size_bytes / 1024).toFixed(1)} KB`}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {doc.category_display || doc.category || 'General'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                  {new Date(doc.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                  {doc.uploaded_by_name || 'Admin'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    doc.verification_status === 'VERIFIED'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                      : doc.verification_status === 'REJECTED'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  }`}>
                                    {doc.verification_status || 'PENDING'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleViewDocument(doc)}
                                      className="px-2 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                      title="Preview Document"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Preview
                                    </button>
                                    <button
                                      onClick={() => handleDownloadDocument(doc)}
                                      disabled={downloadingDocId === doc.id}
                                      className="px-2 py-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                      title="Download Document"
                                    >
                                      <Download className="w-3.5 h-3.5" /> {downloadingDocId === doc.id ? 'Downloading...' : 'Download'}
                                    </button>
                                    {canDeleteDoc && (
                                      <button
                                        onClick={() => handleDeleteDocument(doc.id, doc.title)}
                                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                        title="Delete document"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">File Storage Vault:</span>
                          <code className="font-mono bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                            /home/s/projects/ownmanage/document
                          </code>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                          Vault Storage Synchronized ({documents.length} {documents.length === 1 ? 'file' : 'files'})
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ACTIVITY LOG */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Employee Activity Timeline</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Complete audit trail of profile modifications, compensation revisions, centre transfers, and status changes.</p>
                  </div>

                  {activityLogs.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20">
                      No activity logged for this employee yet.
                    </div>
                  ) : (
                    <div className="relative pl-5 sm:pl-6 space-y-4 border-l-2 border-slate-200 dark:border-slate-800 ml-1.5 sm:ml-2">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="relative group">
                          <div className="absolute -left-[27px] sm:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 ring-2 ring-blue-500/30" />
                          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                              <span className="font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                                {log.activity_type}
                              </span>
                              <span className="text-slate-500 text-[11px] font-mono">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-2 break-words">{log.description}</p>
                            {log.performed_by_name && (
                              <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                                Performed by: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.performed_by_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: WORKING HOURS */}
              {activeTab === 'hours' && (
                <div className="space-y-6">
                  {/* Configuration Provenance Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold uppercase tracking-wider">
                          Effective Working Hours Configuration
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {workingHours?.configuration_source || `Inherited from ${employee?.branch_name || 'Enterprise'}`}
                        </div>
                      </div>
                    </div>

                    <div className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs self-start sm:self-auto shrink-0">
                      {workingHours?.source_badge || 'Inherited from Centre'}
                    </div>
                  </div>

                  {/* Working Hours Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                    {/* Shift Timings */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shift Timings</div>
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {workingHours?.shift_timings?.office_start || '09:00'} – {workingHours?.shift_timings?.office_end || '18:00'}
                      </div>
                      <p className="text-xs text-slate-500">Official working day duration</p>
                    </div>

                    {/* Break Schedule */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Break Schedule</div>
                      <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {workingHours?.shift_timings?.break_start || '13:00'} – {workingHours?.shift_timings?.break_end || '14:00'}
                      </div>
                      <p className="text-xs text-slate-500">Designated meal & recess interval</p>
                    </div>

                    {/* Grace Period */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grace Period</div>
                      <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                        {workingHours?.rules?.grace_period_minutes ?? 15} Minutes
                      </div>
                      <p className="text-xs text-slate-500">Late punch penalty waiver threshold</p>
                    </div>
                  </div>

                  {/* Attendance Calculation Thresholds */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">Attendance Calculation Rules</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block mb-1">Minimum Present</span>
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {workingHours?.rules?.minimum_present_minutes ?? 480} mins (8 hrs)
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block mb-1">Minimum Half Day</span>
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {workingHours?.rules?.minimum_half_day_minutes ?? 240} mins (4 hrs)
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block mb-1">Overtime Status</span>
                        <span className={`font-bold text-base ${workingHours?.rules?.ot_enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                          {workingHours?.rules?.ot_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 block mb-1">Weekly Off</span>
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {workingHours?.rules?.weekly_off_days ? workingHours.rules.weekly_off_days.join(', ') : 'Sunday'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ATTENDANCE */}
              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  {/* Filters Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <select
                        value={attMonth}
                        onChange={(e) => setAttMonth(parseInt(e.target.value))}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                      >
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                          <option key={m} value={idx + 1}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={attYear}
                        onChange={(e) => setAttYear(parseInt(e.target.value))}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                      >
                        {[2024, 2025, 2026, 2027].map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500 font-medium shrink-0">Status:</label>
                      <select
                        value={attFilterStatus}
                        onChange={(e) => setAttFilterStatus(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="PRESENT">Present</option>
                        <option value="LATE">Late</option>
                        <option value="HALF_DAY">Half Day</option>
                        <option value="ABSENT">Absent</option>
                        <option value="LEAVE">On Leave</option>
                        <option value="WEEK_OFF">Weekly Off</option>
                        <option value="HOLIDAY">Holiday</option>
                      </select>
                    </div>
                  </div>

                  {/* Attendance History Table */}
                  {filteredAttendance.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                      No attendance punch records for selected period.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 shadow-xs">
                      <table className="w-full min-w-[780px] text-left text-xs text-slate-700 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Check-in</th>
                            <th className="px-4 py-3">Check-out</th>
                            <th className="px-4 py-3">Worked Hours</th>
                            <th className="px-4 py-3">OT</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Method</th>
                            <th className="px-4 py-3">Location</th>
                            <th className="px-4 py-3">Correction / Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                          {filteredAttendance.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {item.date} <span className="text-slate-400 font-normal">({item.weekday})</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{item.check_in || '—'}</td>
                              <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{item.check_out || '—'}</td>
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{item.work_hours || '00h 00m'}</td>
                              <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">{item.ot_hours || '00h 00m'}</td>
                              <td className="px-4 py-3">{getAttendanceStatusBadge(item.status)}</td>
                              <td className="px-4 py-3 text-slate-500">{item.verification_method || 'WEB'}</td>
                              <td className="px-4 py-3 text-slate-500">{item.location || 'Centre'}</td>
                              <td className="px-4 py-3 text-slate-400 italic">{item.correction !== 'None' ? item.correction : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: LEAVE */}
              {activeTab === 'leave' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Leave Quota & Applications</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Review leave balances, applied requests, and approval records.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={leaveFilterStatus}
                        onChange={(e) => setLeaveFilterStatus(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs"
                      >
                        <option value="ALL">All Requests</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                  </div>

                  {filteredLeaves.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                      No leave applications found for this employee.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 shadow-xs">
                      <table className="w-full min-w-[680px] text-left text-xs text-slate-700 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3">Leave Type</th>
                            <th className="px-4 py-3">Dates</th>
                            <th className="px-4 py-3">Duration</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Reason</th>
                            <th className="px-4 py-3">Approved By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                          {filteredLeaves.map((l) => (
                            <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{l.leave_type_name || 'Leave'}</td>
                              <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{l.start_date} to {l.end_date}</td>
                              <td className="px-4 py-3">{l.duration_display || l.duration_type || 'Full Day'}</td>
                              <td className="px-4 py-3">
                                {l.is_paid ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Paid</span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-400">Unpaid</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  l.status === 'APPROVED'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : l.status === 'REJECTED'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{l.reason || '—'}</td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{l.approved_by_name || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: SALARY & COMPENSATION */}
              {activeTab === 'salary' && (
                <div className="space-y-6">
                  {/* Current Active Compensation Banner */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
                    <div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-500" /> Active Base Monthly Salary
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                        {currentRevision ? `${currentRevision.currency} ${Number(currentRevision.basic_salary).toLocaleString('en-IN')}` : 'Not Configured'}
                      </div>
                      {currentRevision && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                          <span>Effective From: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{currentRevision.effective_from}</strong></span>
                          <span>•</span>
                          <span>OT Rate: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{currentRevision.currency} {currentRevision.ot_rate}/hr</strong></span>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">Current Active</span>
                        </div>
                      )}
                    </div>

                    {canManageSalary && (
                      <button
                        onClick={() => setShowRevisionModal(true)}
                        className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition-colors text-center justify-center flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> New Salary Revision
                      </button>
                    )}
                  </div>

                  {/* Scheduled Upcoming Salary Revision Card */}
                  {upcomingRevision && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                              Upcoming Revision Scheduled
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/90 text-amber-900 dark:bg-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              Takes effect on {upcomingRevision.effective_from}
                            </span>
                          </div>
                          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                            {upcomingRevision.currency} {Number(upcomingRevision.basic_salary).toLocaleString('en-IN')}
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2">
                              / month (OT: {upcomingRevision.currency} {upcomingRevision.ot_rate}/hr)
                            </span>
                            {currentRevision && Number(currentRevision.basic_salary) > 0 && (
                              <span className="ml-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                +{upcomingRevision.currency} {(Number(upcomingRevision.basic_salary) - Number(currentRevision.basic_salary)).toLocaleString('en-IN')} (+{(((Number(upcomingRevision.basic_salary) - Number(currentRevision.basic_salary)) / Number(currentRevision.basic_salary)) * 100).toFixed(1)}%)
                              </span>
                            )}
                          </div>
                          {upcomingRevision.reason && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              Reason: <span className="font-medium text-slate-800 dark:text-slate-200">{upcomingRevision.reason}</span>
                              {upcomingRevision.revised_by_name ? ` • Revised by ${upcomingRevision.revised_by_name}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Itemized Compensation Components */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Itemized Compensation Components</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Earnings, allowances, one-time/recurring bonuses, and payroll deductions.</p>
                      </div>

                      {canManageSalary && (
                        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                          <button
                            onClick={() => {
                              setCompType('EARNING')
                              setCompForm((f) => ({ ...f, frequency: 'RECURRING' }))
                              setShowCompModal(true)
                            }}
                            className="flex-1 sm:flex-initial justify-center px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Earning
                          </button>
                          <button
                            onClick={() => {
                              setCompType('BONUS')
                              setCompForm((f) => ({ ...f, frequency: 'ONE_TIME' }))
                              setShowCompModal(true)
                            }}
                            className="flex-1 sm:flex-initial justify-center px-3 py-1.5 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800 rounded-xl transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Bonus
                          </button>
                          <button
                            onClick={() => {
                              setCompType('DEDUCTION')
                              setCompForm((f) => ({ ...f, frequency: 'RECURRING' }))
                              setShowCompModal(true)
                            }}
                            className="flex-1 sm:flex-initial justify-center px-3 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-xl transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add Deduction
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Components Table */}
                    {compItems.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30">
                        No custom compensation items defined for this employee.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 shadow-xs">
                        <table className="w-full min-w-[720px] text-left text-xs text-slate-700 dark:text-slate-300">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3">Component Name</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Frequency</th>
                              <th className="px-4 py-3">Calculation</th>
                              <th className="px-4 py-3">Amount / %</th>
                              <th className="px-4 py-3">Effective Range</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                            {compItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold">{item.name}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                    {item.component_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {item.frequency === 'ONE_TIME' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                                      ⚡ One-Time
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1">
                                      🔄 Recurring
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {item.calculation_type === 'PERCENTAGE' ? 'Percentage (%)' : 'Fixed Amount'}
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                                  {item.calculation_type === 'PERCENTAGE' ? `${item.amount}%` : `₹ ${Number(item.amount).toLocaleString('en-IN')}`}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {item.effective_from} to {item.effective_to || 'Present'}
                                </td>
                                <td className="px-4 py-3">
                                  {isItemUpcoming(item) ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" /> Upcoming
                                    </span>
                                  ) : item.is_active ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1">
                                      Active
                                    </span>
                                  ) : item.status_display === 'EXPIRED' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                      Expired
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                      Deactivated
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {canManageSalary && item.is_active && (
                                    <button
                                      onClick={() => handleDeactivateCompItem(item.id, item.name)}
                                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                                      title={isItemUpcoming(item) ? "Cancel scheduled component" : "Soft-deactivate without altering historical payroll"}
                                    >
                                      {isItemUpcoming(item) ? 'Cancel / Deactivate' : 'Deactivate'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Salary Comparison & History Engine */}
                  <div className="space-y-3 pt-5 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Historical Salary Revisions & Comparisons
                    </h4>

                    {comparisons.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs">No historical revisions recorded yet.</div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 shadow-xs">
                        <table className="w-full min-w-[720px] text-left text-xs text-slate-700 dark:text-slate-300">
                          <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="px-4 py-3">Effective Date</th>
                              <th className="px-4 py-3">New Salary</th>
                              <th className="px-4 py-3">Previous</th>
                              <th className="px-4 py-3">Difference</th>
                              <th className="px-4 py-3">Change %</th>
                              <th className="px-4 py-3">Changed By</th>
                              <th className="px-4 py-3">Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                            {comparisons.map((c) => (
                              <tr key={c.revision_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-3 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  <span className="font-medium">{c.effective_from}</span>
                                  {c.is_upcoming || c.status === 'UPCOMING' || c.effective_from > todayDateStr ? (
                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold inline-flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" /> Upcoming
                                    </span>
                                  ) : (c.is_current || c.status === 'CURRENT') ? (
                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold inline-flex items-center gap-1">
                                      Current
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                  {c.currency} {c.new_salary.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                                  {c.previous_salary ? `${c.currency} ${c.previous_salary.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="px-4 py-3 font-mono whitespace-nowrap">
                                  {c.previous_salary ? (
                                    <span className={c.difference >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                                      {c.difference >= 0 ? '+' : ''}{c.currency} {c.difference.toLocaleString('en-IN')}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 font-mono whitespace-nowrap">
                                  {c.previous_salary ? (
                                    <span className={`font-bold ${c.percentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                      {c.percentage >= 0 ? '+' : ''}{c.percentage}%
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 text-slate-500">{c.changed_by}</td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{c.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 8: FACE RECOGNITION BIOMETRICS */}
              {activeTab === 'biometrics' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <ScanFace className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Face Recognition Biometrics
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              biometricStatus?.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : biometricStatus?.status === 'REVOKED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}>
                              {biometricStatus?.status === 'ACTIVE' ? 'ENROLLED' : (biometricStatus?.status || 'NOT ENROLLED')}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Production on-device biometric verification contract: MobileFaceNet + ArcFace (128-D L2)
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {canEnrollFace && biometricStatus?.status === 'ACTIVE' && (
                          <button
                            onClick={() => setShowRevokeModal(true)}
                            className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                          >
                            Revoke Face
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">Model Contract</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block truncate" title={biometricStatus?.model_id || 'OWNMANAGE-MOBILEFACENET-ARCFACE-128-V1'}>
                          {biometricStatus?.model_id || 'OWNMANAGE-MOBILEFACENET-ARCFACE-128-V1'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Version {biometricStatus?.model_version || '1.0.0'}</span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">Enrolled Date</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {biometricStatus?.enrolled_at ? new Date(biometricStatus.enrolled_at).toLocaleDateString() : '—'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {biometricStatus?.enrolled_at ? new Date(biometricStatus.enrolled_at).toLocaleTimeString() : 'Not enrolled'}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">Enrolled By</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {biometricStatus?.enrolled_by || '—'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {biometricStatus?.quality_score ? `Quality: ${(biometricStatus.quality_score * 100).toFixed(1)}%` : 'No quality data'}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">Authorized Device</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate" title={biometricStatus?.device_name || biometricStatus?.device_id || 'None'}>
                          {biometricStatus?.device_name || biometricStatus?.device_id || 'No Device Registered'}
                        </span>
                        <span className={`text-[10px] font-bold mt-1 inline-block ${biometricStatus?.device_status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {biometricStatus?.device_status || 'UNBOUND'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Messages */}
                  {bioSuccess && (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {bioSuccess}
                    </div>
                  )}

                  {bioError && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      {bioError}
                    </div>
                  )}

                  {/* Enrollment / Re-enrollment Form */}
                  {canEnrollFace ? (
                    <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        {biometricStatus?.status === 'ACTIVE' ? 'Re-enroll Face Photograph' : 'Enroll Face Photograph'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Upload a front-facing image containing exactly one clear, well-lit face. The image will be processed by the UltraFace detector and MobileFaceNet ArcFace embedding pipeline.
                      </p>

                      <form onSubmit={handleEnrollFace} className="space-y-4">
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setEnrollFile(e.target.files[0])
                                setBioError(null)
                              }
                            }}
                            className="hidden"
                            id="face-enroll-input"
                          />
                          <label htmlFor="face-enroll-input" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400">
                              <ScanFace className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {enrollFile ? enrollFile.name : 'Click to select or drop employee face image'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              JPG, PNG, or WebP. Frontal pose, good lighting, single person.
                            </span>
                          </label>
                        </div>

                        <div className="flex justify-end gap-3">
                          <button
                            type="submit"
                            disabled={!enrollFile || enrolling}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                          >
                            {enrolling ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing & Enrolling...
                              </>
                            ) : (
                              <>
                                <ScanFace className="w-4 h-4" />
                                {biometricStatus?.status === 'ACTIVE' ? 'Execute Re-enrollment' : 'Enroll Face'}
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Face enrollment requires Enterprise Administrator privileges or a Manager with the <code className="font-mono text-blue-600 dark:text-blue-400">employee.face_enrollment</code> permission.
                    </div>
                  )}

                  {/* Security & Privacy Architecture Assurance */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                      <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Biometric Security & Privacy Architecture
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                      <li>Biometric templates are encrypted at rest using server-managed cryptographic keys (AES-GCM / PBKDF2).</li>
                      <li>Raw face photographs are never stored as recurring credentials or exposed via attendance APIs.</li>
                      <li>Face matching executes on-device via local MobileFaceNet inference without transmitting video frames over the network.</li>
                      <li>Server-side attendance verification accepts short-lived signed assertions with replay protection.</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL: EDIT PERSONAL DETAILS */}
        {showPersonalModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Personal Information</h3>
                <button
                  onClick={() => setShowPersonalModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePersonal} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={personalForm.first_name}
                      onChange={(e) => setPersonalForm({ ...personalForm, first_name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={personalForm.last_name}
                      onChange={(e) => setPersonalForm({ ...personalForm, last_name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={personalForm.email}
                      onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={personalForm.phone}
                      onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={personalForm.date_of_birth}
                      onChange={(e) => setPersonalForm({ ...personalForm, date_of_birth: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      placeholder="e.g. Spouse (+91 9876543210)"
                      value={personalForm.emergency_contact}
                      onChange={(e) => setPersonalForm({ ...personalForm, emergency_contact: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Residential Address</label>
                  <textarea
                    rows={2}
                    value={personalForm.address}
                    onChange={(e) => setPersonalForm({ ...personalForm, address: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPersonalModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition-colors text-center cursor-pointer"
                  >
                    Save Personal Details
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT EMPLOYMENT DETAILS */}
        {showEmploymentModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Employment & Hierarchy</h3>
                <button
                  onClick={() => setShowEmploymentModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEmployment} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Centre / Branch *</label>
                  <select
                    value={employmentForm.branch}
                    onChange={(e) => setEmploymentForm({ ...employmentForm, branch: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {metadata.branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                    <select
                      value={employmentForm.department}
                      onChange={(e) => setEmploymentForm({ ...employmentForm, department: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {metadata.departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                    <input
                      type="text"
                      required
                      value={employmentForm.designation}
                      onChange={(e) => setEmploymentForm({ ...employmentForm, designation: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reporting Manager</label>
                    <select
                      value={employmentForm.manager}
                      onChange={(e) => setEmploymentForm({ ...employmentForm, manager: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">None / Independent</option>
                      {metadata.managers.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employment Status</label>
                    <select
                      value={employmentForm.employment_status}
                      onChange={(e) => setEmploymentForm({ ...employmentForm, employment_status: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PROBATION">Probation</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="TERMINATED">Terminated</option>
                      <option value="RESIGNED">Resigned</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEmploymentModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow transition-colors text-center cursor-pointer"
                  >
                    Save Employment Details
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD COMPENSATION COMPONENT */}
        {showCompModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add {compType} Component</h3>
                <button
                  onClick={() => setShowCompModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCompItem} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Component Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Travel Allowance, Diwali Bonus, Loan Recovery"
                    value={compForm.name}
                    onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Calculation Type</label>
                    <select
                      value={compForm.calculation_type}
                      onChange={(e) => setCompForm({ ...compForm, calculation_type: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {compForm.calculation_type === 'PERCENTAGE' ? 'Value (%)' : 'Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={compForm.amount}
                      onChange={(e) => setCompForm({ ...compForm, amount: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Frequency</label>
                  <select
                    value={compForm.frequency}
                    onChange={(e) => setCompForm({ ...compForm, frequency: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="RECURRING">Recurring (Applied monthly ongoing)</option>
                    <option value="ONE_TIME">One-Time (Period-specific - does not recur)</option>
                  </select>
                  {compForm.frequency === 'ONE_TIME' && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      ⚡ One-time components apply strictly to the payroll period covering the effective date and never recur.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={compForm.effective_from}
                    onChange={(e) => setCompForm({ ...compForm, effective_from: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {compForm.effective_from && compForm.effective_from > todayDateStr && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Scheduled Future Date: Will be marked as Upcoming until {compForm.effective_from}.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason / Notes</label>
                  <input
                    type="text"
                    placeholder="Optional justification"
                    value={compForm.reason}
                    onChange={(e) => setCompForm({ ...compForm, reason: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCompModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition-colors text-center cursor-pointer"
                  >
                    Save Component
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: ADD SALARY REVISION */}
        {showRevisionModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Salary Revision</h3>
                <button
                  onClick={() => setShowRevisionModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                {backdatedWarning && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-xl space-y-3 text-xs text-amber-900 dark:text-amber-200">
                    <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{backdatedWarning.warning}</span>
                    </div>
                    <p className="leading-relaxed">{backdatedWarning.detail}</p>
                    {backdatedWarning.affected_periods && (
                      <div className="bg-white dark:bg-slate-950 p-2.5 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-amber-200 dark:border-amber-900">
                        {backdatedWarning.affected_periods.map((p: string, i: number) => (
                          <div key={i}>• {p}</div>
                        ))}
                      </div>
                    )}
                    <div className="pt-2 border-t border-amber-200 dark:border-amber-900/80">
                      <ToggleSwitch
                        id="confirm-backdated"
                        checked={revisionForm.confirm_backdated}
                        onChange={(val) => setRevisionForm({ ...revisionForm, confirm_backdated: val })}
                        label="Historical Lock Acknowledged"
                        description="I confirm that finalized historical payroll records will remain unmodified."
                        size="sm"
                      />
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveRevision} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Monthly Base Salary (₹) *</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 55000"
                        value={revisionForm.basic_salary}
                        onChange={(e) => setRevisionForm({ ...revisionForm, basic_salary: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Overtime Hourly Rate (₹)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={revisionForm.ot_rate}
                        onChange={(e) => setRevisionForm({ ...revisionForm, ot_rate: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Effective From Date *</label>
                    <input
                      type="date"
                      required
                      value={revisionForm.effective_from}
                      onChange={(e) => setRevisionForm({ ...revisionForm, effective_from: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {revisionForm.effective_from && revisionForm.effective_from > todayDateStr ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Scheduled Future Revision: Will be marked as Upcoming and take effect on {revisionForm.effective_from}.
                        </span>
                      ) : (
                        <span>Salary takes effect on this date for all future payroll runs.</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Revision Reason *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Annual Appraisal, Promotion, Market Correction"
                      value={revisionForm.reason}
                      onChange={(e) => setRevisionForm({ ...revisionForm, reason: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowRevisionModal(false)}
                      className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition-colors text-center cursor-pointer"
                    >
                      Save Salary Revision
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: UPLOAD DOCUMENT */}
        {showDocUpload && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Upload Employee Document</h3>
                <button
                  onClick={() => setShowDocUpload(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUploadDocument} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2.5">
                  <Upload className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="leading-snug">Uploaded documents will be persisted directly to <strong className="font-mono">/home/s/projects/ownmanage/document</strong>.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aadhaar Card, Offer Letter, Degree Certificate"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Document Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="IDENTITY_PROOF">Identity Proof</option>
                    <option value="ADDRESS_PROOF">Address Proof</option>
                    <option value="OFFER_LETTER">Offer Letter</option>
                    <option value="CONTRACT">Employment Contract</option>
                    <option value="EDUCATION">Education Certificate</option>
                    <option value="EXPERIENCE">Experience Certificate</option>
                    <option value="BANK">Bank Document</option>
                    <option value="TAX">Tax Document</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Choose File *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                  {docFile && (
                    <div className="mt-1.5 text-[11px] text-slate-500 font-mono">
                      Selected: <strong>{docFile.name}</strong> ({docFile.size < 1024 ? `${docFile.size} B` : `${(docFile.size / 1024).toFixed(1)} KB`})
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDocUpload(false)}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={docUploading}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow disabled:opacity-50 transition-colors text-center cursor-pointer"
                  >
                    {docUploading ? 'Uploading...' : 'Save Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Revoke Face Biometric Modal */}
        {showRevokeModal && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Revoke Face Biometrics
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                Revoking this employee's face enrollment will permanently deactivate their active biometric template.
                They will no longer be able to punch in using face verification until re-enrolled.
              </p>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Revocation *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Employee requested, appearance change, security audit"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRevokeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevokeFace}
                  disabled={bioLoading || !revokeReason.trim()}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {bioLoading ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployeeProfileModal
