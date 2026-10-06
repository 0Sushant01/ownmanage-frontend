import React, { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CentreSelector } from '../components/CentreSelector'
import { Download } from '../components/Icons'
import type { Payroll } from '../types'
import { OwnPageHeader } from '../design-system/components/OwnPageHeader'
import { OwnButton } from '../design-system/components/OwnButton'
import { OwnFilterBar } from '../design-system/components/OwnFilterBar'
import { OwnInput } from '../design-system/components/OwnInput'
import { OwnSelect } from '../design-system/components/OwnSelect'
import { OwnCard } from '../design-system/components/OwnCard'
import { OwnStatusBadge } from '../design-system/components/OwnBadge'
import { OwnDialog } from '../design-system/components/OwnDialog'
import { OwnEmptyState } from '../design-system/components/OwnEmptyState'

export const Salary: React.FC = () => {
  const { role } = useAuth()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedCentre, setSelectedCentre] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [periodStart, setPeriodStart] = useState('')

  // Payslip Modal
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)

  const handleExportPayrollRegister = async () => {
    try {
      const params = new URLSearchParams({ format: 'csv' })
      if (selectedCentre && selectedCentre !== 'all') {
        params.append('centre_id', selectedCentre)
      }
      if (statusFilter) {
        params.append('status', statusFilter)
      }
      if (periodStart) {
        params.append('period_start', periodStart)
      }
      const res = await apiClient.get(`/salary/reports/payroll-register/?${params.toString()}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `payroll_register_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to export payroll register.')
    }
  }

  const loadPayrolls = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (selectedCentre && selectedCentre !== 'all') params.centre_id = selectedCentre
      if (statusFilter) params.status = statusFilter
      if (periodStart) params.period_start = periodStart

      const res = await apiClient.get('/salary/payrolls/', { params })
      setPayrolls(res.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load payroll records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayrolls()
  }, [selectedCentre, statusFilter, periodStart])

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <OwnPageHeader
        title="Payroll & Salary Records"
        description={
          role === 'STAFF'
            ? 'View your generated payslips and compensation breakdowns.'
            : 'Review organization payroll distributions and employee payslips.'
        }
        breadcrumbs={[
          { label: 'Workspace', href: '/' },
          { label: 'Salary & Payroll' }
        ]}
        actions={
          role !== 'STAFF' ? (
            <OwnButton
              onClick={handleExportPayrollRegister}
              variant="secondary"
              size="md"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              title="Download accounting & disbursal payroll register CSV"
            >
              Export Register (CSV)
            </OwnButton>
          ) : undefined
        }
      />

      {/* Filter Bar */}
      <OwnFilterBar
        filters={
          <div className="flex flex-wrap items-center gap-3 w-full">
            <CentreSelector
              value={selectedCentre}
              onChange={(val: string) => setSelectedCentre(val)}
              showAllOption={true}
              className="w-48"
            />

            <OwnSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'PAID', label: 'Paid' },
                { value: 'PROCESSED', label: 'Processed' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'CANCELLED', label: 'Cancelled' }
              ]}
              size="sm"
              className="w-40"
            />

            <OwnInput
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              size="sm"
              className="w-44"
              placeholder="Period Start"
            />

            {(statusFilter || periodStart) && (
              <OwnButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('')
                  setPeriodStart('')
                }}
              >
                Reset Filters
              </OwnButton>
            )}
          </div>
        }
      />

      {/* Payroll Table */}
      <OwnCard className="overflow-hidden border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
            <p className="text-sm">Fetching payroll records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive text-sm font-medium">{error}</div>
        ) : payrolls.length === 0 ? (
          <OwnEmptyState
            title="No payroll records found"
            description="Generated payroll records and payslips will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-muted/60 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Gross</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4">Net Salary</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payrolls.map((pay) => (
                  <tr key={pay.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{pay.employee_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {pay.employee_id_code || 'ID: --'} {pay.department_name ? `• ${pay.department_name}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {pay.period_start} → {pay.period_end}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-foreground">
                      {pay.currency} {Number(pay.gross_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-destructive">
                      -{pay.currency} {Number(pay.total_deductions).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold text-primary">
                      {pay.currency} {Number(pay.net_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OwnStatusBadge status={pay.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <OwnButton
                        onClick={() => setSelectedPayroll(pay)}
                        variant="ghost"
                        size="sm"
                      >
                        View Payslip →
                      </OwnButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OwnCard>

      {/* Payslip View Modal */}
      {selectedPayroll && (
        <OwnDialog
          open={!!selectedPayroll}
          onOpenChange={(open) => {
            if (!open) setSelectedPayroll(null)
          }}
          title={`Official Payslip — ${selectedPayroll.employee_name}`}
          description={`${selectedPayroll.employee_id_code || ''} ${selectedPayroll.department_name ? `• ${selectedPayroll.department_name}` : ''}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Payslip Details Box */}
            <div className="bg-muted/40 border border-border rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center text-xs text-muted-foreground border-b border-border pb-3">
                <span>Pay Period:</span>
                <span className="font-mono text-foreground font-medium">
                  {selectedPayroll.period_start} to {selectedPayroll.period_end}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-foreground">
                  <span>Gross Earnings</span>
                  <span className="font-mono text-foreground font-semibold">
                    {selectedPayroll.currency} {Number(selectedPayroll.gross_amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Standard Deductions</span>
                  <span className="font-mono text-destructive">
                    -{selectedPayroll.currency} {Number(selectedPayroll.total_deductions).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Itemized Snapshot Line Items */}
              {selectedPayroll.line_items && selectedPayroll.line_items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-primary">Earnings Components</h5>
                    <div className="space-y-1 text-xs">
                      {selectedPayroll.line_items.filter((item) => !item.is_deduction).map((e, idx) => (
                        <div key={e.id || idx} className="flex justify-between text-foreground">
                          <span className="truncate mr-2">{e.name}</span>
                          <span className="font-mono text-primary font-medium whitespace-nowrap">
                            +{selectedPayroll.currency} {Number(e.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-destructive">Deduction Components</h5>
                    <div className="space-y-1 text-xs">
                      {selectedPayroll.line_items.filter((item) => item.is_deduction).map((d, idx) => (
                        <div key={d.id || idx} className="flex justify-between text-foreground">
                          <span className="truncate mr-2">{d.name}</span>
                          <span className="font-mono text-destructive font-medium whitespace-nowrap">
                            -{selectedPayroll.currency} {Number(d.amount).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-sm font-bold text-foreground uppercase tracking-wider">Net Amount Payable</span>
                <span className="text-xl font-extrabold text-primary font-mono">
                  {selectedPayroll.currency} {Number(selectedPayroll.net_amount).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>Status: <strong className="text-foreground">{selectedPayroll.status}</strong></span>
              <OwnButton
                onClick={() => window.print()}
                variant="secondary"
                size="sm"
              >
                Print / Save PDF
              </OwnButton>
            </div>
          </div>
        </OwnDialog>
      )}
    </div>
  )
}

export default Salary
