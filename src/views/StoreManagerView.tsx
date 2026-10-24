import React, { useState } from 'react';
import {
  UserCheck,
  Building2,
  TrendingUp,
  Layers,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  StoreAggregated,
  EmployeeRecord,
  ChainMetrics,
} from '../types/retail';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/calculations';
import { STORE_NAMES_LIST } from '../utils/sampleData';

interface StoreManagerViewProps {
  stores: StoreAggregated[];
  employees: EmployeeRecord[];
  chainMetrics: ChainMetrics;
  lang: 'ar' | 'en';
}

export const StoreManagerView: React.FC<StoreManagerViewProps> = ({
  stores,
  employees,
  chainMetrics,
  lang,
}) => {
  const [selectedStoreName, setSelectedStoreName] = useState<string>(stores[0]?.name || 'Mall of Arabia');

  const currentStore = stores.find(s => s.name === selectedStoreName) || stores[0];

  // Benchmark: average of the store's segment
  const segmentStores = stores.filter(s => s.segment === currentStore.segment && !s.isExcluded);
  const segCount = Math.max(1, segmentStores.length);
  const segSales = segmentStores.reduce((sum, s) => sum + s.totalSales, 0);
  const segTrx = segmentStores.reduce((sum, s) => sum + s.totalTrx, 0);
  const segUnits = segmentStores.reduce((sum, s) => sum + s.totalUnits, 0);

  const segmentAvg = {
    avgSales: Math.round(segSales / segCount),
    weightedAtv: segTrx > 0 ? Math.round(segSales / segTrx) : 0,
    weightedUpt: segTrx > 0 ? Number((segUnits / segTrx).toFixed(2)) : 0,
    weightedUtv: segUnits > 0 ? Math.round(segSales / segUnits) : 0,
    avgStaff: Number((segmentStores.reduce((sum, s) => sum + s.activeStaffCount, 0) / segCount).toFixed(1)),
    avgVolatility: Number((segmentStores.reduce((sum, s) => sum + s.dailyVolatilityCv, 0) / segCount).toFixed(3)),
  };

  // Staff in this store
  const storeStaff = employees
    .filter(e => e.storeName === selectedStoreName && !e.isFlaggedUser)
    .sort((a, b) => b.extPrice - a.extPrice);

  // Comparison Chart Data (Store vs Segment)
  const comparisonData = [
    {
      metric: 'UPT (x10)',
      store: Number((currentStore.weightedUpt * 10).toFixed(1)),
      segment: Number((segmentAvg.weightedUpt * 10).toFixed(1)),
    },
    {
      metric: 'ATV (ج.م ÷ 100)',
      store: Math.round(currentStore.weightedAtv / 100),
      segment: Math.round(segmentAvg.weightedAtv / 100),
    },
    {
      metric: 'UTV (ج.م ÷ 100)',
      store: Math.round(currentStore.weightedUtv / 100),
      segment: Math.round(segmentAvg.weightedUtv / 100),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Store Picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <span>{lang === 'ar' ? 'رؤية مدير الفرع (Store Manager Dashboard)' : 'Store Manager View'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'مقارنة معايير الفرع مع متوسط شريحته المعيارية وصحة توزيع مبيعات كادر الفرع'
              : 'Benchmark store KPIs directly against its peer segment average'}
          </p>
        </div>

        {/* Store Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">
            {lang === 'ar' ? 'اختر الفرع:' : 'Select Store:'}
          </span>
          <select
            value={selectedStoreName}
            onChange={e => setSelectedStoreName(e.target.value)}
            className="bg-slate-950 text-amber-400 font-bold border border-slate-800 px-3.5 py-2 rounded-xl outline-none cursor-pointer text-xs"
          >
            {STORE_NAMES_LIST.map(name => (
              <option key={name} value={name} className="bg-slate-900 text-slate-200">
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Store vs Segment Benchmark Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales vs Segment */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-medium">
            {lang === 'ar' ? 'صافي مبيعات الفرع' : 'Store Net Sales'}
          </div>
          <div className="text-xl font-extrabold text-white">
            {formatCurrency(currentStore.totalSales, currentStore.currency || 'EGP', lang)}
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {lang === 'ar' ? `متوسط ${currentStore.segment}:` : `${currentStore.segment} Avg:`}
            </span>
            <span className="font-bold text-slate-300">
              {formatCurrency(segmentAvg.avgSales, 'EGP', lang)}
            </span>
          </div>
        </div>

        {/* UPT vs Segment */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-medium">
            {lang === 'ar' ? 'سلة العميل (UPT)' : 'Store UPT'}
          </div>
          <div className="text-xl font-extrabold text-purple-300">
            {currentStore.weightedUpt}
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {lang === 'ar' ? `متوسط ${currentStore.segment}:` : `${currentStore.segment} Avg:`}
            </span>
            <span className={`font-bold ${currentStore.weightedUpt >= segmentAvg.weightedUpt ? 'text-emerald-400' : 'text-rose-400'}`}>
              {segmentAvg.weightedUpt}
            </span>
          </div>
        </div>

        {/* ATV vs Segment */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-medium">
            {lang === 'ar' ? 'متوسط الفاتورة (ATV)' : 'Store ATV'}
          </div>
          <div className="text-xl font-extrabold text-emerald-400">
            {formatCurrency(currentStore.weightedAtv, 'EGP', lang)}
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {lang === 'ar' ? `متوسط ${currentStore.segment}:` : `${currentStore.segment} Avg:`}
            </span>
            <span className={`font-bold ${currentStore.weightedAtv >= segmentAvg.weightedAtv ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(segmentAvg.weightedAtv, 'EGP', lang)}
            </span>
          </div>
        </div>

        {/* Data Quality Score */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>{lang === 'ar' ? 'مؤشر جودة بيانات الفرع' : 'Store Data Health'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400">
            {currentStore.dataQualityScore}%
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {lang === 'ar' ? 'المبيعات غير المنسوبة:' : 'Unattributed:'}
            </span>
            <span className={`font-bold ${currentStore.unattributedSalesPercent > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {currentStore.unattributedSalesPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Comparison Chart + Staff Distribution Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparison Bar Chart */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">
              {lang === 'ar' ? `مقارنة الفرع (${currentStore.name}) مقابل متوسط شريحته (${currentStore.segment})` : 'Store vs Peer Segment'}
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'المعايير المرجحة معيارياً للتأكد من تنافسية الفرع' : 'Normalized benchmark comparison'}
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 15, right: 15, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="metric" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Legend />
                <Bar dataKey="store" name={currentStore.name} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="segment" name={`${currentStore.segment} Avg`} fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Staff Distribution Health */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'صحة توزيع كادر الفرع (Staff Health)' : 'Staff Health & Concentration'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'مدى توازن مساهمة البائعين وتفادي الاعتماد المفرط على بائع واحد' : 'Sales share distribution among salespeople'}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {storeStaff.length} {lang === 'ar' ? 'بائعين' : 'staff'}
            </span>
          </div>

          {/* Dependency Alert if Top 3 > 75% */}
          {currentStore.top3StaffDependencyPercent > 75 && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{lang === 'ar' ? 'تنبيه تركيز:' : 'Concentration Alert:'} </span>
                {lang === 'ar'
                  ? `أعلى 3 بائعين يحققون ${currentStore.top3StaffDependencyPercent}% من مبيعات الفرع. يوصى بتدريب وتوزيع العملاء بشكل أكثر عدالة.`
                  : `Top 3 staff generate ${currentStore.top3StaffDependencyPercent}% of store sales.`}
              </div>
            </div>
          )}

          {/* Staff List with Share % Progress Bars */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {storeStaff.map((st, idx) => {
              const share = currentStore.totalSales > 0 ? Number(((st.extPrice / currentStore.totalSales) * 100).toFixed(1)) : 0;
              return (
                <div key={st.employee} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-slate-800 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-200">{st.employee}</span>
                    </div>
                    <div className="font-extrabold text-amber-400">
                      {formatCurrency(st.extPrice, 'EGP', lang)} ({share}%)
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, share * 2.5)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>UPT: {st.upt} • ATV: {formatNumber(st.atv, lang)}</span>
                    <span className="text-slate-300 font-medium">{st.coachingCategory}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
