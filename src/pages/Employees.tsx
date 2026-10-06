import React, { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Plus,
  Eye,
  Building2,
  RefreshCw
} from '../components/Icons'
import apiClient from '../services/api'
import { Can } from '../components/Can'
import { CentreSelector } from '../components/CentreSelector'
import { EmployeeProfileModal } from '../components/EmployeeProfileModal'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnFilterBar } from '../design-system/components/OwnFilterBar'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { OwnStatusBadge } from '../design-system/components/OwnBadge'
import { OwnDialog } from '../design-system/components/OwnDialog'
import { OwnEmptyState } from '../design-system/components/OwnEmptyState'
import { OwnCard } from '../design-system/components/OwnCard'

interface EmployeeRow {
  id: string
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  designation: string
  designation_name: string
  employment_status: string
  joining_date: string
  department_name: string
  branch_name: string
  manager_name: string
  current_salary: string
}

interface FilterOption {
  id: string
  name: string
}

export const Employees: React.FC<{ isStaffOnlyView?: boolean }> = ({ isStaffOnlyView = false }) => {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [departments, setDepartments] = useState<FilterOption[]>([])
  const [branches, setBranches] = useState<FilterOption[]>([])
  const [managers, setManagers] = useState<FilterOption[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [selectedCentre, setSelectedCentre] = useState<string>('all')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedManager, setSelectedManager] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // View Modal State
  const [viewEmployeeId, setViewEmployeeId] = useState<string | null>(null)

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    designation: 'Staff',
    joining_date: new Date().toISOString().split('T')[0],
    department: '',
    branch: '',
    manager: '',
    create_user_account: true,
    password: ''
  })

  // Load metadata filters (Departments, Branches, Managers)
  useEffect(() => {
    apiClient.get('/employees/metadata/')
      .then((res) => {
        setDepartments(res.data.departments || [])
        setBranches(res.data.branches || [])
        setManagers(res.data.managers || [])
      })
      .catch((err) => console.error('Failed to load employee metadata', err))
  }, [])

  // Load employees with active filters
  const loadEmployees = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (selectedCentre && selectedCentre !== 'all') params.centre_id = selectedCentre
      if (selectedDept && selectedDept !== 'all') params.department_id = selectedDept
      if (selectedManager && selectedManager !== 'all') params.manager_id = selectedManager
      if (selectedStatus && selectedStatus !== 'all') params.status = selectedStatus
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const res = await apiClient.get('/employees/', { params })
      setEmployees(Array.isArray(res.data) ? res.data : (res.data.results || []))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employee list.')
    } finally {
      setLoading(false)
    }
  }, [selectedCentre, selectedDept, selectedManager, selectedStatus, searchQuery])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  // Handle Create Employee
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await apiClient.post('/employees/', {
        ...formData,
        department: formData.department || null,
        branch: formData.branch || null,
        manager: formData.manager || null
      })
      setShowAddModal(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        designation: 'Staff',
        joining_date: new Date().toISOString().split('T')[0],
        department: '',
        branch: '',
        manager: '',
        create_user_account: true,
        password: ''
      })
      setSuccessMsg('Employee created successfully.')
      loadEmployees()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create employee.')
    } finally {
      setCreating(false)
    }
  }

  // Handle Deactivate
  const handleDeactivate = async (empId: string, name: string) => {
    if (!window.confirm(`Deactivate employee '${name}'? Historical data will be preserved.`)) return
    try {
      await apiClient.post(`/employees/${empId}/deactivate/`)
      setSuccessMsg(`Employee '${name}' deactivated.`)
      loadEmployees()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to deactivate employee.')
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Header */}
      <OwnPageHeader
        title={isStaffOnlyView ? 'My Assigned Staff' : 'Enterprise Employee Directory'}
        description="Workforce roster with centre, department, manager, and salary details."
        breadcrumbs={[
          { label: 'Workspace', href: '/' },
          { label: isStaffOnlyView ? 'Staff' : 'Employees' }
        ]}
        actions={
          <div className="flex items-center gap-3">
            <OwnButton
              onClick={() => loadEmployees()}
              disabled={loading}
              variant="secondary"
              size="md"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </OwnButton>

            {!isStaffOnlyView && (
              <Can permission="employees.create">
                <OwnButton
                  onClick={() => setShowAddModal(true)}
                  variant="primary"
                  size="md"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Employee
                </OwnButton>
              </Can>
            )}
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

      {/* Filters Bar: Centre, Search, Department, Manager, Status */}
      <OwnFilterBar
        search={
          <OwnInput
            placeholder="Search name, code, email..."
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

            <OwnSelect
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              options={[
                { value: 'all', label: 'All Departments' },
                ...departments.map((d) => ({ value: d.id, label: d.name }))
              ]}
              size="sm"
              className="w-40"
            />

            <OwnSelect
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              options={[
                { value: 'all', label: 'All Managers' },
                ...managers.map((m) => ({ value: m.id, label: m.name }))
              ]}
              size="sm"
              className="w-40"
            />

            <OwnSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ON_LEAVE', label: 'On Leave' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'TERMINATED', label: 'Terminated' },
                { value: 'RESIGNED', label: 'Resigned' }
              ]}
              size="sm"
              className="w-36"
            />
          </div>
        }
      />

      {/* Employee Table */}
      <OwnCard className="overflow-hidden border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-7 h-7 animate-spin text-primary" />
            <span>Loading employees...</span>
          </div>
        ) : employees.length === 0 ? (
          <OwnEmptyState
            title="No employees found"
            description="Adjust search and filters or onboard a new team member."
            action={
              !isStaffOnlyView ? (
                <Can permission="employees.create">
                  <OwnButton
                    onClick={() => setShowAddModal(true)}
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add Employee
                  </OwnButton>
                </Can>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted/60 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-5 py-3.5">Employee ID</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Centre</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Designation</th>
                  <th className="px-5 py-3.5">Manager</th>
                  <th className="px-5 py-3.5">Joining Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Current Salary</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    {/* Employee ID */}
                    <td className="px-5 py-3.5 font-mono text-xs text-primary font-semibold">
                      {e.employee_id || '—'}
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-foreground">{e.full_name}</div>
                      <div className="text-xs text-muted-foreground font-normal">{e.email}</div>
                    </td>

                    {/* Centre */}
                    <td className="px-5 py-3.5 text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{e.branch_name || '—'}</span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                      {e.department_name || '—'}
                    </td>

                    {/* Designation */}
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                      {e.designation_name || e.designation || 'Staff'}
                    </td>

                    {/* Manager */}
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                      {e.manager_name ? e.manager_name : '—'}
                    </td>

                    {/* Joining Date */}
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">
                      {e.joining_date || '—'}
                    </td>

                    {/* Employment Status */}
                    <td className="px-5 py-3.5">
                      <OwnStatusBadge status={e.employment_status || 'ACTIVE'} size="sm" />
                    </td>

                    {/* Current Salary */}
                    <td className="px-5 py-3.5 font-mono text-xs text-foreground">
                      {e.current_salary || '—'}
                    </td>

                    {/* Actions: VIEW button */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <OwnButton
                          onClick={() => setViewEmployeeId(e.id)}
                          variant="secondary"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          title="View complete 7-tab employee profile"
                        >
                          View
                        </OwnButton>

                        <Can permission="employees.change_status">
                          {e.employment_status === 'ACTIVE' && (
                            <OwnButton
                              onClick={() => handleDeactivate(e.id, e.full_name)}
                              variant="destructive"
                              size="sm"
                            >
                              Deactivate
                            </OwnButton>
                          )}
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwnCard>

      {/* 7-Tab Employee Profile Modal */}
      {viewEmployeeId && (
        <EmployeeProfileModal
          employeeId={viewEmployeeId}
          isOpen={true}
          onClose={() => setViewEmployeeId(null)}
          onUpdate={loadEmployees}
        />
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <OwnDialog
          open={showAddModal}
          onOpenChange={setShowAddModal}
          title="Add New Employee"
          description="Register a new staff or manager in the organization workspace."
          size="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OwnInput
                label="First Name *"
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <OwnInput
                label="Last Name"
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OwnInput
                label="Email *"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <OwnInput
                label="Phone"
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OwnSelect
                label="Centre / Branch *"
                required
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                options={[
                  { value: '', label: 'Select Centre' },
                  ...branches.map((b) => ({ value: b.id, label: b.name }))
                ]}
              />
              <OwnSelect
                label="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                options={[
                  { value: '', label: 'Select Department' },
                  ...departments.map((d) => ({ value: d.id, label: d.name }))
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OwnSelect
                label="Reporting Manager"
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                options={[
                  { value: '', label: 'None / Independent' },
                  ...managers.map((m) => ({ value: m.id, label: m.name }))
                ]}
              />
              <OwnInput
                label="Joining Date"
                type="date"
                required
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
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
                loading={creating}
              >
                Onboard Employee
              </OwnButton>
            </div>
          </form>
        </OwnDialog>
      )}
    </div>
  )
}
export default Employees
