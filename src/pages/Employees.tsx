import React, { useEffect, useState, useCallback } from 'react'
import {
  Users,
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
    <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-500" />
            {isStaffOnlyView ? 'My Assigned Staff' : 'Enterprise Employee Directory'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Workforce roster with centre, department, manager, and salary details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadEmployees()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {!isStaffOnlyView && (
            <Can permission="employees.create">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-blue-900/30 flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Employee</span>
              </button>
            </Can>
          )}
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

      {/* Filters Bar: Centre, Department, Manager, Status, Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
          {/* Centre Selector */}
          <div>
            <CentreSelector
              value={selectedCentre}
              onChange={(val) => setSelectedCentre(val)}
              className="w-full"
            />
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, code, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Dept:
            </span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Manager Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Manager:
            </span>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">All Managers</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Status:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
              <option value="RESIGNED">Resigned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-500" />
            <span>Loading employees...</span>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-base font-semibold text-slate-300">No employees found</p>
            <p className="text-xs text-slate-500 mt-1">
              Adjust filters or click "Add Employee" to register team members.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-4">Employee ID</th>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Centre</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Designation</th>
                  <th className="px-5 py-4">Manager</th>
                  <th className="px-5 py-4">Joining Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Current Salary</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Employee ID */}
                    <td className="px-5 py-3.5 font-mono text-xs text-blue-400 font-semibold">
                      {e.employee_id || '—'}
                    </td>

                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white">{e.full_name}</div>
                      <div className="text-xs text-slate-500 font-normal">{e.email}</div>
                    </td>

                    {/* Centre */}
                    <td className="px-5 py-3.5 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>{e.branch_name || '—'}</span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-5 py-3.5 text-slate-300 text-xs">
                      {e.department_name || '—'}
                    </td>

                    {/* Designation */}
                    <td className="px-5 py-3.5 text-slate-300 text-xs">
                      {e.designation_name || e.designation || 'Staff'}
                    </td>

                    {/* Manager */}
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {e.manager_name ? e.manager_name : '—'}
                    </td>

                    {/* Joining Date */}
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {e.joining_date || '—'}
                    </td>

                    {/* Employment Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          e.employment_status === 'ACTIVE'
                            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                            : 'bg-rose-950/60 border-rose-800 text-rose-400'
                        }`}
                      >
                        {e.employment_status}
                      </span>
                    </td>

                    {/* Current Salary */}
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-200">
                      {e.current_salary || '—'}
                    </td>

                    {/* Actions: VIEW button */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewEmployeeId(e.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg transition"
                          title="View complete 7-tab employee profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>

                        <Can permission="employees.change_status">
                          {e.employment_status === 'ACTIVE' && (
                            <button
                              onClick={() => handleDeactivate(e.id, e.full_name)}
                              className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 px-2 py-1.5 rounded-lg border border-rose-800/40 transition"
                            >
                              Deactivate
                            </button>
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
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Employee</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Centre / Branch *</label>
                  <select
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="">Select Centre</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Reporting Manager</label>
                  <select
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="">None / Independent</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Joining Date</label>
                  <input
                    type="date"
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  />
                </div>
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
                  disabled={creating}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Onboard Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees
