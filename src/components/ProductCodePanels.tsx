import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, PackagePlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PRODUCTS = [
  ['spirulina','Spirulina','SPI'],['serpentina','Serpentina','SER'],['herbal_oil','Herbal Oil','OIL'],
  ['herbal_rub','Herbal Rub','RUB'],['baskug_coffee','Baskug Coffee','BAS'],['barakah_coffee','Barakah Coffee','BAR'],
  ['max_c_pro','Max C Pro','MAX'],['glutagen_cee','Glutagen Cee','GLU'],
  ['distributor_bundle','Distributor Bundle','DB'],['mobile_stockist_bundle','Mobile Stockist Bundle','MSB'],
] as const;

export function ProductCodeIssuance() {
  const [product,setProduct]=useState<string>('spirulina');
  const [quantity,setQuantity]=useState(1);
  const [codes,setCodes]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const issue=async()=>{
    if(!supabase)return;
    setBusy(true);setError('');setNotice('');setCodes([]);
    try{
      const {data,error}=await supabase.rpc('front_desk_issue_product_codes',{p_product_code:product,p_quantity:quantity});
      if(error)throw error;
      const rows=(data?.codes||[]) as {code:string;product_name:string;pv:number}[];
      setCodes(rows.map(x=>x.code));
      setNotice(`${rows.length} product code(s) issued. Save or print these codes now; they are shown only at issuance.`);
    }catch(e){setError(e instanceof Error?e.message:'Unable to issue product codes.');}
    finally{setBusy(false);}
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
    <div className="flex items-center gap-2"><PackagePlus className="text-emerald-800"/><div><h2 className="font-bold text-slate-900">Product Code Issuance</h2><p className="text-xs text-slate-500">Separate from POS orders and activation codes.</p></div></div>
    {error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mr-1 inline h-4 w-4"/>{error}</p>}
    {notice&&<p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mr-1 inline h-4 w-4"/>{notice}</p>}
    <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
      <label className="text-xs font-semibold text-slate-600">Product<select value={product} onChange={e=>setProduct(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm">{PRODUCTS.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Quantity<input type="number" min={1} max={500} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(500,Number(e.target.value)||1)))} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
      <button onClick={()=>void issue()} disabled={busy} className="self-end rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Issuing…':'Generate codes'}</button>
    </div>
    {codes.length>0&&<div className="rounded-xl border border-slate-200 p-4"><div className="mb-2 flex items-center justify-between"><h3 className="font-bold">Newly issued codes</h3><button onClick={()=>{void navigator.clipboard.writeText(codes.join('\n'));setNotice('Codes copied. Keep them secure and provide them to the intended distributors.');}} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800"><Copy size={14}/> Copy all</button></div><div className="grid gap-2 sm:grid-cols-2">{codes.map((code,i)=><code key={i} className="rounded-lg bg-slate-50 p-2 font-mono text-sm">{code}</code>)}</div></div>}
  </section>;
}

export function ProductCodeRedemption() {
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [result,setResult]=useState<{product_name:string;product_pv:number;purchase_reference:string}|null>(null);
  const redeem=async(e:React.FormEvent)=>{
    e.preventDefault();if(!supabase)return;
    setBusy(true);setError('');setResult(null);
    try{const {data,error}=await supabase.rpc('redeem_product_code',{p_code:code.trim()});if(error)throw error;setResult(data);setCode('');}
    catch(err){setError(err instanceof Error?err.message:'Unable to redeem this code.');}
    finally{setBusy(false);}
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
    <div><h2 className="font-bold text-slate-900">Product Code Encoding</h2><p className="text-xs text-slate-500">Enter a product code issued by Front Desk to credit your PV.</p></div>
    {error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {result&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-bold"><CheckCircle2 className="mr-1 inline h-4 w-4"/>{result.product_name} redeemed successfully</p><p className="mt-1">{result.product_pv} PV credited · Reference: {result.purchase_reference}</p></div>}
    <form onSubmit={redeem} className="flex flex-col gap-3 sm:flex-row"><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={20} required placeholder="Enter product code" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 font-mono uppercase"/><button disabled={busy||!code.trim()} className="rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Verifying…':'Redeem code'}</button></form>
  </section>;
}

export function MonthlyActivityCard() {
  const [activity,setActivity]=useState<{status:string;qualifying_purchase_count:number;last_qualifying_purchase_at:string|null}|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [copied,setCopied]=useState(false);
  React.useEffect(()=>{let live=true;(async()=>{if(!supabase)return;const {data,error}=await supabase.rpc('get_member_monthly_activity');if(!live)return;if(error)setError(error.message);else setActivity(data);setLoading(false);})();return()=>{live=false;};},[]);
  const active=activity?.status==='ACTIVE';
  const reminder='AMANAH monthly activity reminder: Please purchase at least one regular product this calendar month to maintain ACTIVE status. Bundles do not count toward monthly activity qualification.';
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Monthly Activity</h2><p className="text-xs text-slate-500">At least one paid regular-product purchase this month. Bundles excluded.</p></div>
    {loading?<span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">Checking…</span>:<span className={`rounded-full px-4 py-2 text-sm font-extrabold ${active?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-600'}`}>{active?'● ACTIVE':'● INACTIVE'}</span>}</div>
    {error&&<p className="mt-3 text-xs text-red-700">{error}</p>}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Qualifying purchases this month: {activity?.qualifying_purchase_count??'—'}</span>{activity?.last_qualifying_purchase_at&&<span>Last purchase: {new Date(activity.last_qualifying_purchase_at).toLocaleDateString()}</span>}</div>
    {!active&&!loading&&<button onClick={()=>{void navigator.clipboard.writeText(reminder).then(()=>setCopied(true)).catch(()=>setError('Unable to copy reminder on this device.'));}} className="mt-4 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">{copied?'Reminder copied':'Notify / copy reminder'}</button>}
  </section>;
}
