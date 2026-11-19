// Halaman 6: Input & Rekap Nilai Siswa per Periode Pendidikan (Tahun & Semester)
// Mendukung 10+ kolom Nilai Tugas (T1-T10), Penilaian Harian (H1-Hn), UTS/UAS, Catatan Guru,
// Nilai Ekstrakurikuler & Catatan Wali, hak akses per mapel guru, serta ekspor PDF & Excel.

import React, {useEffect, useMemo, useState} from 'react';
import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Download,
  Edit3,
  FileSpreadsheet,
  Lock,
  MessageSquareText,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {
  DAFTAR_MAPEL,
  EkskulItem,
  KelasLevel,
  NilaiRecord,
  Siswa,
  StudentRaporExtras,
} from '../types/school';
import {exportNilaiExcel, exportNilaiPdf, NilaiRowExport} from '../utils/exportUtils';
import {hitungRataDaftar, hitungRataRata} from '../utils/gradeUtils';
import {EmptyState, Modal} from '../components/ui/AvatarAndModal';

type NilaiSubTab = 'ringkasan' | 'tugas' | 'keseharian' | 'ujian-catatan' | 'ekskul';

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
  const {nilaiRecords, studentRaporExtras, gradeSettings, schoolProfile, periods} = state;

  const defaultMapel =
    currentGuru && currentGuru.mapelDiampu.length > 0 ? currentGuru.mapelDiampu[0] : DAFTAR_MAPEL[0];

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
            disabled={computedRows.length === 0}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-600/50 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-500" />
            Download PDF
          </button>
          <button
            type="button"
            disabled={computedRows.length === 0}
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-600/50 disabled:opacity-50 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Download Excel
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
          {canEditMapel && siswaKelas.length > 0 && activeSubTab !== 'ekskul' && (
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
            {DAFTAR_MAPEL.map((m) => {
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
      {activeSubTab !== 'ekskul' && !canEditMapel && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-3 text-sm text-amber-900 dark:text-amber-200">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p>
            Mata pelajaran <strong>{selectedMapel}</strong> terkunci (hanya baca). Anda hanya dapat menginput nilai untuk mata pelajaran yang Anda ampu:{' '}
            <strong>{currentGuru?.mapelDiampu.join(', ') || '-'}</strong>.
          </p>
        </div>
      )}

      {/* Ringkasan Singkat Kelas */}
      {activeSubTab !== 'ekskul' && (
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
                      <th className="py-3 px-3.5">Catatan Guru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {computedRows.map((row, idx) => {
                      const d = draftScores[row.siswaId];
                      const isTuntas = row.tuntas;
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
                          <td className="py-2.5 px-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                            {row.catatanGuru ? (
                              <p className="line-clamp-2">{row.catatanGuru}</p>
                            ) : (
                              <span className="text-slate-400 italic">Belum ada catatan</span>
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
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
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
