import React, { useMemo, useState } from 'react';
import { LogOut, Plus, Minus, Trash2, Printer, ShoppingCart, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductCodeIssuance } from './ProductCodePanels';
import FrontDeskExpenses from './FrontDeskExpenses';

type Profile = { id: string; member_number: string; full_name: string; role: string; account_status: string };
type CustomerType = 'walk_in' | 'distributor' | 'mobile_stockist' | 'branch_operator' | 'manager';
type FrontDeskSection = 'pos' | 'codes' | 'expenses';
type Product = { code: string; name: string; prices: Record<CustomerType, number> };

const SECTIONS: { id: FrontDeskSection; label: string; description: string }[] = [
  { id: 'pos', label: 'Point of Sale', description: 'Products, customer pricing, current order and receipt' },
  { id: 'codes', label: 'Product Code Issuance', description: 'Generate and view newly issued product codes' },
  { id: 'expenses', label: 'Expenses', description: 'Record expenses and review expense history' },
];
const TYPES: { id: CustomerType; label: string }[] = [
  { id: 'walk_in', label: 'Walk-in' }, { id: 'distributor', label: 'Distributor' },
  { id: 'mobile_stockist', label: 'Mobile Stockist' }, { id: 'branch_operator', label: 'Branch Operator' },
  { id: 'manager', label: 'Manager' },
];
const PRODUCTS: Product[] = [
  { code: 'spirulina', name: 'Spirulina', prices: { walk_in:350, distributor:304, mobile_stockist:273, branch_operator:227, manager:196 } },
  { code: 'serpentina', name: 'Serpentina', prices: { walk_in:600, distributor:522, mobile_stockist:460, branch_operator:390, manager:336 } },
  { code: 'glutagen_cee', name: 'Glutagen Cee', prices: { walk_in:600, distributor:522, mobile_stockist:460, branch_operator:390, manager:336 } },
  { code: 'max_c_pro', name: 'Max C Pro', prices: { walk_in:1000, distributor:870, mobile_stockist:800, branch_operator:710, manager:620 } },
  { code: 'baskug_coffee', name: 'Baskug', prices: { walk_in:450, distributor:391, mobile_stockist:355, branch_operator:317, manager:279 } },
  { code: 'barakah_coffee', name: 'Barakah', prices: { walk_in:450, distributor:391, mobile_stockist:355, branch_operator:317, manager:279 } },
  { code: 'herbal_oil', name: 'Herbal Oil', prices: { walk_in:180, distributor:156, mobile_stockist:140, branch_operator:125, manager:110 } },
  { code: 'herbal_rub', name: 'Herbal Rub', prices: { walk_in:125, distributor:108, mobile_stockist:110, branch_operator:90, manager:77 } },
];
const peso = (n: number) => new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' }).format(n);

export default function FrontDeskDashboard({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const [activeSection, setActiveSection] = useState<FrontDeskSection>('pos');
  const [type, setType] = useState<CustomerType>('walk_in');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ number: string; total: number; lines: {name:string;qty:number;price:number}[]; customer:string; type:string; date:string } | null>(null);
  const lines = useMemo(() => PRODUCTS.filter(p => (cart[p.code] || 0) > 0).map(p => ({ name:p.name, code:p.code, qty:cart[p.code], price:p.prices[type] })), [cart,type]);
  const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const add = (code: string, delta: number) => setCart(current => ({ ...current, [code]: Math.max(0, (current[code] || 0) + delta) }));

  const checkout = async () => {
    if (!supabase || !lines.length) return;
    setSaving(true); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('front_desk_create_pos_order', {
        p_customer_type: type,
        p_customer_name: customer.trim() || null,
        p_items: lines.map(line => ({ product_code: line.code, quantity: line.qty })),
      });
      if (rpcError) throw rpcError;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.order_number) throw new Error('The order was not confirmed by the server.');
      setReceipt({
        number: row.order_number,
        total: Number(row.total_amount),
        lines: lines.map(({name,qty,price}) => ({name,qty,price})),
        customer: customer.trim() || 'Walk-in customer',
        type: TYPES.find(t=>t.id===type)?.label || type,
        date: new Date().toLocaleString(),
      });
      setCart({});
      setCustomer('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save order.');
    } finally {
      setSaving(false);
    }
  };

  const active = SECTIONS.find(section => section.id === activeSection)!;

  return (
    <main className="amanah-dashboard min-h-screen bg-slate-100 pt-20">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 lg:flex-row">
        <aside className="hidden w-64 shrink-0 flex-col rounded-[1.5rem] bg-emerald-950 p-4 text-white shadow-lg lg:flex">
          <div className="border-b border-white/10 px-2 pb-5">
            <p className="text-lg font-black tracking-[.16em]">AMANAH</p>
            <p className="mt-1 text-[10px] uppercase tracking-[.2em] text-emerald-200/70">Front Desk Workspace</p>
          </div>
          <nav aria-label="Front Desk sections" className="mt-5 space-y-2">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                type="button"
                onClick={() => { setActiveSection(section.id); setError(''); }}
                aria-current={activeSection === section.id ? 'page' : undefined}
                className={`w-full rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activeSection === section.id ? 'bg-white text-emerald-950 shadow-sm' : 'text-emerald-50/85 hover:bg-white/10 hover:text-white'}`}
              >
                {section.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto border-t border-white/10 pt-5">
            <p className="px-2 text-xs text-emerald-100/70">{profile.full_name}</p>
            <p className="px-2 pt-1 text-[11px] text-emerald-200/50">{profile.member_number}</p>
            <button onClick={onSignOut} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200/30 px-3 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-200/10">
              <LogOut size={16}/> Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">AMANAH • Front Desk</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">{active.label}</h1>
              <p className="mt-1 text-sm text-slate-500">{active.description}</p>
            </div>
            <button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-3 text-sm font-semibold text-white lg:hidden">
              <LogOut size={16}/> Sign out
            </button>
          </header>

          <nav aria-label="Front Desk sections" className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:hidden">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                type="button"
                onClick={() => { setActiveSection(section.id); setError(''); }}
                aria-current={activeSection === section.id ? 'page' : undefined}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${activeSection === section.id ? 'border-emerald-950 bg-emerald-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
              >
                {section.label}
              </button>
            ))}
          </nav>

          {activeSection === 'pos' && (
            <section className="space-y-5" aria-label="Point of Sale">
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mr-2 inline" size={16}/>{error}</div>}
              <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <section className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-3 font-bold">Select customer price category</h2>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      {TYPES.map(t => (
                        <button key={t.id} onClick={() => setType(t.id)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${type===t.id?'border-emerald-950 bg-emerald-950 text-white':'border-slate-200 bg-white text-slate-700 hover:border-emerald-700'}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Walk-in = SRP. Manager = Marketing Officer pricing.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {PRODUCTS.map(product => (
                      <article key={product.code} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex justify-between gap-2">
                          <div><h3 className="font-bold text-slate-900">{product.name}</h3><p className="text-xs text-slate-400">{product.code}</p></div>
                          <span className="font-extrabold text-emerald-900">{peso(product.prices[type])}</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-slate-500">Quantity: {cart[product.code] || 0}</span>
                          <div className="flex gap-2">
                            <button aria-label={`Remove one ${product.name}`} onClick={() => add(product.code,-1)} className="rounded-lg border p-2"><Minus size={15}/></button>
                            <button aria-label={`Add one ${product.name}`} onClick={() => add(product.code,1)} className="rounded-lg bg-emerald-900 p-2 text-white"><Plus size={15}/></button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24">
                  <div className="flex items-center gap-2"><ShoppingCart className="text-emerald-800"/><h2 className="text-lg font-bold">Current order</h2></div>
                  <label className="mb-1 mt-4 block text-xs font-semibold text-slate-600">Customer name (optional)</label>
                  <input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Walk-in / member name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
                  <div className="mt-4 divide-y divide-slate-100">
                    {lines.map(line => (
                      <div key={line.code} className="flex justify-between gap-3 py-3 text-sm">
                        <div><p className="font-semibold">{line.name} × {line.qty}</p><p className="text-xs text-slate-500">{peso(line.price)} each</p></div>
                        <div className="text-right font-bold">{peso(line.qty*line.price)}<button onClick={()=>add(line.code,-line.qty)} className="ml-auto block text-xs text-red-600"><Trash2 size={13}/></button></div>
                      </div>
                    ))}
                    {!lines.length && <p className="py-8 text-center text-sm text-slate-400">Add products to begin an order.</p>}
                  </div>
                  <div className="flex justify-between border-t pt-4 text-lg font-black"><span>Total</span><span>{peso(total)}</span></div>
                  <button onClick={() => void checkout()} disabled={!lines.length||saving} className="mt-4 w-full rounded-xl bg-emerald-950 px-4 py-3 font-bold text-white disabled:opacity-50">
                    {saving?'Saving order…':'Complete order'}
                  </button>
                </aside>
              </div>

              {receipt && (
                <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm print:shadow-none" id="pos-receipt">
                  <div className="flex flex-wrap justify-between gap-3">
                    <div><CheckCircle2 className="mb-2 text-emerald-700"/><h2 className="text-xl font-black">Order recorded</h2><p className="text-sm text-slate-500">{receipt.number} · {receipt.date}</p></div>
                    <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2 text-white print:hidden"><Printer size={16}/> Print receipt</button>
                  </div>
                  <div className="mt-4 text-sm"><p>Customer: <b>{receipt.customer}</b></p><p>Price category: <b>{receipt.type}</b></p></div>
                  <div className="mt-4 divide-y">{receipt.lines.map((line,index)=><div key={index} className="flex justify-between py-2 text-sm"><span>{line.name} × {line.qty}</span><span>{peso(line.price*line.qty)}</span></div>)}</div>
                  <div className="mt-2 flex justify-between border-t pt-3 text-lg font-black"><span>Total</span><span>{peso(receipt.total)}</span></div>
                </section>
              )}
              <p className="text-xs text-slate-500">This records order details and a price snapshot. It does not process payments, change inventory, issue product codes, or calculate Unilevel commissions.</p>
            </section>
          )}

          {activeSection === 'codes' && (
            <section aria-label="Product Code Issuance" className="space-y-4">
              <ProductCodeIssuance />
            </section>
          )}

          {activeSection === 'expenses' && (
            <section aria-label="Expenses" className="space-y-4">
              <FrontDeskExpenses />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
