import React, { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { Business } from '../types'
import { ToggleSwitch } from '../components/ToggleSwitch'
import {
  OwnCard,
  OwnButton,
  OwnInput,
  OwnSelect,
  OwnPageHeader,
} from '../design-system'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

export const Settings: React.FC = () => {
  const { business: currentBizSummary, role } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    employee_id_enabled: true,
    employee_id_prefix: 'ABC',
  })

  const loadBusiness = async () => {
    try {
      setLoading(true)
      if (!currentBizSummary?.id) return
      const res = await apiClient.get(`/businesses/${currentBizSummary.id}/`)
      setBusiness(res.data)
      setFormData({
        name: res.data.name || '',
        legal_name: res.data.legal_name || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        timezone: res.data.timezone || 'Asia/Kolkata',
        currency: res.data.currency || 'INR',
        employee_id_enabled: res.data.employee_id_enabled ?? true,
        employee_id_prefix: res.data.employee_id_prefix || 'EMP',
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load business settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBusiness()
  }, [currentBizSummary?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBizSummary?.id) return
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const res = await apiClient.patch(`/businesses/${currentBizSummary.id}/`, formData)
      setBusiness(res.data)
      setSuccess('Business settings updated successfully.')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (role !== 'SUPERADMIN' && role !== 'BUSINESS_ADMIN') {
    return (
      <div className="p-10 max-w-4xl mx-auto text-center">
        <p className="text-destructive font-semibold">Settings are reserved for Business Administrators.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <OwnPageHeader
        title="Business Settings"
        description="Manage your organizational profile, regional localization, and sequential employee ID policies."
      />

      {success && (
        <div className="p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading business configuration...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Information Card */}
          <OwnCard className="p-6 space-y-6">
            <h2 className="text-lg font-bold text-foreground border-b border-border pb-3">
              Organization Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <OwnInput
                label="Business Name *"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <OwnInput
                label="Legal Registered Name"
                value={formData.legal_name}
                onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              />

              <OwnInput
                label="Primary Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />

              <OwnInput
                label="Primary Phone"
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <OwnSelect
                label="Timezone"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                options={[
                  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +05:30)' },
                  { value: 'UTC', label: 'UTC (GMT +00:00)' },
                  { value: 'America/New_York', label: 'America/New_York (EST)' },
                  { value: 'Europe/London', label: 'Europe/London (BST/GMT)' },
                  { value: 'Asia/Dubai', label: 'Asia/Dubai (+04:00)' },
                  { value: 'Asia/Singapore', label: 'Asia/Singapore (+08:00)' },
                ]}
              />

              <OwnInput
                label="Currency Code"
                maxLength={5}
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                className="font-mono uppercase"
              />
            </div>
          </OwnCard>

          {/* Employee ID Configuration Card */}
          <OwnCard className="p-6 space-y-6">
            <div className="border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">Employee ID Scheme</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure whether new staff automatically receive a sequential company badge ID.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-4">
                <ToggleSwitch
                  id="employee_id_enabled"
                  checked={formData.employee_id_enabled}
                  onChange={(val) => setFormData({ ...formData, employee_id_enabled: val })}
                  label="Enable Automatic Employee IDs"
                  description="When enabled, the backend increments and generates unique sequential IDs upon onboarding."
                  className="w-full"
                />
              </div>

              {formData.employee_id_enabled && (
                <div className="p-4 sm:p-5 rounded-xl bg-muted/30 border border-border space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <OwnInput
                      label="ID Prefix"
                      maxLength={10}
                      required={formData.employee_id_enabled}
                      value={formData.employee_id_prefix}
                      onChange={(e) => setFormData({ ...formData, employee_id_prefix: e.target.value.toUpperCase() })}
                      placeholder="e.g. ACME"
                      className="font-mono uppercase"
                    />

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Next Number Sequence
                      </label>
                      <input
                        type="text"
                        disabled
                        value={business ? String(business.employee_id_next_number).padStart(3, '0') : '001'}
                        className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-sm text-muted-foreground font-mono cursor-not-allowed min-h-10 sm:min-h-11"
                      />
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        Managed atomically by the backend to prevent collisions.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/25 text-xs text-primary">
                    <span className="font-semibold">Live Preview: </span>
                    <span className="font-mono text-primary font-bold">
                      {formData.employee_id_prefix}
                      {business ? String(business.employee_id_next_number).padStart(3, '0') : '001'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </OwnCard>

          <div className="flex justify-end">
            <OwnButton
              type="submit"
              variant="primary"
              loading={saving}
            >
              Save Settings
            </OwnButton>
          </div>
        </form>
      )}
    </div>
  )
}

export default Settings
