import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Users, Search, Store, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Role = 'distributor' | 'mobile_stockist' | 'branch_operator';
type Member = { id: string; member_number: string; full_name: string; role: Role; account_status: string };
const roles: { value: Role; label: string }[] = [
  { value: 'distributor', label: 'Distributors' },
  { value: 'mobile_stockist', label: 'Mobile stockists' },
  { value: 'branch_operator', label: 'Branch operators' },
];

export default function AdminNetworkOperations() {
  const [role, setRole] = useState<Role>('distributor');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_members_filtered', {
        p_search: search.trim() || null,
        p_role: role,
        p_status: status || null,
        p_limit: 200,
        p_offset: 0,
      });
      if (rpcError) throw rpcError;
      setRows((data || []) as Member[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load network members.');
    } finally { setLoading(false); }
  }, [role, status, search]);

  useEffect(() => { void load(); }, [load]);

  const activeCount = useMemo(() => rows.filter(r => r.account_status === 'active').length, [rows]);
  const Icon = role === 'distributor' ? Truck : Store;

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      {roles.map(item => <button key={item.value} onClick={() => setRole(item.value)} className={`rounded-2xl border p-4 text-left transition-colors ${role === item.value ? 'border-emerald-900 bg-emerald-950 text-white' : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-700'}`}><p className="text-xs font-semibold opacity-75">Network directory</p><p className="mt-1 text-lg font-bold">{item.label}</p></button>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">Records in current result</p><Users className="h-5 w-5 text-emerald-800"/></div><p className="mt-2 text-3xl font-bold tabular-nums">{rows.length}</p></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">Active in current result</p><Icon className="h-5 w-5 text-emerald-800"/></div><p className="mt-2 text-3xl font-bold tabular-nums">{activeCount}</p></article>
    </div>
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
        <label className="min-w-[220px] flex-1 text-xs font-semibold text-slate-600">Search name or member number<input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load();}} placeholder="Search network member" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"/></label>
        <label className="text-xs font-semibold text-slate-600">Account status<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label>
        <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button>
      </div>
      {error && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Member number</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Account status</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(member=><tr key={member.id}><td className="px-4 py-3 font-semibold text-slate-900">{member.full_name}</td><td className="px-4 py-3 text-slate-600">{member.member_number || '—'}</td><td className="px-4 py-3 capitalize">{member.role.replaceAll('_',' ')}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize">{member.account_status}</span></td></tr>)}{!loading && rows.length===0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500"><Search className="mx-auto mb-2 h-5 w-5"/>No matching records.</td></tr>}</tbody></table></div>
      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing up to 200 matching accounts. This is a read-only directory; stock quantities and branch assignments are not represented by the currently verified schema.</p>
    </article>
  </div>;
}
