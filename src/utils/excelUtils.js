// /src/utils/excelUtils.js

import * as XLSX from 'xlsx';

export function convertToCSV(data) {
  const ws = XLSX.utils.json_to_sheet(data);
  return XLSX.utils.sheet_to_csv(ws);
}
