import * as XLSX from 'xlsx';
import {
  EmployeeRecord,
  DailyStoreSalesRecord,
  CategoryDCSItem,
  StyleDescItem,
  CompetitorProfile,
} from '../types/retail';
import {
  STORE_NAMES_LIST,
  parseExactEmployees,
  parseExactCategories,
  parseExactStyles,
} from './realPosData';

export { STORE_NAMES_LIST };

const STORE_MONTHLY_TOTALS: Record<string, { sales: number; units: number; utv: number; upt: number }> = {
  'Al Doha': { sales: 264765, units: 1836, utv: 144, upt: 2.44 },
  'Al Minya': { sales: 852595, units: 629, utv: 1355, upt: 1.48 },
  'Al Salam': { sales: 253975, units: 200, utv: 1270, upt: 1.64 },
  'Alex': { sales: 3125210, units: 2800, utv: 1116, upt: 1.68 },
  'All Season': { sales: 1459582, units: 1217, utv: 1199, upt: 1.70 },
  'Aswan': { sales: 220332, units: 175, utv: 1259, upt: 1.42 },
  'Awlad Saqr': { sales: 251897, units: 202, utv: 1247, upt: 1.43 },
  'Bani Mazar': { sales: 720485, units: 537, utv: 1341, upt: 1.50 },
  'Damanhour': { sales: 606065, units: 452, utv: 1340, upt: 1.33 },
  'Doqi': { sales: 2591803, units: 2022, utv: 1281, upt: 1.97 },
  'Faisl': { sales: 1062123, units: 882, utv: 1204, upt: 1.70 },
  'Faqous': { sales: 289842, units: 219, utv: 1323, upt: 1.38 },
  'Fayoum': { sales: 1306900, units: 952, utv: 1372, upt: 1.55 },
  'Ismailya': { sales: 564880, units: 413, utv: 1367, upt: 1.45 },
  'Mahala New': { sales: 904209, units: 685, utv: 1320, upt: 1.57 },
  'Mall of Arabia': { sales: 2001570, units: 1442, utv: 1388, upt: 1.54 },
  'Mall of Tanta': { sales: 3381880, units: 2935, utv: 1152, upt: 1.69 },
  'Mansoura': { sales: 363186, units: 268, utv: 1355, upt: 1.28 },
  'Mansoura Toshka': { sales: 1811680, units: 1405, utv: 1289, upt: 1.69 },
  'Online': { sales: 1420415, units: 978, utv: 1452, upt: 1.03 },
  'Open Air': { sales: 2375082, units: 1907, utv: 1245, upt: 2.00 },
  'Port Said': { sales: 1008917, units: 776, utv: 1300, upt: 1.60 },
  'QENA': { sales: 654605, units: 495, utv: 1322, upt: 1.44 },
  'Samanoud': { sales: 841560, units: 651, utv: 1292, upt: 1.65 },
  'Shbeen Elkoum': { sales: 2141877, units: 1583, utv: 1353, upt: 1.45 },
  'Shubra': { sales: 611645, units: 1363, utv: 448, upt: 1.61 },
  'Zaqazek': { sales: 594418, units: 467, utv: 1272, upt: 1.62 },
};

export function generateRealisticSampleData(): {
  employees: EmployeeRecord[];
  dailySales: DailyStoreSalesRecord[];
  categories: CategoryDCSItem[];
  styles: StyleDescItem[];
  competitors: CompetitorProfile[];
} {
  const employees: EmployeeRecord[] = parseExactEmployees();
  const categories: CategoryDCSItem[] = parseExactCategories();
  const styles: StyleDescItem[] = parseExactStyles();
  const dailySales: DailyStoreSalesRecord[] = [];

  const daysInMonth = 31; // August 2026

  STORE_NAMES_LIST.forEach((storeName) => {
    const info = STORE_MONTHLY_TOTALS[storeName] || { sales: 500000, units: 400, utv: 1250, upt: 1.5 };
    const baseDailySales = info.sales / daysInMonth;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-08-${String(day).padStart(2, '0')}`;
      const jsDate = new Date(2026, 7, day);
      const dow = jsDate.getDay();

      let dayMultiplier = 1.0;
      if (dow === 5) dayMultiplier = 1.60; // Friday peak
      if (dow === 6) dayMultiplier = 1.40; // Saturday peak
      if (dow === 1) dayMultiplier = 0.75; // Monday slow

      // Trigger: Mansoura drop in last 7 days
      if (storeName === 'Mansoura' && day >= 25) {
        dayMultiplier *= 0.55;
      }
      // Trigger: Port Said decline in H2
      if (storeName === 'Port Said' && day > 15) {
        dayMultiplier *= 0.72;
      }

      const jitter = 0.90 + Math.sin(day * 13) * 0.15;
      let daySales = Math.round(baseDailySales * dayMultiplier * jitter);

      const dayUnits = Math.max(1, Math.round(daySales / (info.utv || 1150)));
      const dayTrx = Math.max(1, Math.round(dayUnits / (info.upt || 1.6)));
      const dayAtv = Math.round(daySales / dayTrx);
      const actualUpt = Number((dayUnits / dayTrx).toFixed(2));
      const actualUtv = Math.round(daySales / dayUnits);

      dailySales.push({
        storeName,
        dateStr,
        dayOfWeek: dow,
        soldQty: dayUnits,
        extPrice: daySales,
        upt: actualUpt,
        atv: dayAtv,
        utv: actualUtv,
        trx: dayTrx,
      });
    }
  });

  // Competitors in Egyptian Women's Fashion Market
  const competitors: CompetitorProfile[] = [
    {
      id: 'comp-zara',
      name: 'Zara Egypt',
      websiteUrl: 'https://www.zara.com/eg',
      facebookUrl: 'https://facebook.com/zara',
      instagramUrl: 'https://instagram.com/zara',
      lastScannedAt: '2026-08-28T14:30:00Z',
      scanResult: {
        brand: 'Zara Egypt',
        currentDiscounts: ['خصومات نهاية الموسم Mid-Season حتى 40% على الفساتين والقمصان', 'شحن مجاني للطلبات فوق 2000 ج.م'],
        newCollections: ['تشكيلة الخريف المبكر (Early Autumn Capsule) - ألوان ترابية وبيج', 'مجموعة الكتان والحرير'],
        priceRanges: [
          { category: 'Dresses / فساتين', range: '1,890 - 3,990 ج.م', avgPrice: 2650 },
          { category: 'Tops & Blouses / بلوزات', range: '1,290 - 2,490 ج.م', avgPrice: 1750 },
          { category: 'Pants & Jeans / بنطلونات', range: '1,690 - 2,990 ج.م', avgPrice: 2190 },
          { category: 'Accessories / إكسسوارات', range: '490 - 1,290 ج.م', avgPrice: 790 },
        ],
        campaignHook: 'Contemporary Elegance for the Modern Woman',
        storeOpenings: ['فرع جديد قيد التجهيز في مراسي الساحل الشمالي', 'تجديد فرع سيتي ستارز'],
        strategicThreatLevel: 'مرتفع',
        summary: 'المنافس يركز على سرعة تجديد الموديلات كل أسبوعين، وأسعاره أعلى بنسبة 35% إلى 50% من متوسط شبكتنا، مما يمنحنا ميزة تنافسية قوية في القيمة مقابل السعر.',
        checkedAt: '2026-08-28T14:30:00Z',
      },
    },
    {
      id: 'comp-defacto',
      name: 'DeFacto Egypt',
      websiteUrl: 'https://www.defacto.com/en-eg',
      facebookUrl: 'https://facebook.com/defactoegypt',
      lastScannedAt: '2026-08-27T10:15:00Z',
      scanResult: {
        brand: 'DeFacto Egypt',
        currentDiscounts: ['اشترِ 2 واحصل على الثالثة مجاناً (Buy 2 Get 1 Free)', 'خصم إضافي 15% على كود التطبيق'],
        newCollections: ['تشكيلة ملابس المحجبات والعبايات العصرية Modest Chic', 'جينزات كاجوال لطلاب الجامعات Back to Campus'],
        priceRanges: [
          { category: 'Dresses / فساتين', range: '899 - 1,699 ج.م', avgPrice: 1199 },
          { category: 'Tops & Blouses / بلوزات', range: '499 - 999 ج.م', avgPrice: 699 },
          { category: 'Pants & Jeans / بنطلونات', range: '799 - 1,499 ج.م', avgPrice: 999 },
          { category: 'Accessories / إكسسوارات', range: '199 - 499 ج.م', avgPrice: 320 },
        ],
        campaignHook: 'أشيك كولكشن بأوفر سعر لكل يوم',
        storeOpenings: ['افتتاح فرع المنصورة مول', 'توسعة فرع كايرو فستيفال'],
        strategicThreatLevel: 'مرتفع',
        summary: 'منافس شرس في فئة السعر الاقتصادي المباشر، عروضهم الترويجية تعتمد على حجم الشراء (B2G1)، مما يضغط على مؤشر UPT في فروعنا الإقليمية بالمحافظات.',
        checkedAt: '2026-08-27T10:15:00Z',
      },
    },
    {
      id: 'comp-dalydress',
      name: 'Dalydress Women',
      websiteUrl: 'https://dalydress.com',
      lastScannedAt: '2026-08-25T16:00:00Z',
      scanResult: {
        brand: 'Dalydress Women',
        currentDiscounts: ['خصم 30% على البليزرات وبدل العمل النسائية'],
        newCollections: ['Smart Workwear & Formal Attire', 'مجموعة الكتان الطبيعي للمصايف'],
        priceRanges: [
          { category: 'Dresses / فساتين', range: '1,499 - 2,899 ج.م', avgPrice: 1950 },
          { category: 'Tops & Blouses / بلوزات', range: '999 - 1,899 ج.م', avgPrice: 1350 },
          { category: 'Pants & Jeans / بنطلونات', range: '1,299 - 2,199 ج.م', avgPrice: 1599 },
        ],
        campaignHook: 'Classics that never fade',
        storeOpenings: ['فرع أركان بلازا الشيخ زايد'],
        strategicThreatLevel: 'متوسط',
        summary: 'علامة مصرية عريقة تركز على خامات عالية الجودة لملابس العمل. حصتهم قوية في المولات ومناطق المعادي ومصر الجديدة.',
        checkedAt: '2026-08-25T16:00:00Z',
      },
    },
  ];

  return {
    employees,
    dailySales,
    categories,
    styles,
    competitors,
  };
}

// Helper to generate the 4 Excel files as Blobs for user download to test the file upload pipeline
export function downloadSampleExcelFile(fileType: 'employee' | 'daily' | 'category' | 'style') {
  const { employees, dailySales, categories, styles } = generateRealisticSampleData();
  const wb = XLSX.utils.book_new();

  if (fileType === 'employee') {
    const rows = employees.map(e => ({
      STORE_NAME: e.storeName,
      EMPLOYEE: e.employee,
      MONTH: 46235, // Excel serial for Aug 2026
      SOLD_QTY: e.soldQty,
      'EXTPRICE$': e.extPrice,
      UPT: e.upt,
      ATV: e.atv,
      UTV: e.utv,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'EmployeeSales');
    XLSX.writeFile(wb, 'SALES_WITH_UPT_AND_ATV_FOR_Employee_FOR_08-2026.xlsx');
  } else if (fileType === 'daily') {
    const rows = dailySales.map(d => ({
      STORE_NAME: d.storeName,
      DAY: 46235 + parseInt(d.dateStr.split('-')[2] || '1', 10),
      SOLD_QTY: d.soldQty,
      'EXTPRICE$': d.extPrice,
      UPT: d.upt,
      ATV: d.atv,
      UTV: d.utv,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'DailySales');
    XLSX.writeFile(wb, 'SALES_WITH_UPT_AND_ATV_FOR_stores_by_day_FOR_08-2026.xlsx');
  } else if (fileType === 'category') {
    const rows = categories.map(c => {
      const rowObj: any = { DCS: c.rawCategory };
      STORE_NAMES_LIST.forEach(s => {
        rowObj[s] = c.storeUnits[s] || 0;
      });
      rowObj['Grand Total'] = c.grandTotal;
      return rowObj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'SalesByDCS');
    XLSX.writeFile(wb, 'Sales_08-2026_by_DCS.xlsx');
  } else if (fileType === 'style') {
    const rows = styles.map(st => {
      const rowObj: any = {
        'DESCRIPTION 1': st.styleCode,
        'DESCRIPTION 2': st.styleName,
      };
      STORE_NAMES_LIST.forEach(s => {
        rowObj[s] = st.storeUnits[s] || 0;
      });
      rowObj[' Total'] = st.totalUnits; // Note leading space in header as per requirement
      return rowObj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Desc1Desc2');
    XLSX.writeFile(wb, 'Sales_08-2026_by_Desc_1_and_Desc_2.xlsx');
  }
}
