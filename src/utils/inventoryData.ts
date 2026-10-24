import { InventoryItemRecord, InventoryMovementType, InventorySummaryMetrics } from '../types/retail';
import { STORE_NAMES_LIST } from './sampleData';

interface MasterSkuTemplate {
  sku: string;
  name: string;
  department: string;
  category: string;
  retailPrice: number;
  unitCost: number;
  monthlySalesBase: number;
  movementTypeTarget: InventoryMovementType;
}

const MASTER_SKU_CATALOG: MasterSkuTemplate[] = [
  // Fast / Moving items (High velocity, strong demand)
  { sku: 'S6121', name: 'DRESS CHIFFON PRINTED', department: 'CASUAL', category: 'CASUAL DRESS', retailPrice: 2190, unitCost: 980, monthlySalesBase: 358, movementTypeTarget: 'moving' },
  { sku: 'S6262', name: 'PANTS CREPE', department: 'CASUAL', category: 'CASUAL PANTS', retailPrice: 1450, unitCost: 650, monthlySalesBase: 348, movementTypeTarget: 'moving' },
  { sku: 'S6151', name: 'BLOUSE STRIPED', department: 'CASUAL', category: 'CASUAL BLOUSE', retailPrice: 1290, unitCost: 580, monthlySalesBase: 339, movementTypeTarget: 'moving' },
  { sku: 'S5985', name: 'SHAWL SATIN PRINTED', department: 'ACCESSORY', category: 'ACCESSORY SCARF', retailPrice: 590, unitCost: 240, monthlySalesBase: 307, movementTypeTarget: 'moving' },
  { sku: 'S6002', name: 'CARDIGAN SATIN PRINTED', department: 'CASUAL', category: 'CASUAL CARDIGAN', retailPrice: 1690, unitCost: 760, monthlySalesBase: 251, movementTypeTarget: 'moving' },
  { sku: 'S6165', name: 'SKIRT DOUBLE FLARED', department: 'CASUAL', category: 'CASUAL SKIRT', retailPrice: 1390, unitCost: 620, monthlySalesBase: 242, movementTypeTarget: 'moving' },
  { sku: 'S6231', name: 'VEST SLEEVELESS TR', department: 'CASUAL', category: 'CASUAL BASIC', retailPrice: 990, unitCost: 440, monthlySalesBase: 242, movementTypeTarget: 'moving' },
  { sku: 'S6227', name: 'BLOUSE CHIFFON', department: 'CASUAL', category: 'CASUAL BLOUSE', retailPrice: 1250, unitCost: 560, monthlySalesBase: 240, movementTypeTarget: 'moving' },
  { sku: 'S6227/1', name: 'SKIRT PLEATED', department: 'CASUAL', category: 'CASUAL SKIRT', retailPrice: 1490, unitCost: 670, monthlySalesBase: 211, movementTypeTarget: 'moving' },
  { sku: 'S6259', name: 'CARDIGAN SATIN PRINTED', department: 'CASUAL', category: 'CASUAL CARDIGAN', retailPrice: 1750, unitCost: 790, monthlySalesBase: 207, movementTypeTarget: 'moving' },

  // Normal items (Balanced turnover, steady sales)
  { sku: 'S6213', name: 'BLOUSE GUIPURE JAPANESE', department: 'CASUAL', category: 'CASUAL BLOUSE', retailPrice: 1590, unitCost: 710, monthlySalesBase: 78, movementTypeTarget: 'normal' },
  { sku: 'S6159', name: 'DRESS PRINTED READY', department: 'CASUAL', category: 'CASUAL DRESS', retailPrice: 2290, unitCost: 1030, monthlySalesBase: 65, movementTypeTarget: 'normal' },
  { sku: 'S6164', name: 'DRESS CHIFFON EFFECT', department: 'CASUAL', category: 'CASUAL DRESS', retailPrice: 2390, unitCost: 1080, monthlySalesBase: 58, movementTypeTarget: 'normal' },
  { sku: 'S6231/1', name: 'PANTS WAIST ELASTIC', department: 'CASUAL', category: 'CASUAL PANTS', retailPrice: 1350, unitCost: 610, monthlySalesBase: 52, movementTypeTarget: 'normal' },
  { sku: 'Y131', name: 'SCARF THAI COTTON', department: 'ACCESSORY', category: 'ACCESSORY SCARF', retailPrice: 490, unitCost: 200, monthlySalesBase: 49, movementTypeTarget: 'normal' },
  { sku: 'S6140/2', name: 'CARDIGAN SATIN PRINTED', department: 'CASUAL', category: 'CASUAL CARDIGAN', retailPrice: 1720, unitCost: 770, monthlySalesBase: 45, movementTypeTarget: 'normal' },
  { sku: 'S6250', name: 'SHAWL SATIN BROOCH', department: 'ACCESSORY', category: 'ACCESSORY SCARF', retailPrice: 620, unitCost: 250, monthlySalesBase: 42, movementTypeTarget: 'normal' },
  { sku: 'S6189', name: 'DRESS SATIN STRIPED', department: 'CASUAL', category: 'CASUAL DRESS', retailPrice: 2150, unitCost: 970, monthlySalesBase: 38, movementTypeTarget: 'normal' },
  { sku: 'S6116', name: 'BLOUSE SATIN CRINKLE', department: 'CASUAL', category: 'CASUAL BLOUSE', retailPrice: 1320, unitCost: 590, monthlySalesBase: 35, movementTypeTarget: 'normal' },
  { sku: 'S6206', name: 'BLAZER LINEN', department: 'CASUAL', category: 'CASUAL BLAZER', retailPrice: 2650, unitCost: 1190, monthlySalesBase: 32, movementTypeTarget: 'normal' },
  { sku: 'S6250/1', name: 'PANTS SATIN WIDE', department: 'CASUAL', category: 'CASUAL PANTS', retailPrice: 1590, unitCost: 715, monthlySalesBase: 28, movementTypeTarget: 'normal' },
  { sku: 'J8820', name: 'JEANS HIGH WAIST STRAIGHT', department: 'JEANS', category: 'JEANS PANTS', retailPrice: 1550, unitCost: 680, monthlySalesBase: 26, movementTypeTarget: 'normal' },
  { sku: 'J9102', name: 'DENIM JACKET OVERSIZED', department: 'JEANS', category: 'JEANS JACKET', retailPrice: 2250, unitCost: 1010, monthlySalesBase: 22, movementTypeTarget: 'normal' },

  // Non-moving items (Stagnant / Dead Stock / Low Velocity)
  { sku: '80476', name: 'PANTS TURKISH TR', department: 'CASUAL', category: 'CASUAL PANTS', retailPrice: 1380, unitCost: 620, monthlySalesBase: 4, movementTypeTarget: 'non_moving' },
  { sku: '8284', name: 'PANTS JEANS WIDE-LEG', department: 'JEANS', category: 'JEANS PANTS', retailPrice: 1490, unitCost: 670, monthlySalesBase: 3, movementTypeTarget: 'non_moving' },
  { sku: 'B142', name: 'OPEN ABAYA SILK PRINTED', department: 'CASUAL', category: 'CASUAL DRESS', retailPrice: 2890, unitCost: 1300, monthlySalesBase: 2, movementTypeTarget: 'non_moving' },
  { sku: '5633', name: 'NAYLON BLOUSE RETRO', department: 'CASUAL', category: 'CASUAL BLOUSE', retailPrice: 950, unitCost: 430, monthlySalesBase: 1, movementTypeTarget: 'non_moving' },
  { sku: '8300', name: 'PANTS JEANS HEAVY WASH', department: 'JEANS', category: 'JEANS PANTS', retailPrice: 1450, unitCost: 650, monthlySalesBase: 2, movementTypeTarget: 'non_moving' },
  { sku: 'HT100', name: 'BLOUSE STRIPED DENIM', department: 'CASUAL', category: 'CASUAL BLOUSE', retailPrice: 1100, unitCost: 490, monthlySalesBase: 1, movementTypeTarget: 'non_moving' },
  { sku: 'B139', name: 'ABAYA REVERSED CUFFS', department: 'CASUAL', category: 'CASUAL DRESS', retailPrice: 2950, unitCost: 1330, monthlySalesBase: 1, movementTypeTarget: 'non_moving' },
  { sku: '2009', name: 'DENIM SKIRT MAXI', department: 'JEANS', category: 'JEANS PANTS', retailPrice: 1350, unitCost: 610, monthlySalesBase: 2, movementTypeTarget: 'non_moving' },
  { sku: 'BAS3', name: 'LONG T-SHIRT WINTER', department: 'CASUAL', category: 'CASUAL BASIC', retailPrice: 650, unitCost: 290, monthlySalesBase: 1, movementTypeTarget: 'non_moving' },
  { sku: '16103', name: 'JUMPSUIT JEANS UTILITY', department: 'JEANS', category: 'JEANS PANTS', retailPrice: 2450, unitCost: 1100, monthlySalesBase: 0, movementTypeTarget: 'non_moving' },
  { sku: '29084', name: 'JACKET SUIT JEANS VINTAGE', department: 'JEANS', category: 'JEANS JACKET', retailPrice: 2190, unitCost: 990, monthlySalesBase: 0, movementTypeTarget: 'non_moving' },
  { sku: 'ACC-DIA', name: 'ACCESSORY DIAMOND BROOCH', department: 'ACCESSORY', category: 'ACCESSORY DIAMOND', retailPrice: 850, unitCost: 360, monthlySalesBase: 2, movementTypeTarget: 'non_moving' },
  { sku: 'DEF-601', name: 'DEFOU OUTLET CLEARANCE COAT', department: 'DEFOU', category: 'DEFOU DEFECTIVE', retailPrice: 890, unitCost: 400, monthlySalesBase: 3, movementTypeTarget: 'non_moving' },
];

/**
 * Generate full inventory tracking records across network
 */
export function generateRealisticInventory(): InventoryItemRecord[] {
  const records: InventoryItemRecord[] = [];

  MASTER_SKU_CATALOG.forEach(item => {
    let currentStock: number;
    let sold30Days: number;
    let daysWithoutSale: number;
    let lastSoldDate: string;
    let actionRecommendation: string;
    let suggestedActionType: 'reorder' | 'rebalance' | 'markdown' | 'bundle' | 'outlet_transfer';

    if (item.movementTypeTarget === 'moving') {
      // High sales velocity, low Days of Inventory (DOI)
      sold30Days = item.monthlySalesBase;
      // In stock: around 12 to 24 days worth of sales
      currentStock = Math.round(sold30Days * 0.45 + 30);
      daysWithoutSale = Math.floor(Math.random() * 2); // 0 or 1 days
      lastSoldDate = '2026-08-31';

      const doi = Math.round(currentStock / Math.max(1, sold30Days / 30));
      if (doi <= 15) {
        actionRecommendation = 'طلب توريد عاجل من المستودع المركزي لتفادي نفاد المخزون (خطر فقدان مبيعات).';
        suggestedActionType = 'reorder';
      } else {
        actionRecommendation = 'صنف بطل المبيعات (Fast Mover)؛ الحفاظ على مستويات التغذية المستمرة.';
        suggestedActionType = 'rebalance';
      }
    } else if (item.movementTypeTarget === 'normal') {
      // Balanced sales velocity
      sold30Days = item.monthlySalesBase;
      // In stock: 30 to 60 days of sales
      currentStock = Math.round(sold30Days * 1.35 + 20);
      daysWithoutSale = 2 + Math.floor(Math.random() * 6); // 2-7 days
      lastSoldDate = '2026-08-25';
      actionRecommendation = 'حركة طبيعية متوازنة؛ الاستمرار في دورة التوريد الدورية القياسية.';
      suggestedActionType = 'rebalance';
    } else {
      // Non-moving: low or zero sales, high idle stock
      sold30Days = item.monthlySalesBase;
      currentStock = 120 + Math.floor(Math.random() * 160); // 120 - 280 units tied up!
      daysWithoutSale = 35 + Math.floor(Math.random() * 90); // 35 - 125 days without sale!
      lastSoldDate = daysWithoutSale > 60 ? '2026-06-15' : '2026-07-20';

      if (item.department === 'DEFOU') {
        actionRecommendation = 'تصفية فورية بفرع شبرا أو تخفيضات أوتلت لتسييل رأس المال.';
        suggestedActionType = 'outlet_transfer';
      } else if (item.retailPrice > 2000) {
        actionRecommendation = 'خصم تصفية 35% أو حزمة تسويقية مع قطعة أساسية لتحرير رأس المال المجمد.';
        suggestedActionType = 'markdown';
      } else {
        actionRecommendation = 'عرض ترويجي "اشتري قطعة واحصل على الثانية بـ 50%" أو تحويل لفروع الإقبال العالي.';
        suggestedActionType = 'bundle';
      }
    }

    const dailyVelocity = Number((sold30Days / 30).toFixed(2));
    const weeklyVelocity = Number((dailyVelocity * 7).toFixed(1));
    const daysOfInventory = dailyVelocity > 0 ? Math.round(currentStock / dailyVelocity) : 999;
    const totalStockValue = currentStock * item.retailPrice;
    
    // Idle capital = cost value of excess or non-moving inventory
    const idleCapitalValue = item.movementTypeTarget === 'non_moving'
      ? currentStock * item.unitCost
      : daysOfInventory > 60
      ? Math.round((currentStock - dailyVelocity * 45) * item.unitCost)
      : 0;

    // Allocate stock across top branches
    const topStockBranches = [
      { storeName: 'Mall of Tanta', qty: Math.round(currentStock * 0.22) },
      { storeName: 'Alex', qty: Math.round(currentStock * 0.18) },
      { storeName: 'Open Air', qty: Math.round(currentStock * 0.15) },
      { storeName: 'Doqi', qty: Math.round(currentStock * 0.14) },
      { storeName: 'Mansoura Toshka', qty: Math.round(currentStock * 0.11) },
    ];

    records.push({
      sku: item.sku,
      name: item.name,
      department: item.department,
      category: item.category,
      currentStockQty: currentStock,
      soldQty30Days: sold30Days,
      salesVelocityPerDay: dailyVelocity,
      salesVelocityPerWeek: weeklyVelocity,
      daysOfInventory,
      unitCost: item.unitCost,
      retailPrice: item.retailPrice,
      totalStockValue,
      idleCapitalValue: Math.max(0, idleCapitalValue),
      movementType: item.movementTypeTarget,
      lastSoldDate,
      daysWithoutSale,
      topStockBranches,
      actionRecommendation,
      suggestedActionType,
    });
  });

  return records;
}

/**
 * Calculate KPI summary metrics for inventory
 */
export function computeInventorySummary(records: InventoryItemRecord[]): InventorySummaryMetrics {
  let totalStockUnits = 0;
  let totalStockValue = 0;
  let movingCount = 0;
  let movingUnits = 0;
  let movingValue = 0;
  let normalCount = 0;
  let normalUnits = 0;
  let normalValue = 0;
  let nonMovingCount = 0;
  let nonMovingUnits = 0;
  let idleCapitalTiedUp = 0;

  records.forEach(r => {
    totalStockUnits += r.currentStockQty;
    totalStockValue += r.totalStockValue;

    if (r.movementType === 'moving') {
      movingCount++;
      movingUnits += r.currentStockQty;
      movingValue += r.totalStockValue;
    } else if (r.movementType === 'normal') {
      normalCount++;
      normalUnits += r.currentStockQty;
      normalValue += r.totalStockValue;
    } else {
      nonMovingCount++;
      nonMovingUnits += r.currentStockQty;
      idleCapitalTiedUp += r.idleCapitalValue;
    }
  });

  const deadStockRatioPercent = totalStockUnits > 0
    ? Number(((nonMovingUnits / totalStockUnits) * 100).toFixed(1))
    : 0;

  return {
    totalSkus: records.length,
    totalStockUnits,
    totalStockValue,
    movingCount,
    movingUnits,
    movingValue,
    normalCount,
    normalUnits,
    normalValue,
    nonMovingCount,
    nonMovingUnits,
    idleCapitalTiedUp,
    deadStockRatioPercent,
  };
}
