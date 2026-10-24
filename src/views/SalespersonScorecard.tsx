import React, { useState } from 'react';
import {
  Users,
  Search,
  Trophy,
  Sparkles,
  ArrowUpDown,
  Filter,
  UserCheck,
  AlertCircle,
  TrendingUp,
  X,
  Target,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  EmployeeRecord,
  StoreAggregated,
  ChainMetrics,
} from '../types/retail';
import {
  formatCurrency,
  formatNumber,
} from '../utils/calculations';
import { exportTableToExcel } from '../utils/exportUtils';
import { STORE_NAMES_LIST } from '../utils/sampleData';

interface SalespersonScorecardProps {
  employees: EmployeeRecord[];
  stores: StoreAggregated[];
  chainMetrics: ChainMetrics;
  lang: 'ar' | 'en';
}

export const SalespersonScorecard: React.FC<SalespersonScorecardProps> = ({
  employees,
  stores,
  chainMetrics,
  lang,
}) => {
  const [selectedStore, setSelectedStore] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof EmployeeRecord>('extPrice');
  const [sortAsc, setSortAsc] = useState(false);

  // Selected Employee for AI Coaching Note
  const [coachingEmp, setCoachingEmp] = useState<EmployeeRecord | null>(null);
  const [isGeneratingCoach, setIsGeneratingCoach] = useState(false);
  const [coachingResult, setCoachingResult] = useState<any>(null);

  // Filter out flagged non-salesperson accounts from rankings
  const activeStaff = employees.filter(e => !e.isFlaggedUser);

  // Calculate segment ranks
  const storeSegmentMap = new Map<string, string>();
  stores.forEach(s => storeSegmentMap.set(s.name, s.segment));

  const filteredStaff = activeStaff
    .filter(e => {
      const matchStore = selectedStore === 'all' || e.storeName === selectedStore;
      const matchSearch = e.employee.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStore && matchSearch;
    })
    .sort((a, b) => {
      const valA = (a[sortField] ?? 0) as any;
      const valB = (b[sortField] ?? 0) as any;
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

  // Thresholds for Quadrant Chart
  // Benchmark averages
  const avgUpt = chainMetrics.weightedUpt || 1.6;
  const avgAtv = chainMetrics.weightedAtv || 1400;

  // Scatter data: x = atv, y = upt, z = sales
  const scatterData = filteredStaff.map(e => ({
    name: e.employee,
    store: e.storeName,
    atv: e.atv,
    upt: e.upt,
    sales: e.extPrice,
    trx: e.trx,
    category: e.coachingCategory,
  }));

  const handleSort = (field: keyof EmployeeRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExport = () => {
    const rows = filteredStaff.map(e => ({
      'Employee': e.employee,
      'Store': e.storeName,
      'Rank in Store': e.rankInStore || '-',
      'Sales (EGP)': e.extPrice,
      'Units Sold': e.soldQty,
      'Transactions (TRX)': e.trx,
      'UPT': e.upt,
      'ATV': e.atv,
      'UTV': e.utv,
      'Is Floating': e.isFloating ? 'Yes' : 'No',
      'Coaching Need': e.coachingCategory,
    }));
    exportTableToExcel(rows, 'Salesperson_Scorecard_Aug2026', 'Staff');
  };

  // Generate AI Coaching Note
  const handleGenerateCoaching = async (emp: EmployeeRecord) => {
    setCoachingEmp(emp);
    setIsGeneratingCoach(true);
    setCoachingResult(null);

    const parentStore = stores.find(s => s.name === emp.storeName);
    const storeBenchmark = parentStore ? {
      name: parentStore.name,
      weightedAtv: parentStore.weightedAtv,
      weightedUpt: parentStore.weightedUpt,
      weightedUtv: parentStore.weightedUtv,
      avgStaffSales: Math.round(parentStore.totalSales / Math.max(1, parentStore.activeStaffCount)),
    } : { weightedAtv: avgAtv, weightedUpt: avgUpt };

    // Determine quadrant label
    let quad = 'متوازن';
    if (emp.upt >= avgUpt && emp.atv >= avgAtv) {
      quad = 'نجم مبيعات (Top Performer: High UPT & High ATV)';
    } else if (emp.upt < avgUpt && emp.atv >= avgAtv) {
      quad = 'يحتاج تدريب بيع إضافي وسلة العميل (Low UPT, High ATV - Needs Add-on Selling)';
    } else if (emp.upt >= avgUpt && emp.atv < avgAtv) {
      quad = 'يحتاج توجيه لبيع قطع أعلى سعراً (High UPT, Low ATV - Needs Upselling)';
    } else {
      quad = 'بحاجة لتطوير شامل في مهارات البيع والإقناع (Low UPT & Low ATV)';
    }

    try {
      const res = await fetch('/api/gemini/coaching-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeData: emp,
          storeBenchmark,
          quadrant: quad,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate coaching note');
      const data = await res.json();
      setCoachingResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingCoach(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>{lang === 'ar' ? 'بطاقة تقييم وتدريب بائعي التجزئة' : 'Salesperson Scorecard & Coaching Matrix'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'مصفوفة التوجيه الرباعية (UPT vs ATV) وتحديد فرص التدريب الميداني بالمتجر مع استبعاد الحسابات العامة'
              : 'Quadrant coaching matrix (UPT vs ATV) with non-sales accounts excluded'}
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>{lang === 'ar' ? 'تصدير لـ Excel' : 'Export Excel'}</span>
        </button>
      </div>

      {/* Quadrant Scatter Chart Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? 'مصفوفة التدريب الرباعية (Coaching Quadrants)' : 'Coaching Quadrant Matrix'}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'المحور الأفقي = متوسط الفاتورة (ATV) • المحور الرأسي = سلة العميل (UPT) • حجم الدائرة = حجم المبيعات'
                : 'X-axis = ATV • Y-axis = UPT • Bubble size = Total Sales'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-[11px] text-slate-400">
              {lang === 'ar' ? 'متوسط السلسلة:' : 'Chain Avg:'} UPT {avgUpt} | ATV {formatNumber(avgAtv, lang)} ج.م
            </span>
          </div>
        </div>

        {/* Quadrant Legend Box */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
            <div className="font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{lang === 'ar' ? 'الربع 1: نجوم المبيعات' : 'Q1: Top Stars'}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">UPT عالي + ATV عالي</p>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300">
            <div className="font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{lang === 'ar' ? 'الربع 2: يحتاج تدريب UPT' : 'Q2: Needs UPT Add-on'}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">فواتير قوية لكن قطع سلة قليلة</p>
          </div>

          <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-cyan-300">
            <div className="font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{lang === 'ar' ? 'الربع 3: يحتاج رفع ATV' : 'Q3: Needs ATV Upsell'}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">سلة متعددة ولكن بأسعار منخفضة</p>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300">
            <div className="font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>{lang === 'ar' ? 'الربع 4: يحتاج تطوير شامل' : 'Q4: Foundational Coaching'}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">ضعف سلة وتراجع قيمة المعاملة</p>
          </div>
        </div>

        {/* Quadrant Scatter Chart */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                type="number"
                dataKey="atv"
                name="ATV"
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={v => `${Math.round(v)}`}
                domain={['auto', 'auto']}
              />
              <YAxis
                type="number"
                dataKey="upt"
                name="UPT"
                stroke="#94a3b8"
                fontSize={11}
                domain={['auto', 'auto']}
              />
              <ZAxis type="number" dataKey="sales" range={[40, 280]} name="Sales" />
              <ReferenceLine x={avgAtv} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} />
              <ReferenceLine y={avgUpt} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                }}
                formatter={(val: any, name: any, item: any) => {
                  const p = item.payload;
                  return [
                    `UPT: ${p.upt} | ATV: ${formatCurrency(p.atv, 'EGP', lang)} | مبيعات: ${formatCurrency(p.sales, 'EGP', lang)} (${p.store})`,
                    p.name,
                  ];
                }}
              />
              <Scatter name="Staff" data={scatterData} fill="#f59e0b" opacity={0.8} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters & Leaderboard Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 w-full sm:w-64 text-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث باسم البائع...' : 'Search employee...'}
              className="bg-transparent text-white outline-none w-full text-xs"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">
              {lang === 'ar' ? 'تصفية حسب الفرع:' : 'Filter by Store:'}
            </span>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-800 px-3 py-1.5 rounded-lg outline-none cursor-pointer text-xs"
            >
              <option value="all">{lang === 'ar' ? 'كافة الفروع' : 'All Stores'}</option>
              {STORE_NAMES_LIST.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Staff Table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 text-center">#</th>
                  <th
                    onClick={() => handleSort('employee')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-white"
                  >
                    <span>{lang === 'ar' ? 'اسم البائع والفرع' : 'Employee & Store'}</span>
                  </th>
                  <th
                    onClick={() => handleSort('extPrice')}
                    className="py-3 px-4 font-bold cursor-pointer hover:text-white text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{lang === 'ar' ? 'صافي المبيعات (ج.م)' : 'Sales (EGP)'}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('soldQty')}
                    className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                  >
                    <span>{lang === 'ar' ? 'القطع' : 'Units'}</span>
                  </th>
                  <th
                    onClick={() => handleSort('trx')}
                    className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                  >
                    <span>TRX</span>
                  </th>
                  <th
                    onClick={() => handleSort('upt')}
                    className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                  >
                    <span>UPT</span>
                  </th>
                  <th
                    onClick={() => handleSort('atv')}
                    className="py-3 px-3 font-bold cursor-pointer hover:text-white text-center"
                  >
                    <span>ATV</span>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <span>{lang === 'ar' ? 'الترتيب بالفرع' : 'Store Rank'}</span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span>{lang === 'ar' ? 'تصنيف التدريب والمتابعة' : 'Coaching Category'}</span>
                  </th>
                  <th className="py-3 px-4 text-center">
                    <span>{lang === 'ar' ? 'إجراء التدريب' : 'Action'}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredStaff.map((emp, index) => (
                  <tr key={`${emp.storeName}-${emp.employee}`} className="hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                      {index + 1}
                    </td>

                    {/* Employee & Store */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{emp.employee}</span>
                        {emp.isFloating && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {lang === 'ar' ? 'متنقل / مشرف' : 'Floating'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {emp.storeName}
                      </div>
                    </td>

                    {/* Sales */}
                    <td className="py-3 px-4 text-right font-extrabold text-amber-400">
                      {formatCurrency(emp.extPrice, 'EGP', lang)}
                    </td>

                    {/* Units */}
                    <td className="py-3 px-3 text-center text-slate-300">
                      {formatNumber(emp.soldQty, lang)}
                    </td>

                    {/* TRX */}
                    <td className="py-3 px-3 text-center text-slate-300 font-mono">
                      {emp.trx}
                    </td>

                    {/* UPT */}
                    <td className="py-3 px-3 text-center font-bold text-purple-300">
                      {emp.upt}
                    </td>

                    {/* ATV */}
                    <td className="py-3 px-3 text-center font-bold text-emerald-400">
                      {formatNumber(emp.atv, lang)}
                    </td>

                    {/* Rank */}
                    <td className="py-3 px-3 text-center">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold inline-flex items-center justify-center text-[10px]">
                        #{emp.rankInStore || 1}
                      </span>
                    </td>

                    {/* Coaching Category Pill */}
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        emp.coachingCategory?.includes('نجم')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : emp.coachingCategory?.includes('UPT')
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : emp.coachingCategory?.includes('ATV')
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {emp.coachingCategory}
                      </span>
                    </td>

                    {/* AI Coaching Button */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleGenerateCoaching(emp)}
                        className="flex items-center gap-1 mx-auto px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>{lang === 'ar' ? 'توجيه تدريبي' : 'Coaching Note'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Coaching Note Modal */}
      {coachingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {lang === 'ar' ? 'بطاقة التوجيه والتدريب الذكية' : 'AI Salesperson Coaching Card'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {coachingEmp.employee} • {coachingEmp.storeName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCoachingEmp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {isGeneratingCoach ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-bold text-slate-200">
                    {lang === 'ar' ? 'جاري تحليل مؤشرات البائع وصياغة النصيحة التدريبية...' : 'Analyzing salesperson metrics & formulating coaching note...'}
                  </p>
                </div>
              ) : coachingResult ? (
                <div className="space-y-4">
                  {/* Category Banner */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {lang === 'ar' ? 'التصنيف الميداني:' : 'Field Coaching Category:'}
                      </div>
                      <div className="text-sm font-bold text-amber-300">
                        {coachingResult.coachingCategory}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-300">
                      <div>UPT: {coachingEmp.upt}</div>
                      <div>ATV: {formatNumber(coachingEmp.atv, lang)} ج.م</div>
                    </div>
                  </div>

                  {/* Strengths */}
                  <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                    <div className="font-bold text-emerald-400 text-xs">
                      {lang === 'ar' ? 'نقاط القوة والإنجاز:' : 'Strengths:'}
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      {coachingResult.strengths?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-emerald-400">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gaps */}
                  <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                    <div className="font-bold text-rose-400 text-xs">
                      {lang === 'ar' ? 'فجوات الأداء مقارنة بمتوسط الفرع:' : 'Performance Gaps:'}
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      {coachingResult.gaps?.map((g: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-rose-400">•</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Specific Tactical Coaching Tip */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
                    <div className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'نصيحة وتكنيك التدريب الميداني المقترح:' : 'Specific Tactical Coaching Tip:'}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed text-sm">
                      {coachingResult.tacticalTip}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
