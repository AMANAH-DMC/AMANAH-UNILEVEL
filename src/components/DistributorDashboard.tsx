import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Wallet, CheckCircle2, AlertCircle, LogOut, Users, Network, Award, Package, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductCodeRedemption } from './ProductCodePanels';
import DistributorNetworkExplorer from './DistributorNetworkExplorer';

type Profile = {
  id: string;
  member_number: string;
  full_name: string;
  role: string;
  account_status: string;
};

type DownlineMember = { id: string; member_number: string | null; full_name: string; role: string; account_status: string; joined_at: string; level_number?: number; personal_pv: number };
type DistributorDashboardData = { profile: Profile & { email?: string | null; mobile_number?: string | null; rank?: string; joined_at?: string }; sponsor: { id: string; member_number: string | null; full_name: string; role: string; account_status: string } | null; personal_pv: number; group_pv: number; direct_referral_count: number; direct_referrals: DownlineMember[]; downline: DownlineMember[]; level_totals: { level_number: number; member_count: number; group_pv: number }[]; pv_basis: string };

type RankProgress = {
  registration_at: string; accumulation_ends_at: string; countdown_active: boolean; seconds_remaining: number;
  personal_pv: number; group_pv: number; earned_rank: string;
  jmo: { personal_target: number; group_target: number; personal_progress: number; group_progress: number; qualified: boolean; qualified_at: string | null; additional_rate: number };
  smo: { personal_target: number; group_target: number; personal_progress: number; group_progress: number; qualified: boolean; qualified_at: string | null; additional_rate: number };
};

type CommissionSummary = {
  unilevel_approved: number;
  positional_approved: number;
  already_claimed: number;
  available_commission: number;
  withdrawal_threshold: number;
  eligible_to_withdraw: boolean;
};

type WithdrawalRow = {
  id: string;
  requested_amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_notes: string | null;
  paid_amount: number | null;
  paid_at: string | null;
  receipt_confirmed_at: string | null;
};

const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));

export default function DistributorDashboard({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [dashboard, setDashboard] = useState<DistributorDashboardData | null>(null);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [rankProgress, setRankProgress] = useState<RankProgress | null>(null);
  const [history, setHistory] = useState<WithdrawalRow[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'product-coding' | 'genealogy' | 'withdrawals'>('overview');

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const [dashboardResult, summaryResult, historyResult, rankResult] = await Promise.all([
        supabase.rpc('get_distributor_dashboard'),
        supabase.rpc('get_member_commission_summary'),
        supabase.rpc('get_member_withdrawal_history'),
        supabase.rpc('get_distributor_rank_progress'),
      ]);
      if (dashboardResult.error) throw dashboardResult.error;
      if (summaryResult.error) throw summaryResult.error;
      if (historyResult.error) throw historyResult.error;
      if (rankResult.error) throw rankResult.error;
      setDashboard(dashboardResult.data as DistributorDashboardData);
      setRankProgress(rankResult.data as RankProgress);
      const row = Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data;
      setSummary(row || null);
      setHistory((historyResult.data || []) as WithdrawalRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load commission information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const requestWithdrawal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !summary) return;
    const requested = Number(amount);
    if (!Number.isFinite(requested) || requested <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const { error: rpcError } = await supabase.rpc('request_commission_withdrawal', { p_amount: requested });
      if (rpcError) throw rpcError;
      setAmount('');
      setNotice('Your commission withdrawal request has been submitted for Admin review.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit withdrawal request.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmReceipt = async (id: string) => {
    if (!supabase || !window.confirm('Confirm that you have received this external payment?')) return;
    setError('');
    setNotice('');
    try {
      const { data, error: rpcError } = await supabase.rpc('confirm_commission_receipt', { p_withdrawal_id: id });
      if (rpcError) throw rpcError;
      if (data !== true) throw new Error('Receipt could not be confirmed. Refresh and check the request status.');
      setNotice('Receipt confirmation recorded.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm receipt.');
    }
  };

  const levelBreakdown = Array.from({ length: 10 }, (_, index) => {
    const levelNumber = index + 1;
    const members = (dashboard?.downline || []).filter((member) => Number(member.level_number) === levelNumber);
    const activeCount = members.filter((member) => String(member.account_status).toLowerCase() === 'active').length;
    return { levelNumber, total: members.length, active: activeCount, inactive: members.length - activeCount };
  });

  const navigation = [
    { id: 'overview' as const, label: 'Overview', icon: Wallet },
    { id: 'product-coding' as const, label: 'Product Coding', icon: Package },
    { id: 'genealogy' as const, label: 'Genealogy', icon: UsersRound },
    { id: 'withdrawals' as const, label: 'Withdrawals', icon: Network },
  ];

  return (
    <main className="amanah-dashboard min-h-screen bg-slate-100 pt-20">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        <aside className="amanah-sidebar flex shrink-0 flex-col rounded-[1.5rem] bg-emerald-950 p-4 text-white shadow-lg lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:w-60">
          <div className="border-b border-white/10 px-2 pb-5">
            <p className="text-lg font-black tracking-[.16em]">AMANAH</p>
            <p className="mt-1 text-[10px] uppercase tracking-[.2em] text-emerald-200/70">Distributor workspace</p>
          </div>
          <p className="mt-5 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200/60">My sections</p>
          <nav className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-col">
            {navigation.map((item) => {
              const Icon = item.icon;
              const selected = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setActiveSection(item.id); setError(''); setNotice(''); }}
                  aria-current={selected ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${selected ? 'bg-amber-300 text-emerald-950 shadow-sm' : 'text-emerald-50/85 hover:bg-white/10 hover:text-white'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-white/10 pt-4 lg:mt-auto">
            <button onClick={onSignOut} className="w-full rounded-xl border border-amber-200/30 px-3 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-200/10">
              <LogOut className="mr-2 inline h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">AMANAH Member Portal</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{navigation.find((item) => item.id === activeSection)?.label}</h1>
              <p className="text-sm text-slate-500">{profile.full_name} · {profile.member_number} · Distributor</p>
            </div>
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 sm:self-center">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </header>

          {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          {notice && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

          {activeSection === 'overview' && (
            <div className="space-y-5">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl bg-emerald-950 p-5 text-white shadow-sm sm:col-span-2">
                  <div className="flex items-center gap-2 text-emerald-200"><Wallet className="h-5 w-5" /><span className="text-sm font-semibold">Available Balance</span></div>
                  <p className="mt-3 text-4xl font-extrabold tabular-nums">{loading ? '—' : money(summary?.available_commission)}</p>
                  <p className="mt-2 text-xs text-emerald-100/75">Approved commission available for withdrawal</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500"><Users className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Total Members</span></div>
                  <p className="mt-3 text-3xl font-extrabold text-emerald-950 tabular-nums">{loading ? '—' : (dashboard?.downline?.length || 0).toLocaleString('en-PH')}</p>
                  <p className="mt-1 text-xs text-slate-500">Across Levels 1–10</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500"><Award className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Current Rank</span></div>
                  <p className="mt-3 text-xl font-extrabold capitalize text-emerald-950">{rankProgress?.earned_rank || dashboard?.profile?.rank?.replaceAll('_', ' ') || 'Regular Member'}</p>
                  <p className="mt-1 text-xs text-slate-500">Your current earned rank</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500"><UserRound className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Personal PV</span></div>
                  <p className="mt-3 text-3xl font-extrabold text-emerald-950 tabular-nums">{loading ? '—' : Number(dashboard?.personal_pv || 0).toLocaleString('en-PH')}</p>
                  <p className="mt-1 text-xs text-slate-500">PV from your paid purchases</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500"><Network className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wide">Group PV (GPV)</span></div>
                  <p className="mt-3 text-3xl font-extrabold text-emerald-950 tabular-nums">{loading ? '—' : Number(dashboard?.group_pv || 0).toLocaleString('en-PH')}</p>
                  <p className="mt-1 text-xs text-slate-500">Personal PV plus Levels 1–10</p>
                </article>
              </section>

              {rankProgress && (
                <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Rank qualification</p><h2 className="mt-1 text-lg font-extrabold text-slate-900">JMO / SMO Gauges</h2></div>
                    <p className="text-sm font-bold text-emerald-900">Earned rank: {rankProgress.earned_rank}</p>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {([
                      { key: 'JMO', label: 'Junior Marketing Officer', data: rankProgress.jmo },
                      { key: 'SMO', label: 'Senior Marketing Officer', data: rankProgress.smo },
                    ] as const).map((rank) => (
                      <article key={rank.key} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{rank.key}</h3><p className="mt-1 text-xs text-slate-500">{rank.label}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${rank.data.qualified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{rank.data.qualified ? 'QUALIFIED' : 'IN PROGRESS'}</span></div>
                        <div className="mt-4 space-y-3">
                          <div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-600">Personal PV</span><strong>{Number(rankProgress.personal_pv || 0).toLocaleString('en-PH')} / {rank.data.personal_target.toLocaleString('en-PH')}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${Math.min(100, Number(rank.data.personal_progress || 0))}%` }} /></div></div>
                          <div><div className="mb-1 flex justify-between text-xs"><span className="text-slate-600">Group PV</span><strong>{Number(rankProgress.group_pv || 0).toLocaleString('en-PH')} / {rank.data.group_target.toLocaleString('en-PH')}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${Math.min(100, Number(rank.data.group_progress || 0))}%` }} /></div></div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-bold text-slate-900">Commission Breakdown</h2>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">Approved Unilevel Commission</span><strong className="text-slate-900">{money(summary?.unilevel_approved)}</strong></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-sm text-slate-500">Approved JMO / SMO Commission</span><strong className="text-slate-900">{money(summary?.positional_approved)}</strong></div>
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4"><span className="text-sm font-semibold text-slate-700">Total Approved</span><strong className="text-lg text-emerald-900">{money(Number(summary?.unilevel_approved || 0) + Number(summary?.positional_approved || 0))}</strong></div>
                  </div>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-bold text-slate-900">Overall Commission Withdrawn</h2>
                  <p className="mt-3 text-3xl font-extrabold text-emerald-950 tabular-nums">{money(summary?.already_claimed)}</p>
                  <p className="mt-2 text-xs text-slate-500">Total commission already claimed, based on the existing commission summary.</p>
                </article>
              </section>
            </div>
          )}

          {activeSection === 'product-coding' && (
            <section className="space-y-4">
              <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Product redemption</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Product Code Panel</h2><p className="mt-1 text-sm text-slate-500">Enter a product code issued to you to redeem it and credit the associated PV.</p></div>
              <ProductCodeRedemption />
            </section>
          )}

          {activeSection === 'genealogy' && (
            <section className="space-y-5">
              <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">My Unilevel organization</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Genealogy · Levels 1–10</h2><p className="mt-1 text-sm text-slate-500">Each level is classified by active and inactive member counts.</p></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {levelBreakdown.map((level) => (
                  <article key={level.levelNumber} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Level {level.levelNumber}</p>
                    <p className="mt-2 text-2xl font-extrabold text-emerald-950 tabular-nums">{loading ? '—' : level.total}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="font-semibold text-emerald-800">Active</span><strong>{loading ? '—' : level.active}</strong></div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="font-semibold text-slate-500">Inactive</span><strong>{loading ? '—' : level.inactive}</strong></div>
                  </article>
                ))}
              </div>
              <DistributorNetworkExplorer members={dashboard?.downline || []} />
            </section>
          )}

          {activeSection === 'withdrawals' && (
            <section className="space-y-5">
              <div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Commission payout</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">Withdrawals</h2><p className="mt-1 text-sm text-slate-500">Review pending requests or submit a new withdrawal request.</p></div>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">Pending Withdrawals</h3><p className="mt-1 text-xs text-slate-500">Requests waiting for Admin review</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{history.filter((item) => item.status === 'pending').length} pending</span></div>
                <div className="mt-4 divide-y divide-slate-100">
                  {history.filter((item) => item.status === 'pending').map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div><p className="font-bold text-slate-900">{money(item.requested_amount)}</p><p className="text-xs text-slate-500">Requested {new Date(item.requested_at).toLocaleString('en-PH')}</p></div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Pending review</span>
                    </div>
                  ))}
                  {!loading && history.filter((item) => item.status === 'pending').length === 0 && <p className="py-6 text-center text-sm text-slate-500">You have no pending withdrawal requests.</p>}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-900">Withdrawal Request</h3>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4"><span className="text-sm font-semibold text-emerald-900">Available balance</span><strong className="text-xl text-emerald-950">{money(summary?.available_commission)}</strong></div>
                <p className="mt-2 text-xs text-slate-500">Minimum combined available commission: {money(summary?.withdrawal_threshold || 300)}.</p>
                <form onSubmit={requestWithdrawal} className="mt-5 space-y-4">
                  <label className="block text-sm font-semibold text-slate-700" htmlFor="withdraw-amount">Requested amount (PHP)</label>
                  <input id="withdraw-amount" type="number" min="0.01" step="0.01" max={summary?.available_commission || undefined} required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-700" />
                  <button type="button" disabled={!summary?.eligible_to_withdraw || loading} onClick={() => setAmount(Number(summary?.available_commission || 0).toFixed(2))} className="w-full rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-900 disabled:opacity-40">Use full available balance</button>
                  {!summary?.eligible_to_withdraw && <p className="text-xs text-amber-800">You can request a payout once your available approved commissions reach the required threshold.</p>}
                  <button type="submit" disabled={!summary?.eligible_to_withdraw || submitting || loading} className="w-full rounded-xl bg-emerald-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit withdrawal request'}</button>
                </form>
              </article>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
