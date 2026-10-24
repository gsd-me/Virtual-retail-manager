export type StoreSegment = 'Mall' | 'Governorate' | 'Outlet' | 'Online' | 'International';

export interface CurrencyConfig {
  storeName: string;
  currencyCode: string; // 'EGP', 'QAR', 'USD'
  exchangeRate: number; // to EGP
  isExcludedFromChainTotal: boolean;
}

export interface EmployeeRecord {
  storeName: string;
  employee: string;
  monthDate: string; // YYYY-MM
  soldQty: number;
  extPrice: number; // in EGP or raw
  upt: number;
  atv: number;
  utv: number;
  trx: number;
  isFlaggedUser?: boolean;
  isFloating?: boolean;
  floatingStores?: string[];
  coachingCategory?: string;
  rankInStore?: number;
  rankInSegment?: number;
}

export interface DailyStoreSalesRecord {
  storeName: string;
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ...
  soldQty: number;
  extPrice: number;
  upt: number;
  atv: number;
  utv: number;
  trx: number;
}

export interface CategoryDCSItem {
  department: string; // e.g. CASUAL, JEANS, ACCESSORY, CHILD, TEENAGER, DEFOU
  className: string;   // e.g. BLOUSE, PANTS, SCARF
  rawCategory: string; // e.g. CASUAL BLOUSE
  storeUnits: Record<string, number>;
  grandTotal: number;
}

export interface StyleDescItem {
  styleCode: string;        // DESCRIPTION 1, e.g. S6121
  styleName: string;        // DESCRIPTION 2, e.g. DRESS CHIFFON PRINTED
  storeUnits: Record<string, number>;
  totalUnits: number;
  isReturnHeavy?: boolean;
  isLongTail?: boolean; // <= 10 units
  cumulativeShare?: number;
}

export interface StoreAggregated {
  name: string;
  segment: StoreSegment;
  totalSales: number;
  totalUnits: number;
  totalTrx: number;
  weightedAtv: number; // Σsales / Σtrx
  weightedUpt: number; // Σqty / Σtrx
  weightedUtv: number; // Σsales / Σqty
  salesSharePercent: number;
  dailyVolatilityCv: number; // stdDev / mean
  h1DailyAvg: number;
  h2DailyAvg: number;
  h2h1ChangePercent: number;
  activeStaffCount: number;
  top3StaffDependencyPercent: number;
  unattributedSalesPercent: number;
  unattributedAmount: number;
  returnRatePercent?: number; // for Online: |negative sales| / gross positive
  isExcluded: boolean;
  currency: string;
  exchangeRate: number;
  targetAmount?: number;
  targetAchievementPercent?: number;
  dataQualityScore: number; // 0 - 100
}

export interface ChainMetrics {
  totalSales: number;
  totalUnits: number;
  totalTrx: number;
  weightedAtv: number;
  weightedUpt: number;
  weightedUtv: number;
  totalStoresCount: number;
  activeStaffCount: number;
  topStore: { name: string; sales: number };
  bottomStore: { name: string; sales: number };
}

export interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'store_drop' | 'h2_decline' | 'unattributed' | 'staff_upt' | 'online_return' | 'zero_stock_allocation';
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  targetEntity: string;
  metricValue: string;
  benchmarkValue: string;
  actionAr: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  lastScannedAt?: string;
  scanResult?: CompetitorScanResult;
  adAnalyses?: CompetitorAdAnalysis[];
}

export interface CompetitorScanResult {
  brand: string;
  currentDiscounts: string[];
  newCollections: string[];
  priceRanges: { category: string; range: string; avgPrice?: number }[];
  campaignHook: string;
  storeOpenings: string[];
  strategicThreatLevel: 'مرتفع' | 'متوسط' | 'منخفض';
  summary: string;
  sources?: { title: string; uri: string }[];
  checkedAt: string;
}

export interface CompetitorAdAnalysis {
  id: string;
  imageUrl?: string;
  adUrl?: string;
  analyzedAt: string;
  productTypes: string[];
  colors: string[];
  pricePoints: string[];
  discountPercent: string;
  messageHook: string;
  targetAudience: string;
  ourCounterStrategy: string;
}

export interface WeeklyCompetitorReportData {
  reportTitle: string;
  generatedDate: string;
  executiveSummary: string;
  categoryComparisons: {
    category: string;
    ourUtv: string;
    competitorBenchmark: string;
    priceGapPercent: string;
    recommendation: 'Match' | 'Ignore' | 'Differentiate';
    rationale: string;
  }[];
  competitorReviews: {
    competitor: string;
    threatLevel: 'عالي' | 'متوسط' | 'منخفض';
    mainAggression: string;
    counterTactic: string;
  }[];
  keyDirectives: {
    department: string;
    directive: string;
  }[];
}

export interface DataQualitySummary {
  unattributedStoresCount: number;
  storesWithHighUnattributed: { storeName: string; percent: number; amount: number }[];
  floatingEmployees: { employee: string; stores: string[]; totalSales: number }[];
  negativeSalesRowsCount: number;
  zeroSalesDaysCount: number;
  subtotalsDroppedCount: number;
  alDohaIsolated: boolean;
  totalIssuesCount: number;
  overallScore: number; // 0 - 100
}

export interface FilterState {
  dateRange: string;
  store: string; // 'all' or specific store
  segment: string; // 'all' or specific segment
  department: string; // 'all' or specific department
}

export type ActiveTab = 
  | 'overview'
  | 'branches'
  | 'salespeople'
  | 'store_manager'
  | 'category_assortment'
  | 'customers'
  | 'inventory'
  | 'ai_advisor'
  | 'competitors'
  | 'data_quality'
  | 'settings';

// ==========================================
// Customer Lifecycle & Purchase History (Day Zero) Types
// ==========================================

export type CustomerLifecycleStage = 'champion' | 'regular' | 'near_to_retire' | 'retired';

export interface CustomerPurchaseItem {
  sku: string;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number; // Price per item in EGP
  totalPrice: number; // Extended price in EGP
}

export interface CustomerTopProduct {
  sku: string;
  itemName: string;
  category: string;
  quantity: number;
  totalSpend: number;
}

export interface CustomerInvoice {
  invoiceId: string;
  dateStr: string; // YYYY-MM-DD
  timeStr?: string;
  storeName: string;
  salesperson?: string;
  paymentMethod: 'Cash' | 'Visa' | 'ValU' | 'Fawry';
  itemsCount: number;
  totalAmount: number; // Total invoice amount in EGP
  items: CustomerPurchaseItem[];
}

export interface CustomerRecord {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  primaryStore: string;
  firstPurchaseDate: string; // "Day Zero" date
  lastPurchaseDate: string;
  daysSinceLastPurchase: number;
  invoicesCount: number; // Number of invoices since first purchase
  totalPiecesBought: number;
  totalSpend: number; // Cumulative LTV in EGP
  averageOrderValue: number; // AOV / ATV
  lifecycleStage: CustomerLifecycleStage;
  rfmScore?: string; // e.g. "5-5-5", "3-4-3"
  marketingNotes: string;
  recommendedCampaign: string;
  invoices: CustomerInvoice[];
  topProducts?: CustomerTopProduct[];
  mostBoughtProduct?: CustomerTopProduct;
}

// ==========================================
// Inventory Monitoring & Velocity Tracking Types
// ==========================================

export type InventoryMovementType = 'moving' | 'normal' | 'non_moving';

export interface InventoryItemRecord {
  sku: string;
  name: string;
  department: string;
  category: string;
  currentStockQty: number; // In-stock pieces across network
  soldQty30Days: number; // Units sold in past 30 days
  salesVelocityPerDay: number;
  salesVelocityPerWeek: number;
  daysOfInventory: number; // Current stock / daily sales (DOI)
  unitCost: number; // Estimated unit cost in EGP
  retailPrice: number; // Retail selling price in EGP
  totalStockValue: number; // currentStockQty * retailPrice
  idleCapitalValue: number; // Tied-up idle capital in EGP
  movementType: InventoryMovementType;
  lastSoldDate: string;
  daysWithoutSale: number;
  topStockBranches: { storeName: string; qty: number }[];
  actionRecommendation: string;
  suggestedActionType: 'reorder' | 'rebalance' | 'markdown' | 'bundle' | 'outlet_transfer';
}

export interface InventorySummaryMetrics {
  totalSkus: number;
  totalStockUnits: number;
  totalStockValue: number;
  movingCount: number;
  movingUnits: number;
  movingValue: number;
  normalCount: number;
  normalUnits: number;
  normalValue: number;
  nonMovingCount: number;
  nonMovingUnits: number;
  idleCapitalTiedUp: number;
  deadStockRatioPercent: number;
}

