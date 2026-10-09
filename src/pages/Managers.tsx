import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Shield, UserX, Users } from 'lucide-react'
import apiClient from '../services/api'
import type { EmployeeSummary, Department, Branch } from '../types'
import { CentreSelector } from '../components/CentreSelector'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnFilterBar } from '../design-system/components/OwnFilterBar'
import { OwnCard } from '../design-system/components/OwnCard'
import { OwnStatusBadge } from '../design-system/components/OwnBadge'
import { OwnDialog, OwnDialogFooter } from '../design-system/components/OwnDialog'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { OwnEmptyState } from '../design-system/components/OwnEmptyState'

export const Managers: React.FC = () => {
  const [managers, setManagers] = useState<EmployeeSummary[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedCentreId, setSelectedCentreId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    designation: 'Department Manager',
    joining_date: new Date().toISOString().split('T')[0],
    department: '',
    branch: '',
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedCentreId) {
        params.centre_id = selectedCentreId
      }
      const [mgrRes, metaRes] = await Promise.all([
        apiClient.get('/managers/', { params }),
        apiClient.get('/employees/metadata/'),
      ])
      setManagers(mgrRes.data)
      setDepartments(metaRes.data.departments || [])
      setBranches(metaRes.data.branches || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load managers.')
    } finally {
      setLoading(false)
    }
  }, [selectedCentreId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await apiClient.post('/managers/', {
        ...formData,
        ...(selectedCentreId ? { centre_id: selectedCentreId } : {}),
      })
      setShowModal(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        password: '',
        designation: 'Department Manager',
        joining_date: new Date().toISOString().split('T')[0],
        department: '',
        branch: '',
      })
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create manager.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate manager ${name}?`)) return
    try {
      await apiClient.post(`/employees/${id}/deactivate/`)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to deactivate manager.')
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
      <OwnPageHeader
        title="Manager Roster"
        description="Managers supervise assigned team members and authorize leave requests."
        action={
          <OwnButton
            variant="primary"
            onClick={() => setShowModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Manager
          </OwnButton>
        }
      />

      {/* Filter Bar with CentreSelector */}
      <OwnFilterBar>
        <div className="w-72">
          <CentreSelector
            value={selectedCentreId}
            onChange={(cid) => setSelectedCentreId(cid)}
            allowAll={true}
          />
        </div>
      </OwnFilterBar>

      {loading ? (
        <div className="h-64 bg-card border border-border rounded-2xl animate-pulse flex items-center justify-center text-muted-foreground">
          Loading managers...
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl">{error}</div>
      ) : managers.length === 0 ? (
        <OwnEmptyState
          icon={<Users className="w-8 h-8 text-muted-foreground" />}
          title="No managers assigned yet"
          description="Appoint your first supervisor to manage staff attendance, approvals, and permissions."
          action={
            <OwnButton variant="primary" onClick={() => setShowModal(true)}>
              Add Manager
            </OwnButton>
          }
        />
      ) : (
        <OwnCard className="overflow-hidden border-border bg-card shadow-xs">
          {/* Mobile View: Fluid Responsive Cards */}
          <div className="md:hidden divide-y divide-border">
            {managers.map((m) => (
              <div key={m.id} className="p-4 space-y-3 transition-colors hover:bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground text-sm truncate">{m.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                  </div>
                  <OwnStatusBadge status={m.employment_status || 'ACTIVE'} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-xl border border-border">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Employee ID</span>
                    <span className="font-mono text-primary font-bold">{m.employee_id || '—'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Designation</span>
                    <span className="text-foreground truncate block">{m.designation}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Department / Branch</span>
                    <span className="text-foreground truncate block">{m.department_name || '—'} ({m.branch_name || 'Main'})</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to={`/managers/${m.id}/access-control`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs text-info hover:text-info/80 bg-muted px-3 py-2 rounded-xl border border-border font-medium transition"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Access Control</span>
                  </Link>

                  {m.employment_status === 'ACTIVE' && (
                    <OwnButton
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeactivate(m.id, m.full_name)}
                      icon={<UserX className="w-3.5 h-3.5" />}
                      className="shrink-0"
                    >
                      Deactivate
                    </OwnButton>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop / Tablet View: Wide Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4">Manager Name</th>
                  <th className="px-6 py-4">Employee ID</th>
                  <th className="px-6 py-4">Designation</th>
                  <th className="px-6 py-4">Department / Branch</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {managers.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/40 transition">
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {m.full_name}
                      <span className="block text-xs font-normal text-muted-foreground">{m.email}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-primary font-bold">
                      {m.employee_id || '—'}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      {m.designation}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {m.department_name || '—'} ({m.branch_name || 'Main'})
                    </td>
                    <td className="px-6 py-4">
                      <OwnStatusBadge status={m.employment_status || 'ACTIVE'} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/managers/${m.id}/access-control`}
                          className="inline-flex items-center gap-1.5 text-xs text-info hover:text-info/80 bg-muted px-2.5 py-1.5 rounded-lg border border-border font-medium transition"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Access Control</span>
                        </Link>
                        {m.employment_status === 'ACTIVE' && (
                          <OwnButton
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeactivate(m.id, m.full_name)}
                            icon={<UserX className="w-3.5 h-3.5" />}
                          >
                            Deactivate
                          </OwnButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OwnCard>
      )}

      {/* Modal */}
      <OwnDialog
        open={showModal}
        onOpenChange={setShowModal}
        title="Add Manager"
        description="Provide account and role credentials to authorize a manager in this workspace."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <OwnInput
              label="First Name *"
              required
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="First name"
            />
            <OwnInput
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Last name"
            />
          </div>

          <OwnInput
            label="Official Email *"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="manager@company.com"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <OwnInput
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91..."
            />
            <OwnInput
              label="Password *"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <OwnInput
              label="Designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="Department Manager"
            />
            <OwnInput
              label="Joining Date"
              type="date"
              required
              value={formData.joining_date}
              onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <OwnSelect
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              options={[
                { value: '', label: 'None' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <OwnSelect
              label="Branch"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              options={[
                { value: '', label: 'Main Branch' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>

          <OwnDialogFooter className="mt-6">
            <OwnButton
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </OwnButton>
            <OwnButton
              type="submit"
              variant="primary"
              loading={creating}
            >
              Add Manager
            </OwnButton>
          </OwnDialogFooter>
        </form>
      </OwnDialog>
    </div>
  )
}
