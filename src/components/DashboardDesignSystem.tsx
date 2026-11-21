import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const slides = [
  { title: 'Everyday wellness, thoughtfully curated', subtitle: 'Explore the AMANAH product collection and discover products for your daily routine.', image: 'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_erqnc3erqnc3erqn.jpg', action: 'View products', target: '#dashboard-content' },
  { title: 'Build with purpose. Grow with AMANAH.', subtitle: 'Your dashboard brings your account, network activity, and business tools together.', image: 'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_jybv4xjybv4xjybv.jpg', action: 'Explore dashboard', target: '#dashboard-content' },
  { title: 'A trusted partner in your journey', subtitle: 'Keep track of your progress and stay connected to your AMANAH business.', image: 'https://przfagsgcnesnbjcrksd.supabase.co/storage/v1/object/public/product%20image/product%20images/Gemini_Generated_Image_s9qnxps9qnxps9qn.jpg', action: 'View activity', target: '#dashboard-content' },
];

export function DashboardProductHero() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, []);
  const slide = slides[active];
  const move = (delta: number) => setActive((value) => (value + delta + slides.length) % slides.length);
  return <section className="amanah-hero relative isolate overflow-hidden rounded-[1.6rem] bg-emerald-950 text-white shadow-lg" aria-label="Featured AMANAH products">
    <img src={slide.image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-25" />
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-950 via-emerald-950/90 to-emerald-900/35" />
    <div className="flex min-h-[210px] flex-col justify-between gap-6 p-6 sm:min-h-[235px] sm:p-9 md:flex-row md:items-end">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[.18em] text-amber-200"><Sparkles size={13}/> AMANAH highlights</span>
        <h2 className="mt-4 max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{slide.title}</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-emerald-50/85">{slide.subtitle}</p>
        <a href={slide.target} className="mt-5 inline-flex items-center rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-emerald-950 shadow-sm transition hover:bg-amber-200">{slide.action}</a>
      </div>
      <div className="flex items-center gap-2 self-end">
        <button type="button" onClick={() => move(-1)} aria-label="Previous banner" className="rounded-full border border-white/25 bg-white/10 p-2.5 hover:bg-white/20"><ChevronLeft size={18}/></button>
        {slides.map((item, index) => <button key={item.title} type="button" onClick={() => setActive(index)} aria-label={`Show banner ${index + 1}`} className={`h-2 rounded-full transition-all ${active === index ? 'w-7 bg-amber-300' : 'w-2 bg-white/50'}`}/>)}
        <button type="button" onClick={() => move(1)} aria-label="Next banner" className="rounded-full border border-white/25 bg-white/10 p-2.5 hover:bg-white/20"><ChevronRight size={18}/></button>
      </div>
    </div>
  </section>;
}

export function DashboardSidebar({ role, onSignOut }: { role: string; onSignOut: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const links = role === 'Front Desk'
    ? [
        { label: 'Overview', href: '#dashboard-content' },
        { label: 'Products', href: '#products' },
        { label: 'Current order', href: '#order' },
        { label: 'Expenses', href: '#expenses' },
      ]
    : [
        { label: 'Overview', href: '#dashboard-content' },
        { label: 'Account', href: '#account' },
        { label: 'Network', href: '#network' },
        { label: 'Commissions', href: '#commission-history' },
        { label: 'Withdrawals', href: '#withdrawals' },
      ];
  return <><nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">{links.map((link)=><a key={link.href} href={link.href} className="shrink-0 rounded-xl border border-emerald-900/10 bg-white px-3 py-2 text-xs font-semibold text-emerald-950 shadow-sm">{link.label}</a>)}</nav><aside className="amanah-sidebar hidden w-60 shrink-0 flex-col rounded-[1.5rem] bg-emerald-950 p-4 text-white shadow-lg lg:flex">
    <div className="border-b border-white/10 px-2 pb-5"><p className="text-lg font-black tracking-[.16em]">AMANAH</p><p className="mt-1 text-[10px] uppercase tracking-[.2em] text-emerald-200/70">Premium workspace</p></div>
    <button onClick={() => setExpanded(!expanded)} className="mt-5 flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-emerald-200 hover:bg-white/10"><span>{role.replaceAll('_',' ')} menu</span><span>{expanded ? '−' : '+'}</span></button>
    {expanded && <nav className="mt-2 space-y-1">{links.map((link,index)=><a key={link.href} href={link.href} className="block rounded-xl px-3 py-3 text-sm text-emerald-50/85 transition hover:bg-white/10 hover:text-white">{link.label}</a>)}</nav>}
    <div className="mt-auto pt-6"><button onClick={onSignOut} className="w-full rounded-xl border border-amber-200/30 px-3 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-200/10">Sign out</button></div>
  </aside></>;
}
