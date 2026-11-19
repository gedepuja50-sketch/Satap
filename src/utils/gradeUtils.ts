// Fungsi utilitas perhitungan nilai, KKM, dan format tanggal/angka Indonesia

import {GradeSettings, NilaiRecord} from '../types/school';

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
