import * as XLSX from 'xlsx';
import {
  EmployeeRecord,
  DailyStoreSalesRecord,
  CategoryDCSItem,
  StyleDescItem,
  DataQualitySummary,
} from '../types/retail';

// Convert Excel Serial Number to YYYY-MM-DD string
export function excelSerialToDateString(serial: number | string | any): { dateStr: string; dayOfWeek: number; monthStr: string } {
  if (typeof serial === 'string') {
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return {
        dateStr: `${y}-${m}-${d}`,
        dayOfWeek: parsed.getDay(),
        monthStr: `${y}-${m}`,
      };
    }
  }

  const num = typeof serial === 'number' ? serial : parseFloat(serial);
  if (!isNaN(num) && num > 1000) {
    // Excel base date: 1899-12-30 (due to leap year bug in Excel)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + num * 86400000);
    const y = jsDate.getUTCFullYear();
    const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(jsDate.getUTCDate()).padStart(2, '0');
    return {
      dateStr: `${y}-${m}-${d}`,
      dayOfWeek: jsDate.getUTCDay(),
      monthStr: `${y}-${m}`,
    };
  }

  const today = new Date();
  return {
    dateStr: today.toISOString().split('T')[0],
    dayOfWeek: today.getDay(),
    monthStr: today.toISOString().substring(0, 7),
  };
}

export type DetectedFileType = 'employee_sales' | 'daily_store_sales' | 'category_dcs' | 'style_desc' | 'unknown';

// Auto-detect file type by analyzing header row
export function detectExcelFileType(headers: string[]): DetectedFileType {
  const normHeaders = headers.map(h => String(h || '').trim().toUpperCase());

  // Check Employee sales
  if (normHeaders.includes('EMPLOYEE') && (normHeaders.includes('STORE_NAME') || normHeaders.includes('EXTPRICE$'))) {
    return 'employee_sales';
  }

  // Check Daily store sales
  if (normHeaders.includes('DAY') && (normHeaders.includes('STORE_NAME') || normHeaders.includes('EXTPRICE$'))) {
    return 'daily_store_sales';
  }

  // Check Style file (DESCRIPTION 1 & DESCRIPTION 2)
  if (
    normHeaders.some(h => h.includes('DESCRIPTION 1') || h === 'DESC 1' || h === 'DESC1') &&
    normHeaders.some(h => h.includes('DESCRIPTION 2') || h === 'DESC 2' || h === 'DESC2')
  ) {
    return 'style_desc';
  }

  // Check Category file (DCS)
  if (
    normHeaders.some(h => h.includes('DCS') || h.includes('CATEGORY') || h.includes('DEPARTMENT')) ||
    normHeaders.includes('GRAND TOTAL') || normHeaders.includes('TOTAL')
  ) {
    return 'category_dcs';
  }

  return 'unknown';
}

// 1. Parse File A: Employee sales
export function parseEmployeeSalesFile(sheet: XLSX.WorkSheet): {
  employees: EmployeeRecord[];
  droppedSubtotals: number;
  forwardFilledCount: number;
} {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return { employees: [], droppedSubtotals: 0, forwardFilledCount: 0 };

  const rawHeaders = rows[0].map(h => String(h || '').trim().toUpperCase());
  const storeIdx = rawHeaders.indexOf('STORE_NAME');
  const empIdx = rawHeaders.indexOf('EMPLOYEE');
  const monthIdx = rawHeaders.indexOf('MONTH');
  const qtyIdx = rawHeaders.indexOf('SOLD_QTY');
  const priceIdx = rawHeaders.findIndex(h => h.includes('EXTPRICE'));
  const uptIdx = rawHeaders.indexOf('UPT');
  const atvIdx = rawHeaders.indexOf('ATV');
  const utvIdx = rawHeaders.indexOf('UTV');

  let currentStoreName = '';
  let droppedSubtotals = 0;
  let forwardFilledCount = 0;
  const employees: EmployeeRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    let storeCell = String(row[storeIdx] || '').trim();
    const empCell = String(row[empIdx] || '').trim();

    // Check if subtotal row
    if (storeCell.toUpperCase() === 'TOTAL' || empCell.toUpperCase() === 'TOTAL' || storeCell.toUpperCase().endsWith(' TOTAL')) {
      droppedSubtotals++;
      continue;
    }

    if (storeCell !== '') {
      currentStoreName = storeCell;
    } else if (currentStoreName !== '' && empCell !== '') {
      // Forward-fill
      forwardFilledCount++;
    }

    if (!empCell || !currentStoreName) continue;

    const monthRaw = row[monthIdx];
    const { monthStr } = excelSerialToDateString(monthRaw);

    const qty = parseFloat(row[qtyIdx]) || 0;
    const price = parseFloat(row[priceIdx]) || 0;
    const atv = parseFloat(row[atvIdx]) || 0;
    const upt = parseFloat(row[uptIdx]) || 0;
    const utv = parseFloat(row[utvIdx]) || 0;
    const trx = atv > 0 ? price / atv : 0;

    employees.push({
      storeName: currentStoreName,
      employee: empCell.toUpperCase().replace(/\s+/g, ' '),
      monthDate: monthStr,
      soldQty: qty,
      extPrice: price,
      upt,
      atv,
      utv,
      trx: Math.round(trx),
    });
  }

  return { employees, droppedSubtotals, forwardFilledCount };
}

// 2. Parse File B: Daily Store Sales
export function parseDailyStoreSalesFile(sheet: XLSX.WorkSheet): {
  dailySales: DailyStoreSalesRecord[];
  droppedSubtotals: number;
} {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return { dailySales: [], droppedSubtotals: 0 };

  const rawHeaders = rows[0].map(h => String(h || '').trim().toUpperCase());
  const storeIdx = rawHeaders.indexOf('STORE_NAME');
  const dayIdx = rawHeaders.indexOf('DAY');
  const qtyIdx = rawHeaders.indexOf('SOLD_QTY');
  const priceIdx = rawHeaders.findIndex(h => h.includes('EXTPRICE'));
  const uptIdx = rawHeaders.indexOf('UPT');
  const atvIdx = rawHeaders.indexOf('ATV');
  const utvIdx = rawHeaders.indexOf('UTV');

  let droppedSubtotals = 0;
  const dailySales: DailyStoreSalesRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const storeCell = String(row[storeIdx] || '').trim();
    if (!storeCell) continue;

    // Subtotal drop
    if (storeCell.toUpperCase().endsWith(' TOTAL') || storeCell.toUpperCase() === 'TOTAL') {
      droppedSubtotals++;
      continue;
    }

    const dayRaw = row[dayIdx];
    const { dateStr, dayOfWeek } = excelSerialToDateString(dayRaw);

    const qty = parseFloat(row[qtyIdx]) || 0;
    const price = parseFloat(row[priceIdx]) || 0;
    const atv = parseFloat(row[atvIdx]) || 0;
    const upt = parseFloat(row[uptIdx]) || 0;
    const utv = parseFloat(row[utvIdx]) || 0;
    const trx = atv > 0 ? price / atv : 0;

    dailySales.push({
      storeName: storeCell,
      dateStr,
      dayOfWeek,
      soldQty: qty,
      extPrice: price,
      upt,
      atv,
      utv,
      trx: Math.round(trx),
    });
  }

  return { dailySales, droppedSubtotals };
}

// 3. Parse File C: Category DCS units file
export function parseCategoryDcsFile(sheet: XLSX.WorkSheet): {
  categories: CategoryDCSItem[];
  droppedSubtotals: number;
} {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return { categories: [], droppedSubtotals: 0 };

  const rawHeaders = rows[0].map(h => String(h || '').trim());
  const dcsColIdx = 0; // First column is DCS category
  const storeCols: { name: string; idx: number }[] = [];

  for (let c = 1; c < rawHeaders.length; c++) {
    const colName = rawHeaders[c];
    if (colName && colName.toUpperCase() !== 'GRAND TOTAL' && colName.toUpperCase() !== 'TOTAL') {
      storeCols.push({ name: colName, idx: c });
    }
  }

  let droppedSubtotals = 0;
  const categories: CategoryDCSItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawCat = String(row[dcsColIdx] || '').trim();
    if (!rawCat) continue;

    if (rawCat.toUpperCase() === 'TOTAL' || rawCat.toUpperCase() === 'GRAND TOTAL') {
      droppedSubtotals++;
      continue;
    }

    const parts = rawCat.split(' ');
    const department = parts[0]?.toUpperCase() || 'OTHER';
    const className = parts.slice(1).join(' ').toUpperCase() || 'GENERAL';

    const storeUnits: Record<string, number> = {};
    let grandTotal = 0;

    storeCols.forEach(col => {
      const val = parseFloat(row[col.idx]) || 0;
      storeUnits[col.name] = val;
      grandTotal += val;
    });

    categories.push({
      department,
      className,
      rawCategory: rawCat,
      storeUnits,
      grandTotal,
    });
  }

  return { categories, droppedSubtotals };
}

// 4. Parse File D: Style Desc 1 & Desc 2 units file
export function parseStyleDescFile(sheet: XLSX.WorkSheet): {
  styles: StyleDescItem[];
  droppedSubtotals: number;
} {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return { styles: [], droppedSubtotals: 0 };

  // Trim all headers
  const rawHeaders = rows[0].map(h => String(h || '').trim());
  const desc1Idx = rawHeaders.findIndex(h => h.toUpperCase().includes('DESCRIPTION 1') || h.toUpperCase() === 'DESC 1');
  const desc2Idx = rawHeaders.findIndex(h => h.toUpperCase().includes('DESCRIPTION 2') || h.toUpperCase() === 'DESC 2');

  const storeCols: { name: string; idx: number }[] = [];
  for (let c = 0; c < rawHeaders.length; c++) {
    if (c === desc1Idx || c === desc2Idx) continue;
    const colName = rawHeaders[c];
    if (colName && colName.toUpperCase() !== 'TOTAL' && colName.toUpperCase() !== 'GRAND TOTAL') {
      storeCols.push({ name: colName, idx: c });
    }
  }

  let droppedSubtotals = 0;
  const styles: StyleDescItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const code = String(row[desc1Idx] || '').trim();
    const name = String(row[desc2Idx] || '').trim();

    if (!code && !name) continue;

    if (code.toUpperCase() === 'TOTAL' || name.toUpperCase() === 'TOTAL' || code.toUpperCase() === 'GRAND TOTAL') {
      droppedSubtotals++;
      continue;
    }

    const storeUnits: Record<string, number> = {};
    let totalUnits = 0;

    storeCols.forEach(col => {
      const val = parseFloat(row[col.idx]) || 0;
      storeUnits[col.name] = val;
      totalUnits += val;
    });

    styles.push({
      styleCode: code || 'UNKNOWN',
      styleName: name || 'STYLE',
      storeUnits,
      totalUnits,
      isReturnHeavy: totalUnits < 0,
    });
  }

  return { styles, droppedSubtotals };
}

// Generate Data Quality Summary after loading
export function buildDataQualityReport(
  employees: EmployeeRecord[],
  dailySales: DailyStoreSalesRecord[],
  droppedSubtotalsCount: number,
  flaggedUsers: string[]
): DataQualitySummary {
  // Store unattributed sales
  const storeSalesMap = new Map<string, number>();
  const storeUnattributedMap = new Map<string, number>();
  const empStoreMap = new Map<string, Set<string>>();

  employees.forEach(e => {
    const store = e.storeName;
    storeSalesMap.set(store, (storeSalesMap.get(store) || 0) + e.extPrice);

    if (flaggedUsers.includes(e.employee.toUpperCase())) {
      storeUnattributedMap.set(store, (storeUnattributedMap.get(store) || 0) + e.extPrice);
    }

    if (!empStoreMap.has(e.employee)) {
      empStoreMap.set(e.employee, new Set());
    }
    empStoreMap.get(e.employee)!.add(store);
  });

  const storesWithHighUnattributed: { storeName: string; percent: number; amount: number }[] = [];
  storeSalesMap.forEach((sales, store) => {
    const unattr = storeUnattributedMap.get(store) || 0;
    const pct = sales > 0 ? Number(((unattr / sales) * 100).toFixed(1)) : 0;
    if (pct > 10.0) {
      storesWithHighUnattributed.push({
        storeName: store,
        percent: pct,
        amount: Math.round(unattr),
      });
    }
  });

  // Floating employees (appearing in >1 store)
  const floatingEmployees: { employee: string; stores: string[]; totalSales: number }[] = [];
  empStoreMap.forEach((stores, emp) => {
    if (stores.size > 1 && !flaggedUsers.includes(emp.toUpperCase())) {
      const totalEmpSales = employees.filter(e => e.employee === emp).reduce((s, e) => s + e.extPrice, 0);
      floatingEmployees.push({
        employee: emp,
        stores: Array.from(stores),
        totalSales: Math.round(totalEmpSales),
      });
    }
  });

  // Negative sales rows (returns) and zero-sales days
  const negativeSalesRowsCount = dailySales.filter(d => d.extPrice < 0).length;
  const zeroSalesDaysCount = dailySales.filter(d => d.extPrice === 0).length;

  let totalIssues = storesWithHighUnattributed.length + floatingEmployees.length + (negativeSalesRowsCount > 0 ? 1 : 0);
  let overallScore = Math.max(40, 100 - (storesWithHighUnattributed.length * 15) - (floatingEmployees.length * 5));

  return {
    unattributedStoresCount: storesWithHighUnattributed.length,
    storesWithHighUnattributed,
    floatingEmployees,
    negativeSalesRowsCount,
    zeroSalesDaysCount,
    subtotalsDroppedCount: droppedSubtotalsCount,
    alDohaIsolated: true,
    totalIssuesCount: totalIssues,
    overallScore,
  };
}
