import React, { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, Save, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type ProductPvRow = {
  product_code: string;
  product_name: string;
  pv: number;
  commissionable: boolean;
  is_active: boolean;
  updated_at: string;
};

type ProductPvDraft = {
  pv: string;
  commissionable: boolean;
  is_active: boolean;
};

export default function ProductPvManagement() {
  const [rows, setRows] = useState<ProductPvRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ProductPvDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProducts = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_product_pv_catalog');
      if (rpcError) throw rpcError;
      const nextRows = (data || []) as ProductPvRow[];
      setRows(nextRows);
      setDrafts(Object.fromEntries(nextRows.map((row) => [row.product_code, {
        pv: String(row.pv),
        commissionable: row.commissionable,
        is_active: row.is_active,
      }])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load product PV catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const updateDraft = (code: string, patch: Partial<ProductPvDraft>) => {
    setDrafts((current) => ({ ...current, [code]: { ...current[code], ...patch } }));
    setNotice('');
  };

  const saveProduct = async (row: ProductPvRow) => {
    if (!supabase) return;
    const draft = drafts[row.product_code];
    const pv = Number(draft.pv);
    if (!Number.isFinite(pv) || pv < 0 || !/^\d+(\.\d{1,2})?$/.test(draft.pv.trim())) {
      setError('PV must be zero or greater, with up to two decimal places.');
      return;
    }

    setSaving(row.product_code);
    setError('');
    setNotice('');
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_update_product_pv', {
        p_product_code: row.product_code,
        p_pv: pv,
        p_commissionable: draft.commissionable,
        p_is_active: draft.is_active,
      });
      if (rpcError) throw rpcError;
      if (data !== true) throw new Error('The product PV settings were not saved.');
      setNotice(row.product_name + ' settings saved.');
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product PV settings.');
    } finally {
      setSaving(null);
    }
  };

  const isDirty = (row: ProductPvRow) => {
    const draft = drafts[row.product_code];
    return !!draft && (
      Number(draft.pv) !== Number(row.pv) ||
      draft.commissionable !== row.commissionable ||
      draft.is_active !== row.is_active
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Product PV catalog</h2>
            <p className="mt-1 text-sm text-slate-500">Manage PV qualification, commission eligibility, and product availability.</p>
          </div>
          <button onClick={() => void loadProducts()} disabled={loading || saving !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh catalog
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Catalog products</p><p className="mt-1 text-2xl font-bold text-slate-900">{rows.length}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Active products</p><p className="mt-1 text-2xl font-bold text-slate-900">{rows.filter((row) => row.is_active).length}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Commissionable products</p><p className="mt-1 text-2xl font-bold text-slate-900">{rows.filter((row) => row.commissionable).length}</p></div>
        </div>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="h-4 w-4" />{notice}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <h3 className="font-bold text-slate-900">PV and commission settings</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Bundle PV counts toward rank qualification but bundles are excluded from Unilevel commissions. Every change is recorded in the database audit log.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">PV</th><th className="px-4 py-3">Unilevel eligible</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Last updated</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const draft = drafts[row.product_code];
                return (
                  <tr key={row.product_code} className="align-middle hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{row.product_name}</p><p className="text-xs text-slate-400">{row.product_code}</p></td>
                    <td className="px-4 py-3"><input aria-label={row.product_name + ' PV'} type="number" min="0" step="0.01" value={draft?.pv ?? ''} onChange={(event) => updateDraft(row.product_code, { pv: event.target.value })} className="w-24 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-700" /></td>
                    <td className="px-4 py-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={draft?.commissionable ?? false} onChange={(event) => updateDraft(row.product_code, { commissionable: event.target.checked })} className="h-4 w-4 accent-emerald-800" /><span className="text-xs text-slate-600">{draft?.commissionable ? 'Eligible' : 'Excluded'}</span></label></td>
                    <td className="px-4 py-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={draft?.is_active ?? false} onChange={(event) => updateDraft(row.product_code, { is_active: event.target.checked })} className="h-4 w-4 accent-emerald-800" /><span className="text-xs text-slate-600">{draft?.is_active ? 'Active' : 'Inactive'}</span></label></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{row.updated_at ? new Date(row.updated_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3"><button onClick={() => void saveProduct(row)} disabled={!isDirty(row) || saving !== null} className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-3.5 w-3.5" />{saving === row.product_code ? 'Saving…' : 'Save'}</button></td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No product PV records found.</td></tr>}
              {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Loading product PV catalog…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">This screen does not change storefront retail prices, existing purchases, previously recorded PV, or commission ledger entries. New PV settings are intended for future transactions after the commission engine is connected.</p>
    </div>
  );
}
