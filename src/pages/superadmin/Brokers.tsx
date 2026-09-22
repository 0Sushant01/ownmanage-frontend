import React, { useState, useEffect } from 'react'
import apiClient from '../../services/api'
import type { Broker } from '../../types'

export const Brokers: React.FC = () => {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [commissionRate, setCommissionRate] = useState('10.00')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const fetchBrokers = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/brokers/')
      setBrokers(res.data?.results || res.data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch broker partners.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrokers()
  }, [])

  const handleCreateBroker = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!name.trim() || !email.trim() || !referralCode.trim()) {
      setFormError('Partner entity name, user email, and referral code are required.')
      return
    }

    setFormSubmitting(true)
    try {
      await apiClient.post('/brokers/', {
        name: name.trim(),
        user_email: email.trim().toLowerCase(),
        referral_code: referralCode.trim().toUpperCase(),
        commission_rate: commissionRate,
      })
      setShowModal(false)
      setName('')
      setEmail('')
      setReferralCode('')
      setCommissionRate('10.00')
      fetchBrokers()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create broker partner.')
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Broker & Referral Partners
          </h1>
          <p className="text-sm text-slate-400">
            Platform-level partners with referral codes and revenue-sharing commission rates.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition shadow-lg shadow-amber-500/20"
        >
          <span>+ Add Partner Broker</span>
        </button>
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
          ) : brokers.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No broker partners created yet. Add one to expand enterprise referrals.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-xs">
                <tr>
                  <th className="p-4">Partner Entity</th>
                  <th className="p-4">Partner User Account</th>
                  <th className="p-4">Referral Code</th>
                  <th className="p-4">Commission Rate</th>
                  <th className="p-4">Total Referrals</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {brokers.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4 font-semibold text-white">{b.name}</td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{b.user_email || '—'}</td>
                    <td className="p-4">
                      <span className="rounded-md bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                        {b.referral_code}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-400">{b.commission_rate}%</td>
                    <td className="p-4 font-mono">{b.referrals_count ?? 0} Enterprises</td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          b.is_active
                            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Broker Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Register Broker Partner</h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter partner entity details. A referral code will be tied permanently to their account.
            </p>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateBroker} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Agency / Partner Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nexus Corporate Partners"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  User Email (Login Account)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@nexus.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Referral Code
                  </label>
                  <input
                    type="text"
                    required
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="NEXUS2026"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white font-mono uppercase focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Registering...' : 'Register Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
