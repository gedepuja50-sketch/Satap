// Halaman 7: Administrasi Guru - Isolasi ketat per guru (kecuali Admin), Checklist Tabel per Kategori, Upload IndexedDB

import React, {useMemo, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  FileText,
  FolderKanban,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {deleteMediaFile, getMediaFile, saveMediaFile} from '../services/mediaDb';
import {
  AdminGuruEntry,
  KATEGORI_ADMIN_GURU_DEFAULT,
  StatusKelengkapan,
} from '../types/school';
import {formatFileSize, formatTanggalId} from '../utils/gradeUtils';
import {EmptyState, Modal} from '../components/ui/AvatarAndModal';
import {
  FilePreviewModal,
  generateAdminPdfBlob,
  PreviewableFileItem,
} from '../components/ui/FilePreviewModal';

export const AdministrasiGuruPage: React.FC = () => {
  const {
    state,
    currentUser,
    currentGuru,
    selectedPeriodId,
    setSelectedPeriodId,
    selectedPeriod,
    periodGurus,
    saveAdminGuruEntry,
    deleteAdminGuruEntry,
    addCustomAdminCategory,
    confirmDelete,
    showToast,
  } = useSchool();

  const isAdmin = currentUser?.role === 'ADMIN';
  const allCategories = useMemo(
    () => [...KATEGORI_ADMIN_GURU_DEFAULT, ...state.customAdminCategories],
    [state.customAdminCategories]
  );

  // Untuk role GURU: hanya boleh melihat & mengelola datanya sendiri
  const [adminGuruFilter, setAdminGuruFilter] = useState<string>('ALL');
  const [checklistGuruId, setChecklistGuruId] = useState<string>(
    currentGuru?.id || periodGurus[0]?.id || state.gurus[0]?.id || ''
  );
  const [checklistFilter, setChecklistFilter] = useState<'ALL' | 'BELUM' | 'SUDAH'>('ALL');
  const [kategoriFilter, setKategoriFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Modal Tambah / Edit Dokumen
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdminGuruEntry | null>(null);
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState(allCategories[0]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [status, setStatus] = useState<StatusKelengkapan>('Lengkap');
  const [keterangan, setKeterangan] = useState('');
  const [targetGuruId, setTargetGuruId] = useState(
    currentGuru?.id || periodGurus[0]?.id || ''
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<PreviewableFileItem | null>(null);

  const openPreview = (entry: AdminGuruEntry) => {
    if (!isAdmin && !isOwnedByUser(entry, currentGuru?.id, currentUser?.id)) {
      showToast('Akses ditolak untuk dokumen guru lain.', 'error');
      return;
    }
    setPreviewItem({
      id: entry.id,
      judul: entry.judul,
      subJudul: `TA ${entry.tahunAjaran} (${entry.semester})`,
      kategori: entry.kategori,
      pemilik: entry.guruNama,
      tanggal: entry.tanggalUpload,
      status: entry.status,
      keterangan: entry.keterangan,
      fileId: entry.fileId,
      fileName: entry.fileName || `${entry.judul.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`,
      fileType: 'application/pdf',
      fileSize: entry.fileSize,
      forcePdfPreview: true,
    });
  };

  // Helper kecocokan kepemilikan data guru (lintas periode untuk userId yang sama)
  const isOwnedByUser = (entry: AdminGuruEntry, guruId?: string, userId?: string) => {
    if (userId && entry.userId) return entry.userId === userId;
    if (guruId && entry.guruId === guruId) return true;
    return false;
  };

  // Guru yang aktif pada tabel checklist
  const activeChecklistGuru = useMemo(() => {
    if (!isAdmin) return currentGuru;
    return (
      periodGurus.find((g) => g.id === checklistGuruId) ||
      periodGurus[0] ||
      state.gurus[0] ||
      null
    );
  }, [isAdmin, currentGuru, periodGurus, checklistGuruId, state.gurus]);

  // Daftar entri pada periode terpilih yang boleh diakses oleh user yang login
  const periodAllowedEntries = useMemo(() => {
    return state.adminGuruEntries
      .filter((e) => e.periodId === selectedPeriod.id)
      .filter((e) => {
        if (isAdmin) return true;
        return isOwnedByUser(e, currentGuru?.id, currentUser?.id);
      });
  }, [state.adminGuruEntries, selectedPeriod.id, isAdmin, currentGuru?.id, currentUser?.id]);

  // Progress bar kelengkapan (Guru hanya melihat miliknya sendiri; Admin melihat semua guru pada periode)
  const guruProgressList = useMemo(() => {
    const targetKategoriCount = KATEGORI_ADMIN_GURU_DEFAULT.length - 1; // 16 kategori utama (selain 'Lainnya')
    const list = isAdmin ? periodGurus : currentGuru ? [currentGuru] : [];

    return list.map((g) => {
      const entries = state.adminGuruEntries.filter(
        (e) => e.periodId === selectedPeriod.id && isOwnedByUser(e, g.id, g.userId)
      );
      const lengkapKat = new Set(
        entries.filter((e) => e.status === 'Lengkap').map((e) => e.kategori)
      );
      const sebagianKat = new Set(
        entries
          .filter((e) => e.status === 'Sebagian' && !lengkapKat.has(e.kategori))
          .map((e) => e.kategori)
      );
      const pct = Math.min(
        100,
        Math.round(((lengkapKat.size + sebagianKat.size * 0.5) / targetKategoriCount) * 100)
      );
      return {
        guru: g,
        totalEntries: entries.length,
        lengkapCount: lengkapKat.size,
        belumCount: Math.max(0, allCategories.length - lengkapKat.size - sebagianKat.size),
        pct,
      };
    });
  }, [isAdmin, periodGurus, currentGuru, state.adminGuruEntries, selectedPeriod.id, allCategories.length]);

  // Data Tabel Checklist per Kategori untuk activeChecklistGuru
  const checklistRows = useMemo(() => {
    const guruEntries = activeChecklistGuru
      ? state.adminGuruEntries.filter(
          (e) =>
            e.periodId === selectedPeriod.id &&
            isOwnedByUser(e, activeChecklistGuru.id, activeChecklistGuru.userId)
        )
      : [];

    return allCategories
      .map((kat, idx) => {
        const matched = guruEntries.filter((e) => e.kategori === kat);
        const hasLengkap = matched.some((m) => m.status === 'Lengkap');
        const hasSebagian = matched.some((m) => m.status === 'Sebagian');
        const stateStatus: 'SUDAH' | 'SEBAGIAN' | 'BELUM' = hasLengkap
          ? 'SUDAH'
          : hasSebagian || matched.length > 0
            ? 'SEBAGIAN'
            : 'BELUM';
        const latest = matched[0] || null;
        return {
          no: idx + 1,
          kategori: kat,
          entries: matched,
          latest,
          stateStatus,
        };
      })
      .filter((row) => {
        if (checklistFilter === 'BELUM') return row.stateStatus === 'BELUM';
        if (checklistFilter === 'SUDAH') return row.stateStatus !== 'BELUM';
        return true;
      });
  }, [allCategories, activeChecklistGuru, state.adminGuruEntries, selectedPeriod.id, checklistFilter]);

  const checklistSummary = useMemo(() => {
    const guruEntries = activeChecklistGuru
      ? state.adminGuruEntries.filter(
          (e) =>
            e.periodId === selectedPeriod.id &&
            isOwnedByUser(e, activeChecklistGuru.id, activeChecklistGuru.userId)
        )
      : [];
    const uploadedCats = new Set(guruEntries.map((e) => e.kategori));
    const total = allCategories.length;
    const done = allCategories.filter((c) => uploadedCats.has(c)).length;
    return {total, done, remaining: total - done};
  }, [allCategories, activeChecklistGuru, state.adminGuruEntries, selectedPeriod.id]);

  // Entri dokumen yang tampil pada bagian daftar berkas
  const visibleEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodAllowedEntries
      .filter((e) => {
        if (!isAdmin) return true;
        if (adminGuruFilter === 'ALL') return true;
        const gObj = periodGurus.find((g) => g.id === adminGuruFilter);
        return isOwnedByUser(e, adminGuruFilter, gObj?.userId);
      })
      .filter((e) => kategoriFilter === 'ALL' || e.kategori === kategoriFilter)
      .filter((e) => {
        if (!q) return true;
        return (
          e.judul.toLowerCase().includes(q) ||
          e.kategori.toLowerCase().includes(q) ||
          e.guruNama.toLowerCase().includes(q) ||
          (e.fileName || '').toLowerCase().includes(q)
        );
      });
  }, [periodAllowedEntries, isAdmin, adminGuruFilter, periodGurus, kategoriFilter, search]);

  const openAdd = (presetCategory?: string) => {
    setEditingEntry(null);
    setJudul('');
    setKategori(presetCategory || allCategories[0]);
    setNewCategoryInput('');
    setStatus('Lengkap');
    setKeterangan('');
    setTargetGuruId(
      isAdmin ? activeChecklistGuru?.id || periodGurus[0]?.id || '' : currentGuru?.id || ''
    );
    setSelectedFile(null);
    setModalOpen(true);
  };

  const openEdit = (entry: AdminGuruEntry) => {
    if (!isAdmin && !isOwnedByUser(entry, currentGuru?.id, currentUser?.id)) {
      showToast('Anda tidak memiliki izin mengubah dokumen guru lain.', 'error');
      return;
    }
    setEditingEntry(entry);
    setJudul(entry.judul);
    setKategori(entry.kategori);
    setNewCategoryInput('');
    setStatus(entry.status);
    setKeterangan(entry.keterangan);
    setTargetGuruId(entry.guruId);
    setSelectedFile(null);
    setModalOpen(true);
  };

  const handleAddNewCategory = () => {
    const clean = newCategoryInput.trim();
    if (!clean) return;
    addCustomAdminCategory(clean);
    setKategori(clean);
    setNewCategoryInput('');
  };

  const isPdfFile = (file: File) => {
    const mime = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    return mime === 'application/pdf' || name.endsWith('.pdf');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!isPdfFile(file)) {
      showToast('Format berkas tidak valid. Upload Administrasi Guru wajib dalam bentuk PDF (.pdf).', 'error');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) {
      showToast('Judul dokumen administrasi wajib diisi.', 'error');
      return;
    }

    if (!editingEntry && !selectedFile) {
      showToast('Silakan pilih dan unggah berkas dalam format PDF (.pdf).', 'error');
      return;
    }

    if (selectedFile && !isPdfFile(selectedFile)) {
      showToast('Format berkas wajib berupa PDF (.pdf).', 'error');
      return;
    }

    const ownerGuru = isAdmin
      ? periodGurus.find((g) => g.id === targetGuruId) || state.gurus.find((g) => g.id === targetGuruId)
      : currentGuru;

    if (!ownerGuru) {
      showToast('Profil guru pemilik dokumen tidak ditemukan.', 'error');
      return;
    }

    try {
      setUploading(true);
      let fileId = editingEntry?.fileId;
      let fileName = editingEntry?.fileName;
      let fileType = editingEntry?.fileType;
      let fileSize = editingEntry?.fileSize;

      if (selectedFile) {
        if (fileId) {
          await deleteMediaFile(fileId).catch(() => {});
        }
        const saved = await saveMediaFile(selectedFile, selectedFile.name);
        fileId = saved.id;
        fileName = saved.name.toLowerCase().endsWith('.pdf') ? saved.name : `${saved.name}.pdf`;
        fileType = 'application/pdf';
        fileSize = saved.size;
      }

      const entry: AdminGuruEntry = {
        id: editingEntry?.id || `adm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        periodId: editingEntry?.periodId || selectedPeriod.id,
        guruId: ownerGuru.id,
        userId: ownerGuru.userId || currentUser?.id,
        guruNama: ownerGuru.nama,
        judul: judul.trim(),
        kategori,
        tahunAjaran: editingEntry?.tahunAjaran || selectedPeriod.tahunAjaran,
        semester: editingEntry?.semester || selectedPeriod.semester,
        keterangan: keterangan.trim(),
        fileId,
        fileName: fileName || `${judul.trim().replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`,
        fileType: fileType || 'application/pdf',
        fileSize,
        tanggalUpload: new Date().toISOString().slice(0, 10),
        status,
      };

      saveAdminGuruEntry(entry, !editingEntry);
      setModalOpen(false);
    } catch {
      showToast('Gagal menyimpan berkas PDF ke penyimpanan lokal.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = async (entry: AdminGuruEntry) => {
    if (!isAdmin && !isOwnedByUser(entry, currentGuru?.id, currentUser?.id)) {
      showToast('Akses ditolak untuk dokumen guru lain.', 'error');
      return;
    }

    const pdfName =
      entry.fileName && entry.fileName.toLowerCase().endsWith('.pdf')
        ? entry.fileName
        : `${entry.judul.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`;

    if (entry.fileId) {
      const stored = await getMediaFile(entry.fileId);
      if (stored && (stored.mimeType.includes('pdf') || stored.name.toLowerCase().endsWith('.pdf'))) {
        const url = URL.createObjectURL(stored.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    }

    const generatedBlob = generateAdminPdfBlob(
      {
        id: entry.id,
        judul: entry.judul,
        subJudul: `TA ${entry.tahunAjaran} (${entry.semester})`,
        kategori: entry.kategori,
        pemilik: entry.guruNama,
        tanggal: entry.tanggalUpload,
        status: entry.status,
        keterangan: entry.keterangan,
        fileName: pdfName,
      },
      state.schoolProfile
    );
    const url = URL.createObjectURL(generatedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = pdfName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteEntry = (entry: AdminGuruEntry) => {
    if (!isAdmin && !isOwnedByUser(entry, currentGuru?.id, currentUser?.id)) return;
    confirmDelete(
      'Hapus Dokumen Administrasi?',
      `Dokumen "${entry.judul}" akan dihapus permanen.`,
      async () => {
        if (entry.fileId) {
          await deleteMediaFile(entry.fileId).catch(() => {});
        }
        deleteAdminGuruEntry(entry.id);
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Administrasi Guru
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? `Pantau kelengkapan perangkat ajar dan unduh berkas seluruh guru · ${selectedPeriod.label}`
              : `Kelola perangkat ajar milik Anda sendiri (${currentGuru?.nama || currentUser?.namaLengkap}) · ${selectedPeriod.label}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            aria-label="Pilih periode administrasi"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium"
          >
            {state.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} {p.aktif ? '(Aktif)' : '(Arsip)'}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => openAdd()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Unggah Dokumen
          </button>
        </div>
      </div>

      {/* Progress Bar Kelengkapan Administrasi */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Progres Kelengkapan Administrasi {isAdmin ? 'Semua Guru' : 'Anda'} ({selectedPeriod.label})
        </h2>
        <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-2 xl:grid-cols-4' : 'max-w-lg'} gap-4`}>
          {guruProgressList.map(({guru, totalEntries, lengkapCount, belumCount, pct}) => (
            <div
              key={guru.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {guru.nama}
                </p>
                <span className="text-xs font-mono-num font-bold text-teal-700 dark:text-teal-400 shrink-0">
                  {pct}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-600 dark:bg-teal-500 transition-all"
                  style={{width: `${pct}%`}}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono-num">
                {lengkapCount} lengkap · {belumCount} kategori belum · {totalEntries} berkas
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* TABEL CHECKLIST KELENGKAPAN KATEGORI */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
              Checklist Kelengkapan Kategori Administrasi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activeChecklistGuru?.nama || 'Guru'} ·{' '}
              <span className="font-mono-num font-semibold text-teal-700 dark:text-teal-400">
                {checklistSummary.done}/{checklistSummary.total}
              </span>{' '}
              kategori terisi ({checklistSummary.remaining} belum diunggah)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <select
                value={activeChecklistGuru?.id || ''}
                onChange={(e) => setChecklistGuruId(e.target.value)}
                aria-label="Pilih guru untuk checklist"
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
              >
                {periodGurus.map((g) => (
                  <option key={g.id} value={g.id}>
                    Checklist: {g.nama}
                  </option>
                ))}
              </select>
            )}

            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              {(
                [
                  {key: 'ALL', label: `Semua (${allCategories.length})`},
                  {key: 'BELUM', label: `Belum Diunggah (${checklistSummary.remaining})`},
                  {key: 'SUDAH', label: `Sudah Diunggah (${checklistSummary.done})`},
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setChecklistFilter(tab.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    checklistFilter === tab.key
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-2.5 px-3.5 text-center w-12">No</th>
                <th className="py-2.5 px-3.5">Kategori Administrasi</th>
                <th className="py-2.5 px-3.5 w-44">Status</th>
                <th className="py-2.5 px-3.5">Dokumen Terunggah</th>
                <th className="py-2.5 px-3.5 w-36">Tanggal Upload</th>
                <th className="py-2.5 px-3.5 text-right w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {checklistRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-slate-500">
                    Tidak ada kategori yang sesuai dengan filter ini.
                  </td>
                </tr>
              ) : (
                checklistRows.map((row) => (
                  <tr key={row.kategori} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3.5 text-center font-mono-num text-xs text-slate-500">
                      {row.no}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      {row.kategori}
                    </td>
                    <td className="py-2.5 px-3.5 text-xs">
                      {row.stateStatus === 'SUDAH' ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          Sudah Diunggah
                        </span>
                      ) : row.stateStatus === 'SEBAGIAN' ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="w-4 h-4 shrink-0" />
                          Sebagian / Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          Belum Diunggah
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-xs text-slate-600 dark:text-slate-300">
                      {row.latest ? (
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {row.latest.judul}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {row.entries.length} dokumen · {row.latest.fileName || 'Tanpa lampiran'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">Belum ada dokumen</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-xs font-mono-num text-slate-500 whitespace-nowrap">
                      {row.latest ? formatTanggalId(row.latest.tanggalUpload) : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {row.latest && (
                          <button
                            type="button"
                            onClick={() => openPreview(row.latest!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-teal-600/40 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors cursor-pointer"
                            title="Lihat hasil upload dokumen ini"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openAdd(row.kategori)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            row.stateStatus === 'BELUM'
                              ? 'bg-teal-700 hover:bg-teal-800 text-white'
                              : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {row.stateStatus === 'BELUM' ? 'Unggah' : 'Tambah'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filter & Pencarian Daftar Dokumen */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul atau nama berkas..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
          />
        </div>

        <select
          value={kategoriFilter}
          onChange={(e) => setKategoriFilter(e.target.value)}
          aria-label="Filter kategori administrasi"
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
        >
          <option value="ALL">Semua Kategori ({allCategories.length})</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {isAdmin && (
          <select
            value={adminGuruFilter}
            onChange={(e) => setAdminGuruFilter(e.target.value)}
            aria-label="Filter guru"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
          >
            <option value="ALL">Semua Guru ({periodGurus.length})</option>
            {periodGurus.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nama}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Daftar Dokumen Administrasi */}
      {visibleEntries.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          title="Belum Ada Dokumen Administrasi pada Periode Ini"
          description={`Unggah perangkat ajar untuk periode ${selectedPeriod.label} melalui tombol di atas atau langsung dari tabel checklist.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleEntries.map((entry) => {
            const statusColor =
              entry.status === 'Lengkap'
                ? 'text-emerald-700 dark:text-emerald-400'
                : entry.status === 'Sebagian'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500';

            return (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-teal-700 dark:text-teal-400 truncate">
                      {entry.kategori}
                    </span>
                    <span className={`font-semibold inline-flex items-center gap-1 shrink-0 ${statusColor}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {entry.status}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                    {entry.judul}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {entry.guruNama} · TA {entry.tahunAjaran} ({entry.semester}) · Diunggah{' '}
                    {formatTanggalId(entry.tanggalUpload)}
                  </p>
                  {entry.keterangan && (
                    <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {entry.keterangan}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openPreview(entry)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      Lihat PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(entry)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-xs font-semibold text-teal-700 dark:text-teal-300 cursor-pointer max-w-[230px]"
                    >
                      <Download className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {entry.fileName || `${entry.judul}.pdf`}
                      </span>
                      {entry.fileSize ? (
                        <span className="text-[10px] text-slate-500 shrink-0">
                          ({formatFileSize(entry.fileSize)})
                        </span>
                      ) : null}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(entry)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label="Edit dokumen"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="Hapus dokumen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Administrasi Guru */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEntry ? 'Edit Dokumen Administrasi' : 'Unggah Dokumen Administrasi Guru'}
        subtitle={`Periode: ${selectedPeriod.label}`}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold mb-1">Guru Pemilik Dokumen</label>
              <select
                value={targetGuruId}
                onChange={(e) => setTargetGuruId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {periodGurus.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">Judul Dokumen *</label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Modul Ajar IPA Bab 2 Kelas 8"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Kategori Administrasi</label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="Atau ketik nama kategori baru..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <button
                type="button"
                onClick={handleAddNewCategory}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-teal-700 dark:text-teal-300"
              >
                + Buat Kategori
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Status Kelengkapan</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusKelengkapan)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="Lengkap">Lengkap</option>
              <option value="Sebagian">Sebagian</option>
              <option value="Belum">Belum</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Unggah File Dokumen (Wajib Format PDF) {!editingEntry && '*'}
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-600 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
              <Upload className="w-4 h-4 text-teal-700" />
              {selectedFile
                ? `Dipilih: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                : editingEntry?.fileName
                  ? `PDF saat ini: ${editingEntry.fileName} (klik untuk ganti PDF)`
                  : 'Pilih berkas PDF (.pdf) dari perangkat Anda'}
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Hanya mendukung format berkas <strong>.pdf</strong> agar dokumen tampil seragam saat dibuka.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan</label>
            <textarea
              rows={3}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold disabled:opacity-50"
            >
              {uploading ? 'Menyimpan...' : 'Simpan Dokumen'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Lihat / Buka Hasil Upload */}
      <FilePreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
};
