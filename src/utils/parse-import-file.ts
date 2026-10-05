import ExcelJS from "exceljs";

export interface ParsedImportFile {
  headers: string[];
  rows: string[][];
}

// Matches the limits the Import leads modal has always displayed in its
// copy ("CSV, XLSX up to 10MB · max 5,000 rows per import") - previously
// just text, now actually enforced against the real parsed file.
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 5000;

// Hand-written rather than a dependency - CSV's only real complexity is
// quoted fields (commas/newlines/escaped "" inside them), which this state
// machine handles correctly without pulling in a parsing library for
// something this small.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Cell values from exceljs can be a plain primitive, a Date, or one of a
// few structured shapes (hyperlink, formula result, rich text) - this
// covers what a real lead-data spreadsheet would actually contain, not
// every exotic Excel feature.
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return value.result === null || value.result === undefined ? "" : String(value.result);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("");
    }
    return "";
  }
  return String(value);
}

async function parseXlsxRows(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values = (row.values as ExcelJS.CellValue[]).slice(1); // exceljs rows are 1-indexed; index 0 is always empty
    rows.push(values.map(cellToString));
  });
  return rows;
}

export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is larger than 10MB");
  }

  const lowerName = file.name.toLowerCase();
  const isXlsx = lowerName.endsWith(".xlsx");
  const isCsv = lowerName.endsWith(".csv");
  if (!isXlsx && !isCsv) {
    throw new Error("Only .csv and .xlsx files are supported");
  }

  const allRows = isXlsx ? await parseXlsxRows(file) : parseCsv(await file.text());
  const nonEmptyRows = allRows.filter((row) => row.some((cell) => cell.trim() !== ""));
  if (nonEmptyRows.length === 0) {
    throw new Error("This file has no rows");
  }

  const [headerRow, ...dataRows] = nonEmptyRows;
  if (dataRows.length === 0) {
    throw new Error("This file only has a header row - no leads to import");
  }
  if (dataRows.length > MAX_ROWS) {
    throw new Error(`This file has ${dataRows.length} rows - the max is ${MAX_ROWS} per import`);
  }

  return { headers: headerRow.map((h) => h.trim()), rows: dataRows };
}
