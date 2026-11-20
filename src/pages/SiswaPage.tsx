// Halaman 5: Data Siswa Kelas 7, 8, 9 per Periode Pendidikan
// Mendukung Upload Foto 3x4 & Kartu Pelajar (Khusus Admin), Akses Lihat & Unduh (Guru), serta Cetak 1 Kertas PDF per Siswa

import React, {useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileDown,
  FileText,
  GraduationCap,
  ImagePlus,
  Info,
  Plus,
  Search,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {
  compressImageToDataUrl,
  cropImageTo3x4DataUrl,
  deleteMediaFile,
  fileToDataUrl,
  getMediaFile,
  renderPdfFirstPageToDataUrl,
  saveMediaFile,
} from '../services/mediaDb';
import {KelasLevel, Siswa} from '../types/school';
import {
  exportClassStudentIdentitiesPdf,
  exportSingleStudentIdentityPdf,
  exportSiswaPdf,
} from '../utils/exportUtils';
import {
  evaluateStudentPromotionStatus,
  formatTanggalId,
  StudentPromotionResult,
} from '../utils/gradeUtils';
import {EmptyState, Modal} from '../components/ui/AvatarAndModal';

const emptySiswa = (kelas: KelasLevel, periodId: string): Siswa => ({
  id: `sis_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
  periodId,
  nis: '',
  nisn: '',
  nama: '',
  kelas,
  jenisKelamin: 'L',
  tempatLahir: 'Karangasem',
  tanggalLahir: '2013-01-01',
  alamat: 'Br. Dinas Kedungdung, Desa Besakih, Kec. Rendang, Karangasem',
  namaOrtu: '',
  noHpOrtu: '',
});

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const SiswaPage: React.FC = () => {
  const {
    state,
    currentUser,
    selectedPeriod,
    periodSiswas,
    saveSiswa,
    deleteSiswa,
    confirmDelete,
    showToast,
    addLog,
  } = useSchool();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [selectedKelas, setSelectedKelas] = useState<KelasLevel>('7');
  const [search, setSearch] = useState('');
  const [jkFilter, setJkFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [downloading, setDownloading] = useState(false);
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Siswa>(emptySiswa('7', selectedPeriod.id));
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);

  const [previewSiswa, setPreviewSiswa] = useState<Siswa | null>(null);
  const [resolvedCardPreview, setResolvedCardPreview] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const kelasCounts = useMemo(() => {
    const map: Record<KelasLevel, number> = {'7': 0, '8': 0, '9': 0};
    periodSiswas.forEach((s) => {
      map[s.kelas] = (map[s.kelas] || 0) + 1;
    });
    return map;
  }, [periodSiswas]);

  const promotionByStudent = useMemo(() => {
    const map = new Map<string, StudentPromotionResult>();
    periodSiswas.forEach((s) => {
      map.set(
        s.id,
        evaluateStudentPromotionStatus(
          s,
          selectedPeriod,
          state.subjects,
          state.nilaiRecords,
          state.gradeSettings
        )
      );
    });
    return map;
  }, [periodSiswas, selectedPeriod, state.subjects, state.nilaiRecords, state.gradeSettings]);

  const classPromotionSummary = useMemo(() => {
    const classStudents = periodSiswas.filter((s) => s.kelas === selectedKelas);
    let qualified = 0;
    let belowKkm = 0;
    let incomplete = 0;
    classStudents.forEach((s) => {
      const st = promotionByStudent.get(s.id);
      if (!st) return;
      if (st.code === 'LULUS' || st.code === 'NAIK_KELAS') qualified++;
      else if (st.code === 'BELUM_MEMENUHI') belowKkm++;
      else if (st.code === 'BELUM_LENGKAP') incomplete++;
    });
    return {total: classStudents.length, qualified, belowKkm, incomplete};
  }, [periodSiswas, selectedKelas, promotionByStudent]);

  const filteredSiswas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodSiswas
      .filter((s) => s.kelas === selectedKelas)
      .filter((s) => jkFilter === 'ALL' || s.jenisKelamin === jkFilter)
      .filter((s) => {
        if (!q) return true;
        return (
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q) ||
          s.namaOrtu.toLowerCase().includes(q)
        );
      });
  }, [periodSiswas, selectedKelas, jkFilter, search]);

  // Muat pratinjau kartu pelajar dari cache atau IndexedDB saat modal detail dibuka
  useEffect(() => {
    let active = true;
    if (!previewSiswa) {
      setResolvedCardPreview('');
      return;
    }
    if (previewSiswa.kartuPelajarPreviewUrl) {
      setResolvedCardPreview(previewSiswa.kartuPelajarPreviewUrl);
      return;
    }
    if (!previewSiswa.kartuPelajarFileId) {
      setResolvedCardPreview('');
      return;
    }
    setLoadingPreview(true);
    (async () => {
      try {
        const stored = await getMediaFile(previewSiswa.kartuPelajarFileId || '');
        if (!active || !stored) return;
        const isPdf =
          stored.mimeType === 'application/pdf' || stored.name.toLowerCase().endsWith('.pdf');
        const url = isPdf
          ? await renderPdfFirstPageToDataUrl(stored.blob)
          : await fileToDataUrl(stored.blob);
        if (active) setResolvedCardPreview(url);
      } catch {
        if (active) setResolvedCardPreview('');
      } finally {
        if (active) setLoadingPreview(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [previewSiswa]);

  const openAdd = () => {
    if (!isAdmin) return;
    setIsNew(true);
    setForm(emptySiswa(selectedKelas, selectedPeriod.id));
    setModalOpen(true);
  };

  const openEdit = (s: Siswa) => {
    if (!isAdmin) return;
    setIsNew(false);
    setForm({...s});
    setModalOpen(true);
  };

  const handleUploadFoto3x4 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Pas foto siswa harus berupa gambar (JPG / PNG).', 'error');
      e.target.value = '';
      return;
    }
    try {
      setUploadingPhoto(true);
      const cropped = await cropImageTo3x4DataUrl(file, 300, 400, 0.88);
      setForm((prev) => ({...prev, foto3x4: cropped}));
      showToast('Foto siswa berhasil diformat ke ukuran 3 x 4.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memproses foto 3x4.', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleUploadKartuPelajar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage =
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'image/webp' ||
      /\.(jpe?g|png|webp)$/.test(lowerName);

    if (!isPdf && !isImage) {
      showToast('Format Kartu Pelajar harus PDF, JPG, atau PNG.', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran file Kartu Pelajar maksimal 10 MB.', 'error');
      e.target.value = '';
      return;
    }

    try {
      setUploadingCard(true);
      if (form.kartuPelajarFileId) {
        await deleteMediaFile(form.kartuPelajarFileId).catch(() => {});
      }
      const saved = await saveMediaFile(file, file.name);
      let previewUrl = '';
      if (isPdf) {
        previewUrl = await renderPdfFirstPageToDataUrl(file, 960);
      } else {
        previewUrl = await compressImageToDataUrl(file, 960, 0.88);
      }
      setForm((prev) => ({
        ...prev,
        kartuPelajarFileId: saved.id,
        kartuPelajarFileName: file.name,
        kartuPelajarFileType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        kartuPelajarPreviewUrl: previewUrl,
      }));
      showToast(`Kartu Pelajar "${file.name}" berhasil diunggah.`, 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal memproses berkas Kartu Pelajar.',
        'error'
      );
    } finally {
      setUploadingCard(false);
      e.target.value = '';
    }
  };

  const handleRemoveKartuPelajar = async () => {
    if (form.kartuPelajarFileId) {
      await deleteMediaFile(form.kartuPelajarFileId).catch(() => {});
    }
    setForm((prev) => ({
      ...prev,
      kartuPelajarFileId: undefined,
      kartuPelajarFileName: undefined,
      kartuPelajarFileType: undefined,
      kartuPelajarPreviewUrl: undefined,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!form.nama.trim() || !form.nis.trim() || !form.nisn.trim()) {
      showToast('NIS, NISN, dan Nama Siswa wajib diisi.', 'error');
      return;
    }
    saveSiswa({...form, periodId: form.periodId || selectedPeriod.id}, isNew);
    setModalOpen(false);
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await exportSiswaPdf(selectedKelas, filteredSiswas, state.schoolProfile, selectedPeriod.label);
      addLog(
        'EXPORT',
        'Daftar Siswa PDF',
        `Mengunduh PDF Daftar Siswa Kelas ${selectedKelas} (${selectedPeriod.label}).`
      );
      showToast(`PDF Daftar Siswa Kelas ${selectedKelas} berhasil diunduh.`, 'success');
    } catch {
      showToast('Gagal membuat file PDF siswa.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadSingleIdentity = async (s: Siswa) => {
    try {
      setDownloadingBatchId(s.id);
      await exportSingleStudentIdentityPdf(
        s,
        selectedPeriod.label,
        state.schoolProfile,
        state.kepalaSekolah
      );
      addLog(
        'EXPORT',
        'Identitas 1 Kertas Siswa',
        `Mengunduh Identitas Lengkap 1 Kertas PDF untuk ${s.nama} (Kelas ${s.kelas}).`
      );
      showToast(`Identitas 1 Kertas "${s.nama}" berhasil diunduh.`, 'success');
    } catch {
      showToast('Gagal membuat file PDF 1 kertas siswa.', 'error');
    } finally {
      setDownloadingBatchId(null);
    }
  };

  const handleDownloadClassIdentities = async () => {
    if (filteredSiswas.length === 0) return;
    try {
      setDownloading(true);
      await exportClassStudentIdentitiesPdf(
        selectedKelas,
        filteredSiswas,
        selectedPeriod.label,
        state.schoolProfile,
        state.kepalaSekolah
      );
      addLog(
        'EXPORT',
        'Identitas 1 Kertas Per Kelas',
        `Mengunduh Identitas 1 Kertas/Siswa Kelas ${selectedKelas} (${filteredSiswas.length} siswa).`
      );
      showToast(
        `Identitas lengkap (${filteredSiswas.length} siswa, 1 kertas per siswa) berhasil diunduh.`,
        'success'
      );
    } catch {
      showToast('Gagal membuat berkas PDF identitas lengkap kelas.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadRawKartuPelajar = async (s: Siswa) => {
    if (!s.kartuPelajarFileId && !s.kartuPelajarPreviewUrl) {
      showToast('Kartu Pelajar belum diunggah untuk siswa ini.', 'warning');
      return;
    }
    try {
      if (s.kartuPelajarFileId) {
        const stored = await getMediaFile(s.kartuPelajarFileId);
        if (stored) {
          triggerBlobDownload(stored.blob, s.kartuPelajarFileName || stored.name);
          addLog('EXPORT', 'Kartu Pelajar Siswa', `Mengunduh Kartu Pelajar ${s.nama}.`);
          showToast(`Kartu Pelajar "${s.nama}" berhasil diunduh.`, 'success');
          return;
        }
      }
      if (s.kartuPelajarPreviewUrl) {
        const res = await fetch(s.kartuPelajarPreviewUrl);
        const blob = await res.blob();
        triggerBlobDownload(
          blob,
          s.kartuPelajarFileName || `Kartu_Pelajar_${s.nama.replace(/\s+/g, '_')}.jpg`
        );
        showToast(`Kartu Pelajar "${s.nama}" berhasil diunduh.`, 'success');
      }
    } catch {
      showToast('Gagal mengunduh berkas Kartu Pelajar.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Data Siswa &amp; Kartu Pelajar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar peserta didik periode <strong>{selectedPeriod.label}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={downloading || filteredSiswas.length === 0}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-600/50 hover:text-teal-700 dark:hover:text-teal-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-500" />
            Daftar Kelas {selectedKelas} (PDF)
          </button>

          <button
            type="button"
            disabled={downloading || filteredSiswas.length === 0}
            onClick={handleDownloadClassIdentities}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-teal-600/40 bg-teal-50 dark:bg-teal-950/40 text-xs sm:text-sm font-semibold text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 disabled:opacity-50 transition-colors cursor-pointer"
            title="Unduh identitas lengkap setiap siswa (Profil + Foto 3x4 + Kartu Pelajar) masing-masing 1 kertas"
          >
            <FileDown className="w-4 h-4" />
            {downloading ? 'Menyiapkan PDF...' : `Identitas 1 Kertas/Siswa (PDF)`}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa Kelas {selectedKelas}
            </button>
          )}
        </div>
      </div>

      {/* Info Mode Hanya Lihat & Unduh untuk Guru */}
      {!isAdmin && (
        <div className="rounded-2xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/70 dark:bg-teal-950/30 p-4 flex items-start gap-3 text-xs sm:text-sm text-teal-950 dark:text-teal-100">
          <Info className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-display font-bold">Mode Akses Guru (Lihat &amp; Unduh Langsung)</p>
            <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
              Pengisian, pengeditan data siswa, unggah foto 3x4, dan unggah Kartu Pelajar hanya dilakukan oleh{' '}
              <strong>Admin</strong>. Anda dapat melihat seluruh data siswa serta langsung mengunduh{' '}
              <strong>Kartu Pelajar</strong> maupun <strong>Identitas Lengkap Siswa (1 Kertas PDF)</strong> kapan saja dibutuhkan.
            </p>
          </div>
        </div>
      )}

      {/* Tab Kategori Kelas 7 / 8 / 9 & Filter */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          {(['7', '8', '9'] as KelasLevel[]).map((k) => {
            const active = selectedKelas === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedKelas(k)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Kelas {k} ({kelasCounts[k]})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, NISN..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30"
            />
          </div>

          <select
            value={jkFilter}
            onChange={(e) => setJkFilter(e.target.value as 'ALL' | 'L' | 'P')}
            aria-label="Filter jenis kelamin"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
          >
            <option value="ALL">Semua Jenis Kelamin</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>
        </div>
      </div>

      {/* Banner Status Kenaikan Kelas / Kelulusan Otomatis (Khusus Semester Genap) */}
      {selectedPeriod.semester === 'Genap' ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-emerald-950 dark:text-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-bold">
                Evaluasi Otomatis Akhir Tahun Pelajaran (Semester Genap)
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                Siswa Kelas {selectedKelas} otomatis dinyatakan{' '}
                <strong>{selectedKelas === '9' ? 'LULUS' : `NAIK KE KELAS ${Number(selectedKelas) + 1}`}</strong>{' '}
                apabila seluruh {state.subjects.length} mata pelajaran telah memenuhi KKM.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold shrink-0">
            <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-mono-num">
              {selectedKelas === '9' ? 'Lulus' : 'Naik Kelas'}: {classPromotionSummary.qualified}
            </span>
            {classPromotionSummary.belowKkm > 0 && (
              <span className="px-3 py-1 rounded-xl bg-red-600 text-white font-mono-num">
                Belum Memenuhi: {classPromotionSummary.belowKkm}
              </span>
            )}
            {classPromotionSummary.incomplete > 0 && (
              <span className="px-3 py-1 rounded-xl bg-amber-500 text-white font-mono-num">
                Belum Lengkap: {classPromotionSummary.incomplete}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <Clock className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
          <p>
            Periode aktif yang sedang dilihat adalah <strong>Semester Ganjil</strong>. Status{' '}
            <strong>Naik Kelas / Lulus</strong> tidak ditetapkan di Semester Ganjil dan akan otomatis aktif pada{' '}
            <strong>Semester Genap</strong> (akhir tahun pelajaran).
          </p>
        </div>
      )}

      {/* Tabel Data Siswa */}
      {filteredSiswas.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-6 h-6" />}
          title={`Belum Ada Data Siswa di Kelas ${selectedKelas}`}
          description={
            isAdmin
              ? `Belum ada siswa pada periode ${selectedPeriod.label}. Tambahkan siswa baru menggunakan tombol di atas.`
              : `Belum ada data siswa terdaftar pada periode ${selectedPeriod.label}.`
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-3 text-center w-10">No</th>
                  <th className="py-3 px-3 text-center">Foto 3x4</th>
                  <th className="py-3 px-3">NIS / NISN</th>
                  <th className="py-3 px-3">Nama Siswa</th>
                  <th className="py-3 px-3 text-center">JK</th>
                  <th className="py-3 px-3">Tempat, Tanggal Lahir</th>
                  <th className="py-3 px-3">Orang Tua / HP</th>
                  <th className="py-3 px-3">Kartu Pelajar</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Unduh &amp; Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSiswas.map((s, idx) => {
                  const promo = promotionByStudent.get(s.id);
                  const hasCard = Boolean(s.kartuPelajarFileId || s.kartuPelajarPreviewUrl);
                  const isRowDownloading = downloadingBatchId === s.id;
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-center font-mono-num text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="w-9 aspect-[3/4] mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          {s.foto3x4 ? (
                            <img
                              src={s.foto3x4}
                              alt={`Foto 3x4 ${s.nama}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono-num text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="font-semibold">{s.nis}</div>
                        <div className="text-slate-500 dark:text-slate-400">{s.nisn}</div>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {s.nama}
                        </p>
                        <p
                          className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate"
                          title={s.alamat}
                        >
                          {s.alamat}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center font-medium">{s.jenisKelamin}</td>
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {s.tempatLahir}, {formatTanggalId(s.tanggalLahir)}
                      </td>
                      <td className="py-3 px-3 text-xs whitespace-nowrap">
                        <p className="text-slate-700 dark:text-slate-200 font-medium">{s.namaOrtu || '-'}</p>
                        <p className="font-mono-num text-slate-500 dark:text-slate-400">{s.noHpOrtu || '-'}</p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {hasCard ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewSiswa(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/60 cursor-pointer"
                              title={`Lihat Kartu Pelajar (${s.kartuPelajarFileName || 'Berkas'})`}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Lihat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadRawKartuPelajar(s)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Unduh file asli Kartu Pelajar"
                              aria-label={`Unduh Kartu Pelajar ${s.nama}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Belum diunggah</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap" title={promo?.detail}>
                        {promo?.code === 'LULUS' || promo?.code === 'NAIK_KELAS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {promo.label}
                          </span>
                        ) : promo?.code === 'BELUM_MEMENUHI' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {promo.shortLabel}
                          </span>
                        ) : promo?.code === 'BELUM_LENGKAP' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-medium">
                            {promo.shortLabel}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                            {promo?.shortLabel || 'Proses (Ganjil)'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewSiswa(s)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Pratinjau Identitas, Foto 3x4 & Kartu Pelajar"
                            aria-label={`Lihat identitas ${s.nama}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={isRowDownloading}
                            onClick={() => handleDownloadSingleIdentity(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 disabled:opacity-50 cursor-pointer"
                            title="Download 1 Kertas PDF (Profil + Foto 3x4 + Kartu Pelajar)"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>{isRowDownloading ? '...' : '1 Kertas PDF'}</span>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(s)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Edit siswa, Foto 3x4 & Kartu Pelajar"
                                aria-label={`Edit ${s.nama}`}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  confirmDelete(
                                    'Hapus Data Siswa?',
                                    `Data siswa "${s.nama}" (NIS ${s.nis}) pada periode ${selectedPeriod.label} akan dihapus.`,
                                    () => deleteSiswa(s.id)
                                  )
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                title="Hapus siswa"
                                aria-label={`Hapus ${s.nama}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Identitas Siswa + Foto 3x4 + Kartu Pelajar (Admin & Guru) */}
      <Modal
        open={Boolean(previewSiswa)}
        onClose={() => setPreviewSiswa(null)}
        title={`Identitas Lengkap Siswa — ${previewSiswa?.nama || ''}`}
        subtitle={
          previewSiswa
            ? `Kelas ${previewSiswa.kelas} · NIS ${previewSiswa.nis} · NISN ${previewSiswa.nisn}`
            : ''
        }
        maxWidthClass="max-w-2xl"
      >
        {previewSiswa && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Foto 3x4 */}
              <div className="shrink-0 mx-auto sm:mx-0">
                <div className="w-28 aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {previewSiswa.foto3x4 ? (
                    <img
                      src={previewSiswa.foto3x4}
                      alt={`Foto 3x4 ${previewSiswa.nama}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center px-2">
                      <User className="w-7 h-7 text-slate-400 mx-auto" />
                      <span className="block text-[11px] text-slate-400 mt-1">Foto 3x4</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-1">
                  Pas Foto 3 x 4
                </p>
              </div>

              {/* Profil Detail */}
              <div className="flex-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Nama Lengkap</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {previewSiswa.nama}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Jenis Kelamin</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {previewSiswa.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">NIS / NISN</span>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                      {previewSiswa.nis} / {previewSiswa.nisn}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Tempat, Tgl Lahir</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {previewSiswa.tempatLahir}, {formatTanggalId(previewSiswa.tanggalLahir)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">Orang Tua / Wali</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {previewSiswa.namaOrtu || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">No. HP Orang Tua</span>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                      {previewSiswa.noHpOrtu || '-'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Alamat</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {previewSiswa.alamat || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pratinjau Kartu Pelajar */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-display font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  Kartu Pelajar {previewSiswa.kartuPelajarFileName ? `(${previewSiswa.kartuPelajarFileName})` : ''}
                </p>
                {(previewSiswa.kartuPelajarFileId || previewSiswa.kartuPelajarPreviewUrl) && (
                  <button
                    type="button"
                    onClick={() => handleDownloadRawKartuPelajar(previewSiswa)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh File Asli
                  </button>
                )}
              </div>

              {loadingPreview ? (
                <p className="text-xs text-slate-500 py-8 text-center">Memuat pratinjau Kartu Pelajar...</p>
              ) : resolvedCardPreview ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center p-2">
                  <img
                    src={resolvedCardPreview}
                    alt={`Kartu Pelajar ${previewSiswa.nama}`}
                    className="max-h-72 w-auto object-contain rounded-lg"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                  Kartu Pelajar belum diunggah oleh Admin.
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPreviewSiswa(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSingleIdentity(previewSiswa)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                Download Identitas Lengkap (1 Kertas PDF)
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Tambah / Edit Siswa (Khusus Admin) */}
      <Modal
        open={modalOpen && isAdmin}
        onClose={() => setModalOpen(false)}
        title={isNew ? `Tambah Siswa Baru (Kelas ${form.kelas})` : `Edit Data Siswa — ${form.nama}`}
        subtitle={`Periode: ${selectedPeriod.label}`}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Blok Upload Foto 3x4 & Kartu Pelajar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3.5">
            {/* Foto Siswa Format 3x4 */}
            <div className="flex items-start gap-3">
              <div className="w-20 aspect-[3/4] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                {form.foto3x4 ? (
                  <img src={form.foto3x4} alt="Preview Foto 3x4" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center px-1">
                    <ImagePlus className="w-5 h-5 text-slate-400 mx-auto" />
                    <span className="block text-[10px] text-slate-400 mt-0.5">3 x 4</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Foto Siswa (Format 3 x 4)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Otomatis dipotong rapi rasio 3:4 untuk kartu &amp; dokumen 1 kertas.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Upload className="w-3.5 h-3.5 text-teal-700" />
                    {uploadingPhoto ? 'Memproses...' : form.foto3x4 ? 'Ganti Foto' : 'Unggah Foto 3x4'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadFoto3x4}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
                  {form.foto3x4 && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({...prev, foto3x4: undefined}))}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Kartu Pelajar (PDF / JPG / PNG) */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                Kartu Pelajar (PDF / JPG / PNG)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Akan digabung otomatis menjadi satu kertas saat diunduh Admin &amp; Guru.
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
                  {uploadingCard
                    ? 'Memproses...'
                    : form.kartuPelajarFileName
                      ? 'Ganti Kartu'
                      : 'Unggah Kartu'}
                  <input
                    type="file"
                    accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                    onChange={handleUploadKartuPelajar}
                    disabled={uploadingCard}
                    className="hidden"
                  />
                </label>
                {form.kartuPelajarFileName && (
                  <button
                    type="button"
                    onClick={handleRemoveKartuPelajar}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
              {form.kartuPelajarFileName && (
                <p className="text-[11px] font-medium text-teal-700 dark:text-teal-400 flex items-center gap-1 truncate pt-0.5">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{form.kartuPelajarFileName}</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">NIS *</label>
              <input
                type="text"
                required
                value={form.nis}
                onChange={(e) => setForm({...form, nis: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">NISN *</label>
              <input
                type="text"
                required
                value={form.nisn}
                onChange={(e) => setForm({...form, nisn: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Kelas</label>
              <select
                value={form.kelas}
                onChange={(e) => setForm({...form, kelas: e.target.value as KelasLevel})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={form.nama}
                onChange={(e) => setForm({...form, nama: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jenis Kelamin</label>
              <select
                value={form.jenisKelamin}
                onChange={(e) => setForm({...form, jenisKelamin: e.target.value as 'L' | 'P'})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Tempat Lahir</label>
              <input
                type="text"
                value={form.tempatLahir}
                onChange={(e) => setForm({...form, tempatLahir: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={form.tanggalLahir}
                onChange={(e) => setForm({...form, tanggalLahir: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Alamat Lengkap</label>
            <input
              type="text"
              value={form.alamat}
              onChange={(e) => setForm({...form, alamat: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Nama Orang Tua / Wali</label>
              <input
                type="text"
                value={form.namaOrtu}
                onChange={(e) => setForm({...form, namaOrtu: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">No. HP Orang Tua / Wali</label>
              <input
                type="text"
                value={form.noHpOrtu}
                onChange={(e) => setForm({...form, noHpOrtu: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploadingPhoto || uploadingCard}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
            >
              Simpan Data Siswa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
