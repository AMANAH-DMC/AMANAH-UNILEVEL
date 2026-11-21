import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ReceiptText } from 'lucide-react';
import { supabase } from '../lib/supabase';

type CommissionRow = {
  id: string;
  purchaser_name: string;
  purchase_reference: string;
  product_name: string;
  level_number: number;
  product_pv: number;
  commission_rate: number;
  pv_conversion_rate: number;
  commission_amount: number;
  status: string;
  created_at: string;
};

const money = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));

export default function DistributorCommissionHistory() {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [status, setStatus] = useState('all');
  const [level, setLevel] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('get_member_commission_history', {
        p_limit: 100,
        p_offset: 0,
      });
      if (rpcError) throw rpcError;
      setRows((data || []) as CommissionRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load commission history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = rows.filter((row) =>
    (status === 'all' || row.status === status) &&
    (level === 'all' || row.level_number === Number(level))
  );

  return (
    <section id="commission-history" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><ReceiptText className="h-5 w-5" /></span>
          <div>
            <h2 className="font-bold text-slate-900">Unilevel commission history</h2>
            <p className="mt-1 text-xs text-slate-500">Your personal commission entries across Levels 1–10</p>
          </div>
        </div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
        <label className="text-xs font-semibold text-slate-600">Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="reversed">Reversed</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Level
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
            <option value="all">All levels</option>
            {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>Level {index + 1}</option>)}
          </select>
        </label>
        <span className="ml-auto self-center text-xs text-slate-500">{filtered.length} entries</span>
      </div>
      {error && <p className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Purchase / Buyer</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Level</th><th className="px-4 py-3 text-right">PV</th><th className="px-4 py-3 text-right">Rate</th><th className="px-4 py-3 text-right">Commission</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(row.created_at).toLocaleDateString('en-PH')}</td>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{row.purchase_reference}</p><p className="text-xs text-slate-500">{row.purchaser_name}</p></td>
                <td className="px-4 py-3">{row.product_name}</td>
                <td className="px-4 py-3 font-semibold">L{row.level_number}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Number(row.product_pv).toLocaleString('en-PH')}</td>
                <td className="px-4 py-3 text-right tabular-nums">{(Number(row.commission_rate) * 100).toFixed(2)}%</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-900">{money(Number(row.commission_amount))}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${row.status === 'approved' || row.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : row.status === 'reversed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{row.status}</span></td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No commission entries match these filters.</td></tr>}
            {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Loading your commission history…</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Commission history is read-only. Payout availability is calculated separately from approved Unilevel and positional commissions, less pending, approved, and paid withdrawal requests.</p>
    </section>
  );
}
