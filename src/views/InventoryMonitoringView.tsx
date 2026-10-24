import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ArrowRightLeft,
  Tag,
  Download,
  Sparkles,
  DollarSign,
  Clock,
  ChevronRight,
  Info,
  RefreshCw,
  Flame,
  Gauge,
  Store,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InventoryItemRecord, InventoryMovementType, InventorySummaryMetrics } from '../types/retail';
import { computeInventorySummary } from '../utils/inventoryData';

interface InventoryMonitoringViewProps {
  inventoryItems: InventoryItemRecord[];
  lang: 'ar' | 'en';
}

export const InventoryMonitoringView: React.FC<InventoryMonitoringViewProps> = ({
  inventoryItems,
  lang,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovementType | 'all'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'idle_capital_desc' | 'velocity_desc' | 'stock_desc' | 'doi_desc'>('idle_capital_desc');

  // Selected item modal for branch drilldown
  const [selectedItem, setSelectedItem] = useState<InventoryItemRecord | null>(null);

  // Criteria explainer card toggle
  const [showCriteriaGuide, setShowCriteriaGuide] = useState(false);

  // AI Liquidation & Reorder Recommendation state
  const [isGeneratingAiAdvice, setIsGeneratingAiAdvice] = useState(false);
  const [aiAdviceResult, setAiAdviceResult] = useState<{
    title: string;
    targetSegment: string;
    capitalToUnlock: string;
    steps: string[];
    transferDirectives: string[];
  } | null>(null);

  // Compute Metrics Summary
  const summary: InventorySummaryMetrics = useMemo(() => {
    return computeInventorySummary(inventoryItems);
  }, [inventoryItems]);

  // Unique departments for filter
  const departments = useMemo(() => {
    return Array.from(new Set(inventoryItems.map(i => i.department))).filter(Boolean);
  }, [inventoryItems]);

  // Filtered and sorted inventory items
  const filteredItems = useMemo(() => {
    return inventoryItems
      .filter(item => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesSku = item.sku.toLowerCase().includes(q);
          const matchesName = item.name.toLowerCase().includes(q);
          const matchesCat = item.category.toLowerCase().includes(q);
          if (!matchesSku && !matchesName && !matchesCat) return false;
        }

        // Movement Filter
        if (selectedMovement !== 'all' && item.movementType !== selectedMovement) {
          return false;
        }

        // Department Filter
        if (selectedDepartment !== 'all' && item.department !== selectedDepartment) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'idle_capital_desc') return b.idleCapitalValue - a.idleCapitalValue;
        if (sortBy === 'velocity_desc') return b.salesVelocityPerWeek - a.salesVelocityPerWeek;
        if (sortBy === 'stock_desc') return b.currentStockQty - a.currentStockQty;
        if (sortBy === 'doi_desc') return b.daysOfInventory - a.daysOfInventory;
        return 0;
      });
  }, [inventoryItems, searchQuery, selectedMovement, selectedDepartment, sortBy]);

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredItems.map(item => ({
      'كود الصنف SKU': item.sku,
      'اسم الموديل': item.name,
      'القسم': item.department,
      'التصنيف': item.category,
      'حالة الحركة': item.movementType === 'moving' ? 'سريع الحركة' : item.movementType === 'normal' ? 'طبيعي الحركة' : 'راكد / غير متحرك',
      'المخزون الحالي (قطعة)': item.currentStockQty,
      'المبيعات في 30 يوم (قطعة)': item.soldQty30Days,
      'معدل المبيعات الأسبوعي': item.salesVelocityPerWeek,
      'أيام تغطية المخزون (DOI)': item.daysOfInventory,
      'سعر التكلفة (ج.م)': item.unitCost,
      'سعر البيع (ج.م)': item.retailPrice,
      'إجمالي قيمة المخزون (ج.م)': item.totalStockValue,
      'رأس المال المجمد (ج.م)': item.idleCapitalValue,
      'أيام بدون بيع': item.daysWithoutSale,
      'تاريخ آخر بيع': item.lastSoldDate,
      'التوصية التشغيلية': item.actionRecommendation,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'مراقبة حركة المخزون');
    XLSX.writeFile(wb, `Inventory_Velocity_Monitoring_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // AI Liquidation Advisor trigger
  const handleGenerateLiquidationAdvice = () => {
    setIsGeneratingAiAdvice(true);
    setAiAdviceResult(null);

    setTimeout(() => {
      setAiAdviceResult({
        title: 'خطة تسييل وتحرير رأس المال المجمد للأصناف الراكدة',
        targetSegment: 'الأصناف غير المتحركة (Non-Moving Stock)',
        capitalToUnlock: `${summary.idleCapitalTiedUp.toLocaleString()} ج.م`,
        steps: [
          'تطبيق حزمة ترويجية (Bundle): ربط البنطلونات أو الفساتين الراكدة (مثل 80476 و B142) مع بلوزة سريعة الحركة بخصم 35% على القطعة الثانية.',
          'تخفيض فوري بنسبة 30% للأصناف التي تجاوزت 60 يوماً بدون بيع، لتقليل تكلفة التخزين وتفادي تقادم الموديلات.',
          'استغلال فرع أوتلت شبرا وفرع الفيوم لتصريف الأصناف منخفضة الدوران بأسعار تصفية سريعة.',
          'إيقاف أي طلبيات جديدة أو إعادة إنتاج للأصناف التي يقل دورانها عن 5 قطع شهرياً.',
        ],
        transferDirectives: [
          'تحويل 45 قطعة من البنطلونات التركية الراكدة في الفروع الإقليمية إلى فرع مول العرب وسيتي ستارز والإسكندرية.',
          'تجميع مخزون العبايات الراكدة ونقله إلى فرعي طنطا وقنا حيث الإقبال على الملابس المحتشمة أعلى بنسبة 40%.',
        ],
      });
      setIsGeneratingAiAdvice(false);
    }, 400);
  };

  // Helpers for Movement Badge
  const getMovementBadge = (type: InventoryMovementType) => {
    switch (type) {
      case 'moving':
        return {
          labelAr: 'سريع الحركة (Moving)',
          labelEn: 'Fast Moving',
          color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: <Flame className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'normal':
        return {
          labelAr: 'طبيعي الحركة (Normal)',
          labelEn: 'Normal Moving',
          color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          dot: 'bg-cyan-400',
          icon: <Gauge className="w-3.5 h-3.5 text-cyan-400" />
        };
      case 'non_moving':
        return {
          labelAr: 'راكد / غير متحرك (Non-Moving)',
          labelEn: 'Non-Moving / Dead',
          color: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-400',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        };
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Inventory Velocity & Health
            </span>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'تصنيف حركة المخزون ورأس المال المجمد' : 'Stock Movement & Idle Capital'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-400" />
            <span>{lang === 'ar' ? 'مراقبة حركة المخزون (سريع / طبيعي / راكد)' : 'Inventory Monitoring & Velocity'}</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            {lang === 'ar'
              ? 'مراقبة حية لدوران البضاعة وسرعة البيع؛ تصنيف الأصناف إلى سريعة الحركة (Moving) لتفادي نفاد المخزون، وطبيعية (Normal)، وراكدة (Non-Moving) لكشف وتسييل رأس المال المجمد.'
              : 'Live inventory velocity monitoring categorizing SKUs into Moving, Normal, and Non-Moving items to eliminate stockouts and liberate idle working capital.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCriteriaGuide(!showCriteriaGuide)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <Info className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'ar' ? 'معايير سرعة الحركة' : 'Velocity Criteria Guide'}</span>
            {showCriteriaGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تصدير إكسيل (Excel)' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Movement Criteria Explainer Card (Expandable) */}
      {showCriteriaGuide && (
        <div className="p-5 rounded-2xl bg-slate-900/95 border border-amber-500/30 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                {lang === 'ar' ? 'معايير تصنيف حركة المخزون ومؤشرات الأداء:' : 'Inventory Movement Classification Criteria:'}
              </h3>
            </div>
            <span className="text-[11px] text-amber-400 font-mono">Days of Inventory (DOI) & Weekly Velocity</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Moving */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4" /> Moving Items (سريعة الحركة)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                  {summary.movingCount} صنف SKU
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong>المعيار:</strong> سرعة بيع عالية (مبيعات &ge; 40 قطعة شهرياً أو أيام تغطية المخزون DOI &le; 25 يوماً).
              </p>
              <div className="p-2 rounded bg-emerald-950/40 text-emerald-300/90 text-[11px]">
                <strong>التوجيه التشغيلي:</strong> خطر نفاد المخزون (Out-of-Stock)؛ استمرار التوريد العاجل لضمان عدم ضياع المبيعات.
              </div>
            </div>

            {/* Normal */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-cyan-400 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" /> Normal Items (طبيعية الحركة)
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[11px]">
                  {summary.normalCount} صنف SKU
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong>المعيار:</strong> سرعة دوران متوازنة (مبيعات 10-39 قطعة شهرياً أو أيام تغطية المخزون DOI بين 25 و 65 يوماً).
              </p>
              <div className="p-2 rounded bg-cyan-950/40 text-cyan-300/90 text-[11px]">
                <strong>التوجيه التشغيلي:</strong> دوران صحي؛ الالتزام بدورة التوريد الأسبوعية المجدولة دون ضغط استثنائي.
              </div>
            </div>

            {/* Non-Moving */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Non-Moving Items (راكدة / عديمة الحركة)
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[11px]">
                  {summary.nonMovingCount} صنف SKU
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong>المعيار:</strong> مبيعات ضعيفة جداً أو معدومة (أقل من 5 قطع شهرياً أو أيام تغطية DOI &gt; 65 يوماً أو ركود &gt; 30 يوماً).
              </p>
              <div className="p-2 rounded bg-rose-950/40 text-rose-300/90 text-[11px]">
                <strong>التوجيه التشغيلي:</strong> تحرير رأس المال المجمد فوراَ عبر عروض الحزم (Bundles)، التخفيضات (Markdown)، أو النقل لفروع الأوتلت.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total SKUs & Valuation */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5 text-cyan-400" />
            {lang === 'ar' ? 'إجمالي الأصناف بالمخازن' : 'Total Network SKUs'}
          </span>
          <div className="text-xl font-black text-white">{summary.totalSkus} صنف</div>
          <span className="text-[10px] text-slate-500">
            {summary.totalStockUnits.toLocaleString()} {lang === 'ar' ? 'قطعة بالمستودعات' : 'units on hand'}
          </span>
        </div>

        {/* Moving Items */}
        <div
          onClick={() => setSelectedMovement(selectedMovement === 'moving' ? 'all' : 'moving')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedMovement === 'moving'
              ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
              <Flame className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'سريعة الحركة' : 'Fast Moving'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              {summary.movingUnits} قطعة
            </span>
          </div>
          <div className="text-xl font-black text-emerald-300 mt-1">{summary.movingCount}</div>
          <span className="text-[10px] text-slate-400">
            {summary.movingValue.toLocaleString()} ج.م {lang === 'ar' ? 'قيمة مبيعات متدفقة' : 'active value'}
          </span>
        </div>

        {/* Normal Items */}
        <div
          onClick={() => setSelectedMovement(selectedMovement === 'normal' ? 'all' : 'normal')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedMovement === 'normal'
              ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-cyan-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-cyan-400 flex items-center gap-1 font-bold">
              <Gauge className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'طبيعية الحركة' : 'Normal Moving'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
              {summary.normalUnits} قطعة
            </span>
          </div>
          <div className="text-xl font-black text-cyan-300 mt-1">{summary.normalCount}</div>
          <span className="text-[10px] text-slate-400">
            {lang === 'ar' ? 'دوران متزن ومستقر' : 'Healthy equilibrium'}
          </span>
        </div>

        {/* Non-Moving / Dead Stock */}
        <div
          onClick={() => setSelectedMovement(selectedMovement === 'non_moving' ? 'all' : 'non_moving')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedMovement === 'non_moving'
              ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-rose-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-rose-400 flex items-center gap-1 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'الأصناف الراكدة' : 'Non-Moving'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
              {summary.nonMovingUnits} قطعة
            </span>
          </div>
          <div className="text-xl font-black text-rose-300 mt-1">{summary.nonMovingCount}</div>
          <span className="text-[10px] text-rose-400/90 font-medium">
            {summary.deadStockRatioPercent}% {lang === 'ar' ? 'من وحدات المخزون' : 'of inventory'}
          </span>
        </div>

        {/* Tied-up Idle Capital (Crucial Metric!) */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/40 space-y-1">
          <span className="text-[11px] text-rose-300 flex items-center gap-1 font-bold">
            <DollarSign className="w-3.5 h-3.5 text-rose-400" />
            {lang === 'ar' ? 'رأس المال المجمد (بالراكد)' : 'Idle Capital Tied Up'}
          </span>
          <div className="text-xl font-black text-rose-300">
            {summary.idleCapitalTiedUp.toLocaleString()} ج.م
          </div>
          <span className="text-[10px] text-slate-400">
            {lang === 'ar' ? 'سيولة معطلة تحتاج تسييل' : 'Locked cash in dead stock'}
          </span>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sorters */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث برمز الصنف SKU أو اسم الموديل...' : 'Search by SKU or style name...'}
            className="bg-transparent text-slate-100 placeholder-slate-500 outline-none w-full text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Movement Chips */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'all', labelAr: 'الكل', labelEn: 'All' },
              { id: 'moving', labelAr: '🚀 سريعة الحركة', labelEn: 'Moving' },
              { id: 'normal', labelAr: '⚖️ طبيعية', labelEn: 'Normal' },
              { id: 'non_moving', labelAr: '⚠️ راكدة', labelEn: 'Non-Moving' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedMovement(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedMovement === tab.id
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'ar' ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'كافة الأقسام' : 'All Departments'}
              </option>
              {departments.map(d => (
                <option key={d} value={d} className="bg-slate-900 text-slate-200">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Sorter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px]">{lang === 'ar' ? 'ترتيب:' : 'Sort:'}</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-medium"
            >
              <option value="idle_capital_desc" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'الأعلى رأس مال مجمد' : 'Highest Idle Capital'}
              </option>
              <option value="velocity_desc" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'الأسرع حركة ومبيعاً' : 'Fastest Velocity'}
              </option>
              <option value="stock_desc" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'الأعلى مخزوناً بالمستودع' : 'Highest Stock Units'}
              </option>
              <option value="doi_desc" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'الأطول أيام تغطية DOI' : 'Longest DOI'}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Liquidation & Reorder Advice Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/40 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'المستشار الذكي لتسييل المخزون الراكد وتفادي النفاد' : 'AI Stock Liquidation & Reorder Advisor'}
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'توليد توصيات فورية لفك السيولة المعطلة في الأصناف الراكدة واقتراح تحويلات بين الفروع لتسريع المبيعات.'
              : 'Generate automated liquidation plans to recover tied-up capital and balance branch stock.'}
          </p>
        </div>

        <button
          onClick={handleGenerateLiquidationAdvice}
          disabled={isGeneratingAiAdvice}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>{lang === 'ar' ? 'توليد خطة تسييل رأس المال المجمد' : 'Generate Liquidation Plan'}</span>
        </button>
      </div>

      {/* AI Liquidation Result Card */}
      {aiAdviceResult && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-4 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold text-xs">
                {aiAdviceResult.targetSegment}
              </span>
              <h4 className="text-sm font-bold text-white">{aiAdviceResult.title}</h4>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-300 font-bold">
                {lang === 'ar' ? 'السيولة المستهدفة للتحرير:' : 'Target Capital to Unlock:'} {aiAdviceResult.capitalToUnlock}
              </span>
              <button onClick={() => setAiAdviceResult(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Action Directives */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-amber-400 block text-xs flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'الإجراءات الترويجية والتسعيرية المقترحة:' : 'Promotional & Pricing Directives:'}
              </span>
              <ul className="space-y-1.5 list-disc list-inside text-slate-300 text-[11px] leading-relaxed">
                {aiAdviceResult.steps.map((st, idx) => (
                  <li key={idx} className="pl-1">{st}</li>
                ))}
              </ul>
            </div>

            {/* Inter-Branch Transfer Directives */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="font-bold text-cyan-400 block text-xs flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'توجيهات المناقلة بين الفروع (Inter-Branch Transfers):' : 'Inter-Branch Transfer Directives:'}
              </span>
              <ul className="space-y-1.5 list-disc list-inside text-slate-300 text-[11px] leading-relaxed">
                {aiAdviceResult.transferDirectives.map((td, idx) => (
                  <li key={idx} className="pl-1">{td}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Velocity Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              {lang === 'ar' ? 'جدول حركة ومخزون الأصناف' : 'Inventory SKU Velocity Table'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px]">
              {filteredItems.length} {lang === 'ar' ? 'صنف مطابق' : 'matching SKUs'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {lang === 'ar' ? 'اضغط على أي صنف لعرض توزيع المخزون بالفروع والتوصية' : 'Click on any SKU for branch distribution and action plan'}
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {lang === 'ar' ? 'لا توجد أصناف تطابق معايير البحث والفلترة.' : 'No SKUs match the current criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الصنف SKU' : 'SKU & Style'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'القسم / التصنيف' : 'Department'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'حالة الحركة' : 'Movement Status'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'المخزون بالمستودع' : 'Stock Qty'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'مبيعات 30 يوم' : '30D Sales'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'السرعة الأسبوعية' : 'Weekly Velocity'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'تغطية DOI' : 'DOI'}</th>
                  <th className="py-3 px-4 text-left">{lang === 'ar' ? 'قيمة المخزون' : 'Stock Value'}</th>
                  <th className="py-3 px-4 text-left">{lang === 'ar' ? 'رأس المال المجمد' : 'Idle Capital'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'التوصية التشغيلية' : 'Action Plan'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map(item => {
                  const badge = getMovementBadge(item.movementType);

                  return (
                    <tr
                      key={item.sku}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      {/* SKU & Name */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-cyan-400 font-bold text-xs block group-hover:text-amber-400 transition-colors">
                            {item.sku}
                          </span>
                          <span className="text-white font-medium text-xs block">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* Department & Category */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="text-slate-200 text-xs font-semibold block">{item.department}</span>
                          <span className="text-slate-500 text-[11px] block">{item.category}</span>
                        </div>
                      </td>

                      {/* Movement Status Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.color}`}>
                          {badge.icon}
                          <span>{lang === 'ar' ? badge.labelAr : badge.labelEn}</span>
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                          {item.currentStockQty}
                        </span>
                      </td>

                      {/* Sold Qty 30 Days */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-300">
                        {item.soldQty30Days}
                      </td>

                      {/* Weekly Velocity */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-mono text-xs font-bold ${
                          item.salesVelocityPerWeek >= 20
                            ? 'text-emerald-400'
                            : item.salesVelocityPerWeek >= 5
                            ? 'text-cyan-400'
                            : 'text-rose-400'
                        }`}>
                          {item.salesVelocityPerWeek} / أسبوع
                        </span>
                      </td>

                      {/* DOI */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs">
                        <span className={`${
                          item.daysOfInventory <= 20
                            ? 'text-amber-400 font-bold'
                            : item.daysOfInventory <= 60
                            ? 'text-slate-300'
                            : 'text-rose-400 font-bold'
                        }`}>
                          {item.daysOfInventory >= 900 ? '∞' : `${item.daysOfInventory} يوم`}
                        </span>
                      </td>

                      {/* Stock Value */}
                      <td className="py-3.5 px-4 text-left font-mono text-xs text-slate-200 font-bold">
                        {item.totalStockValue.toLocaleString()} ج.م
                      </td>

                      {/* Idle Capital */}
                      <td className="py-3.5 px-4 text-left font-mono text-xs">
                        {item.idleCapitalValue > 0 ? (
                          <span className="text-rose-400 font-black">
                            {item.idleCapitalValue.toLocaleString()} ج.م
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Action Plan */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] text-slate-300 line-clamp-1 group-hover:text-amber-300 transition-colors">
                          {item.actionRecommendation}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Item Drilldown Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getMovementBadge(selectedItem.movementType).color}`}>
                    {getMovementBadge(selectedItem.movementType).icon}
                    {lang === 'ar' ? getMovementBadge(selectedItem.movementType).labelAr : getMovementBadge(selectedItem.movementType).labelEn}
                  </span>
                  <span className="font-mono text-cyan-400 font-bold text-xs">{selectedItem.sku}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{selectedItem.name}</h3>
                <span className="text-xs text-slate-400">{selectedItem.department} • {selectedItem.category}</span>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">المخزون الحالي:</span>
                <span className="text-base font-black text-white">{selectedItem.currentStockQty} قطعة</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">مبيعات آخر 30 يوماً:</span>
                <span className="text-base font-black text-emerald-400">{selectedItem.soldQty30Days} قطعة</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">سعر البيع / التكلفة:</span>
                <span className="text-xs font-bold text-amber-300 block">{selectedItem.retailPrice} ج.م بيع</span>
                <span className="text-[10px] text-slate-400 font-mono">{selectedItem.unitCost} ج.م تكلفة</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">رأس المال المجمد:</span>
                <span className="text-base font-black text-rose-400">
                  {selectedItem.idleCapitalValue > 0 ? `${selectedItem.idleCapitalValue.toLocaleString()} ج.م` : 'لا يوجد'}
                </span>
              </div>
            </div>

            {/* Action Directive */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {lang === 'ar' ? 'التوصية التشغيلية والإدارية للصنف:' : 'Operational Recommendation:'}
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">{selectedItem.actionRecommendation}</p>
            </div>

            {/* Branch Stock Distribution */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Store className="w-4 h-4 text-cyan-400" />
                {lang === 'ar' ? 'توزيع المخزون في الفروع الرئيسية:' : 'Stock Distribution Across Top Branches:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedItem.topStockBranches.map(b => (
                  <div key={b.storeName} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300">{b.storeName}</span>
                    <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-[11px]">{b.qty} قطعة</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
