import React, { useState } from 'react';
import {
  TrendingUp,
  Search,
  Plus,
  Globe,
  Facebook,
  Instagram,
  Sparkles,
  ExternalLink,
  Upload,
  Calendar,
  ShieldAlert,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Layers,
  ArrowRight,
  Eye,
  Camera,
} from 'lucide-react';
import {
  CompetitorProfile,
  CompetitorScanResult,
  CompetitorAdAnalysis,
  WeeklyCompetitorReportData,
  ChainMetrics,
  CategoryDCSItem,
} from '../types/retail';
import { formatCurrency, formatNumber } from '../utils/calculations';

interface CompetitorIntelligenceProps {
  competitors: CompetitorProfile[];
  onUpdateCompetitors: (updated: CompetitorProfile[]) => void;
  chainMetrics: ChainMetrics;
  categories: CategoryDCSItem[];
  lang: 'ar' | 'en';
}

export const CompetitorIntelligence: React.FC<CompetitorIntelligenceProps> = ({
  competitors,
  onUpdateCompetitors,
  chainMetrics,
  categories,
  lang,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'profiles' | 'weekly_report' | 'ad_analyzer'>('profiles');

  // Add Competitor Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompWeb, setNewCompWeb] = useState('');
  const [newCompFb, setNewCompFb] = useState('');
  const [newCompIg, setNewCompIg] = useState('');
  const [newCompTiktok, setNewCompTiktok] = useState('');

  // Scanning State
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanAllProgress, setScanAllProgress] = useState<{ current: number; total: number; currentBrand: string }>({
    current: 0,
    total: 0,
    currentBrand: '',
  });

  // Discovery State
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredBrands, setDiscoveredBrands] = useState<any[]>([]);

  // Ad Image Analysis State
  const [adCompetitor, setAdCompetitor] = useState<string>(competitors[0]?.name || 'Zara Egypt');
  const [adUrl, setAdUrl] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzingAd, setIsAnalyzingAd] = useState(false);
  const [adAnalysisResult, setAdAnalysisResult] = useState<CompetitorAdAnalysis | null>(null);

  // Weekly Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyCompetitorReportData | null>(null);

  // Add Competitor Handler
  const handleAddCompetitor = (autoScan: boolean = true) => {
    if (!newCompName.trim()) return;
    const newComp: CompetitorProfile = {
      id: `comp-${Date.now()}`,
      name: newCompName.trim(),
      websiteUrl: newCompWeb.trim() || undefined,
      facebookUrl: newCompFb.trim() || undefined,
      instagramUrl: newCompIg.trim() || undefined,
      tiktokUrl: newCompTiktok.trim() || undefined,
    };
    const updated = [...competitors, newComp];
    onUpdateCompetitors(updated);
    setNewCompName('');
    setNewCompWeb('');
    setNewCompFb('');
    setNewCompIg('');
    setNewCompTiktok('');
    setShowAddModal(false);

    if (autoScan) {
      handleScanCompetitor(newComp);
    }
  };

  // Run Search-Grounded Scan on a Competitor
  const handleScanCompetitor = async (comp: CompetitorProfile) => {
    setScanningId(comp.id);
    try {
      const res = await fetch('/api/gemini/competitor-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorName: comp.name,
          websiteUrl: comp.websiteUrl,
          facebookUrl: comp.facebookUrl,
          instagramUrl: comp.instagramUrl,
          tiktokUrl: comp.tiktokUrl,
        }),
      });

      if (!res.ok) throw new Error('Failed to scan competitor');
      const scanData = await res.json();

      const updated = competitors.map(c => {
        if (c.id === comp.id) {
          return {
            ...c,
            lastScannedAt: new Date().toISOString(),
            scanResult: scanData,
          };
        }
        return c;
      });

      onUpdateCompetitors(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setScanningId(null);
    }
  };

  // Scan All Competitors from Internet
  const handleScanAllCompetitors = async () => {
    if (competitors.length === 0 || isScanningAll) return;
    setIsScanningAll(true);
    let currentUpdated = [...competitors];

    for (let i = 0; i < competitors.length; i++) {
      const comp = competitors[i];
      setScanAllProgress({
        current: i + 1,
        total: competitors.length,
        currentBrand: comp.name,
      });

      try {
        const res = await fetch('/api/gemini/competitor-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            competitorName: comp.name,
            websiteUrl: comp.websiteUrl,
            facebookUrl: comp.facebookUrl,
            instagramUrl: comp.instagramUrl,
            tiktokUrl: comp.tiktokUrl,
          }),
        });

        if (res.ok) {
          const scanData = await res.json();
          currentUpdated = currentUpdated.map(c => {
            if (c.id === comp.id) {
              return {
                ...c,
                lastScannedAt: new Date().toISOString(),
                scanResult: scanData,
              };
            }
            return c;
          });
          onUpdateCompetitors([...currentUpdated]);
        }
      } catch (err) {
        console.error('Error scanning ' + comp.name, err);
      }
    }

    setIsScanningAll(false);
  };

  // Discover Competitors on Internet
  const handleOpenDiscovery = async () => {
    setShowDiscoverModal(true);
    if (discoveredBrands.length > 0) return;
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/gemini/discover-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredBrands(data.discoveredCompetitors || []);
      }
    } catch (err) {
      console.error('Discovery error:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  // Add Discovered Brand
  const handleAddDiscoveredBrand = (brand: any) => {
    const existing = competitors.find(c => c.name.toLowerCase() === brand.name.toLowerCase());
    if (existing) {
      handleScanCompetitor(existing);
      return;
    }

    const newComp: CompetitorProfile = {
      id: `comp-${Date.now()}`,
      name: brand.name,
      websiteUrl: brand.websiteUrl,
      facebookUrl: brand.facebookUrl,
      instagramUrl: brand.instagramUrl,
    };

    onUpdateCompetitors([...competitors, newComp]);
    handleScanCompetitor(newComp);
  };

  // Handle Ad Image Upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Analyze Ad Creative
  const handleAnalyzeAd = async () => {
    if (!imageBase64) return;
    setIsAnalyzingAd(true);
    setAdAnalysisResult(null);

    try {
      const res = await fetch('/api/gemini/analyze-ad-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          competitorName: adCompetitor,
          adUrl: adUrl.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to analyze ad');
      const analysisData = await res.json();
      setAdAnalysisResult(analysisData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingAd(false);
    }
  };

  // Generate Weekly Strategic Report
  const handleGenerateWeeklyReport = async () => {
    setIsGeneratingReport(true);
    try {
      const ourCategoryUtv = categories.map(c => ({
        category: c.rawCategory,
        chainUtvEGP: chainMetrics.weightedUtv,
        department: c.department,
      }));

      const competitorsList = competitors.map(c => ({
        name: c.name,
        discounts: c.scanResult?.currentDiscounts || [],
        priceRanges: c.scanResult?.priceRanges || [],
        threatLevel: c.scanResult?.strategicThreatLevel || 'متوسط',
      }));

      const res = await fetch('/api/gemini/competitor-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitorsList,
          ourCategoryUtv,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate weekly competitor report');
      const report = await res.json();
      setWeeklyReport(report);
      setActiveSubTab('weekly_report');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-extrabold text-white">
              {lang === 'ar' ? 'استخبارات المنافسين في السوق المصري' : 'Competitor Intelligence Module'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'تتبع العروض، المجموعات الجديدة، فئات الأسعار، الفروع الجديدة، وفحص إعلانات المنافسين بـ Gemini Search Grounding'
              : 'Public market scanning, Meta ad creative analysis, and pricing benchmarking'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scan All Competitors via Internet */}
          <button
            onClick={handleScanAllCompetitors}
            disabled={isScanningAll || competitors.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 transition-colors shadow-sm disabled:opacity-50"
            title={lang === 'ar' ? 'مسح وجمع كافة بيانات المنافسين المتاحين على الإنترنت بالذكاء الاصطناعي' : 'Scan all competitors via AI Search'}
          >
            {isScanningAll ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>
                  {lang === 'ar'
                    ? `جاري فحص (${scanAllProgress.current}/${scanAllProgress.total}): ${scanAllProgress.currentBrand}`
                    : `Scanning (${scanAllProgress.current}/${scanAllProgress.total})...`}
                </span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'تحديث كافة البيانات من الإنترنت' : 'Scan All via Web AI'}</span>
              </>
            )}
          </button>

          {/* Discover New Competitors */}
          <button
            onClick={handleOpenDiscovery}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 transition-colors shadow-sm"
          >
            <Search className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ar' ? 'اكتشاف منافسين جدد بالسوق' : 'Discover Brands'}</span>
          </button>

          {/* Weekly Report */}
          <button
            onClick={handleGenerateWeeklyReport}
            disabled={isGeneratingReport}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 text-slate-950 font-black text-xs shadow-md transition-transform active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGeneratingReport ? (lang === 'ar' ? 'جاري إعداد التقرير...' : 'Generating...') : (lang === 'ar' ? 'التقرير التنافسي الأسبوعي' : 'Weekly Report')}</span>
          </button>

          {/* Add Competitor */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'ar' ? 'إضافة منافس' : 'Add Competitor'}</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('profiles')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeSubTab === 'profiles'
              ? 'bg-cyan-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {lang === 'ar' ? `المنافسون المتابعون (${competitors.length})` : `Monitored Brands (${competitors.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('weekly_report')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeSubTab === 'weekly_report'
              ? 'bg-cyan-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {lang === 'ar' ? 'التقرير التنافسي الأسبوعي والمقارنة السعرية' : 'Weekly Price Comparison & Tactics'}
        </button>

        <button
          onClick={() => setActiveSubTab('ad_analyzer')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSubTab === 'ad_analyzer'
              ? 'bg-cyan-500 text-slate-950 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'تحليل إعلانات وبوستات المنافسين (AI Ad Vision)' : 'AI Ad Creative Vision'}</span>
        </button>
      </div>

      {/* 1. Competitor Profiles & Search Grounding Cards */}
      {activeSubTab === 'profiles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map(comp => (
              <div
                key={comp.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-white">{comp.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-slate-400">
                        {comp.websiteUrl && (
                          <a href={comp.websiteUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-400">
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {comp.facebookUrl && (
                          <a href={comp.facebookUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-400">
                            <Facebook className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {comp.instagramUrl && (
                          <a href={comp.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-400">
                            <Instagram className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {comp.scanResult?.strategicThreatLevel && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        comp.scanResult.strategicThreatLevel === 'مرتفع'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {lang === 'ar' ? 'تهديد:' : 'Threat:'} {comp.scanResult.strategicThreatLevel}
                      </span>
                    )}
                  </div>

                  {/* Scan Summary */}
                  {comp.scanResult ? (
                    <div className="space-y-3 text-xs">
                      {/* Active Discounts */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="font-bold text-amber-400 text-[11px] block">
                          {lang === 'ar' ? 'أحدث العروض والخصومات في مصر:' : 'Active Offers:'}
                        </span>
                        <ul className="space-y-1 text-slate-300">
                          {comp.scanResult.currentDiscounts?.map((disc, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-amber-400">•</span>
                              <span>{disc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* New Collections */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="font-bold text-cyan-400 text-[11px] block">
                          {lang === 'ar' ? 'المجموعات والتشكيلات الجديدة:' : 'New Collections:'}
                        </span>
                        <ul className="space-y-1 text-slate-300">
                          {comp.scanResult.newCollections?.map((col, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-cyan-400">•</span>
                              <span>{col}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Price Ranges Preview */}
                      {comp.scanResult.priceRanges && comp.scanResult.priceRanges.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                          <span className="font-bold text-slate-300 text-[10px] block">
                            {lang === 'ar' ? 'فئات الأسعار التنافسية (بالجنيه المصري):' : 'Price Benchmarks (EGP):'}
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {comp.scanResult.priceRanges.map((pr, idx) => (
                              <div key={idx} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[10px]">
                                <div className="text-slate-400 font-medium truncate">{pr.category.split('/')[0]}</div>
                                <div className="text-amber-400 font-bold">{pr.range}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Campaign Hook */}
                      {comp.scanResult.campaignHook && (
                        <div className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                          "{comp.scanResult.campaignHook}"
                        </div>
                      )}

                      {/* Store Openings */}
                      {comp.scanResult.storeOpenings && comp.scanResult.storeOpenings.length > 0 && (
                        <div className="text-[10px] text-slate-400">
                          <span className="text-cyan-400 font-semibold">{lang === 'ar' ? 'التوسعات والفروع:' : 'Expansions:'} </span>
                          <span>{comp.scanResult.storeOpenings.join(' • ')}</span>
                        </div>
                      )}

                      {/* Sources and checked timestamp */}
                      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span>
                            {lang === 'ar' ? 'تاريخ الفحص:' : 'Checked:'}{' '}
                            {new Date(comp.scanResult.checkedAt).toLocaleDateString('ar-EG')}
                          </span>
                          {comp.scanResult.sources && comp.scanResult.sources.length > 0 && (
                            <span className="text-cyan-400 font-semibold flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {comp.scanResult.sources.length} {lang === 'ar' ? 'مصادر ويب' : 'sources'}
                            </span>
                          )}
                        </div>

                        {/* Clickable Web Sources Links */}
                        {comp.scanResult.sources && comp.scanResult.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {comp.scanResult.sources.slice(0, 3).map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-800 text-[9px] transition-colors truncate max-w-[180px]"
                                title={src.title}
                              >
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{src.title}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <p>{lang === 'ar' ? 'لم يتم فحص بيانات المنافس بعد. اضغط "جمع البيانات من الإنترنت" أدناه.' : 'No scan data yet. Click scan below.'}</p>
                    </div>
                  )}
                </div>

                {/* Scan Action Button */}
                <button
                  onClick={() => handleScanCompetitor(comp)}
                  disabled={scanningId === comp.id || isScanningAll}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {scanningId === comp.id ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>{lang === 'ar' ? 'جاري جمع البيانات من الإنترنت...' : 'Scanning web data...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{lang === 'ar' ? 'جمع البيانات من الإنترنت (AI Web Scan)' : 'Scan Web Data with AI'}</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Weekly Strategic Report Tab */}
      {activeSubTab === 'weekly_report' && (
        <div className="space-y-6">
          {weeklyReport ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-white">{weeklyReport.reportTitle}</h2>
                  <p className="text-xs text-slate-400">{weeklyReport.generatedDate}</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {lang === 'ar' ? 'معتمد للمشتريات والتسويق' : 'Official Briefing'}
                </span>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed">
                <span className="font-bold text-amber-400 text-xs block mb-1">
                  {lang === 'ar' ? 'نظرة عامة على ديناميكيات السوق:' : 'Market Dynamics Overview:'}
                </span>
                {weeklyReport.executiveSummary}
              </div>

              {/* Category Comparison Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {lang === 'ar' ? 'مقارنة فئات الأسعار (متوسط سعر شبكتنا UTV vs المنافسين والتوصية)' : 'Category Price Benchmarks & Strategic Response'}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-xs text-left rtl:text-right border-collapse">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4 font-bold">{lang === 'ar' ? 'الفئة' : 'Category'}</th>
                        <th className="py-3 px-4 font-bold">{lang === 'ar' ? 'سعر شبكتنا (UTV)' : 'Our UTV'}</th>
                        <th className="py-3 px-4 font-bold">{lang === 'ar' ? 'متوسط المنافسين' : 'Competitor Benchmark'}</th>
                        <th className="py-3 px-4 text-center font-bold">{lang === 'ar' ? 'فارق السعر %' : 'Price Gap %'}</th>
                        <th className="py-3 px-4 text-center font-bold">{lang === 'ar' ? 'الرد الاستراتيجي' : 'Response Strategy'}</th>
                        <th className="py-3 px-4 font-bold">{lang === 'ar' ? 'المبرر' : 'Rationale'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                      {weeklyReport.categoryComparisons?.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-bold text-white">{c.category}</td>
                          <td className="py-3 px-4 font-extrabold text-amber-400">{c.ourUtv}</td>
                          <td className="py-3 px-4 text-slate-300 font-semibold">{c.competitorBenchmark}</td>
                          <td className="py-3 px-4 text-center font-bold text-cyan-400">{c.priceGapPercent}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded ${
                              c.recommendation === 'Match'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : c.recommendation === 'Differentiate'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {c.recommendation}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-[11px]">{c.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Directives for Departments */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {weeklyReport.keyDirectives?.map((dir, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <span className="font-bold text-cyan-400 block text-[11px]">{dir.department}</span>
                    <p className="text-slate-200">{dir.directive}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Sparkles className="w-10 h-10 text-cyan-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                {lang === 'ar' ? 'لم يتم توليد التقرير التنافسي الأسبوعي بعد' : 'No Weekly Report Generated Yet'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {lang === 'ar'
                  ? 'اضغط على زر "إعداد التقرير التنافسي الأسبوعي" بالأعلى لمقارنة أسعار المنافسين مع متوسط سعر شبكتنا ووضع خطة الرد (Match / Ignore / Differentiate).'
                  : 'Click the button above to synthesize competitor prices and formulate strategic recommendations.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Ad Image Analyzer Tab (Vision AI) */}
      {activeSubTab === 'ad_analyzer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Uploader Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'فحص وتحليل إعلانات المنافسين (Gemini Vision)' : 'Competitor Ad Creative Analysis'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar'
                  ? 'ارفع لقطة شاشة من إعلانات فيسبوك / إنستجرام / Meta Ad Library لتحليل المنتجات والألوان ونقاط الأسعار والرسالة الترويجية'
                  : 'Upload screenshots of competitor ads or Meta Ad Library posts for multimodal breakdown'}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{lang === 'ar' ? 'اسم المنافس:' : 'Competitor Brand:'}</label>
                <select
                  value={adCompetitor}
                  onChange={e => setAdCompetitor(e.target.value)}
                  className="w-full bg-slate-950 text-white border border-slate-800 p-2.5 rounded-xl outline-none"
                >
                  {competitors.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{lang === 'ar' ? 'رابط الإعلان (اختياري):' : 'Ad URL (Optional):'}</label>
                <input
                  type="text"
                  value={adUrl}
                  onChange={e => setAdUrl(e.target.value)}
                  placeholder="https://facebook.com/ads/..."
                  className="w-full bg-slate-950 text-white border border-slate-800 p-2.5 rounded-xl outline-none"
                />
              </div>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center space-y-2">
                {imageBase64 ? (
                  <div className="space-y-3">
                    <img
                      src={imageBase64}
                      alt="Ad Preview"
                      className="max-h-48 mx-auto rounded-lg border border-slate-700 shadow-md object-contain"
                    />
                    <button
                      onClick={() => setImageBase64(null)}
                      className="text-[11px] text-rose-400 hover:underline"
                    >
                      {lang === 'ar' ? 'إزالة الصورة واختيار أخرى' : 'Remove image'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <Camera className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-300">
                      {lang === 'ar' ? 'اختر لقطة شاشة للإعلان' : 'Upload Ad Screenshot'}
                    </p>
                    <label className="inline-block mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl cursor-pointer border border-slate-700">
                      <span>{lang === 'ar' ? 'تصفح جهازك' : 'Choose File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <button
                onClick={handleAnalyzeAd}
                disabled={!imageBase64 || isAnalyzingAd}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                {isAnalyzingAd ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>{lang === 'ar' ? 'جاري فحص الصورة بالرؤية الحاسوبية...' : 'Analyzing ad visual...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تحليل الإعلان وتحديد الرد التسويقي' : 'Analyze Ad & Recommend Response'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Analysis Results Display */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? 'نتائج الفحص والرد الاستراتيجي' : 'Strategic Ad Breakdown'}</span>
            </h3>

            {adAnalysisResult ? (
              <div className="space-y-3 text-xs">
                {/* Message Hook */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-amber-400 block text-[11px]">
                    {lang === 'ar' ? 'الرسالة والخطاف التسويقي (Message & Hook):' : 'Hook:'}
                  </span>
                  <p className="text-slate-200">{adAnalysisResult.messageHook}</p>
                </div>

                {/* Target Audience */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-cyan-400 block text-[11px]">
                    {lang === 'ar' ? 'الجمهور المستهدف (Target Audience):' : 'Target Audience:'}
                  </span>
                  <p className="text-slate-200">{adAnalysisResult.targetAudience}</p>
                </div>

                {/* Products & Colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-slate-400 block text-[10px]">
                      {lang === 'ar' ? 'أنواع المنتجات:' : 'Products:'}
                    </span>
                    <p className="text-slate-200">{adAnalysisResult.productTypes?.join('، ')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="font-bold text-slate-400 block text-[10px]">
                      {lang === 'ar' ? 'الألوان والقصات:' : 'Colors:'}
                    </span>
                    <p className="text-slate-200">{adAnalysisResult.colors?.join('، ')}</p>
                  </div>
                </div>

                {/* Counter Strategy */}
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-1">
                  <span className="font-bold text-emerald-400 block text-xs">
                    {lang === 'ar' ? 'توصية الرد لشبكتنا (Our Counter-Strategy):' : 'Our Counter-Strategy:'}
                  </span>
                  <p className="text-slate-200 text-sm leading-relaxed">{adAnalysisResult.ourCounterStrategy}</p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                {lang === 'ar' ? 'اختر صورة إعلان واضغط "تحليل الإعلان" لعرض التفكيك التسويقي هنا.' : 'Upload an ad screenshot to view analysis here.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'ar' ? 'إضافة علامة تجارية منافسة' : 'Add Competitor Brand'}</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                {lang === 'ar' ? 'اقتراحات سريعة للماركات بمصر:' : 'Quick Brand Suggestions:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'LC Waikiki Egypt', web: 'https://www.lcwaikiki.eg', fb: 'https://facebook.com/lcwaikikiegypt' },
                  { name: 'Mango Egypt', web: 'https://shop.mango.com/eg-en', fb: 'https://facebook.com/mango.com' },
                  { name: 'H&M Egypt', web: 'https://eg.hm.com', fb: 'https://facebook.com/hmegypt' },
                  { name: 'Stradivarius Egypt', web: 'https://www.stradivarius.com/eg', fb: 'https://facebook.com/stradivarius' },
                  { name: 'Max Fashion Egypt', web: 'https://www.maxfashion.com/eg/en', fb: 'https://facebook.com/maxfashionegypt' },
                  { name: 'Town Team', web: 'https://townteam.com', fb: 'https://facebook.com/townteam' },
                ].map(b => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => {
                      setNewCompName(b.name);
                      setNewCompWeb(b.web);
                      setNewCompFb(b.fb);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 text-[10px] transition-colors"
                  >
                    + {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{lang === 'ar' ? 'اسم المنافس *' : 'Name *'}</label>
                <input
                  type="text"
                  value={newCompName}
                  onChange={e => setNewCompName(e.target.value)}
                  placeholder="مثال: Mango Egypt, LC Waikiki..."
                  className="w-full bg-slate-950 text-white border border-slate-800 p-2.5 rounded-xl outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{lang === 'ar' ? 'الموقع الإلكتروني' : 'Website'}</label>
                <input
                  type="text"
                  value={newCompWeb}
                  onChange={e => setNewCompWeb(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 text-white border border-slate-800 p-2.5 rounded-xl outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{lang === 'ar' ? 'صفحة فيسبوك' : 'Facebook Page'}</label>
                <input
                  type="text"
                  value={newCompFb}
                  onChange={e => setNewCompFb(e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full bg-slate-950 text-white border border-slate-800 p-2.5 rounded-xl outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{lang === 'ar' ? 'حساب إنستجرام' : 'Instagram'}</label>
                <input
                  type="text"
                  value={newCompIg}
                  onChange={e => setNewCompIg(e.target.value)}
                  placeholder="https://instagram.com/..."
                  className="w-full bg-slate-950 text-white border border-slate-800 p-2.5 rounded-xl outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>
                  {lang === 'ar'
                    ? 'سيقوم الذكاء الاصطناعي بالبحث الفوري على الإنترنت وجمع العروض والأسعار والتشكيلات بمجرد الإضافة.'
                    : 'AI will immediately search the web and compile live discounts, prices, and collections.'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleAddCompetitor(true)}
                disabled={!newCompName.trim()}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'إضافة وفحص الإنترنت فوراً' : 'Add & Scan Web'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discover Competitors Modal */}
      {showDiscoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-amber-400" />
                  <span>{lang === 'ar' ? 'اكتشاف منافسي الأزياء النسائية في السوق المصري (AI Market Radar)' : 'Discover Egyptian Fashion Competitors'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'ar'
                    ? 'قائمة بأبرز الماركات المنافسة في المولات والمحافظات المصرية مع إمكانية إضافتها وفحصها بنقرة واحدة'
                    : 'Trending retail brands in Egyptian malls and governorates ready for web intelligence tracking'}
                </p>
              </div>
              <button
                onClick={() => setShowDiscoverModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Discovery Content */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {isDiscovering ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">
                    {lang === 'ar' ? 'جاري فحص وتحديث قائمة المنافسين في السوق المصري عبر الإنترنت...' : 'Discovering active competitors in Egypt...'}
                  </p>
                </div>
              ) : discoveredBrands.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {discoveredBrands.map((b, idx) => {
                    const isAlreadyAdded = competitors.some(c => c.name.toLowerCase() === b.name.toLowerCase());
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2.5"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between">
                            <h4 className="font-extrabold text-white text-xs">{b.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {b.threatLevel || 'متوسط'}
                            </span>
                          </div>
                          <div className="text-[11px] text-cyan-400 font-semibold">{b.segment}</div>
                          <p className="text-[10px] text-slate-300 leading-relaxed">{b.briefSummary}</p>
                          {b.presence && (
                            <div className="text-[9px] text-slate-400">
                              <span className="text-slate-500">{lang === 'ar' ? 'الانتشار:' : 'Locations:'} </span>
                              {b.presence}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                          <div className="flex items-center gap-2 text-slate-400">
                            {b.websiteUrl && (
                              <a href={b.websiteUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-400">
                                <Globe className="w-3 h-3" />
                              </a>
                            )}
                            {b.facebookUrl && (
                              <a href={b.facebookUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-400">
                                <Facebook className="w-3 h-3" />
                              </a>
                            )}
                            {b.instagramUrl && (
                              <a href={b.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-cyan-400">
                                <Instagram className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              handleAddDiscoveredBrand(b);
                              setShowDiscoverModal(false);
                            }}
                            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 ${
                              isAlreadyAdded
                                ? 'bg-slate-800 text-slate-300 hover:bg-cyan-500 hover:text-slate-950'
                                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isAlreadyAdded ? (lang === 'ar' ? 'تحديث الفحص' : 'Re-scan') : (lang === 'ar' ? '+ إضافة وفحص فوراً' : '+ Add & Scan')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">
                  {lang === 'ar' ? 'لا توجد ماركات حالياً.' : 'No brands available.'}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowDiscoverModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
