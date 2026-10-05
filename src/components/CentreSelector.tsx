import React, { useEffect, useState } from 'react'
import { Building2, ChevronDown } from './Icons'
import apiClient from '../services/api'
import { useAuth } from '../context/AuthContext'

export interface CentreItem {
  id: string
  name: string
  code?: string
  city?: string
  is_active?: boolean
}

interface CentreSelectorProps {
  value: string // 'all' or centre UUID
  onChange: (centreId: string, centreObj?: CentreItem) => void
  showAllOption?: boolean
  allowAll?: boolean
  className?: string
  disabled?: boolean
  label?: string
}

let cachedCentres: CentreItem[] | null = null

export const CentreSelector: React.FC<CentreSelectorProps> = ({
  value,
  onChange,
  showAllOption = true,
  allowAll,
  className = '',
  disabled = false,
  label = 'Centre:'
}) => {
  const { role, employee } = useAuth()
  const [centres, setCentres] = useState<CentreItem[]>(cachedCentres || [])
  const [loading, setLoading] = useState(!cachedCentres)

  const effectiveShowAll = allowAll !== undefined ? allowAll : showAllOption

  useEffect(() => {
    let isMounted = true
    const fetchCentres = async () => {
      try {
        const res = await apiClient.get('/centres/')
        const list = res.data?.results || res.data || []
        cachedCentres = list
        if (isMounted) {
          setCentres(list)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load centres for selector:', err)
        if (isMounted) setLoading(false)
      }
    }

    if (!cachedCentres) {
      fetchCentres()
    }
    return () => {
      isMounted = false
    }
  }, [])

  // For Center Manager, limit to their assigned centre
  const isManager = role === 'MANAGER'
  const managerBranchId = (employee as any)?.branch_id || (employee as any)?.branch

  const visibleCentres = isManager && managerBranchId
    ? centres.filter((c) => c.id === managerBranchId)
    : centres

  // Auto-select manager's branch if locked
  useEffect(() => {
    if (isManager && managerBranchId && value !== managerBranchId) {
      const match = visibleCentres.find((c) => c.id === managerBranchId)
      onChange(managerBranchId, match)
    }
  }, [isManager, managerBranchId, value, visibleCentres, onChange])

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    const obj = centres.find((c) => c.id === val)
    onChange(val, obj)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          {label}
        </span>
      )}
      <div className="relative inline-block min-w-[160px]">
        <select
          value={value}
          onChange={handleSelect}
          disabled={disabled || (isManager && !!managerBranchId)}
          className="w-full appearance-none bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-slate-100 shadow-sm transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          title="Select Centre filter"
        >
          {effectiveShowAll && !isManager && (
            <option value="all" className="bg-slate-900 text-slate-200">
              All Centres ({centres.length})
            </option>
          )}
          {visibleCentres.map((centre) => (
            <option key={centre.id} value={centre.id} className="bg-slate-900 text-slate-200">
              {centre.name} {centre.city ? `(${centre.city})` : ''}
            </option>
          ))}
          {visibleCentres.length === 0 && !loading && (
            <option value="" disabled className="bg-slate-900 text-slate-500">
              No centres found
            </option>
          )}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  )
}
