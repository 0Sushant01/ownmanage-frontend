import React, { createContext, useContext, useState, useEffect } from 'react'
import apiClient from '../services/api'
import type { User, UserRole, BusinessSummary, EmployeeSummary } from '../types'

interface AuthContextType {
  user: User | null
  role: UserRole | null
  business: BusinessSummary | null
  employee: EmployeeSummary | null
  permissions: string[]
  hasPermission: (permissionKey: string) => boolean
  loading: boolean
  login: (email: string, password: string) => Promise<UserRole>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [business, setBusiness] = useState<BusinessSummary | null>(null)
  const [employee, setEmployee] = useState<EmployeeSummary | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const loadCurrentUser = async () => {
    const token = localStorage.getItem('ownmanage_access_token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const res = await apiClient.get('/auth/me/')
      setUser(res.data.user)
      setRole(res.data.role)
      setBusiness(res.data.business)
      setEmployee(res.data.employee)
      setPermissions(res.data.permissions || [])
      if (res.data.business?.id) {
        localStorage.setItem('ownmanage_selected_business_id', res.data.business.id)
      }
    } catch {
      localStorage.removeItem('ownmanage_access_token')
      localStorage.removeItem('ownmanage_refresh_token')
      setUser(null)
      setRole(null)
      setBusiness(null)
      setEmployee(null)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCurrentUser()
  }, [])

  const login = async (email: string, password: string): Promise<UserRole> => {
    const res = await apiClient.post('/auth/login/', { email, password })
    const { tokens, user, role, business, employee, permissions } = res.data

    localStorage.setItem('ownmanage_access_token', tokens.access)
    localStorage.setItem('ownmanage_refresh_token', tokens.refresh)
    if (business?.id) {
      localStorage.setItem('ownmanage_selected_business_id', business.id)
    }

    setUser(user)
    setRole(role)
    setBusiness(business)
    setEmployee(employee)
    setPermissions(permissions || [])

    return role
  }

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('ownmanage_refresh_token')
      if (refresh) {
        await apiClient.post('/auth/logout/', { refresh })
      }
    } catch {
      // Ignore network failure on logout
    } finally {
      localStorage.removeItem('ownmanage_access_token')
      localStorage.removeItem('ownmanage_refresh_token')
      localStorage.removeItem('ownmanage_selected_business_id')
      setUser(null)
      setRole(null)
      setBusiness(null)
      setEmployee(null)
      setPermissions([])
      window.location.href = '/login'
    }
  }

  const refreshUser = async () => {
    await loadCurrentUser()
  }

  const hasPermission = (permissionKey: string): boolean => {
    if (!role) return false
    if (role === 'SUPERADMIN' || role === 'BUSINESS_ADMIN') return true
    return permissions.includes(permissionKey)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        business,
        employee,
        permissions,
        hasPermission,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const usePermission = () => {
  const { hasPermission, role, permissions } = useAuth()
  return {
    can: hasPermission,
    isAdmin: role === 'SUPERADMIN' || role === 'BUSINESS_ADMIN',
    role,
    permissions,
  }
}
