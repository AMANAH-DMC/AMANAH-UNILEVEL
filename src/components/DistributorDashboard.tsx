import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Wallet, CheckCircle2, Clock3, AlertCircle, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  member_number: string;
  full_name: string;
  role: string;
  account_status: string;
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
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [history, setHistory] = useState<WithdrawalRow[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const [summaryResult, historyResult] = await Promise.all([
        supabase.rpc('get_member_commission_summary'),
        supabase.rpc('get_member_withdrawal_history'),
      ]);
      if (summaryResult.error) throw summaryResult.error;
      if (historyResult.error) throw historyResult.error;
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

  return (
    <main className="min-h-screen bg-slate-100 pt-20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">AMANAH Member Portal</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Welcome, {profile.full_name}</h1>
            <p className="text-sm text-slate-500">{profile.member_number} · Distributor</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            <button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </header>

        {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl bg-emerald-950 p-6 text-white shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2 text-emerald-200"><Wallet className="h-5 w-5" /><span className="text-sm font-semibold">Available Commission</span></div>
            <p className="mt-4 text-4xl font-extrabold tabular-nums">{loading ? '—' : money(summary?.available_commission)}</p>
            <p className="mt-2 text-sm text-emerald-100/80">Approved commissions you can still request for external payout.</p>
            <p className="mt-4 text-xs text-emerald-200">Minimum combined available commission to qualify: {money(summary?.withdrawal_threshold || 300)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">Commission breakdown</h2>
            <div className="mt-4 flex justify-between gap-3 text-sm"><span className="text-slate-500">Approved Unilevel</span><strong>{money(summary?.unilevel_approved)}</strong></div>
            <div className="mt-3 flex justify-between gap-3 text-sm"><span className="text-slate-500">Approved JMO / SMO</span><strong>{money(summary?.positional_approved)}</strong></div>
            <div className="mt-3 flex justify-between gap-3 border-t border-slate-100 pt-3 text-sm"><span className="text-slate-500">Already claimed</span><strong>{money(summary?.already_claimed)}</strong></div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-5">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900">Request commission payout</h2>
            <p className="mt-1 text-sm text-slate-500">Request all available commission or enter a smaller partial amount. Payment is made externally by GCash or cash after Admin review.</p>
            <form onSubmit={requestWithdrawal} className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="withdraw-amount">Requested amount (PHP)</label>
              <input id="withdraw-amount" type="number" min="0.01" step="0.01" max={summary?.available_commission || undefined} required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-700" />
              <button type="button" disabled={!summary?.eligible_to_withdraw || loading} onClick={() => setAmount(Number(summary?.available_commission || 0).toFixed(2))} className="w-full rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-900 disabled:opacity-40">Request full available amount</button>
              {!summary?.eligible_to_withdraw && <p className="text-xs text-amber-800">You can request a payout once your available approved commissions reach PHP 300.</p>}
              <button type="submit" disabled={!summary?.eligible_to_withdraw || submitting || loading} className="w-full rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting ? 'Submitting…' : 'Submit withdrawal request'}</button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
            <div className="border-b border-slate-100 p-6"><h2 className="text-lg font-bold text-slate-900">Withdrawal history</h2><p className="mt-1 text-sm text-slate-500">Track requests and confirm receipt after Admin records an external payment.</p></div>
            <div className="divide-y divide-slate-100">
              {history.map((item) => (
                <div key={item.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-bold text-slate-900">{money(item.requested_amount)}</p><p className="text-xs text-slate-500">Requested {new Date(item.requested_at).toLocaleString()}</p></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${item.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : item.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{item.status}</span>
                  </div>
                  {item.status === 'paid' && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><p>Paid via: <strong>{item.payment_method === 'gcash' ? 'GCash' : 'Cash'}</strong></p>{item.payment_reference && <p>Reference: {item.payment_reference}</p>}{item.payment_notes && <p>Admin note: {item.payment_notes}</p>}<p>Paid: {item.paid_at ? new Date(item.paid_at).toLocaleString() : '—'}</p>{item.receipt_confirmed_at ? <p className="mt-2 font-semibold text-emerald-800">Receipt confirmed</p> : <button onClick={() => void confirmReceipt(item.id)} className="mt-3 rounded-lg bg-emerald-900 px-3 py-2 text-xs font-bold text-white">Confirm I received this payment</button>}</div>}
                  {item.status === 'pending' && <p className="text-xs text-amber-800"><Clock3 className="mr-1 inline h-3.5 w-3.5" />Awaiting Admin review. This request is already deducted from the available amount to prevent duplicate claims.</p>}
                  {item.status === 'approved' && <p className="text-xs text-emerald-800">Approved. Awaiting external payment recording by Admin.</p>}
                </div>
              ))}
              {!loading && history.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No withdrawal requests yet.</p>}
            </div>
          </article>
        </section>
        <p className="text-xs leading-relaxed text-slate-500">AMANAH records commission and payout confirmations only. It does not hold cash, maintain an e-wallet, or transfer money. A rejected request returns to your available commission calculation.</p>
      </div>
    </main>
  );
}
