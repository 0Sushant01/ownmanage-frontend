import React, { useState, useEffect } from 'react'
import apiClient from '../../services/api'

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
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Referred Enterprises
          </h1>
          <p className="text-sm text-slate-400">
            All client enterprises registered using your permanent partner code.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by enterprise name..."
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none w-full sm:w-64"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No referred enterprises matching your query.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-xs">
                <tr>
                  <th className="p-4">Enterprise Name</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Subscription Status</th>
                  <th className="p-4">Active Staff</th>
                  <th className="p-4">Referred On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-semibold text-white">{item.business_name}</td>
                    <td className="p-4">
                      <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300 border border-slate-700/50">
                        {item.plan_name}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.subscription_status === 'ACTIVE'
                            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                            : 'bg-amber-900/40 text-amber-400 border border-amber-700/50'
                        }`}
                      >
                        {item.subscription_status}
                      </span>
                    </td>
                    <td className="p-4 font-mono">{item.active_employees_count} active</td>
                    <td className="p-4 font-mono text-xs text-slate-400">
                      {new Date(item.referred_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
