import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Period = 'daily' | 'weekly' | 'monthly';
type Sale = { id:string; order_number:string; customer_type:string; customer_name:string|null; total_amount:number; created_at:string; items:unknown; total_count:number };
type Expense = { id:string; expense_date:string; category:string; amount:number; description:string; created_at:string; created_by_name:string; created_by_member_number:string|null; total_count:number };
type ReportData = { sales:Sale[]; expenses:Expense[]; orderCount:number; salesTotal:number; from:string; to:string; generatedAt:string };
const peso=(value:number)=>new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP'}).format(value);
const dateText=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const parseLocal=(value:string)=>new Date(value+'T12:00:00');
const shiftDays=(value:string,days:number)=>{const d=parseLocal(value);d.setDate(d.getDate()+days);return dateText(d);};
const escapeXml=(value:unknown)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const escapeHtml=(value:unknown)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const spreadsheetCell=(value:unknown,type:'String'|'Number'='String')=>'<Cell><Data ss:Type="'+type+'">'+escapeXml(value)+'</Data></Cell>';
const worksheet=(name:string,rows:unknown[][])=>'<Worksheet ss:Name="'+escapeXml(name)+'"><Table>'+rows.map(row=>'<Row>'+row.map(value=>typeof value==='number'?spreadsheetCell(value,'Number'):spreadsheetCell(value)).join('')+'</Row>').join('')+'</Table></Worksheet>';

export default function AdminFinancialReports(){
  const [period,setPeriod]=useState<Period>('daily');
  const [selectedDate,setSelectedDate]=useState(dateText(new Date()));
  const [report,setReport]=useState<ReportData|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const getRange=()=>{
    if(period==='daily')return {from:selectedDate,to:selectedDate};
    if(period==='weekly'){
      const date=parseLocal(selectedDate);
      const mondayOffset=(date.getDay()+6)%7;
      const from=shiftDays(selectedDate,-mondayOffset);
      return {from,to:shiftDays(from,6)};
    }
    const date=parseLocal(selectedDate);
    const from=dateText(new Date(date.getFullYear(),date.getMonth(),1,12));
    const to=dateText(new Date(date.getFullYear(),date.getMonth()+1,0,12));
    return {from,to};
  };

  const generate=async()=>{
    if(!supabase){setError('Supabase is unavailable.');return;}
    setLoading(true);setError('');setNotice('');
    try{
      const range=getRange();
      const fromIso=new Date(range.from+'T00:00:00').toISOString();
      const toExclusive=new Date(shiftDays(range.to,1)+'T00:00:00').toISOString();
      const [summaryResult,salesFirst,expenseFirst]=await Promise.all([
        supabase.rpc('admin_get_front_desk_sales_summary',{p_from:fromIso,p_to:toExclusive}),
        supabase.rpc('admin_list_front_desk_pos_orders',{p_from:fromIso,p_to:toExclusive,p_search:null,p_limit:100,p_offset:0}),
        supabase.rpc('admin_list_front_desk_expenses',{p_from:range.from,p_to:range.to,p_search:null,p_limit:100,p_offset:0}),
      ]);
      if(summaryResult.error)throw summaryResult.error;
      if(salesFirst.error)throw salesFirst.error;
      if(expenseFirst.error)throw expenseFirst.error;
      const sales=[...((salesFirst.data||[]) as Sale[])];
      const expenses=[...((expenseFirst.data||[]) as Expense[])];
      const salesCount=Number(sales[0]?.total_count||0);
      const expenseCount=Number(expenses[0]?.total_count||0);
      for(let offset=100;offset<salesCount;offset+=100){
        const page=await supabase.rpc('admin_list_front_desk_pos_orders',{p_from:fromIso,p_to:toExclusive,p_search:null,p_limit:100,p_offset:offset});
        if(page.error)throw page.error;
        sales.push(...((page.data||[]) as Sale[]));
      }
      for(let offset=100;offset<expenseCount;offset+=100){
        const page=await supabase.rpc('admin_list_front_desk_expenses',{p_from:range.from,p_to:range.to,p_search:null,p_limit:100,p_offset:offset});
        if(page.error)throw page.error;
        expenses.push(...((page.data||[]) as Expense[]));
      }
      const summaryRow=Array.isArray(summaryResult.data)?summaryResult.data[0]:summaryResult.data;
      setReport({
        sales,expenses,orderCount:Number(summaryRow?.order_count||0),
        salesTotal:Number(summaryRow?.recorded_sales||0),from:range.from,to:range.to,
        generatedAt:new Date().toLocaleString(),
      });
      setNotice('Report generated from existing Front Desk sales and expense records.');
    }catch(e){setError(e instanceof Error?e.message:'Unable to generate the financial report.');setReport(null);}
    finally{setLoading(false);}
  };

  const expenseTotal=report?.expenses.reduce((sum,row)=>sum+Number(row.amount),0)||0;
  const categoryTotals=report?.expenses.reduce<Record<string,number>>((totals,row)=>{
    totals[row.category]=(totals[row.category]||0)+Number(row.amount);return totals;
  },{})||{};
  const reportTitle=period.charAt(0).toUpperCase()+period.slice(1)+' Sales & Accounting Report';
  const fileBase=report?('amanah-'+period+'-sales-accounting-'+report.from+'-to-'+report.to):'amanah-sales-accounting-report';

  const downloadExcel=()=>{
    if(!report)return;
    const summaryRows:unknown[][]=[
      ['AMANAH - SALES & ACCOUNTING REPORT'],['Report type',period.toUpperCase()],
      ['Period start',report.from],['Period end',report.to],['Generated',report.generatedAt],
      ['Recorded sales transactions',report.orderCount],['Recorded sales total (PHP)',report.salesTotal],
      ['Recorded expenses count',report.expenses.length],['Recorded expenses total (PHP)',expenseTotal],
      ['Sales less recorded expenses (PHP)',report.salesTotal-expenseTotal],
      [],['Expense category','Total (PHP)'],
      ...Object.entries(categoryTotals).sort(([a],[b])=>a.localeCompare(b)).map(([category,total])=>[category,total]),
    ];
    const salesRows:unknown[][]=[
      ['Order number','Date and time','Customer','Customer type','Recorded total (PHP)'],
      ...report.sales.map(row=>[row.order_number,new Date(row.created_at).toLocaleString(),row.customer_name||'Walk-in customer',row.customer_type,Number(row.total_amount)]),
    ];
    const expenseRows:unknown[][]=[
      ['Expense date','Category','Description','Front Desk staff','Member number','Amount (PHP)'],
      ...report.expenses.map(row=>[row.expense_date,row.category,row.description,row.created_by_name,row.created_by_member_number||'',Number(row.amount)]),
    ];
    const xml='<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
      worksheet('Summary',summaryRows)+worksheet('Sales',salesRows)+worksheet('Expenses',expenseRows)+'</Workbook>';
    const blob=new Blob(['\ufeff',xml],{type:'application/vnd.ms-excel;charset=utf-8'});
    const url=URL.createObjectURL(blob);const anchor=document.createElement('a');
    anchor.href=url;anchor.download=fileBase+'.xls';document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
  };

  const downloadPdf=()=>{
    if(!report)return;
    const table=(headers:string[],rows:string[][])=>'<table><thead><tr>'+headers.map(h=>'<th>'+escapeHtml(h)+'</th>').join('')+'</tr></thead><tbody>'+
      (rows.length?rows.map(row=>'<tr>'+row.map(cell=>'<td>'+escapeHtml(cell)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+headers.length+'">No records for this period.</td></tr>')+'</tbody></table>';
    const salesRows=report.sales.map(row=>[row.order_number,new Date(row.created_at).toLocaleString(),row.customer_name||'Walk-in customer',row.customer_type,peso(Number(row.total_amount))]);
    const expenseRows=report.expenses.map(row=>[row.expense_date,row.category,row.description,row.created_by_name,peso(Number(row.amount))]);
    const categoryRows=Object.entries(categoryTotals).sort(([a],[b])=>a.localeCompare(b)).map(([category,total])=>[category,peso(total)]);
    const html='<!doctype html><html><head><meta charset="utf-8"><title>'+escapeHtml(reportTitle)+'</title><style>'+
      'body{font:12px Arial,sans-serif;color:#172033;margin:28px}h1{font-size:20px;margin:0 0 6px}h2{font-size:15px;margin:24px 0 8px}.muted{color:#586477}.summary{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:18px 0}.metric{border:1px solid #ccd3dc;padding:10px}.metric b{display:block;font-size:16px;margin-top:5px}table{border-collapse:collapse;width:100%;margin:8px 0 18px;page-break-inside:auto}th,td{border:1px solid #cbd2dc;padding:6px;text-align:left;vertical-align:top}th{background:#edf1f5}tr{page-break-inside:avoid}footer{margin-top:20px;font-size:10px;color:#586477}@media print{body{margin:12mm}@page{size:landscape;margin:12mm}}</style></head><body>'+
      '<h1>AMANAH</h1><h2>'+escapeHtml(reportTitle)+'</h2><div class="muted">Period: '+escapeHtml(report.from)+' to '+escapeHtml(report.to)+' · Generated: '+escapeHtml(report.generatedAt)+'</div>'+
      '<div class="summary"><div class="metric">Recorded sales transactions<b>'+report.orderCount+'</b></div><div class="metric">Recorded sales total<b>'+escapeHtml(peso(report.salesTotal))+'</b></div><div class="metric">Recorded expenses<b>'+report.expenses.length+'</b></div><div class="metric">Recorded expenses total<b>'+escapeHtml(peso(expenseTotal))+'</b></div><div class="metric">Sales less recorded expenses<b>'+escapeHtml(peso(report.salesTotal-expenseTotal))+'</b></div></div>'+
      '<h2>Expense breakdown</h2>'+table(['Category','Total'],categoryRows)+
      '<h2>Sales transactions</h2>'+table(['Order','Date & time','Customer','Customer type','Recorded total'],salesRows)+
      '<h2>Expense transactions</h2>'+table(['Date','Category','Description','Front Desk staff','Amount'],expenseRows)+
      '<footer>Figures reflect recorded Front Desk POS orders and recorded expenses only. Sales less expenses is not necessarily accounting profit and does not confirm funds received or settled.</footer>'+
      '<script>window.onload=function(){window.focus();window.print();};</script></body></html>';
    const printWindow=window.open('','_blank');
    if(!printWindow){setError('Please allow pop-ups to open the PDF print view, then choose Save as PDF.');return;}
    printWindow.document.open();printWindow.document.write(html);printWindow.document.close();
  };

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-black text-slate-900">Daily, Weekly & Monthly Reports</h3><p className="mt-1 text-sm text-slate-600">Generate a report of recorded POS sales and Front Desk expenses, then export it for your records.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">Admin reports</span></div>
    <div className="flex flex-wrap gap-2">{(['daily','weekly','monthly'] as Period[]).map(value=><button key={value} type="button" onClick={()=>{setPeriod(value);setReport(null);setNotice('');}} className={'rounded-xl px-4 py-2.5 text-sm font-bold capitalize '+(period===value?'bg-emerald-950 text-white':'border border-slate-200 bg-white text-slate-700')}>{value}</button>)}</div>
    <div className="flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-slate-600">Choose a date<input type="date" value={selectedDate} onChange={e=>{setSelectedDate(e.target.value);setReport(null);}} className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"/></label>
      <div className="text-xs text-slate-500">{period==='daily'?'Report for the selected day':period==='weekly'?'Week runs Monday through Sunday':'Full calendar month containing the selected date'}</div>
      <button type="button" onClick={()=>void generate()} disabled={loading||!selectedDate} className="inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><RefreshCw size={15} className={loading?'animate-spin':''}/>{loading?'Generating…':'Generate report'}</button>
    </div>
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</div>}
    {report&&<div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-black text-slate-900">{reportTitle}</h4><p className="text-xs text-slate-500">{report.from} to {report.to} · Generated {report.generatedAt}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"><FileText size={15}/> Print / Save PDF</button><button type="button" onClick={downloadExcel} className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-3 py-2 text-sm font-bold text-white"><FileSpreadsheet size={15}/> Download Excel</button></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Sales transactions</p><p className="mt-1 text-xl font-black">{report.orderCount.toLocaleString()}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Recorded sales</p><p className="mt-1 text-xl font-black">{peso(report.salesTotal)}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Expense transactions</p><p className="mt-1 text-xl font-black">{report.expenses.length.toLocaleString()}</p></div>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Recorded expenses</p><p className="mt-1 text-xl font-black">{peso(expenseTotal)}</p></div>
        <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-800">Sales less recorded expenses</p><p className="mt-1 text-xl font-black text-emerald-950">{peso(report.salesTotal-expenseTotal)}</p></div>
      </div>
      <div><h5 className="mb-2 text-sm font-bold">Expense breakdown</h5><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{Object.entries(categoryTotals).sort(([a],[b])=>a.localeCompare(b)).map(([category,total])=><tr key={category}><td className="px-3 py-2 capitalize">{category}</td><td className="px-3 py-2 text-right font-semibold">{peso(total)}</td></tr>)}{Object.keys(categoryTotals).length===0&&<tr><td colSpan={2} className="px-3 py-4 text-center text-slate-500">No expenses recorded for this period.</td></tr>}</tbody></table></div></div>
      <p className="text-xs text-slate-500">Reports use existing records only. Sales less recorded expenses is not necessarily accounting profit and does not confirm funds received or settled.</p>
    </div>}
  </section>;
}
