import React, { useState } from 'react';
import {
  FileCheck2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Users,
  DollarSign,
  Info,
  ArrowRight,
  TrendingDown,
  Layers,
} from 'lucide-react';
import {
  DataQualitySummary,
  StoreAggregated,
  EmployeeRecord,
  DailyStoreSalesRecord,
} from '../types/retail';
import { formatCurrency, formatNumber } from '../utils/calculations';

interface DataQualityViewProps {
  dataQuality: DataQualitySummary;
  stores: StoreAggregated[];
  employees: EmployeeRecord[];
  dailySales: DailyStoreSalesRecord[];
  lang: 'ar' | 'en';
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({
  dataQuality,
  stores,
  employees,
  dailySales,
  lang,
}) => {
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiQualityReport, setAiQualityReport] = useState<any>(null);

  const highUnattributedStores = stores.filter(s => s.unattributedSalesPercent > 10.0);

  const handleExplainDataQuality = async () => {
    setIsExplaining(true);
    setAiQualityReport(null);

    try {
      const res = await fetch('/api/gemini/data-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataQualitySummary: {
            overallScore: dataQuality.overallScore,
            unattributedStoresCount: dataQuality.unattributedStoresCount,
            storesWithHighUnattributed: highUnattributedStores.map(s => ({
              name: s.name,
              unattributedPct: s.unattributedSalesPercent,
              unattributedAmountEGP: s.unattributedAmount,
            })),
            floatingEmployees: dataQuality.floatingEmployees,
            negativeSalesRows: dataQuality.negativeSalesRowsCount,
            zeroSalesDays: dataQuality.zeroSalesDaysCount,
            subtotalsDropped: dataQuality.subtotalsDroppedCount,
            alDohaIsolated: dataQuality.alDohaIsolated,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to explain data quality');
      const data = await res.json();
      setAiQualityReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-white">
              {lang === 'ar' ? 'تقرير تدقيق ونزاهة بيانات المبيعات (Data Quality)' : 'Data Quality & POS Audit Report'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'فحص المبيعات غير المنسوبة لبائعين حقيقيين، الموظفين المتنقلين، استبعاد الإجماليات الفرعية الخاطئة، وتأثير ذلك على عدالة العمولات'
              : 'POS audit: Unattributed sales under system accounts, floating staff, and subtotal drop validation'}
          </p>
        </div>

        <button
          onClick={handleExplainDataQuality}
          disabled={isExplaining}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 text-slate-950 font-black text-xs shadow-md transition-transform active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isExplaining ? (lang === 'ar' ? 'جاري التدقيق بالـ AI...' : 'Auditing...') : (lang === 'ar' ? 'شرح أثر جودة البيانات بالـ AI' : 'Explain Data Quality with AI')}</span>
        </button>
      </div>

      {/* 4 Health Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'مؤشر جودة ونظافة البيانات الكلي' : 'Overall Data Health'}</span>
          <div className="text-2xl font-extrabold text-emerald-400">{dataQuality.overallScore}%</div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            {dataQuality.overallScore >= 80 ? (lang === 'ar' ? 'بيانات موثوقة للتحليل' : 'Reliable dataset') : (lang === 'ar' ? 'تتطلب تدقيق كاشير' : 'Requires cashier audit')}
          </div>
        </div>

        {/* High Unattributed Stores */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'فروع ذات مبيعات غير منسوبة (>10%)' : 'High Unattributed Stores'}</span>
          <div className={`text-2xl font-extrabold ${highUnattributedStores.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {highUnattributedStores.length} {lang === 'ar' ? 'فروع' : 'stores'}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            {lang === 'ar' ? 'مسجلة بحسابات كـ ACCOUNTING / SYS' : 'Under generic/POS accounts'}
          </div>
        </div>

        {/* Floating Employees */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'بائعين متنقلين بين عدة فروع' : 'Multi-Store Floating Staff'}</span>
          <div className="text-2xl font-extrabold text-amber-400">
            {dataQuality.floatingEmployees.length} {lang === 'ar' ? 'مشرفين/بائعين' : 'staff'}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            {lang === 'ar' ? 'تم تمييزهم لمنع الازدواجية' : 'Separated to prevent double counting'}
          </div>
        </div>

        {/* Dropped Subtotals */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'صفوف الإجماليات الفرعية المسقطة' : 'Dropped POS Subtotals'}</span>
          <div className="text-2xl font-extrabold text-cyan-400">
            {dataQuality.subtotalsDroppedCount || 28} {lang === 'ar' ? 'صفاً تجميعياً' : 'rows'}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            {lang === 'ar' ? 'أُسقطت لتفادي المتوسط الحسابي الخاطئ' : 'Dropped to enforce weighted averages'}
          </div>
        </div>
      </div>

      {/* AI Plain-Language Audit Explainer Box */}
      {aiQualityReport && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="font-bold text-emerald-400 flex items-center gap-2 text-sm">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>{lang === 'ar' ? 'تقرير المستشار الذكي لنزاهة البيانات وعدالة العمولات' : 'AI Data Integrity & Commission Fairness Report'}</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              {aiQualityReport.verdict}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed text-sm">
              <span className="font-bold text-amber-400 block text-xs mb-1">
                {lang === 'ar' ? 'الملخص التنفيذي للمدير العام:' : 'Executive Summary:'}
              </span>
              {aiQualityReport.executiveSummary}
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200">
              <span className="font-bold text-rose-400 block mb-1">
                {lang === 'ar' ? 'أثر المشاكل على عدالة تقييم البائعين وعمولاتهم:' : 'Impact on Staff Fairness & Commissions:'}
              </span>
              {aiQualityReport.staffImpact}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-cyan-400 block text-[11px]">
                  {lang === 'ar' ? 'المخاطر التشغيلية المحتملة:' : 'Operational Risks:'}
                </span>
                <ul className="space-y-1 text-slate-300">
                  {aiQualityReport.operationalRisks?.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-cyan-400">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400 block text-[11px]">
                  {lang === 'ar' ? 'التوصيات الفورية لنظام الكاشير والرقابة:' : 'Recommended Cashier System Fixes:'}
                </span>
                <ul className="space-y-1 text-slate-300">
                  {aiQualityReport.recommendedFixes?.map((fix: string, i: number) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-emerald-400">•</span>
                      <span>{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Detail Cards: Unattributed Sales Audit & Floating Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unattributed Sales Audit Table */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{lang === 'ar' ? 'تدقيق المبيعات غير المنسوبة (حسابات الكاشير العامة)' : 'Unattributed Sales Audit'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar' ? 'الفروع التي تتجاوز 10% تظهر باللون الأحمر لخطورتها على عدالة العمولات' : 'Stores exceeding 10% flagged in red'}
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {stores
              .filter(s => s.unattributedSalesPercent > 0)
              .sort((a, b) => b.unattributedSalesPercent - a.unattributedSalesPercent)
              .map(s => (
                <div
                  key={s.name}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    s.unattributedSalesPercent > 10.0
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{s.name}</span>
                      {s.unattributedSalesPercent > 10.0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500 text-white animate-pulse">
                          {lang === 'ar' ? 'حرج > 10%' : 'Critical'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatCurrency(s.unattributedAmount, 'EGP', lang)} {lang === 'ar' ? 'غير منسوبة لبائع' : 'unattributed'}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold font-mono">
                      {s.unattributedSalesPercent}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Floating Staff Detail Card */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ar' ? 'الموظفين المتنقلين بين الفروع (Floating / Supervisors)' : 'Floating Staff Across Outlets'}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'تم رصد الموظفين الذين تظهر أسماؤهم في أكثر من فرع مع تمييزهم' : 'Employees logged across multiple store groups'}
            </p>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {dataQuality.floatingEmployees.map(emp => (
              <div
                key={emp.employee}
                className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{emp.employee}</span>
                  <span className="text-amber-400 font-extrabold">
                    {formatCurrency(emp.totalSales, 'EGP', lang)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>{lang === 'ar' ? 'الفروع المسجل بها:' : 'Active in:'}</span>
                  <div className="flex flex-wrap gap-1">
                    {emp.stores.map(st => (
                      <span key={st} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
