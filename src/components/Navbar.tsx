import React from 'react';
import {
  Store,
  Upload,
  ShieldAlert,
  Globe,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  Users
} from 'lucide-react';
import { ChainMetrics, AlertItem } from '../types/retail';
import { formatCurrency, formatNumber } from '../utils/calculations';

interface NavbarProps {
  chainMetrics: ChainMetrics;
  alerts: AlertItem[];
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onOpenUpload: () => void;
  onResetSampleData: () => void;
  isSampleData: boolean;
  onOpenAlerts: () => void;
  dataQualityScore: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  chainMetrics,
  alerts,
  lang,
  onToggleLang,
  onOpenUpload,
  onResetSampleData,
  isSampleData,
  onOpenAlerts,
  dataQualityScore,
}) => {
  const criticalAlertsCount = alerts.filter(a => a.type === 'critical').length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white font-sans">
                  {lang === 'ar' ? 'مركز قيادة التجزئة' : 'Retail Command Center'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  {lang === 'ar' ? 'مصر • 27 فرعاً' : 'Egypt • 27 Stores'}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {lang === 'ar'
                  ? 'منظومة دعم القرار والتحليلات الذكية لسلاسل الأزياء النسائية'
                  : 'Decision-support & analytics for fashion retail'}
              </p>
            </div>
          </div>

          {/* Quick Metrics Glance */}
          <div className="hidden lg:flex items-center gap-6 px-4 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-center">
              <div className="text-[11px] text-slate-400 font-medium">
                {lang === 'ar' ? 'إجمالي المبيعات' : 'Total Net Sales'}
              </div>
              <div className="text-sm font-bold text-amber-400">
                {formatCurrency(chainMetrics.totalSales, 'EGP', lang)}
              </div>
            </div>

            <div className="h-6 w-[1px] bg-slate-800" />

            <div className="text-center">
              <div className="text-[11px] text-slate-400 font-medium">
                {lang === 'ar' ? 'الفروع النشطة' : 'Active Stores'}
              </div>
              <div className="text-sm font-bold text-slate-200">
                {chainMetrics.totalStoresCount}{' '}
                <span className="text-xs text-slate-400">
                  {lang === 'ar' ? 'فرع' : 'stores'}
                </span>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-slate-800" />

            <div className="text-center">
              <div className="text-[11px] text-slate-400 font-medium">
                {lang === 'ar' ? 'كادر المبيعات' : 'Sales Staff'}
              </div>
              <div className="text-sm font-bold text-slate-200">
                {formatNumber(chainMetrics.activeStaffCount, lang)}{' '}
                <span className="text-xs text-slate-400">
                  {lang === 'ar' ? 'بائع' : 'staff'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Alerts Bell */}
            <button
              onClick={onOpenAlerts}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title={lang === 'ar' ? 'التنبيهات الذكية' : 'System Alerts'}
            >
              <AlertTriangle className={`w-4 h-4 ${criticalAlertsCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">
                {lang === 'ar' ? 'التنبيهات' : 'Alerts'}
              </span>
              {alerts.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                  criticalAlertsCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                }`}>
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Data Quality Pill */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
                dataQualityScore >= 80
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
              }`}
              title={lang === 'ar' ? 'مؤشر جودة ونظافة البيانات' : 'Data Quality Score'}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'جودة البيانات' : 'Data Quality'}: {dataQualityScore}%</span>
            </div>

            {/* Sample Data Indicator & Reset */}
            {isSampleData && (
              <button
                onClick={onResetSampleData}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
                title={lang === 'ar' ? 'إعادة تحميل البيانات التجريبية لسلسلة الـ 27 فرعاً' : 'Reload sample data'}
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">{lang === 'ar' ? 'بيانات افتراضية' : 'Demo Data'}</span>
              </button>
            )}

            {/* Upload Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-transform active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>{lang === 'ar' ? 'رفع ملفات Excel' : 'Upload Excel'}</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={onToggleLang}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center justify-center text-xs font-bold w-9 h-9"
              title={lang === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}
            >
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
