import React, { useEffect, useState, useCallback } from 'react'
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarDays,
  Coffee,
  HelpCircle,
  LogIn,
  LogOut,
  RefreshCw,
  Building2,
  Download
} from '../components/Icons'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CentreSelector } from '../components/CentreSelector'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnKpiCard } from '../design-system/components/OwnKpiCard'
import { OwnFilterBar } from '../design-system/components/OwnFilterBar'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { OwnCard, OwnCardContent } from '../design-system/components/OwnCard'
import { OwnStatusBadge } from '../design-system/components/OwnBadge'
import { OwnEmptyState } from '../design-system/components/OwnEmptyState'

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
  status:
    | 'PRESENT'
    | 'LATE'
    | 'HALF_DAY'
    | 'LEAVE_EARLY'
    | 'OVERTIME'
    | 'ABSENT'
    | 'ON_LEAVE'
    | 'HOLIDAY'
    | 'WEEKLY_OFF'
    | 'NOT_MARKED'
  late_minutes: number
  early_leave_minutes: number
  overtime_seconds: number
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
}

interface Department {
  id: string
  name: string
}

export const Attendance: React.FC = () => {
  const { employee } = useAuth()

  // Default date: CURRENT LOCAL DATE
  const getTodayLocalDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocalDate())
  const [selectedCentre, setSelectedCentre] = useState<string>('all')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
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
    not_marked: 0
  })

  // Self status for linked staff
  const [todayState, setTodayState] = useState<{
    is_checked_in: boolean
    first_check_in_time: string | null
    total_work_seconds: number
  } | null>(null)
  const [punching, setPunching] = useState<boolean>(false)
  const [punchMessage, setPunchMessage] = useState<string | null>(null)

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
  useEffect(() => {
    if (!employee) return
    apiClient
      .get('/attendance/today/')
      .then((res) => setTodayState(res.data))
      .catch((err) => console.error('Failed to load my today state', err))
  }, [employee])

  // Fetch attendance register with active filters
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
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      const res = await apiClient.get('/attendance/register/', { params })
      setRecords(res.data.records || [])
      setSummary(res.data.summary || {
        total_employees: 0, present: 0, late: 0, half_day: 0,
        leave_early: 0, absent: 0, on_leave: 0, holiday: 0,
        weekly_off: 0, not_marked: 0
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load attendance register.')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedCentre, selectedDept, selectedStatus, searchQuery])

  useEffect(() => {
    fetchRegister()
  }, [fetchRegister])

  const handlePunch = async (type: 'check_in' | 'check_out') => {
    try {
      setPunching(true)
      setPunchMessage(null)
      const endpoint = type === 'check_in' ? '/attendance/check-in/' : '/attendance/check-out/'
      const res = await apiClient.post(endpoint, { source: 'WEB' })
      setTodayState(res.data)
      setPunchMessage(res.data.detail || `Punch ${type === 'check_in' ? 'In' : 'Out'} recorded.`)
      fetchRegister()
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
        title="Daily Attendance Register"
        description="Real-time multi-centre roster tracking with automatic policy status resolution."
        breadcrumbs={[
          { label: 'Workspace', href: '/' },
          { label: 'Attendance' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <OwnButton
              onClick={() => fetchRegister()}
              disabled={loading}
              variant="secondary"
              size="md"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </OwnButton>
          </div>
        }
      />

      {/* Quick Punch Bar for linked Employees */}
      {employee && todayState && (
        <OwnCard className="bg-card border-border shadow-md">
          <OwnCardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  todayState.is_checked_in ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'
                }`}
              />
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">My Shift Status</div>
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

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="text-right hidden sm:block mr-2">
                <div className="text-xs text-muted-foreground">Total Work Time</div>
                <div className="text-sm font-semibold text-foreground">
                  {formatHours(todayState.total_work_seconds)}
                </div>
              </div>
              {!todayState.is_checked_in ? (
                <OwnButton
                  onClick={() => handlePunch('check_in')}
                  loading={punching}
                  variant="primary"
                  size="md"
                  leftIcon={<LogIn className="w-4 h-4" />}
                >
                  Punch In
                </OwnButton>
              ) : (
                <OwnButton
                  onClick={() => handlePunch('check_out')}
                  loading={punching}
                  variant="destructive"
                  size="md"
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Punch Out
                </OwnButton>
              )}
            </div>
          </OwnCardContent>
        </OwnCard>
      )}

      {punchMessage && (
        <div className="px-4 py-3 bg-primary/10 border border-primary/30 text-primary rounded-xl text-sm font-medium flex items-center justify-between">
          <span>{punchMessage}</span>
          <button onClick={() => setPunchMessage(null)} className="text-primary hover:opacity-75">✕</button>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <OwnKpiCard
          title="Total Assigned"
          value={summary.total_employees}
          variant="default"
        />
        <OwnKpiCard
          title="Present"
          value={summary.present}
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          variant="success"
        />
        <OwnKpiCard
          title="Late Arrivals"
          value={summary.late}
          icon={<Clock className="w-3.5 h-3.5" />}
          variant="warning"
        />
        <OwnKpiCard
          title="On Leave"
          value={summary.on_leave}
          icon={<CalendarDays className="w-3.5 h-3.5" />}
          variant="primary"
        />
        <OwnKpiCard
          title="Off / Holiday"
          value={summary.weekly_off + summary.holiday}
          icon={<Coffee className="w-3.5 h-3.5" />}
          variant="default"
        />
        <OwnKpiCard
          title="Not Marked"
          value={summary.not_marked}
          icon={<HelpCircle className="w-3.5 h-3.5" />}
          variant="danger"
        />
      </div>

      {/* Filter Control Bar */}
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
          <div className="flex flex-wrap items-center gap-3">
            <CentreSelector
              value={selectedCentre}
              onChange={(val) => setSelectedCentre(val)}
              className="w-48"
            />

            <OwnInput
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              size="sm"
              className="w-40"
            />

            <OwnSelect
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              options={[
                { value: 'all', label: 'All Departments' },
                ...departments.map((dept) => ({ value: dept.id, label: dept.name }))
              ]}
              size="sm"
              className="w-40"
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
              className="w-36"
            />

            <OwnButton
              onClick={handleExportMonthly}
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              title="Download full month attendance summary CSV"
            >
              Export CSV
            </OwnButton>
          </div>
        }
      />

      {/* Register Table View */}
      <OwnCard className="overflow-hidden border-border bg-card shadow-sm">
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
            title="No employees found"
            description="There are no employees configured for the selected Centre or search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted/60 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Centre</th>
                  <th className="px-6 py-4">Check In</th>
                  <th className="px-6 py-4">Check Out</th>
                  <th className="px-6 py-4">Work Hours</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {records.map((row) => (
                  <tr key={row.employee_id} className="hover:bg-muted/30 transition-colors">
                    {/* Employee */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{row.employee_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
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
                    <td className="px-6 py-4 text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{row.centre_name}</span>
                      </div>
                    </td>

                    {/* Check In */}
                    <td className="px-6 py-4">
                      {row.check_in !== '—' ? (
                        <span className="font-mono text-foreground">{row.check_in}</span>
                      ) : (
                        <span className="text-muted-foreground/60 font-mono">—</span>
                      )}
                      {row.late_minutes > 0 && (
                        <span className="block text-[11px] text-warning font-normal">
                          +{row.late_minutes}m late
                        </span>
                      )}
                    </td>

                    {/* Check Out */}
                    <td className="px-6 py-4">
                      {row.check_out !== '—' ? (
                        <span className="font-mono text-foreground">{row.check_out}</span>
                      ) : (
                        <span className="text-muted-foreground/60 font-mono">—</span>
                      )}
                      {row.early_leave_minutes > 0 && (
                        <span className="block text-[11px] text-warning font-normal">
                          -{row.early_leave_minutes}m early
                        </span>
                      )}
                    </td>

                    {/* Work Hours */}
                    <td className="px-6 py-4 font-mono text-foreground">
                      {row.work_hours}
                      {row.overtime_seconds > 0 && (
                        <span className="block text-[11px] text-primary font-normal">
                          +{Math.floor(row.overtime_seconds / 3600)}h OT
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <OwnStatusBadge status={row.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {row.events_count > 0 ? (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {row.events_count} event{row.events_count > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">No punches</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwnCard>
    </div>
  )
}

export default Attendance
