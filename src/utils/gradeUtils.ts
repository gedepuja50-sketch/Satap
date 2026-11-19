// Fungsi utilitas perhitungan nilai, KKM, status naik kelas/lulus Semester Genap, dan format tanggal Indonesia

import {
  EducationPeriod,
  GradeSettings,
  KelasLevel,
  NilaiRecord,
  SemesterType,
  Siswa,
} from '../types/school';

export function hitungRataDaftar(list?: Array<number | null>): number | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const valid = list.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

export function hitungRataRata(
  record: Pick<NilaiRecord, 'tugas' | 'keseharian' | 'uts' | 'uas' | 'tugasList' | 'keseharianList'>,
  settings: GradeSettings
): number | null {
  const tugas = hitungRataDaftar(record.tugasList) ?? record.tugas;
  const keseharian = hitungRataDaftar(record.keseharianList) ?? record.keseharian;
  const {uts, uas} = record;
  if (tugas === null || keseharian === null || uts === null || uas === null) {
    return null;
  }
  const totalBobot =
    settings.bobotTugas + settings.bobotKeseharian + settings.bobotUts + settings.bobotUas;
  if (totalBobot <= 0) return null;

  const weighted =
    tugas * settings.bobotTugas +
    keseharian * settings.bobotKeseharian +
    uts * settings.bobotUts +
    uas * settings.bobotUas;

  return Math.round((weighted / totalBobot) * 10) / 10;
}

export function getPredikatNilai(nilai: number | null): string {
  if (nilai === null) return '-';
  if (nilai >= 90) return 'A (Sangat Baik)';
  if (nilai >= 80) return 'B (Baik)';
  if (nilai >= 70) return 'C (Cukup)';
  return 'D (Perlu Bimbingan)';
}

export type PromotionStatusCode =
  | 'PROSES_GANJIL'
  | 'BELUM_LENGKAP'
  | 'NAIK_KELAS'
  | 'LULUS'
  | 'BELUM_MEMENUHI';

export interface StudentPromotionResult {
  isSemesterGenap: boolean;
  code: PromotionStatusCode;
  label: string;
  shortLabel: string;
  detail: string;
  nextKelas: KelasLevel | null;
  isQualified: boolean;
  filledCount: number;
  totalSubjects: number;
  tuntasCount: number;
  belowKkmMapels: string[];
  unfilledMapels: string[];
  rataKeseluruhan: number | null;
}

/**
 * Evaluasi otomatis kelulusan / kenaikan kelas peserta didik:
 * - Pada Semester Ganjil: TIDAK menyatakan lulus atau naik kelas (hanya proses semester ganjil).
 * - Pada Semester Genap (akhir tahun pelajaran): jika seluruh mata pelajaran telah memiliki nilai akhir
 *   dan seluruhnya memenuhi KKM, otomatis dinyatakan NAIK KE KELAS 8/9 (kelas 7/8) atau LULUS (kelas 9).
 */
export function evaluateStudentPromotionStatus(
  siswa: Pick<Siswa, 'id' | 'kelas'>,
  period: Pick<EducationPeriod, 'id' | 'semester'>,
  subjects: string[],
  nilaiRecords: NilaiRecord[],
  gradeSettings: GradeSettings
): StudentPromotionResult {
  const studentNilai = nilaiRecords.filter(
    (n) => n.periodId === period.id && n.siswaId === siswa.id
  );

  const belowKkmMapels: string[] = [];
  const unfilledMapels: string[] = [];
  const validScores: number[] = [];
  let tuntasCount = 0;

  subjects.forEach((mapel) => {
    const rec = studentNilai.find((n) => n.mapel === mapel);
    const kkm = gradeSettings.kkmPerMapel[mapel] ?? 75;
    const nilaiAkhir = rec ? hitungRataRata(rec, gradeSettings) : null;
    if (nilaiAkhir === null) {
      unfilledMapels.push(mapel);
    } else {
      validScores.push(nilaiAkhir);
      if (nilaiAkhir >= kkm) {
        tuntasCount++;
      } else {
        belowKkmMapels.push(mapel);
      }
    }
  });

  const filledCount = validScores.length;
  const totalSubjects = subjects.length;
  const rataKeseluruhan =
    filledCount > 0
      ? Math.round((validScores.reduce((a, b) => a + b, 0) / filledCount) * 10) / 10
      : null;

  if (period.semester !== 'Genap') {
    return {
      isSemesterGenap: false,
      code: 'PROSES_GANJIL',
      label: 'Proses Semester Ganjil',
      shortLabel: 'Proses (Ganjil)',
      detail:
        'Penentuan Naik Kelas / Kelulusan dilakukan otomatis pada Semester Genap (akhir tahun pelajaran).',
      nextKelas: siswa.kelas,
      isQualified: false,
      filledCount,
      totalSubjects,
      tuntasCount,
      belowKkmMapels,
      unfilledMapels,
      rataKeseluruhan,
    };
  }

  if (totalSubjects === 0 || filledCount < totalSubjects) {
    const extraInfo =
      belowKkmMapels.length > 0
        ? ` (${belowKkmMapels.length} mapel di bawah KKM: ${belowKkmMapels.join(', ')})`
        : '';
    return {
      isSemesterGenap: true,
      code: 'BELUM_LENGKAP',
      label: `Belum Lengkap (${filledCount}/${totalSubjects} Mapel)`,
      shortLabel: `Lengkap ${filledCount}/${totalSubjects}`,
      detail: `Menunggu kelengkapan nilai pada ${unfilledMapels.length} mapel lagi${extraInfo}.`,
      nextKelas: siswa.kelas,
      isQualified: false,
      filledCount,
      totalSubjects,
      tuntasCount,
      belowKkmMapels,
      unfilledMapels,
      rataKeseluruhan,
    };
  }

  if (belowKkmMapels.length > 0) {
    return {
      isSemesterGenap: true,
      code: 'BELUM_MEMENUHI',
      label: siswa.kelas === '9' ? 'Belum Lulus (< KKM)' : 'Belum Naik Kelas (< KKM)',
      shortLabel: siswa.kelas === '9' ? 'Belum Lulus' : 'Belum Naik',
      detail: `${belowKkmMapels.length} mapel di bawah KKM: ${belowKkmMapels.join(', ')}.`,
      nextKelas: siswa.kelas,
      isQualified: false,
      filledCount,
      totalSubjects,
      tuntasCount,
      belowKkmMapels,
      unfilledMapels,
      rataKeseluruhan,
    };
  }

  if (siswa.kelas === '9') {
    return {
      isSemesterGenap: true,
      code: 'LULUS',
      label: 'LULUS',
      shortLabel: 'LULUS',
      detail:
        'Seluruh nilai mata pelajaran Semester Genap telah terpenuhi (≥ KKM). Dinyatakan LULUS.',
      nextKelas: null,
      isQualified: true,
      filledCount,
      totalSubjects,
      tuntasCount,
      belowKkmMapels,
      unfilledMapels,
      rataKeseluruhan,
    };
  }

  const nextKelas: KelasLevel = siswa.kelas === '7' ? '8' : '9';
  return {
    isSemesterGenap: true,
    code: 'NAIK_KELAS',
    label: `NAIK KE KELAS ${nextKelas}`,
    shortLabel: `Naik Kelas ${nextKelas}`,
    detail: `Seluruh nilai mata pelajaran Semester Genap telah terpenuhi (≥ KKM). Otomatis NAIK KE KELAS ${nextKelas}.`,
    nextKelas,
    isQualified: true,
    filledCount,
    totalSubjects,
    tuntasCount,
    belowKkmMapels,
    unfilledMapels,
    rataKeseluruhan,
  };
}

export function getNextEducationPeriodInfo(currentPeriod: Pick<EducationPeriod, 'tahunAjaran' | 'semester'>): {
  tahunAjaran: string;
  semester: SemesterType;
  label: string;
  isYearRollover: boolean;
} {
  if (currentPeriod.semester === 'Ganjil') {
    return {
      tahunAjaran: currentPeriod.tahunAjaran,
      semester: 'Genap',
      label: `${currentPeriod.tahunAjaran} · Semester Genap`,
      isYearRollover: false,
    };
  }
  const match = currentPeriod.tahunAjaran.match(/^(\d{4})\s*\/\s*(\d{4})$/);
  let nextYear = currentPeriod.tahunAjaran;
  if (match) {
    const y1 = Number(match[1]) + 1;
    const y2 = Number(match[2]) + 1;
    nextYear = `${y1}/${y2}`;
  } else {
    const single = Number(currentPeriod.tahunAjaran.slice(0, 4));
    if (!Number.isNaN(single)) {
      nextYear = `${single + 1}/${single + 2}`;
    }
  }
  return {
    tahunAjaran: nextYear,
    semester: 'Ganjil',
    label: `${nextYear} · Semester Ganjil`,
    isYearRollover: true,
  };
}

export function formatTanggalId(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTimeId(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
