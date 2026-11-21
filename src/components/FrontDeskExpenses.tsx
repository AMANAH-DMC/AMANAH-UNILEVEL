import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, ReceiptText } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Expense = {
  id: string; expense_date: string; category: string; amount: number;
  description: string; created_at: string; total_count: number;
};
const peso = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
};
const categories = [
  ['transport','Transportation'],['supplies','Office supplies'],['utilities','Utilities'],
  ['meals','Meals'],['maintenance','Maintenance'],['communication','Communication'],['other','Other'],
] as const;

export default function FrontDeskExpenses() {
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState('supplies');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase is unavailable.'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [listResult, summaryResult] = await Promise.all([
        supabase.rpc('front_desk_list_expenses', { p_limit: 50, p_offset: 0 }),
        supabase.rpc('front_desk_expense_summary'),
      ]);
      if (listResult.error) throw listResult.error;
      if (summaryResult.error) throw summaryResult.error;
      const rows = (listResult.data || []) as Expense[];
      setExpenses(rows);
      setCount(Number(rows[0]?.total_count || 0));
      const summary = Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data;
      setTotal(Number(summary?.expense_total || 0));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load expense records.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || saving) return;
    setError(''); setNotice('');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > 100000000) {
      setError('Enter a valid expense amount greater than zero.'); return;
    }
    if (description.trim().length < 2) { setError('Please provide an expense description.'); return; }
    setSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('front_desk_create_expense', {
        p_expense_date: date, p_category: category, p_amount: value, p_description: description.trim(),
      });
      if (rpcError) throw rpcError;
      if (!data) throw new Error('The expense was not confirmed by the server.');
      setAmount(''); setDescription('');
      setNotice('Expense recorded successfully.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to record expense.'); }
    finally { setSaving(false); }
  };

  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-slate-900">Front Desk Expenses</h2><p className="mt-1 text-sm text-slate-500">Record operational expenses and review entries submitted by your Front Desk account.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw size={15} className={loading?'animate-spin':''}/> Refresh</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div>}
    <div className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Expenses recorded</p><p className="mt-2 text-3xl font-black tabular-nums">{count}</p></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-slate-500">Total expenses</p><p className="mt-2 text-3xl font-black tabular-nums">{peso(total)}</p></article>
    </div>
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2"><ReceiptText className="text-emerald-800"/><h3 className="font-bold">Record a new expense</h3></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Expense date<input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
        <label className="text-xs font-semibold text-slate-600">Category<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Amount (PHP)<input type="number" min="0.01" max="100000000" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
        <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description<input required minLength={2} maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What was this expense for?" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
      </div>
      <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Plus size={16}/>{saving?'Saving expense…':'Save expense'}</button>
      <p className="text-xs text-slate-500">Saved expenses cannot be edited or deleted from this screen. Contact Admin if an entry needs review.</p>
    </form>
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3"><h3 className="font-bold">Expense history</h3><p className="text-xs text-slate-500">Latest 50 records for this Front Desk account</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{expenses.map(row=><tr key={row.id}><td className="px-4 py-3 whitespace-nowrap">{row.expense_date}</td><td className="px-4 py-3 capitalize">{row.category}</td><td className="px-4 py-3">{row.description}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{peso(Number(row.amount))}</td></tr>)}
          {!loading&&expenses.length===0&&<tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No expenses recorded yet.</td></tr>}
        </tbody>
      </table></div>
    </article>
  </section>;
}
