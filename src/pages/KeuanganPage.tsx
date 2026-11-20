// Halaman Keuangan Sekolah: Periode Multi-Tahun, Kertas Kerja, Input Pemasukan/Penarikan/Saldo,
// Otomatisasi Hasil Akhir, Peringatan Kesalahan, Impor/Ekspor Kertas Kerja (.xlsx/.csv), & Ekspor PDF.

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileDown,
  FileSpreadsheet,
  FolderPlus,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {FinanceTransaction, FinanceWorksheet} from '../types/school';
import {
  exportFinancePeriodRecapPdf,
  exportFinanceWorksheetPdf,
} from '../utils/exportUtils';
import {
  computeFinancePeriodTotals,
  computeWorksheetSummary,
  downloadFinanceWorksheetExcel,
  extractYearDigits,
  formatRupiah,
  KATEGORI_KEUANGAN_DEFAULT,
  ParsedKertasKerjaResult,
  parseUploadedFinanceWorksheet,
} from '../utils/financeUtils';
import {formatTanggalId} from '../utils/gradeUtils';
import {EmptyState, Modal} from '../components/ui/AvatarAndModal';

export const KeuanganPage: React.FC = () => {
  const {
    state,
    currentUser,
    createFinancePeriod,
    setActiveFinancePeriod,
    deleteFinancePeriod,
    saveFinanceWorksheet,
    deleteFinanceWorksheet,
    confirmDelete,
    showToast,
    addLog,
  } = useSchool();

  const {financePeriods, activeFinancePeriodId, financeWorksheets, schoolProfile, kepalaSekolah} =
    state;

  const isAdmin = currentUser?.role === 'ADMIN';
  const isGuru = currentUser?.role === 'GURU';
  const canInputKeuangan =
    currentUser?.role === 'STAF' && Boolean(currentUser?.aksesKeuangan);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(activeFinancePeriodId);
  const selectedPeriod = useMemo(
    () =>
      financePeriods.find((p) => p.id === selectedPeriodId) ||
      financePeriods.find((p) => p.id === activeFinancePeriodId) ||
      financePeriods[0],
    [financePeriods, selectedPeriodId, activeFinancePeriodId]
  );

  useEffect(() => {
    if (!financePeriods.some((p) => p.id === selectedPeriodId) && financePeriods[0]) {
      setSelectedPeriodId(activeFinancePeriodId || financePeriods[0].id);
    }
  }, [financePeriods, selectedPeriodId, activeFinancePeriodId]);

  const periodRecap = useMemo(
    () => computeFinancePeriodTotals(selectedPeriod, financeWorksheets),
    [selectedPeriod, financeWorksheets]
  );

  const [selectedWorksheetId, setSelectedWorksheetId] = useState<string>(
    periodRecap.periodSheets[0]?.id || ''
  );

  useEffect(() => {
    if (!periodRecap.periodSheets.some((w) => w.id === selectedWorksheetId)) {
      setSelectedWorksheetId(periodRecap.periodSheets[0]?.id || '');
    }
  }, [periodRecap.periodSheets, selectedWorksheetId]);

  const activeWorksheet = useMemo(
    () =>
      periodRecap.periodSheets.find((w) => w.id === selectedWorksheetId) ||
      periodRecap.periodSheets[0] ||
      null,
    [periodRecap.periodSheets, selectedWorksheetId]
  );

  const activeSummary = useMemo(
    () =>
      activeWorksheet ? computeWorksheetSummary(activeWorksheet, selectedPeriod.tahun) : null,
    [activeWorksheet, selectedPeriod.tahun]
  );

  // Filter pencarian baris transaksi
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'PEMASUKAN' | 'PENARIKAN' | 'WARNING'>(
    'ALL'
  );

  const filteredRows = useMemo(() => {
    if (!activeSummary) return [];
    const q = txSearch.trim().toLowerCase();
    return activeSummary.rows.filter((r) => {
      if (txTypeFilter === 'PEMASUKAN' && r.pemasukan <= 0) return false;
      if (txTypeFilter === 'PENARIKAN' && r.penarikan <= 0) return false;
      if (txTypeFilter === 'WARNING' && r.rowErrors.length === 0 && r.rowWarnings.length === 0)
        return false;
      if (!q) return true;
      return (
        r.uraian.toLowerCase().includes(q) ||
        r.kategori.toLowerCase().includes(q) ||
        (r.kodeBukti || '').toLowerCase().includes(q) ||
        (r.keterangan || '').toLowerCase().includes(q)
      );
    });
  }, [activeSummary, txSearch, txTypeFilter]);

  // === MODAL TAMBAH PERIODE TAHUN ===
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [newTahun, setNewTahun] = useState('2028');
  const [newPeriodLabel, setNewPeriodLabel] = useState('Tahun Anggaran 2028');
  const [newPeriodNote, setNewPeriodNote] = useState('');
  const [carryOverPeriodId, setCarryOverPeriodId] = useState<string>(selectedPeriod?.id || '');
  const [setNewPeriodActive, setSetNewPeriodActive] = useState(true);

  const openAddFinancePeriod = () => {
    const maxYearNum = financePeriods.reduce((max, p) => {
      const y = Number(extractYearDigits(p.tahun) || 0);
      return y > max ? y : max;
    }, new Date().getFullYear());
    const nextY = String(maxYearNum + 1);
    setNewTahun(nextY);
    setNewPeriodLabel(`Tahun Anggaran ${nextY}`);
    setNewPeriodNote('');
    setCarryOverPeriodId(selectedPeriod?.id || '');
    setSetNewPeriodActive(false);
    setPeriodModalOpen(true);
  };

  const handleCreateFinancePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createFinancePeriod({
      tahun: newTahun,
      label: newPeriodLabel,
      keterangan: newPeriodNote,
      setAsActive: setNewPeriodActive,
      carryOverFromPeriodId: carryOverPeriodId || undefined,
    });
    if (!res.ok) {
      showToast(res.message || 'Gagal menambah periode keuangan.', 'error');
      return;
    }
    if (res.periodId) setSelectedPeriodId(res.periodId);
    setPeriodModalOpen(false);
  };

  // === MODAL TAMBAH / EDIT KERTAS KERJA ===
  const [wsModalOpen, setWsModalOpen] = useState(false);
  const [isNewWs, setIsNewWs] = useState(false);
  const [wsForm, setWsForm] = useState<{
    id: string;
    nama: string;
    sumberDana: string;
    saldoAwal: string;
    catatan: string;
  }>({
    id: '',
    nama: '',
    sumberDana: 'Dana BOS Reguler',
    saldoAwal: '0',
    catatan: '',
  });

  const openAddWorksheet = () => {
    setIsNewWs(true);
    setWsForm({
      id: `fws_${Date.now()}`,
      nama: `Kertas Kerja ${selectedPeriod.tahun} #${periodRecap.periodSheets.length + 1}`,
      sumberDana: 'Dana BOS Reguler',
      saldoAwal: '0',
      catatan: '',
    });
    setWsModalOpen(true);
  };

  const openEditWorksheet = (ws: FinanceWorksheet) => {
    setIsNewWs(false);
    setWsForm({
      id: ws.id,
      nama: ws.nama,
      sumberDana: ws.sumberDana,
      saldoAwal: String(ws.saldoAwal),
      catatan: ws.catatan || '',
    });
    setWsModalOpen(true);
  };

  const handleSaveWorksheet = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSaldoAwal = Number(wsForm.saldoAwal);
    if (!wsForm.nama.trim()) {
      showToast('Nama kertas kerja wajib diisi.', 'error');
      return;
    }
    if (Number.isNaN(parsedSaldoAwal) || parsedSaldoAwal < 0) {
      showToast('Peringatan: Saldo Awal harus berupa angka valid dan tidak boleh negatif.', 'warning');
      return;
    }
    const existing = !isNewWs
      ? financeWorksheets.find((w) => w.id === wsForm.id)
      : undefined;

    const payload: FinanceWorksheet = {
      id: wsForm.id,
      financePeriodId: selectedPeriod.id,
      nama: wsForm.nama.trim(),
      sumberDana: wsForm.sumberDana.trim() || 'Dana Sekolah',
      saldoAwal: parsedSaldoAwal,
      catatan: wsForm.catatan.trim(),
      transactions: existing ? existing.transactions : [],
      createdByUserId: existing?.createdByUserId || currentUser?.id,
      createdByName: existing?.createdByName || currentUser?.namaLengkap,
      updatedBy: currentUser?.namaLengkap,
      updatedAt: new Date().toISOString(),
    };
    saveFinanceWorksheet(payload, isNewWs);
    setSelectedWorksheetId(payload.id);
    setWsModalOpen(false);
  };

  // === MODAL TAMBAH / EDIT TRANSAKSI (PEMASUKAN / PENARIKAN) ===
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<'PEMASUKAN' | 'PENARIKAN'>('PEMASUKAN');
  const [txTanggal, setTxTanggal] = useState('');
  const [txKode, setTxKode] = useState('');
  const [txKategori, setTxKategori] = useState(KATEGORI_KEUANGAN_DEFAULT[0]);
  const [txUraian, setTxUraian] = useState('');
  const [txNominal, setTxNominal] = useState('');
  const [txKeterangan, setTxKeterangan] = useState('');

  const openAddTx = (defaultType: 'PEMASUKAN' | 'PENARIKAN' = 'PEMASUKAN') => {
    if (!activeWorksheet) return;
    const yearDigit = extractYearDigits(selectedPeriod.tahun) || new Date().getFullYear().toString();
    const today = new Date().toISOString().slice(0, 10);
    setEditingTxId(null);
    setTxType(defaultType);
    setTxTanggal(today.startsWith(yearDigit) ? today : `${yearDigit}-01-15`);
    setTxKode(
      `${defaultType === 'PEMASUKAN' ? 'BKM' : 'BKK'}-${String(activeWorksheet.transactions.length + 1).padStart(3, '0')}`
    );
    setTxKategori(
      defaultType === 'PEMASUKAN' ? 'Dana BOS Reguler' : 'Belanja Barang & Jasa'
    );
    setTxUraian('');
    setTxNominal('');
    setTxKeterangan('');
    setTxModalOpen(true);
  };

  const openEditTx = (tx: FinanceTransaction) => {
    setEditingTxId(tx.id);
    setTxType(tx.penarikan > 0 && tx.pemasukan === 0 ? 'PENARIKAN' : 'PEMASUKAN');
    setTxTanggal(tx.tanggal);
    setTxKode(tx.kodeBukti || '');
    setTxKategori(tx.kategori || 'Lainnya');
    setTxUraian(tx.uraian);
    setTxNominal(String(tx.penarikan > 0 && tx.pemasukan === 0 ? tx.penarikan : tx.pemasukan));
    setTxKeterangan(tx.keterangan || '');
    setTxModalOpen(true);
  };

  // Validasi real-time saat mengetik transaksi di Modal
  const liveTxValidation = useMemo(() => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const num = Number(txNominal);
    if (txNominal !== '' && (Number.isNaN(num) || num <= 0)) {
      errors.push('Nominal harus berupa angka lebih dari Rp 0.');
    }
    const yearDigit = extractYearDigits(selectedPeriod.tahun);
    if (txTanggal && yearDigit && !txTanggal.startsWith(yearDigit)) {
      warnings.push(
        `Tanggal (${txTanggal}) berada di luar Tahun Anggaran ${yearDigit}. Pastikan tahun transaksi sudah benar.`
      );
    }
    if (activeWorksheet && activeSummary && Number.isFinite(num) && num > 0 && txType === 'PENARIKAN') {
      const existingAmount = editingTxId
        ? activeWorksheet.transactions.find((t) => t.id === editingTxId)?.penarikan || 0
        : 0;
      const projectedSaldoAkhir = activeSummary.saldoAkhir + existingAmount - num;
      if (projectedSaldoAkhir < 0) {
        warnings.push(
          `Peringatan Saldo Minus: Penarikan ${formatRupiah(num)} akan membuat saldo akhir menjadi minus (${formatRupiah(projectedSaldoAkhir)}).`
        );
      }
    }
    return {errors, warnings};
  }, [txNominal, txTanggal, txType, selectedPeriod.tahun, activeWorksheet, activeSummary, editingTxId]);

  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorksheet) return;
    const nominalNum = Number(txNominal);
    if (!txTanggal) {
      showToast('Peringatan: Tanggal transaksi wajib diisi.', 'warning');
      return;
    }
    if (!txUraian.trim()) {
      showToast('Peringatan: Uraian transaksi tidak boleh kosong.', 'warning');
      return;
    }
    if (Number.isNaN(nominalNum) || nominalNum <= 0) {
      showToast('Peringatan: Nominal harus berupa angka positif lebih dari 0.', 'error');
      return;
    }

    const newTx: FinanceTransaction = {
      id: editingTxId || `ftx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      tanggal: txTanggal,
      kodeBukti: txKode.trim(),
      kategori: txKategori,
      uraian: txUraian.trim(),
      pemasukan: txType === 'PEMASUKAN' ? nominalNum : 0,
      penarikan: txType === 'PENARIKAN' ? nominalNum : 0,
      keterangan: txKeterangan.trim(),
    };

    const nextTransactions = editingTxId
      ? activeWorksheet.transactions.map((t) => (t.id === editingTxId ? newTx : t))
      : [...activeWorksheet.transactions, newTx];

    const updatedWs: FinanceWorksheet = {
      ...activeWorksheet,
      transactions: nextTransactions,
    };
    const nextSummary = computeWorksheetSummary(updatedWs, selectedPeriod.tahun);
    saveFinanceWorksheet(updatedWs, false);

    if (nextSummary.errorCount > 0) {
      showToast(
        `Peringatan: Terdeteksi ${nextSummary.errorCount} kesalahan/saldo minus pada kertas kerja ini. Periksa panel peringatan.`,
        'warning'
      );
    } else if (nextSummary.warningCount > 0) {
      showToast(
        `Transaksi tersimpan dengan ${nextSummary.warningCount} catatan peringatan.`,
        'warning'
      );
    }
    setTxModalOpen(false);
  };

  const handleDeleteTx = (tx: FinanceTransaction) => {
    if (!activeWorksheet) return;
    confirmDelete(
      'Hapus Transaksi Keuangan?',
      `Transaksi "${tx.uraian}" (${formatRupiah(tx.pemasukan || tx.penarikan)}) akan dihapus dan saldo otomatis dihitung ulang.`,
      () => {
        saveFinanceWorksheet(
          {
            ...activeWorksheet,
            transactions: activeWorksheet.transactions.filter((t) => t.id !== tx.id),
          },
          false
        );
      }
    );
  };

  // === UPLOAD / IMPOR KERTAS KERJA OTOMATIS ===
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    parsed: ParsedKertasKerjaResult;
    mode: 'REPLACE_ACTIVE' | 'APPEND_ACTIVE' | 'CREATE_NEW';
    newWsName: string;
    newWsSumber: string;
    saldoAwalText: string;
  } | null>(null);

  const handleUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = await parseUploadedFinanceWorksheet(file, selectedPeriod.tahun);
      const baseName = file.name.replace(/\.(xlsx|xls|csv)$/i, '').replace(/_/g, ' ');
      setImportPreview({
        fileName: file.name,
        parsed,
        mode: activeWorksheet ? 'REPLACE_ACTIVE' : 'CREATE_NEW',
        newWsName: parsed.detectedName || baseName || `Impor Kertas Kerja ${selectedPeriod.tahun}`,
        newWsSumber: parsed.detectedSumberDana || activeWorksheet?.sumberDana || 'Dana BOS Reguler',
        saldoAwalText: String(
          parsed.detectedSaldoAwal !== undefined
            ? parsed.detectedSaldoAwal
            : activeWorksheet?.saldoAwal ?? 0
        ),
      });
    } catch (err) {
      showToast(
        err instanceof Error
          ? `Peringatan Impor Gagal: ${err.message}`
          : 'Gagal membaca file Kertas Kerja.',
        'error'
      );
    }
  };

  const importSimulatedSummary = useMemo(() => {
    if (!importPreview) return null;
    const saldoAwalNum = Number(importPreview.saldoAwalText);
    const safeSaldoAwal = Number.isFinite(saldoAwalNum) ? saldoAwalNum : 0;
    const baseTx =
      importPreview.mode === 'APPEND_ACTIVE' && activeWorksheet
        ? [...activeWorksheet.transactions, ...importPreview.parsed.transactions]
        : importPreview.parsed.transactions;

    return computeWorksheetSummary(
      {
        id: 'preview',
        financePeriodId: selectedPeriod.id,
        nama: importPreview.newWsName,
        sumberDana: importPreview.newWsSumber,
        saldoAwal: safeSaldoAwal,
        transactions: baseTx,
        updatedAt: new Date().toISOString(),
      },
      selectedPeriod.tahun
    );
  }, [importPreview, activeWorksheet, selectedPeriod]);

  const handleConfirmImport = () => {
    if (!importPreview) return;
    const saldoAwalNum = Number(importPreview.saldoAwalText);
    if (Number.isNaN(saldoAwalNum) || saldoAwalNum < 0) {
      showToast('Peringatan: Saldo Awal pada impor harus berupa angka non-negatif.', 'warning');
      return;
    }

    if (importPreview.mode === 'CREATE_NEW' || !activeWorksheet) {
      const newWs: FinanceWorksheet = {
        id: `fws_${Date.now()}`,
        financePeriodId: selectedPeriod.id,
        nama: importPreview.newWsName.trim() || `Kertas Kerja Impor ${selectedPeriod.tahun}`,
        sumberDana: importPreview.newWsSumber.trim() || 'Dana Sekolah',
        saldoAwal: saldoAwalNum,
        catatan: `Diimpor otomatis dari berkas "${importPreview.fileName}".`,
        transactions: importPreview.parsed.transactions,
        createdByUserId: currentUser?.id,
        createdByName: currentUser?.namaLengkap,
        updatedBy: currentUser?.namaLengkap,
        updatedAt: new Date().toISOString(),
      };
      saveFinanceWorksheet(newWs, true);
      setSelectedWorksheetId(newWs.id);
    } else if (importPreview.mode === 'REPLACE_ACTIVE') {
      saveFinanceWorksheet(
        {
          ...activeWorksheet,
          saldoAwal:
            importPreview.parsed.detectedSaldoAwal !== undefined
              ? saldoAwalNum
              : activeWorksheet.saldoAwal,
          transactions: importPreview.parsed.transactions,
        },
        false
      );
    } else {
      saveFinanceWorksheet(
        {
          ...activeWorksheet,
          transactions: [...activeWorksheet.transactions, ...importPreview.parsed.transactions],
        },
        false
      );
    }

    addLog(
      'TAMBAH',
      'Impor Kertas Kerja Keuangan',
      `Mengimpor ${importPreview.parsed.transactions.length} baris transaksi dari "${importPreview.fileName}" (${selectedPeriod.label}).`
    );

    if (
      importPreview.parsed.parseErrors.length > 0 ||
      (importSimulatedSummary && importSimulatedSummary.errorCount > 0)
    ) {
      showToast(
        'Data diimpor dengan peringatan validasi. Mohon periksa panel peringatan.',
        'warning'
      );
    }
    setImportPreview(null);
  };

  // === EKSPOR PDF & EXCEL ===
  const handleDownloadWorksheetPdf = async () => {
    if (!activeWorksheet) return;
    await exportFinanceWorksheetPdf(
      activeWorksheet,
      selectedPeriod,
      schoolProfile,
      kepalaSekolah,
      activeWorksheet.updatedBy || activeWorksheet.createdByName
    );
    addLog(
      'EXPORT',
      'PDF Keuangan Sekolah',
      `Mengunduh PDF Kertas Kerja "${activeWorksheet.nama}" (${selectedPeriod.label}).`
    );
    showToast('Laporan PDF Kertas Kerja berhasil diunduh.', 'success');
  };

  const handleDownloadYearRecapPdf = async () => {
    await exportFinancePeriodRecapPdf(
      selectedPeriod,
      financeWorksheets,
      schoolProfile,
      kepalaSekolah
    );
    addLog(
      'EXPORT',
      'PDF Rekap Keuangan 1 Tahun',
      `Mengunduh PDF Rekap Keuangan ${selectedPeriod.label}.`
    );
    showToast(`Laporan PDF Rekap ${selectedPeriod.label} berhasil diunduh.`, 'success');
  };

  const handleDownloadKertasKerjaExcel = (asTemplate = false) => {
    const target: FinanceWorksheet = activeWorksheet || {
      id: 'template',
      financePeriodId: selectedPeriod.id,
      nama: `Keuangan_${selectedPeriod.tahun}`,
      sumberDana: 'Dana BOS Reguler',
      saldoAwal: 0,
      transactions: [],
      updatedAt: new Date().toISOString(),
    };
    downloadFinanceWorksheetExcel(target, selectedPeriod, schoolProfile, asTemplate);
    showToast(
      asTemplate
        ? 'Template Kertas Kerja (.xlsx) berhasil diunduh. Silakan isi di Excel lalu upload kembali.'
        : 'Kertas Kerja (.xlsx) berhasil diunduh.',
      'success'
    );
  };

  return (
    <div className="space-y-6">
      <input
        ref={uploadInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleUploadFileChange}
        className="hidden"
      />

      {/* Header Halaman & Tombol Unduhan / Aksi Utama */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-teal-700 dark:text-teal-400" />
            Keuangan Sekolah
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pengelolaan saldo, pemasukan, penarikan, kertas kerja, dan hasil akhir keuangan multi-tahun.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(isAdmin || canInputKeuangan) && (
            <>
              <button
                type="button"
                onClick={handleDownloadYearRecapPdf}
                disabled={periodRecap.periodSheets.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                Download PDF Rekap 1 Tahun
              </button>
              {activeWorksheet && (
                <button
                  type="button"
                  onClick={handleDownloadWorksheetPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-600/40 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Kertas Kerja
                </button>
              )}
            </>
          )}

          {canInputKeuangan && (
            <button
              type="button"
              onClick={openAddFinancePeriod}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <CalendarRange className="w-4 h-4 text-amber-500" />
              + Tambah Tahun Anggaran
            </button>
          )}
        </div>
      </div>

      {/* Banner Hak Akses Peran */}
      {canInputKeuangan ? (
        <div className="rounded-2xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/70 dark:bg-teal-950/25 px-4 py-3 flex items-center gap-3 text-xs sm:text-sm text-teal-950 dark:text-teal-200">
          <ShieldCheck className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0" />
          <p>
            <strong>Akses Pengelola Keuangan (Staf Ditugaskan):</strong> Anda memiliki wewenang penuh untuk menambah periode tahun, mengelola kertas kerja, menginput pemasukan/penarikan, serta mengunggah berkas Kertas Kerja Excel/CSV.
          </p>
        </div>
      ) : isAdmin ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/25 px-4 py-3 flex items-center gap-3 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
          <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p>
            <strong>Mode Penerima Hasil (Admin):</strong> Penginputan data keuangan dilakukan oleh Staf Keuangan yang ditugaskan. Anda dapat memantau seluruh hasil akhir otomatis, peringatan validasi, serta mengunduh laporan PDF.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-4 py-3 flex items-center gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <p>
            <strong>Mode Hanya Lihat ({isGuru ? 'Guru' : 'Staf'}):</strong> Transparansi keuangan sekolah dapat dilihat oleh seluruh pendidik, namun hanya Staf Keuangan yang ditugaskan yang dapat mengedit atau menginput transaksi.
          </p>
        </div>
      )}

      {/* Pemilih Periode Keuangan (1 Tahun sampai Tahun-Tahun Berikutnya) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Periode Keuangan (1 Tahun s.d. Tahun-Tahun Berikutnya)
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedPeriod.keterangan || selectedPeriod.label}
            </p>
          </div>
          {canInputKeuangan && (
            <div className="flex items-center gap-2">
              {!selectedPeriod.aktif && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveFinancePeriod(selectedPeriod.id)}
                    className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    Jadikan Tahun Aktif
                  </button>
                  {financePeriods.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        confirmDelete(
                          'Hapus Periode Keuangan?',
                          `Periode "${selectedPeriod.label}" beserta seluruh kertas kerja di dalamnya akan dihapus permanen.`,
                          () => deleteFinancePeriod(selectedPeriod.id)
                        )
                      }
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      title="Hapus periode keuangan ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {financePeriods.map((fp) => {
            const active = fp.id === selectedPeriod.id;
            return (
              <button
                key={fp.id}
                type="button"
                onClick={() => setSelectedPeriodId(fp.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-600/50'
                }`}
              >
                <span className="font-mono-num">{fp.label}</span>
                {fp.aktif && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      active
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    Aktif
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ringkasan Hasil Akhir Otomatis 1 Tahun */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total Saldo Awal ({selectedPeriod.tahun})
          </p>
          <p className="mt-1 text-xl font-display font-bold font-mono-num text-slate-900 dark:text-slate-100">
            {formatRupiah(periodRecap.totalSaldoAwal)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Dari {periodRecap.periodSheets.length} Kertas Kerja
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600" />
            Total Pemasukan ({selectedPeriod.tahun})
          </p>
          <p className="mt-1 text-xl font-display font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
            {formatRupiah(periodRecap.totalPemasukan)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Akumulasi seluruh pemasukan</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ArrowDownCircle className="w-3.5 h-3.5 text-rose-600" />
            Total Penarikan ({selectedPeriod.tahun})
          </p>
          <p className="mt-1 text-xl font-display font-bold font-mono-num text-rose-600 dark:text-rose-400">
            {formatRupiah(periodRecap.totalPenarikan)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Akumulasi penarikan / belanja</p>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            periodRecap.totalSaldoAkhir < 0
              ? 'border-red-300 dark:border-red-800 bg-red-50/70 dark:bg-red-950/30'
              : 'border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/30'
          }`}
        >
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Hasil Akhir Saldo Otomatis ({selectedPeriod.tahun})
          </p>
          <p
            className={`mt-1 text-xl font-display font-bold font-mono-num ${
              periodRecap.totalSaldoAkhir < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-teal-800 dark:text-teal-300'
            }`}
          >
            {formatRupiah(periodRecap.totalSaldoAkhir)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
            {periodRecap.totalSaldoAkhir < 0
              ? 'Peringatan: Saldo Defisit / Minus!'
              : periodRecap.selisih >= 0
                ? `Surplus Berjalan: +${formatRupiah(periodRecap.selisih)}`
                : `Selisih Berjalan: ${formatRupiah(periodRecap.selisih)}`}
          </p>
        </div>
      </div>

      {/* Daftar & Manajemen Kertas Kerja (Tambah & Hapus Kertas Kerja) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
              Kertas Kerja Keuangan — {selectedPeriod.label}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih kertas kerja untuk melihat rincian, mengunduh Excel/PDF, atau menambah kertas kerja baru.
            </p>
          </div>
          {canInputKeuangan && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openAddWorksheet}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                Tambah Kertas Kerja
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                title="Upload file Excel/CSV Kertas Kerja agar otomatis dibaca dan dimasukkan ke sistem"
              >
                <Upload className="w-4 h-4" />
                Upload Kertas Kerja (.xlsx/.csv)
              </button>
            </div>
          )}
        </div>

        {periodRecap.summaries.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="w-6 h-6" />}
            title={`Belum Ada Kertas Kerja pada ${selectedPeriod.label}`}
            description={
              canInputKeuangan
                ? 'Klik "Tambah Kertas Kerja" atau "Upload Kertas Kerja" untuk mulai mencatat keuangan.'
                : 'Belum ada kertas kerja yang diinput oleh Staf Keuangan pada periode ini.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {periodRecap.summaries.map(({ws, summary}) => {
              const isSelected = activeWorksheet?.id === ws.id;
              return (
                <div
                  key={ws.id}
                  onClick={() => setSelectedWorksheetId(ws.id)}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/30 ring-1 ring-teal-600/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/60 bg-slate-50/50 dark:bg-slate-950/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                        {ws.sumberDana}
                      </span>
                      <h3 className="text-sm font-display font-bold text-slate-900 dark:text-slate-100 truncate">
                        {ws.nama}
                      </h3>
                    </div>
                    {canInputKeuangan && (
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openEditWorksheet(ws)}
                          className="p-1 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                          title="Edit nama / saldo awal kertas kerja"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            confirmDelete(
                              'Hapus Kertas Kerja?',
                              `Kertas kerja "${ws.nama}" beserta ${ws.transactions.length} transaksi di dalamnya akan dihapus permanen.`,
                              () => deleteFinanceWorksheet(ws.id)
                            )
                          }
                          className="p-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title="Hapus kertas kerja"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                    <div>
                      <p className="text-[11px] text-slate-500">Saldo Akhir Otomatis</p>
                      <p
                        className={`text-sm font-mono-num font-bold ${
                          summary.saldoAkhir < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatRupiah(summary.saldoAkhir)}
                      </p>
                    </div>
                    <div className="text-right text-[11px]">
                      <span className="font-mono-num text-slate-500">
                        {ws.transactions.length} transaksi
                      </span>
                      {(summary.errorCount > 0 || summary.warningCount > 0) && (
                        <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          {summary.errorCount + summary.warningCount} Peringatan
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Kertas Kerja Terpilih: Peringatan Validasi, Aksi Excel/Input, & Tabel Transaksi */}
      {activeWorksheet && activeSummary && (
        <div className="space-y-4">
          {/* Panel Peringatan Kesalahan Input & Hasil */}
          {activeSummary.warnings.length > 0 ? (
            <div
              className={`rounded-2xl border p-4 space-y-2 ${
                activeSummary.errorCount > 0
                  ? 'border-red-300 dark:border-red-800 bg-red-50/80 dark:bg-red-950/30 text-red-900 dark:text-red-200'
                  : 'border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-display font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>
                  Peringatan Validasi Keuangan ({activeSummary.errorCount} Kesalahan Kritis ·{' '}
                  {activeSummary.warningCount} Peringatan)
                </span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {activeSummary.warnings.map((w, idx) => (
                  <li
                    key={idx}
                    className={w.severity === 'error' ? 'font-semibold' : ''}
                  >
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-2.5 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                <strong>Validasi Bersih:</strong> Seluruh inputan dan hasil akhir pada kertas kerja{' '}
                <strong>{activeWorksheet.nama}</strong> sudah sesuai (tidak ditemukan saldo minus atau kesalahan data).
              </span>
            </div>
          )}

          {/* Toolbar Aksi Kertas Kerja */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                  {activeWorksheet.nama}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Saldo Awal:{' '}
                  <strong className="font-mono-num text-slate-800 dark:text-slate-200">
                    {formatRupiah(activeSummary.saldoAwal)}
                  </strong>{' '}
                  · Status Hasil:{' '}
                  <strong
                    className={
                      activeSummary.saldoAkhir < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-teal-700 dark:text-teal-400'
                    }
                  >
                    {activeSummary.statusLabel} ({formatRupiah(activeSummary.saldoAkhir)})
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canInputKeuangan && (
                  <>
                    <button
                      type="button"
                      onClick={() => openAddTx('PEMASUKAN')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Input Pemasukan
                    </button>
                    <button
                      type="button"
                      onClick={() => openAddTx('PENARIKAN')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Input Penarikan
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadKertasKerjaExcel(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                  title="Unduh Kertas Kerja dalam format Excel untuk diedit lalu diupload kembali"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Download Kertas Kerja (.xlsx)
                </button>

                {canInputKeuangan && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownloadKertasKerjaExcel(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
                    >
                      Template Kosong
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload &amp; Baca Kertas Kerja
                    </button>
                  </>
                )}

                {(isAdmin || canInputKeuangan) && (
                  <button
                    type="button"
                    onClick={handleDownloadWorksheetPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    PDF Hasil Akhir
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pencarian Baris */}
            <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Cari uraian, kode bukti, atau kategori..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/30"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {(
                  [
                    {key: 'ALL', label: 'Semua'},
                    {key: 'PEMASUKAN', label: 'Pemasukan'},
                    {key: 'PENARIKAN', label: 'Penarikan'},
                    {key: 'WARNING', label: 'Ada Peringatan'},
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setTxTypeFilter(f.key)}
                    className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${
                      txTypeFilter === f.key
                        ? 'bg-teal-700 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabel Transaksi & Saldo Berjalan Otomatis */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3 whitespace-nowrap">Tanggal</th>
                    <th className="py-3 px-3 whitespace-nowrap">Kode</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Uraian Transaksi</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Pemasukan</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Penarikan</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Saldo Berjalan</th>
                    {canInputKeuangan && <th className="py-3 px-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Baris Saldo Awal */}
                  <tr className="bg-slate-50/70 dark:bg-slate-800/30 font-medium text-xs">
                    <td className="py-2.5 px-3 text-center text-slate-400">-</td>
                    <td className="py-2.5 px-3 text-slate-500">-</td>
                    <td className="py-2.5 px-3 text-slate-500">-</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">Saldo Awal</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      Saldo Awal ({activeWorksheet.nama})
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-3 text-right font-mono-num font-bold text-slate-900 dark:text-slate-100">
                      {formatRupiah(activeSummary.saldoAwal)}
                    </td>
                    {canInputKeuangan && <td className="py-2.5 px-3" />}
                  </tr>

                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canInputKeuangan ? 9 : 8}
                        className="py-8 text-center text-xs text-slate-500"
                      >
                        Belum ada transaksi yang sesuai filter pada kertas kerja ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const hasIssue = row.rowErrors.length > 0 || row.rowWarnings.length > 0;
                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                            row.rowErrors.length > 0
                              ? 'bg-red-50/60 dark:bg-red-950/20'
                              : row.rowWarnings.length > 0
                                ? 'bg-amber-50/50 dark:bg-amber-950/15'
                                : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono-num text-xs text-slate-500">
                            {row.rowIndex}
                          </td>
                          <td className="py-2.5 px-3 font-mono-num text-xs whitespace-nowrap">
                            {formatTanggalId(row.tanggal)}
                          </td>
                          <td className="py-2.5 px-3 font-mono-num text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {row.kodeBukti || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300">
                            {row.kategori}
                          </td>
                          <td className="py-2.5 px-3 text-xs sm:text-sm">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {row.uraian}
                            </p>
                            {row.keterangan && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {row.keterangan}
                              </p>
                            )}
                            {hasIssue && (
                              <p
                                className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 ${
                                  row.rowErrors.length > 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {row.rowErrors[0] || row.rowWarnings[0]}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {row.pemasukan > 0 ? formatRupiah(row.pemasukan) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {row.penarikan > 0 ? formatRupiah(row.penarikan) : '-'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono-num text-xs sm:text-sm font-bold whitespace-nowrap ${
                              row.runningSaldo < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {formatRupiah(row.runningSaldo)}
                          </td>
                          {canInputKeuangan && (
                            <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1">
                              <button
                                type="button"
                                onClick={() => openEditTx(row)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Edit transaksi"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTx(row)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                title="Hapus transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-teal-50/70 dark:bg-teal-950/30 font-bold text-xs sm:text-sm">
                    <td colSpan={5} className="py-3 px-3 text-right text-slate-900 dark:text-slate-100">
                      HASIL AKHIR OTOMATIS ({activeWorksheet.nama})
                    </td>
                    <td className="py-3 px-3 text-right font-mono-num text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {formatRupiah(activeSummary.totalPemasukan)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-num text-rose-700 dark:text-rose-400 whitespace-nowrap">
                      {formatRupiah(activeSummary.totalPenarikan)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono-num whitespace-nowrap ${
                        activeSummary.saldoAkhir < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-teal-800 dark:text-teal-300'
                      }`}
                    >
                      {formatRupiah(activeSummary.saldoAkhir)}
                    </td>
                    {canInputKeuangan && <td className="py-3 px-3" />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH PERIODE TAHUN ANGGARAN */}
      <Modal
        open={periodModalOpen}
        onClose={() => setPeriodModalOpen(false)}
        title="Tambah Periode Tahun Keuangan"
        subtitle="Tambahkan tahun anggaran berikutnya untuk pengelolaan keuangan sekolah berkelanjutan."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateFinancePeriod} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Tahun Anggaran *</label>
            <input
              type="text"
              required
              value={newTahun}
              onChange={(e) => {
                setNewTahun(e.target.value);
                setNewPeriodLabel(`Tahun Anggaran ${e.target.value}`);
              }}
              placeholder="Contoh: 2028"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Label Periode *</label>
            <input
              type="text"
              required
              value={newPeriodLabel}
              onChange={(e) => setNewPeriodLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              Lanjutkan Saldo Akhir dari Tahun Sebelumnya (Opsional)
            </label>
            <select
              value={carryOverPeriodId}
              onChange={(e) => setCarryOverPeriodId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">-- Mulai dari Saldo Awal Rp 0 --</option>
              {financePeriods.map((fp) => {
                const totals = computeFinancePeriodTotals(fp, financeWorksheets);
                return (
                  <option key={fp.id} value={fp.id}>
                    {fp.label} (Saldo Akhir: {formatRupiah(totals.totalSaldoAkhir)})
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan</label>
            <input
              type="text"
              value={newPeriodNote}
              onChange={(e) => setNewPeriodNote(e.target.value)}
              placeholder="Contoh: RKAS BOS & Komite Tahun 2028"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={setNewPeriodActive}
              onChange={(e) => setSetNewPeriodActive(e.target.checked)}
              className="rounded border-slate-300 text-teal-700"
            />
            Jadikan periode keuangan ini sebagai tahun aktif
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPeriodModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan Periode
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL TAMBAH / EDIT KERTAS KERJA */}
      <Modal
        open={wsModalOpen}
        onClose={() => setWsModalOpen(false)}
        title={isNewWs ? 'Tambah Kertas Kerja Baru' : 'Edit Kertas Kerja'}
        subtitle={`Periode: ${selectedPeriod.label}`}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveWorksheet} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Nama Kertas Kerja *</label>
            <input
              type="text"
              required
              value={wsForm.nama}
              onChange={(e) => setWsForm({...wsForm, nama: e.target.value})}
              placeholder="Contoh: Kertas Kerja Dana BOS 2026"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Sumber Dana *</label>
            <input
              type="text"
              required
              value={wsForm.sumberDana}
              onChange={(e) => setWsForm({...wsForm, sumberDana: e.target.value})}
              placeholder="Contoh: Dana BOS Reguler / Dana Komite"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Saldo Awal (Rp) *</label>
            <input
              type="number"
              required
              min={0}
              value={wsForm.saldoAwal}
              onChange={(e) => setWsForm({...wsForm, saldoAwal: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Catatan</label>
            <textarea
              rows={2}
              value={wsForm.catatan}
              onChange={(e) => setWsForm({...wsForm, catatan: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setWsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan Kertas Kerja
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL INPUT / EDIT TRANSAKSI (PEMASUKAN / PENARIKAN) */}
      <Modal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        title={editingTxId ? 'Edit Transaksi Keuangan' : 'Input Transaksi Keuangan'}
        subtitle={activeWorksheet ? `${activeWorksheet.nama} · ${selectedPeriod.label}` : ''}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleSaveTx} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTxType('PEMASUKAN')}
              className={`py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                txType === 'PEMASUKAN'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              + Pemasukan (Kas Masuk)
            </button>
            <button
              type="button"
              onClick={() => setTxType('PENARIKAN')}
              className={`py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                txType === 'PENARIKAN'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              - Penarikan (Kas Keluar)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Tanggal Transaksi *</label>
              <input
                type="date"
                required
                value={txTanggal}
                onChange={(e) => setTxTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Kode / Nomor Bukti</label>
              <input
                type="text"
                value={txKode}
                onChange={(e) => setTxKode(e.target.value)}
                placeholder="BKM-001 / BKK-001"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Kategori</label>
              <select
                value={txKategori}
                onChange={(e) => setTxKategori(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {KATEGORI_KEUANGAN_DEFAULT.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Nominal {txType === 'PEMASUKAN' ? 'Pemasukan' : 'Penarikan'} (Rp) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={txNominal}
                onChange={(e) => setTxNominal(e.target.value)}
                placeholder="Contoh: 2500000"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Uraian Transaksi *</label>
            <input
              type="text"
              required
              value={txUraian}
              onChange={(e) => setTxUraian(e.target.value)}
              placeholder="Contoh: Penerimaan Dana BOS Tahap I / Pembelian ATK Ujian"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan Tambahan</label>
            <input
              type="text"
              value={txKeterangan}
              onChange={(e) => setTxKeterangan(e.target.value)}
              placeholder="Opsional"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          {(liveTxValidation.errors.length > 0 || liveTxValidation.warnings.length > 0) && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-1 text-xs text-amber-900 dark:text-amber-200">
              {liveTxValidation.errors.map((err, i) => (
                <p key={`e-${i}`} className="font-semibold text-red-700 dark:text-red-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {err}
                </p>
              ))}
              {liveTxValidation.warnings.map((warn, i) => (
                <p key={`w-${i}`} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  {warn}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTxModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan &amp; Hitung Otomatis
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL PRATINJAU IMPOR KERTAS KERJA OTOMATIS */}
      <Modal
        open={Boolean(importPreview)}
        onClose={() => setImportPreview(null)}
        title="Pratinjau Upload Kertas Kerja Otomatis"
        subtitle={importPreview ? `Berkas: ${importPreview.fileName}` : ''}
        maxWidthClass="max-w-2xl"
      >
        {importPreview && importSimulatedSummary && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">Baris Terbaca</p>
                <p className="font-mono-num font-bold text-base">
                  {importPreview.parsed.transactions.length}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">Total Pemasukan</p>
                <p className="font-mono-num font-bold text-sm text-emerald-600">
                  {formatRupiah(importSimulatedSummary.totalPemasukan)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">Total Penarikan</p>
                <p className="font-mono-num font-bold text-sm text-rose-600">
                  {formatRupiah(importSimulatedSummary.totalPenarikan)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
                <p className="text-teal-700 dark:text-teal-300">Estimasi Saldo Akhir</p>
                <p
                  className={`font-mono-num font-bold text-sm ${
                    importSimulatedSummary.saldoAkhir < 0
                      ? 'text-red-600'
                      : 'text-teal-800 dark:text-teal-200'
                  }`}
                >
                  {formatRupiah(importSimulatedSummary.saldoAkhir)}
                </p>
              </div>
            </div>

            {(importPreview.parsed.parseErrors.length > 0 ||
              importPreview.parsed.parseWarnings.length > 0 ||
              importSimulatedSummary.errorCount > 0) && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 max-h-40 overflow-y-auto space-y-1 text-xs">
                <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Peringatan Terdeteksi pada Berkas Impor:
                </p>
                {importPreview.parsed.parseErrors.map((err, i) => (
                  <p key={`pe-${i}`} className="text-red-700 dark:text-red-300 font-semibold">
                    • {err}
                  </p>
                ))}
                {importPreview.parsed.parseWarnings.map((pw, i) => (
                  <p key={`pw-${i}`} className="text-amber-800 dark:text-amber-300">
                    • {pw}
                  </p>
                ))}
                {importSimulatedSummary.warnings.map((sw, i) => (
                  <p key={`sw-${i}`} className="text-amber-900 dark:text-amber-200">
                    • {sw.message}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-2 text-xs">
              <label className="block font-semibold">Mode Pemasukan Data ke Sistem:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeWorksheet && (
                  <>
                    <button
                      type="button"
                      onClick={() => setImportPreview({...importPreview, mode: 'REPLACE_ACTIVE'})}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                        importPreview.mode === 'REPLACE_ACTIVE'
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 font-semibold'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Perbarui Kertas Kerja Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportPreview({...importPreview, mode: 'APPEND_ACTIVE'})}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                        importPreview.mode === 'APPEND_ACTIVE'
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 font-semibold'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Tambahkan ke Kertas Kerja Aktif
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setImportPreview({...importPreview, mode: 'CREATE_NEW'})}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                    importPreview.mode === 'CREATE_NEW'
                      ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 font-semibold'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Buat Kertas Kerja Baru
                </button>
              </div>
            </div>

            {importPreview.mode === 'CREATE_NEW' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Nama Kertas Kerja</label>
                  <input
                    type="text"
                    value={importPreview.newWsName}
                    onChange={(e) =>
                      setImportPreview({...importPreview, newWsName: e.target.value})
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Sumber Dana</label>
                  <input
                    type="text"
                    value={importPreview.newWsSumber}
                    onChange={(e) =>
                      setImportPreview({...importPreview, newWsSumber: e.target.value})
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Saldo Awal (Rp)</label>
                  <input
                    type="number"
                    value={importPreview.saldoAwalText}
                    onChange={(e) =>
                      setImportPreview({...importPreview, saldoAwalText: e.target.value})
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-num"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
              >
                Masukkan ke Sistem Sekarang
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
