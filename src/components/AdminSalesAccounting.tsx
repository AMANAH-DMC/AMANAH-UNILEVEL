import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

type PosOrderItem = {
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type PosOrder = {
  order_id: string;
  order_number: string;
  created_at: string;
  customer_type: string;
  customer_name: string | null;
  total_amount: number;
  items: PosOrderItem[];
  total_count: number;
};

type SalesSummary = { order_count: number; recorded_sales: number };

const peso = (value: number) => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
}).format(Number(value || 0));

const manilaDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(date);

const manilaStart = (date: string) => new Date(date + 'T00:00:00+08:00').toISOString();
const manilaEnd = (date: string) => new Date(date + 'T00:00:00+08:00').toISOString();

export default function AdminSalesAccounting() {
  const today = manilaDate();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [summary, setSummary] = useState<SalesSummary>({ order_count: 0, recorded_sales: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pageSize = 25;

  const load = useCallback(async (nextOffset = 0) => {
    if (!supabase) {
      setError('Supabase is unavailable. Check the application connection settings.');
      return;
    }
    if (fromDate && toDate && fromDate > toDate) {
      setError('The start date must not be after the end date.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const from = fromDate ? manilaStart(fromDate) : null;
      const to = toDate
        ? new Date(new Date(manilaEnd(toDate)).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : null;

      const [summaryResult, ordersResult] = await Promise.all([
        supabase.rpc('admin_get_front_desk_sales_summary', { p_from: from, p_to: to }),
        supabase.rpc('admin_list_front_desk_pos_orders', {
          p_from: from,
          p_to: to,
          p_search: search.trim() || null,
          p_limit: pageSize,
          p_offset: nextOffset,
        }),
      ]);
      if (summaryResult.error) throw summaryResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const summaryRow = Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data;
      const rows = (ordersResult.data || []) as PosOrder[];
      setSummary({
        order_count: Number(summaryRow?.order_count || 0),
        recorded_sales: Number(summaryRow?.recorded_sales || 0),
      });
      setOrders(rows);
      setTotalCount(Number(rows[0]?.total_count || 0));
      setOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Front Desk sales records.');
      setOrders([]);
      setSummary({ order_count: 0, recorded_sales: 0 });
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, search]);

  useEffect(() => {
    void load(0);
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Front Desk orders</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{summary.order_count.toLocaleString()}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Recorded order total</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{peso(summary.recorded_sales)}</p>
          <p className="mt-1 text-xs text-slate-500">Order totals recorded by Front Desk; not confirmation of payment received.</p>
        </article>
      </div>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Front Desk sales register</h2>
              <p className="mt-1 text-xs text-slate-500">Read-only order history with item and price snapshots.</p>
            </div>
            <button onClick={() => void load(0)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto]">
            <label className="text-xs font-semibold text-slate-600">From
              <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-600">To
              <input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
            </label>
            <label className="text-xs font-semibold text-slate-600">Search orders or products
              <input value={searchInput} onChange={event => setSearchInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { setSearch(searchInput); } }} placeholder="Order number, customer, product" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal" />
            </label>
            <button onClick={() => setSearch(searchInput)} className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white">
              <Search className="h-4 w-4" /> Apply
            </button>
          </div>
        </div>

        {error && <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Order / Date</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Items</th><th className="px-4 py-3 text-right">Recorded total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map(order => (
                <tr key={order.order_id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-slate-900">{order.order_number}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{order.customer_name || 'Walk-in customer'}</p>
                    <p className="mt-1 text-xs capitalize text-slate-500">{order.customer_type.replaceAll('_', ' ')}</p>
                  </td>
                  <td className="px-4 py-3 min-w-[260px]">
                    <details>
                      <summary className="cursor-pointer font-semibold text-emerald-900">{order.items.length} item line(s)</summary>
                      <div className="mt-2 space-y-1">
                        {order.items.map((item, index) => (
                          <div key={`${item.product_code}-${index}`} className="flex justify-between gap-4 text-xs text-slate-600">
                            <span>{item.product_name} × {item.quantity} · {peso(Number(item.unit_price))} each</span>
                            <span className="font-semibold">{peso(Number(item.line_total))}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{peso(Number(order.total_amount))}</td>
                </tr>
              ))}
              {!loading && orders.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No Front Desk orders found for this date range.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm">
          <span className="text-slate-500">Showing {orders.length} of {totalCount} matching orders · Page {Math.floor(offset / pageSize) + 1}</span>
          <div className="flex gap-2">
            <button disabled={offset === 0 || loading} onClick={() => void load(Math.max(0, offset - pageSize))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button>
            <button disabled={offset + pageSize >= totalCount || loading} onClick={() => void load(offset + pageSize)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button>
          </div>
        </div>
      </article>
    </div>
  );
}
