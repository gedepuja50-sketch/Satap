// Halaman 6: Input & Rekap Nilai Siswa per Periode Pendidikan (Tahun & Semester)
// Mendukung 10+ kolom Nilai Tugas (T1-T10), Penilaian Harian (H1-Hn), UTS/UAS, Catatan Guru,
// Nilai Ekstrakurikuler & Catatan Wali, hak akses per mapel guru, serta ekspor PDF & Excel.

import React, {useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Edit3,
  FileDown,
  FileSpreadsheet,
  Layers,
  Lock,
  MessageSquareText,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {
  EkskulItem,
  KelasLevel,
  NilaiRecord,
  Siswa,
  StudentRaporExtras,
} from '../types/school';
import {
  exportClassRaporExcel,
  exportClassRaporPdf,
  exportNilaiExcel,
  exportNilaiPdf,
  exportStudentRaporPdf,
  NilaiRowExport,
} from '../utils/exportUtils';
import {
  evaluateStudentPromotionStatus,
  getPredikatNilai,
  hitungRataDaftar,
  hitungRataRata,
  StudentPromotionResult,
} from '../utils/gradeUtils';
import {EmptyState, Modal} from '../components/ui/AvatarAndModal';

type NilaiSubTab =
  | 'ringkasan'
  | 'tugas'
  | 'keseharian'
  | 'ujian-catatan'
  | 'ekskul'
  | 'nilai-akhir-ekskul';

interface EditableScores {
  tugasList: string[];
  keseharianList: string[];
  uts: string;
  uas: string;
  catatanGuru: string;
}

const PRESET_EKSKUL = [
  'Pramuka',
  'Seni Tari & Tabuh Bali',
  'Pencak Silat',
  'PMR (Palang Merah Remaja)',
  'Klub Sains & Informatika',
  'Bola Voli / Futsal',
  'Musik / Paduan Suara',
];

const PREDIKAT_EKSKUL: EkskulItem['predikat'][] = [
  'A (Sangat Baik)',
  'B (Baik)',
  'C (Cukup)',
  'D (Perlu Bimbingan)',
];

function padStringList(values: Array<number | null> | undefined, fallbackSingle: number | null | undefined, minLen: number): string[] {
  const arr: string[] = Array.from({length: minLen}, () => '');
  if (Array.isArray(values) && values.length > 0) {
    values.forEach((v, idx) => {
      if (idx < arr.length) {
        arr[idx] = v !== null && v !== undefined ? String(v) : '';
      } else {
        arr.push(v !== null && v !== undefined ? String(v) : '');
      }
    });
  } else if (fallbackSingle !== null && fallbackSingle !== undefined) {
    arr[0] = String(fallbackSingle);
  }
  return arr;
}

export const NilaiSiswaPage: React.FC = () => {
  const {
    state,
    currentUser,
    currentGuru,
    selectedPeriodId,
    setSelectedPeriodId,
    selectedPeriod,
    periodGurus,
    periodSiswas,
    upsertNilaiBatch,
    upsertStudentRaporExtras,
    updateGradeSettings,
    showToast,
    addLog,
  } = useSchool();

  const isAdmin = currentUser?.role === 'ADMIN';
  const {nilaiRecords, studentRaporExtras, gradeSettings, schoolProfile, periods, subjects} = state;

  const defaultMapel =
    currentGuru && currentGuru.mapelDiampu.length > 0 ? currentGuru.mapelDiampu[0] : subjects[0] || '';

  const [activeSubTab, setActiveSubTab] = useState<NilaiSubTab>('ringkasan');
  const [selectedKelas, setSelectedKelas] = useState<KelasLevel>('7');
  const [selectedMapel, setSelectedMapel] = useState<string>(defaultMapel);
  const [tugasColCount, setTugasColCount] = useState<number>(10);
  const [harianColCount, setHarianColCount] = useState<number>(10);
  const [draftScores, setDraftScores] = useState<Record<string, EditableScores>>({});
  const [kkmModalOpen, setKkmModalOpen] = useState(false);
  const [kkmDraft, setKkmDraft] = useState<number>(gradeSettings.kkmPerMapel[defaultMapel] ?? 75);

  // State modal Ekstrakurikuler & Catatan Wali
  const [ekskulModalSiswa, setEkskulModalSiswa] = useState<Siswa | null>(null);
  const [ekskulItemsDraft, setEkskulItemsDraft] = useState<EkskulItem[]>([]);
  const [sakitDraft, setSakitDraft] = useState<number>(0);
  const [izinDraft, setIzinDraft] = useState<number>(0);
  const [alpaDraft, setAlpaDraft] = useState<number>(0);
  const [catatanWaliDraft, setCatatanWaliDraft] = useState<string>('');
  const [selectedCombinedSiswaId, setSelectedCombinedSiswaId] = useState<string>('');

  const canEditMapel = useMemo(() => {
    if (isAdmin) return true;
    if (!currentGuru) return false;
    return currentGuru.mapelDiampu.includes(selectedMapel);
  }, [isAdmin, currentGuru, selectedMapel]);

  const guruPengampu = useMemo(() => {
    return (
      periodGurus.find((g) => g.mapelDiampu.includes(selectedMapel)) ||
      (currentGuru && currentGuru.mapelDiampu.includes(selectedMapel) ? currentGuru : undefined)
    );
  }, [periodGurus, selectedMapel, currentGuru]);

  const siswaKelas = useMemo(
    () => periodSiswas.filter((s) => s.kelas === selectedKelas),
    [periodSiswas, selectedKelas]
  );

  useEffect(() => {
    let maxTugas = 10;
    let maxHarian = 10;

    siswaKelas.forEach((s) => {
      const rec = nilaiRecords.find(
        (n) =>
          n.periodId === selectedPeriod.id &&
          n.siswaId === s.id &&
          n.mapel === selectedMapel
      );
      if (rec?.tugasList && rec.tugasList.length > maxTugas) maxTugas = rec.tugasList.length;
      if (rec?.keseharianList && rec.keseharianList.length > maxHarian) maxHarian = rec.keseharianList.length;
    });

    setTugasColCount(maxTugas);
    setHarianColCount(maxHarian);

    const nextDraft: Record<string, EditableScores> = {};
    siswaKelas.forEach((s) => {
      const rec = nilaiRecords.find(
        (n) =>
          n.periodId === selectedPeriod.id &&
          n.siswaId === s.id &&
          n.mapel === selectedMapel
      );
      nextDraft[s.id] = {
        tugasList: padStringList(rec?.tugasList, rec?.tugas, maxTugas),
        keseharianList: padStringList(rec?.keseharianList, rec?.keseharian, maxHarian),
        uts: rec?.uts !== null && rec?.uts !== undefined ? String(rec.uts) : '',
        uas: rec?.uas !== null && rec?.uas !== undefined ? String(rec.uas) : '',
        catatanGuru: rec?.catatanGuru || '',
      };
    });
    setDraftScores(nextDraft);
    setKkmDraft(gradeSettings.kkmPerMapel[selectedMapel] ?? 75);
    setSelectedCombinedSiswaId((prev) =>
      siswaKelas.some((s) => s.id === prev) ? prev : siswaKelas[0]?.id || ''
    );
  }, [siswaKelas, nilaiRecords, selectedPeriod.id, selectedMapel, gradeSettings.kkmPerMapel]);

  const activeKkm = gradeSettings.kkmPerMapel[selectedMapel] ?? 75;

  const parseScore = (val: string): number | null => {
    const trimmed = val.trim();
    if (trimmed === '') return null;
    const num = Number(trimmed);
    if (Number.isNaN(num)) return null;
    return Math.max(0, Math.min(100, num));
  };

  const isValidScoreInput = (value: string) => {
    if (value === '') return true;
    if (!/^\d{0,3}(\.\d{0,1})?$/.test(value)) return false;
    return Number(value) <= 100;
  };

  const handleArrayScoreChange = (
    siswaId: string,
    listKey: 'tugasList' | 'keseharianList',
    index: number,
    value: string
  ) => {
    if (!canEditMapel || !isValidScoreInput(value)) return;
    setDraftScores((prev) => {
      const curr = prev[siswaId] || {
        tugasList: Array.from({length: tugasColCount}, () => ''),
        keseharianList: Array.from({length: harianColCount}, () => ''),
        uts: '',
        uas: '',
        catatanGuru: '',
      };
      const nextList = [...curr[listKey]];
      while (nextList.length <= index) nextList.push('');
      nextList[index] = value;
      return {
        ...prev,
        [siswaId]: {
          ...curr,
          [listKey]: nextList,
        },
      };
    });
  };

  const handleScalarChange = (
    siswaId: string,
    field: 'uts' | 'uas' | 'catatanGuru',
    value: string
  ) => {
    if (!canEditMapel) return;
    if ((field === 'uts' || field === 'uas') && !isValidScoreInput(value)) return;
    setDraftScores((prev) => {
      const curr = prev[siswaId] || {
        tugasList: Array.from({length: tugasColCount}, () => ''),
        keseharianList: Array.from({length: harianColCount}, () => ''),
        uts: '',
        uas: '',
        catatanGuru: '',
      };
      return {
        ...prev,
        [siswaId]: {
          ...curr,
          [field]: value,
        },
      };
    });
  };

  const handleAddTugasColumn = () => {
    const next = tugasColCount + 1;
    setTugasColCount(next);
    setDraftScores((prev) => {
      const updated: Record<string, EditableScores> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const list = [...v.tugasList];
        while (list.length < next) list.push('');
        updated[k] = {...v, tugasList: list};
      });
      return updated;
    });
  };

  const handleAddHarianColumn = () => {
    const next = harianColCount + 1;
    setHarianColCount(next);
    setDraftScores((prev) => {
      const updated: Record<string, EditableScores> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const list = [...v.keseharianList];
        while (list.length < next) list.push('');
        updated[k] = {...v, keseharianList: list};
      });
      return updated;
    });
  };

  const computedRows: Array<
    NilaiRowExport & {
      siswaId: string;
      catatanGuru: string;
      tugasTerisi: number;
      harianTerisi: number;
    }
  > = useMemo(() => {
    return siswaKelas.map((s, idx) => {
      const d = draftScores[s.id];
      const tugasNums = (d?.tugasList || []).map(parseScore);
      const harianNums = (d?.keseharianList || []).map(parseScore);
      const tugas = hitungRataDaftar(tugasNums);
      const keseharian = hitungRataDaftar(harianNums);
      const uts = parseScore(d?.uts || '');
      const uas = parseScore(d?.uas || '');
      const avg = hitungRataRata({tugas, keseharian, uts, uas}, gradeSettings);

      return {
        siswaId: s.id,
        no: idx + 1,
        nis: s.nis,
        nama: s.nama,
        tugas,
        keseharian,
        uts,
        uas,
        rataRata: avg,
        tuntas: avg !== null ? avg >= activeKkm : null,
        catatanGuru: d?.catatanGuru || '',
        tugasTerisi: tugasNums.filter((n) => n !== null).length,
        harianTerisi: harianNums.filter((n) => n !== null).length,
      };
    });
  }, [siswaKelas, draftScores, gradeSettings, activeKkm]);

  // Evaluasi status kenaikan kelas / kelulusan otomatis (hanya berlaku di Semester Genap)
  // Versi live menggabungkan draftScores mapel aktif agar perubahan nilai langsung terlihat sebelum disimpan
  const livePromotionMap = useMemo(() => {
    const mergedRecords = nilaiRecords.filter(
      (n) =>
        !(
          n.periodId === selectedPeriod.id &&
          n.mapel === selectedMapel &&
          siswaKelas.some((s) => s.id === n.siswaId)
        )
    );
    siswaKelas.forEach((s) => {
      const d = draftScores[s.id];
      const tugasNums = (d?.tugasList || []).map(parseScore);
      const harianNums = (d?.keseharianList || []).map(parseScore);
      mergedRecords.push({
        id: `live-${selectedPeriod.id}-${s.id}-${selectedMapel}`,
        periodId: selectedPeriod.id,
        siswaId: s.id,
        kelas: selectedKelas,
        mapel: selectedMapel,
        semester: selectedPeriod.semester,
        tahunAjaran: selectedPeriod.tahunAjaran,
        tugasList: tugasNums,
        keseharianList: harianNums,
        tugas: hitungRataDaftar(tugasNums),
        keseharian: hitungRataDaftar(harianNums),
        uts: parseScore(d?.uts || ''),
        uas: parseScore(d?.uas || ''),
        catatanGuru: d?.catatanGuru || '',
        updatedBy: currentUser?.namaLengkap || 'Guru',
        updatedAt: '',
      });
    });

    const map: Record<string, StudentPromotionResult> = {};
    siswaKelas.forEach((s) => {
      map[s.id] = evaluateStudentPromotionStatus(
        s,
        selectedPeriod,
        subjects,
        mergedRecords,
        gradeSettings
      );
    });
    return map;
  }, [
    nilaiRecords,
    selectedPeriod,
    selectedMapel,
    selectedKelas,
    siswaKelas,
    draftScores,
    subjects,
    gradeSettings,
    currentUser,
  ]);

  // Versi tersimpan untuk tab gabungan 1 kertas PDF & pratinjau rapor
  const savedPromotionMap = useMemo(() => {
    const map: Record<string, StudentPromotionResult> = {};
    siswaKelas.forEach((s) => {
      map[s.id] = evaluateStudentPromotionStatus(
        s,
        selectedPeriod,
        subjects,
        nilaiRecords,
        gradeSettings
      );
    });
    return map;
  }, [siswaKelas, selectedPeriod, subjects, nilaiRecords, gradeSettings]);

  const promotionSummaryCounts = useMemo(() => {
    const sourceMap =
      activeSubTab === 'nilai-akhir-ekskul' ? savedPromotionMap : livePromotionMap;
    const list = Object.values(sourceMap);
    return {
      memenuhi: list.filter((p) => p.code === 'NAIK_KELAS' || p.code === 'LULUS').length,
      belumMemenuhi: list.filter((p) => p.code === 'BELUM_MEMENUHI').length,
      belumLengkap: list.filter((p) => p.code === 'BELUM_LENGKAP').length,
    };
  }, [activeSubTab, savedPromotionMap, livePromotionMap]);

  const handleSaveAll = () => {
    if (!canEditMapel) {
      showToast('Anda hanya dapat mengubah nilai pada mata pelajaran yang Anda ampu.', 'warning');
      return;
    }
    const now = new Date().toISOString();
    const pengampuId = currentGuru?.id || guruPengampu?.id;
    const pengampuNama = currentGuru?.nama || guruPengampu?.nama || currentUser?.namaLengkap;

    const batch: NilaiRecord[] = siswaKelas.map((s) => {
      const d = draftScores[s.id];
      const tugasNums = (d?.tugasList || []).map(parseScore);
      const harianNums = (d?.keseharianList || []).map(parseScore);
      const avgTugas = hitungRataDaftar(tugasNums);
      const avgHarian = hitungRataDaftar(harianNums);

      return {
        id: `nil-${selectedPeriod.id}-${s.id}-${selectedMapel}`,
        periodId: selectedPeriod.id,
        siswaId: s.id,
        kelas: selectedKelas,
        mapel: selectedMapel,
        semester: selectedPeriod.semester,
        tahunAjaran: selectedPeriod.tahunAjaran,
        guruPengampuId: pengampuId,
        guruPengampuNama: pengampuNama,
        tugasList: tugasNums,
        keseharianList: harianNums,
        tugas: avgTugas,
        keseharian: avgHarian,
        uts: parseScore(d?.uts || ''),
        uas: parseScore(d?.uas || ''),
        catatanGuru: (d?.catatanGuru || '').trim(),
        updatedBy: currentUser?.namaLengkap || 'Guru',
        updatedAt: now,
      };
    });

    upsertNilaiBatch(
      batch,
      `Menyimpan nilai Tugas, Harian, UTS/UAS & Catatan Guru ${selectedMapel} Kelas ${selectedKelas} (${selectedPeriod.label}).`
    );
  };

  const handleSaveKkm = (e: React.FormEvent) => {
    e.preventDefault();
    const clamped = Math.max(0, Math.min(100, Number(kkmDraft) || 75));
    updateGradeSettings({
      ...gradeSettings,
      kkmPerMapel: {
        ...gradeSettings.kkmPerMapel,
        [selectedMapel]: clamped,
      },
    });
    setKkmModalOpen(false);
  };

  const handleDownloadPdf = async () => {
    await exportNilaiPdf(
      selectedKelas,
      selectedMapel,
      selectedPeriod.semester,
      computedRows,
      activeKkm,
      schoolProfile,
      selectedPeriod.tahunAjaran,
      guruPengampu?.nama
    );
    addLog(
      'EXPORT',
      'Nilai PDF',
      `Mengunduh PDF nilai ${selectedMapel} Kelas ${selectedKelas} (${selectedPeriod.label}).`
    );
    showToast('File PDF nilai berhasil diunduh.', 'success');
  };

  const handleDownloadExcel = () => {
    exportNilaiExcel(
      selectedKelas,
      selectedMapel,
      selectedPeriod.semester,
      computedRows,
      activeKkm,
      selectedPeriod.tahunAjaran,
      guruPengampu?.nama
    );
    addLog(
      'EXPORT',
      'Nilai Excel',
      `Mengunduh Excel nilai ${selectedMapel} Kelas ${selectedKelas} (${selectedPeriod.label}).`
    );
    showToast('File Excel (.xlsx) nilai berhasil diunduh.', 'success');
  };

  // Unduh Gabungan Nilai Akhir (Semua Mapel) + Ekstrakurikuler dalam 1 Kertas PDF per Siswa
  const handleDownloadStudentCombinedPdf = async (siswa: Siswa) => {
    await exportStudentRaporPdf(
      siswa,
      selectedPeriod,
      schoolProfile,
      nilaiRecords,
      studentRaporExtras,
      gradeSettings,
      state.kepalaSekolah,
      subjects,
      {
        headingTitle: 'LAPORAN NILAI AKHIR & EKSTRAKURIKULER SISWA',
        filePrefix: 'Nilai_Akhir_Ekskul',
      }
    );
    addLog(
      'EXPORT',
      'Nilai Akhir + Ekskul PDF',
      `Mengunduh gabungan Nilai Akhir semua mapel & Ekskul (1 kertas PDF) untuk ${siswa.nama} (${selectedPeriod.label}).`
    );
    showToast(`Nilai Akhir & Ekskul ${siswa.nama} (1 kertas PDF) berhasil diunduh.`, 'success');
  };

  const handleDownloadClassCombinedPdf = async () => {
    if (siswaKelas.length === 0) return;
    await exportClassRaporPdf(
      selectedKelas,
      siswaKelas,
      selectedPeriod,
      schoolProfile,
      nilaiRecords,
      studentRaporExtras,
      gradeSettings,
      state.kepalaSekolah,
      subjects,
      {
        headingTitle: 'LAPORAN NILAI AKHIR & EKSTRAKURIKULER SISWA',
        filePrefix: 'Nilai_Akhir_Ekskul',
      }
    );
    addLog(
      'EXPORT',
      'Nilai Akhir + Ekskul Kelas PDF',
      `Mengunduh PDF gabungan Nilai Akhir + Ekskul seluruh siswa Kelas ${selectedKelas} (${selectedPeriod.label}).`
    );
    showToast(
      `PDF Nilai Akhir & Ekskul Kelas ${selectedKelas} (1 kertas per siswa) berhasil diunduh.`,
      'success'
    );
  };

  const handleDownloadClassCombinedExcel = () => {
    if (siswaKelas.length === 0) return;
    exportClassRaporExcel(
      selectedKelas,
      siswaKelas,
      selectedPeriod,
      nilaiRecords,
      studentRaporExtras,
      gradeSettings,
      subjects
    );
    addLog(
      'EXPORT',
      'Nilai Akhir + Ekskul Excel',
      `Mengunduh rekap Excel Nilai Akhir + Ekskul Kelas ${selectedKelas} (${selectedPeriod.label}).`
    );
    showToast(`Rekap Excel Nilai Akhir & Ekskul Kelas ${selectedKelas} berhasil diunduh.`, 'success');
  };

  // Helper Ekstrakurikuler & Catatan Wali
  const getStudentExtras = (siswaId: string): StudentRaporExtras | undefined => {
    return studentRaporExtras.find(
      (r) => r.periodId === selectedPeriod.id && r.siswaId === siswaId
    );
  };

  const openEkskulModal = (siswa: Siswa) => {
    const existing = getStudentExtras(siswa.id);
    setEkskulModalSiswa(siswa);
    setEkskulItemsDraft(
      existing?.ekstrakurikuler?.length
        ? existing.ekstrakurikuler.map((x) => ({...x}))
        : [
            {
              id: `eks_${Date.now()}`,
              namaEkskul: 'Pramuka',
              predikat: 'B (Baik)',
              nilaiAngka: 84,
              keterangan: 'Aktif mengikuti kegiatan kepramukaan mingguan.',
            },
          ]
    );
    setSakitDraft(existing?.sakit ?? 0);
    setIzinDraft(existing?.izin ?? 0);
    setAlpaDraft(existing?.alpa ?? 0);
    setCatatanWaliDraft(existing?.catatanWaliKelas || '');
  };

  const handleAddEkskulRow = () => {
    setEkskulItemsDraft((prev) => [
      ...prev,
      {
        id: `eks_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        namaEkskul: PRESET_EKSKUL[1],
        predikat: 'B (Baik)',
        nilaiAngka: 85,
        keterangan: '',
      },
    ]);
  };

  const handleSaveEkskulModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ekskulModalSiswa) return;
    const cleanedItems = ekskulItemsDraft
      .filter((item) => item.namaEkskul.trim() !== '')
      .map((item) => ({
        ...item,
        namaEkskul: item.namaEkskul.trim(),
        keterangan: item.keterangan.trim(),
      }));

    const existing = getStudentExtras(ekskulModalSiswa.id);
    upsertStudentRaporExtras({
      id: existing?.id || `rapor-${selectedPeriod.id}-${ekskulModalSiswa.id}`,
      periodId: selectedPeriod.id,
      siswaId: ekskulModalSiswa.id,
      ekstrakurikuler: cleanedItems,
      sakit: Math.max(0, Number(sakitDraft) || 0),
      izin: Math.max(0, Number(izinDraft) || 0),
      alpa: Math.max(0, Number(alpaDraft) || 0),
      catatanWaliKelas: catatanWaliDraft.trim(),
      updatedBy: currentUser?.namaLengkap || 'Guru',
      updatedAt: new Date().toISOString(),
    });
    setEkskulModalSiswa(null);
  };

  const statsSummary = useMemo(() => {
    const valid = computedRows.filter((r) => r.rataRata !== null);
    const tuntas = valid.filter((r) => r.tuntas).length;
    const avgClass =
      valid.length > 0
        ? (valid.reduce((a, b) => a + (b.rataRata || 0), 0) / valid.length).toFixed(1)
        : '-';
    return {total: siswaKelas.length, terisi: valid.length, tuntas, avgClass};
  }, [computedRows, siswaKelas.length]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Nilai Siswa & Ekstrakurikuler
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Periode: <strong>{selectedPeriod.label}</strong> · Bobot: Tugas {gradeSettings.bobotTugas}% · Harian{' '}
            {gradeSettings.bobotKeseharian}% · UTS {gradeSettings.bobotUts}% · UAS {gradeSettings.bobotUas}%
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={siswaKelas.length === 0}
            onClick={handleDownloadClassCombinedPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Gabungkan semua Nilai Akhir mapel dan Nilai Ekstrakurikuler menjadi 1 kertas PDF per siswa"
          >
            <FileDown className="w-4 h-4" />
            PDF Nilai Akhir + Ekskul (1 Kertas/Siswa)
          </button>
          <button
            type="button"
            disabled={computedRows.length === 0}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-600/50 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-500" />
            PDF Mapel Ini
          </button>
          <button
            type="button"
            disabled={computedRows.length === 0}
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-600/50 disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel Mapel
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setKkmModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-teal-600" />
              Atur KKM ({activeKkm})
            </button>
          )}
          {canEditMapel &&
            siswaKelas.length > 0 &&
            activeSubTab !== 'ekskul' &&
            activeSubTab !== 'nilai-akhir-ekskul' && (
              <button
                type="button"
                onClick={handleSaveAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan Nilai Mapel
              </button>
            )}
        </div>
      </div>

      {/* Filter Periode, Kelas, Mata Pelajaran */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Periode Pendidikan
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} {p.aktif ? '(Aktif)' : '(Arsip)'}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Pilih Kelas
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {(['7', '8', '9'] as KelasLevel[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedKelas(k)}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedKelas === k
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Kelas {k}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Mata Pelajaran
          </label>
          <select
            value={selectedMapel}
            onChange={(e) => setSelectedMapel(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
          >
            {subjects.map((m) => {
              const isMine = isAdmin || currentGuru?.mapelDiampu.includes(m);
              return (
                <option key={m} value={m}>
                  {m} {isMine ? '(Dapat Diinput)' : '(Hanya Lihat / Terkunci)'}
                </option>
              );
            })}
          </select>
        </div>

        <div className="md:col-span-2 text-left md:text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400">KKM Mapel</p>
          <p className="text-xl font-display font-bold font-mono-num text-teal-700 dark:text-teal-400">
            {activeKkm}
          </p>
        </div>
      </div>

      {/* Sub-Tabs Penilaian */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {(
          [
            {key: 'ringkasan', label: 'Ringkasan Nilai', icon: BookOpen},
            {key: 'tugas', label: `Nilai Tugas (${tugasColCount} Kolom)`, icon: ClipboardList},
            {key: 'keseharian', label: `Nilai Keseharian (${harianColCount} Hari)`, icon: CalendarDays},
            {key: 'ujian-catatan', label: 'UTS, UAS & Catatan Guru', icon: MessageSquareText},
            {key: 'ekskul', label: 'Nilai Ekstrakurikuler', icon: Award},
            {key: 'nilai-akhir-ekskul', label: 'Nilai Akhir & Ekskul (1 Kertas)', icon: Layers},
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSubTab(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
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

      {/* Info Hak Akses Mapel */}
      {activeSubTab !== 'ekskul' && activeSubTab !== 'nilai-akhir-ekskul' && !canEditMapel && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-3 text-sm text-amber-900 dark:text-amber-200">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p>
            Mata pelajaran <strong>{selectedMapel}</strong> terkunci (hanya baca). Anda hanya dapat menginput nilai untuk mata pelajaran yang Anda ampu:{' '}
            <strong>{currentGuru?.mapelDiampu.join(', ') || '-'}</strong>.
          </p>
        </div>
      )}

      {/* Status Otomatis Kenaikan Kelas / Kelulusan (Khusus Semester Genap) */}
      {siswaKelas.length > 0 &&
        (selectedPeriod.semester === 'Genap' ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/20 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs">
            <div className="flex items-start gap-2.5 text-emerald-950 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Semester Genap (Akhir Tahun Pelajaran):</strong> Status{' '}
                <strong>{selectedKelas === '9' ? 'LULUS' : `NAIK KE KELAS ${selectedKelas === '7' ? '8' : '9'}`}</strong>{' '}
                otomatis aktif apabila seluruh <strong>{subjects.length} mata pelajaran</strong> telah terisi dan memenuhi KKM.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono-num shrink-0">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                {selectedKelas === '9' ? 'Lulus' : 'Naik Kelas'}: {promotionSummaryCounts.memenuhi}
              </span>
              <span className="text-red-600 dark:text-red-400 font-semibold">
                Belum Memenuhi: {promotionSummaryCounts.belumMemenuhi}
              </span>
              <span className="text-amber-700 dark:text-amber-400 font-semibold">
                Belum Lengkap: {promotionSummaryCounts.belumLengkap}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-4 py-2.5 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              <strong>Periode Semester Ganjil:</strong> Penetapan otomatis status Naik Kelas / Lulus hanya diberlakukan pada{' '}
              <strong>Semester Genap (akhir tahun pelajaran)</strong>.
            </span>
          </div>
        ))}

      {/* Ringkasan Singkat Kelas */}
      {activeSubTab !== 'ekskul' && activeSubTab !== 'nilai-akhir-ekskul' && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-400 px-1">
          <span>
            Pengampu: <strong className="text-slate-900 dark:text-slate-100">{guruPengampu?.nama || '-'}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Jumlah Siswa: <strong className="font-mono-num text-slate-900 dark:text-slate-100">{statsSummary.total}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Nilai Lengkap: <strong className="font-mono-num text-slate-900 dark:text-slate-100">{statsSummary.terisi}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Tuntas (&ge; {activeKkm}):{' '}
            <strong className="font-mono-num text-emerald-600 dark:text-emerald-400">{statsSummary.tuntas} siswa</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Rata-rata Kelas: <strong className="font-mono-num text-teal-700 dark:text-teal-400">{statsSummary.avgClass}</strong>
          </span>
        </div>
      )}

      {siswaKelas.length === 0 ? (
        <EmptyState
          icon={<Lock className="w-6 h-6" />}
          title={`Belum Ada Siswa di Kelas ${selectedKelas}`}
          description={`Belum terdapat daftar siswa pada periode ${selectedPeriod.label} untuk Kelas ${selectedKelas}.`}
        />
      ) : (
        <>
          {/* SUB-TAB 1: RINGKASAN NILAI */}
          {activeSubTab === 'ringkasan' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Rata-rata <strong>Tugas</strong> dihitung otomatis dari tabel Tugas (T1–T{tugasColCount}) dan <strong>Keseharian</strong> dari penilaian harian (H1–H{harianColCount}).
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('tugas')}
                    className="text-teal-700 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                  >
                    Buka Tabel Tugas →
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('keseharian')}
                    className="text-teal-700 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                  >
                    Buka Tabel Harian →
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-3.5 text-center w-12">No</th>
                      <th className="py-3 px-3.5">Nama Siswa</th>
                      <th className="py-3 px-3 text-center">Rata Tugas ({gradeSettings.bobotTugas}%)</th>
                      <th className="py-3 px-3 text-center">Rata Harian ({gradeSettings.bobotKeseharian}%)</th>
                      <th className="py-3 px-3 text-center w-24">UTS ({gradeSettings.bobotUts}%)</th>
                      <th className="py-3 px-3 text-center w-24">UAS ({gradeSettings.bobotUas}%)</th>
                      <th className="py-3 px-3.5 text-center w-36">Nilai Akhir</th>
                      <th className="py-3 px-3.5 text-center whitespace-nowrap">Status Akhir</th>
                      <th className="py-3 px-3.5">Catatan Guru</th>
                      <th className="py-3 px-3.5 text-right whitespace-nowrap">Nilai Akhir + Ekskul</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {computedRows.map((row, idx) => {
                      const d = draftScores[row.siswaId];
                      const isTuntas = row.tuntas;
                      const siswaObj = siswaKelas.find((x) => x.id === row.siswaId);
                      return (
                        <tr key={row.siswaId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3.5 text-center font-mono-num text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{row.nama}</p>
                            <p className="text-[11px] font-mono-num text-slate-500">NIS {row.nis}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setActiveSubTab('tugas')}
                              className="inline-flex flex-col items-center px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                            >
                              <span className="font-mono-num font-bold text-slate-800 dark:text-slate-100">
                                {row.tugas !== null ? row.tugas.toFixed(1) : '-'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {row.tugasTerisi}/{tugasColCount} tugas
                              </span>
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setActiveSubTab('keseharian')}
                              className="inline-flex flex-col items-center px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                            >
                              <span className="font-mono-num font-bold text-slate-800 dark:text-slate-100">
                                {row.keseharian !== null ? row.keseharian.toFixed(1) : '-'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {row.harianTerisi}/{harianColCount} hari
                              </span>
                            </button>
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={!canEditMapel}
                              value={d?.uts || ''}
                              onChange={(e) => handleScalarChange(row.siswaId, 'uts', e.target.value)}
                              placeholder="-"
                              className="w-16 px-2 py-1.5 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-num text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:opacity-65"
                            />
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={!canEditMapel}
                              value={d?.uas || ''}
                              onChange={(e) => handleScalarChange(row.siswaId, 'uas', e.target.value)}
                              placeholder="-"
                              className="w-16 px-2 py-1.5 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-num text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:opacity-65"
                            />
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            {row.rataRata === null ? (
                              <span className="text-xs text-slate-400">Belum lengkap</span>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span
                                  className={`font-mono-num text-base font-bold ${
                                    isTuntas
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {row.rataRata.toFixed(1)}
                                </span>
                                <span
                                  className={`text-[11px] font-medium ${
                                    isTuntas
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {isTuntas ? 'Tuntas' : 'Di bawah KKM'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            {(() => {
                              const promo = livePromotionMap[row.siswaId];
                              if (!promo) return null;
                              if (promo.code === 'PROSES_GANJIL') {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                                    <Clock className="w-3 h-3" />
                                    Proses (Ganjil)
                                  </span>
                                );
                              }
                              if (promo.code === 'NAIK_KELAS' || promo.code === 'LULUS') {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold"
                                    title={`Seluruh ${promo.totalSubjects} mapel tuntas memenuhi KKM`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {promo.label}
                                  </span>
                                );
                              }
                              if (promo.code === 'BELUM_MEMENUHI') {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[11px] font-semibold"
                                    title={`Mapel di bawah KKM: ${promo.belowKkmMapels.join(', ')}`}
                                  >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    {promo.shortLabel}
                                  </span>
                                );
                              }
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[11px] font-semibold"
                                  title={`Terisi ${promo.filledCount}/${promo.totalSubjects} mata pelajaran`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {promo.shortLabel}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-2.5 px-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                            {row.catatanGuru ? (
                              <p className="line-clamp-2">{row.catatanGuru}</p>
                            ) : (
                              <span className="text-slate-400 italic">Belum ada catatan</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            {siswaObj && (
                              <button
                                type="button"
                                onClick={() => handleDownloadStudentCombinedPdf(siswaObj)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-xs font-semibold cursor-pointer"
                                title="Unduh gabungan Nilai Akhir semua mapel + Ekskul dalam 1 kertas PDF"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                1 Kertas PDF
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: NILAI TUGAS (10+ KOLOM) */}
          {activeSubTab === 'tugas' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Input hingga <strong>{tugasColCount} nilai tugas</strong> (T1–T{tugasColCount}) untuk mapel <strong>{selectedMapel}</strong>. Rata-rata dihitung otomatis dari tugas yang terisi.
                </p>
                {canEditMapel && (
                  <button
                    type="button"
                    onClick={handleAddTugasColumn}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-600" />
                    Tambah Kolom Tugas (T{tugasColCount + 1})
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-3 text-center w-10 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800">No</th>
                      <th className="py-3 px-3 min-w-[180px] sticky left-10 z-10 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                        Nama Siswa
                      </th>
                      {Array.from({length: tugasColCount}, (_, i) => (
                        <th key={i} className="py-3 px-2 text-center min-w-[68px] font-mono-num">
                          Tugas {i + 1}
                        </th>
                      ))}
                      <th className="py-3 px-3.5 text-center min-w-[96px] bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-l border-slate-200 dark:border-slate-700">
                        Rata Tugas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {siswaKelas.map((s, idx) => {
                      const d = draftScores[s.id];
                      const rowCalc = computedRows[idx];
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-center font-mono-num text-slate-500 sticky left-0 z-10 bg-white dark:bg-slate-900">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 sticky left-10 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                              {s.nama}
                            </p>
                            <p className="text-[11px] font-mono-num text-slate-500">NIS {s.nis}</p>
                          </td>
                          {Array.from({length: tugasColCount}, (_, colIdx) => (
                            <td key={colIdx} className="py-2 px-1.5 text-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={!canEditMapel}
                                value={d?.tugasList[colIdx] ?? ''}
                                onChange={(e) => handleArrayScoreChange(s.id, 'tugasList', colIdx, e.target.value)}
                                placeholder="-"
                                aria-label={`Tugas ${colIdx + 1} ${s.nama}`}
                                className="w-14 px-1.5 py-1.5 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-num text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:opacity-65"
                              />
                            </td>
                          ))}
                          <td className="py-2 px-3.5 text-center font-mono-num font-bold text-teal-700 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-950/20 border-l border-slate-100 dark:border-slate-800">
                            {rowCalc?.tugas !== null ? rowCalc.tugas.toFixed(1) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: NILAI KESEHARIAN (PENILAIAN HARIAN H1..Hn) */}
          {activeSubTab === 'keseharian' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Catat nilai keseharian siswa setiap hari pertemuan (<strong>Hari 1 – Hari {harianColCount}</strong>). Klik tambah hari untuk pertemuan berikutnya.
                </p>
                {canEditMapel && (
                  <button
                    type="button"
                    onClick={handleAddHarianColumn}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Hari Penilaian (H{harianColCount + 1})
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-3 text-center w-10 sticky left-0 z-10 bg-slate-50 dark:bg-slate-800">No</th>
                      <th className="py-3 px-3 min-w-[180px] sticky left-10 z-10 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                        Nama Siswa
                      </th>
                      {Array.from({length: harianColCount}, (_, i) => (
                        <th key={i} className="py-3 px-2 text-center min-w-[66px] font-mono-num">
                          Hari {i + 1}
                        </th>
                      ))}
                      <th className="py-3 px-3.5 text-center min-w-[96px] bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-l border-slate-200 dark:border-slate-700">
                        Rata Harian
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {siswaKelas.map((s, idx) => {
                      const d = draftScores[s.id];
                      const rowCalc = computedRows[idx];
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-center font-mono-num text-slate-500 sticky left-0 z-10 bg-white dark:bg-slate-900">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 sticky left-10 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                              {s.nama}
                            </p>
                            <p className="text-[11px] font-mono-num text-slate-500">NIS {s.nis}</p>
                          </td>
                          {Array.from({length: harianColCount}, (_, colIdx) => (
                            <td key={colIdx} className="py-2 px-1.5 text-center">
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={!canEditMapel}
                                value={d?.keseharianList[colIdx] ?? ''}
                                onChange={(e) => handleArrayScoreChange(s.id, 'keseharianList', colIdx, e.target.value)}
                                placeholder="-"
                                aria-label={`Harian ${colIdx + 1} ${s.nama}`}
                                className="w-14 px-1.5 py-1.5 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-num text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:opacity-65"
                              />
                            </td>
                          ))}
                          <td className="py-2 px-3.5 text-center font-mono-num font-bold text-teal-700 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-950/20 border-l border-slate-100 dark:border-slate-800">
                            {rowCalc?.keseharian !== null ? rowCalc.keseharian.toFixed(1) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 4: UTS, UAS & CATATAN GURU */}
          {activeSubTab === 'ujian-catatan' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                Isi nilai <strong>UTS</strong>, <strong>UAS</strong>, serta <strong>Catatan Guru</strong> untuk masing-masing siswa pada mata pelajaran <strong>{selectedMapel}</strong>. Catatan guru akan ikut tampil di bagan Raport siswa.
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-3 px-3.5 text-center w-12">No</th>
                      <th className="py-3 px-3.5 min-w-[180px]">Nama Siswa</th>
                      <th className="py-3 px-3 text-center w-24">UTS</th>
                      <th className="py-3 px-3 text-center w-24">UAS</th>
                      <th className="py-3 px-3 text-center w-24">Akhir</th>
                      <th className="py-3 px-3.5 min-w-[300px]">Catatan Guru Mata Pelajaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {computedRows.map((row, idx) => {
                      const d = draftScores[row.siswaId];
                      return (
                        <tr key={row.siswaId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 align-top">
                          <td className="py-3 px-3.5 text-center font-mono-num text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">{row.nama}</p>
                            <p className="text-[11px] font-mono-num text-slate-500">
                              Tugas: {row.tugas ?? '-'} · Harian: {row.keseharian ?? '-'}
                            </p>
                          </td>
                          <td className="py-3 px-2.5 text-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={!canEditMapel}
                              value={d?.uts || ''}
                              onChange={(e) => handleScalarChange(row.siswaId, 'uts', e.target.value)}
                              placeholder="-"
                              className="w-16 px-2 py-1.5 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-num text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:opacity-65"
                            />
                          </td>
                          <td className="py-3 px-2.5 text-center">
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={!canEditMapel}
                              value={d?.uas || ''}
                              onChange={(e) => handleScalarChange(row.siswaId, 'uas', e.target.value)}
                              placeholder="-"
                              className="w-16 px-2 py-1.5 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-num text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:opacity-65"
                            />
                          </td>
                          <td className="py-3 px-3 text-center font-mono-num font-bold">
                            {row.rataRata !== null ? (
                              <span
                                className={
                                  row.tuntas
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }
                              >
                                {row.rataRata.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <textarea
                              rows={2}
                              disabled={!canEditMapel}
                              value={d?.catatanGuru || ''}
                              onChange={(e) => handleScalarChange(row.siswaId, 'catatanGuru', e.target.value)}
                              placeholder={
                                canEditMapel
                                  ? 'Tulis catatan perkembangan belajar / rekomendasi untuk siswa...'
                                  : 'Hanya dapat diisi oleh guru pengampu mapel.'
                              }
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:opacity-65"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 5: NILAI EKSTRAKURIKULER & CATATAN WALI */}
          {activeSubTab === 'ekskul' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/70 dark:bg-teal-950/30 p-4 text-xs text-teal-900 dark:text-teal-200">
                Kelola kegiatan <strong>Ekstrakurikuler</strong> (Pramuka, Seni Tari &amp; Tabuh Bali, Pencak Silat, PMR, dll.), ketidakhadiran (Sakit/Izin/Alpa), dan <strong>Catatan Wali Kelas</strong> untuk Kelas {selectedKelas} ({selectedPeriod.label}). Seluruh data akan digabung ke bagan Raport siswa.
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <th className="py-3 px-3.5 text-center w-12">No</th>
                        <th className="py-3 px-3.5">Nama Siswa</th>
                        <th className="py-3 px-3.5">Kegiatan Ekstrakurikuler &amp; Nilai</th>
                        <th className="py-3 px-3.5 text-center whitespace-nowrap">Absensi (S / I / A)</th>
                        <th className="py-3 px-3.5">Catatan Wali Kelas</th>
                        <th className="py-3 px-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {siswaKelas.map((s, idx) => {
                        const extra = getStudentExtras(s.id);
                        const ekskuls = extra?.ekstrakurikuler || [];
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 align-top">
                            <td className="py-3 px-3.5 text-center font-mono-num text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{s.nama}</p>
                              <p className="text-[11px] font-mono-num text-slate-500">NIS {s.nis}</p>
                            </td>
                            <td className="py-3 px-3.5">
                              {ekskuls.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">Belum ada ekskul diisi</span>
                              ) : (
                                <div className="space-y-1.5">
                                  {ekskuls.map((ex) => (
                                    <div key={ex.id} className="text-xs">
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {ex.namaEkskul}
                                      </span>{' '}
                                      <span className="text-teal-700 dark:text-teal-400 font-semibold">
                                        · {ex.predikat}
                                        {ex.nilaiAngka !== null && ex.nilaiAngka !== undefined ? ` (${ex.nilaiAngka})` : ''}
                                      </span>
                                      {ex.keterangan && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{ex.keterangan}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono-num text-xs whitespace-nowrap">
                              <span className="text-slate-700 dark:text-slate-300">
                                S: <strong>{extra?.sakit ?? 0}</strong> · I: <strong>{extra?.izin ?? 0}</strong> · A:{' '}
                                <strong>{extra?.alpa ?? 0}</strong>
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                              {extra?.catatanWaliKelas || (
                                <span className="text-slate-400 italic">Belum ada catatan wali kelas</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadStudentCombinedPdf(s)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-xs font-semibold cursor-pointer"
                                title="Download gabungan Nilai Akhir semua mapel + Ekskul (1 kertas PDF)"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                1 Kertas PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => openEkskulModal(s)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Input / Ubah
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

          {/* SUB-TAB 6: GABUNGAN NILAI AKHIR (SEMUA MAPEL) + EKSTRAKURIKULER DALAM 1 KERTAS PER SISWA */}
          {activeSubTab === 'nilai-akhir-ekskul' && (() => {
            const activeSiswa =
              siswaKelas.find((s) => s.id === selectedCombinedSiswaId) || siswaKelas[0];
            const activeExtra = activeSiswa ? getStudentExtras(activeSiswa.id) : undefined;
            const activeStudentNilai = activeSiswa
              ? nilaiRecords.filter(
                  (n) => n.periodId === selectedPeriod.id && n.siswaId === activeSiswa.id
                )
              : [];

            return (
              <div className="space-y-5">
                {/* Banner & Tombol Unduhan Gabungan */}
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-100">
                    <p className="font-display font-bold">
                      Gabungan Nilai Akhir Seluruh Mata Pelajaran &amp; Nilai Ekstrakurikuler (1 Kertas per Siswa)
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                      Seluruh Nilai Akhir dari {subjects.length} mata pelajaran, nilai ekstrakurikuler, absensi, dan tanda tangan digabungkan rapi ke dalam <strong>1 halaman kertas A4</strong> per siswa saat diunduh.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadClassCombinedPdf}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      Download Semua Siswa Kelas {selectedKelas} (PDF)
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadClassCombinedExcel}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Download Excel Gabungan
                    </button>
                  </div>
                </div>

                {/* Daftar Siswa Kelas untuk Unduh 1 Kertas PDF Satuan */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
                      Rekap Nilai Akhir Semua Mapel &amp; Ekskul — Kelas {selectedKelas} ({selectedPeriod.label})
                    </h2>
                    <span className="text-xs text-slate-500">
                      Klik baris siswa untuk melihat pratinjau lengkap di bawah
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <th className="py-3 px-3.5 text-center w-12">No</th>
                          <th className="py-3 px-3.5">Nama Siswa</th>
                          <th className="py-3 px-3.5 text-center">Mapel Terisi</th>
                          <th className="py-3 px-3.5 text-center">Rata-rata Nilai Akhir</th>
                          <th className="py-3 px-3.5">Ekstrakurikuler</th>
                          <th className="py-3 px-3.5 text-center whitespace-nowrap">Status Kenaikan / Kelulusan</th>
                          <th className="py-3 px-3.5 text-right">Download 1 Kertas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {siswaKelas.map((s, idx) => {
                          const sNilai = nilaiRecords.filter(
                            (n) => n.periodId === selectedPeriod.id && n.siswaId === s.id
                          );
                          const finalScores = subjects
                            .map((m) => {
                              const rec = sNilai.find((n) => n.mapel === m);
                              return rec ? hitungRataRata(rec, gradeSettings) : null;
                            })
                            .filter((v): v is number => v !== null);
                          const overallAvg =
                            finalScores.length > 0
                              ? finalScores.reduce((a, b) => a + b, 0) / finalScores.length
                              : null;
                          const extra = getStudentExtras(s.id);
                          const ekskuls = extra?.ekstrakurikuler || [];
                          const isSelected = activeSiswa?.id === s.id;

                          return (
                            <tr
                              key={s.id}
                              onClick={() => setSelectedCombinedSiswaId(s.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-teal-50/70 dark:bg-teal-950/30'
                                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="py-2.5 px-3.5 text-center font-mono-num text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3.5 whitespace-nowrap">
                                <p className="font-semibold text-slate-900 dark:text-slate-100">
                                  {s.nama}
                                </p>
                                <p className="text-[11px] font-mono-num text-slate-500">
                                  NIS {s.nis}
                                </p>
                              </td>
                              <td className="py-2.5 px-3.5 text-center font-mono-num text-xs">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {finalScores.length}
                                </span>
                                <span className="text-slate-400">/{subjects.length} mapel</span>
                              </td>
                              <td className="py-2.5 px-3.5 text-center font-mono-num">
                                {overallAvg !== null ? (
                                  <span className="font-bold text-teal-700 dark:text-teal-400">
                                    {overallAvg.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3.5 text-xs">
                                {ekskuls.length > 0 ? (
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {ekskuls
                                      .map((ex) => `${ex.namaEkskul} (${ex.predikat.split(' ')[0]})`)
                                      .join(', ')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Belum ada ekskul</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                                {(() => {
                                  const promo = savedPromotionMap[s.id];
                                  if (!promo) return null;
                                  if (promo.code === 'PROSES_GANJIL') {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                                        Proses (Ganjil)
                                      </span>
                                    );
                                  }
                                  if (promo.code === 'NAIK_KELAS' || promo.code === 'LULUS') {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {promo.label}
                                      </span>
                                    );
                                  }
                                  if (promo.code === 'BELUM_MEMENUHI') {
                                    return (
                                      <span
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[11px] font-semibold"
                                        title={`Mapel di bawah KKM: ${promo.belowKkmMapels.join(', ')}`}
                                      >
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {promo.shortLabel}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                                      {promo.shortLabel}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td
                                className="py-2.5 px-3.5 text-right whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleDownloadStudentCombinedPdf(s)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  Download 1 Kertas (PDF)
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pratinjau 1 Kertas Gabungan Nilai Akhir + Ekskul untuk Siswa Terpilih */}
                {activeSiswa && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <p className="text-xs uppercase tracking-wider font-semibold text-teal-700 dark:text-teal-400">
                          Pratinjau Lembar Gabungan (1 Kertas A4)
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                            {activeSiswa.nama} · Kelas {activeSiswa.kelas}
                          </h3>
                          {(() => {
                            const promo = savedPromotionMap[activeSiswa.id];
                            if (!promo) return null;
                            if (promo.code === 'NAIK_KELAS' || promo.code === 'LULUS') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {promo.label}
                                </span>
                              );
                            }
                            if (promo.code === 'BELUM_MEMENUHI') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  {promo.label}
                                </span>
                              );
                            }
                            if (promo.code === 'BELUM_LENGKAP') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                                  {promo.label}
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                                {promo.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs font-mono-num text-slate-500">
                          NIS: {activeSiswa.nis} · NISN: {activeSiswa.nisn} · Periode: {selectedPeriod.label}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadStudentCombinedPdf(activeSiswa)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF {activeSiswa.nama} (1 Kertas)
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
                            <th className="py-2 px-2.5 text-center">No</th>
                            <th className="py-2 px-2.5">Mata Pelajaran</th>
                            <th className="py-2 px-2 text-center">KKM</th>
                            <th className="py-2 px-2 text-center">Tugas</th>
                            <th className="py-2 px-2 text-center">Harian</th>
                            <th className="py-2 px-2 text-center">UTS</th>
                            <th className="py-2 px-2 text-center">UAS</th>
                            <th className="py-2 px-2.5 text-center">Nilai Akhir</th>
                            <th className="py-2 px-2 text-center">Predikat</th>
                            <th className="py-2 px-2.5">Catatan Guru</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {subjects.map((mapel, i) => {
                            const rec = activeStudentNilai.find((n) => n.mapel === mapel);
                            const kkm = gradeSettings.kkmPerMapel[mapel] ?? 75;
                            const avgTugas = rec
                              ? (hitungRataDaftar(rec.tugasList) ?? rec.tugas ?? null)
                              : null;
                            const avgHarian = rec
                              ? (hitungRataDaftar(rec.keseharianList) ?? rec.keseharian ?? null)
                              : null;
                            const akhir = rec ? hitungRataRata(rec, gradeSettings) : null;
                            const tuntas = akhir !== null ? akhir >= kkm : null;

                            return (
                              <tr key={mapel}>
                                <td className="py-1.5 px-2.5 text-center font-mono-num text-slate-500">
                                  {i + 1}
                                </td>
                                <td className="py-1.5 px-2.5 font-medium text-slate-800 dark:text-slate-200">
                                  {mapel}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono-num">{kkm}</td>
                                <td className="py-1.5 px-2 text-center font-mono-num">
                                  {avgTugas !== null ? avgTugas.toFixed(1) : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono-num">
                                  {avgHarian !== null ? avgHarian.toFixed(1) : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono-num">
                                  {rec?.uts ?? '-'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-mono-num">
                                  {rec?.uas ?? '-'}
                                </td>
                                <td
                                  className={`py-1.5 px-2.5 text-center font-mono-num font-bold ${
                                    tuntas === null
                                      ? 'text-slate-400'
                                      : tuntas
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {akhir !== null ? akhir.toFixed(1) : '-'}
                                </td>
                                <td className="py-1.5 px-2 text-center font-semibold">
                                  {akhir !== null ? getPredikatNilai(akhir).split(' ')[0] : '-'}
                                </td>
                                <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-300">
                                  {rec?.catatanGuru || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Bagian B & C pada 1 kertas yang sama */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
                        <h4 className="text-xs font-display font-bold text-teal-700 dark:text-teal-400 mb-2">
                          B. Nilai Ekstrakurikuler
                        </h4>
                        {activeExtra?.ekstrakurikuler?.length ? (
                          <div className="space-y-1.5 text-xs">
                            {activeExtra.ekstrakurikuler.map((ex, idx) => (
                              <div key={ex.id} className="flex justify-between gap-2">
                                <span className="font-medium">
                                  {idx + 1}. {ex.namaEkskul}
                                </span>
                                <span className="font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                  {ex.predikat}
                                  {ex.nilaiAngka !== null && ex.nilaiAngka !== undefined
                                    ? ` (${ex.nilaiAngka})`
                                    : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Belum ada ekstrakurikuler diisi.
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 text-xs space-y-1.5">
                        <h4 className="text-xs font-display font-bold text-teal-700 dark:text-teal-400">
                          C. Ketidakhadiran, Catatan Wali Kelas &amp; Keputusan Akhir
                        </h4>
                        <p className="font-mono-num text-slate-700 dark:text-slate-300">
                          Sakit: <strong>{activeExtra?.sakit ?? 0} hari</strong> · Izin:{' '}
                          <strong>{activeExtra?.izin ?? 0} hari</strong> · Alpa:{' '}
                          <strong>{activeExtra?.alpa ?? 0} hari</strong>
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">
                          Catatan: {activeExtra?.catatanWaliKelas || '-'}
                        </p>
                        {selectedPeriod.semester === 'Genap' && savedPromotionMap[activeSiswa.id] && (
                          <p className="pt-1 border-t border-slate-100 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-100">
                            Keputusan Akhir (Semester Genap):{' '}
                            <span
                              className={
                                savedPromotionMap[activeSiswa.id].code === 'NAIK_KELAS' ||
                                savedPromotionMap[activeSiswa.id].code === 'LULUS'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : savedPromotionMap[activeSiswa.id].code === 'BELUM_MEMENUHI'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-amber-700 dark:text-amber-400'
                              }
                            >
                              {savedPromotionMap[activeSiswa.id].label}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* Modal Input / Edit Ekstrakurikuler & Catatan Wali */}
      <Modal
        open={Boolean(ekskulModalSiswa)}
        onClose={() => setEkskulModalSiswa(null)}
        title={`Ekstrakurikuler & Catatan — ${ekskulModalSiswa?.nama || ''}`}
        subtitle={`Kelas ${selectedKelas} · ${selectedPeriod.label}`}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSaveEkskulModal} className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
                Daftar Nilai Ekstrakurikuler
              </h3>
              <button
                type="button"
                onClick={handleAddEkskulRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Ekskul
              </button>
            </div>

            {ekskulItemsDraft.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Belum ada kegiatan ekstrakurikuler. Klik "Tambah Ekskul" untuk menambahkan.
              </p>
            ) : (
              <div className="space-y-3">
                {ekskulItemsDraft.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 space-y-2.5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold mb-1">Nama Ekstrakurikuler</label>
                        <input
                          type="text"
                          list="preset-ekskul-list"
                          required
                          value={item.namaEkskul}
                          onChange={(e) => {
                            const next = [...ekskulItemsDraft];
                            next[idx] = {...item, namaEkskul: e.target.value};
                            setEkskulItemsDraft(next);
                          }}
                          placeholder="Pilih atau ketik nama ekskul"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold mb-1">Predikat</label>
                        <select
                          value={item.predikat}
                          onChange={(e) => {
                            const next = [...ekskulItemsDraft];
                            next[idx] = {
                              ...item,
                              predikat: e.target.value as EkskulItem['predikat'],
                            };
                            setEkskulItemsDraft(next);
                          }}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        >
                          {PREDIKAT_EKSKUL.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold mb-1">Nilai (0-100)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={item.nilaiAngka ?? ''}
                          onChange={(e) => {
                            const next = [...ekskulItemsDraft];
                            next[idx] = {
                              ...item,
                              nilaiAngka: e.target.value === '' ? null : Number(e.target.value),
                            };
                            setEkskulItemsDraft(next);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono-num"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setEkskulItemsDraft((prev) => prev.filter((x) => x.id !== item.id))
                          }
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Hapus baris ekskul"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">Deskripsi / Keterangan</label>
                      <input
                        type="text"
                        value={item.keterangan}
                        onChange={(e) => {
                          const next = [...ekskulItemsDraft];
                          next[idx] = {...item, keterangan: e.target.value};
                          setEkskulItemsDraft(next);
                        }}
                        placeholder="Catatan keaktifan atau pencapaian siswa dalam ekstrakurikuler"
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <datalist id="preset-ekskul-list">
              {PRESET_EKSKUL.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold mb-1">Sakit (Hari)</label>
              <input
                type="number"
                min={0}
                value={sakitDraft}
                onChange={(e) => setSakitDraft(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Izin (Hari)</label>
              <input
                type="number"
                min={0}
                value={izinDraft}
                onChange={(e) => setIzinDraft(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tanpa Keterangan / Alpa</label>
              <input
                type="number"
                min={0}
                value={alpaDraft}
                onChange={(e) => setAlpaDraft(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Catatan Wali Kelas untuk Raport</label>
            <textarea
              rows={2}
              value={catatanWaliDraft}
              onChange={(e) => setCatatanWaliDraft(e.target.value)}
              placeholder="Contoh: Pertahankan prestasi dan kedisiplinan belajar pada semester berikutnya."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEkskulModalSiswa(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan Ekstrakurikuler
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Pengaturan KKM Mapel */}
      <Modal
        open={kkmModalOpen}
        onClose={() => setKkmModalOpen(false)}
        title={`Atur KKM — ${selectedMapel}`}
        maxWidthClass="max-w-sm"
      >
        <form onSubmit={handleSaveKkm} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Nilai KKM (Kriteria Ketuntasan Minimal)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={kkmDraft}
              onChange={(e) => setKkmDraft(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setKkmModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan KKM
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
