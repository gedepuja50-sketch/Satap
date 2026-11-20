// Utilitas perhitungan otomatis, validasi peringatan (warning), serta ekspor & impor Kertas Kerja Keuangan (.xlsx/.csv)

import * as XLSX from 'xlsx';
import {
  FinancePeriod,
  FinanceTransaction,
  FinanceWorksheet,
  SchoolProfile,
} from '../types/school';

export const KATEGORI_KEUANGAN_DEFAULT: string[] = [
  'Dana BOS Reguler',
  'BOS Kinerja / Afirmasi',
  'Dana Komite / Sumbangan',
  'Bantuan Operasional Daerah',
  'Belanja Pegawai / Honor',
  'Belanja Barang & Jasa',
  'Belanja Modal / Sarpras',
  'Pemeliharaan Sekolah',
  'Kegiatan Kesiswaan & Ekskul',
  'Operasional & Listrik/Internet',
  'Lainnya',
];

export interface FinanceWarning {
  severity: 'error' | 'warning';
  message: string;
  txId?: string;
}

export interface ComputedFinanceRow extends FinanceTransaction {
  rowIndex: number;
  runningSaldo: number;
  rowErrors: string[];
  rowWarnings: string[];
}

export interface WorksheetSummary {
  saldoAwal: number;
  totalPemasukan: number;
  totalPenarikan: number;
  selisih: number;
  saldoAkhir: number;
  statusLabel: 'Surplus' | 'Seimbang' | 'Defisit (Saldo Minus)' | 'Penarikan Melebihi Pemasukan';
  rows: ComputedFinanceRow[];
  warnings: FinanceWarning[];
  errorCount: number;
  warningCount: number;
}

export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(Math.round(safe));
  const formatted = abs.toLocaleString('id-ID');
  return safe < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function extractYearDigits(value?: string): string | null {
  if (!value) return null;
  const match = value.match(/\b(20\d{2})\b/);
  return match ? match[1] : null;
}

export function computeWorksheetSummary(
  ws: FinanceWorksheet,
  periodTahun?: string
): WorksheetSummary {
  const warnings: FinanceWarning[] = [];
  const expectedYear = extractYearDigits(periodTahun);

  const saldoAwal = Number.isFinite(ws.saldoAwal) ? ws.saldoAwal : 0;
  if (saldoAwal < 0) {
    warnings.push({
      severity: 'error',
      message: `Saldo Awal (${formatRupiah(saldoAwal)}) bernilai negatif. Mohon periksa kembali nominal saldo awal kertas kerja.`,
    });
  }

  // Urutkan transaksi berdasarkan tanggal secara stabil
  const indexed = ws.transactions.map((t, originalIdx) => ({t, originalIdx}));
  indexed.sort((a, b) => {
    const da = a.t.tanggal || '';
    const db = b.t.tanggal || '';
    if (da !== db) return da.localeCompare(db);
    return a.originalIdx - b.originalIdx;
  });

  const kodeSeen = new Map<string, number>();
  indexed.forEach(({t}) => {
    const kode = (t.kodeBukti || '').trim().toUpperCase();
    if (kode) {
      kodeSeen.set(kode, (kodeSeen.get(kode) || 0) + 1);
    }
  });

  let runningSaldo = saldoAwal;
  let totalPemasukan = 0;
  let totalPenarikan = 0;

  const rows: ComputedFinanceRow[] = indexed.map(({t}, idx) => {
    const rowNumber = idx + 1;
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];

    const pemasukan = Number(t.pemasukan);
    const penarikan = Number(t.penarikan);
    const validPemasukan = Number.isFinite(pemasukan) ? pemasukan : 0;
    const validPenarikan = Number.isFinite(penarikan) ? penarikan : 0;

    if (!Number.isFinite(pemasukan) || pemasukan < 0) {
      const msg = `Baris ${rowNumber} (${t.uraian || 'Tanpa uraian'}): Nominal pemasukan tidak valid atau negatif.`;
      rowErrors.push(msg);
      warnings.push({severity: 'error', message: msg, txId: t.id});
    }

    if (!Number.isFinite(penarikan) || penarikan < 0) {
      const msg = `Baris ${rowNumber} (${t.uraian || 'Tanpa uraian'}): Nominal penarikan tidak valid atau negatif.`;
      rowErrors.push(msg);
      warnings.push({severity: 'error', message: msg, txId: t.id});
    }

    if (!t.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(t.tanggal)) {
      const msg = `Baris ${rowNumber} (${t.uraian || 'Tanpa uraian'}): Format tanggal belum valid (gunakan YYYY-MM-DD).`;
      rowErrors.push(msg);
      warnings.push({severity: 'error', message: msg, txId: t.id});
    } else if (expectedYear && !t.tanggal.startsWith(expectedYear)) {
      const msg = `Baris ${rowNumber} (${t.uraian || 'Tanpa uraian'}): Tanggal ${t.tanggal} berada di luar Tahun Anggaran ${expectedYear}.`;
      rowWarnings.push(msg);
      warnings.push({severity: 'warning', message: msg, txId: t.id});
    }

    if (!t.uraian || !t.uraian.trim()) {
      const msg = `Baris ${rowNumber}: Uraian transaksi masih kosong.`;
      rowErrors.push(msg);
      warnings.push({severity: 'error', message: msg, txId: t.id});
    }

    if (validPemasukan > 0 && validPenarikan > 0) {
      const msg = `Baris ${rowNumber} (${t.uraian || '-'}): Pemasukan dan penarikan diisi bersamaan dalam satu baris.`;
      rowWarnings.push(msg);
      warnings.push({severity: 'warning', message: msg, txId: t.id});
    } else if (validPemasukan === 0 && validPenarikan === 0) {
      const msg = `Baris ${rowNumber} (${t.uraian || '-'}): Nominal pemasukan dan penarikan keduanya Rp 0.`;
      rowWarnings.push(msg);
      warnings.push({severity: 'warning', message: msg, txId: t.id});
    }

    const kode = (t.kodeBukti || '').trim().toUpperCase();
    if (kode && (kodeSeen.get(kode) || 0) > 1) {
      const msg = `Baris ${rowNumber}: Nomor/Kode bukti "${t.kodeBukti}" terdeteksi duplikat.`;
      rowWarnings.push(msg);
      warnings.push({severity: 'warning', message: msg, txId: t.id});
    }

    totalPemasukan += Math.max(0, validPemasukan);
    totalPenarikan += Math.max(0, validPenarikan);
    runningSaldo = runningSaldo + Math.max(0, validPemasukan) - Math.max(0, validPenarikan);

    if (runningSaldo < 0) {
      const msg = `Baris ${rowNumber} (${t.uraian || '-'} · ${t.tanggal}): Penarikan melebihi saldo tersedia sehingga saldo menjadi minus (${formatRupiah(runningSaldo)}).`;
      rowErrors.push(msg);
      warnings.push({severity: 'error', message: msg, txId: t.id});
    }

    return {
      ...t,
      pemasukan: Math.max(0, validPemasukan),
      penarikan: Math.max(0, validPenarikan),
      rowIndex: rowNumber,
      runningSaldo,
      rowErrors,
      rowWarnings,
    };
  });

  const selisih = totalPemasukan - totalPenarikan;
  const saldoAkhir = saldoAwal + selisih;

  if (saldoAkhir < 0) {
    warnings.push({
      severity: 'error',
      message: `HASIL AKHIR DEFISIT: Total penarikan (${formatRupiah(totalPenarikan)}) melebihi total dana tersedia (${formatRupiah(saldoAwal + totalPemasukan)}). Saldo Akhir: ${formatRupiah(saldoAkhir)}.`,
    });
  } else if (totalPenarikan > totalPemasukan && ws.transactions.length > 0) {
    warnings.push({
      severity: 'warning',
      message: `Catatan Hasil: Total penarikan (${formatRupiah(totalPenarikan)}) lebih besar daripada pemasukan periode ini (${formatRupiah(totalPemasukan)}), sehingga menggunakan Saldo Awal.`,
    });
  }

  let statusLabel: WorksheetSummary['statusLabel'] = 'Seimbang';
  if (saldoAkhir < 0) {
    statusLabel = 'Defisit (Saldo Minus)';
  } else if (selisih > 0) {
    statusLabel = 'Surplus';
  } else if (selisih < 0) {
    statusLabel = 'Penarikan Melebihi Pemasukan';
  }

  return {
    saldoAwal,
    totalPemasukan,
    totalPenarikan,
    selisih,
    saldoAkhir,
    statusLabel,
    rows,
    warnings,
    errorCount: warnings.filter((w) => w.severity === 'error').length,
    warningCount: warnings.filter((w) => w.severity === 'warning').length,
  };
}

export function computeFinancePeriodTotals(
  period: FinancePeriod,
  worksheets: FinanceWorksheet[]
) {
  const periodSheets = worksheets.filter((w) => w.financePeriodId === period.id);
  let totalSaldoAwal = 0;
  let totalPemasukan = 0;
  let totalPenarikan = 0;
  let totalSaldoAkhir = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalTransaksi = 0;

  const summaries = periodSheets.map((ws) => {
    const s = computeWorksheetSummary(ws, period.tahun);
    totalSaldoAwal += s.saldoAwal;
    totalPemasukan += s.totalPemasukan;
    totalPenarikan += s.totalPenarikan;
    totalSaldoAkhir += s.saldoAkhir;
    totalErrors += s.errorCount;
    totalWarnings += s.warningCount;
    totalTransaksi += ws.transactions.length;
    return {ws, summary: s};
  });

  return {
    periodSheets,
    summaries,
    totalSaldoAwal,
    totalPemasukan,
    totalPenarikan,
    selisih: totalPemasukan - totalPenarikan,
    totalSaldoAkhir,
    totalErrors,
    totalWarnings,
    totalTransaksi,
  };
}

// Unduh Kertas Kerja (.xlsx) agar dapat diisi di Excel lalu diupload kembali ke sistem
export function downloadFinanceWorksheetExcel(
  ws: FinanceWorksheet,
  period: FinancePeriod,
  school: SchoolProfile,
  asBlankTemplate = false
) {
  const summary = computeWorksheetSummary(ws, period.tahun);
  const yearDigit = extractYearDigits(period.tahun) || new Date().getFullYear().toString();

  const headerMeta: Array<Array<string | number>> = [
    [`KERTAS KERJA KEUANGAN SEKOLAH — ${school.nama.toUpperCase()}`],
    [`NPSN: ${school.npsn} | Alamat: ${school.alamat}`],
    [`Periode / Tahun Anggaran`, period.label],
    [`Nama Kertas Kerja`, asBlankTemplate ? `${ws.nama} (Template Input)` : ws.nama],
    [`Sumber Dana`, ws.sumberDana],
    [`Saldo Awal (Rp)`, asBlankTemplate ? 0 : ws.saldoAwal],
    [
      `Petunjuk Pengisian`,
      `Isi kolom Tanggal dengan format YYYY-MM-DD, isi Pemasukan (Rp) ATAU Penarikan (Rp) berupa angka tanpa titik/huruf, lalu simpan (.xlsx) dan upload kembali ke menu Keuangan Sekolah.`,
    ],
    [],
    [
      'No',
      'Tanggal (YYYY-MM-DD)',
      'Kode / Bukti',
      'Kategori',
      'Uraian Transaksi',
      'Pemasukan (Rp)',
      'Penarikan (Rp)',
      'Saldo Berjalan (Otomatis)',
      'Keterangan',
    ],
  ];

  const dataRows: Array<Array<string | number>> = asBlankTemplate
    ? [
        [
          1,
          `${yearDigit}-01-15`,
          'BKM-001',
          'Dana BOS Reguler',
          'Contoh: Penerimaan Dana BOS Tahap 1 (silakan edit/hapus baris contoh ini)',
          50000000,
          0,
          50000000,
          'Contoh pemasukan',
        ],
        [
          2,
          `${yearDigit}-01-20`,
          'BKK-001',
          'Belanja Barang & Jasa',
          'Contoh: Pembelian ATK & Kertas Ujian',
          0,
          2500000,
          47500000,
          'Contoh penarikan',
        ],
      ]
    : summary.rows.map((r) => [
        r.rowIndex,
        r.tanggal,
        r.kodeBukti || '',
        r.kategori,
        r.uraian,
        r.pemasukan,
        r.penarikan,
        r.runningSaldo,
        r.keterangan || '',
      ]);

  const footerRows: Array<Array<string | number>> = asBlankTemplate
    ? []
    : [
        [],
        [
          '',
          '',
          '',
          '',
          'TOTAL / HASIL AKHIR',
          summary.totalPemasukan,
          summary.totalPenarikan,
          summary.saldoAkhir,
          summary.statusLabel,
        ],
      ];

  const aoa = [...headerMeta, ...dataRows, ...footerRows];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet['!cols'] = [
    {wch: 5},
    {wch: 20},
    {wch: 15},
    {wch: 26},
    {wch: 42},
    {wch: 18},
    {wch: 18},
    {wch: 22},
    {wch: 28},
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Kertas Kerja');

  const safeSlug = ws.nama.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const fileSuffix = asBlankTemplate ? '_Template' : '';
  XLSX.writeFile(wb, `Kertas_Kerja_${safeSlug}_${period.tahun.replace(/[^0-9]/g, '')}${fileSuffix}.xlsx`);
}

function parseFlexibleNumber(raw: unknown): {value: number; valid: boolean} {
  if (raw === null || raw === undefined || raw === '') return {value: 0, valid: true};
  if (typeof raw === 'number') {
    return {value: Number.isFinite(raw) ? raw : NaN, valid: Number.isFinite(raw)};
  }
  const str = String(raw).trim();
  if (!str) return {value: 0, valid: true};

  // Bersihkan awalan Rp/IDR dan spasi
  let cleaned = str.replace(/rp\.?/gi, '').replace(/\s+/g, '');
  // Deteksi format ribuan Indonesia (contoh 1.500.000 atau 1.500.000,00)
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  } else {
    cleaned = cleaned.replace(/[^0-9.-]/g, '');
  }

  if (!cleaned || cleaned === '-') return {value: NaN, valid: false};
  const num = Number(cleaned);
  return {value: num, valid: Number.isFinite(num)};
}

function parseFlexibleDate(raw: unknown): string {
  if (!raw) return '';
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof raw === 'number' && raw > 25000 && raw < 80000) {
    // Excel serial date fallback
    const utcDays = Math.floor(raw - 25569);
    const dt = new Date(utcDays * 86400 * 1000);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString().slice(0, 10);
    }
  }
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const dmyMatch = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return str;
}

export interface ParsedKertasKerjaResult {
  detectedName?: string;
  detectedSumberDana?: string;
  detectedSaldoAwal?: number;
  transactions: FinanceTransaction[];
  parseWarnings: string[];
  parseErrors: string[];
}

export async function parseUploadedFinanceWorksheet(
  file: File,
  expectedYear?: string
): Promise<ParsedKertasKerjaResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, {type: 'array', cellDates: true});
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Berkas tidak memiliki sheet/lembar kerja yang dapat dibaca.');
  }
  const sheet = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {header: 1, defval: ''});

  let detectedName: string | undefined;
  let detectedSumberDana: string | undefined;
  let detectedSaldoAwal: number | undefined;
  let headerRowIdx = -1;

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i] || [];
    const lowerCells = row.map((c) => String(c || '').trim().toLowerCase());
    if (lowerCells[0]?.includes('nama kertas kerja') && row[1]) {
      detectedName = String(row[1]).trim();
    }
    if (lowerCells[0]?.includes('sumber dana') && row[1]) {
      detectedSumberDana = String(row[1]).trim();
    }
    if (lowerCells[0]?.includes('saldo awal')) {
      const parsedSaldo = parseFlexibleNumber(row[1]);
      if (parsedSaldo.valid) detectedSaldoAwal = parsedSaldo.value;
    }

    const hasUraian = lowerCells.some((c) => c.includes('uraian') || c.includes('deskripsi') || c.includes('transaksi'));
    const hasPemasukanOrPenarikan = lowerCells.some(
      (c) => c.includes('pemasukan') || c.includes('masuk') || c.includes('penarikan') || c.includes('keluar')
    );
    if (hasUraian && hasPemasukanOrPenarikan) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      'Header tabel Kertas Kerja tidak dikenali. Pastikan terdapat kolom "Uraian", "Pemasukan", dan "Penarikan" sesuai template Kertas Kerja.'
    );
  }

  const headerCells = (rows[headerRowIdx] || []).map((c) => String(c || '').trim().toLowerCase());
  const colIdx = {
    tanggal: headerCells.findIndex((c) => c.includes('tanggal') || c.includes('tgl')),
    kode: headerCells.findIndex((c) => c.includes('kode') || c.includes('bukti') || c.includes('no. bukti')),
    kategori: headerCells.findIndex((c) => c.includes('kategori') || c.includes('pos')),
    uraian: headerCells.findIndex((c) => c.includes('uraian') || c.includes('deskripsi') || c.includes('transaksi')),
    pemasukan: headerCells.findIndex((c) => c.includes('pemasukan') || c.includes('masuk') || c.includes('debit')),
    penarikan: headerCells.findIndex((c) => c.includes('penarikan') || c.includes('pengeluaran') || c.includes('keluar') || c.includes('kredit')),
    keterangan: headerCells.findIndex((c) => c.includes('keterangan') || c.includes('catatan')),
  };

  const transactions: FinanceTransaction[] = [];
  const parseWarnings: string[] = [];
  const parseErrors: string[] = [];
  const yearDigit = extractYearDigits(expectedYear);

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const nonEmpty = row.some((cell) => String(cell ?? '').trim() !== '');
    if (!nonEmpty) continue;

    const uraianRaw = colIdx.uraian >= 0 ? String(row[colIdx.uraian] ?? '').trim() : '';
    const upperUraian = uraianRaw.toUpperCase();
    if (
      upperUraian.startsWith('TOTAL') ||
      upperUraian === 'HASIL AKHIR' ||
      upperUraian.startsWith('SALDO AKHIR')
    ) {
      break;
    }

    const excelRowNum = r + 1;
    const tanggal = colIdx.tanggal >= 0 ? parseFlexibleDate(row[colIdx.tanggal]) : '';
    const kodeBukti = colIdx.kode >= 0 ? String(row[colIdx.kode] ?? '').trim() : '';
    const kategori =
      (colIdx.kategori >= 0 ? String(row[colIdx.kategori] ?? '').trim() : '') ||
      'Lainnya';
    const keterangan = colIdx.keterangan >= 0 ? String(row[colIdx.keterangan] ?? '').trim() : '';

    const parsedMasuk = parseFlexibleNumber(colIdx.pemasukan >= 0 ? row[colIdx.pemasukan] : 0);
    const parsedTarik = parseFlexibleNumber(colIdx.penarikan >= 0 ? row[colIdx.penarikan] : 0);

    if (!parsedMasuk.valid) {
      parseErrors.push(`Baris Excel ${excelRowNum} ("${uraianRaw || '-'}"): Nominal Pemasukan bukan angka yang valid.`);
    }
    if (!parsedTarik.valid) {
      parseErrors.push(`Baris Excel ${excelRowNum} ("${uraianRaw || '-'}"): Nominal Penarikan bukan angka yang valid.`);
    }

    const pemasukanVal = parsedMasuk.valid ? parsedMasuk.value : 0;
    const penarikanVal = parsedTarik.valid ? parsedTarik.value : 0;

    if (pemasukanVal < 0 || penarikanVal < 0) {
      parseErrors.push(`Baris Excel ${excelRowNum} ("${uraianRaw || '-'}"): Nominal tidak boleh negatif.`);
    }
    if (!uraianRaw) {
      parseErrors.push(`Baris Excel ${excelRowNum}: Kolom Uraian Transaksi kosong.`);
    }
    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      parseWarnings.push(`Baris Excel ${excelRowNum} ("${uraianRaw || '-'}"): Format tanggal "${tanggal || 'kosong'}" perlu diperiksa (YYYY-MM-DD).`);
    } else if (yearDigit && !tanggal.startsWith(yearDigit)) {
      parseWarnings.push(`Baris Excel ${excelRowNum} ("${uraianRaw || '-'}"): Tanggal ${tanggal} berada di luar Tahun Anggaran ${yearDigit}.`);
    }
    if (pemasukanVal > 0 && penarikanVal > 0) {
      parseWarnings.push(`Baris Excel ${excelRowNum} ("${uraianRaw || '-'}"): Pemasukan & penarikan diisi bersamaan pada satu baris.`);
    }
    if (pemasukanVal === 0 && penarikanVal === 0) {
      parseWarnings.push(`Baris Excel ${excelRowNum} ("${uraianRaw || '-'}"): Nilai pemasukan dan penarikan keduanya Rp 0.`);
    }

    transactions.push({
      id: `ftx_imp_${Date.now()}_${r}`,
      tanggal: tanggal || `${yearDigit || new Date().getFullYear()}-01-01`,
      kodeBukti,
      kategori,
      uraian: uraianRaw || `Transaksi Baris ${excelRowNum}`,
      pemasukan: Math.max(0, pemasukanVal),
      penarikan: Math.max(0, penarikanVal),
      keterangan,
    });
  }

  if (transactions.length === 0) {
    throw new Error('Tidak ada baris transaksi keuangan yang ditemukan pada berkas yang diunggah.');
  }

  return {
    detectedName,
    detectedSumberDana,
    detectedSaldoAwal,
    transactions,
    parseWarnings,
    parseErrors,
  };
}
