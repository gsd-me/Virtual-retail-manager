import {
  StoreAggregated,
  ChainMetrics,
  DailyStoreSalesRecord,
  EmployeeRecord,
  CategoryDCSItem,
  AlertItem,
  CurrencyConfig,
  StoreSegment
} from '../types/retail';

export const DEFAULT_EXCLUDED_USERS = [
  'ACCOUNTING',
  'ACCOUNTING2',
  'SYSADMIN',
  'TEST',
  'WEBSITE',
  'WAREHOUSE',
  'PRISM_CUSTOM'
];

export const DEFAULT_SEGMENTS: Record<string, StoreSegment> = {
  'Al Doha': 'International',
  'Al Minya': 'Governorate',
  'Al Salam': 'Governorate',
  'Alex': 'Governorate',
  'All Season': 'Mall',
  'Aswan': 'Governorate',
  'Awlad Saqr': 'Governorate',
  'Bani Mazar': 'Governorate',
  'Damanhour': 'Governorate',
  'Doqi': 'Mall',
  'Faisl': 'Governorate',
  'Faqous': 'Governorate',
  'Fayoum': 'Governorate',
  'Ismailya': 'Governorate',
  'Mahala New': 'Governorate',
  'Mall of Arabia': 'Mall',
  'Mall of Tanta': 'Mall',
  'Mansoura': 'Governorate',
  'Mansoura Toshka': 'Governorate',
  'Online': 'Online',
  'Open Air': 'Mall',
  'Port Said': 'Governorate',
  'QENA': 'Governorate',
  'Samanoud': 'Governorate',
  'Shbeen Elkoum': 'Governorate',
  'Shubra': 'Outlet',
  'Zaqazek': 'Governorate',
};

export const DEFAULT_CURRENCIES: Record<string, CurrencyConfig> = {
  'Al Doha': {
    storeName: 'Al Doha',
    currencyCode: 'QAR',
    exchangeRate: 13.5, // 1 QAR = ~13.5 EGP
    isExcludedFromChainTotal: true, // Default exclude until user confirms
  },
};

// Format currency in Egyptian Pounds with thousands separator
export function formatCurrency(amount: number, currency: string = 'EGP', lang: 'ar' | 'en' = 'ar'): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  const sym = lang === 'ar' ? (currency === 'EGP' ? 'ج.م' : currency) : (currency === 'EGP' ? 'EGP' : currency);
  return `${formatted} ${sym}`;
}

export function formatNumber(val: number, lang: 'ar' | 'en' = 'ar', decimals: number = 0): string {
  if (decimals > 0) {
    return val.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return Math.round(val).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
}

export function formatPercent(val: number, lang: 'ar' | 'en' = 'ar'): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

// Compute standard deviation
function computeStdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Recompute weighted metrics and aggregate stores
export function computeStoreAggregates(
  storesDailySales: DailyStoreSalesRecord[],
  employeesData: EmployeeRecord[],
  currencyConfigs: Record<string, CurrencyConfig>,
  segmentConfigs: Record<string, StoreSegment>,
  flaggedUsers: string[],
  floatingStaffOverrides: Record<string, string>
): {
  stores: StoreAggregated[];
  chainMetrics: ChainMetrics;
  normalizedEmployees: EmployeeRecord[];
  alerts: AlertItem[];
} {
  // 1. Group daily sales by store
  const storeDailyMap = new Map<string, DailyStoreSalesRecord[]>();
  storesDailySales.forEach(rec => {
    if (!storeDailyMap.has(rec.storeName)) {
      storeDailyMap.set(rec.storeName, []);
    }
    storeDailyMap.get(rec.storeName)!.push(rec);
  });

  // 2. Identify floating employees and flagged accounts
  const employeeStoreMap = new Map<string, Set<string>>();
  employeesData.forEach(e => {
    const norm = e.employee.trim().toUpperCase();
    if (!employeeStoreMap.has(norm)) {
      employeeStoreMap.set(norm, new Set());
    }
    employeeStoreMap.get(norm)!.add(e.storeName);
  });

  const normalizedEmployees: EmployeeRecord[] = employeesData.map(e => {
    const normName = e.employee.trim().toUpperCase();
    const storesSet = employeeStoreMap.get(normName) || new Set([e.storeName]);
    const isFloating = storesSet.size > 1;
    const isFlaggedUser = flaggedUsers.includes(normName);
    
    // Weighted TRX recalculation
    const derivedTrx = e.atv > 0 ? e.extPrice / e.atv : 0;
    const cleanUpt = derivedTrx > 0 ? e.soldQty / derivedTrx : e.upt;
    const cleanUtv = e.soldQty > 0 ? e.extPrice / e.soldQty : e.utv;

    let coachingCat = 'متوازن';
    if (!isFlaggedUser) {
      if (cleanUpt < 1.4 && derivedTrx > 30) {
        coachingCat = 'يحتاج تدريب بيع إضافي (UPT)';
      } else if (e.atv < 800 && cleanUpt >= 1.7) {
        coachingCat = 'يحتاج توجيه لرفع قيمة الفاتورة (ATV)';
      } else if (e.extPrice > 250000 && cleanUpt >= 1.8) {
        coachingCat = 'نجم مبيعات (Top Performer)';
      } else if (derivedTrx < 30) {
        coachingCat = 'بحاجة لدعم في إغلاق العمليات';
      }
    }

    return {
      ...e,
      employee: normName,
      trx: Math.round(derivedTrx),
      upt: Number(cleanUpt.toFixed(2)),
      atv: Math.round(e.atv),
      utv: Math.round(cleanUtv),
      isFlaggedUser,
      isFloating,
      floatingStores: Array.from(storesSet),
      coachingCategory: coachingCat,
    };
  });

  // Calculate ranks within stores & segments
  const activeStaff = normalizedEmployees.filter(e => !e.isFlaggedUser);
  const storeStaffMap = new Map<string, EmployeeRecord[]>();
  activeStaff.forEach(st => {
    if (!storeStaffMap.has(st.storeName)) storeStaffMap.set(st.storeName, []);
    storeStaffMap.get(st.storeName)!.push(st);
  });
  storeStaffMap.forEach(list => {
    list.sort((a, b) => b.extPrice - a.extPrice);
    list.forEach((st, idx) => {
      st.rankInStore = idx + 1;
    });
  });

  // 3. Aggregate each store
  const storeNames = Array.from(new Set([
    ...Array.from(storeDailyMap.keys()),
    ...normalizedEmployees.map(e => e.storeName)
  ]));

  let totalChainSales = 0;
  let totalChainUnits = 0;
  let totalChainTrx = 0;
  let totalIncludedStores = 0;

  const stores: StoreAggregated[] = storeNames.map(name => {
    const dailyRecords = (storeDailyMap.get(name) || []).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    const storeEmployees = normalizedEmployees.filter(e => e.storeName === name);
    const storeActiveStaff = storeEmployees.filter(e => !e.isFlaggedUser);

    // Sum daily sales
    let storeSales = dailyRecords.reduce((sum, d) => sum + d.extPrice, 0);
    let storeUnits = dailyRecords.reduce((sum, d) => sum + d.soldQty, 0);
    let storeTrx = dailyRecords.reduce((sum, d) => sum + (d.atv > 0 ? d.extPrice / d.atv : 0), 0);

    // Fallback if daily records were empty but employee records exist
    if (storeSales === 0 && storeEmployees.length > 0) {
      storeSales = storeEmployees.reduce((sum, e) => sum + e.extPrice, 0);
      storeUnits = storeEmployees.reduce((sum, e) => sum + e.soldQty, 0);
      storeTrx = storeEmployees.reduce((sum, e) => sum + e.trx, 0);
    }

    storeTrx = Math.max(1, Math.round(storeTrx));

    // Weighted formulas (NEVER simple average)
    const weightedAtv = storeTrx > 0 ? Math.round(storeSales / storeTrx) : 0;
    const weightedUpt = storeTrx > 0 ? Number((storeUnits / storeTrx).toFixed(2)) : 0;
    const weightedUtv = storeUnits > 0 ? Math.round(storeSales / storeUnits) : 0;

    // Daily volatility CV (standard deviation / mean)
    const dailyValues = dailyRecords.map(d => d.extPrice);
    const dailyMean = dailyValues.length > 0 ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length : 0;
    const dailyStd = computeStdDev(dailyValues);
    const dailyVolatilityCv = dailyMean > 0 ? Number((dailyStd / dailyMean).toFixed(3)) : 0;

    // H1 vs H2 daily comparison
    // Days 1..15 vs 16..end
    const h1Days = dailyRecords.filter(d => {
      const dayNum = parseInt(d.dateStr.split('-')[2] || '0', 10);
      return dayNum <= 15;
    });
    const h2Days = dailyRecords.filter(d => {
      const dayNum = parseInt(d.dateStr.split('-')[2] || '0', 10);
      return dayNum > 15;
    });

    const h1SalesSum = h1Days.reduce((sum, d) => sum + d.extPrice, 0);
    const h2SalesSum = h2Days.reduce((sum, d) => sum + d.extPrice, 0);
    const h1Count = Math.max(1, h1Days.length);
    const h2Count = Math.max(1, h2Days.length);

    const h1DailyAvg = Math.round(h1SalesSum / h1Count);
    const h2DailyAvg = Math.round(h2SalesSum / h2Count);
    const h2h1ChangePercent = h1DailyAvg > 0 ? Number((((h2DailyAvg - h1DailyAvg) / h1DailyAvg) * 100).toFixed(1)) : 0;

    // Top-3 staff dependency
    const sortedStaff = [...storeActiveStaff].sort((a, b) => b.extPrice - a.extPrice);
    const top3Sales = sortedStaff.slice(0, 3).reduce((sum, s) => sum + s.extPrice, 0);
    const top3StaffDependencyPercent = storeSales > 0 ? Number(((top3Sales / storeSales) * 100).toFixed(1)) : 0;

    // Unattributed sales (accounts like ACCOUNTING, SYSADMIN, WEBSITE)
    const unattributedEmployees = storeEmployees.filter(e => e.isFlaggedUser);
    const unattributedAmount = unattributedEmployees.reduce((sum, e) => sum + e.extPrice, 0);
    const unattributedSalesPercent = storeSales > 0 ? Number(((unattributedAmount / storeSales) * 100).toFixed(1)) : 0;

    // Online return rate: |negative sales| / gross positive sales
    let returnRatePercent: number | undefined;
    const segment = segmentConfigs[name] || 'Mall';
    if (segment === 'Online' || name.toLowerCase().includes('online') || name.toLowerCase().includes('website')) {
      const negativeSum = dailyRecords.filter(d => d.extPrice < 0).reduce((sum, d) => sum + Math.abs(d.extPrice), 0);
      const positiveSum = dailyRecords.filter(d => d.extPrice > 0).reduce((sum, d) => sum + d.extPrice, 0);
      returnRatePercent = positiveSum > 0 ? Number(((negativeSum / positiveSum) * 100).toFixed(1)) : 0;
    }

    // Currency configuration
    const currConf = currencyConfigs[name] || {
      storeName: name,
      currencyCode: 'EGP',
      exchangeRate: 1.0,
      isExcludedFromChainTotal: false,
    };

    const isExcluded = currConf.isExcludedFromChainTotal;

    if (!isExcluded) {
      totalChainSales += storeSales;
      totalChainUnits += storeUnits;
      totalChainTrx += storeTrx;
      totalIncludedStores += 1;
    }

    // Data quality score (100 minus penalties for issues)
    let dqScore = 100;
    if (unattributedSalesPercent > 10) dqScore -= 25;
    if (unattributedSalesPercent > 20) dqScore -= 20;
    if (dailyRecords.some(d => d.extPrice <= 0)) dqScore -= 15;
    if (storeActiveStaff.length === 0) dqScore -= 20;
    if (h2h1ChangePercent < -30) dqScore -= 10;
    dqScore = Math.max(20, Math.min(100, dqScore));

    return {
      name,
      segment,
      totalSales: storeSales,
      totalUnits: storeUnits,
      totalTrx: storeTrx,
      weightedAtv,
      weightedUpt,
      weightedUtv,
      salesSharePercent: 0, // calculated below once chain total is known
      dailyVolatilityCv,
      h1DailyAvg,
      h2DailyAvg,
      h2h1ChangePercent,
      activeStaffCount: storeActiveStaff.length,
      top3StaffDependencyPercent,
      unattributedSalesPercent,
      unattributedAmount,
      returnRatePercent,
      isExcluded,
      currency: currConf.currencyCode,
      exchangeRate: currConf.exchangeRate,
      dataQualityScore: dqScore,
    };
  });

  // Calculate sales share %
  stores.forEach(s => {
    s.salesSharePercent = (!s.isExcluded && totalChainSales > 0)
      ? Number(((s.totalSales / totalChainSales) * 100).toFixed(1))
      : 0;
  });

  // Sort stores for top/bottom
  const includedStores = stores.filter(s => !s.isExcluded).sort((a, b) => b.totalSales - a.totalSales);
  const topStore = includedStores[0] || { name: 'N/A', sales: 0 };
  const bottomStore = includedStores[includedStores.length - 1] || { name: 'N/A', sales: 0 };

  const chainMetrics: ChainMetrics = {
    totalSales: totalChainSales,
    totalUnits: totalChainUnits,
    totalTrx: totalChainTrx,
    weightedAtv: totalChainTrx > 0 ? Math.round(totalChainSales / totalChainTrx) : 0,
    weightedUpt: totalChainTrx > 0 ? Number((totalChainUnits / totalChainTrx).toFixed(2)) : 0,
    weightedUtv: totalChainUnits > 0 ? Math.round(totalChainSales / totalChainUnits) : 0,
    totalStoresCount: includedStores.length,
    activeStaffCount: activeStaff.length,
    topStore: { name: topStore.name, sales: topStore.totalSales },
    bottomStore: { name: bottomStore.name, sales: bottomStore.totalSales },
  };

  // 4. Rule-Based Alert Engine (Section 7)
  const alerts: AlertItem[] = [];

  stores.forEach(store => {
    if (store.isExcluded) return;
    const dailyRecords = storeDailyMap.get(store.name) || [];

    // Rule 1: Store per-day sales in the last 7 days < 80% of its period average
    if (dailyRecords.length >= 10) {
      const sorted = [...dailyRecords].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      const last7 = sorted.slice(-7);
      const last7Avg = last7.reduce((sum, d) => sum + d.extPrice, 0) / 7;
      const periodAvg = store.totalSales / sorted.length;
      if (periodAvg > 0 && last7Avg < 0.8 * periodAvg) {
        const dropPct = Math.round(((periodAvg - last7Avg) / periodAvg) * 100);
        alerts.push({
          id: `alert-last7-${store.name}`,
          type: 'critical',
          category: 'store_drop',
          titleAr: `هبوط حاد في آخر 7 أيام بفرع ${store.name}`,
          titleEn: `Sharp 7-day drop at ${store.name}`,
          descriptionAr: `متوسط مبيعات الفرع في آخر 7 أيام (${Math.round(last7Avg).toLocaleString()} ج.م) أقل بنسبة ${dropPct}% من متوسط الشهر (${Math.round(periodAvg).toLocaleString()} ج.م).`,
          descriptionEn: `Last 7 days average is ${dropPct}% lower than the monthly average.`,
          targetEntity: store.name,
          metricValue: `${Math.round(last7Avg).toLocaleString()} ج.م/يوم`,
          benchmarkValue: `${Math.round(periodAvg).toLocaleString()} ج.م/يوم`,
          actionAr: 'مراجعة حركة الزوار وفحص توفر التشكيلة الترويجية مع مدير الفرع فوراً.',
        });
      }
    }

    // Rule 2: Store H2-vs-H1 per-day decline > 15%
    if (store.h2h1ChangePercent < -15) {
      alerts.push({
        id: `alert-h2h1-${store.name}`,
        type: 'warning',
        category: 'h2_decline',
        titleAr: `تراجع مبيعات النصف الثاني بفرع ${store.name}`,
        titleEn: `H2 sales decline at ${store.name}`,
        descriptionAr: `تراجع المعدل اليومي للفرع في النصف الثاني بنسبة ${Math.abs(store.h2h1ChangePercent)}% مقارنة بالنصف الأول (${store.h2DailyAvg.toLocaleString()} ج.م vs ${store.h1DailyAvg.toLocaleString()} ج.م).`,
        descriptionEn: `H2 daily run-rate declined by ${Math.abs(store.h2h1ChangePercent)}% vs H1.`,
        targetEntity: store.name,
        metricValue: `${store.h2h1ChangePercent}%`,
        benchmarkValue: 'تراجع مقبول ≤ 5%',
        actionAr: 'تكثيف الحملات الموضعية وضخ قطع جديدة لتنشيط النصف الثاني من الشهر.',
      });
    }

    // Rule 3: Unattributed sales > 10% of store sales
    if (store.unattributedSalesPercent > 10) {
      alerts.push({
        id: `alert-unattr-${store.name}`,
        type: 'critical',
        category: 'unattributed',
        titleAr: `مبيعات غير منسوبة مرتفعة بفرع ${store.name} (${store.unattributedSalesPercent}%)`,
        titleEn: `High unattributed sales at ${store.name}`,
        descriptionAr: `تم تسجيل مبيعات بقيمة ${store.unattributedAmount.toLocaleString()} ج.م (${store.unattributedSalesPercent}%) تحت حسابات عامة (مثل ACCOUNTING / PRISM) بدلاً من البائعين الفعليين.`,
        descriptionEn: `Unattributed sales exceeded threshold (10%). Total: ${store.unattributedAmount.toLocaleString()} EGP.`,
        targetEntity: store.name,
        metricValue: `${store.unattributedSalesPercent}%`,
        benchmarkValue: 'الحد الأقصى المسموح 10%',
        actionAr: 'التنبيه على الكاشير بتسجيل كود البائع على كل فاتورة فوراً لضمان عدالة العمولات.',
      });
    }

    // Rule 5: Online return rate > 20%
    if (store.returnRatePercent !== undefined && store.returnRatePercent > 20) {
      alerts.push({
        id: `alert-return-${store.name}`,
        type: 'critical',
        category: 'online_return',
        titleAr: `نسبة مرتجعات قياسية بمتجر الأونلاين (${store.returnRatePercent}%)`,
        titleEn: `High online return rate (${store.returnRatePercent}%)`,
        descriptionAr: `تجاوزت نسبة المرتجعات للأونلاين حاجز الـ 20%، مما يستنزف هوامش الربح ويزيد تكاليف الشحن العكسي.`,
        descriptionEn: `Online return rate reached ${store.returnRatePercent}%, exceeding the 20% limit.`,
        targetEntity: store.name,
        metricValue: `${store.returnRatePercent}%`,
        benchmarkValue: 'الحد الأقصى 20%',
        actionAr: 'تدقيق دليل المقاسات بالمتجر ومراجعة المنتجات الأكثر إرجاعاً مع فريق الجودة.',
      });
    }
  });

  // Rule 4: Salesperson UPT < 80% of store UPT with >= 30 transactions
  activeStaff.forEach(emp => {
    const parentStore = stores.find(s => s.name === emp.storeName);
    if (!parentStore || parentStore.isExcluded) return;

    if (emp.trx >= 30 && parentStore.weightedUpt > 0) {
      const uptThreshold = 0.8 * parentStore.weightedUpt;
      if (emp.upt < uptThreshold) {
        const gapPct = Math.round(((parentStore.weightedUpt - emp.upt) / parentStore.weightedUpt) * 100);
        alerts.push({
          id: `alert-upt-${emp.storeName}-${emp.employee}`,
          type: 'warning',
          category: 'staff_upt',
          titleAr: `ضعف مؤشر سلة العميل (UPT) للبائع ${emp.employee}`,
          titleEn: `Low UPT for ${emp.employee}`,
          descriptionAr: `مؤشر UPT للبائع (${emp.upt}) أقل بنسبة ${gapPct}% من متوسط فرع ${emp.storeName} (${parentStore.weightedUpt}) رغم تحقيقه ${emp.trx} فاتورة.`,
          descriptionEn: `Employee UPT (${emp.upt}) is ${gapPct}% lower than store average (${parentStore.weightedUpt}).`,
          targetEntity: `${emp.storeName} - ${emp.employee}`,
          metricValue: `${emp.upt} قطة/فاتورة`,
          benchmarkValue: `${parentStore.weightedUpt} (متوسط الفرع)`,
          actionAr: 'تدريب البائع على تقنيات البيع الإضافي (Add-on selling) وعرض الإكسسوارات عند الكاشير.',
        });
      }
    }
  });

  return {
    stores,
    chainMetrics,
    normalizedEmployees,
    alerts,
  };
}

// Day of week normalized analysis
export function computeDayOfWeekAnalysis(dailySales: DailyStoreSalesRecord[], lang: 'ar' | 'en' = 'ar') {
  const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Count occurrences of each day-of-week in the dataset
  const occurrences = [0, 0, 0, 0, 0, 0, 0];
  const totalSalesPerDay = [0, 0, 0, 0, 0, 0, 0];
  const uniqueDatesByDow = [new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>()];

  dailySales.forEach(d => {
    const dow = d.dayOfWeek;
    uniqueDatesByDow[dow].add(d.dateStr);
    totalSalesPerDay[dow] += d.extPrice;
  });

  const result = daysAr.map((nameAr, idx) => {
    const occ = Math.max(1, uniqueDatesByDow[idx].size);
    const total = totalSalesPerDay[idx];
    const normalizedAvg = Math.round(total / occ);
    return {
      dayIndex: idx,
      name: lang === 'ar' ? nameAr : daysEn[idx],
      occurrences: occ,
      totalSales: total,
      normalizedAvg,
    };
  });

  return result;
}

// Pareto analysis for styles (Section 4.5)
export function computeStylePareto(styles: { styleCode: string; styleName: string; totalUnits: number }[]) {
  const sorted = [...styles].sort((a, b) => b.totalUnits - a.totalUnits);
  const totalChainUnits = sorted.reduce((sum, s) => sum + Math.max(0, s.totalUnits), 0);

  let runningSum = 0;
  let count50 = 0;
  let count80 = 0;

  const paretoStyles = sorted.map((s, index) => {
    if (s.totalUnits > 0) {
      runningSum += s.totalUnits;
    }
    const cumulativePct = totalChainUnits > 0 ? Number(((runningSum / totalChainUnits) * 100).toFixed(1)) : 0;
    
    if (cumulativePct <= 50 || (count50 === 0 && cumulativePct > 50)) {
      count50 = index + 1;
    }
    if (cumulativePct <= 80 || (count80 === 0 && cumulativePct > 80)) {
      count80 = index + 1;
    }

    return {
      ...s,
      cumulativeShare: cumulativePct,
      isLongTail: s.totalUnits <= 10,
    };
  });

  return {
    paretoStyles,
    count50,
    count80,
    totalStyles: sorted.length,
    longTailCount: sorted.filter(s => s.totalUnits <= 10).length,
  };
}

// Rule 6: Check Allocation (categories with 0 units in a store while >5% in segment)
export function computeCheckAllocationList(
  categories: CategoryDCSItem[],
  stores: StoreAggregated[]
): {
  storeName: string;
  segment: string;
  category: string;
  segmentUnitSharePercent: number;
  messageAr: string;
}[] {
  const result: {
    storeName: string;
    segment: string;
    category: string;
    segmentUnitSharePercent: number;
    messageAr: string;
  }[] = [];

  // Group stores by segment
  const segmentStores = new Map<string, StoreAggregated[]>();
  stores.forEach(s => {
    if (s.isExcluded) return;
    if (!segmentStores.has(s.segment)) segmentStores.set(s.segment, []);
    segmentStores.get(s.segment)!.push(s);
  });

  segmentStores.forEach((segStores, segment) => {
    const totalSegUnits = segStores.reduce((sum, s) => sum + s.totalUnits, 0);
    if (totalSegUnits === 0) return;

    categories.forEach(cat => {
      // Calculate units of this category across this segment
      const segCatUnits = segStores.reduce((sum, s) => sum + (cat.storeUnits[s.name] || 0), 0);
      const segSharePct = Number(((segCatUnits / totalSegUnits) * 100).toFixed(1));

      if (segSharePct > 5.0) {
        segStores.forEach(s => {
          const storeCatUnits = cat.storeUnits[s.name] || 0;
          if (storeCatUnits === 0) {
            result.push({
              storeName: s.name,
              segment,
              category: cat.rawCategory,
              segmentUnitSharePercent: segSharePct,
              messageAr: `فئة ${cat.rawCategory} تمثل ${segSharePct}% من مبيعات شريحة ${segment}، ولكن مبيعاتها صفر بفرع ${s.name}. يرجى فحص التوزيع المخزني فوراً.`,
            });
          }
        });
      }
    });
  });

  return result;
}

// Interface for 30-Day Sales Forecast
export interface ForecastDataPoint {
  date: string;
  dayLabel: string;
  dayNameAr: string;
  dayNameEn: string;
  actualSales?: number | null;
  predictedSales?: number | null;
  lowerBound?: number | null;
  upperBound?: number | null;
  isForecast: boolean;
}

export interface SalesForecastResult {
  timeline: ForecastDataPoint[];
  totalForecastRevenue: number;
  avgDailyForecast: number;
  peakForecastDay: { date: string; dayName: string; sales: number };
  growthVsHistoricalPercent: number;
  totalHistoricalRevenue: number;
  dailySeasonalityFactors: { dow: number; nameAr: string; nameEn: string; factor: number }[];
}

// Compute 30-day forecast based on daily historical pattern, day-of-week seasonality, and trend
export function compute30DaySalesForecast(
  historicalDaily: { date: string; sales: number }[],
  scenarioMultiplier: number = 1.0, // 1.0 = Baseline, 1.10 = Optimistic, 0.90 = Conservative
  lang: 'ar' | 'en' = 'ar'
): SalesForecastResult {
  const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (historicalDaily.length === 0) {
    return {
      timeline: [],
      totalForecastRevenue: 0,
      avgDailyForecast: 0,
      peakForecastDay: { date: '', dayName: '', sales: 0 },
      growthVsHistoricalPercent: 0,
      totalHistoricalRevenue: 0,
      dailySeasonalityFactors: [],
    };
  }

  const sorted = [...historicalDaily].sort((a, b) => a.date.localeCompare(b.date));
  const totalHistorical = sorted.reduce((sum, d) => sum + d.sales, 0);
  const meanSales = totalHistorical / sorted.length;

  // 1. Compute Day-of-Week seasonality factors
  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];

  sorted.forEach(d => {
    const dt = new Date(d.date);
    const dow = isNaN(dt.getDay()) ? 0 : dt.getDay();
    dowTotals[dow] += d.sales;
    dowCounts[dow] += 1;
  });

  const dailySeasonalityFactors = dowTotals.map((tot, idx) => {
    const count = Math.max(1, dowCounts[idx]);
    const dowAvg = tot / count;
    const factor = meanSales > 0 ? Number((dowAvg / meanSales).toFixed(3)) : 1.0;
    return {
      dow: idx,
      nameAr: daysAr[idx],
      nameEn: daysEn[idx],
      factor: Math.max(0.4, Math.min(2.2, factor)),
    };
  });

  // 2. Linear Regression for underlying trajectory
  const n = sorted.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  sorted.forEach((d, idx) => {
    sumX += idx;
    sumY += d.sales;
    sumXY += idx * d.sales;
    sumXX += idx * idx;
  });

  const denom = (n * sumXX - sumX * sumX) || 1;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const rawIntercept = (sumY - slope * sumX) / n;
  const intercept = Math.max(meanSales * 0.7, rawIntercept);

  // Residual standard deviation for confidence bands
  const residuals = sorted.map((d, idx) => {
    const expected = (intercept + slope * idx);
    return Math.pow(d.sales - expected, 2);
  });
  const stdResidual = Math.sqrt(residuals.reduce((a, b) => a + b, 0) / Math.max(1, n - 2));

  // 3. Build Timeline combining historical + 30 forecast days
  const timeline: ForecastDataPoint[] = [];

  // Add historical points
  sorted.forEach(d => {
    const dt = new Date(d.date);
    const dow = dt.getDay();
    timeline.push({
      date: d.date,
      dayLabel: d.date.split('-').slice(1).join('/'),
      dayNameAr: daysAr[dow] || '',
      dayNameEn: daysEn[dow] || '',
      actualSales: Math.round(d.sales),
      predictedSales: null,
      lowerBound: null,
      upperBound: null,
      isForecast: false,
    });
  });

  // Last historical date
  const lastHistorical = sorted[sorted.length - 1];
  const lastDateObj = new Date(lastHistorical.date);

  // Seamless connection point on the last historical day
  const lastIndex = timeline.length - 1;
  if (lastIndex >= 0) {
    timeline[lastIndex].predictedSales = Math.round(lastHistorical.sales);
    timeline[lastIndex].lowerBound = Math.round(lastHistorical.sales);
    timeline[lastIndex].upperBound = Math.round(lastHistorical.sales);
  }

  // 4. Project Next 30 Days
  let forecastRevenueSum = 0;
  let peakDay = { date: '', dayName: '', sales: 0 };

  for (let fDay = 1; fDay <= 30; fDay++) {
    const futureDateObj = new Date(lastDateObj);
    futureDateObj.setDate(lastDateObj.getDate() + fDay);

    const y = futureDateObj.getFullYear();
    const m = String(futureDateObj.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(futureDateObj.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayOfMonth}`;
    const dow = futureDateObj.getDay();

    const dowFactor = dailySeasonalityFactors[dow]?.factor || 1.0;
    const timeIndex = n + fDay - 1;
    const trendValue = intercept + slope * timeIndex;

    // Apply baseline + slope + day-of-week seasonality + scenario
    const basePrediction = Math.max(0, trendValue * dowFactor * scenarioMultiplier);
    const roundedPrediction = Math.round(basePrediction);

    // Confidence interval expands slightly with forecast horizon
    const horizonSpread = 1.15 * stdResidual * Math.sqrt(1 + fDay / 30);
    const lower = Math.max(0, Math.round(basePrediction - horizonSpread));
    const upper = Math.round(basePrediction + horizonSpread);

    forecastRevenueSum += roundedPrediction;

    const dayName = lang === 'ar' ? daysAr[dow] : daysEn[dow];
    if (roundedPrediction > peakDay.sales) {
      peakDay = {
        date: dateStr,
        dayName,
        sales: roundedPrediction,
      };
    }

    timeline.push({
      date: dateStr,
      dayLabel: `${m}/${dayOfMonth}`,
      dayNameAr: daysAr[dow],
      dayNameEn: daysEn[dow],
      actualSales: null,
      predictedSales: roundedPrediction,
      lowerBound: lower,
      upperBound: upper,
      isForecast: true,
    });
  }

  const avgDailyForecast = Math.round(forecastRevenueSum / 30);
  const growthVsHistoricalPercent = totalHistorical > 0
    ? Number((((forecastRevenueSum - totalHistorical) / totalHistorical) * 100).toFixed(1))
    : 0;

  return {
    timeline,
    totalForecastRevenue: forecastRevenueSum,
    avgDailyForecast,
    peakForecastDay: peakDay,
    growthVsHistoricalPercent,
    totalHistoricalRevenue: totalHistorical,
    dailySeasonalityFactors,
  };
}
