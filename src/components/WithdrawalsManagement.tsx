import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type RequestRow = {
  id: string;
  member_id: string;
  member_number: string | null;
  full_name: string;
  mobile_number: string | null;
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

export default function WithdrawalsManagement() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>({});
  const [references, setReferences] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_withdrawal_requests', { p_limit: 200 });
      if (rpcError) throw rpcError;
      setRows((data || []) as RequestRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load withdrawal requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    if (!supabase || !window.confirm(`Are you sure you want to ${decision} this withdrawal request?`)) return;
    setError(''); setNotice('');
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_review_commission_withdrawal', { p_withdrawal_id: id, p_decision: decision });
      if (rpcError) throw rpcError;
      if (data !== true) throw new Error('This request was already reviewed or no longer pending.');
      setNotice(`Withdrawal request ${decision}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update request.');
    }
  };

  const recordPayment = async (id: string) => {
    if (!supabase) return;
    const method = paymentMethods[id] || 'gcash';
    const reference = references[id] || '';
    if (method === 'gcash' && !reference.trim()) {
      setError('Enter the GCash transaction reference before recording payment.');
      return;
    }
    if (!window.confirm('Confirm that the full requested amount has already been paid externally?')) return;
    setError(''); setNotice('');
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_record_commission_payment', {
        p_withdrawal_id: id,
        p_payment_method: method,
        p_payment_reference: reference.trim() || null,
        p_payment_notes: (notes[id] || '').trim() || null,
      });
      if (rpcError) throw rpcError;
      if (data !== true) throw new Error('Payment could not be recorded. Confirm that the request is approved and unpaid.');
      setNotice('External payment recorded. The distributor can now confirm receipt.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record external payment.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Commission withdrawal requests</h2><p className="mt-1 text-sm text-slate-500">Review requests and record external GCash or cash payments.</p></div><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button></div>
      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Distributor</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Status / action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => <tr key={row.id} className="align-top">
              <td className="px-4 py-4"><p className="font-bold text-slate-900">{row.full_name}</p><p className="text-xs text-slate-500">{row.member_number || row.member_id}</p>{row.mobile_number && <p className="text-xs text-slate-500">{row.mobile_number}</p>}</td>
              <td className="whitespace-nowrap px-4 py-4 font-bold">{money(row.requested_amount)}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{new Date(row.requested_at).toLocaleString()}</td>
              <td className="min-w-[260px] px-4 py-4">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${row.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : row.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{row.status}</span>
                {row.status === 'pending' && <div className="mt-3 flex gap-2"><button onClick={() => void review(row.id, 'approved')} className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-bold text-white">Approve</button><button onClick={() => void review(row.id, 'rejected')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Reject</button></div>}
                {row.status === 'approved' && <div className="mt-3 space-y-2">
                  <select value={paymentMethods[row.id] || 'gcash'} onChange={(e) => setPaymentMethods((v) => ({ ...v, [row.id]: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"><option value="gcash">GCash</option><option value="cash">Cash</option></select>
                  {(paymentMethods[row.id] || 'gcash') === 'gcash' && <input value={references[row.id] || ''} onChange={(e) => setReferences((v) => ({ ...v, [row.id]: e.target.value }))} placeholder="GCash transaction reference" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs" />}
                  <input value={notes[row.id] || ''} onChange={(e) => setNotes((v) => ({ ...v, [row.id]: e.target.value }))} placeholder="Optional payment note" className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs" />
                  <button onClick={() => void recordPayment(row.id)} className="w-full rounded-lg bg-emerald-900 px-3 py-2 text-xs font-bold text-white">Record external payment</button>
                </div>}
                {row.status === 'paid' && <div className="mt-2 space-y-1 text-xs text-slate-600"><p>{row.payment_method === 'gcash' ? 'GCash' : 'Cash'} · {row.payment_reference || 'No reference'}</p><p>Paid {row.paid_at ? new Date(row.paid_at).toLocaleString() : ''}</p><p>{row.receipt_confirmed_at ? 'Distributor confirmed receipt' : 'Awaiting distributor receipt confirmation'}</p></div>}
              </td>
            </tr>)}
            {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">No withdrawal requests found.</td></tr>}
          </tbody>
        </table></div>
      </div>
      <p className="text-xs text-slate-500">Only record a payment after it has actually been made outside AMANAH. This panel does not transfer or hold money.</p>
    </div>
  );
}
