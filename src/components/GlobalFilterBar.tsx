import React from 'react';
import {
  Calendar,
  Building2,
  Layers,
  Tag,
  RotateCcw,
  LayoutDashboard,
  Store,
  Users,
  UserCheck,
  ShoppingBag,
  BotMessageSquare,
  TrendingUp,
  FileCheck2,
  SlidersHorizontal,
  Boxes,
  Contact,
} from 'lucide-react';
import { FilterState, ActiveTab, StoreSegment } from '../types/retail';
import { STORE_NAMES_LIST } from '../utils/sampleData';

interface GlobalFilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  lang: 'ar' | 'en';
  departmentsList: string[];
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  onFilterChange,
  activeTab,
  onTabChange,
  lang,
  departmentsList,
}) => {
  const tabs: { id: ActiveTab; labelAr: string; labelEn: string; icon: React.ReactNode }[] = [
    { id: 'overview', labelAr: 'النظرة التنفيذية', labelEn: 'Executive Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'branches', labelAr: 'أداء الفروع (27)', labelEn: 'Branch Performance', icon: <Store className="w-4 h-4" /> },
    { id: 'salespeople', labelAr: 'بطاقة البائعين والتدريب', labelEn: 'Salesperson Scorecard', icon: <Users className="w-4 h-4" /> },
    { id: 'store_manager', labelAr: 'رؤية مدير الفرع', labelEn: 'Store Manager View', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'category_assortment', labelAr: 'التشكيلة والموديلات', labelEn: 'Category & Styles', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'customers', labelAr: 'سجلات ودورة العملاء', labelEn: 'Customer Lifecycle', icon: <Contact className="w-4 h-4 text-emerald-400" /> },
    { id: 'inventory', labelAr: 'مراقبة حركة المخزون', labelEn: 'Inventory Velocity', icon: <Boxes className="w-4 h-4 text-amber-400" /> },
    { id: 'ai_advisor', labelAr: 'المستشار الذكي (AI Chat)', labelEn: 'AI Advisor', icon: <BotMessageSquare className="w-4 h-4 text-amber-400" /> },
    { id: 'competitors', labelAr: 'استخبارات المنافسين', labelEn: 'Competitor Intel', icon: <TrendingUp className="w-4 h-4 text-cyan-400" /> },
    { id: 'data_quality', labelAr: 'تقرير تدقيق البيانات', labelEn: 'Data Quality', icon: <FileCheck2 className="w-4 h-4 text-emerald-400" /> },
    { id: 'settings', labelAr: 'الإعدادات والعملات', labelEn: 'Settings & Targets', icon: <SlidersHorizontal className="w-4 h-4" /> },
  ];

  const handleReset = () => {
    onFilterChange({
      dateRange: 'full',
      store: 'all',
      segment: 'all',
      department: 'all',
    });
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 sticky top-16 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                }`}
              >
                {tab.icon}
                <span>{lang === 'ar' ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Filters Controls Row */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {lang === 'ar' ? 'الفلاتر النشطة:' : 'Global Filters:'}
            </span>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filters.dateRange}
                onChange={e => onFilterChange({ ...filters, dateRange: e.target.value })}
                className="bg-transparent text-slate-200 outline-none cursor-pointer pr-2 text-xs"
              >
                <option value="full" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'الشهر كاملاً (أغسطس 2026)' : 'Full Month (Aug 2026)'}
                </option>
                <option value="h1" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'النصف الأول (H1: 1-15)' : 'First Half (H1: 1-15)'}
                </option>
                <option value="h2" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'النصف الثاني (H2: 16-31)' : 'Second Half (H2: 16-31)'}
                </option>
                <option value="last7" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'آخر 7 أيام (25-31)' : 'Last 7 Days (25-31)'}
                </option>
              </select>
            </div>

            {/* Store Segment Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filters.segment}
                onChange={e => onFilterChange({ ...filters, segment: e.target.value, store: 'all' })}
                className="bg-transparent text-slate-200 outline-none cursor-pointer pr-2 text-xs"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'كافة الشرائح (All Segments)' : 'All Segments'}
                </option>
                <option value="Mall" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'مولات ومراكز تجارية (Malls)' : 'Mall Stores'}
                </option>
                <option value="Governorate" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'فروع المحافظات والأقاليم' : 'Governorate Stores'}
                </option>
                <option value="Outlet" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'أوتلت (شبرا)' : 'Outlet (Shubra)'}
                </option>
                <option value="Online" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'متجر إلكتروني (Online)' : 'Online Store'}
                </option>
                <option value="International" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'فرع دولي (الدوحة)' : 'International (Al Doha)'}
                </option>
              </select>
            </div>

            {/* Store Specific Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filters.store}
                onChange={e => onFilterChange({ ...filters, store: e.target.value })}
                className="bg-transparent text-slate-200 outline-none cursor-pointer pr-2 text-xs max-w-[150px] truncate"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'كافة الفروع (27 فرعاً)' : 'All 27 Stores'}
                </option>
                {STORE_NAMES_LIST.map(s => (
                  <option key={s} value={s} className="bg-slate-900 text-slate-200">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filters.department}
                onChange={e => onFilterChange({ ...filters, department: e.target.value })}
                className="bg-transparent text-slate-200 outline-none cursor-pointer pr-2 text-xs"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'كافة الأقسام (All Depts)' : 'All Departments'}
                </option>
                {departmentsList.map(dept => (
                  <option key={dept} value={dept} className="bg-slate-900 text-slate-200">
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          {(filters.store !== 'all' || filters.segment !== 'all' || filters.department !== 'all' || filters.dateRange !== 'full') && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors text-xs font-semibold px-2 py-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
