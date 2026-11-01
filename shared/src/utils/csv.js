/**
 * Utilities for CSV generation with defense against CSV Formula Injection (DDE / CSV Injection).
 * Any cell value starting with '=', '+', '-', '@', '\t', or '\r' can trigger code execution
 * or external DDE formula execution when opened in Excel/Google Sheets.
 */

function sanitizeCsvCell(value) {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value);

  // Check if string starts with formula trigger characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Escape inner double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function generateCsv(headers, rows) {
  const headerLine = headers.map(h => sanitizeCsvCell(h)).join(',');
  const rowLines = rows.map(row => {
    return headers.map(header => sanitizeCsvCell(row[header] !== undefined ? row[header] : '')).join(',');
  });

  return [headerLine, ...rowLines].join('\r\n');
}

module.exports = {
  sanitizeCsvCell,
  generateCsv
};
