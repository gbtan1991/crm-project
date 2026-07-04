const MAX_IMPORT_ROWS = 500;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, "");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((csvRow) => csvRow.some((value) => value.trim()));
}

export type ParsedKeywordImportRow = {
  keyword: string;
};

export function parseKeywordImportCsv(text: string): ParsedKeywordImportRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map(normalizeHeader);

  const keywordIndex = headers.findIndex((header) =>
    ["keyword", "keywords", "suchbegriff", "suchbegriffe"].includes(header),
  );

  if (keywordIndex === -1) {
    const singleColumn = rows.every((row) => row.length <= 1);
    if (singleColumn) {
      return rows
        .slice(0, MAX_IMPORT_ROWS)
        .map((row) => ({ keyword: (row[0] ?? "").trim() }))
        .filter((row) => row.keyword.length > 0);
    }

    throw new Error(
      "CSV muss eine Spalte \"keyword\" enthalten. Laden Sie die Beispiel-CSV herunter.",
    );
  }

  return dataRows
    .slice(0, MAX_IMPORT_ROWS)
    .map((row) => ({
      keyword: (row[keywordIndex] ?? "").trim(),
    }))
    .filter((row) => row.keyword.length > 0);
}
