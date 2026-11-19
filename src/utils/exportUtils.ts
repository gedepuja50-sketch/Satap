// Utilitas ekspor PDF (jsPDF + jspdf-autotable), Excel/CSV (xlsx), dan Arsip ZIP (JSZip)
// Mendukung ekspor historis lengkap berdasarkan Periode (Tahun-Semester), Kelas, dan Guru Pengampu

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {getMediaFile} from '../services/mediaDb';
import {
  AdminGuruEntry,
  Building,
  DAFTAR_MAPEL,
  EducationPeriod,
  GradeSettings,
  Guru,
  GuruCertificate,
  KepalaSekolah,
  KelasLevel,
  NilaiRecord,
  Prestasi,
  SaranaAsset,
  SchoolDatabaseState,
  SchoolProfile,
  SemesterType,
  Siswa,
  StudentRaporExtras,
} from '../types/school';
import {
  evaluateStudentPromotionStatus,
  formatTanggalId,
  getPredikatNilai,
  hitungRataDaftar,
  hitungRataRata,
} from './gradeUtils';

async function toPngDataUrl(src: string): Promise<string | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 160, 160);
        ctx.drawImage(img, 0, 0, 160, 160);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function drawSchoolHeaderPdf(
  doc: jsPDF,
  school: SchoolProfile,
  judulDokumen: string,
  subJudul?: string
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoPng = await toPngDataUrl(school.logoDataUrl);

  if (logoPng) {
    doc.addImage(logoPng, 'PNG', 14, 11, 20, 20);
  }

  const textCenterX = pageWidth / 2 + 6;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PEMERINTAH KABUPATEN KARANGASEM', textCenterX, 14, {align: 'center'});
  doc.setFontSize(10);
  doc.text('DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA', textCenterX, 19, {align: 'center'});
  doc.setFontSize(13.5);
  doc.setTextColor(15, 118, 110);
  doc.text(school.nama.toUpperCase(), textCenterX, 25, {align: 'center'});

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NPSN: ${school.npsn}  |  ${school.alamat}`, textCenterX, 30, {align: 'center'});

  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.9);
  doc.line(14, 34, pageWidth - 14, 34);
  doc.setLineWidth(0.3);
  doc.line(14, 35.4, pageWidth - 14, 35.4);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(judulDokumen, pageWidth / 2, 43, {align: 'center'});

  let nextY = 48;
  if (subJudul) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(subJudul, pageWidth / 2, nextY, {align: 'center'});
    nextY += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tanggal Cetak: ${formatTanggalId(new Date().toISOString())}`, pageWidth - 14, nextY, {align: 'right'});

  return nextY + 3;
}

function triggerDownloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 1. EKSPOR DAFTAR SISWA PDF
export async function buildSiswaPdfDoc(
  kelas: KelasLevel,
  students: Siswa[],
  school: SchoolProfile,
  periodLabel?: string
): Promise<jsPDF> {
  const doc = new jsPDF({orientation: 'landscape', unit: 'mm', format: 'a4'});
  const startY = await drawSchoolHeaderPdf(
    doc,
    school,
    `DAFTAR SISWA KELAS ${kelas}`,
    `${periodLabel || `Tahun Ajaran ${school.tahunAjaranAktif}`} · Jumlah Peserta Didik: ${students.length} Siswa`
  );

  autoTable(doc, {
    startY,
    head: [['No', 'NIS', 'NISN', 'Nama Lengkap', 'L/P', 'Tempat, Tanggal Lahir', 'Alamat', 'Orang Tua / Wali', 'No. HP']],
    body: students.map((s, idx) => [
      idx + 1,
      s.nis,
      s.nisn,
      s.nama,
      s.jenisKelamin,
      `${s.tempatLahir}, ${formatTanggalId(s.tanggalLahir)}`,
      s.alamat,
      s.namaOrtu,
      s.noHpOrtu,
    ]),
    styles: {fontSize: 8, cellPadding: 2.2},
    headStyles: {fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold'},
    alternateRowStyles: {fillColor: [248, 250, 252]},
    columnStyles: {0: {halign: 'center', cellWidth: 10}, 4: {halign: 'center', cellWidth: 11}},
  });

  return doc;
}

export async function exportSiswaPdf(
  kelas: KelasLevel,
  students: Siswa[],
  school: SchoolProfile,
  periodLabel?: string
) {
  const doc = await buildSiswaPdfDoc(kelas, students, school, periodLabel);
  doc.save(`Daftar_Siswa_Kelas_${kelas}_SMPN_Satap_Besakih.pdf`);
}

// 2. EKSPOR NILAI PER KELAS & MAPEL (PDF & EXCEL)
export interface NilaiRowExport {
  no: number;
  nis: string;
  nama: string;
  tugas: number | null;
  keseharian: number | null;
  uts: number | null;
  uas: number | null;
  rataRata: number | null;
  tuntas: boolean | null;
}

export async function buildNilaiPdfDoc(
  kelas: KelasLevel,
  mapel: string,
  semester: SemesterType,
  rows: NilaiRowExport[],
  kkm: number,
  school: SchoolProfile,
  tahunAjaran?: string,
  guruPengampuNama?: string
): Promise<jsPDF> {
  const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
  const ta = tahunAjaran || school.tahunAjaranAktif;
  const pengampuInfo = guruPengampuNama ? ` · Pengampu: ${guruPengampuNama}` : '';
  const startY = await drawSchoolHeaderPdf(
    doc,
    school,
    `DAFTAR NILAI SISWA - ${mapel.toUpperCase()}`,
    `Kelas ${kelas} · Semester ${semester} · TA ${ta} · KKM: ${kkm}${pengampuInfo}`
  );

  autoTable(doc, {
    startY,
    head: [['No', 'NIS', 'Nama Siswa', 'Tugas', 'Harian', 'UTS', 'UAS', 'Rata-rata', 'Status KKM']],
    body: rows.map((r) => [
      r.no,
      r.nis,
      r.nama,
      r.tugas ?? '-',
      r.keseharian ?? '-',
      r.uts ?? '-',
      r.uas ?? '-',
      r.rataRata !== null ? r.rataRata.toFixed(1) : '-',
      r.rataRata === null ? 'Belum Lengkap' : r.tuntas ? 'Tuntas (>= KKM)' : 'Belum Tuntas',
    ]),
    styles: {fontSize: 8.5, cellPadding: 2.5},
    headStyles: {fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold'},
    alternateRowStyles: {fillColor: [248, 250, 252]},
    columnStyles: {
      0: {halign: 'center', cellWidth: 10},
      3: {halign: 'center'},
      4: {halign: 'center'},
      5: {halign: 'center'},
      6: {halign: 'center'},
      7: {halign: 'center', fontStyle: 'bold'},
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = Number(data.cell.raw);
        if (!Number.isNaN(val)) {
          data.cell.styles.textColor = val >= kkm ? [22, 163, 74] : [220, 38, 38];
        }
      }
    },
  });

  return doc;
}

export async function exportNilaiPdf(
  kelas: KelasLevel,
  mapel: string,
  semester: SemesterType,
  rows: NilaiRowExport[],
  kkm: number,
  school: SchoolProfile,
  tahunAjaran?: string,
  guruPengampuNama?: string
) {
  const doc = await buildNilaiPdfDoc(kelas, mapel, semester, rows, kkm, school, tahunAjaran, guruPengampuNama);
  doc.save(`Nilai_${mapel.replace(/\s+/g, '_')}_Kelas_${kelas}_${tahunAjaran || ''}_${semester}.pdf`);
}

export function buildNilaiWorkbook(
  kelas: KelasLevel,
  mapel: string,
  semester: SemesterType,
  rows: NilaiRowExport[],
  kkm: number,
  tahunAjaran?: string,
  guruPengampuNama?: string
): XLSX.WorkBook {
  const sheetData = rows.map((r) => ({
    No: r.no,
    NIS: r.nis,
    'Nama Siswa': r.nama,
    Kelas: `Kelas ${kelas}`,
    'Tahun Ajaran': tahunAjaran || '-',
    Semester: semester,
    'Mata Pelajaran': mapel,
    'Guru Pengampu': guruPengampuNama || '-',
    'Nilai Tugas': r.tugas ?? '',
    'Nilai Keseharian': r.keseharian ?? '',
    'Nilai UTS': r.uts ?? '',
    'Nilai UAS': r.uas ?? '',
    'Rata-rata': r.rataRata !== null ? r.rataRata : '',
    KKM: kkm,
    Keterangan: r.rataRata === null ? 'Belum Lengkap' : r.tuntas ? 'Tuntas' : 'Di Bawah KKM',
  }));
  const ws = XLSX.utils.json_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nilai Siswa');
  return wb;
}

export function exportNilaiExcel(
  kelas: KelasLevel,
  mapel: string,
  semester: SemesterType,
  rows: NilaiRowExport[],
  kkm: number,
  tahunAjaran?: string,
  guruPengampuNama?: string
) {
  const wb = buildNilaiWorkbook(kelas, mapel, semester, rows, kkm, tahunAjaran, guruPengampuNama);
  XLSX.writeFile(wb, `Nilai_${mapel.replace(/\s+/g, '_')}_Kelas_${kelas}_${semester}.xlsx`);
}

// 3. EKSPOR SARANA & PRASARANA (PDF & EXCEL)
export async function buildSarprasPdfDoc(
  buildings: Building[],
  assets: SaranaAsset[],
  school: SchoolProfile
): Promise<jsPDF> {
  const doc = new jsPDF({orientation: 'landscape', unit: 'mm', format: 'a4'});
  const startY = await drawSchoolHeaderPdf(
    doc,
    school,
    'REKAPITULASI SARANA DAN PRASARANA SEKOLAH',
    `Total Gedung: ${buildings.length} · Total Jenis Aset: ${assets.length}`
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('A. Data Gedung & Bangunan', 14, startY);

  autoTable(doc, {
    startY: startY + 2,
    head: [['No', 'Nama Gedung', 'Jenis', 'Jml Ruang', 'Luas (m2)', 'Thn Bangun', 'Kondisi', 'Keterangan']],
    body: buildings.map((b, i) => [
      i + 1,
      b.nama,
      b.jenis,
      b.jumlahRuang,
      b.luasM2,
      b.tahunDibangun,
      b.kondisi,
      b.keterangan,
    ]),
    styles: {fontSize: 8, cellPadding: 2},
    headStyles: {fillColor: [15, 118, 110], textColor: 255},
  });

  const lastY = (doc as unknown as {lastAutoTable?: {finalY: number}}).lastAutoTable?.finalY || startY + 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('B. Daftar Inventaris Sarana & Aset', 14, lastY + 8);

  const buildingMap = new Map(buildings.map((b) => [b.id, b.nama]));
  autoTable(doc, {
    startY: lastY + 10,
    head: [['No', 'Nama Aset / Barang', 'Gedung', 'Lokasi', 'Jumlah', 'Kondisi', 'Thn Pengadaan', 'Sumber Dana']],
    body: assets.map((a, i) => [
      i + 1,
      a.namaAset,
      buildingMap.get(a.buildingId) || '-',
      a.lokasi,
      a.jumlah,
      a.kondisi,
      a.tahunPengadaan,
      a.sumberDana,
    ]),
    styles: {fontSize: 8, cellPadding: 2},
    headStyles: {fillColor: [217, 119, 6], textColor: 255},
  });

  return doc;
}

export async function exportSarprasPdf(buildings: Building[], assets: SaranaAsset[], school: SchoolProfile) {
  const doc = await buildSarprasPdfDoc(buildings, assets, school);
  doc.save('Rekap_Sarana_Prasarana_SMPN_Satap_Besakih.pdf');
}

export function buildSarprasWorkbook(buildings: Building[], assets: SaranaAsset[]): XLSX.WorkBook {
  const buildingMap = new Map(buildings.map((b) => [b.id, b.nama]));
  const wsGedung = XLSX.utils.json_to_sheet(
    buildings.map((b, i) => ({
      No: i + 1,
      'Nama Gedung': b.nama,
      Jenis: b.jenis,
      'Jumlah Ruang': b.jumlahRuang,
      'Luas (m2)': b.luasM2,
      'Tahun Dibangun': b.tahunDibangun,
      Kondisi: b.kondisi,
      Keterangan: b.keterangan,
    }))
  );
  const wsAset = XLSX.utils.json_to_sheet(
    assets.map((a, i) => ({
      No: i + 1,
      'Nama Aset': a.namaAset,
      Gedung: buildingMap.get(a.buildingId) || '-',
      Lokasi: a.lokasi,
      Jumlah: a.jumlah,
      Kondisi: a.kondisi,
      'Tahun Pengadaan': a.tahunPengadaan,
      'Sumber Dana': a.sumberDana,
      Keterangan: a.keterangan,
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsGedung, 'Gedung');
  XLSX.utils.book_append_sheet(wb, wsAset, 'Inventaris Aset');
  return wb;
}

export function exportSarprasExcel(buildings: Building[], assets: SaranaAsset[]) {
  const wb = buildSarprasWorkbook(buildings, assets);
  XLSX.writeFile(wb, 'Rekap_Sarana_Prasarana_SMPN_Satap_Besakih.xlsx');
}

// 4. EKSPOR REKAP SEMUA NILAI ADMIN (HISTORIS BERDASARKAN PERIODE, KELAS, & GURU PENGAMPU)
export interface RekapNilaiRow {
  ranking: number;
  siswa: Siswa;
  nilaiPerMapel: Record<string, number | null>;
  rataTotal: number | null;
}

export async function buildAdminRekapNilaiPdfDoc(
  rows: RekapNilaiRow[],
  mapels: string[],
  kelasFilter: string,
  periodLabel: string,
  school: SchoolProfile,
  guruPengampuLabel?: string
): Promise<jsPDF> {
  const doc = new jsPDF({orientation: 'landscape', unit: 'mm', format: 'a4'});
  const pengampuSuffix = guruPengampuLabel ? ` · Pengampu: ${guruPengampuLabel}` : '';
  const startY = await drawSchoolHeaderPdf(
    doc,
    school,
    'REKAPITULASI NILAI HISTORIS MATA PELAJARAN',
    `Periode: ${periodLabel} · Kelas: ${kelasFilter === 'ALL' ? 'Semua Kelas (7, 8, 9)' : `Kelas ${kelasFilter}`}${pengampuSuffix}`
  );

  const shortHeaders = mapels.map((m) =>
    m
      .replace('Pendidikan Agama', 'Agama')
      .replace('Bahasa Indonesia', 'B.Ind')
      .replace('Bahasa Inggris', 'B.Ing')
      .replace('Bahasa Bali', 'B.Bali')
      .replace('Matematika', 'MTK')
      .replace('Informatika', 'Info')
      .replace('Seni Budaya', 'SenBud')
  );

  autoTable(doc, {
    startY,
    head: [['Rank', 'NIS', 'Nama Siswa', 'Kls', ...shortHeaders, 'Rata2']],
    body: rows.map((r) => [
      r.ranking,
      r.siswa.nis,
      r.siswa.nama,
      r.siswa.kelas,
      ...mapels.map((m) => {
        const v = r.nilaiPerMapel[m];
        return v !== null && v !== undefined ? v.toFixed(1) : '-';
      }),
      r.rataTotal !== null ? r.rataTotal.toFixed(2) : '-',
    ]),
    styles: {fontSize: 7, cellPadding: 1.5},
    headStyles: {fillColor: [15, 118, 110], textColor: 255},
    alternateRowStyles: {fillColor: [248, 250, 252]},
  });

  return doc;
}

export function buildAdminRekapNilaiWorkbook(
  rows: RekapNilaiRow[],
  mapels: string[],
  periodLabel: string,
  guruPengampuLabel?: string
): XLSX.WorkBook {
  const data = rows.map((r) => {
    const obj: Record<string, string | number> = {
      Ranking: r.ranking,
      Periode: periodLabel,
      NIS: r.siswa.nis,
      NISN: r.siswa.nisn,
      'Nama Siswa': r.siswa.nama,
      Kelas: `Kelas ${r.siswa.kelas}`,
      'Filter Pengampu': guruPengampuLabel || 'Semua Pengampu',
    };
    mapels.forEach((m) => {
      const val = r.nilaiPerMapel[m];
      obj[m] = val !== null && val !== undefined ? val : '';
    });
    obj['Rata-rata Keseluruhan'] = r.rataTotal !== null ? r.rataTotal : '';
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');
  return wb;
}

// 5. EKSPOR PRESTASI PDF
export async function buildPrestasiPdfDoc(prestasis: Prestasi[], school: SchoolProfile): Promise<jsPDF> {
  const doc = new jsPDF({orientation: 'landscape', unit: 'mm', format: 'a4'});
  const startY = await drawSchoolHeaderPdf(
    doc,
    school,
    'CATATAN PRESTASI SISWA, GURU, DAN SEKOLAH',
    `Total Capaian Tercatat: ${prestasis.length} Prestasi`
  );

  autoTable(doc, {
    startY,
    head: [['No', 'Kategori', 'Judul Prestasi', 'Peraih', 'Tingkat', 'Peringkat', 'Tanggal', 'Penyelenggara']],
    body: prestasis.map((p, i) => [
      i + 1,
      p.kategori,
      p.judul,
      p.namaPeraih,
      p.tingkat,
      p.peringkat,
      formatTanggalId(p.tanggal),
      p.penyelenggara,
    ]),
    styles: {fontSize: 8, cellPadding: 2},
    headStyles: {fillColor: [15, 118, 110], textColor: 255},
  });

  return doc;
}

// 6. PUSAT ARSIP ZIP (MENDOWNLOAD ARSIP HISTORIS BERDASARKAN PERIODE, KELAS, GURU PENGAMPU, & KATEGORI)
export interface ArchiveExportOptions {
  scope: 'ALL' | 'SISWA' | 'NILAI' | 'SARPRAS' | 'PRESTASI' | 'ADMIN_GURU';
  periodIdFilter?: string; // 'ALL' atau ID periode tertentu
  kelasFilter?: 'ALL' | KelasLevel;
  guruIdFilter?: string; // 'ALL' atau ID guru / userId
  kategoriAdminFilter?: string;
  format: 'PDF' | 'EXCEL' | 'BOTH';
}

export async function exportPusatArsipZip(
  state: SchoolDatabaseState,
  options: ArchiveExportOptions,
  gradeSettings: GradeSettings
): Promise<number> {
  const zip = new JSZip();
  let fileCount = 0;

  const targetPeriods: EducationPeriod[] =
    options.periodIdFilter && options.periodIdFilter !== 'ALL'
      ? state.periods.filter((p) => p.id === options.periodIdFilter)
      : state.periods;

  const targetKelasList: KelasLevel[] =
    options.kelasFilter && options.kelasFilter !== 'ALL'
      ? [options.kelasFilter]
      : ['7', '8', '9'];

  // Temukan userId dari guru yang dipilih agar filter guru bekerja lintas periode
  const selectedGuruObj =
    options.guruIdFilter && options.guruIdFilter !== 'ALL'
      ? state.gurus.find((g) => g.id === options.guruIdFilter)
      : undefined;

  const includeSiswa = options.scope === 'ALL' || options.scope === 'SISWA';
  const includeNilai = options.scope === 'ALL' || options.scope === 'NILAI';
  const includeSarpras = options.scope === 'ALL' || options.scope === 'SARPRAS';
  const includePrestasi = options.scope === 'ALL' || options.scope === 'PRESTASI';
  const includeAdminGuru = options.scope === 'ALL' || options.scope === 'ADMIN_GURU';

  if (includeSiswa) {
    const folder = zip.folder('01_Data_Siswa');
    for (const period of targetPeriods) {
      const safePeriod = period.label.replace(/[^a-zA-Z0-9._-]/g, '_');
      for (const k of targetKelasList) {
        const list = state.siswas.filter((s) => s.periodId === period.id && s.kelas === k);
        if (list.length === 0) continue;
        if (options.format === 'PDF' || options.format === 'BOTH') {
          const doc = await buildSiswaPdfDoc(k, list, state.schoolProfile, period.label);
          folder?.file(`${safePeriod}/Daftar_Siswa_Kelas_${k}.pdf`, doc.output('arraybuffer'));
          fileCount++;
        }
        if (options.format === 'EXCEL' || options.format === 'BOTH') {
          const ws = XLSX.utils.json_to_sheet(
            list.map((s, idx) => ({
              No: idx + 1,
              Periode: period.label,
              NIS: s.nis,
              NISN: s.nisn,
              Nama: s.nama,
              Kelas: s.kelas,
              'Jenis Kelamin': s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
              'Tempat Lahir': s.tempatLahir,
              'Tanggal Lahir': s.tanggalLahir,
              Alamat: s.alamat,
              'Orang Tua': s.namaOrtu,
              'No HP': s.noHpOrtu,
            }))
          );
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, `Kelas ${k}`);
          folder?.file(`${safePeriod}/Daftar_Siswa_Kelas_${k}.xlsx`, XLSX.write(wb, {type: 'array', bookType: 'xlsx'}));
          fileCount++;
        }
      }
    }
  }

  if (includeNilai) {
    const folder = zip.folder('02_Rekap_Nilai');
    for (const period of targetPeriods) {
      const safePeriod = period.label.replace(/[^a-zA-Z0-9._-]/g, '_');
      const periodNilai = state.nilaiRecords.filter((n) => n.periodId === period.id);
      const periodGurus = state.gurus.filter((g) => g.periodId === period.id);

      // Filter mapel bila ada filter guru pengampu
      let groupedMapels = Array.from(new Set(periodNilai.map((n) => n.mapel)));
      if (selectedGuruObj) {
        const matchingGuruInPeriod =
          periodGurus.find((g) => g.userId === selectedGuruObj.userId) || selectedGuruObj;
        groupedMapels = groupedMapels.filter((m) => matchingGuruInPeriod.mapelDiampu.includes(m));
      }

      for (const k of targetKelasList) {
        const siswaKelas = state.siswas.filter((s) => s.periodId === period.id && s.kelas === k);
        if (siswaKelas.length === 0) continue;

        for (const mapel of groupedMapels) {
          const kkm = gradeSettings.kkmPerMapel[mapel] ?? 75;
          const pengampu = periodGurus.find((g) => g.mapelDiampu.includes(mapel));
          const rows: NilaiRowExport[] = siswaKelas.map((s, idx) => {
            const rec = periodNilai.find((n) => n.siswaId === s.id && n.mapel === mapel);
            const avg = rec ? hitungRataRata(rec, gradeSettings) : null;
            return {
              no: idx + 1,
              nis: s.nis,
              nama: s.nama,
              tugas: rec ? (hitungRataDaftar(rec.tugasList) ?? rec.tugas ?? null) : null,
              keseharian: rec ? (hitungRataDaftar(rec.keseharianList) ?? rec.keseharian ?? null) : null,
              uts: rec?.uts ?? null,
              uas: rec?.uas ?? null,
              rataRata: avg,
              tuntas: avg !== null ? avg >= kkm : null,
            };
          });
          const safeMapel = mapel.replace(/\s+/g, '_');
          if (options.format === 'PDF' || options.format === 'BOTH') {
            const doc = await buildNilaiPdfDoc(
              k,
              mapel,
              period.semester,
              rows,
              kkm,
              state.schoolProfile,
              period.tahunAjaran,
              pengampu?.nama
            );
            folder?.file(`${safePeriod}/Nilai_${safeMapel}_Kelas_${k}.pdf`, doc.output('arraybuffer'));
            fileCount++;
          }
          if (options.format === 'EXCEL' || options.format === 'BOTH') {
            const wb = buildNilaiWorkbook(
              k,
              mapel,
              period.semester,
              rows,
              kkm,
              period.tahunAjaran,
              pengampu?.nama
            );
            folder?.file(`${safePeriod}/Nilai_${safeMapel}_Kelas_${k}.xlsx`, XLSX.write(wb, {type: 'array', bookType: 'xlsx'}));
            fileCount++;
          }
        }
      }
    }
  }

  if (includeSarpras) {
    const folder = zip.folder('03_Sarana_Prasarana');
    if (options.format === 'PDF' || options.format === 'BOTH') {
      const doc = await buildSarprasPdfDoc(state.buildings, state.assets, state.schoolProfile);
      folder?.file('Rekap_Sarana_Prasarana.pdf', doc.output('arraybuffer'));
      fileCount++;
    }
    if (options.format === 'EXCEL' || options.format === 'BOTH') {
      const wb = buildSarprasWorkbook(state.buildings, state.assets);
      folder?.file('Rekap_Sarana_Prasarana.xlsx', XLSX.write(wb, {type: 'array', bookType: 'xlsx'}));
      fileCount++;
    }
  }

  if (includePrestasi) {
    const folder = zip.folder('04_Prestasi');
    const doc = await buildPrestasiPdfDoc(state.prestasis, state.schoolProfile);
    folder?.file('Rekap_Prestasi_Sekolah.pdf', doc.output('arraybuffer'));
    fileCount++;
    const ws = XLSX.utils.json_to_sheet(
      state.prestasis.map((p, i) => ({
        No: i + 1,
        Kategori: p.kategori,
        Judul: p.judul,
        Peraih: p.namaPeraih,
        Tingkat: p.tingkat,
        Peringkat: p.peringkat,
        Tanggal: p.tanggal,
        Penyelenggara: p.penyelenggara,
        Deskripsi: p.deskripsi,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prestasi');
    folder?.file('Rekap_Prestasi_Sekolah.xlsx', XLSX.write(wb, {type: 'array', bookType: 'xlsx'}));
    fileCount++;
  }

  if (includeAdminGuru) {
    const folder = zip.folder('05_Administrasi_Guru');
    let entries: AdminGuruEntry[] = state.adminGuruEntries;
    if (options.periodIdFilter && options.periodIdFilter !== 'ALL') {
      entries = entries.filter((e) => e.periodId === options.periodIdFilter);
    }
    if (selectedGuruObj) {
      entries = entries.filter(
        (e) =>
          e.guruId === selectedGuruObj.id ||
          (selectedGuruObj.userId && e.userId === selectedGuruObj.userId)
      );
    }
    if (options.kategoriAdminFilter && options.kategoriAdminFilter !== 'ALL') {
      entries = entries.filter((e) => e.kategori === options.kategoriAdminFilter);
    }

    const ws = XLSX.utils.json_to_sheet(
      entries.map((e, i) => ({
        No: i + 1,
        Periode: `${e.tahunAjaran} (${e.semester})`,
        Guru: e.guruNama,
        Judul: e.judul,
        Kategori: e.kategori,
        Status: e.status,
        'Tanggal Upload': e.tanggalUpload,
        'Nama File': e.fileName || '(Tanpa Lampiran)',
        Keterangan: e.keterangan,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Indeks Administrasi');
    folder?.file('Indeks_Administrasi_Guru.xlsx', XLSX.write(wb, {type: 'array', bookType: 'xlsx'}));
    fileCount++;

    for (const entry of entries) {
      if (entry.fileId) {
        const stored = await getMediaFile(entry.fileId);
        if (stored) {
          const safePeriod = `${entry.tahunAjaran}_${entry.semester}`.replace(/[^a-zA-Z0-9._-]/g, '_');
          const safeGuru = entry.guruNama.replace(/[^a-zA-Z0-9._-]/g, '_');
          const safeKat = entry.kategori.replace(/[^a-zA-Z0-9._-]/g, '_');
          const safeFile = (entry.fileName || stored.name).replace(/[^a-zA-Z0-9._-]/g, '_');
          folder?.file(`${safePeriod}/${safeGuru}/${safeKat}/${entry.id}_${safeFile}`, stored.blob);
          fileCount++;
        }
      }
    }
  }

  const zipBlob = await zip.generateAsync({type: 'blob'});
  const dateTag = new Date().toISOString().slice(0, 10);
  triggerDownloadBlob(zipBlob, `Arsip_SMPN_Satap_Besakih_${options.scope}_${dateTag}.zip`);
  return fileCount;
}

// 7. EKSPOR BAGAN RAPORT TERPADU / NILAI AKHIR + EKSTRAKURIKULER DALAM 1 KERTAS PER SISWA
export interface CombinedRaportPdfOptions {
  headingTitle?: string;
  filePrefix?: string;
}

async function renderStudentRaportOnDoc(
  doc: jsPDF,
  siswa: Siswa,
  period: EducationPeriod,
  school: SchoolProfile,
  nilaiRecords: NilaiRecord[],
  studentRaporExtras: StudentRaporExtras[],
  gradeSettings: GradeSettings,
  kepalaSekolah?: KepalaSekolah,
  subjects: string[] = DAFTAR_MAPEL,
  options?: CombinedRaportPdfOptions
) {
  const startY = await drawSchoolHeaderPdf(
    doc,
    school,
    options?.headingTitle || 'LAPORAN HASIL BELAJAR PESERTA DIDIK (RAPORT)',
    `Periode Pendidikan: ${period.label}`
  );

  // Blok Identitas Siswa (kompak agar 1 kertas muat penuh)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  doc.text(`Nama Peserta Didik : ${siswa.nama}`, 14, startY + 1.5);
  doc.text(`NIS / NISN                : ${siswa.nis} / ${siswa.nisn}`, 14, startY + 6);
  doc.text(`Kelas                         : ${siswa.kelas}`, 128, startY + 1.5);
  doc.text(`Tahun Ajaran / Sem. : ${period.tahunAjaran} / ${period.semester}`, 128, startY + 6);

  // A. Tabel Nilai Mata Pelajaran & Catatan Guru
  const studentNilai = nilaiRecords.filter(
    (n) => n.periodId === period.id && n.siswaId === siswa.id
  );

  const mapelBody = subjects.map((mapel, idx) => {
    const rec = studentNilai.find((n) => n.mapel === mapel);
    const kkm = gradeSettings.kkmPerMapel[mapel] ?? 75;
    const avgTugas = rec ? (hitungRataDaftar(rec.tugasList) ?? rec.tugas ?? null) : null;
    const avgHarian = rec ? (hitungRataDaftar(rec.keseharianList) ?? rec.keseharian ?? null) : null;
    const nilaiAkhir = rec ? hitungRataRata(rec, gradeSettings) : null;
    const predikat = nilaiAkhir !== null ? getPredikatNilai(nilaiAkhir).split(' ')[0] : '-';
    const status =
      nilaiAkhir === null ? 'Belum Lengkap' : nilaiAkhir >= kkm ? 'Tuntas' : 'Belum Tuntas';

    return [
      idx + 1,
      mapel,
      kkm,
      avgTugas !== null ? avgTugas.toFixed(1) : '-',
      avgHarian !== null ? avgHarian.toFixed(1) : '-',
      rec?.uts !== null && rec?.uts !== undefined ? rec.uts : '-',
      rec?.uas !== null && rec?.uas !== undefined ? rec.uas : '-',
      nilaiAkhir !== null ? nilaiAkhir.toFixed(1) : '-',
      predikat,
      status,
      rec?.catatanGuru?.trim() || '-',
    ];
  });

  const compactMode = subjects.length > 12;
  const tableFontSize = subjects.length > 15 ? 6.2 : compactMode ? 6.6 : 7.0;
  const tableCellPadding = subjects.length > 15 ? 0.95 : compactMode ? 1.1 : 1.3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('A. Nilai Akhir Mata Pelajaran & Catatan Guru', 14, startY + 11);

  autoTable(doc, {
    startY: startY + 12.8,
    head: [
      ['No', 'Mata Pelajaran', 'KKM', 'Tugas', 'Harian', 'UTS', 'UAS', 'Akhir', 'Pred', 'Ket.', 'Catatan Guru'],
    ],
    body: mapelBody,
    styles: {
      fontSize: tableFontSize,
      cellPadding: tableCellPadding,
      overflow: 'linebreak',
    },
    headStyles: {fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold'},
    alternateRowStyles: {fillColor: [248, 250, 252]},
    rowPageBreak: 'avoid',
    columnStyles: {
      0: {halign: 'center', cellWidth: 7},
      1: {cellWidth: 34},
      2: {halign: 'center', cellWidth: 9},
      3: {halign: 'center', cellWidth: 11},
      4: {halign: 'center', cellWidth: 11},
      5: {halign: 'center', cellWidth: 10},
      6: {halign: 'center', cellWidth: 10},
      7: {halign: 'center', cellWidth: 11, fontStyle: 'bold'},
      8: {halign: 'center', cellWidth: 9},
      9: {halign: 'center', cellWidth: 16},
      10: {cellWidth: 'auto'},
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = Number(data.cell.raw);
        const kkmVal = Number(mapelBody[data.row.index]?.[2] ?? 75);
        if (!Number.isNaN(val)) {
          data.cell.styles.textColor = val >= kkmVal ? [22, 163, 74] : [220, 38, 38];
        }
      }
    },
  });

  let nextY =
    ((doc as unknown as {lastAutoTable?: {finalY: number}}).lastAutoTable?.finalY || startY + 110) + 4.5;

  // B. Tabel Ekstrakurikuler
  const extra = studentRaporExtras.find(
    (r) => r.periodId === period.id && r.siswaId === siswa.id
  );
  const ekskuls = extra?.ekstrakurikuler || [];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('B. Nilai Kegiatan Ekstrakurikuler', 14, nextY);

  autoTable(doc, {
    startY: nextY + 1.8,
    head: [['No', 'Kegiatan Ekstrakurikuler', 'Predikat', 'Nilai', 'Keterangan']],
    body:
      ekskuls.length > 0
        ? ekskuls.map((ex, i) => [
            i + 1,
            ex.namaEkskul,
            ex.predikat,
            ex.nilaiAngka !== null && ex.nilaiAngka !== undefined ? ex.nilaiAngka : '-',
            ex.keterangan || '-',
          ])
        : [['-', 'Belum ada kegiatan ekstrakurikuler tercatat', '-', '-', '-']],
    styles: {fontSize: tableFontSize + 0.2, cellPadding: tableCellPadding + 0.15},
    headStyles: {fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold'},
    rowPageBreak: 'avoid',
    columnStyles: {
      0: {halign: 'center', cellWidth: 8},
      2: {cellWidth: 32},
      3: {halign: 'center', cellWidth: 14},
    },
  });

  nextY =
    ((doc as unknown as {lastAutoTable?: {finalY: number}}).lastAutoTable?.finalY || nextY + 22) + 4.5;

  // C. Ketidakhadiran, Catatan Wali Kelas & Keputusan Semester Genap
  const pageHeight = doc.internal.pageSize.getHeight();
  if (nextY > pageHeight - 36) {
    doc.addPage();
    nextY = 16;
  }

  const promotion = evaluateStudentPromotionStatus(
    siswa,
    period,
    subjects,
    nilaiRecords,
    gradeSettings
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('C. Ketidakhadiran, Catatan Wali Kelas & Keterangan Akhir Semester', 14, nextY);

  const absensiHead =
    period.semester === 'Genap'
      ? [['Sakit', 'Izin', 'Alpa', 'Catatan Wali Kelas', 'Keputusan Akhir (Genap)']]
      : [['Sakit', 'Izin', 'Tanpa Keterangan (Alpa)', 'Catatan Wali Kelas']];
  const absensiBody =
    period.semester === 'Genap'
      ? [
          [
            `${extra?.sakit ?? 0} hari`,
            `${extra?.izin ?? 0} hari`,
            `${extra?.alpa ?? 0} hari`,
            extra?.catatanWaliKelas?.trim() || '-',
            promotion.label,
          ],
        ]
      : [
          [
            `${extra?.sakit ?? 0} hari`,
            `${extra?.izin ?? 0} hari`,
            `${extra?.alpa ?? 0} hari`,
            extra?.catatanWaliKelas?.trim() || '-',
          ],
        ];

  autoTable(doc, {
    startY: nextY + 1.8,
    head: absensiHead,
    body: absensiBody,
    styles: {fontSize: tableFontSize + 0.3, cellPadding: tableCellPadding + 0.2},
    headStyles: {fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold'},
    rowPageBreak: 'avoid',
    columnStyles:
      period.semester === 'Genap'
        ? {
            0: {halign: 'center', cellWidth: 16},
            1: {halign: 'center', cellWidth: 16},
            2: {halign: 'center', cellWidth: 16},
            3: {cellWidth: 'auto'},
            4: {halign: 'center', cellWidth: 42, fontStyle: 'bold'},
          }
        : {
            0: {halign: 'center', cellWidth: 20},
            1: {halign: 'center', cellWidth: 20},
            2: {halign: 'center', cellWidth: 34},
            3: {cellWidth: 'auto'},
          },
    didParseCell: (data) => {
      if (period.semester === 'Genap' && data.section === 'body' && data.column.index === 4) {
        data.cell.styles.textColor = promotion.isQualified ? [22, 163, 74] : [180, 83, 9];
      }
    },
  });

  const sigY =
    ((doc as unknown as {lastAutoTable?: {finalY: number}}).lastAutoTable?.finalY || nextY + 16) + 6;

  if (sigY <= pageHeight - 21) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(30, 41, 59);
    doc.text('Mengetahui,', 20, sigY);
    doc.text('Orang Tua / Wali', 20, sigY + 3.8);
    doc.text('( .............................. )', 16, sigY + 17);

    doc.text(`Besakih, ${formatTanggalId(new Date().toISOString())}`, 136, sigY);
    doc.text(`Kepala ${school.nama}`, 136, sigY + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.text(kepalaSekolah?.nama || 'Kepala Sekolah', 136, sigY + 17);
    doc.setFont('helvetica', 'normal');
    if (kepalaSekolah?.nip) {
      doc.text(`NIP. ${kepalaSekolah.nip}`, 136, sigY + 20.5);
    }
  }
}

export async function buildStudentRaporPdfDoc(
  siswa: Siswa,
  period: EducationPeriod,
  school: SchoolProfile,
  nilaiRecords: NilaiRecord[],
  studentRaporExtras: StudentRaporExtras[],
  gradeSettings: GradeSettings,
  kepalaSekolah?: KepalaSekolah,
  subjects?: string[],
  options?: CombinedRaportPdfOptions
): Promise<jsPDF> {
  const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
  await renderStudentRaportOnDoc(
    doc,
    siswa,
    period,
    school,
    nilaiRecords,
    studentRaporExtras,
    gradeSettings,
    kepalaSekolah,
    subjects,
    options
  );
  return doc;
}

export async function exportStudentRaporPdf(
  siswa: Siswa,
  period: EducationPeriod,
  school: SchoolProfile,
  nilaiRecords: NilaiRecord[],
  studentRaporExtras: StudentRaporExtras[],
  gradeSettings: GradeSettings,
  kepalaSekolah?: KepalaSekolah,
  subjects?: string[],
  options?: CombinedRaportPdfOptions
) {
  const doc = await buildStudentRaporPdfDoc(
    siswa,
    period,
    school,
    nilaiRecords,
    studentRaporExtras,
    gradeSettings,
    kepalaSekolah,
    subjects,
    options
  );
  const safeName = siswa.nama.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeTa = period.tahunAjaran.replace('/', '-');
  const prefix = options?.filePrefix || 'Raport';
  doc.save(`${prefix}_${safeName}_Kls_${siswa.kelas}_${safeTa}_${period.semester}.pdf`);
}

export async function buildClassRaporPdfDoc(
  siswas: Siswa[],
  period: EducationPeriod,
  school: SchoolProfile,
  nilaiRecords: NilaiRecord[],
  studentRaporExtras: StudentRaporExtras[],
  gradeSettings: GradeSettings,
  kepalaSekolah?: KepalaSekolah,
  subjects?: string[],
  options?: CombinedRaportPdfOptions
): Promise<jsPDF> {
  const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
  for (let i = 0; i < siswas.length; i++) {
    if (i > 0) doc.addPage();
    await renderStudentRaportOnDoc(
      doc,
      siswas[i],
      period,
      school,
      nilaiRecords,
      studentRaporExtras,
      gradeSettings,
      kepalaSekolah,
      subjects,
      options
    );
  }
  return doc;
}

export async function exportClassRaporPdf(
  kelas: KelasLevel,
  siswas: Siswa[],
  period: EducationPeriod,
  school: SchoolProfile,
  nilaiRecords: NilaiRecord[],
  studentRaporExtras: StudentRaporExtras[],
  gradeSettings: GradeSettings,
  kepalaSekolah?: KepalaSekolah,
  subjects?: string[],
  options?: CombinedRaportPdfOptions
) {
  const doc = await buildClassRaporPdfDoc(
    siswas,
    period,
    school,
    nilaiRecords,
    studentRaporExtras,
    gradeSettings,
    kepalaSekolah,
    subjects,
    options
  );
  const safeTa = period.tahunAjaran.replace('/', '-');
  const prefix = options?.filePrefix || 'Raport_Lengkap';
  doc.save(`${prefix}_Kelas_${kelas}_${safeTa}_${period.semester}.pdf`);
}

export function buildClassRaporWorkbook(
  kelas: KelasLevel,
  siswas: Siswa[],
  period: EducationPeriod,
  nilaiRecords: NilaiRecord[],
  studentRaporExtras: StudentRaporExtras[],
  gradeSettings: GradeSettings,
  subjects: string[] = DAFTAR_MAPEL
): XLSX.WorkBook {
  const nilaiSheetRows: Array<Record<string, string | number>> = [];
  const ekskulSheetRows: Array<Record<string, string | number>> = [];

  siswas.forEach((s) => {
    const sNilai = nilaiRecords.filter((n) => n.periodId === period.id && n.siswaId === s.id);
    subjects.forEach((mapel) => {
      const rec = sNilai.find((n) => n.mapel === mapel);
      const kkm = gradeSettings.kkmPerMapel[mapel] ?? 75;
      const avgTugas = rec ? (hitungRataDaftar(rec.tugasList) ?? rec.tugas ?? null) : null;
      const avgHarian = rec ? (hitungRataDaftar(rec.keseharianList) ?? rec.keseharian ?? null) : null;
      const avg = rec ? hitungRataRata(rec, gradeSettings) : null;

      nilaiSheetRows.push({
        Periode: period.label,
        Kelas: `Kelas ${kelas}`,
        NIS: s.nis,
        'Nama Siswa': s.nama,
        'Mata Pelajaran': mapel,
        KKM: kkm,
        'Rata Tugas': avgTugas !== null ? avgTugas : '',
        'Rata Harian': avgHarian !== null ? avgHarian : '',
        UTS: rec?.uts ?? '',
        UAS: rec?.uas ?? '',
        'Nilai Akhir': avg !== null ? avg : '',
        Predikat: avg !== null ? getPredikatNilai(avg) : '-',
        'Catatan Guru': rec?.catatanGuru || '',
      });
    });

    const extra = studentRaporExtras.find((r) => r.periodId === period.id && r.siswaId === s.id);
    const eksText =
      extra?.ekstrakurikuler
        ?.map((x) => `${x.namaEkskul} (${x.predikat}${x.nilaiAngka ? ` / ${x.nilaiAngka}` : ''})`)
        .join('; ') || '-';

    ekskulSheetRows.push({
      Periode: period.label,
      Kelas: `Kelas ${kelas}`,
      NIS: s.nis,
      'Nama Siswa': s.nama,
      Ekstrakurikuler: eksText,
      Sakit: extra?.sakit ?? 0,
      Izin: extra?.izin ?? 0,
      Alpa: extra?.alpa ?? 0,
      'Catatan Wali Kelas': extra?.catatanWaliKelas || '',
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nilaiSheetRows), 'Nilai & Catatan Guru');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ekskulSheetRows), 'Ekskul & Absensi');
  return wb;
}

export function exportClassRaporExcel(
  kelas: KelasLevel,
  siswas: Siswa[],
  period: EducationPeriod,
  nilaiRecords: NilaiRecord[],
  studentRaporExtras: StudentRaporExtras[],
  gradeSettings: GradeSettings,
  subjects?: string[]
) {
  const wb = buildClassRaporWorkbook(
    kelas,
    siswas,
    period,
    nilaiRecords,
    studentRaporExtras,
    gradeSettings,
    subjects
  );
  const safeTa = period.tahunAjaran.replace('/', '-');
  XLSX.writeFile(wb, `Rekap_Raport_Kelas_${kelas}_${safeTa}_${period.semester}.xlsx`);
}

// 8. EKSPOR PROFIL GURU LENGKAP (KHUSUS ADMIN: SATUAN ATAU SEMUA MENJADI SATU PDF)
async function renderGuruProfileOnDoc(
  doc: jsPDF,
  guru: Guru,
  school: SchoolProfile,
  periodLabel: string,
  certificates: GuruCertificate[],
  kepalaSekolah?: KepalaSekolah
) {
  const startY = await drawSchoolHeaderPdf(
    doc,
    school,
    'PROFIL LENGKAP PENDIDIK (GURU)',
    `Periode Pendidikan: ${periodLabel}`
  );

  // Foto guru di pojok kanan atas jika ada
  let headerBlockY = startY + 2;
  if (guru.foto) {
    const guruPng = await toPngDataUrl(guru.foto);
    if (guruPng) {
      doc.addImage(guruPng, 'PNG', 170, headerBlockY, 24, 24);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(guru.nama, 14, headerBlockY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  doc.text(`NIP: ${guru.nip || '-'}   |   NUPTK: ${guru.nuptk || '-'}`, 14, headerBlockY + 9.5);
  doc.text(
    `Jabatan: ${guru.jabatan || '-'}   |   Status: ${guru.statusKepegawaian}`,
    14,
    headerBlockY + 14.5
  );
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Mapel Diampu: ${guru.mapelDiampu.join(', ') || '-'} (Kelas ${guru.kelasDiampu.join(', ') || '-'}) · ${guru.jamMengajar} JP/Minggu`,
    14,
    headerBlockY + 19.5
  );

  headerBlockY += 27;

  // A. Identitas Pribadi & Kepegawaian
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 118, 110);
  doc.text('A. Data Pribadi & Kepegawaian', 14, headerBlockY);

  autoTable(doc, {
    startY: headerBlockY + 2,
    head: [['Atribut Data', 'Keterangan']],
    body: [
      ['Nama Lengkap & Gelar', guru.nama || '-'],
      ['NIP / NUPTK', `${guru.nip || '-'} / ${guru.nuptk || '-'}`],
      ['Tempat, Tanggal Lahir', `${guru.tempatLahir || '-'}, ${formatTanggalId(guru.tanggalLahir)}`],
      ['Jenis Kelamin / Agama', `${guru.jenisKelamin} / ${guru.agama || '-'}`],
      ['Alamat Tempat Tinggal', guru.alamat || '-'],
      ['No. HP / Email', `${guru.noHp || '-'} / ${guru.email || '-'}`],
      ['Pendidikan Terakhir', guru.pendidikanTerakhir || '-'],
      ['Status Kepegawaian', guru.statusKepegawaian || '-'],
      ['Golongan / Pangkat', guru.golonganPangkat || '-'],
      ['Jabatan', guru.jabatan || '-'],
      ['Mata Pelajaran Diampu', guru.mapelDiampu.join(', ') || '-'],
      ['Kelas Diampu & Beban Jam', `Kelas ${guru.kelasDiampu.join(', ') || '-'} (${guru.jamMengajar} JP/minggu)`],
      ['Tahun Mulai Bertugas', guru.tahunMulaiBertugas || '-'],
    ],
    styles: {fontSize: 8, cellPadding: 1.8},
    headStyles: {fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold'},
    alternateRowStyles: {fillColor: [248, 250, 252]},
    columnStyles: {0: {cellWidth: 58, fontStyle: 'bold'}},
  });

  let nextY =
    ((doc as unknown as {lastAutoTable?: {finalY: number}}).lastAutoTable?.finalY || headerBlockY + 75) + 5;

  // B. Identitas Tambahan & Kolom Bebas
  const extraRows: Array<[string, string]> = [
    ['NIK', guru.nik || '-'],
    ['NPWP', guru.npwp || '-'],
    ['Nomor Rekening', guru.noRekening || '-'],
    ['Kontak Darurat', guru.kontakDarurat || '-'],
    ...guru.customFields.map((cf): [string, string] => [cf.label || 'Kolom Tambahan', cf.value || '-']),
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 118, 110);
  doc.text('B. Identitas Tambahan', 14, nextY);

  autoTable(doc, {
    startY: nextY + 2,
    head: [['Identitas Tambahan', 'Nilai / Keterangan']],
    body: extraRows,
    styles: {fontSize: 8, cellPadding: 1.8},
    headStyles: {fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold'},
    alternateRowStyles: {fillColor: [248, 250, 252]},
    columnStyles: {0: {cellWidth: 58, fontStyle: 'bold'}},
  });

  nextY =
    ((doc as unknown as {lastAutoTable?: {finalY: number}}).lastAutoTable?.finalY || nextY + 35) + 5;

  // C. Sertifikat Prestasi Guru
  const pageHeight = doc.internal.pageSize.getHeight();
  if (nextY > pageHeight - 45) {
    doc.addPage();
    nextY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 118, 110);
  doc.text(`C. Sertifikat Prestasi & Penghargaan (${certificates.length})`, 14, nextY);

  autoTable(doc, {
    startY: nextY + 2,
    head: [['No', 'Judul Sertifikat / Penghargaan', 'Peringkat', 'Tingkat', 'Tahun', 'Penyelenggara']],
    body:
      certificates.length > 0
        ? certificates.map((c, idx) => [
            idx + 1,
            c.judul,
            c.peringkat,
            c.tingkat,
            c.tahun,
            c.penyelenggara || '-',
          ])
        : [['-', 'Belum ada sertifikat prestasi diunggah', '-', '-', '-', '-']],
    styles: {fontSize: 7.8, cellPadding: 1.8},
    headStyles: {fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold'},
    columnStyles: {0: {halign: 'center', cellWidth: 9}, 4: {halign: 'center', cellWidth: 14}},
  });

  const sigY =
    ((doc as unknown as {lastAutoTable?: {finalY: number}}).lastAutoTable?.finalY || nextY + 20) + 8;

  if (sigY <= pageHeight - 22) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(30, 41, 59);
    doc.text(`Besakih, ${formatTanggalId(new Date().toISOString())}`, 136, sigY);
    doc.text(`Kepala ${school.nama}`, 136, sigY + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(kepalaSekolah?.nama || 'Kepala Sekolah', 136, sigY + 18);
    doc.setFont('helvetica', 'normal');
    if (kepalaSekolah?.nip) {
      doc.text(`NIP. ${kepalaSekolah.nip}`, 136, sigY + 21.5);
    }
  }
}

export async function exportSingleGuruPdf(
  guru: Guru,
  school: SchoolProfile,
  periodLabel: string,
  allCertificates: GuruCertificate[],
  kepalaSekolah?: KepalaSekolah
) {
  const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
  const certs = allCertificates.filter(
    (c) => (guru.userId && c.userId === guru.userId) || c.guruId === guru.id
  );
  await renderGuruProfileOnDoc(doc, guru, school, periodLabel, certs, kepalaSekolah);
  const safeName = guru.nama.replace(/[^a-zA-Z0-9._-]/g, '_');
  doc.save(`Profil_Lengkap_Guru_${safeName}.pdf`);
}

export async function exportAllGurusPdf(
  gurus: Guru[],
  school: SchoolProfile,
  periodLabel: string,
  allCertificates: GuruCertificate[],
  kepalaSekolah?: KepalaSekolah
) {
  const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
  for (let i = 0; i < gurus.length; i++) {
    if (i > 0) doc.addPage();
    const g = gurus[i];
    const certs = allCertificates.filter(
      (c) => (g.userId && c.userId === g.userId) || c.guruId === g.id
    );
    await renderGuruProfileOnDoc(doc, g, school, periodLabel, certs, kepalaSekolah);
  }
  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9._-]/g, '_');
  doc.save(`Profil_Lengkap_Semua_Guru_${safePeriod}.pdf`);
}
