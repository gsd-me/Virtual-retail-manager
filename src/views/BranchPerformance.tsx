import React, { useState } from 'react';
import {
  Store,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  Sparkles,
  X,
  TrendingUp,
  Users,
  Layers,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  StoreAggregated,
  DailyStoreSalesRecord,
  EmployeeRecord,
  CategoryDCSItem,
  ChainMetrics,
} from '../types/retail';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/calculations';
import { exportTableToExcel } from '../utils/exportUtils';

interface BranchPerformanceProps {
  stores: StoreAggregated[];
  dailySales: DailyStoreSalesRecord[];
  employees: EmployeeRecord[];
  categories: CategoryDCSItem[];
  chainMetrics: ChainMetrics;
  lang: 'ar' | 'en';
  selectedStoreName?: string;
  onClearSelectedStore?: () => void;
}

export const BranchPerformance: React.FC<BranchPerformanceProps> = ({
  stores,
  dailySales,
  employees,
  categories,
  chainMetrics,
  lang,
  selectedStoreName,
  onClearSelectedStore,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [sortField, setSortField] = useState<keyof StoreAggregated>('totalSales');
  const [sortAsc, setSortAsc] = useState(false);

  // Store Drilldown Modal
  const [activeDrilldownStore, setActiveDrilldownStore] = useState<string | null>(selectedStoreName || null);
  const [isExplainingStore, setIsExplainingStore] = useState(false);
  const [storeExplanation, setStoreExplanation] = useState<any>(null);

  // Handle row sorting
  const handleSort = (field: keyof StoreAggregated) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Filter & Sort stores
  const filteredStores = stores
    .filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSegment = segmentFilter === 'all' || s.segment === segmentFilter;
      return matchSearch && matchSegment;
    })
    .sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredStores.map(s => ({
      'Store Name': s.name,
      'Segment': s.segment,
      'Net Sales (EGP)': s.totalSales,
      'Share %': s.salesSharePercent,
      'Transactions (TRX)': s.totalTrx,
      'Weighted ATV': s.weightedAtv,
      'Weighted UPT': s.weightedUpt,
      'Weighted UTV': s.weightedUtv,
      'Daily Volatility (CV)': s.dailyVolatilityCv,
      'H2 vs H1 Change %': s.h2h1ChangePercent,
      'Active Staff': s.activeStaffCount,
      'Top-3 Staff Dependency %': s.top3StaffDependencyPercent,
      'Unattributed Sales %': s.unattributedSalesPercent,
      'Unattributed Amount': s.unattributedAmount,
      'Return Rate % (Online)': s.returnRatePercent ?? 'N/A',
      'Data Quality Score': s.dataQualityScore,
    }));
    exportTableToExcel(rows, 'Retail_Branches_Performance_Aug2026', 'Stores');
  };

  // Drilldown data for active store
  const drillStore = stores.find(s => s.name === activeDrilldownStore);
  const storeDailyList = dailySales
    .filter(d => d.storeName === activeDrilldownStore)
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  const storeStaffList = employees
    .filter(e => e.storeName === activeDrilldownStore && !e.isFlaggedUser)
    .sort((a, b) => b.extPrice - a.extPrice);

  // Category mix for drilldown store vs chain
  const totalStoreUnits = drillStore?.totalUnits || 1;
  const storeCatMix = categories.map(cat => {
    const storeUnits = cat.storeUnits[activeDrilldownStore || ''] || 0;
    const storeShare = Number(((storeUnits / totalStoreUnits) * 100).toFixed(1));
    const chainShare = Number(((cat.grandTotal / (chainMetrics.totalUnits || 1)) * 100).toFixed(1));
    const deviation = Number((storeShare - chainShare).toFixed(1));
    return {
      category: cat.rawCategory,
      storeShare,
      chainShare,
      deviation,
      storeUnits,
    };
  }).sort((a, b) => b.storeUnits - a.storeUnits);

  // Call Gemini for Store Explanation
  const handleExplainStore = async (store: StoreAggregated) => {
    setIsExplainingStore(true);
    setStoreExplanation(null);

    try {
      // Calculate segment benchmark
      const segStores = stores.filter(s => s.segment === store.segment && !s.isExcluded);
      const segSales = segStores.reduce((sum, s) => sum + s.totalSales, 0);
      const segTrx = segStores.reduce((sum, s) => sum + s.totalTrx, 0);
      const segUnits = segStores.reduce((sum, s) => sum + s.totalUnits, 0);

      const segmentBenchmark = {
        segment: store.segment,
        avgSales: Math.round(segSales / Math.max(1, segStores.length)),
        weightedAtv: segTrx > 0 ? Math.round(segSales / segTrx) : 0,
        weightedUpt: segTrx > 0 ? Number((segUnits / segTrx).toFixed(2)) : 0,
        weightedUtv: segUnits > 0 ? Math.round(segSales / segUnits) : 0,
      };

      const res = await fetch('/api/gemini/explain-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeData: store,
          segmentBenchmark,
          chainBenchmark: {
            weightedAtv: chainMetrics.weightedAtv,
            weightedUpt: chainMetrics.weightedUpt,
            weightedUtv: chainMetrics.weightedUtv,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to explain store');
      const data = await res.json();
      setStoreExplanation(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExplainingStore(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            <span>{lang === 'ar' ? 'جدول أداء فروع السلسلة الـ 27' : '27 Branches Performance Table'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'مؤشرات الأداء المرجحة بدقة، التذبذب اليومي، اعتمادية كادر المبيعات، ومعدلات المبيعات غير المنسوبة'
              : 'Weighted retail KPIs, daily volatility, salesperson concentration, and unattributed sales audit'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'ar' ? 'تصدير لـ Excel' : 'Export to Excel'}</span>
          </button>
        </div>
      </div>

      {/* Search & Segment Pill Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 w-full sm:w-64 text-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث باسم الفرع...' : 'Search store name...'}
            className="bg-transparent text-white outline-none w-full text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {['all', 'Mall', 'Governorate', 'Outlet', 'Online', 'International'].map(seg => (
            <button
              key={seg}
              onClick={() => setSegmentFilter(seg)}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                segmentFilter === seg
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {seg === 'all'
                ? (lang === 'ar' ? 'كافة الفروع' : 'All')
                : seg === 'Mall'
                ? (lang === 'ar' ? 'مولات ومراكز' : 'Malls')
                : seg === 'Governorate'
                ? (lang === 'ar' ? 'المحافظات' : 'Governorates')
                : seg === 'Outlet'
                ? (lang === 'ar' ? 'أوتلت (شبرا)' : 'Outlet')
                : seg === 'Online'
                ? (lang === 'ar' ? 'أونلاين' : 'Online')
                : (lang === 'ar' ? 'الدوحة' : 'Al Doha')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 font-bold cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>{lang === 'ar' ? 'الفرع والشريحة' : 'Store & Segment'}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalSales')}
                  className="py-3 px-4 font-bold cursor-pointer hover:text-white text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{lang === 'ar' ? 'المبيعات (ج.م)' : 'Net Sales (EGP)'}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('salesSharePercent')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                >
                  <span>{lang === 'ar' ? 'الحصة' : 'Share %'}</span>
                </th>
                <th
                  onClick={() => handleSort('totalTrx')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                >
                  <span>TRX</span>
                </th>
                <th
                  onClick={() => handleSort('weightedAtv')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                >
                  <span>ATV</span>
                </th>
                <th
                  onClick={() => handleSort('weightedUpt')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                >
                  <span>UPT</span>
                </th>
                <th
                  onClick={() => handleSort('weightedUtv')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                >
                  <span>UTV</span>
                </th>
                <th
                  onClick={() => handleSort('dailyVolatilityCv')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                  title={lang === 'ar' ? 'معامل التذبذب اليومي (CV = الانحراف المعياري ÷ المتوسط)' : 'Daily Volatility (CV)'}
                >
                  <span>{lang === 'ar' ? 'التذبذب (CV)' : 'Volatility (CV)'}</span>
                </th>
                <th
                  onClick={() => handleSort('h2h1ChangePercent')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                >
                  <span>H2 vs H1</span>
                </th>
                <th
                  onClick={() => handleSort('activeStaffCount')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                >
                  <span>{lang === 'ar' ? 'البائعين' : 'Staff'}</span>
                </th>
                <th
                  onClick={() => handleSort('top3StaffDependencyPercent')}
                  className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                  title={lang === 'ar' ? 'نسبة اعتماد مبيعات الفرع على أعلى 3 بائعين' : 'Top 3 Staff Sales %'}
                >
                  <span>{lang === 'ar' ? 'اعتماد أعلى 3' : 'Top-3 %'}</span>
                </th>
                <th
                  onClick={() => handleSort('unattributedSalesPercent')}
                  className="py-3 px-4 font-bold cursor-pointer hover:text-white text-center"
                  title={lang === 'ar' ? 'نسبة المبيعات المسجلة تحت حسابات غير حقيقية (>10% تظهر بالأحمر)' : 'Unattributed Sales %'}
                >
                  <span>{lang === 'ar' ? 'غير المنسوبة %' : 'Unattributed %'}</span>
                </th>
                <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredStores.map(store => (
                <tr
                  key={store.name}
                  onClick={() => setActiveDrilldownStore(store.name)}
                  className="hover:bg-slate-800/60 cursor-pointer transition-colors group"
                >
                  {/* Store Name & Segment */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-white group-hover:text-amber-400 transition-colors">
                      {store.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        store.segment === 'Mall'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : store.segment === 'Governorate'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : store.segment === 'Outlet'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : store.segment === 'Online'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {store.segment}
                      </span>
                      {store.isExcluded && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">
                          {lang === 'ar' ? 'مستبعد من الإجمالي' : 'Excluded'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Net Sales */}
                  <td className="py-3 px-4 text-right font-extrabold text-slate-100">
                    {formatCurrency(store.totalSales, store.currency || 'EGP', lang)}
                  </td>

                  {/* Share % */}
                  <td className="py-3 px-3 text-center font-bold text-amber-400">
                    {store.isExcluded ? '-' : `${store.salesSharePercent}%`}
                  </td>

                  {/* TRX */}
                  <td className="py-3 px-3 text-center text-slate-300 font-mono">
                    {formatNumber(store.totalTrx, lang)}
                  </td>

                  {/* ATV */}
                  <td className="py-3 px-3 text-center font-bold text-emerald-400">
                    {formatNumber(store.weightedAtv, lang)}
                  </td>

                  {/* UPT */}
                  <td className="py-3 px-3 text-center font-bold text-purple-300">
                    {store.weightedUpt}
                  </td>

                  {/* UTV */}
                  <td className="py-3 px-3 text-center text-slate-300">
                    {formatNumber(store.weightedUtv, lang)}
                  </td>

                  {/* CV Volatility */}
                  <td className="py-3 px-3 text-center font-mono text-slate-400">
                    {store.dailyVolatilityCv}
                  </td>

                  {/* H2 vs H1 */}
                  <td className="py-3 px-3 text-center font-semibold">
                    <span className={store.h2h1ChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {formatPercent(store.h2h1ChangePercent, lang)}
                    </span>
                  </td>

                  {/* Staff */}
                  <td className="py-3 px-3 text-center text-slate-300 font-semibold">
                    {store.activeStaffCount}
                  </td>

                  {/* Top-3 dependency */}
                  <td className="py-3 px-3 text-center font-semibold text-slate-300">
                    {store.top3StaffDependencyPercent}%
                  </td>

                  {/* Unattributed Sales % (Flag >10% in RED) */}
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                      store.unattributedSalesPercent > 10.0
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                        : 'text-slate-400'
                    }`}>
                      {store.unattributedSalesPercent}%
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveDrilldownStore(store.name);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      {lang === 'ar' ? 'تفاصيل' : 'Drilldown'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drilldown Modal */}
      {drillStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      {drillStore.name}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {drillStore.segment}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar' ? 'صافي المبيعات:' : 'Net Sales:'} {formatCurrency(drillStore.totalSales, drillStore.currency || 'EGP', lang)} • UPT: {drillStore.weightedUpt} • ATV: {formatNumber(drillStore.weightedAtv, lang)} ج.م
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExplainStore(drillStore)}
                  disabled={isExplainingStore}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 text-xs font-bold shadow-md transition-transform active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'تشخيص الفرع (Explain Store)' : 'Explain this store'}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveDrilldownStore(null);
                    if (onClearSelectedStore) onClearSelectedStore();
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* AI Store Explanation Box */}
              {isExplainingStore ? (
                <div className="p-6 rounded-xl bg-slate-950 border border-amber-500/30 text-center space-y-2">
                  <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-200">
                    {lang === 'ar' ? 'جاري تشخيص أداء الفرع مقارنة بمتوسط شريحته...' : 'Diagnosing store performance vs segment benchmark...'}
                  </p>
                </div>
              ) : storeExplanation ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'التشخيص الاستشاري الذكي للفرع' : 'AI Store Diagnosis'}</span>
                    </div>
                    {storeExplanation.statusTag && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {storeExplanation.statusTag}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-200 leading-relaxed text-sm">
                    {storeExplanation.diagnosis}
                  </p>

                  {/* 3 Concrete Actions */}
                  {storeExplanation.actions && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <span className="font-bold text-white text-[11px]">
                        {lang === 'ar' ? 'الإجراءات التنفيذية الثلاثة الموصى بها للفرع:' : '3 Recommended Concrete Actions:'}
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {storeExplanation.actions.map((act: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                            <div className="font-bold text-amber-300">{act.title}</div>
                            <p className="text-[11px] text-slate-300">{act.detail}</p>
                            <div className="text-[10px] text-slate-400 font-semibold mt-1">
                              {lang === 'ar' ? 'المسؤول:' : 'Target:'} {act.targetRole}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Daily Sales Chart */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'ar' ? 'حركة المبيعات اليومية للفرع خلال الشهر' : 'Daily Sales Trend'}</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    CV: {drillStore.dailyVolatilityCv} • H2 vs H1: {formatPercent(drillStore.h2h1ChangePercent, lang)}
                  </span>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={storeDailyList} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="dateStr" tickFormatter={s => s.split('-')[2]} stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                        formatter={(val: any) => [formatCurrency(Number(val), 'EGP', lang), lang === 'ar' ? 'المبيعات' : 'Sales']}
                      />
                      <Line type="monotone" dataKey="extPrice" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Two columns: Staff List & Category Mix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Staff Roster */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>{lang === 'ar' ? 'كادر المبيعات بالفرع (الترتيب والإنتاجية)' : 'Branch Sales Staff'}</span>
                  </h3>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {storeStaffList.map(st => (
                      <div
                        key={st.employee}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                            {st.rankInStore}
                          </span>
                          <div>
                            <div className="font-bold text-slate-200">{st.employee}</div>
                            <div className="text-[10px] text-slate-400">
                              UPT: {st.upt} • ATV: {formatNumber(st.atv, lang)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-amber-400">
                            {formatCurrency(st.extPrice, 'EGP', lang)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {st.trx} {lang === 'ar' ? 'فاتورة' : 'trx'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Mix vs Chain */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>{lang === 'ar' ? 'مزيج الفئات vs متوسط السلسلة (انحراف %)' : 'Category Mix vs Chain Deviation'}</span>
                  </h3>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {storeCatMix.slice(0, 6).map(mix => (
                      <div
                        key={mix.category}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{mix.category}</div>
                          <div className="text-[10px] text-slate-400">
                            {mix.storeUnits} {lang === 'ar' ? 'قطعة' : 'units'} ({mix.storeShare}%)
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            mix.deviation > 0
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : mix.deviation < 0
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'text-slate-400'
                          }`}>
                            {formatPercent(mix.deviation, lang)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
