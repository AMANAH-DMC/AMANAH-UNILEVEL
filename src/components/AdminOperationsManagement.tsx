import React, { useCallback, useEffect, useState } from 'react';
import { Building2, RefreshCw, Save, Users, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Branch = { id:string; branch_code:string; branch_name:string; address:string; contact_number:string; status:string; operator_member_id:string|null; operator_name:string|null; operator_member_number:string|null };
type Operator = { member_id:string; member_number:string|null; full_name:string; account_status:string; branch_id:string|null; branch_name:string|null };
type Stockist = { member_id:string; member_number:string|null; full_name:string; account_status:string; assignment_status:string; branch_id:string|null; branch_name:string|null; service_area:string; notes:string };
type Expense = { id:string; expense_date:string; category:string; amount:number; description:string; created_at:string; created_by_name:string; created_by_member_number:string|null; total_count:number };
type MonthlyPurchaseActivity = { member_id:string; member_number:string|null; full_name:string; role:string; account_status:string; branch_name:string|null; purchase_count:number; purchase_pv:number; month_start:string };
const peso=(v:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(v);
const dateString=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');

export default function AdminOperationsManagement({ mode = 'branches' }: { mode?: 'branches' | 'expenses' }) {
  const [tab,setTab]=useState<'branches'|'stockists'|'expenses'>(mode === 'expenses' ? 'expenses' : 'branches');
  const [branches,setBranches]=useState<Branch[]>([]);
  const [operators,setOperators]=useState<Operator[]>([]);
  const [stockists,setStockists]=useState<Stockist[]>([]);
  const [monthlyPurchaseActivity,setMonthlyPurchaseActivity]=useState<Record<string,MonthlyPurchaseActivity>>({});
  const [expenses,setExpenses]=useState<Expense[]>([]);
  const [branchCode,setBranchCode]=useState('');
  const [branchName,setBranchName]=useState('');
  const [address,setAddress]=useState('');
  const [contact,setContact]=useState('');
  const [branchStatus,setBranchStatus]=useState('active');
  const [editingId,setEditingId]=useState<string|null>(null);
  const [operatorChoices,setOperatorChoices]=useState<Record<string,string>>({});
  const [stockistChoices,setStockistChoices]=useState<Record<string,string>>({});
  const [serviceAreas,setServiceAreas]=useState<Record<string,string>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [from,setFrom]=useState(()=>{const d=new Date();d.setDate(d.getDate()-30);return dateString(d);});
  const [to,setTo]=useState(()=>dateString(new Date()));
  const [expenseSearch,setExpenseSearch]=useState('');
  const [expenseTotal,setExpenseTotal]=useState(0);
  const [expenseOffset,setExpenseOffset]=useState(0);
  const [expenseTotalCount,setExpenseTotalCount]=useState(0);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const pageSize=25;

  const load=useCallback(async()=>{
    if(!supabase){setError('Supabase is unavailable.');return;}
    setLoading(true);setError('');
    try{
      const [b,o,s,m]=await Promise.all([
        supabase.rpc('admin_list_branches'),
        supabase.rpc('admin_list_branch_operators'),
        supabase.rpc('admin_list_mobile_stockists'),
        supabase.rpc('admin_get_branch_stockist_monthly_purchase_activity'),
      ]);
      if(b.error)throw b.error;if(o.error)throw o.error;if(s.error)throw s.error;if(m.error)throw m.error;
      setBranches((b.data||[]) as Branch[]);setOperators((o.data||[]) as Operator[]);setStockists((s.data||[]) as Stockist[]);
      setMonthlyPurchaseActivity(Object.fromEntries(((m.data||[]) as MonthlyPurchaseActivity[]).map(row=>[row.member_id,row])));
    }catch(e){setError(e instanceof Error?e.message:'Unable to load branch and stockist records.');}
    finally{setLoading(false);}
  },[]);

  const loadExpenses=useCallback(async(nextOffset=0)=>{
    if(!supabase)return;
    setLoading(true);setError('');
    try{
      const {data,error:rpcError}=await supabase.rpc('admin_list_front_desk_expenses',{
        p_from:from||null,p_to:to||null,p_search:expenseSearch.trim()||null,p_limit:pageSize,p_offset:nextOffset,
      });
      if(rpcError)throw rpcError;
      const rows=(data||[]) as Expense[];
      setExpenses(rows);setExpenseTotalCount(Number(rows[0]?.total_count||0));
      setExpenseTotal(rows.reduce((sum,row)=>sum+Number(row.amount),0));setExpenseOffset(nextOffset);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load expense records.');}
    finally{setLoading(false);}
  },[from,to,expenseSearch]);

  useEffect(()=>{if(tab==='expenses')void loadExpenses(0);else void load();},[tab,load,loadExpenses]);

  const editBranch=(b:Branch)=>{
    setEditingId(b.id);setBranchCode(b.branch_code);setBranchName(b.branch_name);setAddress(b.address||'');setContact(b.contact_number||'');setBranchStatus(b.status);
  };
  const resetBranch=()=>{setEditingId(null);setBranchCode('');setBranchName('');setAddress('');setContact('');setBranchStatus('active');};
  const saveBranch=async(event:React.FormEvent)=>{
    event.preventDefault();if(!supabase||saving)return;
    setSaving(true);setError('');setNotice('');
    try{
      const {data,error:rpcError}=await supabase.rpc('admin_save_branch',{
        p_branch_id:editingId,p_branch_code:branchCode.trim(),p_branch_name:branchName.trim(),
        p_address:address.trim(),p_contact_number:contact.trim(),p_status:branchStatus,
      });
      if(rpcError)throw rpcError;if(!data)throw new Error('The branch was not saved.');
      setNotice(editingId?'Branch details updated.':'Branch created.');resetBranch();await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to save branch.');}
    finally{setSaving(false);}
  };
  const assignOperator=async(branch:Branch)=>{
    if(!supabase)return;const memberId=operatorChoices[branch.id]||branch.operator_member_id;
    if(!memberId){setError('Select an active Branch Operator first.');return;}
    setSaving(true);setError('');setNotice('');
    try{const {data,error:rpcError}=await supabase.rpc('admin_assign_branch_operator',{p_branch_id:branch.id,p_operator_member_id:memberId});if(rpcError)throw rpcError;if(data!==true)throw new Error('Assignment was not confirmed.');setNotice('Branch Operator assigned.');await load();}
    catch(e){setError(e instanceof Error?e.message:'Unable to assign Branch Operator.');}
    finally{setSaving(false);}
  };
  const assignStockist=async(memberId:string)=>{
    if(!supabase)return;setSaving(true);setError('');setNotice('');
    try{
      const {data,error:rpcError}=await supabase.rpc('admin_assign_mobile_stockist',{
        p_stockist_member_id:memberId,p_branch_id:stockistChoices[memberId]||null,
        p_service_area:serviceAreas[memberId]||'',p_notes:notes[memberId]||'',
      });
      if(rpcError)throw rpcError;if(data!==true)throw new Error('Stockist assignment was not confirmed.');
      setNotice('Mobile Stockist assignment saved.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to save stockist assignment.');}
    finally{setSaving(false);}
  };
  const setStockistStatus=async(memberId:string,status:string)=>{
    if(!supabase)return;setSaving(true);setError('');setNotice('');
    try{const {data,error:rpcError}=await supabase.rpc('admin_set_mobile_stockist_status',{p_stockist_member_id:memberId,p_status:status});if(rpcError)throw rpcError;if(data!==true)throw new Error('Status update was not confirmed.');setNotice('Stockist assignment status updated.');await load();}
    catch(e){setError(e instanceof Error?e.message:'Unable to update stockist assignment.');}
    finally{setSaving(false);}
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">{mode === 'expenses' ? 'Front Desk Expenses' : 'Branch & Stockist Operations'}</h2><p className="mt-1 text-sm text-slate-500">{mode === 'expenses' ? 'Review expenses recorded by Front Desk for Sales & Accounting.' : 'Manage branch records and assign existing operator and stockist accounts. Member profiles are not edited.'}</p></div><button onClick={()=>tab==='expenses'?void loadExpenses(expenseOffset):void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw size={15} className={loading?'animate-spin':''}/> Refresh</button></div>
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div>}
    <div className="flex flex-wrap gap-2">{(mode === 'expenses' ? ([['expenses','Front Desk Expenses',Wallet]] as const) : ([['branches','Branches',Building2],['stockists','Mobile Stockists',Users]] as const)).map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab===id?'bg-emerald-950 text-white':'border border-slate-200 bg-white text-slate-700'}`}><Icon size={16}/>{label}</button>)}</div>

    {tab==='branches'&&<div className="space-y-4">
      <form onSubmit={saveBranch} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-bold">{editingId?'Edit branch':'Register a branch'}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">Branch code<input required maxLength={30} value={branchCode} onChange={e=>setBranchCode(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
          <label className="text-xs font-semibold text-slate-600">Branch name<input required maxLength={120} value={branchName} onChange={e=>setBranchName(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
          <label className="text-xs font-semibold text-slate-600">Address<input value={address} onChange={e=>setAddress(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
          <label className="text-xs font-semibold text-slate-600">Contact number<input value={contact} onChange={e=>setContact(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>
          {editingId&&<label className="text-xs font-semibold text-slate-600">Branch status<select value={branchStatus} onChange={e=>setBranchStatus(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}
        </div>
        <div className="flex gap-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save size={15}/>{saving?'Saving…':'Save branch'}</button>{editingId&&<button type="button" onClick={resetBranch} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel edit</button>}</div>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Address / Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assigned operator</th><th className="px-4 py-3">Operator monthly purchases</th><th className="px-4 py-3">Assign</th><th className="px-4 py-3"></th></tr></thead>
        <tbody className="divide-y divide-slate-100">{branches.map(b=><tr key={b.id}>
          <td className="px-4 py-3"><b>{b.branch_name}</b><p className="text-xs text-slate-500">{b.branch_code}</p></td><td className="px-4 py-3">{b.address||'—'}<p className="text-xs text-slate-500">{b.contact_number||'—'}</p></td><td className="px-4 py-3 capitalize">{b.status}</td><td className="px-4 py-3">{b.operator_name||'Not assigned'}<p className="text-xs text-slate-500">{b.operator_member_number||''}</p></td>
          <td className="px-4 py-3"><b>{monthlyPurchaseActivity[b.operator_member_id||'']?.purchase_count||0} paid</b><p className="text-xs text-slate-500">{Number(monthlyPurchaseActivity[b.operator_member_id||'']?.purchase_pv||0).toLocaleString('en-PH')} PV</p></td>
          <td className="px-4 py-3"><div className="flex gap-2"><select value={operatorChoices[b.id]??b.operator_member_id??''} onChange={e=>setOperatorChoices(v=>({...v,[b.id]:e.target.value}))} className="max-w-[190px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"><option value="">Choose operator</option>{operators.filter(o=>o.account_status==='active').map(o=><option key={o.member_id} value={o.member_id}>{o.full_name} · {o.member_number||'No ID'}</option>)}</select><button disabled={saving||b.status!=='active'} onClick={()=>void assignOperator(b)} className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Assign</button></div></td>
          <td className="px-4 py-3"><button onClick={()=>editBranch(b)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Edit</button></td>
        </tr>)}{!loading&&branches.length===0&&<tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No branches registered yet.</td></tr>}</tbody>
      </table></div>
      <p className="text-xs text-slate-500">Monthly figures show the assigned Branch Operator’s own qualifying paid purchases and PV, not branch POS sales. Branch records and operator assignments are stored separately from member profiles. Existing sponsor relationships are not changed.</p>
    </div>}

    {tab==='stockists'&&<div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[1200px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Mobile Stockist</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Stockist monthly purchases</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3">Service area</th><th className="px-4 py-3">Notes</th><th className="px-4 py-3">Assignment</th><th className="px-4 py-3">Action</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{stockists.map(s=><tr key={s.member_id}>
        <td className="px-4 py-3"><b>{s.full_name}</b><p className="text-xs text-slate-500">{s.member_number||'No member number'}</p></td><td className="px-4 py-3 capitalize">{s.account_status}</td>
        <td className="px-4 py-3"><b>{monthlyPurchaseActivity[s.member_id]?.purchase_count||0} paid</b><p className="text-xs text-slate-500">{Number(monthlyPurchaseActivity[s.member_id]?.purchase_pv||0).toLocaleString('en-PH')} PV</p></td>
        <td className="px-4 py-3"><select value={stockistChoices[s.member_id]??s.branch_id??''} onChange={e=>setStockistChoices(v=>({...v,[s.member_id]:e.target.value}))} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"><option value="">No branch</option>{branches.filter(b=>b.status==='active').map(b=><option key={b.id} value={b.id}>{b.branch_name}</option>)}</select></td>
        <td className="px-4 py-3"><input value={serviceAreas[s.member_id]??s.service_area} onChange={e=>setServiceAreas(v=>({...v,[s.member_id]:e.target.value}))} maxLength={160} className="w-40 rounded-lg border border-slate-200 px-2 py-2 text-xs" placeholder="Area"/></td>
        <td className="px-4 py-3"><input value={notes[s.member_id]??s.notes} onChange={e=>setNotes(v=>({...v,[s.member_id]:e.target.value}))} maxLength={500} className="w-40 rounded-lg border border-slate-200 px-2 py-2 text-xs" placeholder="Optional notes"/></td>
        <td className="px-4 py-3 capitalize">{s.assignment_status}</td><td className="px-4 py-3"><div className="flex gap-2"><button disabled={saving||s.account_status!=='active'} onClick={()=>void assignStockist(s.member_id)} className="rounded-lg bg-emerald-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Save</button>{s.assignment_status!=='unassigned'&&<button disabled={saving} onClick={()=>void setStockistStatus(s.member_id,s.assignment_status==='active'?'inactive':'active')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">{s.assignment_status==='active'?'Deactivate':'Reactivate'}</button>}</div></td>
      </tr>)}{!loading&&stockists.length===0&&<tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No Mobile Stockist accounts found.</td></tr>}</tbody>
    </table></div>}

    {tab==='expenses'&&<div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600">To<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Search<input value={expenseSearch} onChange={e=>setExpenseSearch(e.target.value)} placeholder="Description, category, staff name or member number" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label><button onClick={()=>void loadExpenses(0)} className="w-fit rounded-lg bg-emerald-950 px-4 py-2 text-sm font-bold text-white">Apply filters</button></div>
      <div className="grid gap-3 sm:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Expenses on this page</p><p className="mt-2 text-2xl font-black">{peso(expenseTotal)}</p></article><article className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Matching records</p><p className="mt-2 text-2xl font-black">{expenseTotalCount}</p></article></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Front Desk staff</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{expenses.map(e=><tr key={e.id}><td className="px-4 py-3">{e.expense_date}</td><td className="px-4 py-3">{e.created_by_name}<p className="text-xs text-slate-500">{e.created_by_member_number||''}</p></td><td className="px-4 py-3 capitalize">{e.category}</td><td className="px-4 py-3">{e.description}</td><td className="px-4 py-3 text-right font-semibold">{peso(Number(e.amount))}</td></tr>)}{!loading&&expenses.length===0&&<tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No expense records match the filters.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Showing {expenses.length} records · Page {Math.floor(expenseOffset/pageSize)+1}</span><div className="flex gap-2"><button disabled={expenseOffset===0||loading} onClick={()=>void loadExpenses(Math.max(0,expenseOffset-pageSize))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><button disabled={expenseOffset+pageSize>=expenseTotalCount||loading} onClick={()=>void loadExpenses(expenseOffset+pageSize)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div></div>
      <p className="text-xs text-slate-500">Expense totals shown above reflect the current page only. Use the filters to review a specific period. Expenses are recorded separately from POS sales and are not treated as proof of payment or settlement.</p>
    </div>}
  </div>;
}
