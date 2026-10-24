import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

// Export any JSON array to Excel sheet
export function exportTableToExcel(data: Record<string, any>[], fileName: string, sheetName: string = 'Data') {
  if (!data || data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// Export AI Brief to PDF
export function exportBriefToPdf(briefData: {
  title: string;
  date: string;
  summary: string;
  whatWentWell: string[];
  problems: string[];
  anomalies: string[];
  actions: { action: string; owner: string; priority: string; expectedImpact: string }[];
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Basic styling
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(briefData.title, 15, 20);

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated Date: ${briefData.date} | Retail Command Center (Egypt)`, 15, 27);

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 30, 195, 30);

  let y = 38;

  // Executive Summary
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Summary / الملخص التنفيذي', 15, y);
  y += 7;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const splitSummary = doc.splitTextToSize(briefData.summary || 'No summary available.', 180);
  doc.text(splitSummary, 15, y);
  y += (splitSummary.length * 5) + 8;

  // What went well
  if (briefData.whatWentWell && briefData.whatWentWell.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // green-500
    doc.text('Key Strengths & Wins / نقاط القوة والإنجازات', 15, y);
    y += 6;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    briefData.whatWentWell.forEach(item => {
      const splitItem = doc.splitTextToSize(`• ${item}`, 175);
      doc.text(splitItem, 18, y);
      y += (splitItem.length * 4.5);
    });
    y += 5;
  }

  // Problems
  if (briefData.problems && briefData.problems.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(239, 68, 68); // red-500
    doc.text('Critical Gaps & Problems / المشاكل والقصور', 15, y);
    y += 6;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    briefData.problems.forEach(item => {
      const splitItem = doc.splitTextToSize(`• ${item}`, 175);
      doc.text(splitItem, 18, y);
      y += (splitItem.length * 4.5);
    });
    y += 5;
  }

  // Recommended Actions
  if (briefData.actions && briefData.actions.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(245, 158, 11); // amber-500
    doc.text('Priority Action Items / الإجراءات المطلوبة', 15, y);
    y += 7;

    doc.setFontSize(9);
    briefData.actions.forEach((act, idx) => {
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`${idx + 1}. [${act.owner}] (Priority: ${act.priority})`, 18, y);
      y += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const splitAction = doc.splitTextToSize(`Action: ${act.action}`, 170);
      doc.text(splitAction, 22, y);
      y += (splitAction.length * 4.5);
      if (act.expectedImpact) {
        doc.text(`Expected Impact: ${act.expectedImpact}`, 22, y);
        y += 5;
      }
      y += 2;
    });
  }

  doc.save(`${briefData.title.replace(/\s+/g, '_')}.pdf`);
}
