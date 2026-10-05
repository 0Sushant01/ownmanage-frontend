import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Plus,
  Building2,
  Clock,
  Sparkles,
  RefreshCw
} from '../components/Icons'
import apiClient from '../services/api'
import { Can } from '../components/Can'
import { CentreSelector } from '../components/CentreSelector'
import type { Holiday } from '../types'

export const Holidays: React.FC = () => {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonthIdx = today.getMonth() // 0-11
  const todayStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedCentre, setSelectedCentre] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Calendar View Month & Year (navigable independently or synced)
  const [calYear, setCalYear] = useState<number>(currentYear)
  const [calMonth, setCalMonth] = useState<number>(currentMonthIdx) // 0-11
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Pagination for table
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 8

  // Detail modal
  const [viewingHoliday, setViewingHoliday] = useState<Holiday | null>(null)

  // State
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [centres, setCentres] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Add modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    holiday_date: todayStr,
    holiday_scope: 'ENTERPRISE', // 'ENTERPRISE' | 'CENTRE'
    applies_to_all_centres: true,
    centres: [] as string[],
    is_optional: false,
    description: ''
  })

  // Sync calendar navigation if filter changes
  useEffect(() => {
    setCalYear(selectedYear)
  }, [selectedYear])

  useEffect(() => {
    if (selectedMonth !== 'all') {
      setCalMonth(parseInt(selectedMonth, 10) - 1)
    }
  }, [selectedMonth])

  // Load holidays and centres
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [holRes, cenRes] = await Promise.all([
        apiClient.get(`/holidays/?year=${selectedYear}`),
        apiClient.get('/centres/')
      ])
      setHolidays(Array.isArray(holRes.data) ? holRes.data : (holRes.data.results || []))
      setCentres(Array.isArray(cenRes.data) ? cenRes.data : (cenRes.data.results || []))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load holiday calendar.')
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered holidays with Centre resolution
  const resolvedHolidays = useMemo(() => {
    return holidays.filter((h) => {
      // Centre filtering
      if (selectedCentre && selectedCentre !== 'all') {
        const appliesAll = h.applies_to_all_centres
        const attachedCentreIds = (h.centres || []).map((c: any) => (typeof c === 'object' ? c.id : c))
        if (!appliesAll && !attachedCentreIds.includes(selectedCentre)) {
          return false
        }
      }

      // Month filtering from select
      if (selectedMonth && selectedMonth !== 'all') {
        const monthNum = parseInt(h.holiday_date.split('-')[1], 10)
        if (monthNum !== parseInt(selectedMonth, 10)) {
          return false
        }
      }

      // Type filtering
      if (selectedType === 'ENTERPRISE' && !h.applies_to_all_centres) return false
      if (selectedType === 'CENTRE' && h.applies_to_all_centres) return false
      if (selectedType === 'OPTIONAL' && !h.is_optional) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = h.name.toLowerCase().includes(q)
        const matchesDesc = (h.description || '').toLowerCase().includes(q)
        if (!matchesName && !matchesDesc) return false
      }

      return true
    })
  }, [holidays, selectedCentre, selectedMonth, selectedType, searchQuery])

  // Holidays filtered for table (respecting selected single date if clicked on calendar)
  const tableHolidays = useMemo(() => {
    if (selectedDate) {
      return resolvedHolidays.filter((h) => h.holiday_date === selectedDate)
    }
    // If viewing a specific month on calendar and month filter is "all", we still can show all or month-scoped
    return resolvedHolidays
  }, [resolvedHolidays, selectedDate])

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [tableHolidays.length, selectedDate])

  // Paginated holidays
  const totalPages = Math.max(1, Math.ceil(tableHolidays.length / itemsPerPage))
  const paginatedHolidays = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return tableHolidays.slice(start, start + itemsPerPage)
  }, [tableHolidays, currentPage, itemsPerPage])

  // Summary statistics
  const summary = useMemo(() => {
    let upcoming = 0
    let past = 0
    let optional = 0

    resolvedHolidays.forEach((h) => {
      if (h.is_optional) optional++
      if (h.holiday_date >= todayStr) {
        upcoming++
      } else {
        past++
      }
    })

    return {
      total: resolvedHolidays.length,
      upcoming,
      past,
      optional
    }
  }, [resolvedHolidays, todayStr])

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(calYear, calMonth, 1)
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // We want Monday as index 0, ..., Sunday as index 6
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7

    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate()

    const cells: Array<{
      dayNumber: number
      dateStr: string
      isCurrentMonth: boolean
      isToday: boolean
      holidays: Holiday[]
    }> = []

    // 1. Previous month trailing days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const prevMonthIdx = calMonth === 0 ? 11 : calMonth - 1
      const prevYear = calMonth === 0 ? calYear - 1 : calYear
      const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayHols = resolvedHolidays.filter((h) => h.holiday_date === dateStr)
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        holidays: dayHols
      })
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayHols = resolvedHolidays.filter((h) => h.holiday_date === dateStr)
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        holidays: dayHols
      })
    }

    // 3. Next month leading days (to fill out 35 or 42 cells)
    const totalCells = cells.length > 35 ? 42 : 35
    const remaining = totalCells - cells.length
    for (let d = 1; d <= remaining; d++) {
      const nextMonthIdx = calMonth === 11 ? 0 : calMonth + 1
      const nextYear = calMonth === 11 ? calYear + 1 : calYear
      const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayHols = resolvedHolidays.filter((h) => h.holiday_date === dateStr)
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        holidays: dayHols
      })
    }

    return cells
  }, [calYear, calMonth, resolvedHolidays, todayStr])

  // Calendar Navigation
  const prevYear = () => setCalYear((y) => y - 1)
  const nextYear = () => setCalYear((y) => y + 1)
  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear((y) => y - 1)
    } else {
      setCalMonth((m) => m - 1)
    }
  }
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear((y) => y + 1)
    } else {
      setCalMonth((m) => m + 1)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: newHoliday.name,
        holiday_date: newHoliday.holiday_date,
        applies_to_all_centres: newHoliday.holiday_scope === 'ENTERPRISE',
        centres: newHoliday.holiday_scope === 'CENTRE' ? newHoliday.centres : [],
        is_optional: newHoliday.is_optional,
        description: newHoliday.description
      }

      await apiClient.post('/holidays/', payload)
      setShowAddModal(false)
      setNewHoliday({
        name: '',
        holiday_date: todayStr,
        holiday_scope: 'ENTERPRISE',
        applies_to_all_centres: true,
        centres: [],
        is_optional: false,
        description: ''
      })
      setSuccessMsg('Holiday created successfully.')
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create holiday.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete holiday "${name}"?`)) return
    try {
      await apiClient.delete(`/holidays/${id}/`)
      setHolidays((prev) => prev.filter((h) => h.id !== id))
      if (selectedDate && tableHolidays.length <= 1) {
        setSelectedDate(null)
      }
      setSuccessMsg(`Holiday "${name}" deleted.`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete holiday.')
    }
  }

  const openAddWithDate = (dateStr: string) => {
    setNewHoliday((prev) => ({ ...prev, holiday_date: dateStr }))
    setShowAddModal(true)
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Calendar className="w-7 h-7 text-indigo-400" />
            Holiday Calendar
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise global holidays & centre-specific operational calendars.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <Can permission="holidays.manage">
            <button
              onClick={() => {
                setNewHoliday((prev) => ({ ...prev, holiday_date: selectedDate || todayStr }))
                setShowAddModal(true)
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-blue-900/30 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Holiday</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-400">Total Holidays</div>
          <div className="text-2xl font-bold text-white mt-1">{summary.total}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Upcoming
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{summary.upcoming}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Optional
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{summary.optional}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Past in {selectedYear}</div>
          <div className="text-2xl font-bold text-slate-400 mt-1">{summary.past}</div>
        </div>
      </div>

      {/* Filters Bar: Year, Centre, Month, Holiday Type, Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
          {/* Centre Selector */}
          <div>
            <CentreSelector
              value={selectedCentre}
              onChange={(val) => {
                setSelectedCentre(val)
                setSelectedDate(null)
              }}
              showAllOption={true}
            />
          </div>

          {/* Year Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Year:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => {
                const yr = parseInt(e.target.value, 10)
                setSelectedYear(yr)
                setCalYear(yr)
                setSelectedDate(null)
              }}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Month:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                if (e.target.value !== 'all') {
                  setCalMonth(parseInt(e.target.value, 10) - 1)
                }
                setSelectedDate(null)
              }}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">All Months</option>
              {monthNames.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>

          {/* Holiday Type */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Type:
            </span>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value)
                setSelectedDate(null)
              }}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">All Types</option>
              <option value="ENTERPRISE">Enterprise Holiday</option>
              <option value="CENTRE">Centre Holiday</option>
              <option value="OPTIONAL">Optional Holiday</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search holiday..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area: Left Calendar Widget & Right Holiday Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Widget (Always Visible Even When 0 Holidays) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          {/* Calendar Navigation Bar: «  ‹  Month Year  ›  » */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-1">
              <button
                onClick={prevYear}
                title="Previous Year"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={prevMonth}
                title="Previous Month"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center font-bold text-base text-white tracking-wide">
              {monthNames[calMonth]} {calYear}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={nextMonth}
                title="Next Month"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={nextYear}
                title="Next Year"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Column Headers: MON TUE WED THU FRI SAT SUN */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((wd, i) => (
              <div
                key={wd}
                className={`text-[11px] font-bold tracking-wider py-1.5 ${
                  i >= 5 ? 'text-indigo-400/80' : 'text-slate-400'
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {calendarDays.map((cell, idx) => {
              const hasHolidays = cell.holidays.length > 0
              const isSelected = selectedDate === cell.dateStr

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDate(null)
                    } else {
                      setSelectedDate(cell.dateStr)
                    }
                  }}
                  className={`min-h-[58px] p-1 rounded-xl flex flex-col items-center justify-between cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/40'
                      : cell.isToday
                      ? 'bg-sky-950/40 border-sky-500/60 shadow-inner'
                      : hasHolidays
                      ? 'bg-orange-950/20 border-orange-800/60 hover:bg-orange-900/30'
                      : cell.isCurrentMonth
                      ? 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                      : 'bg-slate-950/30 border-transparent text-slate-600 hover:bg-slate-900/30'
                  }`}
                  title={`${cell.dateStr}${hasHolidays ? `: ${cell.holidays.map(h => h.name).join(', ')}` : ''}`}
                >
                  {/* Day Number */}
                  <span
                    className={`text-xs font-semibold ${
                      isSelected
                        ? 'text-blue-300 font-bold'
                        : cell.isToday
                        ? 'text-sky-300 font-bold'
                        : cell.isCurrentMonth
                        ? 'text-slate-200'
                        : 'text-slate-600'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Holiday Badge (e.g., orange tag with truncated name) */}
                  {hasHolidays ? (
                    <div className="w-full flex flex-col gap-0.5 mt-0.5">
                      {cell.holidays.slice(0, 2).map((h) => {
                        const isOptional = h.is_optional
                        const isCentre = !h.applies_to_all_centres

                        return (
                          <div
                            key={h.id}
                            className={`w-full text-[9px] font-bold px-1 py-0.5 rounded truncate tracking-tight ${
                              isOptional
                                ? 'bg-amber-600 text-white'
                                : isCentre
                                ? 'bg-purple-600 text-white'
                                : 'bg-orange-600 text-white shadow-sm'
                            }`}
                            title={h.name}
                          >
                            {h.name}
                          </div>
                        )
                      })}
                      {cell.holidays.length > 2 && (
                        <span className="text-[9px] text-slate-400 font-mono">
                          +{cell.holidays.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : cell.isToday ? (
                    <span className="text-[9px] font-medium text-sky-400 tracking-tight">Today</span>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Calendar Footer / Legend */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                Enterprise
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                Centre
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                Optional
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-sky-400 bg-sky-950/60"></span>
                Today
              </span>
            </div>

            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium underline"
              >
                Clear Day Filter
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Holidays Table / Listing */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between">
          <div>
            {/* Table Header Controls */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Holidays List</span>
                  {selectedDate && (
                    <span className="text-xs font-normal text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800">
                      Filtered: {selectedDate}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tableHolidays.length} holiday{tableHolidays.length !== 1 ? 's' : ''} configured
                </p>
              </div>

              {selectedDate && (
                <Can permission="holidays.manage">
                  <button
                    onClick={() => openAddWithDate(selectedDate)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add for {selectedDate}</span>
                  </button>
                </Can>
              )}
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-7 h-7 animate-spin text-blue-500" />
                <span>Loading holidays...</span>
              </div>
            ) : tableHolidays.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-3">
                <Calendar className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-base font-semibold text-slate-300">
                  {selectedDate
                    ? `No holidays scheduled on ${selectedDate}`
                    : 'No holidays found matching selected filters'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {selectedDate
                    ? 'You can add a holiday on this day by clicking the Add button above.'
                    : 'The calendar on the left shows the complete monthly schedule. Click "+ Add Holiday" to configure a holiday.'}
                </p>
                <Can permission="holidays.manage">
                  <button
                    onClick={() => {
                      setNewHoliday((prev) => ({ ...prev, holiday_date: selectedDate || todayStr }))
                      setShowAddModal(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Holiday</span>
                  </button>
                </Can>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5 w-14">Sr. No.</th>
                      <th className="px-4 py-3.5">Name</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Type</th>
                      <th className="px-4 py-3.5">Scope</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {paginatedHolidays.map((h, index) => {
                      const dateObj = new Date(h.holiday_date)
                      const formattedDate = !isNaN(dateObj.getTime())
                        ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`
                        : h.holiday_date

                      const srNo = (currentPage - 1) * itemsPerPage + index + 1

                      return (
                        <tr
                          key={h.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            selectedDate === h.holiday_date ? 'bg-blue-950/20' : ''
                          }`}
                        >
                          {/* Sr. No. */}
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                            {srNo}
                          </td>

                          {/* Name */}
                          <td className="px-4 py-3 font-semibold text-white">
                            {h.name}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-xs font-mono text-slate-300 whitespace-nowrap">
                            {formattedDate}
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {h.is_optional ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold text-[10px]">
                                OPTIONAL
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-orange-950/80 text-orange-300 border border-orange-800 font-semibold text-[10px]">
                                MANDATORY
                              </span>
                            )}
                          </td>

                          {/* Scope / Status */}
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {h.applies_to_all_centres ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800 font-semibold text-[10px]">
                                Enterprise
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 font-semibold text-[10px]">
                                <Building2 className="w-2.5 h-2.5" />
                                Centre Specific
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingHoliday(h)}
                                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                                title="View Details"
                              >
                                View
                              </button>
                              <Can permission="holidays.manage">
                                <button
                                  onClick={() => handleDelete(h.id, h.name)}
                                  className="px-2.5 py-1 text-xs rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 transition"
                                  title="Delete Holiday"
                                >
                                  Delete
                                </button>
                              </Can>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {tableHolidays.length > 0 && (
            <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              <span className="font-semibold text-slate-300">
                Page {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* View Holiday Details Modal */}
      {viewingHoliday && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span>Holiday Details</span>
              </h3>
              <button onClick={() => setViewingHoliday(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium">Holiday Name</label>
                <div className="text-base font-bold text-white mt-0.5">{viewingHoliday.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 font-medium">Date</label>
                  <div className="text-sm font-semibold font-mono text-slate-200 mt-0.5">{viewingHoliday.holiday_date}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Type</label>
                  <div className="mt-0.5">
                    {viewingHoliday.is_optional ? (
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-xs font-semibold">
                        Optional
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800 text-xs font-semibold">
                        Mandatory
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Applicability Scope</label>
                <div className="mt-0.5 text-xs text-slate-300">
                  {viewingHoliday.applies_to_all_centres ? (
                    <span className="text-blue-400 font-semibold">Enterprise-Wide (All Centres)</span>
                  ) : (
                    <span className="text-purple-400 font-semibold">
                      Centre-Specific ({(viewingHoliday.centres || []).length} Centre{((viewingHoliday.centres || []).length > 1 ? 's' : '')})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Description</label>
                <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 mt-0.5">
                  {viewingHoliday.description || 'No description provided.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewingHoliday(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Holiday</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Independence Day, Diwali, Ganesh Chaturthi"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Holiday Date *</label>
                <input
                  type="date"
                  required
                  value={newHoliday.holiday_date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Applicability Scope</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewHoliday({ ...newHoliday, holiday_scope: 'ENTERPRISE', applies_to_all_centres: true })}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition ${
                      newHoliday.holiday_scope === 'ENTERPRISE'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Enterprise-Wide (All Centres)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewHoliday({ ...newHoliday, holiday_scope: 'CENTRE', applies_to_all_centres: false })}
                    className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition ${
                      newHoliday.holiday_scope === 'CENTRE'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Centre Specific
                  </button>
                </div>
              </div>

              {newHoliday.holiday_scope === 'CENTRE' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Select Applicable Centres</label>
                  <div className="max-h-36 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1.5">
                    {centres.map((c) => {
                      const isChecked = newHoliday.centres.includes(c.id)
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-900">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const curr = newHoliday.centres
                              const updated = isChecked ? curr.filter((id) => id !== c.id) : [...curr, c.id]
                              setNewHoliday({ ...newHoliday, centres: updated })
                            }}
                            className="rounded text-blue-600 bg-slate-900 border-slate-700"
                          />
                          <span>{c.name} {c.city ? `(${c.city})` : ''}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_optional"
                  checked={newHoliday.is_optional}
                  onChange={(e) => setNewHoliday({ ...newHoliday, is_optional: e.target.checked })}
                  className="rounded text-blue-600 bg-slate-950 border-slate-700"
                />
                <label htmlFor="is_optional" className="text-xs font-medium text-slate-300 cursor-pointer">
                  Optional / Restricted Holiday
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Holidays
