// Halaman 10: Panel Admin - Periode Pendidikan, Rekap Historis Nilai, Pusat Arsip ZIP, Akun, Log, Backup/Restore

import React, {useMemo, useState} from 'react';
import {
  Archive,
  ArrowRight,
  Award,
  BookMarked,
  BookOpenCheck,
  Building2,
  CalendarRange,
  CheckCircle2,
  DatabaseBackup,
  Download,
  Edit3,
  FileSpreadsheet,
  History,
  KeyRound,
  LayoutTemplate,
  Plus,
  RotateCcw,
  Shield,
  Trash2,
  Upload,
  UserCheck,
  Users,
  UserX,
  Wallet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {useSchool} from '../context/SchoolContext';
import {localStorageAdapter} from '../services/storageAdapter';
import {
  KATEGORI_ADMIN_GURU_DEFAULT,
  KelasLevel,
  SemesterType,
  UserAccount,
  UserRole,
} from '../types/school';
import {
  ArchiveExportOptions,
  buildAdminRekapNilaiPdfDoc,
  buildAdminRekapNilaiWorkbook,
  exportClassRaporExcel,
  exportClassRaporPdf,
  exportPusatArsipZip,
  exportStudentRaporPdf,
  RekapNilaiRow,
} from '../utils/exportUtils';
import {
  evaluateStudentPromotionStatus,
  formatDateTimeId,
  getNextEducationPeriodInfo,
  getPredikatNilai,
  hitungRataDaftar,
  hitungRataRata,
} from '../utils/gradeUtils';
import {LoginConfigEditor} from '../components/LoginConfigEditor';
import {Modal} from '../components/ui/AvatarAndModal';

type AdminTab =
  | 'periode'
  | 'mapel'
  | 'rekap-nilai'
  | 'rapor'
  | 'tampilan-login'
  | 'pusat-arsip'
  | 'akun'
  | 'log'
  | 'backup';

export const PanelAdminPage: React.FC = () => {
  const {
    state,
    currentUser,
    activePeriod,
    selectedPeriod,
    selectedPeriodId,
    setSelectedPeriodId,
    periodGurus,
    createPeriod,
    setActivePeriod,
    deletePeriod,
    addSubject,
    renameSubject,
    deleteSubject,
    updateSubjectTeachers,
    saveAccount,
    toggleSarprasAccess,
    toggleKeuanganAccess,
    deleteAccount,
    restoreFromBackup,
    resetAllToSeed,
    confirmDelete,
    showToast,
    addLog,
  } = useSchool();

  const [activeTab, setActiveTab] = useState<AdminTab>('periode');

  // === TAB: MATA PELAJARAN & GURU PENGAMPU ===
  const [addMapelOpen, setAddMapelOpen] = useState(false);
  const [newMapelName, setNewMapelName] = useState('');
  const [newMapelKkm, setNewMapelKkm] = useState(75);
  const [newMapelGuruIds, setNewMapelGuruIds] = useState<string[]>([]);
  const [editMapelTarget, setEditMapelTarget] = useState<{
    oldName: string;
    name: string;
    kkm: number;
  } | null>(null);
  const [assignGuruTarget, setAssignGuruTarget] = useState<{
    mapel: string;
    guruIds: string[];
  } | null>(null);

  const handleOpenAddMapel = () => {
    setNewMapelName('');
    setNewMapelKkm(75);
    setNewMapelGuruIds([]);
    setAddMapelOpen(true);
  };

  const handleCreateMapel = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addSubject(newMapelName, newMapelKkm, newMapelGuruIds);
    if (!res.ok) {
      showToast(res.message || 'Gagal menambah mata pelajaran.', 'error');
      return;
    }
    setAddMapelOpen(false);
  };

  const handleUpdateMapel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMapelTarget) return;
    const res = renameSubject(editMapelTarget.oldName, editMapelTarget.name, editMapelTarget.kkm);
    if (!res.ok) {
      showToast(res.message || 'Gagal memperbarui mata pelajaran.', 'error');
      return;
    }
    setEditMapelTarget(null);
  };

  const handleSaveAssignGuru = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignGuruTarget) return;
    updateSubjectTeachers(assignGuruTarget.mapel, assignGuruTarget.guruIds);
    setAssignGuruTarget(null);
  };

  // === TAB 0: PERIODE PENDIDIKAN ===
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [newTahunAjaran, setNewTahunAjaran] = useState('2027/2028');
  const [newSemester, setNewSemester] = useState<SemesterType>('Ganjil');
  const [setAsActive, setSetAsActive] = useState(true);
  const [copyFromPeriodId, setCopyFromPeriodId] = useState<string>(state.activePeriodId);
  const [promoteClasses, setPromoteClasses] = useState(true);

  const nextPeriodInfo = useMemo(
    () => getNextEducationPeriodInfo(activePeriod),
    [activePeriod]
  );

  const existingNextPeriod = useMemo(
    () =>
      state.periods.find(
        (p) =>
          p.tahunAjaran === nextPeriodInfo.tahunAjaran &&
          p.semester === nextPeriodInfo.semester
      ),
    [state.periods, nextPeriodInfo]
  );

  const rolloverPreview = useMemo(() => {
    if (activePeriod.semester !== 'Genap') return null;
    const siswasInActive = state.siswas.filter((s) => s.periodId === activePeriod.id);
    let naikKelas = 0;
    let lulus = 0;
    let tetap = 0;
    siswasInActive.forEach((s) => {
      const res = evaluateStudentPromotionStatus(
        s,
        activePeriod,
        state.subjects,
        state.nilaiRecords,
        state.gradeSettings
      );
      if (res.code === 'LULUS') lulus += 1;
      else if (res.code === 'NAIK_KELAS') naikKelas += 1;
      else tetap += 1;
    });
    return {total: siswasInActive.length, naikKelas, lulus, tetap};
  }, [activePeriod, state.siswas, state.subjects, state.nilaiRecords, state.gradeSettings]);

  const handleAdvanceSemester = () => {
    if (existingNextPeriod) {
      setActivePeriod(existingNextPeriod.id);
      setSelectedPeriodId(existingNextPeriod.id);
      return;
    }
    setNewTahunAjaran(nextPeriodInfo.tahunAjaran);
    setNewSemester(nextPeriodInfo.semester);
    setCopyFromPeriodId(activePeriod.id);
    setPromoteClasses(nextPeriodInfo.isYearRollover);
    setSetAsActive(true);
    setPeriodModalOpen(true);
  };

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createPeriod({
      tahunAjaran: newTahunAjaran,
      semester: newSemester,
      setAsActive,
      copyFromPeriodId: copyFromPeriodId || undefined,
      promoteClasses,
    });
    if (!res.ok) {
      showToast(res.message || 'Gagal membuat periode pendidikan.', 'error');
      return;
    }
    setPeriodModalOpen(false);
  };

  // === TAB 1: REKAP SEMUA NILAI (HISTORIS BERDASARKAN PERIODE, KELAS, MAPEL, & GURU PENGAMPU) ===
  const [rekapPeriodId, setRekapPeriodId] = useState<string>(selectedPeriodId);
  const [kelasFilter, setKelasFilter] = useState<'ALL' | KelasLevel>('ALL');
  const [mapelFilter, setMapelFilter] = useState<string>('ALL');
  const [pengampuFilter, setPengampuFilter] = useState<string>('ALL'); // userId guru pengampu

  const rekapPeriodObj = useMemo(
    () => state.periods.find((p) => p.id === rekapPeriodId) || state.periods[0],
    [state.periods, rekapPeriodId]
  );

  const rekapPeriodGurus = useMemo(
    () => state.gurus.filter((g) => g.periodId === rekapPeriodObj.id),
    [state.gurus, rekapPeriodObj.id]
  );

  const selectedPengampuGuru = useMemo(() => {
    if (pengampuFilter === 'ALL') return undefined;
    return (
      rekapPeriodGurus.find((g) => g.userId === pengampuFilter || g.id === pengampuFilter) ||
      state.gurus.find((g) => g.userId === pengampuFilter || g.id === pengampuFilter)
    );
  }, [pengampuFilter, rekapPeriodGurus, state.gurus]);

  const activeMapels = useMemo(() => {
    let base = mapelFilter === 'ALL' ? state.subjects : [mapelFilter];
    if (selectedPengampuGuru) {
      base = base.filter((m) => selectedPengampuGuru.mapelDiampu.includes(m));
    }
    return base;
  }, [mapelFilter, selectedPengampuGuru, state.subjects]);

  const rekapRows: RekapNilaiRow[] = useMemo(() => {
    const targetSiswas = state.siswas
      .filter((s) => s.periodId === rekapPeriodObj.id)
      .filter((s) => kelasFilter === 'ALL' || s.kelas === kelasFilter);

    const periodNilai = state.nilaiRecords.filter((n) => n.periodId === rekapPeriodObj.id);

    const rows = targetSiswas.map((s) => {
      const nilaiPerMapel: Record<string, number | null> = {};
      const validScores: number[] = [];

      activeMapels.forEach((m) => {
        const rec = periodNilai.find((n) => n.siswaId === s.id && n.mapel === m);
        const avg = rec ? hitungRataRata(rec, state.gradeSettings) : null;
        nilaiPerMapel[m] = avg;
        if (avg !== null) validScores.push(avg);
      });

      const rataTotal =
        validScores.length > 0
          ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
          : null;

      return {
        ranking: 0,
        siswa: s,
        nilaiPerMapel,
        rataTotal,
      };
    });

    rows.sort((a, b) => {
      if (a.rataTotal === null && b.rataTotal === null) return a.siswa.nama.localeCompare(b.siswa.nama);
      if (a.rataTotal === null) return 1;
      if (b.rataTotal === null) return -1;
      return b.rataTotal - a.rataTotal;
    });

    return rows.map((r, i) => ({...r, ranking: i + 1}));
  }, [state.siswas, state.nilaiRecords, state.gradeSettings, rekapPeriodObj.id, kelasFilter, activeMapels]);

  const handleExportRekapPdf = async () => {
    const doc = await buildAdminRekapNilaiPdfDoc(
      rekapRows,
      activeMapels,
      kelasFilter,
      rekapPeriodObj.label,
      state.schoolProfile,
      selectedPengampuGuru?.nama
    );
    doc.save(`Rekap_Nilai_${rekapPeriodObj.tahunAjaran.replace('/', '-')}_${rekapPeriodObj.semester}_Kls_${kelasFilter}.pdf`);
    addLog(
      'EXPORT',
      'Rekap Nilai Historis PDF',
      `Mengunduh rekap nilai periode ${rekapPeriodObj.label}, kelas ${kelasFilter}.`
    );
    showToast('Rekap PDF nilai historis berhasil diunduh.', 'success');
  };

  const handleExportRekapExcel = () => {
    const wb = buildAdminRekapNilaiWorkbook(
      rekapRows,
      activeMapels,
      rekapPeriodObj.label,
      selectedPengampuGuru?.nama
    );
    XLSX.writeFile(
      wb,
      `Rekap_Nilai_${rekapPeriodObj.tahunAjaran.replace('/', '-')}_${rekapPeriodObj.semester}_Kls_${kelasFilter}.xlsx`
    );
    addLog(
      'EXPORT',
      'Rekap Nilai Historis Excel',
      `Mengunduh Excel rekap nilai periode ${rekapPeriodObj.label}, kelas ${kelasFilter}.`
    );
    showToast('Rekap Excel nilai historis berhasil diunduh.', 'success');
  };

  // === TAB 1B: BAGAN RAPORT SISWA TERPADU ===
  const [raporPeriodId, setRaporPeriodId] = useState<string>(selectedPeriodId);
  const [raporKelas, setRaporKelas] = useState<KelasLevel>('7');
  const [raporSiswaId, setRaporSiswaId] = useState<string>('');
  const [raporDownloading, setRaporDownloading] = useState(false);

  const raporPeriodObj = useMemo(
    () => state.periods.find((p) => p.id === raporPeriodId) || state.periods[0],
    [state.periods, raporPeriodId]
  );

  const raporKelasSiswas = useMemo(
    () =>
      state.siswas.filter(
        (s) => s.periodId === raporPeriodObj.id && s.kelas === raporKelas
      ),
    [state.siswas, raporPeriodObj.id, raporKelas]
  );

  const activeRaporSiswa = useMemo(() => {
    if (raporKelasSiswas.length === 0) return null;
    return raporKelasSiswas.find((s) => s.id === raporSiswaId) || raporKelasSiswas[0];
  }, [raporKelasSiswas, raporSiswaId]);

  const activeRaporExtra = useMemo(() => {
    if (!activeRaporSiswa) return undefined;
    return state.studentRaporExtras.find(
      (r) => r.periodId === raporPeriodObj.id && r.siswaId === activeRaporSiswa.id
    );
  }, [state.studentRaporExtras, raporPeriodObj.id, activeRaporSiswa]);

  const activeRaporMapelRows = useMemo(() => {
    if (!activeRaporSiswa) return [];
    const recs = state.nilaiRecords.filter(
      (n) => n.periodId === raporPeriodObj.id && n.siswaId === activeRaporSiswa.id
    );
    return state.subjects.map((mapel, idx) => {
      const rec = recs.find((n) => n.mapel === mapel);
      const kkm = state.gradeSettings.kkmPerMapel[mapel] ?? 75;
      const avgTugas = rec ? (hitungRataDaftar(rec.tugasList) ?? rec.tugas ?? null) : null;
      const avgHarian = rec ? (hitungRataDaftar(rec.keseharianList) ?? rec.keseharian ?? null) : null;
      const akhir = rec ? hitungRataRata(rec, state.gradeSettings) : null;
      return {
        no: idx + 1,
        mapel,
        kkm,
        avgTugas,
        avgHarian,
        uts: rec?.uts ?? null,
        uas: rec?.uas ?? null,
        akhir,
        predikat: akhir !== null ? getPredikatNilai(akhir) : '-',
        tuntas: akhir !== null ? akhir >= kkm : null,
        catatanGuru: rec?.catatanGuru || '',
      };
    });
  }, [activeRaporSiswa, state.nilaiRecords, state.gradeSettings, state.subjects, raporPeriodObj.id]);

  const handleDownloadSingleRaporPdf = async () => {
    if (!activeRaporSiswa) return;
    try {
      setRaporDownloading(true);
      await exportStudentRaporPdf(
        activeRaporSiswa,
        raporPeriodObj,
        state.schoolProfile,
        state.nilaiRecords,
        state.studentRaporExtras,
        state.gradeSettings,
        state.kepalaSekolah,
        state.subjects
      );
      addLog(
        'EXPORT',
        'Raport Siswa PDF',
        `Mengunduh Raport ${activeRaporSiswa.nama} (Kelas ${activeRaporSiswa.kelas} · ${raporPeriodObj.label}).`
      );
      showToast(`Raport PDF ${activeRaporSiswa.nama} berhasil diunduh.`, 'success');
    } finally {
      setRaporDownloading(false);
    }
  };

  const handleDownloadClassRaporPdf = async () => {
    if (raporKelasSiswas.length === 0) return;
    try {
      setRaporDownloading(true);
      await exportClassRaporPdf(
        raporKelas,
        raporKelasSiswas,
        raporPeriodObj,
        state.schoolProfile,
        state.nilaiRecords,
        state.studentRaporExtras,
        state.gradeSettings,
        state.kepalaSekolah,
        state.subjects
      );
      addLog(
        'EXPORT',
        'Raport Kelas PDF',
        `Mengunduh Raport Lengkap Kelas ${raporKelas} (${raporKelasSiswas.length} siswa · ${raporPeriodObj.label}).`
      );
      showToast(`Raport PDF lengkap Kelas ${raporKelas} berhasil diunduh.`, 'success');
    } finally {
      setRaporDownloading(false);
    }
  };

  const handleDownloadClassRaporExcel = () => {
    if (raporKelasSiswas.length === 0) return;
    exportClassRaporExcel(
      raporKelas,
      raporKelasSiswas,
      raporPeriodObj,
      state.nilaiRecords,
      state.studentRaporExtras,
      state.gradeSettings,
      state.subjects
    );
    addLog(
      'EXPORT',
      'Raport Kelas Excel',
      `Mengunduh Excel rekap Raport Kelas ${raporKelas} (${raporPeriodObj.label}).`
    );
    showToast(`Rekap Excel Raport Kelas ${raporKelas} berhasil diunduh.`, 'success');
  };

  // === TAB 2: PUSAT ARSIP (ZIP) ===
  const [zipScope, setZipScope] = useState<ArchiveExportOptions['scope']>('ALL');
  const [zipPeriodId, setZipPeriodId] = useState<string>(selectedPeriodId);
  const [zipKelasFilter, setZipKelasFilter] = useState<'ALL' | KelasLevel>('ALL');
  const [zipGuruId, setZipGuruId] = useState<string>('ALL');
  const [zipKatAdmin, setZipKatAdmin] = useState<string>('ALL');
  const [zipFormat, setZipFormat] = useState<ArchiveExportOptions['format']>('BOTH');
  const [zipLoading, setZipLoading] = useState(false);

  const allAdminCategories = useMemo(
    () => [...KATEGORI_ADMIN_GURU_DEFAULT, ...state.customAdminCategories],
    [state.customAdminCategories]
  );

  // Daftar unik guru (berdasarkan userId) untuk filter arsip lintas periode
  const uniqueGurusForFilter = useMemo(() => {
    const seen = new Map<string, (typeof state.gurus)[number]>();
    state.gurus.forEach((g) => {
      const key = g.userId || g.id;
      if (!seen.has(key)) seen.set(key, g);
    });
    return Array.from(seen.values());
  }, [state.gurus]);

  const handleDownloadZip = async () => {
    try {
      setZipLoading(true);
      const count = await exportPusatArsipZip(
        state,
        {
          scope: zipScope,
          periodIdFilter: zipPeriodId,
          kelasFilter: zipKelasFilter,
          guruIdFilter: zipGuruId,
          kategoriAdminFilter: zipKatAdmin,
          format: zipFormat,
        },
        state.gradeSettings
      );
      addLog(
        'EXPORT',
        'Pusat Arsip ZIP',
        `Mengunduh paket arsip ZIP (${zipScope}, periode ${zipPeriodId}, ${count} berkas).`
      );
      showToast(`Berhasil mengunduh arsip ZIP (${count} berkas di dalamnya).`, 'success');
    } catch {
      showToast('Gagal mengemas arsip ZIP.', 'error');
    } finally {
      setZipLoading(false);
    }
  };

  // === TAB 3: MANAJEMEN AKUN ===
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [isNewAcc, setIsNewAcc] = useState(false);
  const [accForm, setAccForm] = useState<UserAccount>({
    id: '',
    username: '',
    password: '',
    role: 'GURU',
    namaLengkap: '',
    active: true,
    guruId: '',
    stafId: '',
    aksesSarpras: false,
    aksesKeuangan: false,
    tugasTambahan: '',
  });

  const openAddAccount = () => {
    setIsNewAcc(true);
    setAccForm({
      id: `usr_${Date.now()}`,
      username: '',
      password: 'guru123',
      role: 'GURU',
      namaLengkap: '',
      active: true,
      guruId: state.gurus[0]?.id || '',
      stafId: state.stafs[0]?.id || '',
      aksesSarpras: false,
      aksesKeuangan: false,
      tugasTambahan: '',
    });
    setAccModalOpen(true);
  };

  const openEditAccount = (acc: UserAccount) => {
    setIsNewAcc(false);
    setAccForm({
      ...acc,
      stafId: acc.stafId || '',
      aksesSarpras: Boolean(acc.aksesSarpras),
      aksesKeuangan: Boolean(acc.aksesKeuangan),
      tugasTambahan: acc.tugasTambahan || '',
    });
    setAccModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accForm.username.trim() || !accForm.password.trim() || !accForm.namaLengkap.trim()) {
      showToast('Username, password, dan nama lengkap wajib diisi.', 'error');
      return;
    }
    const duplicate = state.accounts.some(
      (a) => a.username.toLowerCase() === accForm.username.trim().toLowerCase() && a.id !== accForm.id
    );
    if (duplicate) {
      showToast('Username sudah digunakan akun lain.', 'error');
      return;
    }
    const hasSarpras = accForm.role === 'ADMIN' ? true : Boolean(accForm.aksesSarpras);
    const hasKeuangan = accForm.role === 'STAF' ? Boolean(accForm.aksesKeuangan) : false;
    saveAccount(
      {
        ...accForm,
        username: accForm.username.trim(),
        guruId: accForm.role === 'GURU' ? accForm.guruId : undefined,
        stafId: accForm.role === 'STAF' ? accForm.stafId : undefined,
        aksesSarpras: hasSarpras,
        aksesKeuangan: hasKeuangan,
        tugasTambahan:
          accForm.tugasTambahan?.trim() ||
          (hasKeuangan
            ? 'Pengelola & Input Keuangan Sekolah'
            : accForm.role !== 'ADMIN' && hasSarpras
              ? 'Input Data Sarana & Prasarana Sekolah'
              : undefined),
      },
      isNewAcc
    );
    setAccModalOpen(false);
  };

  // === TAB 5: BACKUP & RESTORE ===
  const handleDownloadJsonBackup = () => {
    const json = localStorageAdapter.exportBackupJson(state);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SMPN_Satap_Besakih_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('BACKUP', 'Backup JSON', 'Mengekspor seluruh database sekolah ke berkas JSON.');
    showToast('File backup JSON berhasil diunduh.', 'success');
  };

  const handleImportJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = localStorageAdapter.parseBackupJson(String(reader.result || ''));
        confirmDelete(
          'Pulihkan Data dari Backup?',
          `Seluruh data saat ini akan diganti dengan data dari file "${file.name}". Lanjutkan?`,
          () => restoreFromBackup(parsed),
          'Ya, Pulihkan Data'
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'File backup tidak valid.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-8 text-center">
        <Shield className="w-10 h-10 text-red-600 mx-auto mb-2" />
        <h1 className="text-lg font-display font-bold">Akses Terbatas</h1>
        <p className="text-sm text-slate-500 mt-1">Panel Admin hanya dapat diakses oleh pengguna dengan peran ADMIN.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
          Panel Administrator
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Kelola periode pendidikan historis, rekap nilai terpadu, pusat arsip ZIP, akun pengguna, dan cadangan data.
        </p>
      </div>

      {/* Tab Navigasi Panel Admin */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {(
          [
            {key: 'periode', label: 'Periode Pendidikan', icon: CalendarRange},
            {key: 'mapel', label: 'Mata Pelajaran', icon: BookMarked},
            {key: 'rekap-nilai', label: 'Rekap Semua Nilai', icon: Award},
            {key: 'rapor', label: 'Raport Siswa', icon: BookOpenCheck},
            {key: 'tampilan-login', label: 'Tampilan Login', icon: LayoutTemplate},
            {key: 'pusat-arsip', label: 'Pusat Arsip (ZIP)', icon: Archive},
            {key: 'akun', label: 'Manajemen Akun', icon: KeyRound},
            {key: 'log', label: 'Log Aktivitas', icon: History},
            {key: 'backup', label: 'Backup & Restore', icon: DatabaseBackup},
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* KONTEN TAB 0: PERIODE PENDIDIKAN */}
      {activeTab === 'periode' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Daftar Periode Pendidikan (Tahun Ajaran & Semester)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setiap periode menyimpan data guru, siswa, kelas, nilai, dan administrasi guru secara historis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNewTahunAjaran(nextPeriodInfo.tahunAjaran);
                setNewSemester(nextPeriodInfo.semester);
                setCopyFromPeriodId(activePeriod.id);
                setPromoteClasses(nextPeriodInfo.isYearRollover);
                setSetAsActive(true);
                setPeriodModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer self-start"
            >
              <Plus className="w-4 h-4" />
              Buat Periode Baru
            </button>
          </div>

          {/* Kartu Pergantian Semester & Tahun Pelajaran Berikutnya */}
          <div className="rounded-2xl border border-teal-200 dark:border-teal-800/70 bg-gradient-to-br from-teal-50/80 to-white dark:from-teal-950/30 dark:to-slate-900 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-300">
                <CalendarRange className="w-4 h-4" />
                <span>Pergantian Semester &amp; Tahun Pelajaran</span>
                <span className="font-mono-num text-slate-500 dark:text-slate-400">
                  · Aktif: {activePeriod.label}
                </span>
              </div>
              <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
                {activePeriod.label} <ArrowRight className="inline w-4 h-4 mx-1 text-teal-600" />{' '}
                {nextPeriodInfo.label}
              </h3>
              {nextPeriodInfo.isYearRollover ? (
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                  Pergantian dari <strong>Semester Genap</strong> ke Tahun Ajaran baru secara otomatis mengevaluasi nilai seluruh mapel siswa: siswa Kelas 7 &amp; 8 yang memenuhi KKM otomatis naik kelas, Kelas 9 yang memenuhi syarat dinyatakan <strong>Lulus</strong>, dan yang belum memenuhi KKM tetap di kelasnya.
                </p>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
                  Pergantian dari <strong>Semester Ganjil</strong> ke <strong>Semester Genap</strong> pada tahun ajaran yang sama. Seluruh data guru dan siswa akan disalin tanpa perubahan tingkat kelas.
                </p>
              )}
              {rolloverPreview && (
                <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-mono-num">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    Naik Kelas (7→8 / 8→9): {rolloverPreview.naikKelas}
                  </span>
                  <span className="text-teal-700 dark:text-teal-400 font-semibold">
                    Lulus (Kelas 9): {rolloverPreview.lulus}
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-semibold">
                    Tetap / Belum Memenuhi: {rolloverPreview.tetap}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleAdvanceSemester}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer shrink-0 shadow-sm"
            >
              <ArrowRight className="w-4 h-4" />
              {existingNextPeriod
                ? `Aktifkan ${existingNextPeriod.label}`
                : `Lanjut ke ${nextPeriodInfo.label}`}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.periods.map((p) => {
              const gCount = state.gurus.filter((g) => g.periodId === p.id).length;
              const sCount = state.siswas.filter((s) => s.periodId === p.id).length;
              const nCount = state.nilaiRecords.filter((n) => n.periodId === p.id).length;
              const aCount = state.adminGuruEntries.filter((a) => a.periodId === p.id).length;
              const isViewing = selectedPeriodId === p.id;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 ${
                    p.aktif
                      ? 'border-teal-600 ring-1 ring-teal-600/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono-num text-slate-500 dark:text-slate-400">
                        TA {p.tahunAjaran} · Semester {p.semester}
                      </span>
                      {p.aktif ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Periode Aktif
                        </span>
                      ) : (
                        <span className="font-medium text-slate-500">Arsip Historis</span>
                      )}
                    </div>

                    <h3 className="mt-1 text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                      {p.label}
                    </h3>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <p className="text-slate-500">Guru</p>
                        <p className="font-mono-num font-bold text-base">{gCount}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <p className="text-slate-500">Siswa</p>
                        <p className="font-mono-num font-bold text-base">{sCount}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <p className="text-slate-500">Entri Nilai</p>
                        <p className="font-mono-num font-bold text-base">{nCount}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <p className="text-slate-500">Adm. Guru</p>
                        <p className="font-mono-num font-bold text-base">{aCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPeriodId(p.id);
                        showToast(`Menampilkan data periode ${p.label}.`, 'info');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        isViewing
                          ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border border-teal-600/30'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isViewing ? 'Sedang Ditampilkan' : 'Lihat Data Periode Ini'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      {!p.aktif && (
                        <>
                          <button
                            type="button"
                            onClick={() => setActivePeriod(p.id)}
                            className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            Jadikan Aktif
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              confirmDelete(
                                'Hapus Periode Historis?',
                                `Periode "${p.label}" beserta seluruh data siswa, guru, nilai, dan administrasi di dalamnya akan dihapus permanen.`,
                                () => deletePeriod(p.id)
                              )
                            }
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            aria-label="Hapus periode"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KONTEN TAB: MATA PELAJARAN & GURU PENGAMPU */}
      {activeTab === 'mapel' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Daftar Mata Pelajaran &amp; Guru Pengampu ({selectedPeriod.label})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tambahkan mata pelajaran baru sesuai kebutuhan sekolah dan lihat atau tetapkan guru yang mengampu setiap mata pelajaran.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddMapel}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer self-start"
            >
              <Plus className="w-4 h-4" />
              Tambah Mata Pelajaran
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4 text-center w-12">No</th>
                    <th className="py-3 px-4">Nama Mata Pelajaran</th>
                    <th className="py-3 px-3 text-center w-24">KKM</th>
                    <th className="py-3 px-4">Guru Pengampu ({selectedPeriod.label})</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {state.subjects.map((mapel, idx) => {
                    const pengampus = periodGurus.filter((g) => g.mapelDiampu.includes(mapel));
                    const kkm = state.gradeSettings.kkmPerMapel[mapel] ?? 75;
                    return (
                      <tr key={mapel} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-center font-mono-num text-xs text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {mapel}
                        </td>
                        <td className="py-3 px-3 text-center font-mono-num font-semibold text-teal-700 dark:text-teal-400">
                          {kkm}
                        </td>
                        <td className="py-3 px-4">
                          {pengampus.length === 0 ? (
                            <span className="text-xs italic text-amber-600 dark:text-amber-400">
                              Belum ada guru pengampu
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {pengampus.map((g) => (
                                <span
                                  key={g.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/70 text-xs font-medium text-teal-800 dark:text-teal-300"
                                >
                                  <Users className="w-3 h-3 shrink-0" />
                                  {g.nama}
                                  {g.kelasDiampu.length > 0 && (
                                    <span className="text-[11px] opacity-75">
                                      (Kls {g.kelasDiampu.join(', ')})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            onClick={() =>
                              setAssignGuruTarget({
                                mapel,
                                guruIds: pengampus.map((g) => g.id),
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-600/60 text-xs font-semibold text-teal-700 dark:text-teal-400 cursor-pointer"
                            title="Atur guru pengampu mata pelajaran ini"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Atur Guru
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditMapelTarget({
                                oldName: mapel,
                                name: mapel,
                                kkm,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Ubah nama mapel atau KKM"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              confirmDelete(
                                'Hapus Mata Pelajaran?',
                                `Mata pelajaran "${mapel}" akan dihapus dari daftar pelajaran aktif dan daftar pengampuan guru.`,
                                () => deleteSubject(mapel)
                              )
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Hapus mata pelajaran"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* KONTEN TAB 1: REKAP SEMUA NILAI */}
      {activeTab === 'rekap-nilai' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
              <select
                value={rekapPeriodId}
                onChange={(e) => setRekapPeriodId(e.target.value)}
                aria-label="Filter periode rekap nilai"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-medium"
              >
                {state.periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} {p.aktif ? '(Aktif)' : '(Arsip)'}
                  </option>
                ))}
              </select>

              <select
                value={kelasFilter}
                onChange={(e) => setKelasFilter(e.target.value as 'ALL' | KelasLevel)}
                aria-label="Filter kelas rekap nilai"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-medium"
              >
                <option value="ALL">Semua Kelas (7, 8, 9)</option>
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>

              <select
                value={mapelFilter}
                onChange={(e) => setMapelFilter(e.target.value)}
                aria-label="Filter mata pelajaran"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-medium"
              >
                <option value="ALL">Semua Mata Pelajaran ({state.subjects.length})</option>
                {state.subjects.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={pengampuFilter}
                onChange={(e) => setPengampuFilter(e.target.value)}
                aria-label="Filter guru pengampu"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-medium"
              >
                <option value="ALL">Semua Guru Pengampu</option>
                {uniqueGurusForFilter.map((g) => (
                  <option key={g.id} value={g.userId || g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportRekapPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:border-teal-600/50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-500" />
                Unduh PDF
              </button>
              <button
                type="button"
                onClick={handleExportRekapExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Unduh Excel
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-3 text-center w-14">Rank</th>
                    <th className="py-3 px-3">Nama Siswa</th>
                    <th className="py-3 px-2.5 text-center">Kls</th>
                    {activeMapels.map((m) => (
                      <th key={m} className="py-3 px-2.5 text-center whitespace-nowrap">
                        {m
                          .replace('Pendidikan Agama', 'Agama')
                          .replace('Bahasa Indonesia', 'B.Ind')
                          .replace('Bahasa Inggris', 'B.Ing')
                          .replace('Bahasa Bali', 'B.Bali')}
                      </th>
                    ))}
                    <th className="py-3 px-3.5 text-center font-bold text-teal-700 dark:text-teal-400">
                      Rata-rata
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rekapRows.length === 0 ? (
                    <tr>
                      <td colSpan={4 + activeMapels.length} className="py-8 text-center text-sm text-slate-500">
                        Belum ada data siswa/nilai yang cocok dengan filter periode & pengampu ini.
                      </td>
                    </tr>
                  ) : (
                    rekapRows.map((row) => (
                      <tr key={row.siswa.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-center font-mono-num font-bold text-amber-600 dark:text-amber-400">
                          #{row.ranking}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{row.siswa.nama}</p>
                          <p className="text-[11px] font-mono-num text-slate-500">NIS {row.siswa.nis}</p>
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono-num">{row.siswa.kelas}</td>
                        {activeMapels.map((m) => {
                          const val = row.nilaiPerMapel[m];
                          const kkm = state.gradeSettings.kkmPerMapel[m] ?? 75;
                          return (
                            <td
                              key={m}
                              className={`py-2.5 px-2.5 text-center font-mono-num ${
                                val === null || val === undefined
                                  ? 'text-slate-400'
                                  : val >= kkm
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400 font-semibold'
                              }`}
                            >
                              {val !== null && val !== undefined ? val.toFixed(1) : '-'}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3.5 text-center font-mono-num font-bold text-teal-700 dark:text-teal-300">
                          {row.rataTotal !== null ? row.rataTotal.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* KONTEN TAB 1B: BAGAN RAPORT SISWA TERPADU */}
      {activeTab === 'rapor' && (
        <div className="space-y-5">
          {/* Filter & Tombol Download Raport */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Periode Pendidikan
                </label>
                <select
                  value={raporPeriodId}
                  onChange={(e) => {
                    setRaporPeriodId(e.target.value);
                    setRaporSiswaId('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
                >
                  {state.periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} {p.aktif ? '(Aktif)' : '(Arsip)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kelas
                </label>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  {(['7', '8', '9'] as KelasLevel[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setRaporKelas(k);
                        setRaporSiswaId('');
                      }}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        raporKelas === k
                          ? 'bg-teal-700 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Kelas {k}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Pilih Siswa untuk Pratinjau Raport
                </label>
                <select
                  value={activeRaporSiswa?.id || ''}
                  onChange={(e) => setRaporSiswaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
                >
                  {raporKelasSiswas.length === 0 ? (
                    <option value="">Belum ada siswa di kelas ini</option>
                  ) : (
                    raporKelasSiswas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} (NIS {s.nis})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gabungan otomatis nilai tugas (T1–T10), keseharian, UTS, UAS, catatan guru, ekstrakurikuler, &amp; absensi dalam satu bagan Raport siap cetak.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!activeRaporSiswa || raporDownloading}
                  onClick={handleDownloadSingleRaporPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Raport Siswa Ini (PDF)
                </button>
                <button
                  type="button"
                  disabled={raporKelasSiswas.length === 0 || raporDownloading}
                  onClick={handleDownloadClassRaporPdf}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-600/50 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-500" />
                  Download Raport Kelas {raporKelas} (PDF)
                </button>
                <button
                  type="button"
                  disabled={raporKelasSiswas.length === 0 || raporDownloading}
                  onClick={handleDownloadClassRaporExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-600/50 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Rekap Raport Kelas (Excel)
                </button>
              </div>
            </div>
          </div>

          {/* Bagan Pratinjau Raport */}
          {!activeRaporSiswa ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
              Belum ada peserta didik terdaftar pada Kelas {raporKelas} periode {raporPeriodObj.label}.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 space-y-6">
              {/* Kop Bagan Raport */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-teal-700/70">
                <div className="flex items-center gap-3.5">
                  <img
                    src={state.schoolProfile.logoDataUrl}
                    alt={state.schoolProfile.nama}
                    className="w-14 h-14 rounded-2xl object-contain bg-white border border-slate-200 p-1 shrink-0"
                  />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                      Laporan Hasil Belajar Peserta Didik (Raport)
                    </p>
                    <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                      {state.schoolProfile.nama}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      NPSN {state.schoolProfile.npsn} · {state.schoolProfile.alamat}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs space-y-0.5 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{activeRaporSiswa.nama}</p>
                  <p className="font-mono-num text-slate-600 dark:text-slate-400">
                    NIS {activeRaporSiswa.nis} · NISN {activeRaporSiswa.nisn}
                  </p>
                  <p className="text-teal-700 dark:text-teal-400 font-semibold">
                    Kelas {activeRaporSiswa.kelas} · {raporPeriodObj.label}
                  </p>
                </div>
              </div>

              {/* A. Nilai Mata Pelajaran & Catatan Guru */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-display font-bold text-teal-800 dark:text-teal-300">
                  A. Capaian Kompetensi Mata Pelajaran &amp; Catatan Guru
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <th className="py-2.5 px-3 text-center w-10">No</th>
                        <th className="py-2.5 px-3">Mata Pelajaran</th>
                        <th className="py-2.5 px-2.5 text-center">KKM</th>
                        <th className="py-2.5 px-2.5 text-center">Tugas</th>
                        <th className="py-2.5 px-2.5 text-center">Harian</th>
                        <th className="py-2.5 px-2.5 text-center">UTS</th>
                        <th className="py-2.5 px-2.5 text-center">UAS</th>
                        <th className="py-2.5 px-3 text-center">Akhir</th>
                        <th className="py-2.5 px-2.5 text-center">Status</th>
                        <th className="py-2.5 px-3 min-w-[220px]">Catatan Guru</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeRaporMapelRows.map((row) => (
                        <tr key={row.mapel} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-center font-mono-num text-slate-500">{row.no}</td>
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {row.mapel}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono-num text-slate-500">{row.kkm}</td>
                          <td className="py-2 px-2.5 text-center font-mono-num">
                            {row.avgTugas !== null ? row.avgTugas.toFixed(1) : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono-num">
                            {row.avgHarian !== null ? row.avgHarian.toFixed(1) : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono-num">
                            {row.uts !== null ? row.uts : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono-num">
                            {row.uas !== null ? row.uas : '-'}
                          </td>
                          <td
                            className={`py-2 px-3 text-center font-mono-num font-bold ${
                              row.akhir === null
                                ? 'text-slate-400'
                                : row.tuntas
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {row.akhir !== null ? row.akhir.toFixed(1) : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center text-xs font-semibold">
                            {row.akhir === null ? (
                              <span className="text-slate-400">-</span>
                            ) : row.tuntas ? (
                              <span className="text-emerald-700 dark:text-emerald-400">Tuntas</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">Remedial</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-600 dark:text-slate-300">
                            {row.catatanGuru || <span className="text-slate-400">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* B. Ekstrakurikuler & C. Absensi / Catatan Wali Kelas */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 space-y-2.5">
                  <h3 className="text-sm font-display font-bold text-teal-800 dark:text-teal-300">
                    B. Kegiatan Ekstrakurikuler
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <th className="py-2 px-3 text-center w-10">No</th>
                          <th className="py-2 px-3">Ekstrakurikuler</th>
                          <th className="py-2 px-3">Predikat</th>
                          <th className="py-2 px-3 text-center">Nilai</th>
                          <th className="py-2 px-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {!activeRaporExtra || activeRaporExtra.ekstrakurikuler.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 px-3 text-center text-xs text-slate-400">
                              Belum ada nilai ekstrakurikuler tercatat untuk siswa ini.
                            </td>
                          </tr>
                        ) : (
                          activeRaporExtra.ekstrakurikuler.map((ex, i) => (
                            <tr key={ex.id}>
                              <td className="py-2 px-3 text-center font-mono-num text-slate-500">{i + 1}</td>
                              <td className="py-2 px-3 font-semibold">{ex.namaEkskul}</td>
                              <td className="py-2 px-3 text-xs font-semibold text-teal-700 dark:text-teal-400">
                                {ex.predikat}
                              </td>
                              <td className="py-2 px-3 text-center font-mono-num">
                                {ex.nilaiAngka ?? '-'}
                              </td>
                              <td className="py-2 px-3 text-xs text-slate-600 dark:text-slate-300">
                                {ex.keterangan || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-2.5">
                  <h3 className="text-sm font-display font-bold text-teal-800 dark:text-teal-300">
                    C. Ketidakhadiran &amp; Catatan Wali Kelas
                  </h3>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/70 dark:bg-slate-950/60">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <p className="text-[11px] text-slate-500">Sakit</p>
                        <p className="font-mono-num font-bold text-base">
                          {activeRaporExtra?.sakit ?? 0} <span className="text-xs font-normal">hari</span>
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <p className="text-[11px] text-slate-500">Izin</p>
                        <p className="font-mono-num font-bold text-base">
                          {activeRaporExtra?.izin ?? 0} <span className="text-xs font-normal">hari</span>
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <p className="text-[11px] text-slate-500">Alpa</p>
                        <p className="font-mono-num font-bold text-base">
                          {activeRaporExtra?.alpa ?? 0} <span className="text-xs font-normal">hari</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Catatan Wali Kelas
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {activeRaporExtra?.catatanWaliKelas?.trim() ||
                          'Belum ada catatan wali kelas untuk siswa ini.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KONTEN TAB: TAMPILAN & CATATAN HALAMAN LOGIN */}
      {activeTab === 'tampilan-login' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/70 dark:bg-teal-950/30 px-4 py-3 text-xs text-teal-900 dark:text-teal-200">
            Perubahan pada isian menu maupun catatan di bawah ini akan langsung tampil pada halaman Login saat pengguna mengakses sistem.
          </div>
          <LoginConfigEditor />
        </div>
      )}

      {/* KONTEN TAB 2: PUSAT ARSIP ZIP HISTORIS */}
      {activeTab === 'pusat-arsip' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 max-w-3xl space-y-5">
          <div>
            <h2 className="text-lg font-display font-semibold">Pusat Unduhan Arsip Historis (ZIP)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Unduh seluruh arsip historis berdasarkan Periode (Tahun-Semester), Kelas, dan Guru Pengampu dalam satu paket ZIP terorganisir.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5">Periode Pendidikan (Tahun - Semester)</label>
              <select
                value={zipPeriodId}
                onChange={(e) => setZipPeriodId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
              >
                <option value="ALL">Semua Periode Historis ({state.periods.length})</option>
                {state.periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} {p.aktif ? '(Aktif)' : '(Arsip)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Cakupan Data Arsip</label>
              <select
                value={zipScope}
                onChange={(e) => setZipScope(e.target.value as ArchiveExportOptions['scope'])}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
              >
                <option value="ALL">Semua Data & Lampiran Sekaligus</option>
                <option value="ADMIN_GURU">Administrasi Guru & Berkas Upload</option>
                <option value="SISWA">Daftar Siswa (Kelas 7, 8, 9)</option>
                <option value="NILAI">Rekap Nilai per Kelas & Mapel</option>
                <option value="SARPRAS">Data Sarana & Prasarana</option>
                <option value="PRESTASI">Catatan Prestasi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Filter Kelas</label>
              <select
                value={zipKelasFilter}
                onChange={(e) => setZipKelasFilter(e.target.value as 'ALL' | KelasLevel)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
              >
                <option value="ALL">Semua Kelas (7, 8, 9)</option>
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Filter Guru Pengampu</label>
              <select
                value={zipGuruId}
                onChange={(e) => setZipGuruId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
              >
                <option value="ALL">Semua Guru</option>
                {uniqueGurusForFilter.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </div>

            {(zipScope === 'ALL' || zipScope === 'ADMIN_GURU') && (
              <div>
                <label className="block text-xs font-semibold mb-1.5">Filter Kategori Administrasi</label>
                <select
                  value={zipKatAdmin}
                  onChange={(e) => setZipKatAdmin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                >
                  <option value="ALL">Semua Kategori</option>
                  {allAdminCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5">Format Dokumen Laporan</label>
              <select
                value={zipFormat}
                onChange={(e) => setZipFormat(e.target.value as ArchiveExportOptions['format'])}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
              >
                <option value="BOTH">PDF & Excel (.xlsx)</option>
                <option value="PDF">Hanya PDF</option>
                <option value="EXCEL">Hanya Excel (.xlsx)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={zipLoading}
            onClick={handleDownloadZip}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            {zipLoading ? 'Mengemas Berkas ZIP...' : 'Unduh Paket Arsip (.ZIP)'}
          </button>
        </div>
      )}

      {/* KONTEN TAB 3: MANAJEMEN AKUN */}
      {activeTab === 'akun' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Total {state.accounts.length} akun pengguna terdaftar.
            </p>
            <button
              type="button"
              onClick={openAddAccount}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Buat Akun Baru
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Peran</th>
                    <th className="py-3 px-4">Tugas Khusus (Sarpras / Keuangan)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {state.accounts.map((acc) => {
                    const isSelf = acc.id === currentUser.id;
                    const linkedStaf = acc.stafId ? state.stafs.find((s) => s.id === acc.stafId) : undefined;
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono-num font-semibold">{acc.username}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{acc.namaLengkap}</p>
                          {linkedStaf && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Staf: {linkedStaf.jabatan}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-lg ${
                              acc.role === 'ADMIN'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : acc.role === 'STAF'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                  : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                            }`}
                          >
                            {acc.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {acc.role === 'ADMIN' ? (
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              Akses Penuh (Keuangan: Terima Hasil)
                            </span>
                          ) : acc.aksesSarpras || acc.aksesKeuangan ? (
                            <div className="flex flex-wrap gap-1">
                              {acc.aksesSarpras && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                                  <Building2 className="w-3 h-3" />
                                  Input Sarpras
                                </span>
                              )}
                              {acc.aksesKeuangan && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold">
                                  <Wallet className="w-3 h-3" />
                                  Input Keuangan
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          {acc.active ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Aktif</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">Nonaktif</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                          {acc.role === 'STAF' && (
                            <button
                              type="button"
                              onClick={() => toggleKeuanganAccess(acc.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                acc.aksesKeuangan
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40'
                                  : 'text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title={
                                acc.aksesKeuangan
                                  ? 'Cabut tugas input Keuangan Sekolah'
                                  : 'Tugaskan input Keuangan Sekolah'
                              }
                            >
                              <Wallet className="w-4 h-4" />
                            </button>
                          )}
                          {acc.role !== 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => toggleSarprasAccess(acc.id)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                acc.aksesSarpras
                                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40'
                                  : 'text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title={
                                acc.aksesSarpras
                                  ? 'Cabut tugas input Sarana & Prasarana'
                                  : 'Berikan tugas input Sarana & Prasarana'
                              }
                            >
                              <Building2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditAccount(acc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Ubah akun / reset password"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!isSelf && (
                            <>
                              <button
                                type="button"
                                onClick={() => saveAccount({...acc, active: !acc.active}, false)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 cursor-pointer"
                                title={acc.active ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                              >
                                {acc.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  confirmDelete(
                                    'Hapus Akun?',
                                    `Akun "${acc.username}" akan dihapus permanen.`,
                                    () => deleteAccount(acc.id)
                                  )
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                title="Hapus akun"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* KONTEN TAB 4: LOG AKTIVITAS */}
      {activeTab === 'log' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Modul</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {state.activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-xs font-mono-num text-slate-500 whitespace-nowrap">
                      {formatDateTimeId(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium whitespace-nowrap">
                      {log.userName} ({log.role})
                    </td>
                    <td className="py-2.5 px-4 text-xs font-semibold text-teal-700 dark:text-teal-400">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-xs">{log.entity}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-300">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KONTEN TAB 5: BACKUP & RESTORE JSON */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-display font-semibold">Ekspor Cadangan (Backup JSON)</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Simpan salinan lengkap seluruh periode, siswa, guru, nilai, sarpras, prestasi, dan akun ke perangkat Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadJsonBackup}
              className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh Backup JSON
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-display font-semibold">Pulihkan Data (Restore JSON)</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Unggah file backup JSON sebelumnya untuk mengembalikan seluruh data sistem sekolah.
              </p>
            </div>
            <label className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold cursor-pointer">
              <Upload className="w-4 h-4 text-amber-500" />
              Pilih File JSON Backup
              <input type="file" accept=".json,application/json" onChange={handleImportJsonBackup} className="hidden" />
            </label>
          </div>

          <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-display font-semibold text-red-600 dark:text-red-400">
                Reset ke Data Awal
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Menghapus perubahan lokal dan mengembalikan data contoh awal SMPN Satu Atap Besakih.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                confirmDelete(
                  'Reset Seluruh Data ke Awal?',
                  'Semua perubahan data dan berkas unggahan di browser akan dihapus dan dikembalikan ke data awal.',
                  () => {
                    void resetAllToSeed();
                  },
                  'Ya, Reset Sekarang'
                )
              }
              className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Data Awal
            </button>
          </div>
        </div>
      )}

      {/* Modal Buat Periode Pendidikan Baru */}
      <Modal
        open={periodModalOpen}
        onClose={() => setPeriodModalOpen(false)}
        title="Buat Periode Pendidikan Baru"
        subtitle="Tambahkan Tahun Ajaran dan Semester untuk pencatatan data guru, siswa, kelas, nilai, & arsip."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleCreatePeriod} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Tahun Ajaran *</label>
              <input
                type="text"
                required
                value={newTahunAjaran}
                onChange={(e) => setNewTahunAjaran(e.target.value)}
                placeholder="Contoh: 2027/2028"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Semester *</label>
              <select
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value as SemesterType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Salin Data Guru & Siswa dari Periode Sebelumnya (Opsional)
            </label>
            <select
              value={copyFromPeriodId}
              onChange={(e) => setCopyFromPeriodId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">-- Mulai Kosong (Input Manual) --</option>
              {state.periods.map((p) => (
                <option key={p.id} value={p.id}>
                  Salin dari: {p.label}
                </option>
              ))}
            </select>
          </div>

          {copyFromPeriodId && (
            <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={promoteClasses}
                onChange={(e) => setPromoteClasses(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-700"
              />
              <span>
                Evaluasi &amp; naikkan kelas siswa otomatis saat disalin dari{' '}
                <strong>Semester Genap</strong> (Kelas 7 → 8, Kelas 8 → 9, Kelas 9 lulus jika seluruh nilai mapel memenuhi KKM; hanya berlaku dari Semester Genap).
              </span>
            </label>
          )}

          <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={setAsActive}
              onChange={(e) => setSetAsActive(e.target.checked)}
              className="rounded border-slate-300 text-teal-700"
            />
            Jadikan periode ini sebagai Periode Aktif sekarang
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

      {/* Modal Tambah/Edit Akun */}
      <Modal
        open={accModalOpen}
        onClose={() => setAccModalOpen(false)}
        title={isNewAcc ? 'Buat Akun Pengguna Baru' : `Edit Akun — ${accForm.username}`}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Username *</label>
            <input
              type="text"
              required
              value={accForm.username}
              onChange={(e) => setAccForm({...accForm, username: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Kata Sandi *</label>
            <input
              type="text"
              required
              value={accForm.password}
              onChange={(e) => setAccForm({...accForm, password: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={accForm.namaLengkap}
              onChange={(e) => setAccForm({...accForm, namaLengkap: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Peran</label>
            <select
              value={accForm.role}
              onChange={(e) => {
                const nextRole = e.target.value as UserRole;
                setAccForm({
                  ...accForm,
                  role: nextRole,
                  password: isNewAcc
                    ? nextRole === 'STAF'
                      ? 'staf123'
                      : nextRole === 'GURU'
                        ? 'guru123'
                        : 'admin123'
                    : accForm.password,
                  aksesSarpras: nextRole === 'STAF' ? true : accForm.aksesSarpras,
                });
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="GURU">GURU</option>
              <option value="STAF">STAF (Tenaga Kependidikan)</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          {accForm.role === 'GURU' && (
            <div>
              <label className="block text-xs font-semibold mb-1">Tautkan ke Data Guru</label>
              <select
                value={accForm.guruId || ''}
                onChange={(e) => {
                  const g = state.gurus.find((x) => x.id === e.target.value);
                  setAccForm({
                    ...accForm,
                    guruId: e.target.value,
                    namaLengkap: accForm.namaLengkap || g?.nama || '',
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">-- Pilih Guru --</option>
                {uniqueGurusForFilter.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </select>
            </div>
          )}
          {accForm.role === 'STAF' && (
            <div>
              <label className="block text-xs font-semibold mb-1">Tautkan ke Data Staf</label>
              <select
                value={accForm.stafId || ''}
                onChange={(e) => {
                  const st = state.stafs.find((x) => x.id === e.target.value);
                  setAccForm({
                    ...accForm,
                    stafId: e.target.value,
                    namaLengkap: accForm.namaLengkap || st?.nama || '',
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">-- Pilih Data Staf --</option>
                {state.stafs.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.nama} ({st.jabatan})
                  </option>
                ))}
              </select>
            </div>
          )}
          {accForm.role !== 'ADMIN' && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/60 dark:bg-teal-950/30 p-3 space-y-2.5">
              <label className="flex items-start gap-2.5 text-xs font-semibold text-teal-900 dark:text-teal-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(accForm.aksesSarpras)}
                  onChange={(e) =>
                    setAccForm({
                      ...accForm,
                      aksesSarpras: e.target.checked,
                      tugasTambahan:
                        e.target.checked && !accForm.tugasTambahan
                          ? 'Input Data Sarana & Prasarana Sekolah'
                          : accForm.tugasTambahan,
                    })
                  }
                  className="mt-0.5 rounded border-slate-300 text-teal-700"
                />
                <span>
                  Tugas Tambahan: Input Data Sarana &amp; Prasarana Sekolah
                  <span className="block font-normal text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Saat login, pengguna dapat langsung masuk ke menu Sarana &amp; Prasarana untuk menginput dan memperbarui gedung &amp; aset sekolah.
                  </span>
                </span>
              </label>
              {accForm.role === 'STAF' && (
                <label className="flex items-start gap-2.5 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer pt-1 border-t border-teal-200/70 dark:border-teal-800/50">
                  <input
                    type="checkbox"
                    checked={Boolean(accForm.aksesKeuangan)}
                    onChange={(e) =>
                      setAccForm({
                        ...accForm,
                        aksesKeuangan: e.target.checked,
                        tugasTambahan:
                          e.target.checked && !accForm.tugasTambahan
                            ? 'Pengelola & Input Keuangan Sekolah'
                            : accForm.tugasTambahan,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300 text-teal-700"
                  />
                  <span>
                    Tugas Khusus: Pengelola &amp; Input Keuangan Sekolah
                    <span className="block font-normal text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Staf ini diberi hak akses menginput pemasukan, penarikan, kertas kerja, serta impor Excel Keuangan Sekolah.
                    </span>
                  </span>
                </label>
              )}
              {(accForm.aksesSarpras || accForm.aksesKeuangan) && (
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Keterangan Tugas Tambahan
                  </label>
                  <input
                    type="text"
                    value={accForm.tugasTambahan || ''}
                    onChange={(e) => setAccForm({...accForm, tugasTambahan: e.target.value})}
                    placeholder="Contoh: Operator BOS, Keuangan & Sarpras"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAccModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan Akun
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah Mata Pelajaran */}
      <Modal
        open={addMapelOpen}
        onClose={() => setAddMapelOpen(false)}
        title="Tambah Mata Pelajaran Baru"
        subtitle={`Tambahkan mata pelajaran dan pilih guru pengampu untuk periode ${selectedPeriod.label}.`}
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleCreateMapel} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold mb-1">Nama Mata Pelajaran *</label>
              <input
                type="text"
                required
                value={newMapelName}
                onChange={(e) => setNewMapelName(e.target.value)}
                placeholder="Contoh: Koding & Kecerdasan Artifisial"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">KKM</label>
              <input
                type="number"
                min={0}
                max={100}
                value={newMapelKkm}
                onChange={(e) => setNewMapelKkm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Pilih Guru Pengampu ({selectedPeriod.label})
            </label>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {periodGurus.map((g) => {
                const checked = newMapelGuruIds.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setNewMapelGuruIds((prev) =>
                            checked ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                          )
                        }
                        className="rounded border-slate-300 text-teal-700"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {g.nama}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      Kls {g.kelasDiampu.join(', ') || '-'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddMapelOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
            >
              Tambah Mata Pelajaran
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Nama & KKM Mata Pelajaran */}
      <Modal
        open={Boolean(editMapelTarget)}
        onClose={() => setEditMapelTarget(null)}
        title="Ubah Mata Pelajaran"
        maxWidthClass="max-w-md"
      >
        {editMapelTarget && (
          <form onSubmit={handleUpdateMapel} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Nama Mata Pelajaran *</label>
              <input
                type="text"
                required
                value={editMapelTarget.name}
                onChange={(e) =>
                  setEditMapelTarget({...editMapelTarget, name: e.target.value})
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Nilai KKM</label>
              <input
                type="number"
                min={0}
                max={100}
                value={editMapelTarget.kkm}
                onChange={(e) =>
                  setEditMapelTarget({...editMapelTarget, kkm: Number(e.target.value)})
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditMapelTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Atur Guru Pengampu Mata Pelajaran */}
      <Modal
        open={Boolean(assignGuruTarget)}
        onClose={() => setAssignGuruTarget(null)}
        title={assignGuruTarget ? `Atur Guru Pengampu — ${assignGuruTarget.mapel}` : ''}
        subtitle={`Periode ${selectedPeriod.label}`}
        maxWidthClass="max-w-lg"
      >
        {assignGuruTarget && (
          <form onSubmit={handleSaveAssignGuru} className="space-y-4">
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {periodGurus.map((g) => {
                const checked = assignGuruTarget.guruIds.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setAssignGuruTarget((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  guruIds: checked
                                    ? prev.guruIds.filter((id) => id !== g.id)
                                    : [...prev.guruIds, g.id],
                                }
                              : null
                          )
                        }
                        className="rounded border-slate-300 text-teal-700"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {g.nama}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          Saat ini mengampu: {g.mapelDiampu.join(', ') || 'Belum ada'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono-num text-slate-500 shrink-0">
                      Kls {g.kelasDiampu.join(', ') || '-'}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignGuruTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
              >
                Simpan Guru Pengampu
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
