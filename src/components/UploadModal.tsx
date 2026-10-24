import React, { useState } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  detectExcelFileType,
  parseEmployeeSalesFile,
  parseDailyStoreSalesFile,
  parseCategoryDcsFile,
  parseStyleDescFile,
} from '../utils/excelParser';
import { downloadSampleExcelFile } from '../utils/sampleData';
import {
  EmployeeRecord,
  DailyStoreSalesRecord,
  CategoryDCSItem,
  StyleDescItem,
} from '../types/retail';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
  onDataParsed: (payload: {
    employees?: EmployeeRecord[];
    dailySales?: DailyStoreSalesRecord[];
    categories?: CategoryDCSItem[];
    styles?: StyleDescItem[];
  }) => void;
  onNavigateToDataQuality: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  lang,
  onDataParsed,
  onNavigateToDataQuality,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    employeeSales: boolean;
    dailySales: boolean;
    categoryDcs: boolean;
    styleDesc: boolean;
  }>({
    employeeSales: false,
    dailySales: false,
    categoryDcs: false,
    styleDesc: false,
  });

  const [logs, setLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setProcessing(true);

    const newLogs: string[] = [];
    const parsedPayload: {
      employees?: EmployeeRecord[];
      dailySales?: DailyStoreSalesRecord[];
      categories?: CategoryDCSItem[];
      styles?: StyleDescItem[];
    } = {};

    const updatedStatus = { ...uploadedFiles };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rawRows.length === 0) continue;

        const headers = (rawRows[0] || []).map((h: any) => String(h || ''));
        const detectedType = detectExcelFileType(headers);

        if (detectedType === 'employee_sales') {
          const res = parseEmployeeSalesFile(sheet);
          parsedPayload.employees = res.employees;
          updatedStatus.employeeSales = true;
          newLogs.push(
            lang === 'ar'
              ? `✓ تم استيراد مبيعات الموظفين (${file.name}): ${res.employees.length} سجل موظف، تم ملء الفروع لـ ${res.forwardFilledCount} سجل، وإسقاط ${res.droppedSubtotals} صف إجمالي فرعي.`
              : `✓ Employee Sales (${file.name}): ${res.employees.length} records parsed, ${res.droppedSubtotals} subtotals dropped.`
          );
        } else if (detectedType === 'daily_store_sales') {
          const res = parseDailyStoreSalesFile(sheet);
          parsedPayload.dailySales = res.dailySales;
          updatedStatus.dailySales = true;
          newLogs.push(
            lang === 'ar'
              ? `✓ تم استيراد المبيعات اليومية للفروع (${file.name}): ${res.dailySales.length} يوم/فرع، وإسقاط ${res.droppedSubtotals} صف تجميعي.`
              : `✓ Daily Store Sales (${file.name}): ${res.dailySales.length} daily records, ${res.droppedSubtotals} subtotals dropped.`
          );
        } else if (detectedType === 'category_dcs') {
          const res = parseCategoryDcsFile(sheet);
          parsedPayload.categories = res.categories;
          updatedStatus.categoryDcs = true;
          newLogs.push(
            lang === 'ar'
              ? `✓ تم استيراد فئات الـ DCS (${file.name}): ${res.categories.length} فئة/قسم عبر الفروع.`
              : `✓ Category DCS (${file.name}): ${res.categories.length} categories parsed across stores.`
          );
        } else if (detectedType === 'style_desc') {
          const res = parseStyleDescFile(sheet);
          parsedPayload.styles = res.styles;
          updatedStatus.styleDesc = true;
          newLogs.push(
            lang === 'ar'
              ? `✓ تم استيراد موديلات Desc 1 & Desc 2 (${file.name}): ${res.styles.length} موديل بنجاح.`
              : `✓ Style Descriptions (${file.name}): ${res.styles.length} styles parsed.`
          );
        } else {
          newLogs.push(
            lang === 'ar'
              ? `⚠️ تعذر التعرف التلقائي على نوع الملف (${file.name})، يرجى التأكد من عناوين الأعمدة.`
              : `⚠️ Could not detect file structure for (${file.name}).`
          );
        }
      } catch (err: any) {
        newLogs.push(`❌ خطأ في معالجة ${file.name}: ${err.message}`);
      }
    }

    setUploadedFiles(updatedStatus);
    setLogs(prev => [...newLogs, ...prev]);
    onDataParsed(parsedPayload);
    setProcessing(false);
  };

  const allUploaded =
    uploadedFiles.employeeSales ||
    uploadedFiles.dailySales ||
    uploadedFiles.categoryDcs ||
    uploadedFiles.styleDesc;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {lang === 'ar' ? 'رفع ملفات الـ Excel الشهرية' : 'Upload Monthly POS Excel Files'}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'ar'
                  ? 'يتعرف النظام تلقائياً على الملفات الـ 4 من خلال الهيدر وينظف البيانات بالمعايير الصارمة'
                  : 'Auto-detects the 4 POS Excel files by header structure'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Dropzone */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragging
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700 bg-slate-950/40 hover:border-slate-600'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-amber-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-200 mb-1">
              {lang === 'ar'
                ? 'اسحب وأفلت ملفات الـ Excel هنا (يمكنك تحديد عدة ملفات معاً)'
                : 'Drag and drop Excel files here (multiple supported)'}
            </p>
            <p className="text-xs text-slate-400 mb-4">
              {lang === 'ar'
                ? 'يدعم ملفات .xlsx و .xls الخاصة بنظام الكاشير POS'
                : 'Supports .xlsx and .xls exports from POS system'}
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md transition-transform active:scale-95">
              <Upload className="w-4 h-4" />
              <span>{lang === 'ar' ? 'اختيار الملفات من جهازك' : 'Browse Files'}</span>
              <input
                type="file"
                multiple
                accept=".xlsx,.xls"
                onChange={e => handleFiles(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          {/* 4 Files Checklist & Detection Status */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {lang === 'ar' ? 'الملفات الأربعة المطلوبة:' : 'Expected 4 POS Files:'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* File A */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  uploadedFiles.employeeSales
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                {uploadedFiles.employeeSales ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-200">
                    A) {lang === 'ar' ? 'مبيعات الموظفين' : 'Employee Sales'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    (UPT, ATV, STORE_NAME, EMPLOYEE)
                  </div>
                </div>
              </div>

              {/* File B */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  uploadedFiles.dailySales
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                {uploadedFiles.dailySales ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-200">
                    B) {lang === 'ar' ? 'المبيعات اليومية للفروع' : 'Daily Store Sales'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    (DAY, STORE_NAME, SOLD_QTY, EXTPRICE$)
                  </div>
                </div>
              </div>

              {/* File C */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  uploadedFiles.categoryDcs
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                {uploadedFiles.categoryDcs ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-200">
                    C) {lang === 'ar' ? 'كميات الفئات (DCS)' : 'Category DCS Units'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    (CASUAL BLOUSE, JEANS PANTS, Stores...)
                  </div>
                </div>
              </div>

              {/* File D */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  uploadedFiles.styleDesc
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                {uploadedFiles.styleDesc ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-200">
                    D) {lang === 'ar' ? 'كميات الموديلات' : 'Style Desc 1 & 2 Units'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    (DESCRIPTION 1, DESCRIPTION 2, Stores...)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download Sample Files for Testing */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">
                {lang === 'ar' ? 'تنزيل نماذج ملفات Excel تجريبية للاختبار:' : 'Download Sample Excel Files to Test:'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => downloadSampleExcelFile('employee')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'ملف A: الموظفين' : 'File A: Staff'}</span>
              </button>
              <button
                onClick={() => downloadSampleExcelFile('daily')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'ملف B: اليومي' : 'File B: Daily'}</span>
              </button>
              <button
                onClick={() => downloadSampleExcelFile('category')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'ملف C: الفئات' : 'File C: DCS'}</span>
              </button>
              <button
                onClick={() => downloadSampleExcelFile('style')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'ملف D: الموديلات' : 'File D: Styles'}</span>
              </button>
            </div>
          </div>

          {/* Processing Logs */}
          {logs.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5 font-mono max-h-40 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="text-slate-300">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <div className="text-xs text-slate-400">
            {allUploaded
              ? (lang === 'ar' ? 'تم استيراد البيانات بنجاح في الذاكرة' : 'Data loaded successfully in memory')
              : (lang === 'ar' ? 'في انتظار رفع الملفات...' : 'Awaiting file upload...')}
          </div>
          <div className="flex items-center gap-2">
            {allUploaded && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToDataQuality();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{lang === 'ar' ? 'عرض تقرير جودة البيانات' : 'View Data Quality Report'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              {lang === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
