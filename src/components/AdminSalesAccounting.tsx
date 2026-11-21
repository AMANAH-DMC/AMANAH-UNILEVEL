import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Clock3, Wallet, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Summary = {
  paid_order_count: number;
  gross_sales: number;
  pending_expenses: number;
  approved_expenses: number;
  rejected_expenses: number;
  net_operating_total: number;
};
type Expense = {
  id: string;
  description: string;
  category: string;
  amount: number;
  receipt_reference: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by_name: string;
  created_at: string;
  review_note: string | null;
};
const peso = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value || 0);

export default function AdminSalesAccounting() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const [summaryResult, expenseResult] = await Promise.all([
        supabase.rpc('admin_get_sales_accounting_summary', {
          p_from: start.toISOString(),
          p_to: now.toISOString(),
        }),
        supabase.rpc('admin_list_front_desk_expenses', {
          p_status: filter,
          p_limit: 200,
        }),
      ]);
      if (summaryResult.error) throw summaryResult.error;
      if (expenseResult.error) throw expenseResult.error;
      const row = Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data;
      setSummary(row || null);
      setExpenses((expenseResult.data || []) as Expense[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load accounting records.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    if (!supabase) return;
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_review_front_desk_expense', {
        p_expense_id: id,
        p_decision: decision,
        p_review_note: null,
      });
      if (rpcError) throw rpcError;
      if (data !== true) throw new Error('This expense was already reviewed or no longer exists.');
      setMessage(`Expense ${decision}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to review expense.');
    } finally {
      setBusyId('');
    }
  };

  const cards = [
    { label: 'Paid orders today', value: String(summary?.paid_order_count ?? 0), icon: TrendingUp },
    { label: 'Gross sales today', value: peso(Number(summary?.gross_sales ?? 0)), icon: Wallet },
    { label: 'Approved expenses', value: peso(Number(summary?.approved_expenses ?? 0)), icon: CheckCircle2 },
    { label: 'Net operating total', value: peso(Number(summary?.net_operating_total ?? 0)), icon: TrendingUp },
  ];

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => { const Icon = card.icon; return <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{card.label}</p><Icon className="h-5 w-5 text-emerald-800"/></div><p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{card.value}</p></article>; })}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-sm font-semibold text-amber-900">Pending expenses — excluded from official totals</p><p className="mt-2 text-2xl font-bold text-amber-950">{peso(Number(summary?.pending_expenses ?? 0))}</p></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-600">Rejected expenses</p><p className="mt-2 text-2xl font-bold text-slate-900">{peso(Number(summary?.rejected_expenses ?? 0))}</p></article>
    </div>
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
        <div><h2 className="font-bold text-slate-900">Front-desk expense approvals</h2><p className="mt-1 text-xs text-slate-500">Only approved expenses reduce the official daily operating total.</p></div>
        <div className="flex gap-2">
          <select aria-label="Expense status" value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></select>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Refresh</button>
        </div>
      </div>
      {error && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="m-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <div className="divide-y divide-slate-100">
        {expenses.map(expense => <div key={expense.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-900">{expense.description}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize text-slate-600">{expense.category}</span><span className="text-xs text-slate-500">{expense.status}</span></div><p className="mt-1 text-xs text-slate-500">{expense.submitted_by_name} · {new Date(expense.created_at).toLocaleString()}</p>{expense.receipt_reference && <p className="mt-1 break-all text-xs text-slate-500">Receipt: {expense.receipt_reference}</p>}</div>
          <div className="flex shrink-0 items-center justify-between gap-3"><p className="font-bold tabular-nums">{peso(Number(expense.amount))}</p>{expense.status === 'pending' && <div className="flex gap-2"><button onClick={() => void review(expense.id, 'approved')} disabled={!!busyId} className="inline-flex items-center gap-1 rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>Approve</button><button onClick={() => void review(expense.id, 'rejected')} disabled={!!busyId} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"><XCircle className="h-4 w-4"/>Reject</button></div>}</div>
        </div>)}
        {!loading && expenses.length === 0 && <div className="p-10 text-center text-sm text-slate-500"><Clock3 className="mx-auto mb-2 h-5 w-5"/>No expenses in this category.</div>}
      </div>
    </article>
    <p className="text-xs text-slate-500">Daily figures are based on POS orders marked paid during the current local calendar day and expense submissions created during that day. Net operating total is gross sales less approved expenses; it is not a full profit calculation because cost of goods sold and other accounting adjustments are not yet included.</p>
  </div>;
}
