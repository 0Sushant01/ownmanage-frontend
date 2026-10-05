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
  TrendingUp
} from './Icons'
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
  const { } = useAuth()
  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 'activity' | 'hours' | 'attendance' | 'leave' | 'salary'
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
  const [attendanceCalendar, setAttendanceCalendar] = useState<any[]>([])
  const [centrePolicy, setCentrePolicy] = useState<any>(null)

  // Form modals / sub-states
  const [showCompModal, setShowCompModal] = useState<boolean>(false)
  const [compType, setCompType] = useState<'EARNING' | 'BONUS' | 'ALLOWANCE' | 'DEDUCTION' | 'OVERTIME'>('EARNING')
  const [compForm, setCompForm] = useState({
    name: '',
    calculation_type: 'FIXED_AMOUNT',
    amount: '',
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
  const [docType, setDocType] = useState<string>('OFFER_LETTER')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docUploading, setDocUploading] = useState<boolean>(false)

  // Fetch complete employee profile
  const fetchEmployeeData = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get(`/employees/${employeeId}/`)
      setEmployee(res.data)

      // Fetch Centre policy if employee has a branch
      if (res.data.branch) {
        apiClient.get(`/centres/${res.data.branch}/attendance-policy/`)
          .then((pRes) => setCentrePolicy(pRes.data))
          .catch(() => {})
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employee details.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    if (isOpen) {
      fetchEmployeeData()
    }
  }, [isOpen, fetchEmployeeData])

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
    } else if (activeTab === 'salary') {
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
    } else if (activeTab === 'attendance') {
      const now = new Date()
      apiClient.get(`/attendance/calendar/?employee_id=${employeeId}&year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
        .then((res) => setAttendanceCalendar(res.data.days || []))
        .catch(() => {})
    }
  }, [activeTab, isOpen, employeeId])

  if (!isOpen) return null

  // Save new compensation item
  const handleSaveCompItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await apiClient.post(`/employees/${employeeId}/compensation-items/`, {
        ...compForm,
        component_type: compType,
        amount: parseFloat(compForm.amount)
      })
      setShowCompModal(false)
      setCompForm({
        name: '',
        calculation_type: 'FIXED_AMOUNT',
        amount: '',
        effective_from: new Date().toISOString().split('T')[0],
        reason: '',
        notes: ''
      })
      // Refresh compensation list
      const res = await apiClient.get(`/employees/${employeeId}/compensation-items/`)
      setCompItems(res.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add compensation item.')
    }
  }

  // Deactivate compensation item
  const handleDeactivateCompItem = async (itemId: string, itemName: string) => {
    if (!window.confirm(`Deactivate compensation item '${itemName}'? Historical payroll will remain unchanged.`)) return
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
      // Refresh revisions and comparisons
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
      formData.append('document_type', docType)
      formData.append('file', docFile)
      formData.append('employee', employeeId)

      await apiClient.post(`/employees/${employeeId}/documents/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setShowDocUpload(false)
      setDocFile(null)
      const res = await apiClient.get(`/employees/${employeeId}/documents/`)
      setDocuments(Array.isArray(res.data) ? res.data : (res.data.results || []))
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload document.')
    } finally {
      setDocUploading(false)
    }
  }

  const latestRevision = revisions[0] || null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base">
              {employee ? `${employee.first_name[0]}${employee.last_name ? employee.last_name[0] : ''}` : 'E'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {employee?.full_name || 'Employee Profile'}
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {employee?.employee_id}
                </span>
              </h2>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{employee?.department_name || 'No Department'}</span>
                <span>•</span>
                <span>{employee?.designation_name || employee?.designation || 'Staff'}</span>
                <span>•</span>
                <span className="text-blue-400 font-medium">{employee?.branch_name || 'Unassigned Centre'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 7 Tabs Bar */}
        <div className="px-6 bg-slate-950/50 border-b border-slate-800 flex items-center space-x-1 overflow-x-auto text-xs font-semibold py-2">
          {[
            { key: 'overview', label: 'Overview', icon: User },
            { key: 'documents', label: 'Documents', icon: FileText },
            { key: 'activity', label: 'Activity Log', icon: History },
            { key: 'hours', label: 'Working Hours', icon: Clock },
            { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
            { key: 'leave', label: 'Leave', icon: CalendarDays },
            { key: 'salary', label: 'Salary & Compensation', icon: DollarSign }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">Loading employee profile...</div>
          ) : error ? (
            <div className="py-20 text-center text-rose-400 text-sm">{error}</div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal & Contact Details */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        Personal Information
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Full Name</span>
                          <span className="text-slate-200 font-semibold">{employee.full_name}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Employee ID</span>
                          <span className="text-slate-200 font-mono">{employee.employee_id}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Email</span>
                          <span className="text-slate-200">{employee.email}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Phone</span>
                          <span className="text-slate-200">{employee.phone || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Employment Details */}
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                        Employment & Hierarchy
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Centre / Branch</span>
                          <span className="text-blue-400 font-semibold">{employee.branch_name || 'Unassigned'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Department</span>
                          <span className="text-slate-200">{employee.department_name || '—'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Designation</span>
                          <span className="text-slate-200">{employee.designation_name || employee.designation || 'Staff'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Reporting Manager</span>
                          <span className="text-slate-200">{employee.manager_name || 'None'}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Joining Date</span>
                          <span className="text-slate-200">{employee.joining_date || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Employee Documents</h3>
                      <p className="text-xs text-slate-400">Official contracts, ID proofs, and compliance records.</p>
                    </div>
                    <button
                      onClick={() => setShowDocUpload(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Upload Document
                    </button>
                  </div>

                  {showDocUpload && (
                    <form onSubmit={handleUploadDocument} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Document Type</label>
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100"
                          >
                            <option value="OFFER_LETTER">Offer Letter</option>
                            <option value="ID_PROOF">ID Proof</option>
                            <option value="ADDRESS_PROOF">Address Proof</option>
                            <option value="EMPLOYMENT_CONTRACT">Employment Contract</option>
                            <option value="SALARY_DOC">Salary Document</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">Choose File</label>
                          <input
                            type="file"
                            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                            required
                            className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowDocUpload(false)}
                          className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={docUploading}
                          className="px-4 py-1.5 text-xs bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50"
                        >
                          {docUploading ? 'Uploading...' : 'Save Document'}
                        </button>
                      </div>
                    </form>
                  )}

                  {documents.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm">No documents uploaded yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                      {documents.map((doc) => (
                        <div key={doc.id} className="p-3.5 flex items-center justify-between text-sm">
                          <div>
                            <div className="font-semibold text-slate-200">{doc.document_type || 'Document'}</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Uploaded {new Date(doc.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          {doc.file && (
                            <a
                              href={doc.file}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-400 hover:underline"
                            >
                              View / Download
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ACTIVITY LOG */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Employee Activity Timeline</h3>
                    <p className="text-xs text-slate-400">Audit trail of salary revisions, centre transfers, manager reassignments, and status modifications.</p>
                  </div>

                  {activityLogs.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm">No activity records logged yet.</div>
                  ) : (
                    <div className="relative pl-6 space-y-4 border-l-2 border-slate-800">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="relative group">
                          <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-slate-900" />
                          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-200 uppercase tracking-wider">{log.activity_type}</span>
                              <span className="text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-300 mt-1">{log.description}</p>
                            {log.performed_by_name && (
                              <div className="text-xs text-slate-500 mt-2">
                                Changed by: <span className="text-slate-300 font-medium">{log.performed_by_name}</span>
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
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Applicable Shift & Working Hours</h3>
                    <p className="text-xs text-slate-400">Resolved schedule from {employee.branch_name || 'Enterprise Default'}.</p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Shift Timings</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        {centrePolicy?.effective?.office_start || '09:00'} – {centrePolicy?.effective?.office_end || '18:00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Break Schedule</div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        {centrePolicy?.effective?.break_start || '13:00'} – {centrePolicy?.effective?.break_end || '14:00'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Grace Period</div>
                      <div className="text-lg font-bold text-amber-400 mt-0.5">
                        {centrePolicy?.effective?.grace_period_minutes || 15} Minutes
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ATTENDANCE */}
              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Monthly Attendance History</h3>
                    <p className="text-xs text-slate-400">Daily punch verification records.</p>
                  </div>

                  {attendanceCalendar.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm">No attendance records for current month.</div>
                  ) : (
                    <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                      {attendanceCalendar.map((item, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-300 font-medium">{item.date}</span>
                          <span className="font-mono text-slate-400">
                            {item.check_in || '—'} to {item.check_out || '—'}
                          </span>
                          <span className="font-semibold text-slate-200">{item.work_hours}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 font-semibold text-slate-300">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: LEAVE */}
              {activeTab === 'leave' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Leave Requests & Quota</h3>
                    <p className="text-xs text-slate-400">Submitted and approved leave applications.</p>
                  </div>

                  {leaves.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm">No leave requests found.</div>
                  ) : (
                    <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                      {leaves.map((l) => (
                        <div key={l.id} className="p-3.5 flex items-center justify-between text-sm">
                          <div>
                            <div className="font-semibold text-slate-200">{l.leave_type_name || 'Leave'}</div>
                            <div className="text-xs text-slate-500">
                              {l.start_date} to {l.end_date} • {l.reason}
                            </div>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 text-slate-300">
                            {l.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: SALARY & COMPENSATION */}
              {activeTab === 'salary' && (
                <div className="space-y-6">
                  {/* Current Compensation Card */}
                  <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">Active Base Salary</div>
                      <div className="text-2xl font-bold text-white mt-1">
                        {latestRevision ? `${latestRevision.currency} ${Number(latestRevision.basic_salary).toLocaleString('en-IN')}` : 'Not Configured'}
                      </div>
                      {latestRevision && (
                        <div className="text-xs text-slate-400 mt-1">
                          Effective From: {latestRevision.effective_from} • OT Rate: {latestRevision.currency} {latestRevision.ot_rate}/hr
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowRevisionModal(true)}
                        className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-all"
                      >
                        + New Salary Revision
                      </button>
                    </div>
                  </div>

                  {/* Custom Salary Components (+ Add Earning, + Add Bonus, + Add Deduction) */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">Itemized Compensation Components</h4>
                        <p className="text-xs text-slate-400">Allowances, bonuses, and recurring/one-time deductions.</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCompType('EARNING')
                            setShowCompModal(true)
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Earning
                        </button>
                        <button
                          onClick={() => {
                            setCompType('BONUS')
                            setShowCompModal(true)
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-800 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Bonus
                        </button>
                        <button
                          onClick={() => {
                            setCompType('DEDUCTION')
                            setShowCompModal(true)
                          }}
                          className="px-3 py-1.5 text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Deduction
                        </button>
                      </div>
                    </div>

                    {/* Components Table */}
                    {compItems.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs border border-slate-800 rounded-xl bg-slate-950/40">
                        No custom compensation items defined for this employee.
                      </div>
                    ) : (
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-900 text-slate-400 uppercase font-semibold">
                            <tr>
                              <th className="px-4 py-3">Component Name</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Calculation</th>
                              <th className="px-4 py-3">Amount / %</th>
                              <th className="px-4 py-3">Effective Range</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 font-medium">
                            {compItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3 text-slate-100 font-semibold">{item.name}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                    {item.component_type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-400">
                                  {item.calculation_type === 'PERCENTAGE' ? 'Percentage (%)' : 'Fixed Amount'}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-100">
                                  {item.calculation_type === 'PERCENTAGE' ? `${item.amount}%` : `₹ ${Number(item.amount).toLocaleString('en-IN')}`}
                                </td>
                                <td className="px-4 py-3 text-slate-400">
                                  {item.effective_from} to {item.effective_to || 'Present'}
                                </td>
                                <td className="px-4 py-3">
                                  {item.is_active ? (
                                    <span className="text-emerald-400 font-semibold">Active</span>
                                  ) : (
                                    <span className="text-slate-500">Deactivated</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {item.is_active && (
                                    <button
                                      onClick={() => handleDeactivateCompItem(item.id, item.name)}
                                      className="text-rose-400 hover:text-rose-300 underline"
                                      title="Soft-deactivate without rewriting historical payroll"
                                    >
                                      Deactivate
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

                  {/* Salary Comparison Engine */}
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      Salary Revision Comparison & History
                    </h4>

                    {comparisons.length === 0 ? (
                      <div className="py-6 text-center text-slate-500 text-xs">No historical revisions recorded.</div>
                    ) : (
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-900 text-slate-400 uppercase font-semibold">
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
                          <tbody className="divide-y divide-slate-800 font-medium">
                            {comparisons.map((c) => (
                              <tr key={c.revision_id} className="hover:bg-slate-800/30">
                                <td className="px-4 py-3 text-slate-200">
                                  {c.effective_from}
                                  {c.is_current && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                                      Current
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-slate-100">
                                  {c.currency} {c.new_salary.toLocaleString('en-IN')}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-400">
                                  {c.previous_salary ? `${c.currency} ${c.previous_salary.toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {c.previous_salary ? (
                                    <span className={c.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                      {c.difference >= 0 ? '+' : ''}{c.currency} {c.difference.toLocaleString('en-IN')}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {c.previous_salary ? (
                                    <span className={`font-bold ${c.percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {c.percentage >= 0 ? '+' : ''}{c.percentage}%
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 text-slate-400">{c.changed_by}</td>
                                <td className="px-4 py-3 text-slate-300">{c.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal: Add Compensation Item */}
        {showCompModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Add {compType} Component</h3>
                <button onClick={() => setShowCompModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleSaveCompItem} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Component Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Performance Bonus, Travel Allowance, Loan Recovery"
                    value={compForm.name}
                    onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Calculation Type</label>
                    <select
                      value={compForm.calculation_type}
                      onChange={(e) => setCompForm({ ...compForm, calculation_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {compForm.calculation_type === 'PERCENTAGE' ? 'Percentage Value (%)' : 'Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={compForm.amount}
                      onChange={(e) => setCompForm({ ...compForm, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Effective From Date</label>
                  <input
                    type="date"
                    required
                    value={compForm.effective_from}
                    onChange={(e) => setCompForm({ ...compForm, effective_from: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Reason / Notes</label>
                  <input
                    type="text"
                    placeholder="Optional business explanation"
                    value={compForm.reason}
                    onChange={(e) => setCompForm({ ...compForm, reason: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCompModal(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow"
                  >
                    Save Component
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Salary Revision (with backdated confirmation warning) */}
        {showRevisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Create New Salary Revision</h3>
                <button onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {backdatedWarning && (
                <div className="p-4 bg-amber-950/80 border border-amber-800 rounded-xl space-y-2 text-xs text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    {backdatedWarning.warning}
                  </div>
                  <p>{backdatedWarning.detail}</p>
                  {backdatedWarning.affected_periods && (
                    <div className="bg-slate-950 p-2 rounded text-slate-300 font-mono text-[11px]">
                      {backdatedWarning.affected_periods.map((p: string, i: number) => (
                        <div key={i}>• {p}</div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center gap-2 pt-2 cursor-pointer font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={revisionForm.confirm_backdated}
                      onChange={(e) => setRevisionForm({ ...revisionForm, confirm_backdated: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 bg-slate-950 border-amber-700"
                    />
                    I confirm and acknowledge that finalized historical payroll will remain intact.
                  </label>
                </div>
              )}

              <form onSubmit={handleSaveRevision} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">New Base Monthly Salary</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 25000"
                      value={revisionForm.basic_salary}
                      onChange={(e) => setRevisionForm({ ...revisionForm, basic_salary: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Overtime Hourly Rate</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={revisionForm.ot_rate}
                      onChange={(e) => setRevisionForm({ ...revisionForm, ot_rate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Effective From Date</label>
                  <input
                    type="date"
                    required
                    value={revisionForm.effective_from}
                    onChange={(e) => setRevisionForm({ ...revisionForm, effective_from: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">Salary takes effect on this date for all future payroll runs.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Revision Reason</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Appraisal, Promotion, Market Correction"
                    value={revisionForm.reason}
                    onChange={(e) => setRevisionForm({ ...revisionForm, reason: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowRevisionModal(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow"
                  >
                    Save Salary Revision
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployeeProfileModal
