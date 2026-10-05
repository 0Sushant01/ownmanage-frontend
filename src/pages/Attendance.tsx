import React, { useEffect, useState, useCallback } from 'react'
import {
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserX,
  CalendarDays,
  Coffee,
  HelpCircle,
  LogIn,
  LogOut,
  RefreshCw,
  Building2
} from '../components/Icons'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CentreSelector } from '../components/CentreSelector'

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

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Quick punch state for logged in user
  const [todayState, setTodayState] = useState<{
    is_checked_in: boolean
    first_check_in_time?: string | null
    last_check_out_time?: string | null
    total_work_seconds: number
    day_status?: string
  } | null>(null)
  const [punching, setPunching] = useState<boolean>(false)
  const [punchMessage, setPunchMessage] = useState<string | null>(null)

  // Load departments once
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await apiClient.get('/departments/')
        setDepartments(Array.isArray(res.data) ? res.data : (res.data.results || []))
      } catch (err) {
        console.error('Failed to load departments:', err)
      }
    }
    fetchDepts()
  }, [])

  // Load quick punch state
  const loadTodayState = async () => {
    if (!employee) return
    try {
      const res = await apiClient.get('/attendance/today/')
      setTodayState(res.data)
    } catch {
      // Ignore if not a linked staff user
    }
  }

  useEffect(() => {
    loadTodayState()
  }, [employee])

  // Fetch register
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

  const formatHours = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            PRESENT
          </span>
        )
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            LATE
          </span>
        )
      case 'HALF_DAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-950/80 text-yellow-300 border border-yellow-800/80">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            HALF DAY
          </span>
        )
      case 'LEAVE_EARLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-950/80 text-orange-300 border border-orange-800/80">
            <LogOut className="w-3.5 h-3.5 text-orange-400" />
            LEAVE EARLY
          </span>
        )
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80">
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            ABSENT
          </span>
        )
      case 'ON_LEAVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/80">
            <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
            ON LEAVE
          </span>
        )
      case 'HOLIDAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/80">
            <Calendar className="w-3.5 h-3.5 text-purple-400" />
            HOLIDAY
          </span>
        )
      case 'WEEKLY_OFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Coffee className="w-3.5 h-3.5 text-slate-400" />
            WEEKLY OFF
          </span>
        )
      case 'NOT_MARKED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-dashed border-slate-700">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            NOT MARKED
          </span>
        )
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Calendar className="w-7 h-7 text-blue-500" />
            Daily Attendance Register
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-centre roster tracking with automatic policy status resolution.
          </p>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRegister()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors"
            title="Refresh register"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Punch Bar for linked Employees */}
      {employee && todayState && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                todayState.is_checked_in ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">My Shift Status</div>
              <div className="text-base font-bold text-white mt-0.5">
                {todayState.is_checked_in ? 'Checked In' : 'Checked Out / Not Checked In'}
                {todayState.first_check_in_time && (
                  <span className="text-xs font-normal text-slate-400 ml-2">
                    (First in: {todayState.first_check_in_time})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="text-right hidden sm:block mr-2">
              <div className="text-xs text-slate-400">Total Work Time</div>
              <div className="text-sm font-semibold text-slate-200">
                {formatHours(todayState.total_work_seconds)}
              </div>
            </div>
            {!todayState.is_checked_in ? (
              <button
                onClick={() => handlePunch('check_in')}
                disabled={punching}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-60"
              >
                <LogIn className="w-4 h-4" />
                {punching ? 'Recording...' : 'Punch In'}
              </button>
            ) : (
              <button
                onClick={() => handlePunch('check_out')}
                disabled={punching}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl shadow-lg shadow-rose-950/40 transition-all disabled:opacity-60"
              >
                <LogOut className="w-4 h-4" />
                {punching ? 'Recording...' : 'Punch Out'}
              </button>
            )}
          </div>
        </div>
      )}

      {punchMessage && (
        <div className="px-4 py-3 bg-blue-950/80 border border-blue-800 text-blue-200 rounded-xl text-sm flex items-center justify-between">
          <span>{punchMessage}</span>
          <button onClick={() => setPunchMessage(null)} className="text-blue-400 hover:text-white">✕</button>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-slate-400">Total Assigned</div>
          <div className="text-xl font-bold text-white mt-1">{summary.total_employees}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Present
          </div>
          <div className="text-xl font-bold text-emerald-300 mt-1">{summary.present}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Late Arrivals
          </div>
          <div className="text-xl font-bold text-amber-300 mt-1">{summary.late}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-blue-400 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> On Leave
          </div>
          <div className="text-xl font-bold text-blue-300 mt-1">{summary.on_leave}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-slate-400 flex items-center gap-1">
            <Coffee className="w-3 h-3" /> Weekly Off / Holiday
          </div>
          <div className="text-xl font-bold text-slate-300 mt-1">{summary.weekly_off + summary.holiday}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-xs font-medium text-rose-400 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Not Marked
          </div>
          <div className="text-xl font-bold text-rose-300 mt-1">{summary.not_marked}</div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
          {/* Reusable Centre Selector */}
          <div>
            <CentreSelector
              value={selectedCentre}
              onChange={(val) => setSelectedCentre(val)}
              className="w-full"
            />
          </div>

          {/* Date Picker (Default Local Current Date) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Date:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-100 shadow-sm"
              title="Attendance Date"
            />
          </div>

          {/* Search by Employee */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-100 placeholder-slate-500"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Dept:
            </span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-100"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Status:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-100"
            >
              <option value="all">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="LEAVE_EARLY">Leave Early</option>
              <option value="ABSENT">Absent</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="HOLIDAY">Holiday</option>
              <option value="WEEKLY_OFF">Weekly Off</option>
              <option value="NOT_MARKED">Not Marked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Register Table View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
            <p className="text-sm font-medium">Loading Attendance Register...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose-500 mb-3" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No employees found</p>
            <p className="text-xs text-slate-500 mt-1">
              There are no employees configured for the selected Centre or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
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
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {records.map((row) => (
                  <tr key={row.employee_id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Employee */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-100">{row.employee_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-slate-400">{row.employee_code}</span>
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
                    <td className="px-6 py-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{row.centre_name}</span>
                      </div>
                    </td>

                    {/* Check In */}
                    <td className="px-6 py-4">
                      {row.check_in !== '—' ? (
                        <span className="font-mono text-slate-200">{row.check_in}</span>
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                      {row.late_minutes > 0 && (
                        <span className="block text-[11px] text-amber-400 font-normal">
                          +{row.late_minutes}m late
                        </span>
                      )}
                    </td>

                    {/* Check Out */}
                    <td className="px-6 py-4">
                      {row.check_out !== '—' ? (
                        <span className="font-mono text-slate-200">{row.check_out}</span>
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                      {row.early_leave_minutes > 0 && (
                        <span className="block text-[11px] text-orange-400 font-normal">
                          -{row.early_leave_minutes}m early
                        </span>
                      )}
                    </td>

                    {/* Work Hours */}
                    <td className="px-6 py-4 font-mono text-slate-300">
                      {row.work_hours}
                      {row.overtime_seconds > 0 && (
                        <span className="block text-[11px] text-emerald-400 font-normal">
                          +{Math.floor(row.overtime_seconds / 3600)}h OT
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">{getStatusBadge(row.status)}</td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {row.events_count > 0 ? (
                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                          {row.events_count} event{row.events_count > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">No punches</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Attendance
