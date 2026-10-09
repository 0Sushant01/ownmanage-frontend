import React, { useState, useEffect, useMemo } from 'react'
import apiClient from '../services/api'
import { usePermission } from '../context/AuthContext'
import type { Meeting, ParticipantResponseStatus } from '../types'
import { MeetingModal } from '../components/MeetingModal'
import {
  OwnButton,
  OwnPageHeader,
} from '../design-system'
import {
  Video,
  Calendar,
  Clock,
  Users,
  MapPin,
  ExternalLink,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  History,
  ChevronRight,
  X,
} from 'lucide-react'

export const Meetings: React.FC = () => {
  const { can, isAdmin } = usePermission()
  const canCreate = isAdmin || can('CAN_CREATE_MEETING')

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Filters
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'TODAY' | 'WEEK' | 'PAST' | 'ALL'>('UPCOMING')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCentre, setSelectedCentre] = useState('')
  const [selectedScope, setSelectedScope] = useState<'my_meetings' | 'all' | 'organized'>('my_meetings')
  const [centres, setCentres] = useState<any[]>([])

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)

  // Cancellation State
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingMeetingId, setCancellingMeetingId] = useState<string | null>(null)

  // Fetch Centres
  useEffect(() => {
    const fetchCentres = async () => {
      try {
        const res = await apiClient.get('/centres/')
        setCentres(Array.isArray(res.data) ? res.data : res.data.results || [])
      } catch (err) {
        console.error('Failed to load centres', err)
      }
    }
    fetchCentres()
  }, [])

  // Fetch Meetings
  const fetchMeetings = async () => {
    setLoading(true)
    setError(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const params: Record<string, string> = {
        scope: selectedScope,
      }
      if (selectedCentre) params.centre_id = selectedCentre
      if (searchQuery) params.search = searchQuery

      if (activeTab === 'UPCOMING') {
        params.date_from = today
        params.status = 'SCHEDULED'
      } else if (activeTab === 'TODAY') {
        params.date_from = today
        params.date_to = today
      } else if (activeTab === 'WEEK') {
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)
        params.date_from = today
        params.date_to = nextWeek.toISOString().split('T')[0]
      } else if (activeTab === 'PAST') {
        params.date_to = today
      }

      const res = await apiClient.get('/meetings/', { params })
      setMeetings(res.data)
    } catch (err: any) {
      console.error('Failed to load meetings', err)
      setError(err.response?.data?.detail || 'Failed to fetch meetings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [activeTab, selectedScope, selectedCentre, searchQuery])

  // Open Details Drawer
  const openDetailDrawer = async (meetingId: string) => {
    try {
      const res = await apiClient.get(`/meetings/${meetingId}/`)
      setSelectedMeeting(res.data)
      setDetailDrawerOpen(true)
    } catch (err: any) {
      console.error('Failed to load meeting details', err)
    }
  }

  // Handle RSVP Response
  const handleRSVP = async (meetingId: string, status: ParticipantResponseStatus) => {
    try {
      await apiClient.post(`/meetings/${meetingId}/respond/`, {
        response_status: status,
      })
      setActionSuccess(`RSVP response updated to ${status}.`)
      fetchMeetings()
      if (selectedMeeting && selectedMeeting.id === meetingId) {
        openDetailDrawer(meetingId)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update RSVP.')
    }
  }

  // Cancel Meeting
  const handleCancelMeeting = async () => {
    if (!cancellingMeetingId) return
    try {
      await apiClient.post(`/meetings/${cancellingMeetingId}/cancel/`, {
        reason: cancelReason,
      })
      setActionSuccess('Meeting cancelled successfully.')
      setCancelModalOpen(false)
      setCancelReason('')
      setCancellingMeetingId(null)
      fetchMeetings()
      if (selectedMeeting && selectedMeeting.id === cancellingMeetingId) {
        setDetailDrawerOpen(false)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel meeting.')
    }
  }

  // Statistics counters
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      total: meetings.length,
      today: meetings.filter((m) => m.meeting_date === today).length,
      scheduled: meetings.filter((m) => m.status === 'SCHEDULED').length,
      pendingRSVP: meetings.filter((m) => m.my_response_status === 'PENDING').length,
    }
  }, [meetings])

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Header */}
      <OwnPageHeader
        title="Meetings & Schedules"
        description="Collaborative workspace for internal strategy reviews, client discussions, and department meetings."
        actions={
          canCreate ? (
            <OwnButton
              variant="primary"
              onClick={() => {
                setEditingMeeting(null)
                setIsCreateOpen(true)
              }}
              className="flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Meeting</span>
            </OwnButton>
          ) : undefined
        }
      />

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-success hover:opacity-75">✕</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-danger hover:opacity-75">✕</button>
        </div>
      )}

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scheduled</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.scheduled}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Today's Sessions</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.today}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950/60 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Awaiting My RSVP</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{stats.pendingRSVP}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter Count</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.total}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tab Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'UPCOMING', label: 'Upcoming' },
              { id: 'TODAY', label: 'Today' },
              { id: 'WEEK', label: 'This Week' },
              { id: 'PAST', label: 'Past' },
              { id: 'ALL', label: 'All Meetings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scope Select (Admins/Managers) */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedScope}
              onChange={(e: any) => setSelectedScope(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="my_meetings">My Meetings</option>
              <option value="organized">Organized by Me</option>
              <option value="all">Enterprise / All Accessible</option>
            </select>

            {centres.length > 0 && (
              <select
                value={selectedCentre}
                onChange={(e) => setSelectedCentre(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="">All Centres</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings by title, agenda, or location room..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900"
          />
        </div>
      </div>

      {/* Meetings Grid / List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs font-medium animate-pulse">
          Loading meetings and calendar schedules...
        </div>
      ) : meetings.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Video className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">No meetings found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no meetings matching the selected filter criteria. Click "+ Schedule Meeting" to organize one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((m) => (
            <div
              key={m.id}
              className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 ${
                m.status === 'CANCELLED'
                  ? 'border-rose-200 dark:border-rose-950/60 opacity-80'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Card Top: Timing & Status */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> {m.meeting_date}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      m.status === 'SCHEDULED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : m.status === 'CANCELLED'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{m.start_time.slice(0, 5)} - {m.end_time.slice(0, 5)} ({m.timezone.split('/')[1] || m.timezone})</span>
                </div>

                <h4
                  onClick={() => openDetailDrawer(m.id)}
                  className="text-base font-bold text-slate-900 dark:text-white hover:text-primary transition-colors cursor-pointer line-clamp-1"
                >
                  {m.title}
                </h4>

                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                  <span>Organized by: <strong className="text-slate-700 dark:text-slate-300">{m.organizer_name}</strong></span>
                  {m.branch_name && (
                    <>
                      <span>•</span>
                      <span>{m.branch_name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Location & Links */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs flex items-center justify-between">
                {m.location_type === 'ONLINE' ? (
                  m.meeting_url ? (
                    <a
                      href={m.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Call</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Online (Link not provided)</span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{m.location_details || 'In-Person'}</span>
                  </span>
                )}

                {/* Participant counter */}
                {m.participant_count && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 shrink-0">
                    <Users className="w-3.5 h-3.5" />
                    <span>{m.participant_count.total} Guests</span>
                  </span>
                )}
              </div>

              {/* RSVP Actions & Card Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                {/* My RSVP Status */}
                {m.my_response_status ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">My RSVP:</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        m.my_response_status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : m.my_response_status === 'DECLINED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {m.my_response_status}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">Viewer Only</span>
                )}

                {/* RSVP Toggle Buttons for invitees */}
                {m.status === 'SCHEDULED' && m.my_response_status && m.my_response_status === 'PENDING' ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRSVP(m.id, 'ACCEPTED')}
                      className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRSVP(m.id, 'DECLINED')}
                      className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openDetailDrawer(m.id)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL DRAWER / SLIDEOUT */}
      {detailDrawerOpen && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    selectedMeeting.status === 'SCHEDULED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : selectedMeeting.status === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {selectedMeeting.status}
                </span>
                <span className="text-xs text-slate-500">{selectedMeeting.meeting_date}</span>
              </div>
              <button
                onClick={() => setDetailDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedMeeting.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {selectedMeeting.start_time.slice(0, 5)} - {selectedMeeting.end_time.slice(0, 5)} ({selectedMeeting.timezone})
                  </span>
                </div>
              </div>

              {/* Join Button / Location */}
              {selectedMeeting.location_type === 'ONLINE' && selectedMeeting.meeting_url && (
                <a
                  href={selectedMeeting.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-xs shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Join Video Conference</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {/* Agenda / Description */}
              {selectedMeeting.description && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">Agenda & Description</div>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {selectedMeeting.description}
                  </p>
                </div>
              )}

              {/* Internal Participants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Internal Staff ({selectedMeeting.participants?.length || 0})
                  </span>
                </div>
                <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/80">
                  {selectedMeeting.participants?.map((p) => (
                    <div key={p.id} className="pt-1.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {p.full_name} {p.is_organizer && <span className="text-[10px] text-primary font-bold">(Organizer)</span>}
                        </div>
                        <div className="text-[11px] text-slate-400">{p.designation} • {p.branch_name}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          p.response_status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : p.response_status === 'DECLINED'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {p.response_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* External Guests */}
              {selectedMeeting.external_guests && selectedMeeting.external_guests.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
                    External Guests ({selectedMeeting.external_guests.length})
                  </div>
                  <div className="space-y-1.5">
                    {selectedMeeting.external_guests.map((g) => (
                      <div key={g.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
                        <span className="font-mono text-slate-700 dark:text-slate-300">{g.name ? `${g.name} <${g.email}>` : g.email}</span>
                        <span className="text-[10px] font-semibold text-slate-400">External</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit Timeline */}
              {selectedMeeting.audit_events && selectedMeeting.audit_events.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" /> Audit Timeline
                  </div>
                  <div className="space-y-2">
                    {selectedMeeting.audit_events.map((ev) => (
                      <div key={ev.id} className="text-[11px] text-slate-500 border-l-2 border-slate-200 dark:border-slate-800 pl-2">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{ev.summary}</div>
                        <div className="text-[10px] text-slate-400">By {ev.actor_name} on {new Date(ev.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-2">
              {selectedMeeting.can_cancel && selectedMeeting.status === 'SCHEDULED' && (
                <button
                  onClick={() => {
                    setCancellingMeetingId(selectedMeeting.id)
                    setCancelModalOpen(true)
                  }}
                  className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer"
                >
                  Cancel Meeting
                </button>
              )}

              {selectedMeeting.can_edit && selectedMeeting.status === 'SCHEDULED' && (
                <OwnButton
                  variant="outline"
                  onClick={() => {
                    setEditingMeeting(selectedMeeting)
                    setIsCreateOpen(true)
                  }}
                  className="text-xs font-bold"
                >
                  Reschedule / Edit
                </OwnButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Cancel Meeting</span>
            </div>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel this meeting? All participants will receive an in-app cancellation notification.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cancellation Reason (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Host unavailable, sprint postponed..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Keep Meeting
              </button>
              <button
                onClick={handleCancelMeeting}
                className="px-4 py-2 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <MeetingModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false)
          setEditingMeeting(null)
        }}
        onSuccess={(m) => {
          setActionSuccess(`Meeting '${m.title}' scheduled successfully.`)
          fetchMeetings()
        }}
        editMeeting={editingMeeting}
      />
    </div>
  )
}
