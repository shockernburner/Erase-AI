import Papa from "papaparse";

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  rawLines: string[];
  delimiter: string;
  totalRows: number;
  malformedRows: number;
}

export function parseCSVBuffer(buffer: Buffer): ParsedCSV {
  const text = buffer.toString("utf-8").trim();
  if (!text) {
    return { headers: [], rows: [], rawLines: [], delimiter: ",", totalRows: 0, malformedRows: 0 };
  }

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    delimitersToGuess: [",", ";", "\t", "|"],
    transformHeader: (h: string) => h.trim().replace(/^\uFEFF/, ""),
  });

  const headers = result.meta.fields || [];
  const delimiter = result.meta.delimiter || ",";
  const malformedRows = result.errors.filter(e => e.type === "FieldMismatch").length;

  const rows = result.data.filter(row => {
    const values = Object.values(row);
    return values.some(v => v !== null && v !== undefined && String(v).trim() !== "");
  });

  const rawLines = rows.map(row => {
    const fields = headers.map(h => row[h] ?? "");
    return Papa.unparse([fields], { delimiter, header: false });
  });

  return {
    headers,
    rows,
    rawLines,
    delimiter,
    totalRows: rows.length,
    malformedRows,
  };
}

export function parseCSVFromRows(
  contentRows: { content: string; isRemoved: boolean }[],
  delimiter?: string
): ParsedCSV {
  const activeRows = contentRows.filter(r => !r.isRemoved);
  if (activeRows.length === 0) {
    return { headers: [], rows: [], rawLines: [], delimiter: delimiter || ",", totalRows: 0, malformedRows: 0 };
  }

  const text = activeRows.map(r => r.content).join("\n");

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    delimiter: delimiter,
    delimitersToGuess: [",", ";", "\t", "|"],
    transformHeader: (h: string) => h.trim().replace(/^\uFEFF/, ""),
  });

  const headers = result.meta.fields || [];
  const detectedDelimiter = result.meta.delimiter || delimiter || ",";

  const rows = result.data.filter(row => {
    const values = Object.values(row);
    return values.some(v => v !== null && v !== undefined && String(v).trim() !== "");
  });

  return {
    headers,
    rows,
    rawLines: activeRows.map(r => r.content),
    delimiter: detectedDelimiter,
    totalRows: rows.length,
    malformedRows: result.errors.filter(e => e.type === "FieldMismatch").length,
  };
}
