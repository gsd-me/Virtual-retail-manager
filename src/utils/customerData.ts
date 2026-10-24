import {
  CustomerRecord,
  CustomerInvoice,
  CustomerPurchaseItem,
  CustomerLifecycleStage,
  CustomerTopProduct,
} from '../types/retail';
import { STORE_NAMES_LIST } from './sampleData';

// Catalog items derived from real chain styles
export const CATALOG_ITEMS = [
  { sku: 'S6121', name: 'DRESS CHIFFON PRINTED', category: 'CASUAL DRESS', price: 2190 },
  { sku: 'S6262', name: 'PANTS CREPE', category: 'CASUAL PANTS', price: 1450 },
  { sku: 'S6151', name: 'BLOUSE STRIPED', category: 'CASUAL BLOUSE', price: 1290 },
  { sku: 'S5985', name: 'SHAWL SATIN PRINTED', category: 'ACCESSORY SCARF', price: 590 },
  { sku: 'S6002', name: 'CARDIGAN SATIN PRINTED', category: 'CASUAL CARDIGAN', price: 1690 },
  { sku: 'S6165', name: 'SKIRT DOUBLE FLARED', category: 'CASUAL SKIRT', price: 1390 },
  { sku: 'S6231', name: 'VEST SLEEVELESS TR', category: 'CASUAL BASIC', price: 990 },
  { sku: 'S6227', name: 'BLOUSE CHIFFON', category: 'CASUAL BLOUSE', price: 1250 },
  { sku: 'S6227/1', name: 'SKIRT PLEATED', category: 'CASUAL SKIRT', price: 1490 },
  { sku: 'S6259', name: 'CARDIGAN SATIN PRINTED', category: 'CASUAL CARDIGAN', price: 1750 },
  { sku: 'S6213', name: 'BLOUSE GUIPURE JAPANESE', category: 'CASUAL BLOUSE', price: 1590 },
  { sku: 'S6159', name: 'DRESS PRINTED READY', category: 'CASUAL DRESS', price: 2290 },
  { sku: 'S6164', name: 'DRESS CHIFFON EFFECT', category: 'CASUAL DRESS', price: 2390 },
  { sku: 'S6231/1', name: 'PANTS WAIST ELASTIC', category: 'CASUAL PANTS', price: 1350 },
  { sku: 'Y131', name: 'SCARF THAI COTTON', category: 'ACCESSORY SCARF', price: 490 },
  { sku: 'S6206', name: 'BLAZER LINEN', category: 'CASUAL BLAZER', price: 2650 },
  { sku: 'S6250/1', name: 'PANTS SATIN WIDE', category: 'CASUAL PANTS', price: 1590 },
  { sku: '8284', name: 'PANTS JEANS WIDE-LEG', category: 'JEANS PANTS', price: 1490 },
  { sku: '29084', name: 'JACKET SUIT JEANS', category: 'JEANS JACKET', price: 2190 },
];

const ARABIC_FIRST_NAMES = [
  'نورهان', 'ريم', 'داليا', 'مريم', 'سارة', 'ياسمين', 'شيرين', 'آية', 'منة', 'هدير',
  'فاطمة', 'أسماء', 'مي', 'رنا', 'سلمى', 'هند', 'إيمان', 'نهى', 'بسمة', 'دينا',
  'حبيبة', 'سندس', 'رضوى', 'أبرار', 'رحمة', 'نانسي', 'ولاء', 'مروة', 'حنين', 'سمر'
];

const ARABIC_LAST_NAMES = [
  'الشريف', 'مصطفى', 'عبد العزيز', 'السعدني', 'الألفي', 'فوزي', 'حسن', 'الشاذلي', 'المهدي', 'رمضان',
  'النجار', 'راضي', 'حمزة', 'خاطر', 'البنا', 'عثمان', 'سالم', 'الطنطاوي', 'منصور', 'إبراهيم',
  'الحداد', 'فايق', 'سعيد', 'زايد', 'البدري', 'نصر', 'عفيفي', 'شعبان', 'البحيري', 'الهواري'
];

const CASHIERS = [
  'AHMED TAREK', 'HAMZA HASSAN', 'DONIA MAHDI', 'RADWA AHMED', 'ALI KHATER',
  'JUDY WALID', 'AYA MUSTAFA', 'HANEEN MOHAMED', 'SONDOS ALAA', 'MENNAH ASHRAF'
];

/**
 * Determine marketing criteria segment:
 * - Champion: High frequency (invoices >= 5 or spend >= 15000), recent purchase <= 45 days.
 * - Regular: Moderate frequency (2-4 invoices or spend 3500-15000), recent purchase <= 75 days.
 * - Near to Retire: Prior customer (invoices >= 2 or spend >= 2500), but idle for 76 to 150 days.
 * - Retired: Inactive > 150 days without recent purchase.
 */
export function classifyCustomerSegment(
  invoicesCount: number,
  totalSpend: number,
  daysSinceLastPurchase: number
): { stage: CustomerLifecycleStage; notes: string; campaign: string; rfm: string } {
  if (daysSinceLastPurchase <= 45 && (invoicesCount >= 5 || totalSpend >= 14000)) {
    return {
      stage: 'champion',
      notes: 'عميلة ذهبية عالية الإنفاق والتكرار. ولاء مرتفع ومعدل عودة سريع.',
      campaign: 'دعوة خاصة لأسبوع المجموعات الجديدة VIP + كود خصم حصري 15% تقديري.',
      rfm: '5-5-5 (Champions)'
    };
  }

  if (daysSinceLastPurchase > 150) {
    return {
      stage: 'retired',
      notes: 'عميلة متوقفة عن الشراء لأكثر من 5 أشهر (خاملة/فقيدة). هناك احتمال للتحول للمنافسين.',
      campaign: 'حملة استعادة قوية: قسيمة شراء بقيمة 400 ج.م أو خصم 25% مع رسالة اشتياق.',
      rfm: '1-2-2 (Dormant / Lost)'
    };
  }

  if (daysSinceLastPurchase > 75) {
    return {
      stage: 'near_to_retire',
      notes: 'عميلة على وشك التوقف. تجاوزت دورة الشراء المعتادة (75-150 يوم). تحتاج تنشيط فوري.',
      campaign: 'تذكير رقيق بالتشكيلة الخريفية الجديدة مع شحن مجاني أو خصم 10% عبر واتساب.',
      rfm: '2-3-3 (At Risk)'
    };
  }

  return {
    stage: 'regular',
    notes: 'عميلة منتظمة ومستقرة، متوسط مشترياتها متزن وتتسوق بانتظام.',
    campaign: 'اقتراح قطع مكملة (Cross-sell) للإكسسوارات والبليزر لزيادة سلة المشتريات UPT.',
    rfm: '4-4-4 (Loyal Regular)'
  };
}

/**
 * Generate rich customer dataset with full Day-Zero purchase history
 */
export function generateRealisticCustomers(count = 120): CustomerRecord[] {
  const customers: CustomerRecord[] = [];
  const referenceDate = new Date('2026-08-31T23:59:59Z');

  // Prefix pools for Egyptian mobile operators
  const prefixes = ['010', '011', '012', '015'];

  // Distribution targets for marketing cohorts:
  // ~25% Champions, ~40% Regulars, ~20% Near to Retire, ~15% Retired
  for (let i = 0; i < count; i++) {
    const firstName = ARABIC_FIRST_NAMES[i % ARABIC_FIRST_NAMES.length];
    const lastName = ARABIC_LAST_NAMES[(i * 3 + 7) % ARABIC_LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;

    const prefix = prefixes[i % prefixes.length];
    const randomSuffix = String(10000000 + ((i * 84729 + 12345) % 89999999)).slice(0, 8);
    const mobile = `${prefix}${randomSuffix}`;

    const storeName = STORE_NAMES_LIST[i % STORE_NAMES_LIST.length];

    // Determine target segment to ensure realistic representation
    let targetCohort: CustomerLifecycleStage;
    const cohortSeed = i % 100;
    if (cohortSeed < 25) {
      targetCohort = 'champion';
    } else if (cohortSeed < 65) {
      targetCohort = 'regular';
    } else if (cohortSeed < 85) {
      targetCohort = 'near_to_retire';
    } else {
      targetCohort = 'retired';
    }

    // Days since last purchase based on cohort
    let daysSinceLast: number;
    let invoiceCountTarget: number;

    if (targetCohort === 'champion') {
      daysSinceLast = 2 + (i % 40); // 2 to 42 days
      invoiceCountTarget = 5 + (i % 8); // 5 to 12 invoices
    } else if (targetCohort === 'regular') {
      daysSinceLast = 10 + (i % 60); // 10 to 70 days
      invoiceCountTarget = 2 + (i % 4); // 2 to 5 invoices
    } else if (targetCohort === 'near_to_retire') {
      daysSinceLast = 80 + (i % 65); // 80 to 145 days
      invoiceCountTarget = 2 + (i % 4); // 2 to 5 invoices
    } else {
      // retired
      daysSinceLast = 160 + (i % 180); // 160 to 340 days
      invoiceCountTarget = 1 + (i % 3); // 1 to 3 invoices
    }

    // Day zero (first purchase) date: typically 1 to 2.5 years ago
    const dayZeroSpanDays = Math.max(daysSinceLast + 45, 120 + (i % 500));
    const dayZeroTime = referenceDate.getTime() - dayZeroSpanDays * 24 * 60 * 60 * 1000;
    const firstPurchaseDate = new Date(dayZeroTime).toISOString().split('T')[0];

    const lastPurchaseTime = referenceDate.getTime() - daysSinceLast * 24 * 60 * 60 * 1000;
    const lastPurchaseDate = new Date(lastPurchaseTime).toISOString().split('T')[0];

    // Build invoices array spanning from Day Zero to Last Purchase Date
    const invoices: CustomerInvoice[] = [];
    const interval = (lastPurchaseTime - dayZeroTime) / Math.max(1, invoiceCountTarget - 1);

    let cumulativePieces = 0;
    let cumulativeSpend = 0;

    for (let invIdx = 0; invIdx < invoiceCountTarget; invIdx++) {
      const invoiceTime = new Date(dayZeroTime + interval * invIdx);
      const invoiceDateStr = invoiceTime.toISOString().split('T')[0];

      // In-store or occasionally neighboring branch / Online
      const invStore = invIdx % 4 === 0 && i % 3 === 0 ? 'Online' : storeName;
      const cashier = CASHIERS[(i + invIdx) % CASHIERS.length];

      // Items in this invoice (1 to 4 items)
      const itemsInBasketCount = 1 + ((i * 3 + invIdx) % 3);
      const items: CustomerPurchaseItem[] = [];
      let invoiceTotal = 0;

      for (let itemIdx = 0; itemIdx < itemsInBasketCount; itemIdx++) {
        const catalogItem = CATALOG_ITEMS[(i * 2 + invIdx * 3 + itemIdx) % CATALOG_ITEMS.length];
        const qty = itemIdx === 0 && (i + invIdx) % 5 === 0 ? 2 : 1;
        const lineTotal = catalogItem.price * qty;

        items.push({
          sku: catalogItem.sku,
          itemName: catalogItem.name,
          category: catalogItem.category,
          quantity: qty,
          unitPrice: catalogItem.price,
          totalPrice: lineTotal,
        });

        invoiceTotal += lineTotal;
        cumulativePieces += qty;
      }

      cumulativeSpend += invoiceTotal;

      const paymentMethods: ('Cash' | 'Visa' | 'ValU' | 'Fawry')[] = ['Visa', 'Cash', 'ValU', 'Visa'];
      const payment = paymentMethods[(i + invIdx) % paymentMethods.length];

      invoices.push({
        invoiceId: `INV-${invoiceDateStr.replace(/-/g, '')}-${1000 + ((i * 37 + invIdx * 19) % 8999)}`,
        dateStr: invoiceDateStr,
        timeStr: `${12 + ((invIdx * 2 + i) % 9)}:${10 + ((i * 7) % 49)}`,
        storeName: invStore,
        salesperson: cashier,
        paymentMethod: payment,
        itemsCount: items.length,
        totalAmount: invoiceTotal,
        items,
      });
    }

    // Sort invoices chronologically (Day zero first)
    invoices.sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());

    const { stage, notes, campaign, rfm } = classifyCustomerSegment(
      invoices.length,
      cumulativeSpend,
      daysSinceLast
    );

    const aov = Math.round(cumulativeSpend / Math.max(1, invoices.length));

    // Aggregate purchased products across all invoices to identify top/most buying products
    const productStatsMap = new Map<string, CustomerTopProduct>();
    for (const inv of invoices) {
      for (const item of inv.items) {
        const existing = productStatsMap.get(item.sku);
        if (existing) {
          existing.quantity += item.quantity;
          existing.totalSpend += item.totalPrice;
        } else {
          productStatsMap.set(item.sku, {
            sku: item.sku,
            itemName: item.itemName,
            category: item.category,
            quantity: item.quantity,
            totalSpend: item.totalPrice,
          });
        }
      }
    }

    const topProducts = Array.from(productStatsMap.values()).sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity;
      return b.totalSpend - a.totalSpend;
    });
    const mostBoughtProduct = topProducts[0] || undefined;

    customers.push({
      id: `CUST-${10000 + i}`,
      name: fullName,
      mobile,
      email: `${mobile.slice(3)}@retail-client.eg`,
      primaryStore: storeName,
      firstPurchaseDate,
      lastPurchaseDate,
      daysSinceLastPurchase: daysSinceLast,
      invoicesCount: invoices.length,
      totalPiecesBought: cumulativePieces,
      totalSpend: cumulativeSpend,
      averageOrderValue: aov,
      lifecycleStage: stage,
      rfmScore: rfm,
      marketingNotes: notes,
      recommendedCampaign: campaign,
      invoices,
      topProducts,
      mostBoughtProduct,
    });
  }

  // Sort by Total Spend descending
  return customers.sort((a, b) => b.totalSpend - a.totalSpend);
}

/**
 * Helper to compute or retrieve top products for any customer record
 */
export function getCustomerTopProducts(customer: CustomerRecord): CustomerTopProduct[] {
  if (customer.topProducts && customer.topProducts.length > 0) {
    return customer.topProducts;
  }
  const productStatsMap = new Map<string, CustomerTopProduct>();
  for (const inv of customer.invoices || []) {
    for (const item of inv.items || []) {
      const existing = productStatsMap.get(item.sku);
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalSpend += item.totalPrice;
      } else {
        productStatsMap.set(item.sku, {
          sku: item.sku,
          itemName: item.itemName,
          category: item.category,
          quantity: item.quantity,
          totalSpend: item.totalPrice,
        });
      }
    }
  }
  return Array.from(productStatsMap.values()).sort((a, b) => {
    if (b.quantity !== a.quantity) return b.quantity - a.quantity;
    return b.totalSpend - a.totalSpend;
  });
}
