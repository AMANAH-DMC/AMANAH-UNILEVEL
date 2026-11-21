import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowUpRight, BadgeCheck, Boxes, ClipboardList,
  Download, LayoutDashboard, LogOut, Package, RefreshCw, Search, ShieldCheck,
  Users, Wallet, XCircle, CircleDollarSign, PackageSearch, KeyRound,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import WithdrawalsManagement from './WithdrawalsManagement';
import ProductPvManagement from './ProductPvManagement';
import CommissionManagement from './CommissionManagement';
import StaffAccountManagement from './StaffAccountManagement';
import AdminSalesAccounting from './AdminSalesAccounting';
import AdminNetworkOperations from './AdminNetworkOperations';
import { DashboardProductHero } from './DashboardDesignSystem';

type AdminProfile = {
  id: string;
  member_number: string;
  full_name: string;
  role: string;
  account_status: string;
};

type Summary = {
  total_members: number;
  active_members: number;
  inactive_members: number;
  distributors: number;
  mobile_stockists: number;
  branch_operators: number;
  managers: number;
  admins: number;
};

type MemberRow = {
  id: string;
  member_number: string;
  full_name: string;
  role: string;
  account_status: string;
};

type ActivationRole = 'distributor' | 'mobile_stockist' | 'branch_operator' | 'manager' | 'front_desk';

type ActivationCodeRow = {
  id: string;
  assigned_role: string | null;
  sponsor_id: string | null;
  created_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  revoked_at: string | null;
  code_status: 'unused' | 'redeemed' | 'expired' | 'revoked';
};

type MonthlyActivityRow = { member_id: string; member_number: string | null; full_name: string; role: string; account_status: string; activity_status: 'ACTIVE' | 'INACTIVE'; qualifying_purchase_count: number; last_qualifying_purchase_at: string | null; total_count: number };

type AdminProductCodeRow = { id: string; product_code: string; product_name: string; prefix: string; serial_number: string; product_pv: number; commissionable: boolean; status: 'issued' | 'redeemed' | 'void'; issued_by: string; issued_by_name: string | null; issued_by_member_number: string | null; issued_at: string; redeemed_by: string | null; redeemed_by_name: string | null; redeemed_by_member_number: string | null; redeemed_at: string | null; purchase_reference: string | null; redemption_id: string | null; total_count: number };
type AdminProductCodeSummary = { total_codes: number; issued_codes: number; redeemed_codes: number; void_codes: number };

type ActivationEventRow = {
  event_id: string;
  event_type: string;
  actor_id: string | null;
  activation_code_id: string | null;
  occurred_at: string | null;
};

const emptySummary: Summary = {
  total_members: 0, active_members: 0, inactive_members: 0,
  distributors: 0, mobile_stockists: 0, branch_operators: 0, managers: 0, admins: 0,
};

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'members', label: 'Member Management', icon: Users },
  { id: 'staff-accounts', label: 'Staff Accounts', icon: ShieldCheck },
  { id: 'change-password', label: 'Change Password', icon: KeyRound },
  { id: 'activity', label: 'Monthly Activity', icon: Activity },
  { id: 'product-codes', label: 'Product Code Management', icon: PackageSearch },
  { id: 'codes', label: 'Activation Codes', icon: ShieldCheck },
  { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
  { id: 'commissions', label: 'Commission Management', icon: CircleDollarSign },
  { id: 'sales', label: 'Sales & Accounting', icon: Activity },
  { id: 'products', label: 'Product Management', icon: Package },
  { id: 'operations', label: 'Stockists & Branches', icon: Boxes },
];

export default function AdminDashboard({
  profile,
  onSignOut,
}: {
  profile: AdminProfile;
  onSignOut: () => void;
}) {
  const [section, setSection] = useState('overview');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [memberOffset, setMemberOffset] = useState(0);
  const [hasMoreMembers, setHasMoreMembers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activationRole, setActivationRole] = useState<ActivationRole>('distributor');
  const [sponsorId, setSponsorId] = useState('');
  const [activationCode, setActivationCode] = useState<{ code: string; role: string; expiresAt: string } | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [activationCodes, setActivationCodes] = useState<ActivationCodeRow[]>([]);
  const [activationEvents, setActivationEvents] = useState<ActivationEventRow[]>([]);
  const [codeSearchInput, setCodeSearchInput] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const [codeRoleFilter, setCodeRoleFilter] = useState('');
  const [codeStatusFilter, setCodeStatusFilter] = useState('');
  const [codeOffset, setCodeOffset] = useState(0);
  const [hasMoreCodes, setHasMoreCodes] = useState(false);
  const [codeHistoryLoading, setCodeHistoryLoading] = useState(false);
  const [eventHistoryLoading, setEventHistoryLoading] = useState(false);
  const [activityRows, setActivityRows] = useState<MonthlyActivityRow[]>([]);
  const [activitySearchInput, setActivitySearchInput] = useState('');
  const [activitySearch, setActivitySearch] = useState('');
  const [activityRole, setActivityRole] = useState('');
  const [activityStatus, setActivityStatus] = useState('');
  const [activityOffset, setActivityOffset] = useState(0);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [adminProductCodes, setAdminProductCodes] = useState<AdminProductCodeRow[]>([]);
  const [adminProductCodeSummary, setAdminProductCodeSummary] = useState<AdminProductCodeSummary>({ total_codes: 0, issued_codes: 0, redeemed_codes: 0, void_codes: 0 });
  const [productCodeSearchInput, setProductCodeSearchInput] = useState('');
  const [productCodeSearch, setProductCodeSearch] = useState('');
  const [productCodeStatus, setProductCodeStatus] = useState('');
  const [productCodeProduct, setProductCodeProduct] = useState('');
  const [productCodeOffset, setProductCodeOffset] = useState(0);
  const [productCodeTotal, setProductCodeTotal] = useState(0);
  const [productCodeLoading, setProductCodeLoading] = useState(false);
  const pageSize = 25;

  const changeAdminPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    if (!supabase) {
      setPasswordError('Authentication service is unavailable.');
      return;
    }
    if (newAdminPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordError('The passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newAdminPassword });
      if (updateError) throw updateError;
      setPasswordMessage('Your Admin password has been changed successfully.');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch {
      setPasswordError('Password change failed. Please try again, or use password recovery to sign in first.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const loadSummary = useCallback(async () => {
    if (!supabase) return;
    const { data, error: rpcError } = await supabase.rpc('get_admin_dashboard_summary');
    if (rpcError) throw rpcError;
    setSummary({ ...emptySummary, ...(data || {}) });
  }, []);

  const loadMembers = useCallback(async (nextOffset = 0, term = search) => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_members_filtered', {
        p_search: term.trim() || null,
        p_role: roleFilter || null,
        p_status: statusFilter || null,
        p_limit: pageSize + 1,
        p_offset: nextOffset,
      });
      if (rpcError) throw rpcError;
      const rows = (data || []) as MemberRow[];
      setHasMoreMembers(rows.length > pageSize);
      setMembers(rows.slice(0, pageSize));
      setMemberOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load member records.');
    } finally {
      setLoading(false);
    }
  }, [pageSize, search, roleFilter, statusFilter]);

  const loadActivationCodes = useCallback(async (nextOffset = 0) => {
    if (!supabase) return;
    setCodeHistoryLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_activation_codes', {
        p_search: codeSearch.trim() || null,
        p_role: codeRoleFilter || null,
        p_status: codeStatusFilter || null,
        p_limit: pageSize + 1,
        p_offset: nextOffset,
      });
      if (rpcError) throw rpcError;
      const rows = (data || []) as ActivationCodeRow[];
      setHasMoreCodes(rows.length > pageSize);
      setActivationCodes(rows.slice(0, pageSize));
      setCodeOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load activation-code history.');
    } finally {
      setCodeHistoryLoading(false);
    }
  }, [codeSearch, codeRoleFilter, codeStatusFilter, pageSize]);

  const revokeActivationCode = async (codeId: string) => {
    if (!supabase || !window.confirm('Revoke this unused activation code? This action cannot be undone.')) return;
    setCodeHistoryLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_revoke_activation_code', { p_activation_code_id: codeId });
      if (rpcError) throw rpcError;
      if (data !== true) throw new Error('The activation code was not revoked. It may already be used or revoked.');
      await Promise.all([loadActivationCodes(codeOffset), loadActivationEvents()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to revoke activation code.');
    } finally {
      setCodeHistoryLoading(false);
    }
  };

  const loadActivationEvents = useCallback(async () => {
    if (!supabase) return;
    setEventHistoryLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_activation_events', { p_limit: 10 });
      if (rpcError) throw rpcError;
      setActivationEvents((data || []) as ActivationEventRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load activation audit events.');
    } finally {
      setEventHistoryLoading(false);
    }
  }, []);

  const loadMonthlyActivity = useCallback(async (nextOffset = 0) => {
    if (!supabase) return;
    setActivityLoading(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_monthly_activity', {
        p_search: activitySearch.trim() || null,
        p_role: activityRole || null,
        p_activity_status: activityStatus || null,
        p_limit: pageSize,
        p_offset: nextOffset,
      });
      if (rpcError) throw rpcError;
      const rows = (data || []) as MonthlyActivityRow[];
      setActivityRows(rows);
      setActivityTotal(Number(rows[0]?.total_count || 0));
      setActivityOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load monthly activity records.');
    } finally {
      setActivityLoading(false);
    }
  }, [activitySearch, activityRole, activityStatus, pageSize]);

  const loadAdminProductCodes = useCallback(async (nextOffset = 0) => {
    if (!supabase) return;
    setProductCodeLoading(true);
    setError('');
    try {
      const [listResult, summaryResult] = await Promise.all([
        supabase.rpc('get_admin_product_codes', {
          p_search: productCodeSearch.trim() || null,
          p_status: productCodeStatus || null,
          p_product_code: productCodeProduct || null,
          p_limit: pageSize,
          p_offset: nextOffset,
        }),
        supabase.rpc('get_admin_product_code_summary'),
      ]);
      if (listResult.error) throw listResult.error;
      if (summaryResult.error) throw summaryResult.error;
      const rows = (listResult.data || []) as AdminProductCodeRow[];
      setAdminProductCodes(rows);
      setProductCodeTotal(Number(rows[0]?.total_count || 0));
      setAdminProductCodeSummary(summaryResult.data || { total_codes: 0, issued_codes: 0, redeemed_codes: 0, void_codes: 0 });
      setProductCodeOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load product-code records.');
    } finally {
      setProductCodeLoading(false);
    }
  }, [productCodeSearch, productCodeStatus, productCodeProduct, pageSize]);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await loadSummary();
      if (section === 'members') await loadMembers(0, search);
      if (section === 'codes') await Promise.all([loadActivationCodes(0), loadActivationEvents()]);
      if (section === 'activity') await loadMonthlyActivity(activityOffset);
      if (section === 'product-codes') await loadAdminProductCodes(productCodeOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [loadActivationCodes, loadActivationEvents, loadMembers, loadMonthlyActivity, loadAdminProductCodes, loadSummary, section, search, activityOffset, productCodeOffset]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await loadSummary();
        if (mounted && section === 'members') await loadMembers(0, search);
        if (mounted && section === 'codes') await Promise.all([loadActivationCodes(0), loadActivationEvents()]);
        if (mounted && section === 'activity') await loadMonthlyActivity(0);
        if (mounted && section === 'product-codes') await loadAdminProductCodes(0);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Admin dashboard data could not be loaded.');
      }
    };
    void init();
    return () => { mounted = false; };
  }, [loadSummary, loadMembers, loadActivationCodes, loadActivationEvents, loadMonthlyActivity, loadAdminProductCodes, section, search]);

  const generateCode = async () => {
    if (!supabase) return;
    setCodeLoading(true);
    setActivationCode(null);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('generate_activation_code', {
        p_role: activationRole,
        p_sponsor_id: sponsorId.trim() || null,
      });
      if (rpcError) throw rpcError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.activation_code) throw new Error('The server did not return an activation code.');
      setActivationCode({ code: row.activation_code, role: row.assigned_role, expiresAt: row.expires_at });
      await Promise.all([loadActivationCodes(0), loadActivationEvents()]);
    } catch (err) {
      setError(err && typeof err === 'object' && 'message' in err ? String(err.message) : err instanceof Error ? err.message : 'Activation code generation failed.');
    } finally {
      setCodeLoading(false);
    }
  };

  const exportMembers = () => {
    const header = ['Member ID', 'Full name', 'Role', 'Account status'];
    const rows = members.map((member) => [member.member_number, member.full_name, member.role, member.account_status]);
    const csv = [header, ...rows].map((row) => row.map((value) => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'amanah-members-page.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: 'Total members', value: summary.total_members, icon: Users },
    { label: 'Active members', value: summary.active_members, icon: BadgeCheck },
    { label: 'Distributors', value: summary.distributors, icon: Users },
    { label: 'Mobile stockists', value: summary.mobile_stockists, icon: Boxes },
    { label: 'Branch operators', value: summary.branch_operators, icon: ClipboardList },
    { label: 'Managers', value: summary.managers, icon: ShieldCheck },
  ];

  const sectionTitle = navigation.find((item) => item.id === section)?.label || 'Overview';

  return (
    <main className="min-h-screen bg-slate-100 pt-20">
      <div className="min-h-[calc(100vh-5rem)] lg:flex">
        <aside className="w-full lg:w-72 bg-emerald-950 text-white lg:min-h-[calc(100vh-5rem)]">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-amber-400 text-emerald-950 grid place-items-center font-black">A</div>
              <div><p className="font-bold tracking-wide">AMANAH ADMIN</p><p className="text-xs text-emerald-200">Control Center</p></div>
            </div>
          </div>
          <div className="px-4 py-4 border-b border-white/10">
            <p className="text-sm font-semibold">{profile.full_name}</p>
            <p className="text-xs text-emerald-200">{profile.member_number} · Verified Admin</p>
          </div>
          <nav className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const selected = section === item.id;
              return (
                <button key={item.id} onClick={() => setSection(item.id)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${selected ? 'bg-amber-400 text-emerald-950' : 'text-emerald-100 hover:bg-white/10'}`}>
                  <Icon className="h-4 w-4 shrink-0" /><span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-4 mt-2 lg:mt-auto">
            <button onClick={onSignOut} className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm text-emerald-100 hover:bg-white/10">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <DashboardProductHero />
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">Administration</p><h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">{sectionTitle}</h1><p className="mt-1 text-sm text-slate-500">Live records from the AMANAH Supabase database</p></div>
              <button onClick={() => void refreshDashboard()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            </header>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-2"><XCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span></div>}

            {section === 'staff-accounts' && <StaffAccountManagement />}
            {section === 'change-password' && (
              <article className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><KeyRound className="h-5 w-5" /></div>
                  <div><h2 className="font-bold text-slate-900">Change Admin Password</h2><p className="text-sm text-slate-500">Update the password for your currently signed-in Admin account.</p></div>
                </div>
                <form onSubmit={changeAdminPassword} className="mt-6 space-y-4">
                  <div><label htmlFor="admin-new-password" className="mb-1.5 block text-sm font-medium text-slate-700">New password</label><input id="admin-new-password" type="password" autoComplete="new-password" value={newAdminPassword} onChange={(event) => setNewAdminPassword(event.target.value)} minLength={8} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" placeholder="At least 8 characters" /></div>
                  <div><label htmlFor="admin-confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm new password</label><input id="admin-confirm-password" type="password" autoComplete="new-password" value={confirmAdminPassword} onChange={(event) => setConfirmAdminPassword(event.target.value)} minLength={8} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700" placeholder="Re-enter your new password" /></div>
                  {passwordError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{passwordError}</p>}
                  {passwordMessage && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{passwordMessage}</p>}
                  <button type="submit" disabled={passwordSaving || !newAdminPassword || !confirmAdminPassword} className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{passwordSaving ? 'Changing password…' : 'Change password'}</button>
                </form>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">Your new password is sent securely through your current authenticated session. It is not stored in this dashboard.</p>
              </article>
            )}

            {section === 'overview' && (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return <article key={stat.label} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{stat.label}</p><span className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{stat.value.toLocaleString()}</p></article>;
                  })}
                </div>
                <div className="grid lg:grid-cols-2 gap-4">
                  <article className="rounded-2xl bg-white border border-slate-200 p-6"><h2 className="font-bold text-slate-900">Account status</h2><div className="mt-4 flex justify-between text-sm"><span className="text-slate-500">Active accounts</span><strong>{summary.active_members}</strong></div><div className="mt-3 flex justify-between text-sm"><span className="text-slate-500">Inactive / other status</span><strong>{summary.inactive_members}</strong></div><div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: summary.total_members ? `${Math.min(100, summary.active_members / summary.total_members * 100)}%` : '0%' }} /></div></article>
                  <article className="rounded-2xl bg-white border border-slate-200 p-6"><h2 className="font-bold text-slate-900">Admin workspace</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Member counts and directory data are read through Admin-authorized database functions. Financial and inventory panels will be connected only after their underlying schemas and transaction rules are verified.</p><p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">No sample sales, balances, commissions, or withdrawal amounts are displayed.</p></article>
                </div>
              </>
            )}

            {section === 'members' && (
              <article className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="flex flex-1 flex-col sm:flex-row gap-2 max-w-4xl"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setMemberOffset(0); setSearch(searchInput); } }} placeholder="Search member name or ID" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-700" /></div><button onClick={() => { setMemberOffset(0); setSearch(searchInput); }} className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white">Search</button><select aria-label="Filter by role" value={roleFilter} onChange={(event) => { setMemberOffset(0); setRoleFilter(event.target.value); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All roles</option><option value="distributor">Distributor</option><option value="mobile_stockist">Mobile Stockist</option><option value="branch_operator">Branch Operator</option><option value="manager">Manager</option><option value="front_desk">Front Desk</option><option value="admin">Admin</option></select><select aria-label="Filter by account status" value={statusFilter} onChange={(event) => { setMemberOffset(0); setStatusFilter(event.target.value); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive / other</option></select></div>
                  <button onClick={exportMembers} disabled={!members.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"><Download className="h-4 w-4" /> Export current page</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Member ID</th><th className="px-5 py-3">Full name</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Account status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.map((member) => <tr key={member.id} className="hover:bg-slate-50"><td className="px-5 py-3 font-semibold text-emerald-900">{member.member_number}</td><td className="px-5 py-3 text-slate-800">{member.full_name}</td><td className="px-5 py-3 capitalize">{member.role.replaceAll('_', ' ')}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.account_status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{member.account_status}</span></td></tr>)}
                      {!loading && members.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No member records found.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm"><span className="text-slate-500">Showing {members.length} records · Page {Math.floor(memberOffset / pageSize) + 1}</span><div className="flex gap-2"><button disabled={memberOffset === 0 || loading} onClick={() => void loadMembers(Math.max(0, memberOffset - pageSize), search)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><button disabled={!hasMoreMembers || loading} onClick={() => void loadMembers(memberOffset + pageSize, search)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div></div>
              </article>
            )}

            {section === 'codes' && (
              <div className="space-y-6">
                <article className="max-w-3xl rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 shadow-sm space-y-4">
                  <div><h2 className="font-bold text-slate-900">Generate membership activation code</h2><p className="mt-1 text-sm text-slate-500">Admin-only generation. Each code is shown once and expires after seven days. Previously generated plaintext codes cannot be retrieved.</p></div>
                  <label className="block text-sm font-semibold text-slate-700">Assigned member role</label>
                  <select value={activationRole} onChange={(event) => setActivationRole(event.target.value as ActivationRole)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="distributor">Distributor</option><option value="mobile_stockist">Mobile Stockist</option><option value="branch_operator">Branch Operator</option><option value="manager">Manager</option><option value="front_desk">Front Desk</option></select>
                  <label className="block text-sm font-semibold text-slate-700">Sponsor profile UUID (optional)</label>
                  <input value={sponsorId} onChange={(event) => setSponsorId(event.target.value)} placeholder="Sponsor member profile ID" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                  <button onClick={() => void generateCode()} disabled={codeLoading} className="rounded-xl bg-emerald-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{codeLoading ? 'Generating securely…' : 'Generate activation code'}</button>
                  {activationCode && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2"><p className="text-xs font-bold uppercase tracking-wide text-amber-900">Shown once — copy and share securely</p><code className="block break-all text-sm font-bold text-slate-900">{activationCode.code}</code><p className="text-xs text-slate-600">Role: {activationCode.role} · Expires: {new Date(activationCode.expiresAt).toLocaleString()}</p><button onClick={() => void navigator.clipboard?.writeText(activationCode.code)} className="rounded-lg bg-amber-200 px-3 py-2 text-xs font-bold text-amber-950">Copy code</button></div>}
                </article>

                <article className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div><h2 className="font-bold text-slate-900">Activation-code history</h2><p className="text-xs text-slate-500">Metadata only. Code hashes and plaintext values are never displayed.</p></div><button onClick={() => void loadActivationCodes(0)} disabled={codeHistoryLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${codeHistoryLoading ? 'animate-spin' : ''}`} /> Refresh history</button></div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <input value={codeSearchInput} onChange={(event) => setCodeSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setCodeOffset(0); setCodeSearch(codeSearchInput); } }} placeholder="Search code record ID" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                      <button onClick={() => { setCodeOffset(0); setCodeSearch(codeSearchInput); }} className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white">Search history</button>
                      <select aria-label="Filter activation role" value={codeRoleFilter} onChange={(event) => { setCodeOffset(0); setCodeRoleFilter(event.target.value); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All roles</option><option value="distributor">Distributor</option><option value="mobile_stockist">Mobile Stockist</option><option value="branch_operator">Branch Operator</option><option value="manager">Manager</option></select>
                      <select aria-label="Filter activation status" value={codeStatusFilter} onChange={(event) => { setCodeOffset(0); setCodeStatusFilter(event.target.value); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option><option value="unused">Unused</option><option value="redeemed">Redeemed</option><option value="expired">Expired</option><option value="revoked">Revoked</option></select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Record ID</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Redeemed</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {activationCodes.map((code) => <tr key={code.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono text-xs text-slate-600">{code.id}</td><td className="px-4 py-3 capitalize">{(code.assigned_role || '—').replaceAll('_', ' ')}</td><td className="px-4 py-3 whitespace-nowrap">{code.created_at ? new Date(code.created_at).toLocaleString() : '—'}</td><td className="px-4 py-3 whitespace-nowrap">{code.expires_at ? new Date(code.expires_at).toLocaleString() : '—'}</td><td className="px-4 py-3 whitespace-nowrap">{code.redeemed_at ? new Date(code.redeemed_at).toLocaleString() : '—'}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          code.code_status === 'unused' ? 'bg-blue-50 text-blue-800' : code.code_status === 'redeemed' ? 'bg-emerald-50 text-emerald-800' : code.code_status === 'expired' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'
                        }`}>{code.code_status}</span></td><td className="px-4 py-3">{code.code_status === 'unused' ? <button onClick={() => void revokeActivationCode(code.id)} disabled={codeHistoryLoading} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Revoke</button> : '—'}</td></tr>)}
                        {!codeHistoryLoading && activationCodes.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No activation-code records match these filters.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm"><span className="text-slate-500">Showing {activationCodes.length} records · Page {Math.floor(codeOffset / pageSize) + 1}</span><div className="flex gap-2"><button disabled={codeOffset === 0 || codeHistoryLoading} onClick={() => void loadActivationCodes(Math.max(0, codeOffset - pageSize))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><button disabled={!hasMoreCodes || codeHistoryLoading} onClick={() => void loadActivationCodes(codeOffset + pageSize)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div></div>
                </article>

                <article className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-5 border-b border-slate-100"><h2 className="font-bold text-slate-900">Recent activation audit events</h2><p className="mt-1 text-xs text-slate-500">Latest 10 security events recorded by the database.</p></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Event</th><th className="px-4 py-3">Activation record</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Date</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {activationEvents.map((event) => <tr key={event.event_id || `${event.event_type}-${event.occurred_at}`}><td className="px-4 py-3 font-semibold capitalize">{event.event_type.replaceAll('_', ' ')}</td><td className="px-4 py-3 font-mono text-xs">{event.activation_code_id || '—'}</td><td className="px-4 py-3 font-mono text-xs">{event.actor_id || '—'}</td><td className="px-4 py-3 whitespace-nowrap">{event.occurred_at ? new Date(event.occurred_at).toLocaleString() : '—'}</td></tr>)}
                        {!eventHistoryLoading && activationEvents.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No activation audit events found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>
            )}

            {section === 'product-codes' && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'Total product codes', value: adminProductCodeSummary.total_codes },
                    { label: 'Unused / issued', value: adminProductCodeSummary.issued_codes },
                    { label: 'Redeemed', value: adminProductCodeSummary.redeemed_codes },
                    { label: 'Voided', value: adminProductCodeSummary.void_codes },
                  ].map((item) => (
                    <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{Number(item.value || 0).toLocaleString()}</p>
                    </article>
                  ))}
                </div>

                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-bold text-slate-900">Product-code register and lifecycle history</h2>
                        <p className="mt-1 text-xs text-slate-500">Read-only monitoring. Full redeemable codes and code hashes are never exposed to Admin.</p>
                      </div>
                      <button onClick={() => void loadAdminProductCodes(0)} disabled={productCodeLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                        <RefreshCw className={`h-4 w-4 ${productCodeLoading ? 'animate-spin' : ''}`} /> Refresh records
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_180px_200px_auto]">
                      <input value={productCodeSearchInput} onChange={(event) => setProductCodeSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { setProductCodeOffset(0); setProductCodeSearch(productCodeSearchInput); } }} placeholder="Search product, serial, or member" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                      <select aria-label="Filter product code status" value={productCodeStatus} onChange={(event) => { setProductCodeOffset(0); setProductCodeStatus(event.target.value); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                        <option value="">All statuses</option><option value="issued">Unused / issued</option><option value="redeemed">Redeemed</option><option value="void">Voided</option>
                      </select>
                      <select aria-label="Filter product" value={productCodeProduct} onChange={(event) => { setProductCodeOffset(0); setProductCodeProduct(event.target.value); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                        <option value="">All products</option><option value="spirulina">Spirulina</option><option value="serpentina">Serpentina</option><option value="herbal_oil">Herbal Oil</option><option value="herbal_rub">Herbal Rub</option><option value="baskug_coffee">Baskug Coffee</option><option value="barakah_coffee">Barakah Coffee</option><option value="max_c_pro">Max C Pro</option><option value="glutagen_cee">Glutagen Cee</option><option value="distributor_bundle">Distributor Bundle</option><option value="mobile_stockist_bundle">Mobile Stockist Bundle</option>
                      </select>
                      <button onClick={() => { setProductCodeOffset(0); setProductCodeSearch(productCodeSearchInput); }} className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white">Search</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr><th className="px-4 py-3">Code reference</th><th className="px-4 py-3">Product / PV</th><th className="px-4 py-3">Issued by / date</th><th className="px-4 py-3">Redeemed by / date</th><th className="px-4 py-3">Purchase reference</th><th className="px-4 py-3">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminProductCodes.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3"><p className="font-mono text-xs font-semibold text-slate-800">{row.prefix}{row.serial_number}••</p><p className="mt-1 text-[11px] text-slate-400">{row.id}</p></td>
                            <td className="px-4 py-3"><p className="font-semibold text-slate-900">{row.product_name}</p><p className="text-xs text-slate-500">{row.product_pv} PV · {row.commissionable ? 'Commissionable' : 'Not commissionable'}</p></td>
                            <td className="px-4 py-3"><p className="font-medium">{row.issued_by_name || 'Unknown member'}</p><p className="text-xs text-slate-500">{row.issued_by_member_number || row.issued_by}</p><p className="mt-1 whitespace-nowrap text-xs text-slate-500">{new Date(row.issued_at).toLocaleString()}</p></td>
                            <td className="px-4 py-3">{row.redeemed_at ? <><p className="font-medium">{row.redeemed_by_name || 'Unknown member'}</p><p className="text-xs text-slate-500">{row.redeemed_by_member_number || row.redeemed_by}</p><p className="mt-1 whitespace-nowrap text-xs text-slate-500">{new Date(row.redeemed_at).toLocaleString()}</p></> : '—'}</td>
                            <td className="px-4 py-3 font-mono text-xs">{row.purchase_reference || '—'}</td>
                            <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'redeemed' ? 'bg-emerald-50 text-emerald-800' : row.status === 'issued' ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>{row.status === 'issued' ? 'unused / issued' : row.status}</span><p className="mt-1 text-[11px] text-slate-400">{row.redemption_id ? 'Redemption recorded' : 'No redemption record'}</p></td>
                          </tr>
                        ))}
                        {!productCodeLoading && adminProductCodes.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No product-code records match these filters.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm">
                    <span className="text-slate-500">Showing {adminProductCodes.length} of {productCodeTotal} records · Page {Math.floor(productCodeOffset / pageSize) + 1}</span>
                    <div className="flex gap-2">
                      <button disabled={productCodeOffset === 0 || productCodeLoading} onClick={() => void loadAdminProductCodes(Math.max(0, productCodeOffset - pageSize))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button>
                      <button disabled={productCodeOffset + pageSize >= productCodeTotal || productCodeLoading} onClick={() => void loadAdminProductCodes(productCodeOffset + pageSize)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button>
                    </div>
                  </div>
                </article>
                <p className="text-xs leading-relaxed text-slate-500">Audit details are read from the product-code issuance record and its associated redemption record. This screen does not issue, reveal, revoke, or edit product codes.</p>
              </div>
            )}

            {section === 'activity' && (
              <article className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Monthly member activity</h2>
                  <p className="mt-1 text-xs text-slate-500">ACTIVE means at least one paid regular-product purchase in the current Asia/Manila calendar month. Bundles do not qualify.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_160px_auto]">
                    <input value={activitySearchInput} onChange={e=>setActivitySearchInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setActivityOffset(0);setActivitySearch(activitySearchInput);}}} placeholder="Search member name or number" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
                    <select value={activityRole} onChange={e=>{setActivityOffset(0);setActivityRole(e.target.value);}} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All roles</option><option value="distributor">Distributor</option><option value="mobile_stockist">Mobile Stockist</option><option value="branch_operator">Branch Operator</option><option value="manager">Manager</option><option value="front_desk">Front Desk</option><option value="admin">Admin</option></select>
                    <select value={activityStatus} onChange={e=>{setActivityOffset(0);setActivityStatus(e.target.value);}} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="">All activity</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select>
                    <button onClick={()=>{setActivityOffset(0);setActivitySearch(activitySearchInput);}} className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white">Search</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Monthly activity</th><th className="px-4 py-3">Qualifying purchases</th><th className="px-4 py-3">Last qualifying purchase</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {activityRows.map(row=><tr key={row.member_id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-semibold text-slate-900">{row.full_name}</p><p className="text-xs text-slate-500">{row.member_number||'No member number'}</p></td><td className="px-4 py-3 capitalize">{row.role.replaceAll('_',' ')}</td><td className="px-4 py-3 capitalize">{row.account_status}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.activity_status==='ACTIVE'?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-600'}`}>{row.activity_status}</span></td><td className="px-4 py-3 tabular-nums">{row.qualifying_purchase_count}</td><td className="px-4 py-3 whitespace-nowrap">{row.last_qualifying_purchase_at?new Date(row.last_qualifying_purchase_at).toLocaleString():'—'}</td></tr>)}
                      {!activityLoading&&activityRows.length===0&&<tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No member records match these filters.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm"><span className="text-slate-500">Showing {activityRows.length} of {activityTotal} members · Page {Math.floor(activityOffset/pageSize)+1}</span><div className="flex gap-2"><button disabled={activityOffset===0||activityLoading} onClick={()=>void loadMonthlyActivity(Math.max(0,activityOffset-pageSize))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><button disabled={activityOffset+pageSize>=activityTotal||activityLoading} onClick={()=>void loadMonthlyActivity(activityOffset+pageSize)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div></div>
              </article>
            )}

            {section === 'withdrawals' && <WithdrawalsManagement />}
            {section === 'commissions' && <CommissionManagement />}
            {section === 'products' && <ProductPvManagement />}
            {section === 'sales' && <AdminSalesAccounting />}
            {section === 'operations' && (
              <AdminNetworkOperations />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
