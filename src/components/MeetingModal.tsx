import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import type { Meeting, EligibleEmployee, MeetingConflict } from '../types'
import { OwnButton } from '../design-system'
import {
  X,
  Search,
  Users,
  Video,
  AlertTriangle,
  Plus,
  ExternalLink,
  Calendar,
  Clock,
  Building2,
  MapPin,
  Sparkles,
  Link2,
} from 'lucide-react'

interface MeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (meeting: Meeting) => void
  editMeeting?: Meeting | null
}

const DURATION_PRESETS = [
  { label: '15m', mins: 15 },
  { label: '30m', mins: 30 },
  { label: '45m', mins: 45 },
  { label: '1h', mins: 60 },
  { label: '1.5h', mins: 90 },
  { label: '2h', mins: 120 },
]

const ROOM_PRESETS = ['Conference Room A', 'Board Room', 'Meeting Room 2', 'Discussion Pod']

const addMinutesToTime = (timeStr: string, minutesToAdd: number) => {
  const [hStr, mStr] = (timeStr || '10:00').split(':')
  const h = parseInt(hStr || '10', 10)
  const m = parseInt(mStr || '00', 10)
  const totalMins = h * 60 + m + minutesToAdd
  const newH = Math.floor((totalMins / 60) % 24)
  const newM = totalMins % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

const getInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const getAvatarBg = (name: string) => {
  const colors = [
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
    'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
    'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30',
  ]
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export const MeetingModal: React.FC<MeetingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editMeeting = null,
}) => {
  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [locationType, setLocationType] = useState<'ONLINE' | 'IN_PERSON' | 'OTHER'>('ONLINE')
  const [locationDetails, setLocationDetails] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')

  // Selected Participants
  const [selectedEmployees, setSelectedEmployees] = useState<EligibleEmployee[]>([])
  const [externalGuests, setExternalGuests] = useState<Array<{ email: string; name: string }>>([])
  const [newGuestEmail, setNewGuestEmail] = useState('')
  const [newGuestName, setNewGuestName] = useState('')

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<EligibleEmployee[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Conflicts State
  const [conflicts, setConflicts] = useState<MeetingConflict[]>([])
  const [conflictsAcknowledged, setConflictsAcknowledged] = useState(false)
  const [checkingConflicts, setCheckingConflicts] = useState(false)

  // UI status
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset or Populate on Open
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setConflicts([])
      setConflictsAcknowledged(false)
      if (editMeeting) {
        setTitle(editMeeting.title)
        setDescription(editMeeting.description || '')
        setMeetingDate(editMeeting.meeting_date)
        setStartTime(editMeeting.start_time.slice(0, 5))
        setEndTime(editMeeting.end_time.slice(0, 5))
        setTimezone(editMeeting.timezone || 'Asia/Kolkata')
        setLocationType(editMeeting.location_type)
        setLocationDetails(editMeeting.location_details || '')
        setMeetingUrl(editMeeting.meeting_url || '')
        if (editMeeting.participants) {
          const initEmps: EligibleEmployee[] = editMeeting.participants
            .filter((p) => !p.is_organizer)
            .map((p) => ({
              id: p.employee,
              employee_id: p.employee_id_code || '—',
              full_name: p.full_name,
              email: p.email,
              designation: p.designation || '—',
              branch_id: null,
              branch_name: p.branch_name || '—',
              department_name: '—',
              user_id: null,
            }))
          setSelectedEmployees(initEmps)
        }
        if (editMeeting.external_guests) {
          setExternalGuests(
            editMeeting.external_guests.map((g) => ({ email: g.email, name: g.name || '' }))
          )
        }
      } else {
        const todayStr = new Date().toISOString().split('T')[0]
        setTitle('')
        setDescription('')
        setMeetingDate(todayStr)
        setStartTime('10:00')
        setEndTime('11:00')
        setTimezone('Asia/Kolkata')
        setLocationType('ONLINE')
        setLocationDetails('')
        setMeetingUrl('')
        setSelectedEmployees([])
        setExternalGuests([])
      }
    }
  }, [isOpen, editMeeting])

  // Search Employees
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await apiClient.get('/meetings/eligible-participants/', {
          params: { q: searchQuery },
        })
        setSearchResults(res.data.results || [])
      } catch (err) {
        console.error('Failed to search eligible participants', err)
      } finally {
        setSearchLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery, isOpen])

  // Soft Conflict Detection
  useEffect(() => {
    if (!isOpen || !meetingDate || !startTime || !endTime) return
    if (endTime <= startTime) return

    const timer = setTimeout(async () => {
      setCheckingConflicts(true)
      try {
        const res = await apiClient.post('/meetings/check-conflicts/', {
          meeting_date: meetingDate,
          start_time: startTime,
          end_time: endTime,
          participant_ids: selectedEmployees.map((e) => e.id),
          exclude_meeting_id: editMeeting ? editMeeting.id : null,
        })
        setConflicts(res.data.conflicts || [])
      } catch (err) {
        console.error('Failed to check meeting conflicts', err)
      } finally {
        setCheckingConflicts(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [meetingDate, startTime, endTime, selectedEmployees, editMeeting, isOpen])

  // Add / Remove Participants
  const addEmployee = (emp: EligibleEmployee) => {
    if (!selectedEmployees.some((e) => e.id === emp.id)) {
      setSelectedEmployees([...selectedEmployees, emp])
    }
    setSearchQuery('')
  }

  const removeEmployee = (id: string) => {
    setSelectedEmployees(selectedEmployees.filter((e) => e.id !== id))
  }

  // Add / Remove External Guests
  const addExternalGuest = () => {
    const trimmedEmail = newGuestEmail.trim().toLowerCase()
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please provide a valid external guest email address.')
      return
    }
    if (externalGuests.some((g) => g.email === trimmedEmail)) {
      setError('Guest email has already been added.')
      return
    }
    setError(null)
    setExternalGuests([
      ...externalGuests,
      { email: trimmedEmail, name: newGuestName.trim() },
    ])
    setNewGuestEmail('')
    setNewGuestName('')
  }

  const removeExternalGuest = (email: string) => {
    setExternalGuests(externalGuests.filter((g) => g.email !== email))
  }

  // Save handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Meeting title is required.')
      return
    }
    if (!meetingDate) {
      setError('Meeting date is required.')
      return
    }
    if (endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }

    if (conflicts.length > 0 && !conflictsAcknowledged) {
      setError('Please acknowledge the scheduling conflict warnings before proceeding.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        meeting_date: meetingDate,
        start_time: startTime,
        end_time: endTime,
        timezone,
        location_type: locationType,
        location_details: locationDetails.trim(),
        meeting_url: meetingUrl.trim() || null,
        participant_ids: selectedEmployees.map((e) => e.id),
        external_guests: externalGuests,
      }

      let res
      if (editMeeting) {
        res = await apiClient.patch(`/meetings/${editMeeting.id}/`, payload)
      } else {
        res = await apiClient.post('/meetings/', payload)
      }

      onSuccess(res.data)
      onClose()
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        'Failed to save meeting. Please verify all fields.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-card text-card-foreground rounded-2xl shadow-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 shadow-2xs">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                {editMeeting ? 'Edit / Reschedule Meeting' : 'Schedule New Meeting'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editMeeting ? 'Update details, change timing, or manage invitees.' : 'Configure timing, internal staff, and external guests.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Meeting Title */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Meeting Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Strategy Review, Client Demo, Weekly Standup"
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary text-foreground placeholder:text-muted-foreground shadow-2xs transition-all"
            />
          </div>

          {/* Date and Time Row */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Meeting Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground cursor-pointer shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Start Time <span className="text-destructive">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground cursor-pointer shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> End Time <span className="text-destructive">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground cursor-pointer shadow-2xs"
                />
              </div>
            </div>

            {/* Quick Duration Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" /> Quick Duration:
              </span>
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setEndTime(addMinutesToTime(startTime, p.mins))}
                  className="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors cursor-pointer"
                >
                  +{p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location Type & Link/Room */}
          <div className="space-y-2.5 pt-1">
            <label className="block text-xs font-semibold text-foreground">
              Meeting Platform / Location <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLocationType('ONLINE')}
                className={`flex items-center justify-center gap-1.5 p-2 sm:p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  locationType === 'ONLINE'
                    ? 'bg-primary/10 border-primary text-primary shadow-2xs font-bold'
                    : 'bg-background border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Online / Video</span>
              </button>
              <button
                type="button"
                onClick={() => setLocationType('IN_PERSON')}
                className={`flex items-center justify-center gap-1.5 p-2 sm:p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  locationType === 'IN_PERSON'
                    ? 'bg-primary/10 border-primary text-primary shadow-2xs font-bold'
                    : 'bg-background border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>In Person</span>
              </button>
              <button
                type="button"
                onClick={() => setLocationType('OTHER')}
                className={`flex items-center justify-center gap-1.5 p-2 sm:p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  locationType === 'OTHER'
                    ? 'bg-primary/10 border-primary text-primary shadow-2xs font-bold'
                    : 'bg-background border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Other / Custom</span>
              </button>
            </div>

            {locationType === 'ONLINE' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Video Conference URL:</span>
                  <a
                    href="https://meet.google.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Create New Google Meet</span>
                  </a>
                </div>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/xyz or https://zoom.us/j/..."
                    className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            ) : locationType === 'IN_PERSON' ? (
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground">Meeting Room / Space:</span>
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="e.g. Conference Room A, 2nd Floor"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-muted-foreground">Room Presets:</span>
                  {ROOM_PRESETS.map((rm) => (
                    <button
                      key={rm}
                      type="button"
                      onClick={() => setLocationDetails(rm)}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted hover:bg-primary/10 hover:text-primary border border-border transition-colors cursor-pointer"
                    >
                      {rm}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-[11px] text-muted-foreground">Location Details:</span>
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="e.g. Client Site, Café Lounge, or External Venue"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground"
                />
              </div>
            )}
          </div>

          {/* Conflict Checking Indicator */}
          {checkingConflicts && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Checking schedule conflicts across participants...</span>
            </div>
          )}

          {/* Soft Conflict Warning Card */}
          {conflicts.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Scheduling Conflict Warning ({conflicts.length} Overlapping Events)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-foreground/80 pl-1">
                {conflicts.map((c, idx) => (
                  <li key={idx} className="leading-snug">
                    <strong>{c.name}</strong>: {c.warning}
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2 pt-1 font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={conflictsAcknowledged}
                  onChange={(e) => setConflictsAcknowledged(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span>I understand there is an overlap and want to proceed anyway.</span>
              </label>
            </div>
          )}

          {/* Agenda / Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Agenda & Meeting Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline objectives, talking points, or prep materials for invitees..."
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground shadow-2xs"
            />
          </div>

          {/* SECTION: INTERNAL PARTICIPANTS */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Internal Employees ({selectedEmployees.length})
              </label>
              <span className="text-[11px] text-muted-foreground">Search by Name, Employee ID, or Email</span>
            </div>

            {/* Selected Employee Chips */}
            {selectedEmployees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {selectedEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-card border border-border shadow-2xs text-xs"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${getAvatarBg(emp.full_name)}`}>
                      {getInitials(emp.full_name)}
                    </div>
                    <span className="font-semibold text-foreground">{emp.full_name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">[{emp.employee_id}]</span>
                    <button
                      type="button"
                      onClick={() => removeEmployee(emp.id)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input & Dropdown */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type employee name or ID to invite..."
                  className="w-full pl-9 pr-20 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground focus:ring-1 focus:ring-primary shadow-2xs"
                />
                {searchLoading && (
                  <span className="absolute right-3 top-2.5 text-[10px] text-muted-foreground font-medium animate-pulse">
                    Searching...
                  </span>
                )}
              </div>

              {searchQuery && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-20 divide-y divide-border">
                  {searchResults.map((emp) => {
                    const isAlready = selectedEmployees.some((e) => e.id === emp.id)
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        disabled={isAlready}
                        onClick={() => addEmployee(emp)}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isAlready ? 'opacity-50 cursor-not-allowed bg-muted/40' : 'hover:bg-primary/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${getAvatarBg(emp.full_name)}`}>
                            {getInitials(emp.full_name)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{emp.full_name}</span>
                              <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground border border-border">{emp.employee_id}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {emp.designation} • {emp.branch_name || 'All Centres'}
                            </div>
                          </div>
                        </div>
                        {isAlready ? (
                          <span className="text-[10px] text-muted-foreground font-semibold">Added</span>
                        ) : (
                          <Plus className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECTION: EXTERNAL GUESTS */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-emerald-500" /> External Guests ({externalGuests.length})
              </label>
              <span className="text-[11px] text-muted-foreground">No account required • Instant invite</span>
            </div>

            {/* Guest Chips */}
            {externalGuests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {externalGuests.map((g) => (
                  <div
                    key={g.email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                  >
                    <span>{g.name ? `${g.name} (${g.email})` : g.email}</span>
                    <button
                      type="button"
                      onClick={() => removeExternalGuest(g.email)}
                      className="text-emerald-500 hover:text-destructive cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Guest Inputs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="email"
                value={newGuestEmail}
                onChange={(e) => setNewGuestEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addExternalGuest()
                  }
                }}
                placeholder="guest@company.com"
                className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground"
              />
              <input
                type="text"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addExternalGuest()
                  }
                }}
                placeholder="Guest Name (Optional)"
                className="w-full sm:w-44 px-3 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground"
              />
              <button
                type="button"
                onClick={addExternalGuest}
                className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-bold text-foreground border border-border transition-colors cursor-pointer shrink-0"
              >
                + Add Guest
              </button>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border bg-muted/30 flex items-center justify-end gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3.5 sm:px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <OwnButton
            variant="primary"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="text-xs font-bold px-4 py-2 shadow-xs"
          >
            {saving ? 'Scheduling...' : editMeeting ? 'Update Meeting' : 'Schedule Meeting'}
          </OwnButton>
        </div>
      </div>
    </div>
  )
}

