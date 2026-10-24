import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  FileSpreadsheet,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  compute30DaySalesForecast,
  formatCurrency,
  formatNumber,
  formatPercent,
  SalesForecastResult,
} from '../utils/calculations';
import { exportTableToExcel } from '../utils/exportUtils';
import { DailyStoreSalesRecord } from '../types/retail';

interface PredictiveSalesForecastProps {
  dailySales: DailyStoreSalesRecord[];
  lang: 'ar' | 'en';
}

export const PredictiveSalesForecast: React.FC<PredictiveSalesForecastProps> = ({
  dailySales,
  lang,
}) => {
  const [scenario, setScenario] = useState<'baseline' | 'optimistic' | 'conservative'>('baseline');
  const [viewMode, setViewMode] = useState<'combined' | 'forecast_only'>('combined');
  const [selectedStore, setSelectedStore] = useState<string>('all');

  // Multiplier based on scenario
  const scenarioMultiplier = scenario === 'optimistic' ? 1.10 : scenario === 'conservative' ? 0.90 : 1.0;

  // Filter daily sales if single store is selected
  const filteredDaily = useMemo(() => {
    if (selectedStore === 'all') return dailySales;
    return dailySales.filter(d => d.storeName === selectedStore);
  }, [dailySales, selectedStore]);

  // Aggregate daily sales across stores
  const historicalDailyPoints = useMemo(() => {
    const dailyMap = new Map<string, number>();
    filteredDaily.forEach(d => {
      dailyMap.set(d.dateStr, (dailyMap.get(d.dateStr) || 0) + d.extPrice);
    });
    return Array.from(dailyMap.entries())
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredDaily]);

  // Compute forecast
  const forecastResult: SalesForecastResult = useMemo(() => {
    return compute30DaySalesForecast(historicalDailyPoints, scenarioMultiplier, lang);
  }, [historicalDailyPoints, scenarioMultiplier, lang]);

  // Last historical date for transition reference line
  const lastHistoricalPoint = useMemo(() => {
    const historicals = forecastResult.timeline.filter(t => !t.isForecast);
    return historicals[historicals.length - 1];
  }, [forecastResult.timeline]);

  // Chart data according to view mode
  const chartData = useMemo(() => {
    if (viewMode === 'forecast_only') {
      return forecastResult.timeline.filter(t => t.isForecast);
    }
    return forecastResult.timeline;
  }, [forecastResult.timeline, viewMode]);

  // Export forecast to Excel
  const handleExportForecast = () => {
    const rows = forecastResult.timeline
      .filter(t => t.isForecast)
      .map(t => ({
        'Forecast Date': t.date,
        'Day': lang === 'ar' ? t.dayNameAr : t.dayNameEn,
        'Scenario': scenario.toUpperCase(),
        'Predicted Sales (EGP)': t.predictedSales,
        'Conservative Bound (Lower)': t.lowerBound,
        'Optimistic Bound (Upper)': t.upperBound,
      }));
    exportTableToExcel(rows, `Sales_Forecast_30Days_${scenario}`, 'Forecast');
  };

  // Unique stores list
  const uniqueStores = useMemo(() => {
    return Array.from(new Set(dailySales.map(d => d.storeName))).sort();
  }, [dailySales]);

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>{lang === 'ar' ? 'التنبؤ الذكي بحركة المبيعات للـ 30 يوماً القادمة' : '30-Day Predictive Sales Forecast'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {lang === 'ar' ? 'نموذج التوقع الإحصائي' : 'AI Pattern Engine'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === 'ar'
                  ? 'مبني على تحليل السلاسل الزمنية، وتكرار أيام الأسبوع (الجمعة/السبت)، والانحدار الخطي لمبيعات السلسلة'
                  : 'Time-series projection factoring day-of-week seasonality (Friday/Saturday spikes) and historical run-rate'}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Store Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-medium">{lang === 'ar' ? 'الفرع:' : 'Store:'}</span>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="bg-transparent text-amber-400 font-bold outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'إجمالي السلسلة (كافة الفروع)' : 'Entire Chain (All Stores)'}
              </option>
              {uniqueStores.map(name => (
                <option key={name} value={name} className="bg-slate-900 text-slate-200">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 font-semibold">
            <button
              onClick={() => setScenario('conservative')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                scenario === 'conservative'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'متحفظ (-10%)' : 'Conservative (-10%)'}
            </button>
            <button
              onClick={() => setScenario('baseline')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                scenario === 'baseline'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'الأساسي (Baseline)' : 'Baseline'}
            </button>
            <button
              onClick={() => setScenario('optimistic')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                scenario === 'optimistic'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'تفاؤلي (+10%)' : 'Optimistic (+10%)'}
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'combined'
                  ? 'bg-slate-800 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'الفترة مع التوقع' : 'Combined'}
            </button>
            <button
              onClick={() => setViewMode('forecast_only')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'forecast_only'
                  ? 'bg-slate-800 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'الـ 30 يوماً فقط' : 'Next 30 Days'}
            </button>
          </div>

          {/* Export Forecast Button */}
          <button
            onClick={handleExportForecast}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors font-medium"
            title={lang === 'ar' ? 'تصدير جدول التوقعات إلى Excel' : 'Export forecast table to Excel'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'تصدير التوقع' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* 4 Forecast Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Projected Revenue */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">
            {lang === 'ar' ? 'المبيعات المتوقعة (30 يوماً)' : 'Projected 30-Day Revenue'}
          </div>
          <div className="text-base sm:text-lg font-black text-cyan-400">
            {formatCurrency(forecastResult.totalForecastRevenue, 'EGP', lang)}
          </div>
          <div className="text-[10px] flex items-center gap-1 font-semibold">
            <span className={forecastResult.growthVsHistoricalPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {formatPercent(forecastResult.growthVsHistoricalPercent, lang)}
            </span>
            <span className="text-slate-500 font-normal">
              {lang === 'ar' ? 'مقارنة بالفترة السابقة' : 'vs past 30 days'}
            </span>
          </div>
        </div>

        {/* Expected Daily Run-Rate */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">
            {lang === 'ar' ? 'المعدل اليومي المتوقع' : 'Expected Daily Run-Rate'}
          </div>
          <div className="text-base sm:text-lg font-black text-white">
            {formatCurrency(forecastResult.avgDailyForecast, 'EGP', lang)}
          </div>
          <div className="text-[10px] text-slate-400">
            {lang === 'ar' ? 'لكل يوم تشغيلي' : 'average per business day'}
          </div>
        </div>

        {/* Peak Projected Day */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">
            {lang === 'ar' ? 'يوم الذروة المتوقع' : 'Peak Projected Day'}
          </div>
          <div className="text-base sm:text-lg font-black text-amber-400 truncate">
            {forecastResult.peakForecastDay.dayName}{' '}
            <span className="text-xs font-normal text-slate-400">
              ({forecastResult.peakForecastDay.date ? forecastResult.peakForecastDay.date.split('-').slice(1).join('/') : '-'})
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {formatCurrency(forecastResult.peakForecastDay.sales, 'EGP', lang)}
          </div>
        </div>

        {/* Weekend Seasonality Uplift */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">
            {lang === 'ar' ? 'معامل عطلة الأسبوع بمصر' : 'Weekend Seasonality Surge'}
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-400">
            +62% إلى +68%
          </div>
          <div className="text-[10px] text-slate-400">
            {lang === 'ar' ? 'ذروة يومي الجمعة والسبت' : 'Friday & Saturday peak factor'}
          </div>
        </div>
      </div>

      {/* Recharts Predictive Visualization */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
            <defs>
              {/* Confidence Band Gradient */}
              <linearGradient id="forecastBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.03} />
              </linearGradient>

              {/* Historical Area Gradient */}
              <linearGradient id="actualSalesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />

            <XAxis
              dataKey="dayLabel"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              interval={Math.ceil(chartData.length / 15)}
            />

            <YAxis
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              tickFormatter={val => `${Math.round(val / 1000)}k`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '11px',
                color: '#f8fafc',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
              }}
              formatter={(value: any, name: any, item: any) => {
                const num = Number(value);
                if (name === 'actualSales') {
                  return [formatCurrency(num, 'EGP', lang), lang === 'ar' ? 'المبيعات الفعلية المحققة' : 'Actual Sales'];
                }
                if (name === 'predictedSales') {
                  return [formatCurrency(num, 'EGP', lang), lang === 'ar' ? 'المبيعات المتوقعة (Forecast)' : 'Predicted Sales'];
                }
                if (name === 'upperBound') {
                  return [formatCurrency(num, 'EGP', lang), lang === 'ar' ? 'الحد التفاؤلي المتوقع (Upper)' : 'Upper Bound'];
                }
                if (name === 'lowerBound') {
                  return [formatCurrency(num, 'EGP', lang), lang === 'ar' ? 'الحد المتحفظ المتوقع (Lower)' : 'Lower Bound'];
                }
                return [value, name];
              }}
              labelFormatter={(label, items) => {
                const item = items?.[0]?.payload;
                const day = item ? (lang === 'ar' ? item.dayNameAr : item.dayNameEn) : '';
                const date = item?.date || label;
                const status = item?.isForecast
                  ? (lang === 'ar' ? '🔮 توقع مستقبلي' : '🔮 Forecast')
                  : (lang === 'ar' ? '📊 بيانات فعلية' : '📊 Actual');
                return `${date} (${day}) • ${status}`;
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              formatter={(value) => {
                if (value === 'actualSales') return lang === 'ar' ? 'المبيعات الفعلية (سجل الشهر)' : 'Actual Sales';
                if (value === 'predictedSales') return lang === 'ar' ? 'المبيعات المتوقعة (30 يوماً)' : 'Forecast Trend';
                if (value === 'upperBound') return lang === 'ar' ? 'نطاق الثقة التفاؤلي' : 'Upper Confidence';
                if (value === 'lowerBound') return lang === 'ar' ? 'نطاق الثقة المتحفظ' : 'Lower Confidence';
                return value;
              }}
            />

            {/* Transition Line from Historical to Forecast */}
            {lastHistoricalPoint && viewMode === 'combined' && (
              <ReferenceLine
                x={lastHistoricalPoint.dayLabel}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: lang === 'ar' ? 'نقطة بداية التوقع' : 'Forecast Start',
                  fill: '#38bdf8',
                  fontSize: 10,
                  position: 'top',
                }}
              />
            )}

            {/* Upper Bound Confidence Area */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="#06b6d4"
              strokeDasharray="3 3"
              strokeWidth={1}
              fill="url(#forecastBandGrad)"
              name="upperBound"
              connectNulls
            />

            {/* Lower Bound Confidence Line */}
            <Line
              type="monotone"
              dataKey="lowerBound"
              stroke="#0891b2"
              strokeDasharray="2 2"
              strokeWidth={1}
              dot={false}
              name="lowerBound"
              connectNulls
            />

            {/* Actual Historical Line */}
            <Area
              type="monotone"
              dataKey="actualSales"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fill="url(#actualSalesGrad)"
              name="actualSales"
              dot={{ r: 2, fill: '#f59e0b' }}
            />

            {/* Predicted Forecast Line */}
            <Line
              type="monotone"
              dataKey="predictedSales"
              stroke="#06b6d4"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              name="predictedSales"
              dot={{ r: 3, fill: '#06b6d4' }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory Caption Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'الخط المتقطع بالأزرق يوضح الاتجاه المتوقع مع مراعاة قمم عطلات نهاية الأسبوع وتأثير الركود في منتصف الأسبوع بمصر.'
              : 'Dashed cyan line shows predicted daily revenue incorporating weekend footfall peaks and midweek dips in Egypt.'}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>{lang === 'ar' ? 'فترة سابقة' : 'Historical'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>{lang === 'ar' ? 'توقع الـ 30 يوماً' : '30-Day Forecast'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
