import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Summary = {
  total_amount: number;
  pending_amount: number;
  approved_amount: number;
  paid_amount: number;
  reversed_amount: number;
  pending_count: number;
  approved_count: number;
  paid_count: number;
  level_totals: { level_number: number; total_amount: number; entry_count: number }[];
};

type Rule = {
  level_number: number;
  commission_rate: number;
  pv_conversion_rate: number;
  is_active: boolean;
};

type LedgerRow = {
  id: string;
  earner_id: string;
  earner_name: string;
  earner_member_number: string | null;
  purchaser_id: string;
  purchaser_name: string;
  purchase_reference: string;
  purchase_item_id: string;
  level_number: number;
  product_pv: number;
  commission_rate: number;
  pv_conversion_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid' | 'reversed';
  created_at: string;
};

const emptySummary: Summary = {
  total_amount: 0, pending_amount: 0, approved_amount: 0, paid_amount: 0,
  reversed_amount: 0, pending_count: 0, approved_count: 0, paid_count: 0,
  level_totals: [],
};
const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));
const percent = (value: number | string) => `${(Number(value) * 100).toFixed(2)}%`;

export default function CommissionManagement() {
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [rules, setRules] = useState<Rule[]>([]);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [level, setLevel] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pageSize = 50;

  const load = useCallback(async (nextOffset = 0) => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const [summaryResult, rulesResult, ledgerResult] = await Promise.all([
        supabase.rpc('get_admin_commission_summary'),
        supabase.from('commission_rules').select('level_number, commission_rate, pv_conversion_rate, is_active').order('level_number'),
        supabase.rpc('get_admin_commission_ledger', {
          p_search: search.trim() || null,
          p_status: status || null,
          p_level: level ? Number(level) : null,
          p_limit: pageSize + 1,
          p_offset: nextOffset,
        }),
      ]);
      if (summaryResult.error) throw summaryResult.error;
      if (rulesResult.error) throw rulesResult.error;
      if (ledgerResult.error) throw ledgerResult.error;
      setSummary({ ...emptySummary, ...(summaryResult.data || {}) });
      setRules((rulesResult.data || []) as Rule[]);
      const data = (ledgerResult.data || []) as LedgerRow[];
      setHasMore(data.length > pageSize);
      setRows(data.slice(0, pageSize));
      setOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load commission management data.');
    } finally {
      setLoading(false);
    }
  }, [search, status, level]);

  useEffect(() => { void load(0); }, [load]);

  const approve = async (row: LedgerRow) => {
    if (!supabase || !window.confirm(`Approve commission of ${money(row.commission_amount)} for ${row.earner_name}?`)) return;
    setBusyId(row.id);
    setError('');
    setNotice('');
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_approve_commission', { p_commission_id: row.id });
      if (rpcError) throw rpcError;
      if (data !== true) throw new Error('This commission is no longer pending or has already been reviewed.');
      setNotice('Commission approved. The action was recorded in the audit log.');
      await load(offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to approve commission.');
    } finally {
      setBusyId('');
    }
  };

  const cards = [
    { label: 'Pending', amount: summary.pending_amount, count: summary.pending_count },
    { label: 'Approved', amount: summary.approved_amount, count: summary.approved_count },
    { label: 'Paid', amount: summary.paid_amount, count: summary.paid_count },
    { label: 'All recorded', amount: summary.total_amount, count: undefined },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-bold text-slate-900">Unilevel commission management</h2><p className="mt-1 text-sm text-slate-500">Review the ten-level rules, monitor ledger entries, and approve pending commissions.</p></div>
        <button onClick={() => void load(offset)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>
      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{card.label} commissions</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{money(card.amount)}</p>{card.count !== undefined && <p className="mt-1 text-xs text-slate-500">{card.count.toLocaleString()} entries</p>}</article>)}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-900">Configured Unilevel rates</h3><p className="mt-1 text-xs text-slate-500">Ten levels · unlimited width · PV conversion ₱1.50 per PV</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">Current configuration</span></div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {rules.map((rule) => <div key={rule.level_number} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Level {rule.level_number}</p><p className="mt-1 text-lg font-bold text-slate-900">{percent(rule.commission_rate)}</p><p className="text-xs text-slate-500">{rule.is_active ? 'Active' : 'Inactive'} · ₱{Number(rule.pv_conversion_rate).toFixed(2)}/PV</p></div>)}
          {rules.length === 0 && <p className="col-span-full text-sm text-slate-500">No commission rules were returned.</p>}
        </div>
        <p className="mt-3 text-xs text-slate-500">Rates are displayed from the database. This screen does not change historical rules or recalculate existing commissions.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setOffset(0); } }} placeholder="Search earner, member number, purchaser, purchase reference" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-700" /></div>
          <button onClick={() => { setSearch(searchInput); setOffset(0); }} className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white">Search</button>
          <select aria-label="Filter commission status" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="reversed">Reversed</option></select>
          <select aria-label="Filter Unilevel level" value={level} onChange={(e) => { setLevel(e.target.value); setOffset(0); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All levels</option>{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>Level {i + 1}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Beneficiary</th><th className="px-4 py-3">Purchaser / source</th><th className="px-4 py-3">Level / PV</th><th className="px-4 py-3">Rate / amount</th><th className="px-4 py-3">Status / action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={row.id} className="align-top hover:bg-slate-50">
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{row.earner_name}</p><p className="text-xs text-slate-500">{row.earner_member_number || row.earner_id}</p></td>
                <td className="px-4 py-3"><p>{row.purchaser_name}</p><p className="text-xs text-slate-500">{row.purchase_reference}</p></td>
                <td className="px-4 py-3 whitespace-nowrap"><p>Level {row.level_number}</p><p className="text-xs text-slate-500">{Number(row.product_pv).toFixed(2)} PV</p></td>
                <td className="px-4 py-3 whitespace-nowrap"><p>{percent(row.commission_rate)}</p><p className="font-semibold">{money(row.commission_amount)}</p></td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${row.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : row.status === 'paid' ? 'bg-blue-100 text-blue-800' : row.status === 'reversed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{row.status}</span>{row.status === 'pending' && <button onClick={() => void approve(row)} disabled={busyId === row.id} className="mt-2 block rounded-lg bg-emerald-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busyId === row.id ? 'Approving…' : 'Approve commission'}</button>}</td>
              </tr>)}
              {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No commission entries match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm"><span className="text-slate-500">Showing {rows.length} entries · Page {Math.floor(offset / pageSize) + 1}</span><div className="flex gap-2"><button disabled={offset === 0 || loading} onClick={() => void load(Math.max(0, offset - pageSize))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><button disabled={!hasMore || loading} onClick={() => void load(offset + pageSize)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div></div>
      </section>

      <p className="text-xs text-slate-500">JMO and SMO positional commissions remain separate and inactive pending approved qualification rules. Approving a commission changes only its status and records an administrator audit event; it does not initiate payment.</p>
    </div>
  );
}
