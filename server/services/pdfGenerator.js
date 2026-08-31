const PDFDocument = require('pdfkit');

const generateKP4 = (data, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 45, right: 45 },
    autoFirstPage: true
  });

  doc.pipe(res);

  // Helper number format
  const formatRupiah = (number) => {
    if (!number && number !== 0) return '-';
    return new Intl.NumberFormat('id-ID').format(Number(number) || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const angkaTerbilang = (n) => {
    const angka = ['Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    n = parseInt(n, 10) || 0;
    if (n < 12) return angka[n];
    return String(n);
  };

  const leftX = 45;
  const rightX = 550;
  const colWidth = rightX - leftX;

  // 1. JUDUL & HEADER
  doc.font('Helvetica-Bold').fontSize(11).text('SURAT KETERANGAN', leftX, doc.y, { align: 'center', width: colWidth });
  doc.fontSize(10).text('PENGISIAN PENUNJANGAN PERMINTAAN PEMBAYARAN (KP4)', leftX, doc.y, { align: 'center', width: colWidth });
  doc.moveDown(0.4);

  // Garis tebal pemisah
  const lineY = doc.y;
  doc.lineWidth(1.5).moveTo(leftX, lineY).lineTo(rightX, lineY).stroke();
  doc.lineWidth(1); // reset
  doc.y = lineY + 6;

  // 2. PEMBUKA
  doc.font('Helvetica-Bold').fontSize(8.5).text('Saya yang bertanda tangan di bawah ini :', leftX, doc.y);
  doc.moveDown(0.3);

  // 3. DAFTAR IDENTITAS PEGAWAI (1 - 11)
  const drawRow = (num, label, value, extraLabel = '', extraVal = '') => {
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).text(num, leftX, startY);
    doc.text(label, leftX + 16, startY);
    doc.text(':', leftX + 165, startY);
    doc.font('Helvetica').text(String(value || '-'), leftX + 172, startY, { continued: false });

    if (extraLabel && extraVal) {
      doc.font('Helvetica-Bold').text(extraLabel, leftX + 310, startY);
      doc.font('Helvetica').text(extraVal, leftX + 375, startY);
    }
    doc.y = Math.max(doc.y, startY + 11.5);
  };

  const birthPlaceDate = [data.tempat_lahir, formatDate(data.tanggal_lahir)].filter(Boolean).join(', ') || '-';
  const jenisKelamin = data.jenis_kelamin || (data.nama && (data.nama.toLowerCase().includes('siti') || data.nama.toLowerCase().includes('dewi') || data.nama.toLowerCase().includes('nur') || data.nama.toLowerCase().includes('rahma')) ? 'Perempuan' : 'Laki-laki');
  const nipLabel = (data.nip && data.nip.length >= 18) ? 'NIP/NIPPPK.' : 'NIP.';
  
  drawRow('1.', 'Nama Lengkap', data.nama || '-', nipLabel, data.nip || '-');
  drawRow('2.', 'Tempat/Tanggal Lahir', birthPlaceDate);
  drawRow('3.', 'Jenis Kelamin', jenisKelamin);
  drawRow('4.', 'A g a m a', data.agama || 'Islam');
  drawRow('5.', 'Kebangsaan', data.kebangsaan || 'Indonesia');
  drawRow('6.', 'Pangkat/Golongan Ruang', data.golongan || 'IX');
  drawRow('7.', 'Jabatan Struktural/Fungsional', data.jabatan || 'Penata Layanan Operasional');
  drawRow('8.', 'Pada Instansi', data.unit_kerja || 'Disnakertrans Prov. Sulawesi Tengah');
  
  // Masa kerja
  const startY9 = doc.y;
  doc.font('Helvetica-Bold').fontSize(8).text('9.', leftX, startY9);
  doc.text('Masa Kerja Golongan', leftX + 16, startY9);
  doc.text(':', leftX + 165, startY9);
  doc.font('Helvetica').text(data.masa_kerja_golongan || '0 Tahun 10 Bulan', leftX + 172, startY9);
  doc.y = startY9 + 11;
  
  doc.font('Helvetica').fontSize(8).text('Masa Kerja Tambahan', leftX + 172, doc.y);
  doc.text(':', leftX + 270, doc.y);
  doc.text(data.masa_kerja_tambahan || '- Tahun', leftX + 278, doc.y);
  doc.y += 11;

  doc.font('Helvetica').fontSize(8).text('Masa Kerja Seluruhnya', leftX + 172, doc.y);
  doc.text(':', leftX + 270, doc.y);
  doc.text(data.masa_kerja_seluruhnya || '0 Tahun 10 Bulan', leftX + 278, doc.y);
  doc.y += 12;

  // Digaji menurut
  const startY10 = doc.y;
  doc.font('Helvetica-Bold').fontSize(8).text('10.', leftX, startY10);
  doc.text('Digaji menurut', leftX + 16, startY10);
  doc.text(':', leftX + 165, startY10);
  doc.font('Helvetica').text(data.peraturan_gaji || 'PEPRES. No. 11 Tahun 2024', leftX + 172, startY10);
  doc.y = startY10 + 11;

  doc.font('Helvetica-Bold').fontSize(8).text('Dengan Gaji Pokok', leftX + 172, doc.y);
  doc.text(':', leftX + 260, doc.y);
  doc.font('Helvetica-Bold').text(`Rp. ${formatRupiah(data.gaji_pokok)}.-`, leftX + 268, doc.y);
  doc.y += 12;

  drawRow('11.', 'Alamat/Tempat tinggal', data.alamat || 'Jl. Tadulako Palu');
  doc.moveDown(0.3);

  // 4. PERNYATAAN
  doc.font('Helvetica-Bold').fontSize(8).text('Menerangkan dengan sesungguhnya bahwa saya :', leftX + 16, doc.y);
  doc.moveDown(0.2);

  const drawSubStatement = (letter, text, rightText = '') => {
    const curY = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).text(letter, leftX + 16, curY);
    doc.font('Helvetica').text(text, leftX + 30, curY);
    if (rightText) {
      doc.text(rightText, leftX + 240, curY);
    }
    doc.y += 11;
  };

  drawSubStatement('a.', 'Disamping jabatan utama tersebut, bekerja pula sebagai :', '-');
  doc.font('Helvetica').fontSize(8).text('Dengan mendapat penghasilan sebesar', leftX + 42, doc.y);
  doc.font('Helvetica-Bold').text('Rp.   -    sebulan', leftX + 240, doc.y);
  doc.y += 11;

  drawSubStatement('b.', 'Mempunyai pensiun/pensiunan janda', 'Rp.   -    sebulan');
  drawSubStatement('c.', 'Kawin sah dengan :');
  doc.y += 2;

  // 5. TABEL PASANGAN
  const tableX = leftX + 5;
  const tableY = doc.y;
  const tableWidth = rightX - leftX - 10;
  
  // Kolom width: No(24), Nama(95), TglLahir(65), TglKawin(60), Kampus(65), Pekerjaan(65), Gaji(75), Ket(40) = 489
  const colW = [24, 95, 65, 60, 65, 65, 75, 40];
  const colX = [tableX];
  for (let i = 0; i < colW.length; i++) {
    colX.push(colX[i] + colW[i]);
  }

  // Header Table
  const rowH1 = 26;
  doc.rect(tableX, tableY, tableWidth, rowH1).stroke();
  for (let i = 1; i < colX.length - 1; i++) {
    doc.moveTo(colX[i], tableY).lineTo(colX[i], tableY + rowH1).stroke();
  }

  doc.font('Helvetica-Bold').fontSize(7);
  doc.text('No', colX[0], tableY + 9, { width: colW[0], align: 'center' });
  doc.text('NamaIstri /\nSuami', colX[1] + 2, tableY + 4, { width: colW[1] - 4, align: 'center' });
  doc.text('Tanggal\nKelahiran (Umur)', colX[2] + 2, tableY + 4, { width: colW[2] - 4, align: 'center' });
  doc.text('Tanggal\nPerkawinan', colX[3] + 2, tableY + 4, { width: colW[3] - 4, align: 'center' });
  doc.text('NamaSekolah/\nPerguruan\nTinggi', colX[4] + 2, tableY + 2, { width: colW[4] - 4, align: 'center' });
  doc.text('Pekerjaan', colX[5] + 2, tableY + 9, { width: colW[5] - 4, align: 'center' });
  doc.text('Penghasilan\nSebulan', colX[6] + 2, tableY + 4, { width: colW[6] - 4, align: 'center' });
  doc.text('Ket', colX[7] + 2, tableY + 9, { width: colW[7] - 4, align: 'center' });

  // Data Pasangan Row
  let pDataY = tableY + rowH1;
  const pDataH = 22;
  doc.rect(tableX, pDataY, tableWidth, pDataH).stroke();
  for (let i = 1; i < colX.length - 1; i++) {
    doc.moveTo(colX[i], pDataY).lineTo(colX[i], pDataY + pDataH).stroke();
  }

  const p = (data.pasangan && data.pasangan.length > 0) ? data.pasangan[0] : null;
  doc.font('Helvetica').fontSize(7.5);
  if (p) {
    doc.text('1', colX[0], pDataY + 6, { width: colW[0], align: 'center' });
    doc.font('Helvetica-Bold').text(p.nama || '-', colX[1] + 3, pDataY + 6, { width: colW[1] - 6 });
    doc.font('Helvetica').text(formatDateShort(p.tanggal_lahir), colX[2], pDataY + 6, { width: colW[2], align: 'center' });
    doc.text(formatDateShort(p.tanggal_menikah), colX[3], pDataY + 6, { width: colW[3], align: 'center' });
    doc.text('-', colX[4], pDataY + 6, { width: colW[4], align: 'center' });
    doc.text(p.pekerjaan || 'Petani/\nPekebun', colX[5] + 2, pDataY + 3, { width: colW[5] - 4, align: 'center' });
    doc.text('Rp. 2.000.000,-', colX[6] + 2, pDataY + 6, { width: colW[6] - 4, align: 'center' });
    doc.text('Di\ntanggung', colX[7] + 1, pDataY + 3, { width: colW[7] - 2, align: 'center' });
  } else {
    doc.text('-', colX[0], pDataY + 6, { width: colW[0], align: 'center' });
    doc.text('-', colX[1], pDataY + 6, { width: colW[1], align: 'center' });
    doc.text('-', colX[2], pDataY + 6, { width: colW[2], align: 'center' });
    doc.text('-', colX[3], pDataY + 6, { width: colW[3], align: 'center' });
    doc.text('-', colX[4], pDataY + 6, { width: colW[4], align: 'center' });
    doc.text('-', colX[5], pDataY + 6, { width: colW[5], align: 'center' });
    doc.text('-', colX[6], pDataY + 6, { width: colW[6], align: 'center' });
    doc.text('-', colX[7], pDataY + 6, { width: colW[7], align: 'center' });
  }

  doc.y = pDataY + pDataH + 8;

  // 6. KETERANGAN ANAK
  const anakCount = (data.anak && data.anak.length) || 0;
  const anakTerbilang = angkaTerbilang(anakCount);

  doc.font('Helvetica-Bold').fontSize(8).text('d.', leftX + 16, doc.y);
  doc.font('Helvetica').text('Mempunyai anak-anak seperti dalam daftar disebelah ini yaitu :', leftX + 30, doc.y);
  doc.y += 11;

  doc.font('Helvetica-Bold').fontSize(7.5).text('I. ANAK KANDUNG (ak), ANAK TIRI (at), dan ANAK ANGKAT (aa) yang masih menjadi tanggungan, belum', leftX + 30, doc.y);
  doc.y += 9.5;
  doc.text('mempunyai pekerjaan sendiri atau masuk dalam Daftar Gaji.', leftX + 41, doc.y);
  doc.y += 10.5;

  doc.text('II. ANAK KANDUNG (ak), ANAK TIRI (at), dan ANAK ANGKAT (aa) yang masih menjadi tanggungan, tetapi', leftX + 30, doc.y);
  doc.y += 9.5;
  doc.text('tidak masuk dalam DaftarGaji.', leftX + 44, doc.y);
  doc.y += 11;

  doc.font('Helvetica').fontSize(8).text(`Jumlah anak seluruhnya ${anakCount} (${anakTerbilang}) orang (yang masih menjadi tanggungan termasuk yang tidak masuk dalam gaji)`, leftX + 30, doc.y);
  doc.moveDown(0.7);

  // 7. DISCLAIMER / PERNYATAAN HUKUM
  doc.font('Helvetica').fontSize(8).text(
    'Keterangan ini saya buat dengan sesungguhnya dan apabila keterangan ini ternyata tidak benar, saya bersedia dituntut dimuka pengadilan berdasarkan Undang-Undang yang berlaku, dan bersedia mengembalikan semua penghasilan yang telah saya terima yang seharusnya bukan menjadi hak saya.',
    leftX + 16, doc.y, { width: colWidth - 20, align: 'justify', lineGap: 1.5 }
  );
  doc.moveDown(1.2);

  // 8. TANDA TANGAN (KIRI & KANAN)
  const now = new Date();
  const dateStr = formatDate(now.toISOString().split('T')[0]);
  const sigBoxY = doc.y;

  // Kolom Kanan (Tanggal & Pegawai)
  const rightColX = 350;
  doc.font('Helvetica-Bold').fontSize(8.5).text(`Palu, ${dateStr}`, rightColX, sigBoxY, { align: 'center', width: 170 });
  doc.y = sigBoxY + 14;
  doc.text('Pegawai yang bersangkutan,', rightColX, doc.y, { align: 'center', width: 170 });

  // Kolom Kiri (Pimpinan)
  doc.font('Helvetica-Bold').fontSize(8.5).text('Mengetahui :', leftX + 30, sigBoxY + 7);
  doc.text('Kepala Sub. Bagian Kepegawaian dan Umum', leftX + 30, sigBoxY + 18);

  const ttdY = sigBoxY + 68;

  // Pejabat Kiri
  doc.font('Helvetica-Bold').fontSize(8.5).text('Drs. ILYAS, M.Ap', leftX + 30, ttdY, { underline: true });
  doc.font('Helvetica').fontSize(8).text('Pembina', leftX + 30, ttdY + 12);
  doc.font('Helvetica').fontSize(8).text('NIP. 19691211 200212 1 005', leftX + 30, ttdY + 23);

  // Pegawai Kanan
  doc.font('Helvetica-Bold').fontSize(8.5).text(data.nama || '_______________________', rightColX, ttdY, { align: 'center', width: 170, underline: true });
  doc.font('Helvetica').fontSize(8).text(data.golongan || 'IX', rightColX, ttdY + 12, { align: 'center', width: 170 });
  doc.font('Helvetica').fontSize(8).text(`${nipLabel} ${data.nip || '_______________'}`, rightColX, ttdY + 23, { align: 'center', width: 170 });

  doc.end();
};

module.exports = { generateKP4 };

