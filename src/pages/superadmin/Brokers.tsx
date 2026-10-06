import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import type { Broker } from '../../types'

interface ReferredBusinessItem {
  id: string
  name: string
  contact_email: string
  current_plan_name?: string
  subscription_status?: string
  is_active: boolean
  created_at: string
}

interface BrokerCommissionItem {
  id: string
  amount: string
  status: 'PENDING' | 'PAID' | 'CANCELLED'
  period_start: string
  period_end: string
  paid_at?: string | null
  payment_reference?: string | null
  notes?: string | null
}

interface BrokerDetailData extends Broker {
  referred_businesses_list?: ReferredBusinessItem[]
  commissions_list?: BrokerCommissionItem[]
}

export const Brokers: React.FC = () => {
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Register Modal
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [commissionRate, setCommissionRate] = useState('10.00')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Selected Broker Details Drawer
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null)
  const [brokerDetail, setBrokerDetail] = useState<BrokerDetailData | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Edit Commission Modal
  const [showEditRateModal, setShowEditRateModal] = useState(false)
  const [newCommissionRate, setNewCommissionRate] = useState('')
  const [rateSubmitting, setRateSubmitting] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)

  // Pay Commission Modal
  const [selectedCommission, setSelectedCommission] = useState<BrokerCommissionItem | null>(null)
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

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

  const fetchBrokerDetail = async (id: string) => {
    setSelectedBrokerId(id)
    setLoadingDetail(true)
    try {
      const res = await apiClient.get(`/brokers/${id}/`)
      setBrokerDetail(res.data)
      setNewCommissionRate(res.data.commission_rate || '10.00')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load broker portfolio details.')
    } finally {
      setLoadingDetail(false)
    }
  }

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

  const handleCopyReferralLink = (code: string) => {
    const origin = window.location.origin
    const url = `${origin}/register?ref=${code}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleUpdateCommissionRate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brokerDetail) return
    setRateSubmitting(true)
    setRateError(null)

    try {
      await apiClient.patch(`/brokers/${brokerDetail.id}/`, {
        commission_rate: newCommissionRate,
      })
      setShowEditRateModal(false)
      fetchBrokerDetail(brokerDetail.id)
      fetchBrokers()
    } catch (err: any) {
      setRateError(err.response?.data?.detail || 'Failed to update commission percentage.')
    } finally {
      setRateSubmitting(false)
    }
  }

  const handleExecutePayout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCommission || !paymentRef.trim()) {
      setPayError('Transaction / payment reference is required.')
      return
    }
    setPaySubmitting(true)
    setPayError(null)

    try {
      await apiClient.post(`/commissions/${selectedCommission.id}/pay/`, {
        payment_reference: paymentRef.trim(),
        notes: paymentNotes.trim(),
      })
      setSelectedCommission(null)
      setPaymentRef('')
      setPaymentNotes('')
      if (brokerDetail) {
        fetchBrokerDetail(brokerDetail.id)
      }
      fetchBrokers()
    } catch (err: any) {
      setPayError(err.response?.data?.detail || 'Failed to execute commission payout.')
    } finally {
      setPaySubmitting(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs uppercase font-mono tracking-wider text-amber-400 font-bold">
              PARTNER NETWORK & COMMISSION BILLING
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
            Broker & Referral Partners
          </h1>
          <p className="text-sm text-slate-400">
            Channel partners driving enterprise client onboarding with automatic revenue-share commissions.
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

      {/* Main Table */}
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
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-xs">
                <tr>
                  <th className="p-4">Partner Entity</th>
                  <th className="p-4">Account Email</th>
                  <th className="p-4">Referral Code</th>
                  <th className="p-4">Commission %</th>
                  <th className="p-4">Enterprises Referred</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {brokers.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => fetchBrokerDetail(b.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span>{b.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 font-mono text-xs">{b.user_email || '—'}</td>
                    <td className="p-4">
                      <span className="rounded-md bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                        {b.referral_code}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-400">{b.commission_rate}%</td>
                    <td className="p-4 font-mono text-slate-200">
                      {b.referrals_count ?? 0} Enterprises
                    </td>
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
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          fetchBrokerDetail(b.id)
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold transition"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Broker Details Drawer / Modal */}
      {selectedBrokerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 font-bold">
                    PARTNER PORTFOLIO & AUDIT
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    {brokerDetail?.name || 'Loading Partner...'}
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">
                    Account: {brokerDetail?.user_email || '—'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedBrokerId(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              {loadingDetail ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                </div>
              ) : brokerDetail ? (
                <>
                  {/* Partner Overview & Referral Link Card */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <span className="text-xs text-slate-400 block">Referral Code</span>
                        <span className="font-mono text-lg font-bold text-amber-400">
                          {brokerDetail.referral_code}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block">Commission Rate</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-lg font-bold text-emerald-400">
                            {brokerDetail.commission_rate}%
                          </span>
                          <button
                            onClick={() => setShowEditRateModal(true)}
                            className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          >
                            Edit %
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block">Partner Status</span>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            brokerDetail.is_active
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {brokerDetail.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </div>

                    {/* Referral Link Box */}
                    <div className="pt-3 border-t border-slate-800/80">
                      <span className="text-xs font-semibold text-slate-300 block mb-1">
                        Unique Tenant Registration Link
                      </span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/register?ref=${brokerDetail.referral_code}`}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopyReferralLink(brokerDetail.referral_code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 shrink-0 ${
                            copiedLink
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          <span>{copiedLink ? '✓ Copied!' : '📋 Copy Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Financial Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Referred Clients
                      </span>
                      <span className="text-xl font-bold text-white mt-1 block">
                        {brokerDetail.referrals_count ?? 0}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Paid Out
                      </span>
                      <span className="text-xl font-bold text-emerald-400 mt-1 block">
                        ₹{Number(brokerDetail.commissions_paid ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Pending Due
                      </span>
                      <span className="text-xl font-bold text-amber-400 mt-1 block">
                        ₹{Number(brokerDetail.commissions_pending ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Referred Businesses Table */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white">Referred Enterprise Tenants</h3>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-x-auto">
                      {brokerDetail.referred_businesses_list && brokerDetail.referred_businesses_list.length > 0 ? (
                        <table className="w-full min-w-[380px] text-left text-xs">
                          <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px]">
                            <tr>
                              <th className="p-2.5">Business</th>
                              <th className="p-2.5">Plan</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {brokerDetail.referred_businesses_list.map((biz) => (
                              <tr key={biz.id} className="hover:bg-slate-900/50">
                                <td className="p-2.5 font-semibold text-white">
                                  <div>{biz.name}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">{biz.contact_email}</div>
                                </td>
                                <td className="p-2.5 text-slate-300">
                                  {biz.current_plan_name || 'Standard'}
                                </td>
                                <td className="p-2.5">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                                    {biz.subscription_status || (biz.is_active ? 'ACTIVE' : 'INACTIVE')}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right">
                                  <Link
                                    to={`/businesses/${biz.id}`}
                                    className="text-amber-400 hover:text-amber-300 font-semibold"
                                  >
                                    View →
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No businesses registered through this referral code yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Commissions History & Payout Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Commission Accruals & Payouts</h3>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-x-auto">
                      {brokerDetail.commissions_list && brokerDetail.commissions_list.length > 0 ? (
                        <table className="w-full min-w-[420px] text-left text-xs">
                          <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px]">
                            <tr>
                              <th className="p-2.5">Billing Period</th>
                              <th className="p-2.5">Amount</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {brokerDetail.commissions_list.map((c) => (
                              <tr key={c.id} className="hover:bg-slate-900/50">
                                <td className="p-2.5 font-mono text-[11px] text-slate-300">
                                  {c.period_start} to {c.period_end}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-white">
                                  ₹{Number(c.amount).toLocaleString('en-IN')}
                                </td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      c.status === 'PAID'
                                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                        : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                                    }`}
                                  >
                                    {c.status}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right">
                                  {c.status === 'PENDING' ? (
                                    <button
                                      onClick={() => setSelectedCommission(c)}
                                      className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition"
                                    >
                                      Mark Paid
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-mono text-slate-500">
                                      Ref: {c.payment_reference || 'N/A'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No commission ledger entries generated yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="pt-6 border-t border-slate-800 mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBrokerId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Commission Rate Modal */}
      {showEditRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Update Commission Percentage</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter the new percentage for this broker partner. Future renewals will calculate against this rate.
            </p>

            {rateError && (
              <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
                {rateError}
              </div>
            )}

            <form onSubmit={handleUpdateCommissionRate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={newCommissionRate}
                  onChange={(e) => setNewCommissionRate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditRateModal(false)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rateSubmitting}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition disabled:opacity-50"
                >
                  {rateSubmitting ? 'Updating...' : 'Save Rate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Commission Modal */}
      {selectedCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Execute Commission Payout</h3>
            <p className="text-xs text-slate-400 mb-4">
              Record bank transfer or UPI payout for this partner commission ledger item.
            </p>

            <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Payable Amount:</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ₹{Number(selectedCommission.amount).toLocaleString('en-IN')}
              </span>
            </div>

            {payError && (
              <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
                {payError}
              </div>
            )}

            <form onSubmit={handleExecutePayout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Payment / Bank Ref ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR / NEFT / IMPS 2026100912"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cleared via HDFC Corporate Banking"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCommission(null)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 transition disabled:opacity-50"
                >
                  {paySubmitting ? 'Recording...' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Partner Broker Modal */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
