import React, { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { EmployeeSummary, Department, Branch } from '../types'

interface ManagerOption {
  id: string
  name: string
  employee_id?: string
}

export const Employees: React.FC<{ isStaffOnlyView?: boolean }> = ({ isStaffOnlyView = false }) => {
  const { role } = useAuth()
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [managers, setManagers] = useState<ManagerOption[]>([])
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
    designation: 'Software Developer',
    joining_date: new Date().toISOString().split('T')[0],
    department: '',
    branch: '',
    manager: '',
    create_user_account: true,
    password: '',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [empRes, metaRes] = await Promise.all([
        apiClient.get('/employees/'),
        apiClient.get('/employees/metadata/'),
      ])
      setEmployees(empRes.data)
      setDepartments(metaRes.data.departments || [])
      setBranches(metaRes.data.branches || [])
      setManagers(metaRes.data.managers || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employee list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await apiClient.post('/employees/', {
        ...formData,
        department: formData.department || null,
        branch: formData.branch || null,
        manager: formData.manager || null,
      })
      setShowModal(false)
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        designation: 'Software Developer',
        joining_date: new Date().toISOString().split('T')[0],
        department: '',
        branch: '',
        manager: '',
        create_user_account: true,
        password: '',
      })
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Failed to create employee.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeactivate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate employee ${name}?`)) return
    try {
      await apiClient.post(`/employees/${id}/deactivate/`)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to deactivate employee.')
    }
  }

  const title = isStaffOnlyView ? 'My Assigned Staff' : 'Employee Directory'
  const subtitle = isStaffOnlyView
    ? 'Direct reports and staff members supervised by you.'
    : 'Complete workforce roster with manager, department, and branch assignments.'

  return (
    <div className="p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        {!isStaffOnlyView && (role === 'BUSINESS_ADMIN' || role === 'SUPERADMIN') && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-1"
          >
            <span>+ Add Employee</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse flex items-center justify-center text-slate-500">
          Loading employees...
        </div>
      ) : error ? (
        <div className="bg-rose-950/40 border border-rose-900 text-rose-300 p-4 rounded-xl">{error}</div>
      ) : employees.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          {isStaffOnlyView
            ? 'No staff members currently reporting to you.'
            : 'No employees found. Click "Add Employee" to onboard team members.'}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Manager</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Status</th>
                {!isStaffOnlyView && (role === 'BUSINESS_ADMIN' || role === 'SUPERADMIN') && (
                  <th className="px-6 py-4 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-semibold text-white">
                    {e.full_name}
                    <span className="block text-xs font-normal text-slate-400">{e.email || 'No email'}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-emerald-400">
                    {e.employee_id || '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {e.designation}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-300">
                    {e.manager_name ? `👔 ${e.manager_name}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {e.department_name || '—'} ({e.branch_name || 'Main'})
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        e.employment_status === 'ACTIVE'
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                          : 'bg-rose-950/60 border-rose-800 text-rose-400'
                      }`}
                    >
                      {e.employment_status}
                    </span>
                  </td>
                  {!isStaffOnlyView && (role === 'BUSINESS_ADMIN' || role === 'SUPERADMIN') && (
                    <td className="px-6 py-4 text-right">
                      {e.employment_status === 'ACTIVE' && (
                        <button
                          onClick={() => handleDeactivate(e.id, e.full_name)}
                          className="text-xs text-rose-400 hover:text-rose-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 transition"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Add New Employee</h3>
                <span className="text-[11px] text-emerald-400 font-mono block">Employee ID is auto-assigned safely.</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Branch</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Main Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reporting Manager</label>
                <select
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">No Direct Manager (Reports to Admin)</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.employee_id || 'Manager'})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.create_user_account}
                    onChange={(e) => setFormData({ ...formData, create_user_account: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Create App Login Account for Employee</span>
                </label>
              </div>

              {formData.create_user_account && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Initial Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Defaults to auto-generated if left blank"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-emerald-500 text-slate-950 rounded-xl font-semibold disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
