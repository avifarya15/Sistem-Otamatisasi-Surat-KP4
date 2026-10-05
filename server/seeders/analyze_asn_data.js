const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'DATA ASN SEPTEMBER 2026.xlsx');
const wb = xlsx.readFile(filePath);

console.log('File loaded:', filePath);

const sheetsToProcess = ['STRUKTURAL', 'FUNGSIONAL', 'PELAKSANA', 'PARUH WAKTU', 'PENSIUN DAN MUTASI'];

for (const name of sheetsToProcess) {
  const ws = wb.Sheets[name];
  if (!ws) {
    console.log(`Sheet [${name}] tidak ditemukan!`);
    continue;
  }
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n================== SHEET: ${name} (Total baris raw: ${rows.length}) ==================`);
  
  // Cari baris header (yang mengandung 'NIP' atau 'Nama')
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || [];
    if (row.some(cell => typeof cell === 'string' && cell.toUpperCase().includes('NIP'))) {
      headerRowIndex = i;
      break;
    }
  }

  console.log(`Header ditemukan di baris index ${headerRowIndex}:`, rows[headerRowIndex]);
  
  // Hitung berapa baris yang memiliki NIP valid
  let validAsnCount = 0;
  const sampleData = [];
  
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    // Cari cell yang mirip NIP (18 digit angka atau diawali kutip)
    let rawNip = null;
    let rawNama = null;
    let rawGol = null;
    let rawJabatan = null;
    let rawUnit = null;

    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (!val) continue;
      const strVal = String(val).replace(/['\s]/g, '');
      if (/^\d{18}$/.test(strVal)) {
        rawNip = strVal;
        break;
      }
    }

    if (rawNip) {
      validAsnCount++;
      if (sampleData.length < 3) {
        sampleData.push({ rowIdx: i, row });
      }
    }
  }

  console.log(`Jumlah baris dengan NIP valid (18 digit): ${validAsnCount}`);
  if (sampleData.length > 0) {
    console.log('Contoh 1 baris pertama:', sampleData[0]);
  }
}
