import React, { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  OwnCard,
  OwnButton,
  OwnInput,
  OwnBadge,
  OwnPageHeader,
} from '../design-system'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

interface ProfileData {
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string
    full_name: string
  }
  employee?: {
    id: string
    employee_id?: string
    first_name: string
    last_name: string
    email: string
    phone: string
    designation: string
    joining_date: string
    status?: string
    department?: string
    branch?: string
    manager?: string
  } | null
  role?: string
  business?: {
    id: string
    name: string
  } | null
}

export const Profile: React.FC = () => {
  const { refreshUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  })

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Complexity rules
  const hasMinLength = newPassword.length >= 8
  const hasUpperCase = /[A-Z]/.test(newPassword)
  const hasLowerCase = /[a-z]/.test(newPassword)
  const hasDigit = /[0-9]/.test(newPassword)
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword)
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasDigit && hasSpecial

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/profile/')
      setProfile(res.data)
      setFormData({
        first_name: res.data.user.first_name || '',
        last_name: res.data.user.last_name || '',
        phone: res.data.user.phone || '',
        email: res.data.user.email || '',
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      if (profile && formData.email && formData.email.trim().toLowerCase() !== profile.user.email.toLowerCase()) {
        await apiClient.post('/auth/update-email/', { email: formData.email.trim().toLowerCase() })
      }

      await apiClient.patch('/profile/', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      })
      await refreshUser()
      setSuccess('Profile updated successfully.')
      loadProfile()
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    if (!isPasswordValid) {
      setPasswordError('New password does not satisfy all complexity requirements.')
      return
    }

    setPasswordSaving(true)
    try {
      await apiClient.post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setPasswordSuccess('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.detail ||
        err.response?.data?.new_password?.[0] ||
        'Failed to change password. Please verify your current password.'
      )
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Header */}
      <OwnPageHeader
        title="User Profile & Security"
        description="Manage your account credentials, security preferences, and organizational assignment."
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
          <p className="text-sm font-medium">Loading user profile...</p>
        </div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Identity & Role Badge Card */}
          <OwnCard className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/25 text-primary flex items-center justify-center font-bold text-2xl shadow-xs">
                {profile.user.first_name?.[0] || profile.user.email[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{profile.user.full_name || profile.user.email}</h2>
                <p className="text-sm text-muted-foreground">{profile.user.email}</p>
                {profile.employee?.designation && (
                  <p className="text-xs text-primary font-medium mt-0.5">
                    {profile.employee.designation}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Platform Role
              </span>
              <OwnBadge variant="primary" size="md">
                {profile.role}
              </OwnBadge>
            </div>
          </OwnCard>

          {/* Organizational Employment Data (Read-Only) */}
          <OwnCard className="p-6 space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Employment & System Identity</h3>
                <p className="text-xs text-muted-foreground">Fixed institutional properties assigned by administration.</p>
              </div>
              <OwnBadge variant="outline" size="sm">
                🔒 Protected
              </OwnBadge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Organization</span>
                <span className="text-foreground font-medium text-sm">
                  {profile.business?.name || 'Platform Administration'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Immutable User UUID</span>
                <span className="text-primary font-mono text-xs font-bold break-all">
                  {profile.user.id}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Employee Badge ID</span>
                <span className="text-foreground font-mono font-bold text-sm">
                  {profile.employee?.employee_id || 'Not Assigned'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Department</span>
                <span className="text-foreground font-medium text-sm">
                  {profile.employee?.department || 'General'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Branch / Centre</span>
                <span className="text-foreground font-medium text-sm">
                  {profile.employee?.branch || 'Headquarters'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Reporting Manager</span>
                <span className="text-foreground font-medium text-sm">
                  {profile.employee?.manager || 'None (Direct Report / Admin)'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Joining Date</span>
                <span className="text-foreground font-medium text-sm">
                  {profile.employee?.joining_date || '—'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Employment Status</span>
                <div>
                  <OwnBadge variant="success" size="sm">
                    {profile.employee?.status || 'ACTIVE'}
                  </OwnBadge>
                </div>
              </div>
            </div>
          </OwnCard>

          {/* Editable Personal Details Form */}
          <OwnCard className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">Editable Personal Profile</h3>
                <p className="text-xs text-muted-foreground">
                  Update your display name, contact phone number, and authenticated login email.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OwnInput
                  label="First Name"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />

                <OwnInput
                  label="Last Name"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />

                <OwnInput
                  label="Email Address"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  helperText="Editable login credential. Internal platform identity is anchored to your immutable UUID."
                />

                <OwnInput
                  label="Contact Phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="flex justify-end pt-2">
                <OwnButton
                  type="submit"
                  variant="primary"
                  loading={saving}
                >
                  Update Profile
                </OwnButton>
              </div>
            </form>
          </OwnCard>

          {/* Change Password & Security Form */}
          <OwnCard className="p-6">
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground">Change Account Password</h3>
                <p className="text-xs text-muted-foreground">
                  Update your account password with enterprise security complexity requirements.
                </p>
              </div>

              {passwordSuccess && (
                <div className="p-3.5 rounded-xl bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <OwnInput
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showCurrentPassword ? 'Hide' : 'Show'}
                    </button>
                  }
                />

                <OwnInput
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showNewPassword ? 'Hide' : 'Show'}
                    </button>
                  }
                />

                <OwnInput
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  }
                />
              </div>

              {/* Password Complexity Checklist */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5">
                <span className="font-semibold text-foreground block mb-1">Password Requirements:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    <span>{hasMinLength ? '✓' : '○'}</span>
                    <span>8+ Characters</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${hasUpperCase ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    <span>{hasUpperCase ? '✓' : '○'}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${hasLowerCase ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    <span>{hasLowerCase ? '✓' : '○'}</span>
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${hasDigit ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    <span>{hasDigit ? '✓' : '○'}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${hasSpecial ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    <span>{hasSpecial ? '✓' : '○'}</span>
                    <span>Special (!@#$...)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <OwnButton
                  type="submit"
                  variant="primary"
                  loading={passwordSaving}
                  disabled={!isPasswordValid || newPassword !== confirmPassword}
                >
                  Change Password
                </OwnButton>
              </div>
            </form>
          </OwnCard>

          {/* Security & Active Session Metadata Card */}
          <OwnCard className="p-6 space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Active Session & Security Status</h3>
                <p className="text-xs text-muted-foreground">Current authentication guard and session properties.</p>
              </div>
              <OwnBadge variant="success" size="sm">
                ACTIVE
              </OwnBadge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Authentication Method</span>
                <span className="text-foreground font-medium">JWT Bearer Token Guard</span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Two-Factor Authentication</span>
                <span className="text-warning font-medium">Standard (Password Based)</span>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block mb-1">Gateway Timezone</span>
                <span className="text-foreground font-mono">Asia/Kolkata (IST)</span>
              </div>
            </div>
          </OwnCard>
        </div>
      ) : null}
    </div>
  )
}

export default Profile
