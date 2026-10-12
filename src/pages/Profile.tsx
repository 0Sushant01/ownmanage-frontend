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
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Eye,
  Plus,
  X,
  Clock,
  ShieldCheck,
  Lock,
  Check,
  Circle,
} from 'lucide-react'

export interface EmployeeDoc {
  id: string
  title: string
  category: string
  category_display?: string
  file_url: string
  file_name: string
  file_size_bytes: number
  issue_date?: string | null
  expiry_date?: string | null
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  verification_status_display?: string
  verified_by_name?: string | null
  verified_at?: string | null
  remarks?: string
  uploaded_by_name?: string
  created_at: string
}

export const DOCUMENT_CATEGORIES = [
  { value: 'IDENTITY_PROOF', label: 'Identity Proof (Aadhaar, Passport, PAN, Voter ID)' },
  { value: 'ADDRESS_PROOF', label: 'Address Proof (Utility Bill, Rental Agreement)' },
  { value: 'EDUCATION', label: 'Education Certificate (Degree, Diploma, Transcript)' },
  { value: 'CONTRACT', label: 'Employment Contract / Agreement' },
  { value: 'OFFER_LETTER', label: 'Offer Letter' },
  { value: 'EXPERIENCE', label: 'Experience / Relieving Certificate' },
  { value: 'BANK', label: 'Bank Document (Passbook, Cancelled Cheque)' },
  { value: 'TAX', label: 'Tax Document (Form 16, Tax Returns)' },
  { value: 'OTHER', label: 'Other Official Document' },
]

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

  // Document Management State
  const [documents, setDocuments] = useState<EmployeeDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState('IDENTITY_PROOF')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadIssueDate, setUploadIssueDate] = useState('')
  const [uploadExpiryDate, setUploadExpiryDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [docActionError, setDocActionError] = useState<string | null>(null)
  const [docActionSuccess, setDocActionSuccess] = useState<string | null>(null)

  const loadDocuments = async (empId: string) => {
    try {
      setLoadingDocs(true)
      const res = await apiClient.get(`/employees/${empId}/documents/`)
      setDocuments(res.data)
    } catch (err: any) {
      console.error('Failed to load employee documents', err)
    } finally {
      setLoadingDocs(false)
    }
  }

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
      if (res.data.employee?.id) {
        loadDocuments(res.data.employee.id)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.employee?.id) return
    if (!uploadFile) {
      setDocActionError('Please select a document file to upload.')
      return
    }
    if (!uploadTitle.trim()) {
      setDocActionError('Please provide a document title.')
      return
    }

    setUploading(true)
    setDocActionError(null)
    setDocActionSuccess(null)

    try {
      const data = new FormData()
      data.append('file', uploadFile)
      data.append('title', uploadTitle.trim())
      data.append('category', uploadCategory)
      if (uploadIssueDate) data.append('issue_date', uploadIssueDate)
      if (uploadExpiryDate) data.append('expiry_date', uploadExpiryDate)

      await apiClient.post(`/employees/${profile.employee.id}/documents/`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setDocActionSuccess('Document uploaded successfully. It is now awaiting administrative verification.')
      setShowUploadModal(false)
      setUploadTitle('')
      setUploadCategory('IDENTITY_PROOF')
      setUploadFile(null)
      setUploadIssueDate('')
      setUploadExpiryDate('')
      await loadDocuments(profile.employee.id)
    } catch (err: any) {
      setDocActionError(err.response?.data?.detail || 'Failed to upload document.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadDoc = async (doc: EmployeeDoc, inline = false) => {
    try {
      const res = await apiClient.get(`/documents/${doc.id}/download/${inline ? '?inline=1' : ''}`, {
        responseType: 'blob',
      })
      const blob = new Blob([res.data], { type: (res.headers['content-type'] as string) || 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      if (inline) {
        window.open(url, '_blank')
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = doc.file_name || 'document.pdf'
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } catch (err: any) {
      setDocActionError('Failed to download document file.')
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this pending document?')) return
    try {
      await apiClient.delete(`/documents/${docId}/`)
      setDocActionSuccess('Document removed successfully.')
      if (profile?.employee?.id) {
        loadDocuments(profile.employee.id)
      }
    } catch (err: any) {
      setDocActionError(err.response?.data?.detail || 'Failed to delete document.')
    }
  }

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
                <Lock className="w-3 h-3 mr-1 text-muted-foreground" />
                Protected
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
                <span className="text-muted-foreground block mb-1">User ID</span>
                <span className="text-primary font-mono text-xs font-semibold break-all">
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

          {/* Official Documents & Credentials Card */}
          {profile.employee?.id && (
            <OwnCard className="p-6 space-y-4">
              <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">Official Documents & Credentials</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                      {documents.length} {documents.length === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Upload official identification, tax, or employment certificates for administrative verification.
                  </p>
                </div>
                <OwnButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDocActionError(null)
                    setShowUploadModal(true)
                  }}
                  leftIcon={<UploadCloud className="w-4 h-4" />}
                >
                  Upload Document
                </OwnButton>
              </div>

              {/* Feedback messages for docs */}
              {docActionSuccess && (
                <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{docActionSuccess}</span>
                  </div>
                  <button type="button" onClick={() => setDocActionSuccess(null)} className="text-success hover:opacity-75 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {docActionError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{docActionError}</span>
                  </div>
                  <button type="button" onClick={() => setDocActionError(null)} className="text-destructive hover:opacity-75 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {loadingDocs ? (
                <div className="py-8 text-center text-muted-foreground text-xs font-medium flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading documents repository...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="py-10 px-4 text-center border-2 border-dashed border-border rounded-xl bg-muted/20 flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">No documents uploaded yet</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Upload identity proofs, educational degrees, or tax forms to complete institutional onboarding.
                  </p>
                  <OwnButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowUploadModal(true)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add First Document
                  </OwnButton>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-xl bg-card shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold border-b border-border">
                      <tr>
                        <th className="px-4 py-3">Document Title</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Upload Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground text-xs truncate">{doc.title}</div>
                                <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                                  <span className="truncate max-w-[180px]">{doc.file_name}</span>
                                  {doc.file_size_bytes > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        {doc.file_size_bytes < 1024
                                          ? `${doc.file_size_bytes} B`
                                          : `${(doc.file_size_bytes / 1024).toFixed(1)} KB`}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-foreground border border-border">
                              {doc.category_display || doc.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {doc.verification_status === 'VERIFIED' ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-success/15 text-success border border-success/30">
                                  <ShieldCheck className="w-3 h-3" /> Verified
                                </span>
                                {doc.verified_by_name && (
                                  <span className="text-[10px] text-muted-foreground block">
                                    By {doc.verified_by_name}
                                  </span>
                                )}
                              </div>
                            ) : doc.verification_status === 'REJECTED' ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                                  <AlertCircle className="w-3 h-3" /> Rejected
                                </span>
                                {doc.remarks && (
                                  <span className="text-[10px] text-destructive block truncate max-w-[160px]" title={doc.remarks}>
                                    {doc.remarks}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-warning/15 text-warning border border-warning/30">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(doc, true)}
                                title="View in browser"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(doc, false)}
                                title="Download file"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              {doc.verification_status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  title="Retract / Remove"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </OwnCard>
          )}

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
                    {hasMinLength ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : <Circle className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
                    <span>8+ Characters</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${hasUpperCase ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {hasUpperCase ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : <Circle className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${hasLowerCase ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {hasLowerCase ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : <Circle className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${hasDigit ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {hasDigit ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : <Circle className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 ${hasSpecial ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {hasSpecial ? <Check className="w-3.5 h-3.5 text-primary shrink-0" /> : <Circle className="w-2.5 h-2.5 text-muted-foreground shrink-0" />}
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
                <span className="text-muted-foreground block mb-1">Session Integrity</span>
                <span className="text-foreground font-medium">Active & Encrypted</span>
              </div>
            </div>
          </OwnCard>
        </div>
      ) : null}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Upload Employee Document</h3>
                  <p className="text-xs text-muted-foreground">Submit for administrative compliance and verification.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Document Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Passport Copy, Degree Certificate, Pan Card"
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Document Category <span className="text-destructive">*</span>
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm text-foreground cursor-pointer shadow-2xs"
                >
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Issue Date (Optional)</label>
                  <input
                    type="date"
                    value={uploadIssueDate}
                    onChange={(e) => setUploadIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={uploadExpiryDate}
                    onChange={(e) => setUploadExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Select File <span className="text-destructive">*</span>
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center bg-muted/20 hover:bg-muted/40 transition-colors">
                  <input
                    type="file"
                    id="docFileInput"
                    required
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0]
                        if (f.size > 10 * 1024 * 1024) {
                          alert('File size exceeds 10MB limit.')
                          return
                        }
                        setUploadFile(f)
                        if (!uploadTitle) {
                          setUploadTitle(f.name.replace(/\.[^/.]+$/, ''))
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="docFileInput" className="cursor-pointer block">
                    <UploadCloud className="w-7 h-7 text-primary mx-auto mb-1.5" />
                    {uploadFile ? (
                      <div>
                        <span className="text-xs font-semibold text-foreground block">{uploadFile.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {(uploadFile.size / 1024).toFixed(1)} KB • Click to change
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-semibold text-primary block">Click to select document file</span>
                        <span className="text-[10px] text-muted-foreground block mt-0.5">
                          PDF, PNG, JPG, or DOC up to 10MB
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <OwnButton
                  type="submit"
                  variant="primary"
                  loading={uploading}
                  disabled={!uploadFile}
                  className="text-xs font-bold px-4 py-2"
                >
                  {uploading ? 'Uploading...' : 'Submit Document'}
                </OwnButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
