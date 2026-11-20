import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, RefreshCw, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

type StaffAccount = {
  user_id: string;
  full_name: string;
  role: 'admin' | 'front_desk';
  member_number: string | null;
  username: string | null;
  account_status: string;
  created_at: string;
};

export default function StaffAccountManagement() {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [role, setRole] = useState<'admin' | 'front_desk'>('front_desk');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createdUsername, setCreatedUsername] = useState('');
  const [resetTarget, setResetTarget] = useState<StaffAccount | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');

  const loadAccounts = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('get_admin_staff_accounts');
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setAccounts((data || []) as StaffAccount[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  const adminCount = accounts.filter((account) => account.role === 'admin').length;
  const frontDeskCount = accounts.filter((account) => account.role === 'front_desk').length;
  const roleAvailable = role === 'admin' ? adminCount < 2 : frontDeskCount < 1;

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || busy) return;
    setError('');
    setNotice('');
    setCreatedUsername('');
    if (fullName.trim().length < 2) {
      setError('Enter the staff member’s full name.');
      return;
    }
    if (password.length < 12) {
      setError('Use a password with at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The password confirmation does not match.');
      return;
    }

    setBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-staff-accounts', {
        body: { action: 'create', role, full_name: fullName.trim(), password },
      });
      if (invokeError) throw invokeError;
      if (!data?.success || !data?.username) throw new Error(data?.error || 'The account was not created.');
      setCreatedUsername(data.username);
      setNotice(`${data.full_name} was created successfully as ${String(data.role).replaceAll('_', ' ')}.`);
      setFullName('');
      setPassword('');
      setConfirmPassword('');
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create staff account.');
    } finally {
      setBusy(false);
    }
  };

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !resetTarget || busy) return;
    setError('');
    setNotice('');
    if (resetPassword.length < 12) {
      setError('Use a password with at least 12 characters.');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setError('The password confirmation does not match.');
      return;
    }

    setBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-staff-accounts', {
        body: { action: 'reset_password', user_id: resetTarget.user_id, password: resetPassword },
      });
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || 'The password was not updated.');
      setNotice(`Password updated for ${resetTarget.username || resetTarget.full_name}.`);
      setResetTarget(null);
      setResetPassword('');
      setResetConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update staff password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Admin accounts</p><ShieldCheck className="h-5 w-5 text-emerald-700" /></div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{adminCount} <span className="text-base font-medium text-slate-400">/ 2</span></p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><p className="text-sm text-slate-500">Front Desk accounts</p><Users className="h-5 w-5 text-emerald-700" /></div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{frontDeskCount} <span className="text-base font-medium text-slate-400">/ 1</span></p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-950">No email required</p>
          <p className="mt-2 text-xs leading-relaxed text-amber-900">Accounts are confirmed internally. No invitation or verification email is sent.</p>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><UserPlus className="h-5 w-5" /></span>
          <div><h2 className="font-bold text-slate-900">Create privileged staff account</h2><p className="mt-1 text-sm text-slate-500">Provision the remaining Admin or Front Desk account directly. The backend enforces the account limits and assigns the login username.</p></div>
        </div>
        <form onSubmit={createAccount} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Account role
            <select value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'front_desk')} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal">
              <option value="admin" disabled={adminCount >= 2}>Admin {adminCount >= 2 ? '(limit reached)' : ''}</option>
              <option value="front_desk" disabled={frontDeskCount >= 1}>Front Desk {frontDeskCount >= 1 ? '(already created)' : ''}</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Staff member full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required maxLength={120} placeholder="Enter full legal name" className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Initial password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} autoComplete="new-password" placeholder="At least 12 characters" className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Confirm password
            <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} autoComplete="new-password" placeholder="Re-enter initial password" className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || !roleAvailable} className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> {busy ? 'Creating securely…' : 'Create staff account'}
            </button>
            {!roleAvailable && <span className="text-xs text-slate-500">The selected role has reached its account limit.</span>}
          </div>
        </form>
        {createdUsername && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Account created — login username</p><p className="mt-1 font-mono text-xl font-bold text-emerald-950">{createdUsername}</p><p className="mt-1 text-xs text-emerald-800">Share this username and the password you entered with the staff member through a secure channel.</p></div>}
      </article>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
          <div><h2 className="font-bold text-slate-900">Privileged account directory</h2><p className="mt-1 text-xs text-slate-500">Admin and Front Desk login usernames and account status.</p></div>
          <button onClick={() => void loadAccounts()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Staff member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Member number</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Password</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((account) => <tr key={account.user_id}>
                <td className="px-4 py-3 font-semibold text-slate-900">{account.full_name}</td>
                <td className="px-4 py-3 capitalize">{account.role.replaceAll('_', ' ')}</td>
                <td className="px-4 py-3 font-mono font-semibold">{account.username || 'Username not assigned'}</td>
                <td className="px-4 py-3 font-mono text-xs">{account.member_number || '—'}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.account_status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{account.account_status}</span></td>
                <td className="px-4 py-3"><button onClick={() => { setError(''); setNotice(''); setResetTarget(account); setResetPassword(''); setResetConfirm(''); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><KeyRound className="h-3.5 w-3.5" /> Set password</button></td>
              </tr>)}
              {!loading && accounts.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No privileged staff accounts found.</td></tr>}
            </tbody>
          </table>
        </div>
      </article>

      {resetTarget && <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="mb-3"><h2 className="font-bold text-amber-950">Set password for {resetTarget.username || resetTarget.full_name}</h2><p className="mt-1 text-xs text-amber-900">This changes the account password immediately. Notify the staff member securely.</p></div>
        <form onSubmit={updatePassword} className="grid gap-3 sm:grid-cols-2">
          <input type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} minLength={12} required autoComplete="new-password" placeholder="New password (12+ characters)" className="rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm" />
          <input type="password" value={resetConfirm} onChange={(event) => setResetConfirm(event.target.value)} minLength={12} required autoComplete="new-password" placeholder="Confirm new password" className="rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm" />
          <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Updating…' : 'Update password'}</button><button type="button" onClick={() => setResetTarget(null)} className="rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-950">Cancel</button></div>
        </form>
      </article>}

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}
      <p className="text-xs leading-relaxed text-slate-500">These staff accounts use non-deliverable internal login aliases instead of real email inboxes. Email-based password recovery is unavailable for them; an Admin can set a replacement password here. Passwords are never displayed or stored in this dashboard.</p>
    </div>
  );
}
