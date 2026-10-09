import React, { useState, useEffect } from 'react'
import apiClient from '../services/api'
import type { Meeting, EligibleEmployee, MeetingConflict } from '../types'
import {
  OwnButton,
} from '../design-system'
import {
  X,
  Search,
  Users,
  Video,
  AlertTriangle,
  Plus,
  ExternalLink,
} from 'lucide-react'

interface MeetingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (meeting: Meeting) => void
  editMeeting?: Meeting | null
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
        // Participants if detailed
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editMeeting ? 'Edit / Reschedule Meeting' : 'Schedule New Meeting'}
              </h3>
              <p className="text-xs text-slate-500">
                {editMeeting ? 'Update details, change timing, or manage invitees.' : 'Configure timing, internal staff, and external guests.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Meeting Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Meeting Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Strategy Review, Client Demo, Weekly Standup"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
            />
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Meeting Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Time <span className="text-danger">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Time <span className="text-danger">*</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white cursor-pointer"
              />
            </div>
          </div>

          {/* Location Type & Link/Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Location Type
              </label>
              <select
                value={locationType}
                onChange={(e: any) => setLocationType(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="ONLINE">Online / Video Call</option>
                <option value="IN_PERSON">In Person</option>
                <option value="OTHER">Other / Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {locationType === 'ONLINE' ? 'Video Call URL (e.g. Meet, Zoom)' : 'Room / Location Details'}
              </label>
              {locationType === 'ONLINE' ? (
                <input
                  type="url"
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/xyz or https://zoom.us/..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              ) : (
                <input
                  type="text"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="e.g. Conference Room A, 2nd Floor"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                />
              )}
            </div>
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
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Scheduling Conflict Warning ({conflicts.length} Overlapping Events)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 pl-1">
                {conflicts.map((c, idx) => (
                  <li key={idx} className="leading-snug">
                    <strong>{c.name}</strong>: {c.warning}
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2 pt-1 font-semibold text-amber-900 dark:text-amber-100 cursor-pointer">
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Agenda & Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline objectives, talking points, or prep materials..."
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
            />
          </div>

          {/* SECTION: INTERNAL PARTICIPANTS */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" /> Internal Employees ({selectedEmployees.length})
              </label>
              <span className="text-[11px] text-slate-500">Search by Name, Employee ID, or Email</span>
            </div>

            {/* Selected Employee Chips */}
            {selectedEmployees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {selectedEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    <span>{emp.full_name} ({emp.employee_id})</span>
                    <button
                      type="button"
                      onClick={() => removeEmployee(emp.id)}
                      className="text-slate-400 hover:text-danger cursor-pointer"
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
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type employee name or ID to invite..."
                  className="w-full pl-9 pr-20 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
                />
                {searchLoading && (
                  <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-medium">
                    Searching...
                  </span>
                )}
              </div>

              {searchQuery && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-20 divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((emp) => {
                    const isAlready = selectedEmployees.some((e) => e.id === emp.id)
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        disabled={isAlready}
                        onClick={() => addEmployee(emp)}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isAlready ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-950' : 'hover:bg-primary/5'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {emp.full_name} <span className="font-normal text-slate-500">[{emp.employee_id}]</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {emp.designation} • {emp.branch_name}
                          </div>
                        </div>
                        {isAlready ? (
                          <span className="text-[10px] text-slate-400 font-semibold">Added</span>
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
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-emerald-500" /> External Guests ({externalGuests.length})
              </label>
              <span className="text-[11px] text-slate-500">No account required</span>
            </div>

            {/* Guest Chips */}
            {externalGuests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {externalGuests.map((g) => (
                  <div
                    key={g.email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-200"
                  >
                    <span>{g.name ? `${g.name} (${g.email})` : g.email}</span>
                    <button
                      type="button"
                      onClick={() => removeExternalGuest(g.email)}
                      className="text-emerald-500 hover:text-danger cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Guest Inputs */}
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={newGuestEmail}
                onChange={(e) => setNewGuestEmail(e.target.value)}
                placeholder="guest@company.com"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                placeholder="Guest Name (Optional)"
                className="w-40 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={addExternalGuest}
                className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                + Add
              </button>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <OwnButton
            variant="primary"
            onClick={handleSubmit}
            disabled={saving}
            className="text-xs font-bold"
          >
            {saving ? 'Scheduling...' : editMeeting ? 'Update Meeting' : 'Schedule Meeting'}
          </OwnButton>
        </div>
      </div>
    </div>
  )
}
