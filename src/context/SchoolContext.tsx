// Konteks terpusat aplikasi Sistem Manajemen Sekolah SMPN Satu Atap Besakih

import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {createInitialSeedState} from '../data/seedData';
import {clearAllMediaFiles, compressImageToDataUrl} from '../services/mediaDb';
import {
  loadSavedSessionUserId,
  loadSavedTheme,
  localStorageAdapter,
  saveSessionUserId,
  saveTheme,
} from '../services/storageAdapter';
import {
  ActivityLog,
  AdminGuruEntry,
  Announcement,
  Building,
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
  Staf,
  StudentRaporExtras,
  UserAccount,
} from '../types/school';
import {ConfirmDialogModal, ConfirmDialogState, ToastContainer, ToastItem} from '../components/ui/ToastAndConfirm';

export interface CreatePeriodOptions {
  tahunAjaran: string;
  semester: SemesterType;
  setAsActive: boolean;
  copyFromPeriodId?: string;
  promoteClasses?: boolean;
}

interface SchoolContextValue {
  state: SchoolDatabaseState;
  currentUser: UserAccount | null;
  currentGuru: Guru | null;
  selectedPeriodId: string;
  setSelectedPeriodId: (periodId: string) => void;
  selectedPeriod: EducationPeriod;
  activePeriod: EducationPeriod;
  periodGurus: Guru[];
  periodSiswas: Siswa[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (username: string, password: string) => {ok: boolean; message?: string};
  logout: () => void;
  showToast: (message: string, type?: ToastItem['type']) => void;
  confirmDelete: (title: string, description: string, onConfirm: () => void, confirmLabel?: string) => void;
  updateLogoFromFile: (file: File) => Promise<void>;
  resetLogoToDefault: () => void;
  updateSchoolProfile: (patch: Partial<SchoolProfile>) => void;
  addLog: (action: ActivityLog['action'], entity: string, detail: string) => void;

  // Periode Pendidikan
  createPeriod: (opts: CreatePeriodOptions) => {ok: boolean; message?: string};
  setActivePeriod: (periodId: string) => void;
  deletePeriod: (periodId: string) => void;

  // Pengumuman
  saveAnnouncement: (item: Omit<Announcement, 'id'> & {id?: string}) => void;
  deleteAnnouncement: (id: string) => void;

  // Guru & Sertifikat Prestasi Guru & Kepala Sekolah & Staf
  saveGuru: (guru: Guru, isNew?: boolean) => void;
  deleteGuru: (guruId: string) => void;
  saveGuruCertificate: (cert: GuruCertificate, isNew?: boolean) => void;
  deleteGuruCertificate: (certId: string) => void;
  updateKepalaSekolah: (data: KepalaSekolah) => void;
  saveStaf: (staf: Staf, isNew?: boolean) => void;
  deleteStaf: (stafId: string) => void;

  // Siswa
  saveSiswa: (siswa: Siswa, isNew?: boolean) => void;
  deleteSiswa: (siswaId: string) => void;

  // Nilai, Ekstrakurikuler/Raport & Pengaturan Bobot/KKM
  upsertNilaiBatch: (records: NilaiRecord[], summaryDetail: string) => void;
  deleteNilaiRecord: (id: string) => void;
  upsertStudentRaporExtras: (item: StudentRaporExtras) => void;
  updateGradeSettings: (settings: GradeSettings) => void;

  // Administrasi Guru
  saveAdminGuruEntry: (entry: AdminGuruEntry, isNew?: boolean) => void;
  deleteAdminGuruEntry: (id: string) => void;
  addCustomAdminCategory: (categoryName: string) => void;

  // Sarana & Prasarana
  saveBuilding: (building: Building, isNew?: boolean) => void;
  deleteBuilding: (id: string) => void;
  saveAsset: (asset: SaranaAsset, isNew?: boolean) => void;
  deleteAsset: (id: string) => void;

  // Prestasi
  savePrestasi: (prestasi: Prestasi, isNew?: boolean) => void;
  deletePrestasi: (id: string) => void;

  // Manajemen Akun & Backup/Restore
  saveAccount: (account: UserAccount, isNew?: boolean) => void;
  deleteAccount: (userId: string) => void;
  restoreFromBackup: (newState: SchoolDatabaseState) => void;
  resetAllToSeed: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextValue | null>(null);

export const SchoolProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [state, setState] = useState<SchoolDatabaseState>(() =>
    localStorageAdapter.loadState(createInitialSeedState())
  );
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => loadSavedSessionUserId());
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => state.activePeriodId);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadSavedTheme());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Pastikan selectedPeriodId selalu valid jika periode berubah
  useEffect(() => {
    if (!state.periods.some((p) => p.id === selectedPeriodId)) {
      setSelectedPeriodId(state.activePeriodId || state.periods[0]?.id || '');
    }
  }, [state.periods, state.activePeriodId, selectedPeriodId]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    localStorageAdapter.saveState(state);
  }, [state]);

  const activePeriod = useMemo(() => {
    return (
      state.periods.find((p) => p.id === state.activePeriodId) ||
      state.periods.find((p) => p.aktif) ||
      state.periods[0]
    );
  }, [state.periods, state.activePeriodId]);

  const selectedPeriod = useMemo(() => {
    return state.periods.find((p) => p.id === selectedPeriodId) || activePeriod;
  }, [state.periods, selectedPeriodId, activePeriod]);

  const currentUser = useMemo(() => {
    if (!sessionUserId) return null;
    const found = state.accounts.find((a) => a.id === sessionUserId && a.active);
    return found || null;
  }, [sessionUserId, state.accounts]);

  const periodGurus = useMemo(() => {
    return state.gurus.filter((g) => g.periodId === selectedPeriod.id);
  }, [state.gurus, selectedPeriod.id]);

  const periodSiswas = useMemo(() => {
    return state.siswas.filter((s) => s.periodId === selectedPeriod.id);
  }, [state.siswas, selectedPeriod.id]);

  // Resolusi Guru untuk akun GURU yang sedang login pada periode yang dipilih
  const currentGuru = useMemo(() => {
    if (!currentUser || currentUser.role !== 'GURU') return null;
    const exactInPeriod = state.gurus.find(
      (g) =>
        g.periodId === selectedPeriod.id &&
        (g.userId === currentUser.id || g.id === currentUser.guruId)
    );
    if (exactInPeriod) return exactInPeriod;
    return (
      state.gurus.find((g) => g.userId === currentUser.id || g.id === currentUser.guruId) || null
    );
  }, [currentUser, state.gurus, selectedPeriod.id]);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, {id, type, message}]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirmDelete = useCallback(
    (title: string, description: string, onConfirm: () => void, confirmLabel?: string) => {
      setConfirmDialog({open: true, title, description, onConfirm, confirmLabel});
    },
    []
  );

  const appendLog = useCallback(
    (
      prev: SchoolDatabaseState,
      action: ActivityLog['action'],
      entity: string,
      detail: string,
      actorOverride?: UserAccount
    ): ActivityLog[] => {
      const actor = actorOverride || currentUser;
      const newLog: ActivityLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        userId: actor?.id || 'system',
        userName: actor?.namaLengkap || 'Sistem',
        role: actor?.role || 'ADMIN',
        action,
        entity,
        detail,
      };
      return [newLog, ...prev.activityLogs].slice(0, 200);
    },
    [currentUser]
  );

  const addLog = useCallback(
    (action: ActivityLog['action'], entity: string, detail: string) => {
      setState((prev) => ({
        ...prev,
        activityLogs: appendLog(prev, action, entity, detail),
      }));
    },
    [appendLog]
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const login = useCallback(
    (username: string, password: string) => {
      const trimmed = username.trim().toLowerCase();
      const found = state.accounts.find(
        (a) => a.username.toLowerCase() === trimmed && a.password === password
      );
      if (!found) {
        return {ok: false, message: 'Username atau kata sandi salah. Silakan periksa kembali.'};
      }
      if (!found.active) {
        return {ok: false, message: 'Akun ini sedang dinonaktifkan oleh Administrator.'};
      }
      setSessionUserId(found.id);
      saveSessionUserId(found.id);
      setSelectedPeriodId(state.activePeriodId);
      setState((prev) => ({
        ...prev,
        activityLogs: appendLog(
          prev,
          'LOGIN',
          'Autentikasi',
          `${found.namaLengkap} (${found.role}) masuk ke sistem.`,
          found
        ),
      }));
      showToast(`Selamat datang, ${found.namaLengkap}`, 'success');
      return {ok: true};
    },
    [state.accounts, state.activePeriodId, appendLog, showToast]
  );

  const logout = useCallback(() => {
    setSessionUserId(null);
    saveSessionUserId(null);
    showToast('Anda telah keluar dari sistem.', 'info');
  }, [showToast]);

  // === PERIODE PENDIDIKAN ===
  const createPeriod = useCallback(
    (opts: CreatePeriodOptions) => {
      const cleanYear = opts.tahunAjaran.trim();
      if (!cleanYear) {
        return {ok: false, message: 'Tahun ajaran wajib diisi (contoh: 2027/2028).'};
      }
      const duplicate = state.periods.some(
        (p) => p.tahunAjaran.toLowerCase() === cleanYear.toLowerCase() && p.semester === opts.semester
      );
      if (duplicate) {
        return {ok: false, message: `Periode ${cleanYear} · Semester ${opts.semester} sudah terdaftar.`};
      }

      const newId = `per-${cleanYear.replace(/[^0-9]/g, '-')}-${opts.semester}-${Date.now().toString().slice(-4)}`;
      const newPeriod: EducationPeriod = {
        id: newId,
        tahunAjaran: cleanYear,
        semester: opts.semester,
        label: `${cleanYear} · Semester ${opts.semester}`,
        aktif: opts.setAsActive,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => {
        const updatedPeriods = [
          newPeriod,
          ...prev.periods.map((p) => (opts.setAsActive ? {...p, aktif: false} : p)),
        ];

        let copiedGurus: Guru[] = [];
        let copiedSiswas: Siswa[] = [];

        if (opts.copyFromPeriodId) {
          copiedGurus = prev.gurus
            .filter((g) => g.periodId === opts.copyFromPeriodId)
            .map((g, idx) => ({
              ...g,
              id: `guru-${newId}-${idx + 1}`,
              periodId: newId,
              customFields: g.customFields.map((cf) => ({...cf})),
            }));

          const sourceSiswas = prev.siswas.filter((s) => s.periodId === opts.copyFromPeriodId);
          copiedSiswas = sourceSiswas
            .map((s, idx) => {
              let nextKelas: KelasLevel | null = s.kelas;
              if (opts.promoteClasses) {
                if (s.kelas === '7') nextKelas = '8';
                else if (s.kelas === '8') nextKelas = '9';
                else nextKelas = null; // Kelas 9 lulus
              }
              if (!nextKelas) return null;
              return {
                ...s,
                id: `sis-${newId}-${idx + 1}`,
                periodId: newId,
                kelas: nextKelas,
              };
            })
            .filter((x): x is Siswa => x !== null);
        }

        return {
          ...prev,
          periods: updatedPeriods,
          activePeriodId: opts.setAsActive ? newId : prev.activePeriodId,
          schoolProfile: opts.setAsActive
            ? {...prev.schoolProfile, tahunAjaranAktif: cleanYear}
            : prev.schoolProfile,
          gurus: [...prev.gurus, ...copiedGurus],
          siswas: [...prev.siswas, ...copiedSiswas],
          activityLogs: appendLog(
            prev,
            'TAMBAH',
            'Periode Pendidikan',
            `Membuat periode ${newPeriod.label}${opts.copyFromPeriodId ? ` (salin ${copiedGurus.length} guru & ${copiedSiswas.length} siswa)` : ''}.`
          ),
        };
      });

      setSelectedPeriodId(newId);
      showToast(`Periode pendidikan ${newPeriod.label} berhasil dibuat.`, 'success');
      return {ok: true};
    },
    [state.periods, appendLog, showToast]
  );

  const setActivePeriod = useCallback(
    (periodId: string) => {
      setState((prev) => {
        const target = prev.periods.find((p) => p.id === periodId);
        if (!target) return prev;
        return {
          ...prev,
          activePeriodId: periodId,
          periods: prev.periods.map((p) => ({...p, aktif: p.id === periodId})),
          schoolProfile: {...prev.schoolProfile, tahunAjaranAktif: target.tahunAjaran},
          activityLogs: appendLog(
            prev,
            'UBAH',
            'Periode Pendidikan',
            `Mengaktifkan periode ${target.label}.`
          ),
        };
      });
      setSelectedPeriodId(periodId);
      showToast('Periode aktif sekolah berhasil diperbarui.', 'success');
    },
    [appendLog, showToast]
  );

  const deletePeriod = useCallback(
    (periodId: string) => {
      if (state.periods.length <= 1) {
        showToast('Minimal harus ada 1 periode pendidikan yang tersimpan.', 'warning');
        return;
      }
      if (periodId === state.activePeriodId) {
        showToast('Tidak dapat menghapus periode yang sedang aktif. Aktifkan periode lain terlebih dahulu.', 'warning');
        return;
      }
      setState((prev) => {
        const target = prev.periods.find((p) => p.id === periodId);
        return {
          ...prev,
          periods: prev.periods.filter((p) => p.id !== periodId),
          gurus: prev.gurus.filter((g) => g.periodId !== periodId),
          siswas: prev.siswas.filter((s) => s.periodId !== periodId),
          nilaiRecords: prev.nilaiRecords.filter((n) => n.periodId !== periodId),
          studentRaporExtras: prev.studentRaporExtras.filter((r) => r.periodId !== periodId),
          adminGuruEntries: prev.adminGuruEntries.filter((e) => e.periodId !== periodId),
          activityLogs: appendLog(
            prev,
            'HAPUS',
            'Periode Pendidikan',
            `Menghapus periode historis ${target?.label || periodId} beserta datanya.`
          ),
        };
      });
      if (selectedPeriodId === periodId) {
        setSelectedPeriodId(state.activePeriodId);
      }
      showToast('Periode pendidikan berhasil dihapus.', 'info');
    },
    [state.periods.length, state.activePeriodId, selectedPeriodId, appendLog, showToast]
  );

  const updateLogoFromFile = useCallback(
    async (file: File) => {
      try {
        const dataUrl = await compressImageToDataUrl(file, 360, 0.9);
        setState((prev) => ({
          ...prev,
          schoolProfile: {...prev.schoolProfile, logoDataUrl: dataUrl},
          activityLogs: appendLog(prev, 'UBAH', 'Logo Sekolah', 'Memperbarui logo resmi sekolah.'),
        }));
        showToast('Logo sekolah berhasil diperbarui dan diterapkan di seluruh sistem.', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Gagal memproses gambar logo.', 'error');
      }
    },
    [appendLog, showToast]
  );

  const resetLogoToDefault = useCallback(() => {
    const seed = createInitialSeedState();
    setState((prev) => ({
      ...prev,
      schoolProfile: {...prev.schoolProfile, logoDataUrl: seed.schoolProfile.logoDataUrl},
      activityLogs: appendLog(prev, 'UBAH', 'Logo Sekolah', 'Mengembalikan logo sekolah ke logo bawaan.'),
    }));
    showToast('Logo sekolah dikembalikan ke logo bawaan.', 'info');
  }, [appendLog, showToast]);

  const updateSchoolProfile = useCallback(
    (patch: Partial<SchoolProfile>) => {
      setState((prev) => ({
        ...prev,
        schoolProfile: {...prev.schoolProfile, ...patch},
        activityLogs: appendLog(prev, 'UBAH', 'Profil Sekolah', 'Memperbarui identitas / visi-misi sekolah.'),
      }));
      showToast('Profil sekolah berhasil disimpan.', 'success');
    },
    [appendLog, showToast]
  );

  const saveAnnouncement = useCallback(
    (item: Omit<Announcement, 'id'> & {id?: string}) => {
      setState((prev) => {
        const exists = item.id && prev.announcements.some((a) => a.id === item.id);
        const targetId = item.id || `ann_${Date.now()}`;
        const fullItem: Announcement = {...item, id: targetId};
        const list = exists
          ? prev.announcements.map((a) => (a.id === targetId ? fullItem : a))
          : [fullItem, ...prev.announcements];
        return {
          ...prev,
          announcements: list,
          activityLogs: appendLog(
            prev,
            exists ? 'UBAH' : 'TAMBAH',
            'Pengumuman',
            `${exists ? 'Mengubah' : 'Menambah'} pengumuman: ${fullItem.judul}`
          ),
        };
      });
      showToast('Pengumuman berhasil disimpan.', 'success');
    },
    [appendLog, showToast]
  );

  const deleteAnnouncement = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.announcements.find((a) => a.id === id);
        return {
          ...prev,
          announcements: prev.announcements.filter((a) => a.id !== id),
          activityLogs: appendLog(prev, 'HAPUS', 'Pengumuman', `Menghapus pengumuman: ${target?.judul || id}`),
        };
      });
      showToast('Pengumuman berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const saveGuru = useCallback(
    (guru: Guru, isNew?: boolean) => {
      setState((prev) => {
        const targetGuru: Guru = {
          ...guru,
          periodId: guru.periodId || selectedPeriod.id,
        };
        const list = isNew
          ? [...prev.gurus, targetGuru]
          : prev.gurus.map((g) => (g.id === targetGuru.id ? targetGuru : g));
        const accounts = prev.accounts.map((acc) =>
          acc.guruId === targetGuru.id || (targetGuru.userId && acc.id === targetGuru.userId)
            ? {...acc, namaLengkap: targetGuru.nama}
            : acc
        );
        return {
          ...prev,
          gurus: list,
          accounts,
          activityLogs: appendLog(
            prev,
            isNew ? 'TAMBAH' : 'UBAH',
            'Data Guru',
            `${isNew ? 'Menambah' : 'Memperbarui'} data guru: ${targetGuru.nama} (${selectedPeriod.label})`
          ),
        };
      });
      showToast(`Data guru ${guru.nama} berhasil disimpan.`, 'success');
    },
    [appendLog, showToast, selectedPeriod]
  );

  const deleteGuru = useCallback(
    (guruId: string) => {
      setState((prev) => {
        const target = prev.gurus.find((g) => g.id === guruId);
        return {
          ...prev,
          gurus: prev.gurus.filter((g) => g.id !== guruId),
          activityLogs: appendLog(prev, 'HAPUS', 'Data Guru', `Menghapus data guru: ${target?.nama || guruId}`),
        };
      });
      showToast('Data guru berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const saveGuruCertificate = useCallback(
    (cert: GuruCertificate, isNew?: boolean) => {
      setState((prev) => ({
        ...prev,
        guruCertificates: isNew
          ? [cert, ...prev.guruCertificates]
          : prev.guruCertificates.map((c) => (c.id === cert.id ? cert : c)),
        activityLogs: appendLog(
          prev,
          isNew ? 'TAMBAH' : 'UBAH',
          'Sertifikat Prestasi Guru',
          `${isNew ? 'Mengunggah' : 'Memperbarui'} sertifikat "${cert.judul}" (${cert.tingkat} · ${cert.tahun}).`
        ),
      }));
      showToast('Sertifikat prestasi berhasil disimpan.', 'success');
    },
    [appendLog, showToast]
  );

  const deleteGuruCertificate = useCallback(
    (certId: string) => {
      setState((prev) => {
        const target = prev.guruCertificates.find((c) => c.id === certId);
        return {
          ...prev,
          guruCertificates: prev.guruCertificates.filter((c) => c.id !== certId),
          activityLogs: appendLog(
            prev,
            'HAPUS',
            'Sertifikat Prestasi Guru',
            `Menghapus sertifikat "${target?.judul || certId}".`
          ),
        };
      });
      showToast('Sertifikat prestasi berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const updateKepalaSekolah = useCallback(
    (data: KepalaSekolah) => {
      setState((prev) => ({
        ...prev,
        kepalaSekolah: data,
        activityLogs: appendLog(prev, 'UBAH', 'Kepala Sekolah', `Memperbarui profil Kepala Sekolah (${data.nama}).`),
      }));
      showToast('Profil Kepala Sekolah berhasil diperbarui.', 'success');
    },
    [appendLog, showToast]
  );

  const saveStaf = useCallback(
    (staf: Staf, isNew?: boolean) => {
      setState((prev) => ({
        ...prev,
        stafs: isNew ? [...prev.stafs, staf] : prev.stafs.map((s) => (s.id === staf.id ? staf : s)),
        activityLogs: appendLog(
          prev,
          isNew ? 'TAMBAH' : 'UBAH',
          'Data Staf',
          `${isNew ? 'Menambah' : 'Memperbarui'} data staf: ${staf.nama}`
        ),
      }));
      showToast(`Data staf ${staf.nama} berhasil disimpan.`, 'success');
    },
    [appendLog, showToast]
  );

  const deleteStaf = useCallback(
    (stafId: string) => {
      setState((prev) => {
        const target = prev.stafs.find((s) => s.id === stafId);
        return {
          ...prev,
          stafs: prev.stafs.filter((s) => s.id !== stafId),
          activityLogs: appendLog(prev, 'HAPUS', 'Data Staf', `Menghapus data staf: ${target?.nama || stafId}`),
        };
      });
      showToast('Data staf berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const saveSiswa = useCallback(
    (siswa: Siswa, isNew?: boolean) => {
      setState((prev) => {
        const targetSiswa: Siswa = {
          ...siswa,
          periodId: siswa.periodId || selectedPeriod.id,
        };
        return {
          ...prev,
          siswas: isNew
            ? [...prev.siswas, targetSiswa]
            : prev.siswas.map((s) => (s.id === targetSiswa.id ? targetSiswa : s)),
          activityLogs: appendLog(
            prev,
            isNew ? 'TAMBAH' : 'UBAH',
            'Data Siswa',
            `${isNew ? 'Menambah' : 'Memperbarui'} siswa: ${targetSiswa.nama} (Kelas ${targetSiswa.kelas} · ${selectedPeriod.label})`
          ),
        };
      });
      showToast(`Data siswa ${siswa.nama} berhasil disimpan.`, 'success');
    },
    [appendLog, showToast, selectedPeriod]
  );

  const deleteSiswa = useCallback(
    (siswaId: string) => {
      setState((prev) => {
        const target = prev.siswas.find((s) => s.id === siswaId);
        return {
          ...prev,
          siswas: prev.siswas.filter((s) => s.id !== siswaId),
          nilaiRecords: prev.nilaiRecords.filter((n) => n.siswaId !== siswaId),
          studentRaporExtras: prev.studentRaporExtras.filter((r) => r.siswaId !== siswaId),
          activityLogs: appendLog(prev, 'HAPUS', 'Data Siswa', `Menghapus siswa: ${target?.nama || siswaId}`),
        };
      });
      showToast('Data siswa berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const upsertNilaiBatch = useCallback(
    (records: NilaiRecord[], summaryDetail: string) => {
      setState((prev) => {
        const map = new Map(prev.nilaiRecords.map((r) => [r.id, r]));
        records.forEach((rec) => {
          map.set(rec.id, rec);
        });
        return {
          ...prev,
          nilaiRecords: Array.from(map.values()),
          activityLogs: appendLog(prev, 'UBAH', 'Nilai Siswa', summaryDetail),
        };
      });
      showToast('Nilai siswa berhasil disimpan.', 'success');
    },
    [appendLog, showToast]
  );

  const deleteNilaiRecord = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        nilaiRecords: prev.nilaiRecords.filter((n) => n.id !== id),
        activityLogs: appendLog(prev, 'HAPUS', 'Nilai Siswa', `Menghapus entri nilai (${id}).`),
      }));
      showToast('Data nilai berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const upsertStudentRaporExtras = useCallback(
    (item: StudentRaporExtras) => {
      setState((prev) => {
        const exists = prev.studentRaporExtras.some((r) => r.id === item.id);
        return {
          ...prev,
          studentRaporExtras: exists
            ? prev.studentRaporExtras.map((r) => (r.id === item.id ? item : r))
            : [...prev.studentRaporExtras, item],
          activityLogs: appendLog(
            prev,
            exists ? 'UBAH' : 'TAMBAH',
            'Ekstrakurikuler & Catatan Raport',
            `Memperbarui nilai ekstrakurikuler dan catatan raport siswa (${item.siswaId}).`
          ),
        };
      });
      showToast('Nilai ekstrakurikuler & catatan raport berhasil disimpan.', 'success');
    },
    [appendLog, showToast]
  );

  const updateGradeSettings = useCallback(
    (settings: GradeSettings) => {
      setState((prev) => ({
        ...prev,
        gradeSettings: settings,
        activityLogs: appendLog(prev, 'UBAH', 'Pengaturan Nilai', 'Memperbarui bobot nilai atau KKM mata pelajaran.'),
      }));
      showToast('Pengaturan bobot dan KKM berhasil disimpan.', 'success');
    },
    [appendLog, showToast]
  );

  const saveAdminGuruEntry = useCallback(
    (entry: AdminGuruEntry, isNew?: boolean) => {
      setState((prev) => ({
        ...prev,
        adminGuruEntries: isNew
          ? [entry, ...prev.adminGuruEntries]
          : prev.adminGuruEntries.map((e) => (e.id === entry.id ? entry : e)),
        activityLogs: appendLog(
          prev,
          isNew ? 'TAMBAH' : 'UBAH',
          'Administrasi Guru',
          `${isNew ? 'Mengunggah' : 'Memperbarui'} dokumen "${entry.judul}" (${entry.kategori} · ${entry.tahunAjaran} ${entry.semester}).`
        ),
      }));
      showToast('Dokumen administrasi guru berhasil disimpan.', 'success');
    },
    [appendLog, showToast]
  );

  const deleteAdminGuruEntry = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.adminGuruEntries.find((e) => e.id === id);
        return {
          ...prev,
          adminGuruEntries: prev.adminGuruEntries.filter((e) => e.id !== id),
          activityLogs: appendLog(prev, 'HAPUS', 'Administrasi Guru', `Menghapus dokumen "${target?.judul || id}".`),
        };
      });
      showToast('Dokumen administrasi berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const addCustomAdminCategory = useCallback(
    (categoryName: string) => {
      const clean = categoryName.trim();
      if (!clean) return;
      setState((prev) => {
        if (prev.customAdminCategories.includes(clean)) return prev;
        return {
          ...prev,
          customAdminCategories: [...prev.customAdminCategories, clean],
          activityLogs: appendLog(prev, 'TAMBAH', 'Kategori Administrasi', `Menambah kategori baru: ${clean}`),
        };
      });
      showToast(`Kategori "${clean}" ditambahkan.`, 'success');
    },
    [appendLog, showToast]
  );

  const saveBuilding = useCallback(
    (building: Building, isNew?: boolean) => {
      setState((prev) => ({
        ...prev,
        buildings: isNew
          ? [...prev.buildings, building]
          : prev.buildings.map((b) => (b.id === building.id ? building : b)),
        activityLogs: appendLog(
          prev,
          isNew ? 'TAMBAH' : 'UBAH',
          'Sarpras Gedung',
          `${isNew ? 'Menambah' : 'Memperbarui'} gedung: ${building.nama}`
        ),
      }));
      showToast(`Data gedung ${building.nama} berhasil disimpan.`, 'success');
    },
    [appendLog, showToast]
  );

  const deleteBuilding = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.buildings.find((b) => b.id === id);
        return {
          ...prev,
          buildings: prev.buildings.filter((b) => b.id !== id),
          assets: prev.assets.filter((a) => a.buildingId !== id),
          activityLogs: appendLog(prev, 'HAPUS', 'Sarpras Gedung', `Menghapus gedung: ${target?.nama || id}`),
        };
      });
      showToast('Gedung dan aset terkait berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const saveAsset = useCallback(
    (asset: SaranaAsset, isNew?: boolean) => {
      setState((prev) => ({
        ...prev,
        assets: isNew ? [...prev.assets, asset] : prev.assets.map((a) => (a.id === asset.id ? asset : a)),
        activityLogs: appendLog(
          prev,
          isNew ? 'TAMBAH' : 'UBAH',
          'Sarpras Aset',
          `${isNew ? 'Menambah' : 'Memperbarui'} aset: ${asset.namaAset}`
        ),
      }));
      showToast(`Data aset ${asset.namaAset} berhasil disimpan.`, 'success');
    },
    [appendLog, showToast]
  );

  const deleteAsset = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.assets.find((a) => a.id === id);
        return {
          ...prev,
          assets: prev.assets.filter((a) => a.id !== id),
          activityLogs: appendLog(prev, 'HAPUS', 'Sarpras Aset', `Menghapus aset: ${target?.namaAset || id}`),
        };
      });
      showToast('Data aset berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const savePrestasi = useCallback(
    (prestasi: Prestasi, isNew?: boolean) => {
      setState((prev) => ({
        ...prev,
        prestasis: isNew
          ? [prestasi, ...prev.prestasis]
          : prev.prestasis.map((p) => (p.id === prestasi.id ? prestasi : p)),
        activityLogs: appendLog(
          prev,
          isNew ? 'TAMBAH' : 'UBAH',
          'Prestasi',
          `${isNew ? 'Menambah' : 'Memperbarui'} prestasi: ${prestasi.judul}`
        ),
      }));
      showToast('Data prestasi berhasil disimpan.', 'success');
    },
    [appendLog, showToast]
  );

  const deletePrestasi = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.prestasis.find((p) => p.id === id);
        return {
          ...prev,
          prestasis: prev.prestasis.filter((p) => p.id !== id),
          activityLogs: appendLog(prev, 'HAPUS', 'Prestasi', `Menghapus prestasi: ${target?.judul || id}`),
        };
      });
      showToast('Data prestasi berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const saveAccount = useCallback(
    (account: UserAccount, isNew?: boolean) => {
      setState((prev) => ({
        ...prev,
        accounts: isNew
          ? [...prev.accounts, account]
          : prev.accounts.map((a) => (a.id === account.id ? account : a)),
        activityLogs: appendLog(
          prev,
          isNew ? 'TAMBAH' : 'UBAH',
          'Akun Pengguna',
          `${isNew ? 'Membuat' : 'Memperbarui'} akun: ${account.username} (${account.role})`
        ),
      }));
      showToast(`Akun ${account.username} berhasil disimpan.`, 'success');
    },
    [appendLog, showToast]
  );

  const deleteAccount = useCallback(
    (userId: string) => {
      setState((prev) => {
        const target = prev.accounts.find((a) => a.id === userId);
        return {
          ...prev,
          accounts: prev.accounts.filter((a) => a.id !== userId),
          activityLogs: appendLog(prev, 'HAPUS', 'Akun Pengguna', `Menghapus akun: ${target?.username || userId}`),
        };
      });
      showToast('Akun pengguna berhasil dihapus.', 'info');
    },
    [appendLog, showToast]
  );

  const restoreFromBackup = useCallback(
    (newState: SchoolDatabaseState) => {
      const restoreLog: ActivityLog = {
        id: `log_restore_${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'usr-admin',
        userName: currentUser?.namaLengkap || 'Administrator',
        role: 'ADMIN',
        action: 'RESTORE',
        entity: 'Database Sistem',
        detail: 'Melakukan pemulihan (restore) seluruh data sekolah dari berkas JSON.',
      };
      setState({
        ...newState,
        activityLogs: [restoreLog, ...(newState.activityLogs || [])].slice(0, 200),
      });
      showToast('Seluruh data berhasil dipulihkan dari file backup.', 'success');
    },
    [currentUser, showToast]
  );

  const resetAllToSeed = useCallback(async () => {
    await clearAllMediaFiles();
    localStorageAdapter.clearState();
    const fresh = createInitialSeedState();
    setState(fresh);
    setSelectedPeriodId(fresh.activePeriodId);
    showToast('Seluruh data berhasil direset ke data awal bawaan.', 'info');
  }, [showToast]);

  const value: SchoolContextValue = {
    state,
    currentUser,
    currentGuru,
    selectedPeriodId,
    setSelectedPeriodId,
    selectedPeriod,
    activePeriod,
    periodGurus,
    periodSiswas,
    theme,
    toggleTheme,
    login,
    logout,
    showToast,
    confirmDelete,
    updateLogoFromFile,
    resetLogoToDefault,
    updateSchoolProfile,
    addLog,
    createPeriod,
    setActivePeriod,
    deletePeriod,
    saveAnnouncement,
    deleteAnnouncement,
    saveGuru,
    deleteGuru,
    saveGuruCertificate,
    deleteGuruCertificate,
    updateKepalaSekolah,
    saveStaf,
    deleteStaf,
    saveSiswa,
    deleteSiswa,
    upsertNilaiBatch,
    deleteNilaiRecord,
    upsertStudentRaporExtras,
    updateGradeSettings,
    saveAdminGuruEntry,
    deleteAdminGuruEntry,
    addCustomAdminCategory,
    saveBuilding,
    deleteBuilding,
    saveAsset,
    deleteAsset,
    savePrestasi,
    deletePrestasi,
    saveAccount,
    deleteAccount,
    restoreFromBackup,
    resetAllToSeed,
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialogModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog((prev) => ({...prev, open: false}))}
      />
    </SchoolContext.Provider>
  );
};

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool harus digunakan di dalam SchoolProvider');
  return ctx;
}
