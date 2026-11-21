import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminOperationsManagement from './AdminOperationsManagement';

type OrderItem = {
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};
type OrderRow = {
  id: string;
  order_number: string;
  customer_type: string;
  customer_name: string | null;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  total_count: number;
};
type SalesSummary = { order_count: number; recorded_sales: number };
const PAGE_SIZE = 25;
const peso = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};
const localStartIso = (date: string) => new Date(date + 'T00:00:00').toISOString();
const nextLocalStartIso = (date: string) => {
  const next = new Date(date + 'T00:00:00');
  next.setDate(next.getDate() + 1);
  return next.toISOString();
};

export default function AdminSalesAccounting() {
  const today = localDate(new Date());
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const [fromDate, setFromDate] = useState(localDate(monthAgo));
  const [toDate, setToDate] = useState(today);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [summary, setSummary] = useState<SalesSummary>({ order_count: 0, recorded_sales: 0 });
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (nextOffset = 0) => {
    if (!supabase) {
      setError('Supabase is unavailable. Please check the application connection.');
      return;
    }
    if (fromDate && toDate && fromDate > toDate) {
      setError('The start date must be on or before the end date.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const pFrom = fromDate ? localStartIso(fromDate) : null;
      const pTo = toDate ? nextLocalStartIso(toDate) : null;
      const [summaryResult, listResult] = await Promise.all([
        supabase.rpc('admin_get_front_desk_sales_summary', { p_from: pFrom, p_to: pTo }),
        supabase.rpc('admin_list_front_desk_pos_orders', {
          p_from: pFrom,
          p_to: pTo,
          p_search: search.trim() || null,
          p_limit: PAGE_SIZE,
          p_offset: nextOffset,
        }),
      ]);
      if (summaryResult.error) throw summaryResult.error;
      if (listResult.error) throw listResult.error;
      const summaryRow = Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data;
      const rows = (listResult.data || []) as OrderRow[];
      setSummary({
        order_count: Number(summaryRow?.order_count || 0),
        recorded_sales: Number(summaryRow?.recorded_sales || 0),
      });
      setOrders(rows);
      setTotalCount(Number(rows[0]?.total_count || 0));
      setOffset(nextOffset);
      setExpanded(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Front Desk sales records.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, search]);

  useEffect(() => { void load(0); }, [load]);

  const applyFilters = () => {
    setSearch(searchInput);
    setOffset(0);
  };

  return (
    <>
    <article className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">Front Desk Sales & Accounting</h2>
          <p className="mt-1 text-sm text-slate-500">Recorded POS orders and order totals. These figures are not confirmation that funds were received or settled.</p>
        </div>
        <button onClick={() => void load(offset)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">Recorded orders</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{summary.order_count.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">Recorded sales total</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{peso(summary.recorded_sales)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-semibold text-slate-600">From
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-600">To
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label className="min-w-[220px] flex-1 text-xs font-semibold text-slate-600">Search orders
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') applyFilters(); }} placeholder="Order no., customer, category, product" className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <button onClick={applyFilters} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Search size={15} /> Apply</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-bold text-slate-900">Front Desk orders</h3>
          <span className="text-xs text-slate-500">{totalCount.toLocaleString()} matching orders</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Date & time</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Price category</th><th className="px-4 py-3 text-right">Recorded total</th><th className="px-4 py-3">Items</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(order => (
                <React.Fragment key={order.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{order.order_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{order.customer_name || 'Walk-in customer'}</td>
                    <td className="px-4 py-3 capitalize">{order.customer_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{peso(Number(order.total_amount))}</td>
                    <td className="px-4 py-3"><button onClick={() => setExpanded(expanded === order.id ? null : order.id)} className="inline-flex items-center gap-1 text-emerald-800 font-semibold">{expanded === order.id ? <ChevronDown size={15}/> : <ChevronRight size={15}/>} {order.items.length} line(s)</button></td>
                  </tr>
                  {expanded === order.id && <tr><td colSpan={6} className="bg-slate-50 px-6 py-4">
                    <div className="space-y-2">{order.items.map((item, index) => <div key={item.product_code + index} className="flex flex-wrap justify-between gap-2 text-sm"><span>{item.product_name} × {item.quantity} <span className="text-slate-500">at {peso(Number(item.unit_price))}</span></span><b>{peso(Number(item.line_total))}</b></div>)}</div>
                  </td></tr>}
                </React.Fragment>
              ))}
              {!loading && orders.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No Front Desk orders found for these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm">
          <span className="text-slate-500">Showing {orders.length} of {totalCount} matching orders</span>
          <div className="flex gap-2">
            <button disabled={offset === 0 || loading} onClick={() => void load(Math.max(0, offset - PAGE_SIZE))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button>
            <button disabled={offset + PAGE_SIZE >= totalCount || loading} onClick={() => void load(offset + PAGE_SIZE)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </article>
    <AdminOperationsManagement mode="expenses" />
    </>
  );
}
