import React, { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { AttendanceDay } from '../types'

export const Attendance: React.FC = () => {
  const { employee } = useAuth()
  const [attendanceList, setAttendanceList] = useState<AttendanceDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Today state for quick punch (if employee is linked)
  const [todayState, setTodayState] = useState<{
    is_checked_in: boolean
    first_check_in_time?: string | null
    last_check_out_time?: string | null
    total_work_seconds: number
    day_status?: string
  } | null>(null)
  const [punching, setPunching] = useState(false)
  const [punchMessage, setPunchMessage] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Selected Day for Event Modal
  const [selectedDay, setSelectedDay] = useState<AttendanceDay | null>(null)

  const loadTodayState = async () => {
    if (!employee) return
    try {
      const res = await apiClient.get('/attendance/today/')
      setTodayState(res.data)
    } catch {
      // User might be SuperAdmin or business admin without staff profile
    }
  }

  const loadHistory = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const res = await apiClient.get('/attendance/history/', { params })
      setAttendanceList(res.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load attendance records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTodayState()
    loadHistory()
  }, [statusFilter, dateFrom, dateTo])

  const handlePunch = async (type: 'check_in' | 'check_out') => {
    try {
      setPunching(true)
      setPunchMessage(null)
      const endpoint = type === 'check_in' ? '/attendance/check-in/' : '/attendance/check-out/'
      const res = await apiClient.post(endpoint, { source: 'WEB' })
      setTodayState(res.data)
      setPunchMessage(res.data.detail || `Punch ${type === 'check_in' ? 'In' : 'Out'} recorded.`)
      // Refresh list
      loadHistory()
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
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
      case 'ABSENT':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/80'
      case 'HALF_DAY':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/80'
      case 'LEAVE':
        return 'bg-blue-950/80 text-blue-400 border-blue-800/80'
      case 'HOLIDAY':
      case 'WEEK_OFF':
        return 'bg-slate-800 text-slate-300 border-slate-700'
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700'
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance Logs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative daily attendance tracking and timestamped punch logs.
          </p>
        </div>
      </div>

      {/* Quick Punch Bar for linked Employees (Staff / Managers) */}
      {employee && todayState && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl font-bold ${
              todayState.is_checked_in ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {todayState.is_checked_in ? '⏱️' : '💤'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Punch Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  todayState.is_checked_in
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {todayState.is_checked_in ? 'ACTIVE SESSION' : 'NOT CHECKED IN'}
                </span>
              </div>
              <div className="text-sm text-slate-300 mt-1 flex flex-wrap gap-4">
                <span>First In: <strong className="text-white">{todayState.first_check_in_time || '--:--'}</strong></span>
                <span>Last Out: <strong className="text-white">{todayState.last_check_out_time || '--:--'}</strong></span>
                <span>Logged Work: <strong className="text-emerald-400">{formatHours(todayState.total_work_seconds)}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            {todayState.is_checked_in ? (
              <button
                onClick={() => handlePunch('check_out')}
                disabled={punching}
                className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition shadow-lg shadow-rose-900/30 disabled:opacity-50"
              >
                {punching ? 'Recording Punch...' : 'Check Out'}
              </button>
            ) : (
              <button
                onClick={() => handlePunch('check_in')}
                disabled={punching}
                className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
              >
                {punching ? 'Recording Punch...' : 'Check In'}
              </button>
            )}
          </div>
        </div>
      )}

      {punchMessage && (
        <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 text-sm">
          {punchMessage}
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="LEAVE">Leave</option>
            <option value="WEEK_OFF">Week Off</option>
            <option value="HOLIDAY">Holiday</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium">To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {(statusFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setStatusFilter('')
              setDateFrom('')
              setDateTo('')
            }}
            className="text-xs text-slate-400 hover:text-white underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
            <p className="text-sm">Fetching attendance records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-sm">{error}</div>
        ) : attendanceList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl block mb-3">📋</span>
            <p className="text-base font-semibold text-slate-300">No attendance records found</p>
            <p className="text-xs text-slate-500 mt-1">
              Recorded attendance logs will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Hours Logged</th>
                  <th className="px-6 py-4">Events</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {attendanceList.map((day) => (
                  <tr key={day.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-white">
                      {day.attendance_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-white">{day.employee_name}</div>
                      {day.employee_id_code && (
                        <div className="text-xs text-slate-500 font-mono">{day.employee_id_code}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(day.status)}`}>
                        {day.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-mono text-xs">
                      {day.work_hours_display || formatHours(day.total_work_seconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                      {day.events?.length || 0} events
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedDay(day)}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
                      >
                        View Events →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Events Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Attendance Audit Events</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedDay.employee_name} • {selectedDay.attendance_date}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {(!selectedDay.events || selectedDay.events.length === 0) ? (
                <p className="text-xs text-slate-500 text-center py-4">No individual punch events recorded.</p>
              ) : (
                selectedDay.events.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                        evt.event_type === 'CHECK_IN'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {evt.event_type}
                      </span>
                      <span className="text-slate-300">Source: {evt.source}</span>
                    </div>
                    <div className="text-slate-400 font-mono">
                      {new Date(evt.event_time).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedDay(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Attendance
