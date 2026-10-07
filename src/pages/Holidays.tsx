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
import { ToggleSwitch } from '../components/ToggleSwitch'
import type { Holiday } from '../types'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnKpiCard } from '../design-system/components/OwnKpiCard'
import { OwnDialog } from '../design-system/components/OwnDialog'

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
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Header */}
      <OwnPageHeader
        title="Holiday Calendar"
        description="Enterprise global holidays & centre-specific operational calendars."
        breadcrumbs={[
          { label: 'Workspace', href: '/' },
          { label: 'Holidays' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <OwnButton
              onClick={() => loadData()}
              disabled={loading}
              variant="secondary"
              size="md"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </OwnButton>

            <Can permission="holidays.manage">
              <OwnButton
                onClick={() => {
                  setNewHoliday((prev) => ({ ...prev, holiday_date: selectedDate || todayStr }))
                  setShowAddModal(true)
                }}
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Holiday
              </OwnButton>
            </Can>
          </div>
        }
      />

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center justify-between font-medium">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-destructive hover:opacity-75">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm flex items-center justify-between font-medium">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-success hover:opacity-75">✕</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <OwnKpiCard
          title="Total Holidays"
          value={summary.total}
          variant="default"
        />
        <OwnKpiCard
          title="Upcoming"
          value={summary.upcoming}
          icon={<Clock className="w-3.5 h-3.5" />}
          variant="success"
        />
        <OwnKpiCard
          title="Optional"
          value={summary.optional}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          variant="warning"
        />
        <OwnKpiCard
          title={`Past in ${selectedYear}`}
          value={summary.past}
          variant="default"
        />
      </div>

      {/* Filters Bar: Year, Centre, Month, Holiday Type, Search */}
      <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            {/* Centre Selector */}
            <CentreSelector
              value={selectedCentre}
              onChange={(val) => {
                setSelectedCentre(val)
                setSelectedDate(null)
              }}
              showAllOption={true}
              className="w-auto"
              size="sm"
            />

            {/* Year Select */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
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
                className="bg-card border border-border hover:border-border-strong focus:border-ring focus:ring-1 focus:ring-ring rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground min-h-8.5 shadow-xs transition-all cursor-pointer"
              >
                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                  <option key={y} value={y} className="bg-card text-foreground">{y}</option>
                ))}
              </select>
            </div>

            {/* Month Select */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
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
                className="bg-card border border-border hover:border-border-strong focus:border-ring focus:ring-1 focus:ring-ring rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground min-h-8.5 shadow-xs transition-all cursor-pointer"
              >
                <option value="all" className="bg-card text-foreground">All Months</option>
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1} className="bg-card text-foreground">{name}</option>
                ))}
              </select>
            </div>

            {/* Holiday Type */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                Type:
              </span>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value)
                  setSelectedDate(null)
                }}
                className="bg-card border border-border hover:border-border-strong focus:border-ring focus:ring-1 focus:ring-ring rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground min-h-8.5 shadow-xs transition-all cursor-pointer"
              >
                <option value="all" className="bg-card text-foreground">All Types</option>
                <option value="ENTERPRISE" className="bg-card text-foreground">Enterprise Holiday</option>
                <option value="CENTRE" className="bg-card text-foreground">Centre Holiday</option>
                <option value="OPTIONAL" className="bg-card text-foreground">Optional Holiday</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-60 md:w-64 shrink-0">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search holiday..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border hover:border-border-strong focus:border-ring focus:ring-1 focus:ring-ring rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground min-h-8.5 shadow-xs transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area: Left Calendar Widget & Right Holiday Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Calendar Widget (Always Visible Even When 0 Holidays) */}
        <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          {/* Calendar Navigation Bar: «  ‹  Month Year  ›  » */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-1">
              <button
                onClick={prevYear}
                title="Previous Year"
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={prevMonth}
                title="Previous Month"
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center font-bold text-base text-foreground tracking-wide">
              {monthNames[calMonth]} {calYear}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={nextMonth}
                title="Next Month"
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={nextYear}
                title="Next Year"
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
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
                  className={`min-h-[58px] p-1.5 rounded-xl flex flex-col items-center justify-between cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-primary/20 border-primary ring-2 ring-primary/40 shadow-xs'
                      : cell.isToday
                      ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30'
                      : hasHolidays
                      ? 'bg-amber-500/15 border-amber-500/50 hover:bg-amber-500/25'
                      : cell.isCurrentMonth
                      ? 'bg-card border-border hover:bg-muted/60 hover:border-border-strong'
                      : 'bg-muted/30 border-transparent text-muted-foreground/40 hover:bg-muted/50'
                  }`}
                  title={`${cell.dateStr}${hasHolidays ? `: ${cell.holidays.map(h => h.name).join(', ')}` : ''}`}
                >
                  {/* Day Number */}
                  <span
                    className={`text-xs font-semibold ${
                      isSelected
                        ? 'text-primary font-bold'
                        : cell.isToday
                        ? 'text-primary font-bold'
                        : cell.isCurrentMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/50'
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
                        <span className="text-[9px] text-muted-foreground font-mono">
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
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Table Header Controls */}
            <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Holidays List</span>
                  {selectedDate && (
                    <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      Filtered: {selectedDate}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tableHolidays.length} holiday{tableHolidays.length !== 1 ? 's' : ''} configured
                </p>
              </div>

              {selectedDate && (
                <Can permission="holidays.manage">
                  <OwnButton
                    onClick={() => openAddWithDate(selectedDate)}
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add for {selectedDate}
                  </OwnButton>
                </Can>
              )}
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="p-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-7 h-7 animate-spin text-primary" />
                <span>Loading holidays...</span>
              </div>
            ) : tableHolidays.length === 0 ? (
              <div className="p-16 text-center text-muted-foreground space-y-3">
                <Calendar className="w-10 h-10 mx-auto text-muted-foreground/60" />
                <p className="text-base font-semibold text-foreground">
                  {selectedDate
                    ? `No holidays scheduled on ${selectedDate}`
                    : 'No holidays found matching selected filters'}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {selectedDate
                    ? 'You can add a holiday on this day by clicking the Add button above.'
                    : 'The calendar on the left shows the complete monthly schedule. Click "+ Add Holiday" to configure a holiday.'}
                </p>
                <Can permission="holidays.manage">
                  <OwnButton
                    onClick={() => {
                      setNewHoliday((prev) => ({ ...prev, holiday_date: selectedDate || todayStr }))
                      setShowAddModal(true)
                    }}
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Holiday
                  </OwnButton>
                </Can>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-foreground">
                  <thead className="bg-muted/60 text-[11px] uppercase font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3.5 w-14">Sr. No.</th>
                      <th className="px-4 py-3.5">Name</th>
                      <th className="px-4 py-3.5">Date</th>
                      <th className="px-4 py-3.5">Type</th>
                      <th className="px-4 py-3.5">Scope</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {paginatedHolidays.map((h, index) => {
                      const dateObj = new Date(h.holiday_date)
                      const formattedDate = !isNaN(dateObj.getTime())
                        ? `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`
                        : h.holiday_date

                      const srNo = (currentPage - 1) * itemsPerPage + index + 1

                      return (
                        <tr
                          key={h.id}
                          className={`hover:bg-muted/30 transition-colors ${
                            selectedDate === h.holiday_date ? 'bg-primary/10' : ''
                          }`}
                        >
                          {/* Sr. No. */}
                          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                            {srNo}
                          </td>

                          {/* Name */}
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {h.name}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {formattedDate}
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {h.is_optional ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30 font-semibold text-[10px]">
                                OPTIONAL
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-semibold text-[10px]">
                                MANDATORY
                              </span>
                            )}
                          </td>

                          {/* Scope / Status */}
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {h.applies_to_all_centres ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border font-semibold text-[10px]">
                                Enterprise
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold text-[10px]">
                                <Building2 className="w-2.5 h-2.5" />
                                Centre Specific
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <OwnButton
                                onClick={() => setViewingHoliday(h)}
                                variant="secondary"
                                size="sm"
                                title="View Details"
                              >
                                View
                              </OwnButton>
                              <Can permission="holidays.manage">
                                <OwnButton
                                  onClick={() => handleDelete(h.id, h.name)}
                                  variant="destructive"
                                  size="sm"
                                  title="Delete Holiday"
                                >
                                  Delete
                                </OwnButton>
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
            <div className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
              <OwnButton
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                variant="secondary"
                size="sm"
              >
                Previous
              </OwnButton>

              <span className="font-semibold text-foreground">
                Page {currentPage} / {totalPages}
              </span>

              <OwnButton
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                variant="secondary"
                size="sm"
              >
                Next
              </OwnButton>
            </div>
          )}
        </div>
      </div>

      {/* View Holiday Details Modal */}
      {viewingHoliday && (
        <OwnDialog
          open={!!viewingHoliday}
          onOpenChange={(open) => {
            if (!open) setViewingHoliday(null)
          }}
          title={viewingHoliday.name}
          description="Holiday details and centre applicability."
          size="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground font-medium">Date</label>
                <div className="text-sm font-semibold font-mono text-foreground mt-0.5">{viewingHoliday.holiday_date}</div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Type</label>
                <div className="mt-0.5">
                  {viewingHoliday.is_optional ? (
                    <span className="px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/30 text-xs font-semibold">
                      Optional
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 text-xs font-semibold">
                      Mandatory
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium">Applicability Scope</label>
              <div className="mt-0.5 text-xs text-foreground font-medium">
                {viewingHoliday.applies_to_all_centres ? (
                  <span className="text-primary font-semibold">Enterprise-Wide (All Centres)</span>
                ) : (
                  <span className="text-primary font-semibold">
                    Centre-Specific ({(viewingHoliday.centres || []).length} Centre{((viewingHoliday.centres || []).length > 1 ? 's' : '')})
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium">Description</label>
              <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg border border-border mt-0.5">
                {viewingHoliday.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <OwnButton
                type="button"
                onClick={() => setViewingHoliday(null)}
                variant="secondary"
                size="sm"
              >
                Close
              </OwnButton>
            </div>
          </div>
        </OwnDialog>
      )}

      {/* Add Holiday Modal */}
      {showAddModal && (
        <OwnDialog
          open={showAddModal}
          onOpenChange={setShowAddModal}
          title="Add New Holiday"
          description="Configure enterprise-wide or centre-specific holiday."
          size="lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Holiday Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Independence Day, Diwali, Ganesh Chaturthi"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Holiday Date *</label>
              <input
                type="date"
                required
                value={newHoliday.holiday_date}
                onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Applicability Scope</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewHoliday({ ...newHoliday, holiday_scope: 'ENTERPRISE', applies_to_all_centres: true })}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition ${
                    newHoliday.holiday_scope === 'ENTERPRISE'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  Enterprise-Wide (All Centres)
                </button>
                <button
                  type="button"
                  onClick={() => setNewHoliday({ ...newHoliday, holiday_scope: 'CENTRE', applies_to_all_centres: false })}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition ${
                    newHoliday.holiday_scope === 'CENTRE'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  Centre Specific
                </button>
              </div>
            </div>

            {newHoliday.holiday_scope === 'CENTRE' && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Select Applicable Centres</label>
                <div className="max-h-36 overflow-y-auto bg-muted/30 border border-border rounded-lg p-2 space-y-1.5">
                  {centres.map((c) => {
                    const isChecked = newHoliday.centres.includes(c.id)
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer p-1 rounded hover:bg-muted">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const curr = newHoliday.centres
                            const updated = isChecked ? curr.filter((id) => id !== c.id) : [...curr, c.id]
                            setNewHoliday({ ...newHoliday, centres: updated })
                          }}
                          className="rounded text-primary border-border"
                        />
                        <span>{c.name} {c.city ? `(${c.city})` : ''}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="p-3 bg-muted/40 border border-border rounded-xl">
              <ToggleSwitch
                id="is_optional"
                checked={newHoliday.is_optional}
                onChange={(val) => setNewHoliday({ ...newHoliday, is_optional: val })}
                label="Optional / Restricted Holiday"
                description="Eligible staff can choose from optional floating holidays"
                size="sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Description / Notes</label>
              <textarea
                rows={2}
                value={newHoliday.description}
                onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <OwnButton
                type="button"
                variant="ghost"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </OwnButton>
              <OwnButton
                type="submit"
                loading={saving}
              >
                Create Holiday
              </OwnButton>
            </div>
          </form>
        </OwnDialog>
      )}
    </div>
  )
}


export default Holidays
