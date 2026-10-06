import React, { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CentreSelector } from '../components/CentreSelector'
import type { LeaveRequest, LeaveType } from '../types'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnFilterBar } from '../design-system/components/OwnFilterBar'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnCard } from '../design-system/components/OwnCard'
import { OwnStatusBadge } from '../design-system/components/OwnBadge'
import { OwnDialog } from '../design-system/components/OwnDialog'
import { OwnEmptyState } from '../design-system/components/OwnEmptyState'

export const Leaves: React.FC = () => {
  const { role, employee } = useAuth()
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedCentre, setSelectedCentre] = useState<string>('all')

  // Apply Leave Modal
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [applyForm, setApplyForm] = useState({
    leave_type: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  })

  // Reject Modal
  const [rejectingReq, setRejectingReq] = useState<LeaveRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // Action status message
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const loadLeaveTypes = async () => {
    try {
      const res = await apiClient.get('/leaves/types/')
      setLeaveTypes(res.data)
      if (res.data.length > 0 && !applyForm.leave_type) {
        setApplyForm((prev) => ({ ...prev, leave_type: res.data[0].id }))
      }
    } catch {
      // Ignore leave type load errors if not applicable
    }
  }

  const loadLeaves = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (selectedCentre && selectedCentre !== 'all') params.centre_id = selectedCentre
      const res = await apiClient.get('/leaves/requests/', { params })
      setLeaves(res.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load leave requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaveTypes()
  }, [])

  useEffect(() => {
    loadLeaves()
  }, [statusFilter, selectedCentre])

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setApplying(true)
      setApplyError(null)
      await apiClient.post('/leaves/requests/', applyForm)
      setShowApplyModal(false)
      setActionSuccess('Leave application submitted successfully (Status: PENDING).')
      loadLeaves()
    } catch (err: any) {
      const msg = err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.reason?.[0] ||
        'Failed to submit leave request.'
      setApplyError(msg)
    } finally {
      setApplying(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await apiClient.post(`/leaves/requests/${id}/approve/`)
      setActionSuccess('Leave request approved successfully.')
      loadLeaves()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve leave request.')
    }
  }

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingReq) return
    try {
      setRejecting(true)
      await apiClient.post(`/leaves/requests/${rejectingReq.id}/reject/`, {
        reason: rejectionReason,
      })
      setRejectingReq(null)
      setRejectionReason('')
      setActionSuccess('Leave request rejected.')
      loadLeaves()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reject leave request.')
    } finally {
      setRejecting(false)
    }
  }

  const canManageLeaves = role === 'SUPERADMIN' || role === 'BUSINESS_ADMIN' || role === 'MANAGER'

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <OwnPageHeader
        title="Leave Management"
        description={
          role === 'STAFF'
            ? 'Apply for time off and track your leave status.'
            : 'Review and action team leave requests with strict organizational permissions.'
        }
        breadcrumbs={[
          { label: 'Workspace', href: '/' },
          { label: 'Leaves' }
        ]}
        actions={
          employee ? (
            <OwnButton
              onClick={() => setShowApplyModal(true)}
              variant="primary"
              size="md"
            >
              + Apply For Leave
            </OwnButton>
          ) : undefined
        }
      />

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm flex items-center justify-between font-medium">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-success hover:opacity-75 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <OwnFilterBar
        filters={
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { val: '', label: 'All Requests' },
                { val: 'PENDING', label: 'Pending' },
                { val: 'APPROVED', label: 'Approved' },
                { val: 'REJECTED', label: 'Rejected' }
              ].map((st) => (
                <OwnButton
                  key={st.val}
                  variant={statusFilter === st.val ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(st.val)}
                >
                  {st.label}
                </OwnButton>
              ))}
            </div>

            <div>
              <CentreSelector
                value={selectedCentre}
                onChange={(val: string) => setSelectedCentre(val)}
                showAllOption={true}
                className="w-48"
              />
            </div>
          </div>
        }
      />

      {/* Table */}
      <OwnCard className="overflow-hidden border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
            <p className="text-sm">Fetching leave requests...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm font-medium">{error}</div>
        ) : leaves.length === 0 ? (
          <OwnEmptyState
            title="No leave requests found"
            description="Any applied leaves will appear here."
            action={
              employee ? (
                <OwnButton
                  onClick={() => setShowApplyModal(true)}
                  variant="primary"
                  size="sm"
                >
                  Apply For Leave
                </OwnButton>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted/60 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaves.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{req.employee_name}</div>
                      {req.employee_id_code && (
                        <div className="text-xs text-muted-foreground font-mono">{req.employee_id_code}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground">
                      <span className="font-semibold text-foreground">{req.leave_type_name}</span>
                      <span className="text-muted-foreground ml-1 font-mono">({req.leave_type_code})</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-muted-foreground">
                      {req.start_date} → {req.end_date}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OwnStatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      {req.status === 'PENDING' && canManageLeaves ? (
                        <div className="flex items-center justify-end space-x-2">
                          <OwnButton
                            onClick={() => handleApprove(req.id)}
                            variant="primary"
                            size="sm"
                          >
                            Approve
                          </OwnButton>
                          <OwnButton
                            onClick={() => {
                              setRejectingReq(req)
                              setRejectionReason('')
                            }}
                            variant="destructive"
                            size="sm"
                          >
                            Reject
                          </OwnButton>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">
                          {req.approved_by_name ? `By ${req.approved_by_name}` : 'Completed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwnCard>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <OwnDialog
          open={showApplyModal}
          onOpenChange={setShowApplyModal}
          title="Apply for Leave"
          description="Submit an official leave request for approval."
          size="md"
        >
          <div className="space-y-4">
            {applyError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-medium">
                {applyError}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <OwnSelect
                label="Leave Type"
                required
                value={applyForm.leave_type}
                onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
                options={leaveTypes.map((lt) => ({
                  value: lt.id,
                  label: `${lt.name} (${lt.code}) ${lt.is_paid ? '• Paid' : '• Unpaid'}`
                }))}
              />

              <div className="grid grid-cols-2 gap-4">
                <OwnInput
                  label="Start Date"
                  type="date"
                  required
                  value={applyForm.start_date}
                  onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                />
                <OwnInput
                  label="End Date"
                  type="date"
                  required
                  value={applyForm.end_date}
                  onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Reason
                </label>
                <textarea
                  required
                  rows={3}
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="State the reason for leave..."
                  className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3 border-t border-border">
                <OwnButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowApplyModal(false)}
                >
                  Cancel
                </OwnButton>
                <OwnButton
                  type="submit"
                  loading={applying}
                >
                  Submit Application
                </OwnButton>
              </div>
            </form>
          </div>
        </OwnDialog>
      )}

      {/* Reject Modal */}
      {rejectingReq && (
        <OwnDialog
          open={!!rejectingReq}
          onOpenChange={(open) => {
            if (!open) setRejectingReq(null)
          }}
          title="Reject Leave Request"
          description={`Rejecting leave for ${rejectingReq.employee_name} (${rejectingReq.start_date} to ${rejectingReq.end_date}).`}
          size="md"
        >
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Rejection Reason
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-3 border-t border-border">
              <OwnButton
                type="button"
                variant="ghost"
                onClick={() => setRejectingReq(null)}
              >
                Cancel
              </OwnButton>
              <OwnButton
                type="submit"
                variant="destructive"
                loading={rejecting}
              >
                Confirm Rejection
              </OwnButton>
            </div>
          </form>
        </OwnDialog>
      )}
    </div>
  )
}

export default Leaves
