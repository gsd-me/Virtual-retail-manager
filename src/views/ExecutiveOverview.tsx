import React, { useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertTriangle,
  Calendar,
  FileDown,
  Store,
  ChevronRight,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChainMetrics,
  StoreAggregated,
  DailyStoreSalesRecord,
  AlertItem,
} from '../types/retail';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  computeDayOfWeekAnalysis,
} from '../utils/calculations';
import { exportBriefToPdf } from '../utils/exportUtils';
import { PredictiveSalesForecast } from '../components/PredictiveSalesForecast';

interface ExecutiveOverviewProps {
  chainMetrics: ChainMetrics;
  stores: StoreAggregated[];
  dailySales: DailyStoreSalesRecord[];
  alerts: AlertItem[];
  lang: 'ar' | 'en';
  onSelectStore: (storeName: string) => void;
  onOpenAdvisor: () => void;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  chainMetrics,
  stores,
  dailySales,
  alerts,
  lang,
  onSelectStore,
  onOpenAdvisor,
}) => {
  const [briefType, setBriefType] = useState<'monthly' | 'daily'>('monthly');
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [briefData, setBriefData] = useState<any>(null);
  const [briefError, setBriefError] = useState<string | null>(null);

  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [copied, setCopied] = useState(false);

  // Compute daily aggregated trend
  const dailyMap = new Map<string, { date: string; sales: number; units: number; trx: number }>();
  dailySales.forEach(d => {
    if (!dailyMap.has(d.dateStr)) {
      dailyMap.set(d.dateStr, { date: d.dateStr, sales: 0, units: 0, trx: 0 });
    }
    const entry = dailyMap.get(d.dateStr)!;
    entry.sales += d.extPrice;
    entry.units += d.soldQty;
    entry.trx += d.trx;
  });

  const dailyTrend = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Day of week analysis
  const dayOfWeekData = computeDayOfWeekAnalysis(dailySales, lang);

  // H1 vs H2 daily run rate
  const h1Days = dailyTrend.filter(d => parseInt(d.date.split('-')[2] || '0', 10) <= 15);
  const h2Days = dailyTrend.filter(d => parseInt(d.date.split('-')[2] || '0', 10) > 15);
  const h1AvgDaily = h1Days.length > 0 ? Math.round(h1Days.reduce((s, d) => s + d.sales, 0) / h1Days.length) : 0;
  const h2AvgDaily = h2Days.length > 0 ? Math.round(h2Days.reduce((s, d) => s + d.sales, 0) / h2Days.length) : 0;
  const h2h1Change = h1AvgDaily > 0 ? Number((((h2AvgDaily - h1AvgDaily) / h1AvgDaily) * 100).toFixed(1)) : 0;

  // Top 5 and Bottom 5 stores
  const includedStores = [...stores].filter(s => !s.isExcluded).sort((a, b) => b.totalSales - a.totalSales);
  const top5 = includedStores.slice(0, 5);
  const bottom5 = [...includedStores].reverse().slice(0, 5);

  // Filter alerts
  const filteredAlerts = alerts.filter(a => {
    if (alertFilter === 'all') return true;
    return a.type === alertFilter;
  });

  // Call Gemini for Executive Brief
  const handleGenerateBrief = async (type: 'monthly' | 'daily') => {
    setBriefType(type);
    setIsGeneratingBrief(true);
    setBriefError(null);
    setBriefModalOpen(true);

    try {
      const payload = {
        periodType: type,
        aggregatedData: {
          chainMetrics,
          h1AvgDaily,
          h2AvgDaily,
          h2h1ChangePercent: h2h1Change,
          topStores: top5.map(s => ({ name: s.name, sales: s.totalSales, share: s.salesSharePercent })),
          bottomStores: bottom5.map(s => ({ name: s.name, sales: s.totalSales, share: s.salesSharePercent })),
          storesWithHighUnattributed: stores.filter(s => s.unattributedSalesPercent > 10).map(s => ({
            name: s.name,
            unattributedPct: s.unattributedSalesPercent,
            unattributedAmount: s.unattributedAmount,
          })),
        },
        alerts: alerts.slice(0, 8),
      };

      const res = await fetch('/api/gemini/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setBriefData(data);
    } catch (err: any) {
      console.error(err);
      setBriefError(err.message || 'حدث خطأ أثناء إعداد التقرير التنفيذي');
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & AI Brief Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              {lang === 'ar' ? 'لوحة القيادة التنفيذية والمؤشرات الكلية' : 'Executive Overview & Chain KPIs'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'تحليل أداء 27 فرعاً في مصر (مولات، محافظات، أوتلت شبرا، متجر إلكتروني) لشهر أغسطس 2026'
              : 'Performance analytics for 27 retail outlets across Egypt (August 2026)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleGenerateBrief('monthly')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'ar' ? 'التقرير التنفيذي الذكي (الشهري)' : 'Smart Monthly Executive Brief'}</span>
          </button>
          <button
            onClick={() => handleGenerateBrief('daily')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'ar' ? 'التقرير اليومي' : 'Daily Brief'}</span>
          </button>
        </div>
      </div>

      {/* 6 Critical KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Net Sales */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{lang === 'ar' ? 'صافي المبيعات' : 'Net Sales'}</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg lg:text-xl font-extrabold text-white">
            {formatCurrency(chainMetrics.totalSales, 'EGP', lang)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3 h-3" />
            <span>{lang === 'ar' ? 'السلسلة بالكامل' : 'Chain Total'}</span>
          </div>
        </div>

        {/* Sold Units */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{lang === 'ar' ? 'القطع المباعة' : 'Units Sold'}</span>
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg lg:text-xl font-extrabold text-white">
            {formatNumber(chainMetrics.totalUnits, lang)}{' '}
            <span className="text-xs font-normal text-slate-400">{lang === 'ar' ? 'قطعة' : 'pcs'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stores.length} {lang === 'ar' ? 'فرعاً نشطاً' : 'active stores'}
          </div>
        </div>

        {/* Transactions */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{lang === 'ar' ? 'عدد الفواتير (TRX)' : 'Transactions (TRX)'}</span>
            <Receipt className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg lg:text-xl font-extrabold text-white">
            {formatNumber(chainMetrics.totalTrx, lang)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {lang === 'ar' ? 'معادلة TRX = المبيعات ÷ ATV' : 'TRX = Sales ÷ ATV'}
          </div>
        </div>

        {/* Weighted ATV */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{lang === 'ar' ? 'متوسط الفاتورة (ATV)' : 'Average TRX Value (ATV)'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg lg:text-xl font-extrabold text-amber-400">
            {formatCurrency(chainMetrics.weightedAtv, 'EGP', lang)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {lang === 'ar' ? 'محسوب ترجيحياً: Σالمبيعات ÷ ΣTRX' : 'Weighted Σsales ÷ ΣTRX'}
          </div>
        </div>

        {/* Weighted UPT */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{lang === 'ar' ? 'سلة العميل (UPT)' : 'Units / TRX (UPT)'}</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg lg:text-xl font-extrabold text-purple-300">
            {chainMetrics.weightedUpt}{' '}
            <span className="text-xs font-normal text-slate-400">{lang === 'ar' ? 'قطعة/فاتورة' : 'units/trx'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {lang === 'ar' ? 'محسوب ترجيحياً: Σالقطع ÷ ΣTRX' : 'Weighted Σqty ÷ ΣTRX'}
          </div>
        </div>

        {/* Weighted UTV */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-semibold">{lang === 'ar' ? 'متوسط سعر القطعة (UTV)' : 'Unit Value (UTV)'}</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg lg:text-xl font-extrabold text-rose-300">
            {formatCurrency(chainMetrics.weightedUtv, 'EGP', lang)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {lang === 'ar' ? 'محسوب ترجيحياً: Σالمبيعات ÷ Σالقطع' : 'Weighted Σsales ÷ Σqty'}
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Trend Chart (Span 2) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{lang === 'ar' ? 'منحنى المبيعات اليومية عبر أيام الشهر' : 'Daily Sales Trend'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'تتبع الإيرادات وحجم الحركة مع تمييز عطلات نهاية الأسبوع' : 'Daily revenue tracking with weekend surges'}
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {dailyTrend.length} {lang === 'ar' ? 'يوماً مسجلاً' : 'days'}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tickFormatter={str => str.split('-')[2]}
                  stroke="#94a3b8"
                  fontSize={11}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={val => `${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any) => [formatCurrency(Number(value), 'EGP', lang), lang === 'ar' ? 'المبيعات' : 'Sales']}
                  labelFormatter={label => `${lang === 'ar' ? 'التاريخ:' : 'Date:'} ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* H1 vs H2 Run Rate Summary Bar */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">
                {lang === 'ar' ? 'النصف الأول (H1: 1-15): معدل يومي' : 'H1 Daily Run-Rate (1-15)'}
              </span>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {formatCurrency(h1AvgDaily, 'EGP', lang)} / {lang === 'ar' ? 'يوم' : 'day'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  {lang === 'ar' ? 'النصف الثاني (H2: 16-31): معدل يومي' : 'H2 Daily Run-Rate (16-31)'}
                </span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    h2h1Change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {formatPercent(h2h1Change, lang)}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {formatCurrency(h2AvgDaily, 'EGP', lang)} / {lang === 'ar' ? 'يوم' : 'day'}
              </div>
            </div>
          </div>
        </div>

        {/* Normalized Day-of-Week Chart */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ar' ? 'المبيعات حسب أيام الأسبوع (منسوبة)' : 'Day-of-Week Normalized'}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'متوسط المبيعات لكل يوم مقسوماً على عدد مرات تكراره في الشهر' : 'Total sales normalized per weekday occurrences'}
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={val => `${Math.round(val / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any, item: any) => [
                    `${formatCurrency(Number(value), 'EGP', lang)} (${item.payload.occurrences} ${lang === 'ar' ? 'أيام' : 'occurrences'})`,
                    lang === 'ar' ? 'المعدل المنسوب' : 'Normalized Avg',
                  ]}
                />
                <Bar dataKey="normalizedAvg" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-slate-400 text-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            {lang === 'ar'
              ? 'يوم الجمعة والسبت يسجلان ذروة حركة الشراء في مصر (أعلى بنسبة +65%)'
              : 'Friday & Saturday represent weekend peak shopping in Egypt (+65%)'}
          </div>
        </div>
      </div>

      {/* 30-Day Predictive Sales Forecast Visualization */}
      <PredictiveSalesForecast dailySales={dailySales} lang={lang} />

      {/* Top 5 / Bottom 5 Stores & Rule-Based Alert Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Stores */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" />
              <span>{lang === 'ar' ? 'أعلى 5 فروع مبيعاً' : 'Top 5 Stores'}</span>
            </h3>
            <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'الحصة من مبيعات السلسلة' : 'Share %'}</span>
          </div>

          <div className="space-y-2">
            {top5.map((s, idx) => (
              <div
                key={s.name}
                onClick={() => onSelectStore(s.name)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                      {s.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {s.segment} • UPT: {s.weightedUpt}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-slate-200">
                    {formatCurrency(s.totalSales, 'EGP', lang)}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold">
                    {s.salesSharePercent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 5 Stores */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4" />
              <span>{lang === 'ar' ? 'أقل 5 فروع مبيعاً' : 'Bottom 5 Stores'}</span>
            </h3>
            <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'الحصة من السلسلة' : 'Share %'}</span>
          </div>

          <div className="space-y-2">
            {bottom5.map((s, idx) => (
              <div
                key={s.name}
                onClick={() => onSelectStore(s.name)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-rose-500/10 text-rose-400 text-xs font-bold flex items-center justify-center">
                    {stores.length - idx}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
                      {s.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {s.segment} • H2/H1: {s.h2h1ChangePercent}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-extrabold text-slate-200">
                    {formatCurrency(s.totalSales, 'EGP', lang)}
                  </div>
                  <div className="text-[10px] text-rose-400 font-semibold">
                    {s.salesSharePercent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rule-Based Alert Feed */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{lang === 'ar' ? 'مركز التنبيهات التشغيلية' : 'Operational Alerts'}</span>
            </h3>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setAlertFilter('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  alertFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
              >
                {lang === 'ar' ? 'الكل' : 'All'}
              </button>
              <button
                onClick={() => setAlertFilter('critical')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  alertFilter === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400'
                }`}
              >
                {lang === 'ar' ? 'حرج' : 'Critical'}
              </button>
              <button
                onClick={() => setAlertFilter('warning')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  alertFilter === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'
                }`}
              >
                {lang === 'ar' ? 'تحذير' : 'Warning'}
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                {lang === 'ar' ? 'لا توجد تنبيهات في هذا التصنيف' : 'No alerts in this category'}
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    alert.type === 'critical'
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${alert.type === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      {lang === 'ar' ? alert.titleAr : alert.titleEn}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-700 font-mono">
                      {alert.metricValue}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {lang === 'ar' ? alert.descriptionAr : alert.descriptionEn}
                  </p>

                  <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">
                      {lang === 'ar' ? 'الإجراء المقترح:' : 'Recommended Action:'}
                    </span>
                    <span className="font-semibold text-amber-300">
                      {alert.actionAr}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Brief Modal Dialog */}
      {briefModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-amber-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {lang === 'ar'
                      ? `التقرير التنفيذي الذكي (${briefType === 'monthly' ? 'الشهري' : 'اليومي'})`
                      : `Executive AI Brief (${briefType.toUpperCase()})`}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'مبني حصرياً على الأرقام الدقيقة المعتمدة بلهجة بيزنس مصرية مباشرة'
                      : 'Egyptian retail business insights generated from confirmed chain aggregates'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Period Selector Toggle */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => handleGenerateBrief('monthly')}
                    className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                      briefType === 'monthly'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'الشهري' : 'Monthly'}
                  </button>
                  <button
                    onClick={() => handleGenerateBrief('daily')}
                    className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                      briefType === 'daily'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'اليومي' : 'Daily'}
                  </button>
                </div>

                {briefData && (
                  <>
                    <button
                      onClick={() => {
                        const briefText = `*${lang === 'ar' ? 'التقرير التنفيذي الذكي لسلسلة المتاجر' : 'Retail Command Center Executive Brief'} (${briefType === 'monthly' ? 'الشهري' : 'اليومي'})*\n\n` +
                          `📌 *${lang === 'ar' ? 'الملخص التنفيذي' : 'Executive Summary'}:*\n${briefData.summary}\n\n` +
                          `✅ *${lang === 'ar' ? 'نقاط القوة والإنجازات' : 'What Went Well'}:*\n${(briefData.whatWentWell || []).map((w: string) => `• ${w}`).join('\n')}\n\n` +
                          `⚠️ *${lang === 'ar' ? 'المشاكل والقصور' : 'Critical Problems'}:*\n${(briefData.problems || []).map((p: string) => `• ${p}`).join('\n')}\n\n` +
                          `🔮 *${lang === 'ar' ? 'الانحرافات والظواهر' : 'Anomalies'}:*\n${(briefData.anomalies || []).map((a: string) => `• ${a}`).join('\n')}\n\n` +
                          `🎯 *${lang === 'ar' ? 'الإجراءات التنفيذية' : 'Action Plan'}:*\n${(briefData.actions || []).map((act: any) => `• [${act.priority}] ${act.action} (${act.owner}) -> ${act.expectedImpact}`).join('\n')}`;

                        navigator.clipboard.writeText(briefText);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                      title={lang === 'ar' ? 'نسخ التقرير إلى الحافظة' : 'Copy brief to clipboard'}
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copied ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
                    </button>

                    <button
                      onClick={() => handleGenerateBrief(briefType)}
                      disabled={isGeneratingBrief}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                      title={lang === 'ar' ? 'إعادة التوليد' : 'Regenerate'}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBrief ? 'animate-spin text-amber-400' : ''}`} />
                    </button>

                    <button
                      onClick={() =>
                        exportBriefToPdf({
                          title: `Retail Command Center Executive Brief (${briefType})`,
                          date: new Date().toLocaleDateString('ar-EG'),
                          summary: briefData.summary,
                          whatWentWell: briefData.whatWentWell,
                          problems: briefData.problems,
                          anomalies: briefData.anomalies,
                          actions: briefData.actions,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors"
                    >
                      <FileDown className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'ar' ? 'تصدير PDF' : 'Export PDF'}</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setBriefModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isGeneratingBrief ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-bold text-slate-200">
                    {lang === 'ar'
                      ? 'جاري صياغة التقرير التنفيذي وتحليل مبيعات الـ 27 فرعاً...'
                      : 'Analyzing chain aggregates and generating executive brief...'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'يتم تطبيق منطق التشخيص الإداري وحساب فجوات UPT و ATV'
                      : 'Synthesizing UPT/ATV deviations and action directives'}
                  </p>
                </div>
              ) : briefError ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تعذر إعداد التقرير' : 'Generation Failed'}</span>
                  </div>
                  <p>{briefError}</p>
                </div>
              ) : briefData ? (
                <div className="space-y-6 text-xs">
                  {/* Summary Card */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed text-sm">
                    <div className="font-bold text-amber-400 mb-1.5 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'الملخص التنفيذي' : 'Executive Summary'}</span>
                    </div>
                    {briefData.summary}
                  </div>

                  {/* Two Columns: What went well & Problems */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Wins */}
                    <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                        <CheckCircle className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'نقاط القوة والإنجازات البارزة' : 'What Went Well'}</span>
                      </div>
                      <ul className="space-y-1.5 text-slate-300">
                        {briefData.whatWentWell?.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Problems */}
                    <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2.5">
                      <div className="font-bold text-rose-400 flex items-center gap-1.5 text-xs">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'المشاكل الحرجة والقصور' : 'Critical Problems & Gaps'}</span>
                      </div>
                      <ul className="space-y-1.5 text-slate-300">
                        {briefData.problems?.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-rose-400 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Anomalies */}
                  {briefData.anomalies && briefData.anomalies.length > 0 && (
                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                      <div className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                        <Layers className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'الظواهر غير الطبيعية والانحرافات' : 'Anomalies & Deviations'}</span>
                      </div>
                      <ul className="space-y-1.5 text-slate-300">
                        {briefData.anomalies.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-purple-400 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Priority Action Items */}
                  {briefData.actions && briefData.actions.length > 0 && (
                    <div className="space-y-3">
                      <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                        <ArrowUpRight className="w-4 h-4 text-amber-400" />
                        <span>{lang === 'ar' ? 'الإجراءات التنفيذية ذات الأولوية' : 'Priority Action Items'}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {briefData.actions.map((act: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  act.priority === 'High'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                }`}>
                                  {act.priority}
                                </span>
                                <span className="text-[11px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  {lang === 'ar' ? 'المسؤول:' : 'Owner:'} {act.owner}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-200">{act.action}</p>
                            </div>

                            {act.expectedImpact && (
                              <div className="text-right sm:max-w-xs shrink-0 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                                <div className="text-[10px] text-slate-400 font-medium">
                                  {lang === 'ar' ? 'الأثر المتوقع:' : 'Expected Impact:'}
                                </div>
                                <div className="text-xs font-bold text-emerald-400">
                                  {act.expectedImpact}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
