import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

type MemberAccount = {
  id: string;
  member_number: string | null;
  full_name: string;
  role: string;
  account_status: string;
};

const PAGE_SIZE = 25;

export default function MainAdminMemberPasswordManagement() {
  const [members, setMembers] = useState<MemberAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<MemberAccount | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMembers = useCallback(async (nextOffset = 0, term = search) => {
    if (!supabase) {
      setError('Authentication service is unavailable.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-member-passwords', {
        body: { action: 'list', search: term, limit: PAGE_SIZE, offset: nextOffset },
      });
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || 'Member records could not be loaded.');
      setMembers((data.members || []) as MemberAccount[]);
      setTotal(Number(data.total || 0));
      setOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load member accounts.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void loadMembers(0, search); }, [loadMembers, search]);

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !selected || saving) return;
    setError('');
    setNotice('');
    if (password.length < 12 || password.length > 128) {
      setError('Use a password between 12 and 128 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }
    const confirmed = window.confirm(
      `Reset the password for ${selected.full_name} (${selected.member_number || 'no member number'})? They will need to use the new password the next time they sign in.`,
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-member-passwords', {
        body: { action: 'reset_password', user_id: selected.id, password },
      });
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || 'The password was not updated.');
      setNotice(data.audit_recorded
        ? `Password updated for ${selected.full_name}. The action was recorded in the security audit log.`
        : `Password updated for ${selected.full_name}, but the audit entry could not be recorded. Please notify technical support.`);
      setSelected(null);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update the member password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />
          <div>
            <h2 className="font-bold text-emerald-950">Main Admin-only password controls</h2>
            <p className="mt-1 text-sm leading-relaxed text-emerald-900">Existing passwords cannot be viewed. You can set a replacement password for a selected member. No password changes occur until you confirm the reset.</p>
          </div>
        </div>
      </article>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-bold text-slate-900">Member account directory</h2><p className="mt-1 text-xs text-slate-500">Search by member name or member number. Admin accounts are excluded.</p></div>
            <button type="button" onClick={() => void loadMembers(0, search)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); setOffset(0); setSearch(searchInput.trim()); }} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search member name or number" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" /></div>
            <button type="submit" className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white">Search members</button>
            {search && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setOffset(0); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Clear</button>}
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Member number</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Account status</th><th className="px-4 py-3">Password action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => <tr key={member.id} className="hover:bg-slate-50">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" /><span className="font-semibold text-slate-900">{member.full_name}</span></div></td>
                <td className="px-4 py-3 font-mono text-xs">{member.member_number || '—'}</td>
                <td className="px-4 py-3 capitalize">{member.role.replaceAll('_', ' ')}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.account_status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{member.account_status}</span></td>
                <td className="px-4 py-3"><button type="button" onClick={() => { setSelected(member); setPassword(''); setConfirmPassword(''); setError(''); setNotice(''); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><KeyRound className="h-3.5 w-3.5" /> Set new password</button></td>
              </tr>)}
              {!loading && members.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No member accounts match this search.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm">
          <span className="text-slate-500">Showing {members.length} of {total} members · Page {Math.floor(offset / PAGE_SIZE) + 1}</span>
          <div className="flex gap-2">
            <button type="button" disabled={offset === 0 || loading} onClick={() => void loadMembers(Math.max(0, offset - PAGE_SIZE))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button>
            <button type="button" disabled={offset + PAGE_SIZE >= total || loading} onClick={() => void loadMembers(offset + PAGE_SIZE)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button>
          </div>
        </div>
      </article>

      {selected && <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div className="mb-4"><h2 className="font-bold text-amber-950">Set a new password</h2><p className="mt-1 text-sm text-amber-900">{selected.full_name} · {selected.member_number || 'No member number'} · {selected.role.replaceAll('_', ' ')}</p></div>
        <form onSubmit={resetPassword} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700">New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} required autoComplete="new-password" placeholder="At least 12 characters" className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 font-normal" /></label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">Confirm new password<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={12} maxLength={128} required autoComplete="new-password" placeholder="Re-enter the new password" className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 font-normal" /></label>
          <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="submit" disabled={saving || !password || !confirmPassword} className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Updating securely…' : 'Confirm password reset'}</button><button type="button" onClick={() => { setSelected(null); setPassword(''); setConfirmPassword(''); }} disabled={saving} className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-950">Cancel</button></div>
        </form>
      </article>}

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}
      <p className="text-xs leading-relaxed text-slate-500">Password values are sent only to the authenticated server function for the requested reset. They are not displayed in member records, written to the audit log, or stored in this dashboard.</p>
    </div>
  );
}
