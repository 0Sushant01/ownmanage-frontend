import React, { useState, useEffect } from 'react'
import apiClient from '../../services/api'
import {
  OwnCard,
  OwnBadge,
  OwnInput,
  OwnPageHeader,
} from '../../design-system'
import { Search, RefreshCw, AlertTriangle } from 'lucide-react'

interface ReferralItem {
  id: string
  business_id: string
  business_name: string
  referred_at: string
  plan_name: string
  subscription_status: string
  active_employees_count: number
}

export const Referrals: React.FC = () => {
  const [referrals, setReferrals] = useState<ReferralItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchReferrals = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/brokers/dashboard/')
      setReferrals(res.data?.referrals || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load referrals.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReferrals()
  }, [])

  const filtered = referrals.filter((r) =>
    r.business_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <OwnPageHeader
          title="Referred Enterprises"
          description="All client enterprises registered using your permanent partner code."
        />
        <div className="w-full sm:w-64">
          <OwnInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by enterprise name..."
            leftIcon={<Search className="w-4 h-4 text-muted-foreground" />}
            size="sm"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <OwnCard className="overflow-hidden border-border bg-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No referred enterprises matching your query.
            </div>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3.5 sm:p-4">Enterprise Name</th>
                  <th className="p-3.5 sm:p-4">Plan</th>
                  <th className="p-3.5 sm:p-4">Subscription Status</th>
                  <th className="p-3.5 sm:p-4">Active Staff</th>
                  <th className="p-3.5 sm:p-4">Referred On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition">
                    <td className="p-3.5 sm:p-4 font-semibold">{item.business_name}</td>
                    <td className="p-3.5 sm:p-4">
                      <OwnBadge variant="outline" size="sm">
                        {item.plan_name}
                      </OwnBadge>
                    </td>
                    <td className="p-3.5 sm:p-4">
                      <OwnBadge
                        variant={item.subscription_status === 'ACTIVE' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {item.subscription_status}
                      </OwnBadge>
                    </td>
                    <td className="p-3.5 sm:p-4 font-mono text-muted-foreground">{item.active_employees_count} active</td>
                    <td className="p-3.5 sm:p-4 font-mono text-xs text-muted-foreground">
                      {new Date(item.referred_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </OwnCard>
    </div>
  )
}

export default Referrals
