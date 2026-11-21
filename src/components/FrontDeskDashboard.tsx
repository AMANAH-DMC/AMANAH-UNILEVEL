import React, { useEffect, useMemo, useState } from 'react';
import { LogOut, Plus, Minus, Trash2, Printer, ShoppingCart, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductCodeIssuance } from './ProductCodePanels';
import { DashboardProductHero, DashboardSidebar } from './DashboardDesignSystem';

type Profile = { id: string; member_number: string; full_name: string; role: string; account_status: string };
type CustomerType = 'walk_in' | 'distributor' | 'mobile_stockist' | 'branch_operator' | 'manager';
type Product = { code: string; name: string; prices: Record<CustomerType, number> };
type PaymentMethod = 'cash' | 'transfer';
const TYPES: { id: CustomerType; label: string }[] = [
  { id: 'walk_in', label: 'Walk-in' }, { id: 'distributor', label: 'Distributor' },
  { id: 'mobile_stockist', label: 'Mobile Stockist' }, { id: 'branch_operator', label: 'Branch Operator' },
  { id: 'manager', label: 'Manager' },
];
const peso = (n: number) => new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' }).format(n);

export default function FrontDeskDashboard({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [type, setType] = useState<CustomerType>('walk_in');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('supplies');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseReceipt, setExpenseReceipt] = useState('');
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseMessage, setExpenseMessage] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ number: string; total: number; lines: {name:string;qty:number;price:number}[]; customer:string; type:string; date:string; paymentMethod: string } | null>(null);
  useEffect(() => {
    let active = true;
    const loadPrices = async () => {
      if (!supabase) { setProductsLoading(false); setError('Pricing service is unavailable.'); return; }
      setProductsLoading(true);
      const { data, error: rpcError } = await supabase.rpc('front_desk_get_pos_prices');
      if (!active) return;
      if (rpcError) {
        setError(rpcError.message);
        setProducts([]);
      } else {
        const mapped = (data || []).map((row: any) => ({
          code: row.product_code, name: row.product_name,
          prices: {
            walk_in: Number(row.walk_in_price),
            distributor: Number(row.distributor_price),
            mobile_stockist: Number(row.mobile_stockist_price),
            branch_operator: Number(row.branch_operator_price),
            manager: Number(row.manager_price),
          },
        } as Product));
        setProducts(mapped);
        setError('');
      }
      setProductsLoading(false);
    };
    void loadPrices();
    return () => { active = false; };
  }, []);
  const lines = useMemo(() => products.filter(p => (cart[p.code] || 0) > 0).map(p => ({ name:p.name, code:p.code, qty:cart[p.code], price:p.prices[type] })), [products,cart,type]);
  const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const add = (code: string, delta: number) => setCart(current => ({ ...current, [code]: Math.max(0, (current[code] || 0) + delta) }));
  const checkout = async () => {
    if (!supabase || !lines.length) return;
    setSaving(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('front_desk_create_pos_order', {
        p_customer_type: type, p_customer_name: customer.trim() || null,
        p_items: lines.map(line => ({ product_code: line.code, quantity: line.qty })),
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference.trim() || null,
      });
      if (rpcError) throw rpcError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.order_number || !row?.order_id) throw new Error('The order was not confirmed by the server.');
      setReceipt({ number: row.order_number, total: Number(row.total_amount), lines: lines.map(({name,qty,price}) => ({name,qty,price})), customer: customer.trim() || 'Walk-in customer', type: TYPES.find(t=>t.id===type)?.label || type, date: new Date().toLocaleString(), paymentMethod: paymentMethod === 'cash' ? 'Cash' : 'Transfer' });
      setCart({}); setCustomer(''); setPaymentReference('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save order.'); }
    finally { setSaving(false); }
  };
  const submitExpense = async () => {
    if (!supabase) return;
    setExpenseSaving(true); setExpenseError(''); setExpenseMessage('');
    try {
      const { data, error: rpcError } = await supabase.rpc('front_desk_submit_expense', {
        p_description: expenseDescription.trim(), p_category: expenseCategory,
        p_amount: Number(expenseAmount), p_receipt_reference: expenseReceipt.trim() || null,
      });
      if (rpcError) throw rpcError;
      if (!data) throw new Error('The expense was not confirmed by the server.');
      setExpenseMessage('Expense submitted for Admin approval. It is not yet included in official accounting totals.');
      setExpenseDescription(''); setExpenseAmount(''); setExpenseReceipt('');
    } catch (e) { setExpenseError(e instanceof Error ? e.message : 'Unable to submit expense.'); }
    finally { setExpenseSaving(false); }
  };
  return <main className="amanah-dashboard min-h-screen bg-slate-100 pt-20"><div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row px-4 py-6"><DashboardSidebar role="Front Desk" onSignOut={onSignOut}/><div id="dashboard-content" className="min-w-0 flex-1 space-y-6"><DashboardProductHero/>
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">AMANAH • Front Desk</p><h1 className="text-3xl font-black text-slate-900">Ordering & POS</h1><p className="text-sm text-slate-500">{profile.full_name} · {profile.member_number}</p></div><button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-3 text-sm font-semibold text-white"><LogOut size={16}/> Sign out</button></header>
    <ProductCodeIssuance />
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="inline mr-2" size={16}/>{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section id="products" className="space-y-4"><div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200"><h2 className="font-bold mb-3">Select customer price category</h2><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{TYPES.map(t=><button key={t.id} onClick={()=>setType(t.id)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${type===t.id?'bg-emerald-950 text-white border-emerald-950':'bg-white text-slate-700 border-slate-200 hover:border-emerald-700'}`}>{t.label}</button>)}</div><p className="text-xs text-slate-500 mt-3">Walk-in = SRP. Manager = Marketing Officer pricing.</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{productsLoading ? <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading current price list…</p> : products.map(p=><article key={p.code} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><div className="flex justify-between gap-2"><div><h3 className="font-bold text-slate-900">{p.name}</h3><p className="text-xs text-slate-400">{p.code}</p></div><span className="font-extrabold text-emerald-900">{peso(p.prices[type])}</span></div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-500">Quantity: {cart[p.code] || 0}</span><div className="flex gap-2"><button aria-label={`Remove one ${p.name}`} onClick={()=>add(p.code,-1)} className="rounded-lg border p-2"><Minus size={15}/></button><button aria-label={`Add one ${p.name}`} onClick={()=>add(p.code,1)} className="rounded-lg bg-emerald-900 p-2 text-white"><Plus size={15}/></button></div></div></article>)}</div></section>
      <aside id="order" className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24"><div className="flex items-center gap-2"><ShoppingCart className="text-emerald-800"/><h2 className="text-lg font-bold">Current order</h2></div><label className="block text-xs font-semibold text-slate-600 mt-4 mb-1">Customer name (optional)</label><input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Walk-in / member name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
        <div className="mt-4 divide-y divide-slate-100">{lines.map(line=><div key={line.code} className="py-3 flex justify-between gap-3 text-sm"><div><p className="font-semibold">{line.name} × {line.qty}</p><p className="text-xs text-slate-500">{peso(line.price)} each</p></div><div className="text-right font-bold">{peso(line.qty*line.price)}<button onClick={()=>add(line.code,-line.qty)} className="block ml-auto text-xs text-red-600"><Trash2 size={13}/></button></div></div>)}{!lines.length&&<p className="py-8 text-center text-sm text-slate-400">Add products to begin an order.</p>}</div>
        <div className="border-t pt-4 flex justify-between text-lg font-black"><span>Total</span><span>{peso(total)}</span></div><label className="mt-4 mb-1 block text-xs font-semibold text-slate-600">Payment method (record only)</label><select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as PaymentMethod)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="cash">Cash</option><option value="transfer">Bank / GCash Transfer</option></select><label className="mt-3 mb-1 block text-xs font-semibold text-slate-600">Transfer reference (optional)</label><input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="External transfer reference (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/><button onClick={()=>void checkout()} disabled={!lines.length||saving||productsLoading} className="mt-4 w-full rounded-xl bg-emerald-950 px-4 py-3 font-bold text-white disabled:opacity-50">{saving?'Saving order…':'Complete order'}</button>
      </aside></div>
    {receipt && <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm print:shadow-none" id="pos-receipt"><div className="flex flex-wrap justify-between gap-3"><div><CheckCircle2 className="text-emerald-700 mb-2"/><h2 className="text-xl font-black">Order recorded</h2><p className="text-sm text-slate-500">{receipt.number} · {receipt.date}</p><p className="mt-1 text-xs font-semibold uppercase text-emerald-800">Payment method recorded: {receipt.paymentMethod}</p></div><button onClick={()=>window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2 text-white print:hidden"><Printer size={16}/> Print receipt</button></div><div className="mt-4 text-sm"><p>Customer: <b>{receipt.customer}</b></p><p>Price category: <b>{receipt.type}</b></p></div><div className="mt-4 divide-y">{receipt.lines.map((l,i)=><div key={i} className="py-2 flex justify-between text-sm"><span>{l.name} × {l.qty}</span><span>{peso(l.price*l.qty)}</span></div>)}</div><div className="border-t pt-3 mt-2 flex justify-between text-lg font-black"><span>Total</span><span>{peso(receipt.total)}</span></div></section>}
    <section id="expenses" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="text-lg font-bold text-slate-900">Record an operating expense</h2><p className="text-sm text-slate-500">Expenses are sent to Admin for approval. Pending expenses do not reduce official totals.</p></div>{expenseError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{expenseError}</p>}{expenseMessage && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{expenseMessage}</p>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Description<input value={expenseDescription} onChange={e=>setExpenseDescription(e.target.value)} maxLength={500} placeholder="What was purchased or paid?" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"/></label><label className="text-xs font-semibold text-slate-600">Category<select value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"><option value="supplies">Supplies</option><option value="transport">Transport</option><option value="utilities">Utilities</option><option value="rent">Rent</option><option value="maintenance">Maintenance</option><option value="staff">Staff</option><option value="other">Other</option></select></label><label className="text-xs font-semibold text-slate-600">Amount (PHP)<input type="number" min="0.01" step="0.01" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} placeholder="0.00" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"/></label><label className="text-xs font-semibold text-slate-600 sm:col-span-2">Receipt reference (optional)<input value={expenseReceipt} onChange={e=>setExpenseReceipt(e.target.value)} placeholder="Receipt number or file reference" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"/></label></div><button onClick={()=>void submitExpense()} disabled={expenseSaving || !expenseDescription.trim() || !(Number(expenseAmount)>0)} className="mt-4 rounded-xl bg-emerald-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{expenseSaving?'Submitting…':'Submit expense for approval'}</button></section>
    <p className="text-xs text-slate-500">Amanah records the sale and the customer’s stated payment method only. Cash or transfer is handled by the external receiving party; this POS does not receive, hold, or confirm funds. This workflow does not yet update inventory, issue product codes, or calculate Unilevel commissions.</p>
  </div></div></main>;
}
