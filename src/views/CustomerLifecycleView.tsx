import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Calendar,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Award,
  Sparkles,
  Download,
  ExternalLink,
  ChevronRight,
  Clock,
  Store,
  DollarSign,
  Copy,
  Check,
  Send,
  Info,
  ChevronDown,
  ChevronUp,
  Receipt,
  UserCheck,
  UserMinus,
  RefreshCw,
  Tag,
  Package,
  Layers,
  Flame,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  CustomerRecord,
  CustomerLifecycleStage,
  CustomerInvoice,
  CustomerTopProduct,
} from '../types/retail';
import { STORE_NAMES_LIST } from '../utils/sampleData';
import { CATALOG_ITEMS, getCustomerTopProducts } from '../utils/customerData';

interface CustomerLifecycleViewProps {
  customers: CustomerRecord[];
  lang: 'ar' | 'en';
}

export const CustomerLifecycleView: React.FC<CustomerLifecycleViewProps> = ({
  customers,
  lang,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<CustomerLifecycleStage | 'all'>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'spend_desc' | 'invoices_desc' | 'recency_asc' | 'day_zero_desc' | 'product_qty_desc'
  >('spend_desc');

  // Most Buying Products Filter State
  const [selectedProductSku, setSelectedProductSku] = useState<string>('all');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  const [productFilterMode, setProductFilterMode] = useState<'favorite' | 'any_bought'>('favorite');
  const [minProductUnits, setMinProductUnits] = useState<number>(1);

  // Customer Detail Drawer / Modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Marketing Criteria Guide collapse
  const [showCriteriaGuide, setShowCriteriaGuide] = useState(false);

  // AI Campaign generation
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [aiCampaignResult, setAiCampaignResult] = useState<{
    targetSegment: string;
    campaignTitle: string;
    whatsappTemplate: string;
    smsTemplate: string;
    incentiveOffer: string;
    recommendedTiming: string;
  } | null>(null);

  // Copy phone handler
  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  // Chain-wide stats for all products bought by customers across all invoices
  const chainProductStats = useMemo(() => {
    const map = new Map<string, {
      sku: string;
      name: string;
      category: string;
      price: number;
      totalUnitsBought: number;
      totalCustomersCount: number;
      allFavoriteCount: number;
      championFavoriteCount: number;
      totalSpend: number;
    }>();

    // Initialize with CATALOG_ITEMS so catalog stays consistent
    for (const item of CATALOG_ITEMS) {
      map.set(item.sku, {
        sku: item.sku,
        name: item.name,
        category: item.category,
        price: item.price,
        totalUnitsBought: 0,
        totalCustomersCount: 0,
        allFavoriteCount: 0,
        championFavoriteCount: 0,
        totalSpend: 0,
      });
    }

    for (const c of customers) {
      const topProducts = getCustomerTopProducts(c);
      const top1 = topProducts[0];
      if (top1) {
        let entry = map.get(top1.sku);
        if (entry) {
          entry.allFavoriteCount += 1;
          if (c.lifecycleStage === 'champion') {
            entry.championFavoriteCount += 1;
          }
        }
      }

      for (const prod of topProducts) {
        let entry = map.get(prod.sku);
        if (!entry) {
          entry = {
            sku: prod.sku,
            name: prod.itemName,
            category: prod.category,
            price: Math.round(prod.totalSpend / Math.max(1, prod.quantity)),
            totalUnitsBought: 0,
            totalCustomersCount: 0,
            allFavoriteCount: 0,
            championFavoriteCount: 0,
            totalSpend: 0,
          };
          map.set(prod.sku, entry);
        }
        entry.totalUnitsBought += prod.quantity;
        entry.totalCustomersCount += 1;
        entry.totalSpend += prod.totalSpend;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      // Sort primarily by customers count, then total units
      if (b.totalCustomersCount !== a.totalCustomersCount) {
        return b.totalCustomersCount - a.totalCustomersCount;
      }
      return b.totalUnitsBought - a.totalUnitsBought;
    });
  }, [customers]);

  // Unique categories for products
  const productCategories = useMemo(() => {
    const set = new Set<string>();
    chainProductStats.forEach(p => set.add(p.category));
    return Array.from(set).sort();
  }, [chainProductStats]);

  // Top 10 Most Buying Products across the network for quick pills
  const top10MostBuyingProducts = useMemo(() => {
    return chainProductStats.slice(0, 10);
  }, [chainProductStats]);

  // Selected product object
  const activeProductObj = useMemo(() => {
    if (selectedProductSku === 'all') return null;
    return chainProductStats.find(p => p.sku === selectedProductSku) || null;
  }, [chainProductStats, selectedProductSku]);

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        // Search by name or mobile or ID
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = c.name.toLowerCase().includes(q);
          const matchesMobile = c.mobile.includes(q);
          const matchesId = c.id.toLowerCase().includes(q);
          if (!matchesName && !matchesMobile && !matchesId) return false;
        }

        // Filter by Lifecycle stage
        if (selectedStage !== 'all' && c.lifecycleStage !== selectedStage) {
          return false;
        }

        // Filter by Store
        if (selectedStore !== 'all' && c.primaryStore !== selectedStore) {
          return false;
        }

        const topProducts = getCustomerTopProducts(c);
        const top1 = topProducts[0];

        // Filter by Product Category
        if (selectedProductCategory !== 'all') {
          if (productFilterMode === 'favorite') {
            if (!top1 || top1.category !== selectedProductCategory) return false;
          } else {
            const hasCategory = topProducts.some(
              p => p.category === selectedProductCategory && p.quantity >= minProductUnits
            );
            if (!hasCategory) return false;
          }
        }

        // Filter by Specific Product SKU (Most Buying Product)
        if (selectedProductSku !== 'all') {
          if (productFilterMode === 'favorite') {
            if (!top1 || top1.sku !== selectedProductSku) return false;
            if (top1.quantity < minProductUnits) return false;
          } else {
            const matchedProd = topProducts.find(p => p.sku === selectedProductSku);
            if (!matchedProd || matchedProd.quantity < minProductUnits) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'product_qty_desc' && selectedProductSku !== 'all') {
          const aProd = getCustomerTopProducts(a).find(p => p.sku === selectedProductSku);
          const bProd = getCustomerTopProducts(b).find(p => p.sku === selectedProductSku);
          const aQty = aProd ? aProd.quantity : 0;
          const bQty = bProd ? bProd.quantity : 0;
          if (bQty !== aQty) return bQty - aQty;
        }
        if (sortBy === 'spend_desc') return b.totalSpend - a.totalSpend;
        if (sortBy === 'invoices_desc') return b.invoicesCount - a.invoicesCount;
        if (sortBy === 'recency_asc') return a.daysSinceLastPurchase - b.daysSinceLastPurchase;
        if (sortBy === 'day_zero_desc')
          return new Date(b.firstPurchaseDate).getTime() - new Date(a.firstPurchaseDate).getTime();
        return 0;
      });
  }, [
    customers,
    searchQuery,
    selectedStage,
    selectedStore,
    sortBy,
    selectedProductSku,
    selectedProductCategory,
    productFilterMode,
    minProductUnits,
  ]);

  // Summary Metrics
  const summary = useMemo(() => {
    const total = customers.length;
    const champions = customers.filter(c => c.lifecycleStage === 'champion');
    const regulars = customers.filter(c => c.lifecycleStage === 'regular');
    const nearToRetire = customers.filter(c => c.lifecycleStage === 'near_to_retire');
    const retired = customers.filter(c => c.lifecycleStage === 'retired');

    const totalSpendAll = customers.reduce((acc, c) => acc + c.totalSpend, 0);
    const championsSpend = champions.reduce((acc, c) => acc + c.totalSpend, 0);
    const totalInvoicesAll = customers.reduce((acc, c) => acc + c.invoicesCount, 0);
    const avgLtv = total > 0 ? Math.round(totalSpendAll / total) : 0;

    return {
      total,
      championsCount: champions.length,
      championsSpendPercent: totalSpendAll > 0 ? Math.round((championsSpend / totalSpendAll) * 100) : 0,
      regularsCount: regulars.length,
      nearToRetireCount: nearToRetire.length,
      retiredCount: retired.length,
      totalSpendAll,
      totalInvoicesAll,
      avgLtv,
    };
  }, [customers]);

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredCustomers.map(c => {
      const topProducts = getCustomerTopProducts(c);
      const top1 = topProducts[0];
      return {
        'كود العميل': c.id,
        'اسم العميل': c.name,
        'رقم الموبايل': c.mobile,
        'الفرع الأساسي': c.primaryStore,
        'شريحة العميل التسويقية': c.lifecycleStage,
        'المنتج الأكثر شراءً (Most Bought)': top1 ? top1.itemName : '',
        'كود الصنف الأكثر شراءً SKU': top1 ? top1.sku : '',
        'تصنيف الصنف الأكثر شراءً': top1 ? top1.category : '',
        'قطع الصنف الأكثر شراءً': top1 ? top1.quantity : 0,
        'إجمالي إنفاق الصنف (ج.م)': top1 ? top1.totalSpend : 0,
        'تاريخ أول شراء (Day Zero)': c.firstPurchaseDate,
        'تاريخ آخر شراء': c.lastPurchaseDate,
        'أيام منذ آخر شراء': c.daysSinceLastPurchase,
        'عدد الفواتير': c.invoicesCount,
        'إجمالي القطع المشتراة': c.totalPiecesBought,
        'إجمالي الإنفاق (ج.م)': c.totalSpend,
        'متوسط الفاتورة ATV (ج.م)': c.averageOrderValue,
        'تقييم RFM': c.rfmScore || '',
        'الملاحظات التسويقية': c.marketingNotes,
        'الحملة المقترحة': c.recommendedCampaign,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجلات العملاء');
    XLSX.writeFile(wb, `Customer_Lifecycle_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Dedicated campaign for lovers of a specific most-bought product
  const handleGenerateProductCampaign = (prodSku: string) => {
    const prod = chainProductStats.find(p => p.sku === prodSku);
    if (!prod) return;
    setIsGeneratingCampaign(true);
    setAiCampaignResult(null);

    setTimeout(() => {
      setAiCampaignResult({
        targetSegment: `عاشقات صنف ${prod.name} (${prod.sku})`,
        campaignTitle: `حملة التنسيقات الحصرية لعميلات ${prod.name}`,
        whatsappTemplate: `أهلاً بكِ أ/ [الاسم]! يسعدنا دائماً اختيارك لقطعة (${prod.name}) المميزة لدينا. وصل حديثاً في فرع [اسم_الفرع] التشكيلة المكملة المتناسقة معها بالكامل (شال حرير وإكسسوارات مطابقة) مع كود خصم خاص 20% (MATCH20) ساري لمدة 3 أيام تقديراً لذوقك الراقي معنا!`,
        smsTemplate: `لعشاق ${prod.name}: تشكيلة التنسيقات المكملة وصلت مع خصم 20% بكود MATCH20 بفرعك المفضل!`,
        incentiveOffer: `خصم 20% على أي صنف مكمل من قسم ${prod.category} أو إكسسوار عند إبراز الرسالة.`,
        recommendedTiming: 'أيام الخميس والجمعة بين 5:00 عصراً و8:00 مساءً.',
      });
      setIsGeneratingCampaign(false);
    }, 350);
  };

  // AI Campaign Generator
  const handleGenerateAiCampaign = async (targetCohort: CustomerLifecycleStage) => {
    setIsGeneratingCampaign(true);
    setAiCampaignResult(null);

    const cohortNames = {
      champion: 'العملاء الذهبيين (Champions)',
      regular: 'العملاء المنتظمين (Regulars)',
      near_to_retire: 'العملاء المعرضين للفقدان (Near to Retire)',
      retired: 'العملاء المتوقفين (Retired / Churned)',
    };

    // Client-side tailored campaign templates with instant delivery
    setTimeout(() => {
      if (targetCohort === 'champion') {
        setAiCampaignResult({
          targetSegment: cohortNames[targetCohort],
          campaignTitle: 'حملة النخبة الذهبية (VIP Golden Preview)',
          whatsappTemplate: `أهلاً بكِ أ/ [الاسم] يسعدنا دائماً ذوقك الرفيع معنا في [اسم_الفرع]. يسعدنا إخبارك بوصول تشكيلة الخريف الحصرية قبل طرحها رسمياً، مع كود خصم VIP بقيمة 15% (VIPGOLD15) ساري لمدة 5 أيام على كافة الفساتين والبليزر الكتان. ننتظر زيارتكِ ونسعد بخدمتك دائماً!`,
          smsTemplate: `عمليتنا المميزة، تشكيلة الخريف الحصرية وصلت بفروعنا! استخدمي كود VIPGOLD15 لخصم 15% ساري حتى نهاية الأسبوع.`,
          incentiveOffer: 'خصم 15% حصري + حجز مسبق للقطع ومشروب ضيافة بالفرع.',
          recommendedTiming: 'أيام الأربعاء والخميس بين 4:00 عصراً و7:00 مساءً.',
        });
      } else if (targetCohort === 'near_to_retire') {
        setAiCampaignResult({
          targetSegment: cohortNames[targetCohort],
          campaignTitle: 'حملة استعادة العميل المعرض للفقدان (Win-Back Reactivation)',
          whatsappTemplate: `مرحباً أ/ [الاسم]، اشتقنا لزيارتكِ في [اسم_الفرع]! لاحظنا غيابكِ خلال الفترة الماضية، ويسرنا تقديم هدية ترحيبية خاصة: كود خصم 20% (MISSYOU20) أو شحن مجاني لأي طلب حتى باب بيتك. شاهدي أحدث موديلات البلوزات والبنطلونات المتوفرة حالياً ويسعدنا تجديد لقائك!`,
          smsTemplate: `وحشتينا أ/ [الاسم]! كود خصم 20% بانتظارك (MISSYOU20) ساري على مشترياتك القادمة. بانتظار تشريفك!`,
          incentiveOffer: 'خصم 20% أو شحن مجاني لأول طلب أونلاين.',
          recommendedTiming: 'عطلة نهاية الأسبوع (الجمعة صباحاً).',
        });
      } else if (targetCohort === 'retired') {
        setAiCampaignResult({
          targetSegment: cohortNames[targetCohort],
          campaignTitle: 'حملة استرداد العملاء الخاملين (Lost Customer Recovery)',
          whatsappTemplate: `أهلاً أ/ [الاسم]، نود الاطمئنان عليكِ! تقديراً لكونكِ من أوائل عميلاتنا منذ [Day_Zero]، خصصنا لكِ قسيمة شراء بقيمة 350 ج.م على أي فاتورة تفوق 1200 ج.م بكود (WELCOMEBACK). نتمنى معرفة رأيك وتجربة مجموعتنا المحدثة كلياً!`,
          smsTemplate: `قسيمة بقيمة 350 ج.م بانتظارك بكود WELCOMEBACK في كافة فروعنا. نتطلع لرؤيتك مجدداً!`,
          incentiveOffer: 'قسيمة نقدية 350 ج.م أو خصم 25% مع استبيان رضا العملاء.',
          recommendedTiming: 'أول أسبوع في الشهر (بعد صرف الرواتب).',
        });
      } else {
        setAiCampaignResult({
          targetSegment: cohortNames[targetCohort],
          campaignTitle: 'حملة تنمية سلة المشتريات (Basket Builder / UPT Upsell)',
          whatsappTemplate: `أهلاً أ/ [الاسم]! لإكمال أناقتك، احصلي على خصم 50% على أي قطعة إكسسوار أو شال عند شراء قطعتين من البلوزات والفساتين في زيارتك القادمة لفرع [اسم_الفرع]. كود العرض: (STYLEUP50).`,
          smsTemplate: `عرض حصري لعميلاتنا المنتظمات: اشتري قطعتين واحصلي على الإكسسوار بنصف السعر بكود STYLEUP50!`,
          incentiveOffer: 'خصم 50% على القطعة المكملة لزيادة UPT من 1.4 إلى 2.0+.',
          recommendedTiming: 'مساء الخميس أو بعد الظهيرة.',
        });
      }
      setIsGeneratingCampaign(false);
    }, 400);
  };

  // Helper for lifecycle badge colors & Arabic labels
  const getStageBadge = (stage: CustomerLifecycleStage) => {
    switch (stage) {
      case 'champion':
        return {
          labelAr: 'بطل المبيعات (Champion VIP)',
          labelEn: 'Champion',
          color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
          icon: <Award className="w-3.5 h-3.5 text-amber-400" />
        };
      case 'regular':
        return {
          labelAr: 'عميل منتظم (Regular)',
          labelEn: 'Regular',
          color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'near_to_retire':
        return {
          labelAr: 'على وشك التوقف (Near to Retire)',
          labelEn: 'Near to Retire',
          color: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
          dot: 'bg-orange-400',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
        };
      case 'retired':
        return {
          labelAr: 'متوقف / خامل (Retired)',
          labelEn: 'Retired',
          color: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          dot: 'bg-rose-400',
          icon: <UserMinus className="w-3.5 h-3.5 text-rose-400" />
        };
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              RFM Marketing Lifecycle
            </span>
            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'تتبع المشتريات من اليوم الأول (Day Zero)' : 'Day-Zero Purchase History'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>{lang === 'ar' ? 'بيانات وسجلات العملاء ودورة الشراء' : 'Customer Lifecycle & Purchase Registry'}</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            {lang === 'ar'
              ? 'سجل تفصيلي متكامل لكل عميل برقم الهاتف، إجمالي الفواتير منذ أول عملية شراء، تفاصيل الأصناف والأسعار، وتصنيف تسويقي احترافي (Champion / Regular / Near to Retire / Retired).'
              : 'Complete registry for each customer including phone, total invoices since Day Zero, itemized item prices, and marketing lifecycle segmentation.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCriteriaGuide(!showCriteriaGuide)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <Info className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'ar' ? 'معايير التصنيف التسويقي' : 'Marketing Criteria Guide'}</span>
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

      {/* Marketing Criteria Explainer Guide (Expandable) */}
      {showCriteriaGuide && (
        <div className="p-5 rounded-2xl bg-slate-900/95 border border-cyan-500/30 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                {lang === 'ar' ? 'معايير التقسيم التسويقي لدورة حياة العميل (Marketing Lifecycle Framework):' : 'Customer Lifecycle Segmentation Framework'}
              </h3>
            </div>
            <span className="text-[11px] text-cyan-400 font-mono">RFM Methodology (Recency, Frequency, Monetary)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Champion */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Champion (بطل المبيعات)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">
                  {summary.championsCount} عميل
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong>المعيار:</strong> تكرار شراء عالي (5+ فواتير أو إنفاق &ge; 14,000 ج.م) وشراء حديث خلال آخر 45 يوماً.
              </p>
              <p className="text-amber-200/80 text-[11px]">
                <strong>التوجيه التسويقي:</strong> معاملة VIP، دعوة حصرية لتجربة الكبسولات الجديدة قبل الطرح، وخدمة عملاء مميزة.
              </p>
            </div>

            {/* Regular */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-400 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Regular (عميل منتظم)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                  {summary.regularsCount} عميل
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong>المعيار:</strong> وتيرة مستقرة (2 إلى 4 فواتير، إنفاق 3,000 - 14,000 ج.م) وتسوق حديث خلال آخر 75 يوماً.
              </p>
              <p className="text-emerald-200/80 text-[11px]">
                <strong>التوجيه التسويقي:</strong> عروض Cross-sell لقطع مكملة (شال، إكسسوار)، مكافآت ولاء على تكرار الزيارة.
              </p>
            </div>

            {/* Near to Retire */}
            <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-orange-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Near to Retire (على وشك التوقف)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono text-[10px]">
                  {summary.nearToRetireCount} عميل
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong>المعيار:</strong> عميل سابق (فاتورتان أو أكثر) لكن انقطع عن الشراء بين 76 و150 يوماً (تجاوز الدورة الطبيعية).
              </p>
              <p className="text-orange-200/80 text-[11px]">
                <strong>التوجيه التسويقي:</strong> حملة استعادة فورية (Win-Back) بكود خصم 15%-20% وشحن مجاني قبل تحوله لخامل كلياً.
              </p>
            </div>

            {/* Retired */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-rose-400 flex items-center gap-1.5">
                  <UserMinus className="w-4 h-4" /> Retired (متوقف / خامل)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                  {summary.retiredCount} عميل
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                <strong>المعيار:</strong> انقطاع كامل لأكثر من 150 يوماً (5 أشهر فما فوق) بدون أي معاملة؛ صنف كعميل مفقود/خامل.
              </p>
              <p className="text-rose-200/80 text-[11px]">
                <strong>التوجيه التسويقي:</strong> عروض تصفيات قوية أو قسيمة نقدية 350 ج.م لاستعادة الاهتمام ومعرفة أسباب التوقف.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Customers */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            {lang === 'ar' ? 'إجمالي العملاء المسجلين' : 'Total Customers'}
          </span>
          <div className="text-xl font-black text-white">{summary.total}</div>
          <span className="text-[10px] text-slate-500">
            {summary.totalInvoicesAll} {lang === 'ar' ? 'فاتورة صادرة' : 'invoices issued'}
          </span>
        </div>

        {/* Champions */}
        <div
          onClick={() => setSelectedStage(selectedStage === 'champion' ? 'all' : 'champion')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStage === 'champion'
              ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-400 flex items-center gap-1 font-bold">
              <Award className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'الأبطال الذهبيين' : 'Champions'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              {summary.championsSpendPercent}% {lang === 'ar' ? 'من الإيراد' : 'of Rev'}
            </span>
          </div>
          <div className="text-xl font-black text-amber-300 mt-1">{summary.championsCount}</div>
          <span className="text-[10px] text-slate-400">
            {lang === 'ar' ? 'أعلى إنفاق وولاء' : 'Top spenders'}
          </span>
        </div>

        {/* Regulars */}
        <div
          onClick={() => setSelectedStage(selectedStage === 'regular' ? 'all' : 'regular')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStage === 'regular'
              ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50'
          }`}
        >
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
            <UserCheck className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'العملاء المنتظمين' : 'Regulars'}
          </span>
          <div className="text-xl font-black text-emerald-300 mt-1">{summary.regularsCount}</div>
          <span className="text-[10px] text-slate-400">
            {lang === 'ar' ? 'تسوق دوري مستقر' : 'Steady cadence'}
          </span>
        </div>

        {/* Near to Retire */}
        <div
          onClick={() => setSelectedStage(selectedStage === 'near_to_retire' ? 'all' : 'near_to_retire')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStage === 'near_to_retire'
              ? 'bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-orange-500/50'
          }`}
        >
          <span className="text-[11px] text-orange-400 flex items-center gap-1 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'على وشك التوقف' : 'Near to Retire'}
          </span>
          <div className="text-xl font-black text-orange-300 mt-1">{summary.nearToRetireCount}</div>
          <span className="text-[10px] text-orange-400/80 font-medium">
            {lang === 'ar' ? 'فرصة إنقاذ عاجلة' : 'Win-back priority'}
          </span>
        </div>

        {/* Retired */}
        <div
          onClick={() => setSelectedStage(selectedStage === 'retired' ? 'all' : 'retired')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStage === 'retired'
              ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-rose-500/50'
          }`}
        >
          <span className="text-[11px] text-rose-400 flex items-center gap-1 font-bold">
            <UserMinus className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'المتوقفين (خامل)' : 'Retired / Churned'}
          </span>
          <div className="text-xl font-black text-rose-300 mt-1">{summary.retiredCount}</div>
          <span className="text-[10px] text-slate-400">
            {lang === 'ar' ? 'غياب > 150 يوماً' : '> 150 days idle'}
          </span>
        </div>

        {/* Average LTV */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            {lang === 'ar' ? 'متوسط قيمة العميل LTV' : 'Avg Customer LTV'}
          </span>
          <div className="text-xl font-black text-white">{summary.avgLtv.toLocaleString()} ج.م</div>
          <span className="text-[10px] text-slate-500">
            {lang === 'ar' ? 'إجمالي الإنفاق التراكمي' : 'Cumulative spend'}
          </span>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث برقم الموبايل (010...) أو اسم العميل...' : 'Search by phone (010...) or customer name...'}
            className="bg-transparent text-slate-100 placeholder-slate-500 outline-none w-full text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips & Store Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stage Filter Chips */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'all', labelAr: 'الكل', labelEn: 'All' },
              { id: 'champion', labelAr: 'الأبطال', labelEn: 'Champions' },
              { id: 'regular', labelAr: 'المنتظمين', labelEn: 'Regulars' },
              { id: 'near_to_retire', labelAr: 'على وشك التوقف', labelEn: 'Near Retire' },
              { id: 'retired', labelAr: 'المتوقفين', labelEn: 'Retired' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStage(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedStage === tab.id
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang === 'ar' ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Store Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'كافة الفروع (27 فرع)' : 'All 27 Branches'}
              </option>
              {STORE_NAMES_LIST.map(s => (
                <option key={s} value={s} className="bg-slate-900 text-slate-200">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[11px]">{lang === 'ar' ? 'ترتيب:' : 'Sort:'}</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-medium"
            >
              <option value="spend_desc" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'الأعلى إنفاقاً (LTV)' : 'Highest Spend'}
              </option>
              <option value="invoices_desc" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'الأكثر فواتير' : 'Most Invoices'}
              </option>
              {selectedProductSku !== 'all' && (
                <option value="product_qty_desc" className="bg-slate-900 text-amber-300 font-bold">
                  {lang === 'ar' ? 'الأعلى شراءً لهذا الصنف (بالقطع)' : 'Highest Qty of Selected Item'}
                </option>
              )}
              <option value="recency_asc" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'الأحدث شراءً' : 'Most Recent'}
              </option>
              <option value="day_zero_desc" className="bg-slate-900 text-slate-200">
                {lang === 'ar' ? 'الأقدم علاقة (Day Zero)' : 'Earliest Day Zero'}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Most Buying Products Filter: Quick Pills & Detailed Controls */}
      {/* ============================================================== */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-850 border border-amber-500/30 space-y-3.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  {lang === 'ar' ? 'فلتر المنتجات الأكثر شراءً لدى العملاء' : 'Filter by Most Buying Products'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                  {top10MostBuyingProducts.length} {lang === 'ar' ? 'أصناف متصدرة' : 'Top Items'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'ar'
                  ? 'فرز واستهداف العملاء بناءً على أصنافهم المفضلة والأعلى طلباً منذ اليوم الأول لتنشيط المبيعات.'
                  : 'Filter and target customer segments based on their most purchased favorite products.'}
              </p>
            </div>
          </div>

          {/* Filter Mode Switcher (Favorite #1 vs Any Purchase History) */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <span className="text-[10px] text-slate-400 px-1 font-bold">
              {lang === 'ar' ? 'المعيار:' : 'Criteria:'}
            </span>
            <button
              onClick={() => setProductFilterMode('favorite')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                productFilterMode === 'favorite'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                lang === 'ar'
                  ? 'العملاء الذين يعتبر هذا المنتج هو الأكثر شراءً لديهم على الإطلاق'
                  : 'Customers whose #1 most bought product is this'
              }
            >
              {lang === 'ar' ? 'المنتج المفضل الأول (#1)' : '#1 Favorite Product'}
            </button>
            <button
              onClick={() => setProductFilterMode('any_bought')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                productFilterMode === 'any_bought'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={
                lang === 'ar'
                  ? 'أي عميل اشترى هذا الصنف في أي فاتورة سابقة منذ اليوم الأول'
                  : 'Any customer who purchased this item at least once'
              }
            >
              {lang === 'ar' ? 'أي عملية شراء سابقة' : 'Any Historical Purchase'}
            </button>
          </div>
        </div>

        {/* Horizontal Quick Pills for Top 10 Most Buying Products */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          {/* Reset / All items pill */}
          <button
            onClick={() => {
              setSelectedProductSku('all');
              setSelectedProductCategory('all');
              setMinProductUnits(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
              selectedProductSku === 'all' && selectedProductCategory === 'all'
                ? 'bg-white text-slate-950 border-white font-black shadow-md'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'كافة المنتجات (بدون فلتر)' : 'All Products (No Filter)'}</span>
          </button>

          {/* Top 10 most purchased products */}
          {top10MostBuyingProducts.map(prod => {
            const isSelected = selectedProductSku === prod.sku;
            const count =
              productFilterMode === 'favorite' ? prod.allFavoriteCount : prod.totalCustomersCount;

            return (
              <button
                key={prod.sku}
                onClick={() => {
                  if (isSelected) {
                    setSelectedProductSku('all');
                  } else {
                    setSelectedProductSku(prod.sku);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-lg ring-2 ring-amber-500/40'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-500/50 hover:text-white'
                }`}
              >
                <span className="font-mono text-[10px] opacity-75">{prod.sku}</span>
                <span className="font-bold">{prod.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-slate-950/25 text-slate-950' : 'bg-slate-800 text-amber-400'
                  }`}
                >
                  {count} {lang === 'ar' ? 'عميلة' : 'cust'}
                </span>
                {isSelected && <Check className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Detailed Controls: Dropdown, Category, Minimum Units, and Active Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Full Product Catalog Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 text-[11px]">{lang === 'ar' ? 'اختر المنتج:' : 'Select Item:'}</span>
              <select
                value={selectedProductSku}
                onChange={e => setSelectedProductSku(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-medium max-w-[210px]"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'كافة المنتجات (بدون تحديد)' : 'All Products'}
                </option>
                {chainProductStats.map(p => (
                  <option key={p.sku} value={p.sku} className="bg-slate-900 text-slate-200">
                    {p.sku} - {p.name} ({p.totalCustomersCount} عميل • {p.totalUnitsBought} قطعة)
                  </option>
                ))}
              </select>
              {selectedProductSku !== 'all' && (
                <button
                  onClick={() => setSelectedProductSku('all')}
                  className="text-slate-400 hover:text-white text-xs ml-1"
                  title={lang === 'ar' ? 'مسح الصنف' : 'Clear item'}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 text-[11px]">{lang === 'ar' ? 'التصنيف:' : 'Category:'}</span>
              <select
                value={selectedProductCategory}
                onChange={e => setSelectedProductCategory(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-medium"
              >
                <option value="all" className="bg-slate-900 text-slate-200">
                  {lang === 'ar' ? 'كافة التصنيفات' : 'All Categories'}
                </option>
                {productCategories.map(cat => (
                  <option key={cat} value={cat} className="bg-slate-900 text-slate-200">
                    {cat}
                  </option>
                ))}
              </select>
              {selectedProductCategory !== 'all' && (
                <button
                  onClick={() => setSelectedProductCategory('all')}
                  className="text-slate-400 hover:text-white text-xs ml-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Min Units Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px]">
                {lang === 'ar' ? 'الحد الأدنى للمشتريات:' : 'Min Units:'}
              </span>
              <select
                value={minProductUnits}
                onChange={e => setMinProductUnits(Number(e.target.value))}
                className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs font-medium"
              >
                <option value={1} className="bg-slate-900 text-slate-200">{lang === 'ar' ? '1+ قطعة' : '1+ pcs'}</option>
                <option value={2} className="bg-slate-900 text-slate-200">{lang === 'ar' ? '2+ قطعة' : '2+ pcs'}</option>
                <option value={3} className="bg-slate-900 text-slate-200">{lang === 'ar' ? '3+ قطع' : '3+ pcs'}</option>
                <option value={4} className="bg-slate-900 text-slate-200">{lang === 'ar' ? '4+ قطع' : '4+ pcs'}</option>
              </select>
            </div>
          </div>

          {/* Active Status Badge & Clear Action */}
          {(selectedProductSku !== 'all' || selectedProductCategory !== 'all' || minProductUnits > 1) && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-300 font-bold bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'ar'
                  ? `الفلتر نشط: يطابق ${filteredCustomers.length} عميلة (${Math.round((filteredCustomers.length / Math.max(1, customers.length)) * 100)}%)`
                  : `Active filter: ${filteredCustomers.length} customers (${Math.round((filteredCustomers.length / Math.max(1, customers.length)) * 100)}%)`}
              </span>
              <button
                onClick={() => {
                  setSelectedProductSku('all');
                  setSelectedProductCategory('all');
                  setMinProductUnits(1);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1 border border-rose-500/30"
              >
                <X className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'إعادة ضبط فلتر المنتجات' : 'Clear Product Filter'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Marketing Campaign Launcher Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'مولد الحملات التسويقية الذكية للشرائح (AI Retention & Win-Back)' : 'AI Segment Campaign Generator'}
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'توليد نصوص رسائل واتساب ورسائل نصية قصيرة (SMS) مصممة خصيصاً لكل شريحة أو لمشتري منتج معين.'
              : 'Generate tailored WhatsApp & SMS templates for selected customer cohorts or specific product buyers.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* If a product is selected, show targeted campaign button */}
          {selectedProductSku !== 'all' && activeProductObj && (
            <button
              onClick={() => handleGenerateProductCampaign(selectedProductSku)}
              disabled={isGeneratingCampaign}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {lang === 'ar' ? `حملة عميلات ${activeProductObj.name}` : `Campaign for ${activeProductObj.name}`}
              </span>
            </button>
          )}

          <button
            onClick={() => handleGenerateAiCampaign('champion')}
            disabled={isGeneratingCampaign}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'حملة الأبطال VIP' : 'Champions Campaign'}</span>
          </button>

          <button
            onClick={() => handleGenerateAiCampaign('near_to_retire')}
            disabled={isGeneratingCampaign}
            className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            <span>{lang === 'ar' ? 'حملة استعادة المعرضين للفقدان' : 'Win-Back Campaign'}</span>
          </button>

          <button
            onClick={() => handleGenerateAiCampaign('retired')}
            disabled={isGeneratingCampaign}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
            <span>{lang === 'ar' ? 'حملة تنشيط المتوقفين' : 'Dormant Recovery'}</span>
          </button>
        </div>
      </div>

      {/* AI Campaign Result Card */}
      {aiCampaignResult && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-3 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                {aiCampaignResult.targetSegment}
              </span>
              <h4 className="text-sm font-bold text-white">{aiCampaignResult.campaignTitle}</h4>
            </div>
            <button
              onClick={() => setAiCampaignResult(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* WhatsApp Template */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> {lang === 'ar' ? 'نموذج رسالة واتساب (جاهز للإرسال):' : 'WhatsApp Template:'}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiCampaignResult.whatsappTemplate);
                    alert(lang === 'ar' ? 'تم نسخ نص الواتساب بنجاح!' : 'Copied WhatsApp template!');
                  }}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> {lang === 'ar' ? 'نسخ' : 'Copy'}
                </button>
              </div>
              <p className="text-slate-200 text-[12px] leading-relaxed p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 whitespace-pre-wrap">
                {aiCampaignResult.whatsappTemplate}
              </p>
            </div>

            {/* Campaign Details & Offer */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {lang === 'ar' ? 'العرض والمحفز المقترح (Incentive):' : 'Incentive Offer:'}
                </span>
                <p className="text-amber-300 font-medium text-xs">{aiCampaignResult.incentiveOffer}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {lang === 'ar' ? 'التوقيت الأنسب للإرسال:' : 'Recommended Timing:'}
                </span>
                <p className="text-slate-200 text-xs">{aiCampaignResult.recommendedTiming}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {lang === 'ar' ? 'نموذج رسالة SMS قصيرة:' : 'Short SMS Text:'}
                </span>
                <p className="text-slate-300 text-xs font-mono">{aiCampaignResult.smsTemplate}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Registry Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              {lang === 'ar' ? 'قائمة العملاء وسجلات اليوم الأول' : 'Customer Registry'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[11px]">
              {filteredCustomers.length} {lang === 'ar' ? 'عميل مطابق' : 'matching customers'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            {lang === 'ar' ? 'اضغط على أي عميل لعرض تفاصيل مشترياته وفواتيره بالكامل' : 'Click on any customer to view full invoice breakdown'}
          </span>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {lang === 'ar' ? 'لا يوجد عملاء يطابقون شروط البحث أو الفلترة المحددة.' : 'No customers match the current search or filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">{lang === 'ar' ? 'العميل ورقم الموبايل' : 'Customer & Mobile'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الشريحة التسويقية' : 'Lifecycle Stage'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'الفرع الأساسي' : 'Primary Store'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'المنتج الأكثر شراءً' : 'Top Purchased Product'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'أول شراء (Day Zero)' : 'Day Zero Date'}</th>
                  <th className="py-3 px-4">{lang === 'ar' ? 'آخر شراء / الغياب' : 'Last Purchase'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'عدد الفواتير' : 'Invoices'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'إجمالي القطع' : 'Pieces'}</th>
                  <th className="py-3 px-4 text-left">{lang === 'ar' ? 'إجمالي الإنفاق LTV' : 'Total Spend'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'التفاصيل' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCustomers.map(customer => {
                  const badge = getStageBadge(customer.lifecycleStage);
                  const isCopied = copiedPhone === customer.mobile;

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setExpandedInvoiceId(customer.invoices[customer.invoices.length - 1]?.invoiceId || null);
                      }}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      {/* Name & Mobile */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white text-xs block group-hover:text-amber-400 transition-colors">
                            {customer.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 text-[11px] dir-ltr inline-block">
                              {customer.mobile}
                            </span>
                            <button
                              onClick={(e) => handleCopyPhone(customer.mobile, e)}
                              className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                              title={lang === 'ar' ? 'نسخ رقم الهاتف' : 'Copy phone'}
                            >
                              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <a
                              href={`https://wa.me/2${customer.mobile}?text=${encodeURIComponent('أهلاً بحضرتك، يسعدنا التواصل معكِ من أسرة فروعنا!')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-500 hover:text-emerald-400 text-[10px] flex items-center gap-0.5 ml-1"
                              title="WhatsApp"
                            >
                              <Send className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Lifecycle Stage Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {lang === 'ar' ? badge.labelAr : badge.labelEn}
                        </span>
                      </td>

                      {/* Primary Store */}
                      <td className="py-3.5 px-4 text-slate-300 text-xs">
                        {customer.primaryStore}
                      </td>

                      {/* Top Purchased Product */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const topProducts = getCustomerTopProducts(customer);
                          const top1 = topProducts[0];
                          const isFilteredItem =
                            selectedProductSku !== 'all' &&
                            topProducts.some(p => p.sku === selectedProductSku);
                          const filteredProdMatch =
                            selectedProductSku !== 'all'
                              ? topProducts.find(p => p.sku === selectedProductSku)
                              : null;
                          const displayProd = filteredProdMatch || top1;

                          if (!displayProd) {
                            return <span className="text-slate-500 text-[11px]">-</span>;
                          }

                          return (
                            <div className="space-y-1 max-w-[210px]">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="font-bold text-white text-xs block truncate group-hover:text-amber-300 transition-colors"
                                  title={displayProd.itemName}
                                >
                                  {displayProd.itemName}
                                </span>
                                {isFilteredItem && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold shrink-0">
                                    {lang === 'ar' ? 'مطابق' : 'Match'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="font-mono text-cyan-400 font-bold">{displayProd.sku}</span>
                                <span>•</span>
                                <span className="text-amber-300 font-bold font-mono">
                                  {displayProd.quantity} {lang === 'ar' ? 'قطع' : 'pcs'}
                                </span>
                                <span>•</span>
                                <span className="text-slate-300 font-mono">
                                  {displayProd.totalSpend.toLocaleString()} ج.م
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Day Zero Date */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {customer.firstPurchaseDate}
                      </td>

                      {/* Last Purchase & Inactivity */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[11px] text-slate-200 block">
                            {customer.lastPurchaseDate}
                          </span>
                          <span className={`text-[10px] ${
                            customer.daysSinceLastPurchase <= 45
                              ? 'text-emerald-400 font-medium'
                              : customer.daysSinceLastPurchase <= 75
                              ? 'text-slate-400'
                              : customer.daysSinceLastPurchase <= 150
                              ? 'text-orange-400 font-medium'
                              : 'text-rose-400 font-medium'
                          }`}>
                            {lang === 'ar' ? `منذ ${customer.daysSinceLastPurchase} يوماً` : `${customer.daysSinceLastPurchase} days ago`}
                          </span>
                        </div>
                      </td>

                      {/* Number of Invoices */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-mono font-bold text-xs">
                          {customer.invoicesCount}
                        </span>
                      </td>

                      {/* Total Pieces */}
                      <td className="py-3.5 px-4 text-center text-slate-300 font-mono text-xs">
                        {customer.totalPiecesBought}
                      </td>

                      {/* Total Spend */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="space-y-0.5">
                          <span className="font-black text-amber-300 text-xs block">
                            {customer.totalSpend.toLocaleString()} ج.م
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ATV: {customer.averageOrderValue.toLocaleString()} ج.م
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setExpandedInvoiceId(customer.invoices[customer.invoices.length - 1]?.invoiceId || null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                        >
                          <span>{lang === 'ar' ? 'عرض السجل' : 'View History'}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Full Purchase History Modal / Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStageBadge(selectedCustomer.lifecycleStage).color}`}>
                    {getStageBadge(selectedCustomer.lifecycleStage).icon}
                    {lang === 'ar' ? getStageBadge(selectedCustomer.lifecycleStage).labelAr : getStageBadge(selectedCustomer.lifecycleStage).labelEn}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ID: {selectedCustomer.id}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">{selectedCustomer.name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    {selectedCustomer.mobile}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    {lang === 'ar' ? 'الفرع الأساسي:' : 'Primary Store:'} {selectedCustomer.primaryStore}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    {lang === 'ar' ? 'أول شراء (Day Zero):' : 'Day Zero:'} {selectedCustomer.firstPurchaseDate}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {lang === 'ar' ? 'إجمالي الإنفاق التراكمي LTV:' : 'Total Lifetime Spend:'}
                </span>
                <div className="text-base font-black text-amber-300">
                  {selectedCustomer.totalSpend.toLocaleString()} ج.م
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {lang === 'ar' ? 'عدد الفواتير الكلي:' : 'Total Invoices Count:'}
                </span>
                <div className="text-base font-black text-cyan-300">
                  {selectedCustomer.invoicesCount} {lang === 'ar' ? 'فاتورة' : 'invoices'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {lang === 'ar' ? 'متوسط قيمة الفاتورة ATV:' : 'Average Ticket ATV:'}
                </span>
                <div className="text-base font-black text-emerald-300">
                  {selectedCustomer.averageOrderValue.toLocaleString()} ج.م
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {lang === 'ar' ? 'إجمالي القطع المشتراة:' : 'Total Pieces Bought:'}
                </span>
                <div className="text-base font-black text-purple-300">
                  {selectedCustomer.totalPiecesBought} {lang === 'ar' ? 'قطعة' : 'pieces'}
                </div>
              </div>
            </div>

            {/* Marketing Strategy & Recommendation */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'التشخيص التسويقي والحملة المقترحة للعميلة:' : 'Marketing Diagnostic & Recommended Campaign:'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {selectedCustomer.rfmScore}
                </span>
              </div>
              <p className="text-xs text-slate-300">{selectedCustomer.marketingNotes}</p>
              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between gap-3">
                <span>{selectedCustomer.recommendedCampaign}</span>
                <a
                  href={`https://wa.me/2${selectedCustomer.mobile}?text=${encodeURIComponent(`أهلاً بكِ أ/ ${selectedCustomer.name}، ${selectedCustomer.recommendedCampaign}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] shrink-0 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{lang === 'ar' ? 'إرسال بالواتساب' : 'WhatsApp'}</span>
                </a>
              </div>
            </div>

            {/* Customer Top Most Purchased Products Breakdown */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white">
                    {lang === 'ar'
                      ? 'المنتجات والأصناف الأكثر شراءً للعميلة منذ اليوم الأول:'
                      : 'Top Most Purchased Products Since Day Zero:'}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">
                  {lang === 'ar' ? 'مرتبة تنازلياً حسب إجمالي عدد القطع وقيمة الإنفاق' : 'Ranked by units & spend'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {getCustomerTopProducts(selectedCustomer).slice(0, 6).map((tp, idx) => {
                  const share =
                    selectedCustomer.totalPiecesBought > 0
                      ? Math.round((tp.quantity / selectedCustomer.totalPiecesBought) * 100)
                      : 0;

                  return (
                    <div
                      key={tp.sku}
                      onClick={() => {
                        setSelectedProductSku(tp.sku);
                        setSelectedCustomer(null);
                      }}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-2 group"
                      title={
                        lang === 'ar'
                          ? 'اضغط لفلترة جميع العملاء المشترين لهذا الصنف'
                          : 'Click to filter all customers who bought this item'
                      }
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold inline-flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors block truncate max-w-[150px]">
                              {tp.itemName}
                            </span>
                          </div>
                          <span className="text-[10px] text-cyan-400 font-mono font-bold block">{tp.sku}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px] font-mono shrink-0">
                          {tp.category}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                        <span className="font-mono font-bold text-amber-300">
                          {tp.quantity} {lang === 'ar' ? 'قطع' : 'pcs'}
                        </span>
                        <span className="font-mono text-slate-300 text-[11px]">
                          {tp.totalSpend.toLocaleString()} ج.م
                        </span>
                      </div>

                      {/* Basket Share Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{lang === 'ar' ? 'الحصة من سلة المشتريات' : 'Share of Basket'}</span>
                          <span className="font-mono font-bold text-slate-300">{share}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full"
                            style={{ width: `${Math.min(100, share)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5 group-hover:text-amber-400 transition-colors">
                        <span>{lang === 'ar' ? 'فلترة العملاء بهذا الصنف' : 'Filter by this item'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full Itemized Invoices List Since Day Zero */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">
                    {lang === 'ar' ? 'سجل الفواتير والمشتريات بالكامل منذ اليوم الأول (Day Zero):' : 'All Purchase Invoices Since Day Zero:'}
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedCustomer.invoices.length} {lang === 'ar' ? 'فاتورة تاريخية' : 'historical invoices'}
                </span>
              </div>

              <div className="space-y-3">
                {selectedCustomer.invoices.map((inv, index) => {
                  const isExpanded = expandedInvoiceId === inv.invoiceId;

                  return (
                    <div
                      key={inv.invoiceId}
                      className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden transition-all"
                    >
                      {/* Invoice Summary Row */}
                      <div
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.invoiceId)}
                        className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/40 transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[10px]">
                            {index + 1}
                          </span>
                          <div>
                            <span className="font-bold text-white font-mono">{inv.invoiceId}</span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="text-emerald-400 font-medium">{inv.dateStr}</span>
                              <span>•</span>
                              <span>{inv.storeName}</span>
                              {inv.salesperson && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-500">{lang === 'ar' ? 'البائع:' : 'Cashier:'} {inv.salesperson}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <span className="text-xs font-black text-amber-300 block">
                              {inv.totalAmount.toLocaleString()} ج.م
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {inv.items.length} {lang === 'ar' ? 'أصناف' : 'items'} ({inv.paymentMethod})
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {/* Itemized Table Inside Invoice */}
                      {isExpanded && (
                        <div className="border-t border-slate-800 p-3 bg-slate-900/60">
                          <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                              <thead className="text-slate-400 text-[11px] border-b border-slate-800">
                                <tr>
                                  <th className="py-2 px-3">{lang === 'ar' ? 'كود الصنف SKU' : 'SKU'}</th>
                                  <th className="py-2 px-3">{lang === 'ar' ? 'اسم الصنف والموديل' : 'Item Description'}</th>
                                  <th className="py-2 px-3">{lang === 'ar' ? 'القسم / التصنيف' : 'Category'}</th>
                                  <th className="py-2 px-3 text-center">{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                                  <th className="py-2 px-3 text-left">{lang === 'ar' ? 'سعر القطعة' : 'Unit Price'}</th>
                                  <th className="py-2 px-3 text-left">{lang === 'ar' ? 'إجمالي السعر' : 'Line Total'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/40">
                                {inv.items.map((item, itemIdx) => (
                                  <tr key={itemIdx} className="text-slate-200">
                                    <td className="py-2 px-3 font-mono text-[11px] text-cyan-400 font-bold">{item.sku}</td>
                                    <td className="py-2 px-3 font-medium text-white">{item.itemName}</td>
                                    <td className="py-2 px-3 text-slate-400 text-[11px]">{item.category}</td>
                                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-300">{item.quantity}</td>
                                    <td className="py-2 px-3 text-left font-mono text-slate-300">{item.unitPrice.toLocaleString()} ج.م</td>
                                    <td className="py-2 px-3 text-left font-mono font-bold text-amber-300">{item.totalPrice.toLocaleString()} ج.م</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
