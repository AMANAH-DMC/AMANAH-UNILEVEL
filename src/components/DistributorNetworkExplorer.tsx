import React, { useMemo, useState } from 'react';
import { Search, UsersRound } from 'lucide-react';

type NetworkMember = {
  id: string;
  member_number: string | null;
  full_name: string;
  role: string;
  account_status: string;
  joined_at: string;
  level_number?: number;
  personal_pv: number;
};

export default function DistributorNetworkExplorer({ members }: { members: NetworkMember[] }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const filtered = useMemo(() => members.filter((member) => {
    const term = query.trim().toLowerCase();
    const matchesQuery = !term ||
      member.full_name.toLowerCase().includes(term) ||
      (member.member_number || '').toLowerCase().includes(term);
    return matchesQuery && (level === 'all' || member.level_number === Number(level));
  }), [members, query, level]);

  return (
    <section id="network" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><UsersRound className="h-5 w-5" /></span>
          <div><h2 className="font-bold text-slate-900">My Unilevel network</h2><p className="mt-1 text-xs text-slate-500">Search and filter your sponsored network across Levels 1–10</p></div>
        </div>
        <span className="text-sm font-semibold text-slate-600">{filtered.length} of {members.length} members</span>
      </div>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_180px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or member number" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-700" />
        </label>
        <select value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
          <option value="all">All levels</option>
          {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>Level {index + 1}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Level</th><th className="px-4 py-3">Member</th><th className="px-4 py-3">Member number</th><th className="px-4 py-3">Role</th><th className="px-4 py-3 text-right">Personal PV</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((member) => <tr key={member.id}>
              <td className="px-4 py-3 font-semibold">L{member.level_number}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{member.full_name}</td>
              <td className="px-4 py-3 text-slate-500">{member.member_number || '—'}</td>
              <td className="px-4 py-3 capitalize">{member.role.replaceAll('_', ' ')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{Number(member.personal_pv || 0).toLocaleString('en-PH')}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${member.account_status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{member.account_status}</span></td>
            </tr>)}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No network members match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
