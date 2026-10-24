import React, { useState } from 'react';
import {
  ShoppingBag,
  Layers,
  AlertTriangle,
  ArrowUpDown,
  Search,
  FileSpreadsheet,
  PieChart as PieIcon,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import {
  CategoryDCSItem,
  StyleDescItem,
  StoreAggregated,
  ChainMetrics,
} from '../types/retail';
import {
  formatNumber,
  formatPercent,
  computeStylePareto,
  computeCheckAllocationList,
} from '../utils/calculations';
import { exportTableToExcel } from '../utils/exportUtils';
import { STORE_NAMES_LIST } from '../utils/sampleData';

interface CategoryAssortmentProps {
  categories: CategoryDCSItem[];
  styles: StyleDescItem[];
  stores: StoreAggregated[];
  chainMetrics: ChainMetrics;
  lang: 'ar' | 'en';
}

export const CategoryAssortment: React.FC<CategoryAssortmentProps> = ({
  categories,
  styles,
  stores,
  chainMetrics,
  lang,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pareto' | 'allocation' | 'heatmap' | 'longtail'>('pareto');
  const [selectedStoreForStyles, setSelectedStoreForStyles] = useState<string>('Alex');
  const [styleSearch, setStyleSearch] = useState('');

  // Pareto computation
  const paretoResult = computeStylePareto(styles);

  // Check allocation list
  const allocationList = computeCheckAllocationList(categories, stores);

  // Department mix summary
  const totalUnits = chainMetrics.totalUnits || 1;
  const deptMap = new Map<string, number>();
  categories.forEach(c => {
    deptMap.set(c.department, (deptMap.get(c.department) || 0) + c.grandTotal);
  });
  const deptList = Array.from(deptMap.entries()).map(([dept, units]) => ({
    dept,
    units,
    share: Number(((units / totalUnits) * 100).toFixed(1)),
  })).sort((a, b) => b.units - a.units);

  // Long tail styles (<= 10 units)
  const longTailStyles = styles.filter(s => s.totalUnits <= 10);

  // Top styles for selected store
  const storeStyles = styles
    .map(st => ({
      code: st.styleCode,
      name: st.styleName,
      units: st.storeUnits[selectedStoreForStyles] || 0,
      chainUnits: st.totalUnits,
    }))
    .filter(s => s.units > 0)
    .sort((a, b) => b.units - a.units);

  const handleExportStyles = () => {
    const rows = styles.map(s => ({
      'Style Code': s.styleCode,
      'Style Name': s.styleName,
      'Chain Total Units': s.totalUnits,
      'Is Long Tail': s.totalUnits <= 10 ? 'Yes' : 'No',
    }));
    exportTableToExcel(rows, 'Styles_Pareto_Aug2026', 'Styles');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <span>{lang === 'ar' ? 'تحليل التشكيلة والموديلات ومخزون الفروع' : 'Category Assortment & Style Pareto'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'مصفوفة باريتو (50/80%)، الأصناف الراكدة (Long-tail)، وقائمة التدقيق المخزني للفئات الصفرية'
              : 'Pareto curve (50/80%), long-tail styles, and zero-stock allocation alerts'}
          </p>
        </div>

        <button
          onClick={handleExportStyles}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>{lang === 'ar' ? 'تصدير الموديلات' : 'Export Styles'}</span>
        </button>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('pareto')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeSubTab === 'pareto'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {lang === 'ar' ? 'تحليل باريتو (Pareto 50/80%)' : 'Style Pareto Curve'}
        </button>

        <button
          onClick={() => setActiveSubTab('allocation')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSubTab === 'allocation'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <span>{lang === 'ar' ? 'تدقيق توزيع المخزون (Check Allocation)' : 'Check Allocation'}</span>
          {allocationList.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono">
              {allocationList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('heatmap')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeSubTab === 'heatmap'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {lang === 'ar' ? 'انحراف فئات DCS عن السلسلة' : 'Category DCS Deviation'}
        </button>

        <button
          onClick={() => setActiveSubTab('longtail')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeSubTab === 'longtail'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {lang === 'ar' ? `الأصناف الراكدة (≤10 قطع - ${longTailStyles.length})` : `Long Tail (≤10 Units - ${longTailStyles.length})`}
        </button>
      </div>

      {/* 1. Pareto Tab */}
      {activeSubTab === 'pareto' && (
        <div className="space-y-6">
          {/* Pareto KPI Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'إجمالي الموديلات' : 'Total Styles'}</div>
              <div className="text-xl font-extrabold text-white mt-1">{paretoResult.totalStyles}</div>
              <div className="text-[11px] text-slate-400 mt-1">{lang === 'ar' ? 'موديل نشط بالسلسلة' : 'active styles'}</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
              <div className="text-xs text-emerald-400 font-medium">{lang === 'ar' ? 'موديلات الـ 50% مبيعات' : '50% Sales Cutoff'}</div>
              <div className="text-xl font-extrabold text-emerald-300 mt-1">{paretoResult.count50} {lang === 'ar' ? 'موديل' : 'styles'}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {Number(((paretoResult.count50 / paretoResult.totalStyles) * 100).toFixed(1))}% {lang === 'ar' ? 'من الموديلات تصنع نصف المبيعات' : 'of styles'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
              <div className="text-xs text-amber-400 font-medium">{lang === 'ar' ? 'موديلات الـ 80% مبيعات' : '80% Sales Cutoff'}</div>
              <div className="text-xl font-extrabold text-amber-300 mt-1">{paretoResult.count80} {lang === 'ar' ? 'موديل' : 'styles'}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {Number(((paretoResult.count80 / paretoResult.totalStyles) * 100).toFixed(1))}% {lang === 'ar' ? 'من التشكيلة تصنع 80% من الحجم' : 'of styles'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
              <div className="text-xs text-rose-400 font-medium">{lang === 'ar' ? 'الأصناف الراكدة (≤ 10 قطع)' : 'Long-Tail (≤ 10 pcs)'}</div>
              <div className="text-xl font-extrabold text-rose-300 mt-1">{paretoResult.longTailCount} {lang === 'ar' ? 'موديل' : 'styles'}</div>
              <div className="text-[11px] text-slate-400 mt-1">{lang === 'ar' ? 'تستوجب تصفية أو خصم' : 'requires markdown'}</div>
            </div>
          </div>

          {/* Pareto Ranked Styles List */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {lang === 'ar' ? 'ترتيب الموديلات التنازلي ونسبة المساهمة التراكمية' : 'Styles Ranked by Unit Volume'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right border-collapse">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 text-center">#</th>
                    <th className="py-2.5 px-4 font-bold">{lang === 'ar' ? 'كود الموديل' : 'Code'}</th>
                    <th className="py-2.5 px-4 font-bold">{lang === 'ar' ? 'اسم ووصف الموديل' : 'Style Description'}</th>
                    <th className="py-2.5 px-4 font-bold text-center">{lang === 'ar' ? 'إجمالي القطع' : 'Total Units'}</th>
                    <th className="py-2.5 px-4 font-bold text-center">{lang === 'ar' ? 'المساهمة التراكمية' : 'Cumulative %'}</th>
                    <th className="py-2.5 px-4 text-center">{lang === 'ar' ? 'شريحة باريتو' : 'Pareto Tier'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {paretoResult.paretoStyles.map((st, idx) => (
                    <tr key={st.styleCode} className="hover:bg-slate-800/60 transition-colors">
                      <td className="py-2.5 px-4 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-amber-400 font-mono">{st.styleCode}</td>
                      <td className="py-2.5 px-4 text-white font-semibold">{st.styleName}</td>
                      <td className="py-2.5 px-4 text-center font-extrabold text-slate-200">
                        {formatNumber(st.totalUnits, lang)}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-300">
                        {st.cumulativeShare}%
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          (st.cumulativeShare || 0) <= 50
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : (st.cumulativeShare || 0) <= 80
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {(st.cumulativeShare || 0) <= 50 ? 'Tier 1 (50%)' : (st.cumulativeShare || 0) <= 80 ? 'Tier 2 (80%)' : 'Long Tail'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Check Allocation Tab */}
      {activeSubTab === 'allocation' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold text-white">
                {lang === 'ar' ? 'تنبيه فحص التوزيع المخزني (Check Allocation):' : 'Stock Allocation Anomaly Rule:'}
              </span>
              <p className="mt-0.5 text-slate-300 leading-relaxed">
                {lang === 'ar'
                  ? 'يتم رصد الفئات التي تمثل أكثر من 5% من مبيعات الشريحة (مثل المحافظات أو المولات)، ولكن الفرع حقق فيها 0 قطع مبيعات، مما يرجح عدم إرسال بضاعة كافية للفرع أو وجود عجز بالتشكيلة.'
                  : 'Identifies categories that account for >5% of peer segment units, but have 0 units sold in a store.'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {allocationList.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <span>{lang === 'ar' ? 'التوزيع المخزني سليم، لا توجد فئات صفرية ضمن الشرائح النشطة' : 'Stock allocation looks balanced across stores'}</span>
              </div>
            ) : (
              allocationList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.storeName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {item.segment}
                      </span>
                    </div>
                    <p className="text-rose-300 font-semibold">{item.messageAr}</p>
                  </div>

                  <div className="text-right sm:max-w-xs shrink-0 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium">
                      {lang === 'ar' ? 'نسبة الفئة في شريحة الفرع:' : 'Segment Share:'}
                    </div>
                    <div className="text-sm font-extrabold text-amber-400">
                      {item.segmentUnitSharePercent}% {lang === 'ar' ? 'من مبيعات الشريحة' : 'of segment'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Category DCS Deviation Heatmap */}
      {activeSubTab === 'heatmap' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'جدول انحراف فئات DCS عن متوسط مبيعات السلسلة (بالنقاط المئوية)' : 'DCS Category Deviation vs Chain (Percentage Points)'}
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'اللون الأخضر = تفوق حصة الفئة بالفرع عن السلسلة • اللون الأحمر = ضعف الإقبال أو نقص المخزون' : 'Green = above chain share, Red = below chain share'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.slice(0, 9).map(cat => {
              const chainShare = Number(((cat.grandTotal / totalUnits) * 100).toFixed(1));
              return (
                <div key={cat.rawCategory} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-amber-400">{cat.rawCategory}</span>
                    <span className="text-slate-300">{formatNumber(cat.grandTotal, lang)} {lang === 'ar' ? 'قطعة' : 'pcs'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{lang === 'ar' ? 'حصة السلسلة الكلية:' : 'Chain Share:'}</span>
                    <span className="font-mono text-slate-200">{chainShare}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Long Tail Tab */}
      {activeSubTab === 'longtail' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5 text-rose-400">
                <TrendingDown className="w-4 h-4" />
                <span>{lang === 'ar' ? 'قائمة الموديلات الراكدة (Long-tail: 10 قطع أو أقل)' : 'Long-Tail Styles (≤ 10 units)'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'موديلات بطيئة الحركة تتطلب تخفيض سعري (Markdown) أو تجميعها في فرع شبرا أوتلت' : 'Slow moving inventory needing markdown or outlet consolidation'}
              </p>
            </div>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">
              {longTailStyles.length} {lang === 'ar' ? 'موديل' : 'styles'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {longTailStyles.map(st => (
              <div key={st.styleCode} className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400">{st.styleCode}</span>
                  <span className="font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                    {st.totalUnits} {lang === 'ar' ? 'قطع فقط' : 'units'}
                  </span>
                </div>
                <div className="font-semibold text-slate-200">{st.styleName}</div>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                  {lang === 'ar' ? 'التوصية: ترحيل المخزون المتبقي إلى أوتلت شبرا' : 'Action: Consolidate to Shubra Outlet'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
