import ExcelJS from "exceljs";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Real, working export - generates an actual .xlsx workbook from the same
// rows the table on screen renders (client-side only, never touches any
// server-side file storage).
export async function exportToXlsx(sheetName: string, columns: ExportColumn[], rows: Record<string, unknown>[], filename: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRows(rows);
  await downloadWorkbook(workbook, filename);
}

export interface ExportSheet {
  name: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
}

// For exports that need more than one sheet (e.g. Leads + their full
// History/Remarks, cross-referenced by Lead # rather than crammed into one
// sheet) - same column/bold-header conventions as exportToXlsx above, just
// one worksheet per entry.
export async function exportMultiSheetXlsx(sheets: ExportSheet[], filename: string) {
  const workbook = new ExcelJS.Workbook();
  for (const { name, columns, rows } of sheets) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
    sheet.getRow(1).font = { bold: true };
    sheet.addRows(rows);
  }
  await downloadWorkbook(workbook, filename);
}
