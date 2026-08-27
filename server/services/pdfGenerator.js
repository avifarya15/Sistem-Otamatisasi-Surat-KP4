const PDFDocument = require('pdfkit');

const generateKP4 = (data, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 60, right: 60 }
  });

  doc.pipe(res);

  // Helper formats
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID').format(Number(number) || 0);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // 1. HEADER
  doc.font('Helvetica-Bold').fontSize(14).text('PEMERINTAH REPUBLIK INDONESIA', { align: 'center' });
  doc.fontSize(12).text('KEMENTERIAN/LEMBAGA/INSTANSI', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
  doc.moveDown(1);

  // 2. TITLE
  doc.fontSize(14).text('SURAT KETERANGAN', { align: 'center' });
  doc.fontSize(12).text('UNTUK MENDAPAT PEMBAYARAN TUNJANGAN KELUARGA', { align: 'center' });
  doc.fontSize(16).text('(KP4)', { align: 'center' });
  doc.moveDown(2);

  // 3. SECTION I - DATA PEGAWAI
  doc.font('Helvetica-Bold').fontSize(12).text('I. DATA PEGAWAI');
  doc.font('Helvetica').fontSize(10);
  doc.moveDown(0.5);
  
  const birthPlaceDate = [data.tempat_lahir, formatDate(data.tanggal_lahir)].filter(Boolean).join(', ') || '-';
  const pegawaiData = [
    { label: 'NIP', value: data.nip || '-' },
    { label: 'Nama', value: data.nama || '-' },
    { label: 'Tempat/Tanggal Lahir', value: birthPlaceDate },
    { label: 'Golongan', value: data.golongan || '-' },
    { label: 'Jabatan', value: data.jabatan || '-' },
    { label: 'Unit Kerja', value: data.unit_kerja || '-' },
    { label: 'Gaji Pokok', value: `Rp ${formatRupiah(data.gaji_pokok)}` }
  ];

  pegawaiData.forEach(item => {
    doc.text(item.label, 80, doc.y, { continued: false });
    doc.text(':', 200, doc.y - 12);
    doc.text(String(item.value || '-'), 210, doc.y - 12);
  });
  doc.moveDown(1);

  // 4. SECTION II - DATA PASANGAN
  doc.font('Helvetica-Bold').fontSize(12).text('II. DATA PASANGAN');
  doc.font('Helvetica').fontSize(10);
  doc.moveDown(0.5);

  if (data.pasangan && data.pasangan.length > 0) {
    const p = data.pasangan[0];
    const pasanganBirth = [p.tempat_lahir, formatDate(p.tanggal_lahir)].filter(Boolean).join(', ') || '-';
    const pasanganData = [
      { label: 'Nama', value: p.nama || '-' },
      { label: 'Tempat/Tanggal Lahir', value: pasanganBirth },
      { label: 'Pekerjaan', value: p.pekerjaan || '-' },
      { label: 'Tanggal Menikah', value: formatDate(p.tanggal_menikah) }
    ];
    pasanganData.forEach(item => {
      doc.text(item.label, 80, doc.y, { continued: false });
      doc.text(':', 200, doc.y - 12);
      doc.text(String(item.value || '-'), 210, doc.y - 12);
    });
  } else {
    doc.text('Tidak ada data', 80, doc.y);
  }
  doc.moveDown(1);

  // 5. SECTION III - DATA ANAK
  doc.font('Helvetica-Bold').fontSize(12).text('III. DATA ANAK');
  doc.font('Helvetica').fontSize(10);
  doc.moveDown(0.5);

  if (data.anak && data.anak.length > 0) {
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('No', 80, tableTop);
    doc.text('Nama', 110, tableTop);
    doc.text('Tempat/Tgl Lahir', 250, tableTop);
    doc.text('Status', 400, tableTop);
    doc.text('Pendidikan', 460, tableTop);
    
    let y = tableTop + 20;
    doc.font('Helvetica');
    data.anak.forEach((a, i) => {
      const childBirth = [a.tempat_lahir, formatDate(a.tanggal_lahir)].filter(Boolean).join(', ') || '-';
      doc.text((i + 1).toString(), 80, y);
      doc.text(a.nama || '-', 110, y);
      doc.text(childBirth, 250, y);
      doc.text(a.status_anak || 'Kandung', 400, y);
      doc.text(a.status_pendidikan || '-', 460, y);
      y += 20;
    });
    doc.y = y;
  } else {
    doc.text('Tidak ada data anak', 80, doc.y);
  }
  doc.moveDown(2);

  // 6. FOOTER
  const now = new Date();
  const dateStr = formatDate(now.toISOString().split('T')[0]);
  
  doc.text(`Jakarta, ${dateStr}`, 400, doc.y, { align: 'center' });
  doc.text('Mengetahui,', 80, doc.y, { align: 'left', continued: true });
  doc.text('', 0, doc.y); // reset continued
  
  const sigY = doc.y;
  doc.text('Kepala Unit Kerja', 80, sigY);
  doc.text('Pegawai', 400, sigY, { align: 'center' });
  
  doc.moveDown(4);
  
  const endSigY = doc.y;
  doc.text('(_______________________)', 80, endSigY);
  doc.text('NIP. _______________', 80, endSigY + 15);
  
  doc.text(`(${data.nama || '_______________________'})`, 400, endSigY, { align: 'center' });
  doc.text(`NIP. ${data.nip || '_______________'}`, 400, endSigY + 15, { align: 'center' });

  doc.end();
};

module.exports = { generateKP4 };
