// Adapter penyimpanan lokal (localStorage) yang terstruktur seperti repository
// Struktur ini memudahkan migrasi ke backend cloud (Firebase / Supabase) di masa mendatang.

import {SchoolDatabaseState} from '../types/school';

const STORAGE_KEY = 'smpn_besakih_sim_data_v1';
const SESSION_KEY = 'smpn_besakih_session_user_v1';
const THEME_KEY = 'smpn_besakih_theme_v1';

export interface StorageRepository {
  loadState: (fallbackSeed: SchoolDatabaseState) => SchoolDatabaseState;
  saveState: (state: SchoolDatabaseState) => void;
  clearState: () => void;
  exportBackupJson: (state: SchoolDatabaseState) => string;
  parseBackupJson: (raw: string) => SchoolDatabaseState;
}

// Migrasi otomatis data lama (v1 tanpa periode) agar tetap kompatibel & historis
function migrateStateWithPeriods(
  rawState: Partial<SchoolDatabaseState>,
  fallbackSeed: SchoolDatabaseState
): SchoolDatabaseState {
  const periods =
    Array.isArray(rawState.periods) && rawState.periods.length > 0
      ? rawState.periods
      : fallbackSeed.periods;

  const activePeriodId =
    rawState.activePeriodId && periods.some((p) => p.id === rawState.activePeriodId)
      ? rawState.activePeriodId
      : periods.find((p) => p.aktif)?.id || periods[0].id;

  const gurus = (rawState.gurus || fallbackSeed.gurus).map((g) => ({
    ...g,
    periodId: g.periodId || activePeriodId,
  }));

  const guruByMapel = new Map<string, {id: string; nama: string}>();
  gurus.forEach((g) => {
    g.mapelDiampu.forEach((m) => {
      if (!guruByMapel.has(m)) guruByMapel.set(m, {id: g.id, nama: g.nama});
    });
  });

  const siswas = (rawState.siswas || fallbackSeed.siswas).map((s) => ({
    ...s,
    periodId: s.periodId || activePeriodId,
  }));

  const nilaiRecords = (rawState.nilaiRecords || fallbackSeed.nilaiRecords).map((n) => {
    const matchedPeriod =
      periods.find((p) => p.tahunAjaran === n.tahunAjaran && p.semester === n.semester) ||
      periods.find((p) => p.id === (n.periodId || activePeriodId)) ||
      periods[0];
    const pengampu = guruByMapel.get(n.mapel);
    return {
      ...n,
      periodId: n.periodId || matchedPeriod.id,
      guruPengampuId: n.guruPengampuId || pengampu?.id,
      guruPengampuNama: n.guruPengampuNama || pengampu?.nama,
      tugasList:
        Array.isArray(n.tugasList) && n.tugasList.length > 0
          ? n.tugasList
          : [n.tugas ?? null, null, null, null, null, null, null, null, null, null],
      keseharianList:
        Array.isArray(n.keseharianList) && n.keseharianList.length > 0
          ? n.keseharianList
          : [n.keseharian ?? null, null, null, null, null, null, null, null, null, null],
    };
  });

  const existingNilaiIds = new Set(nilaiRecords.map((n) => n.id));
  const shouldBackfillSeedNilai = (rawState.version ?? 0) < 6;
  const mergedNilaiRecords = shouldBackfillSeedNilai
    ? [
        ...nilaiRecords,
        ...fallbackSeed.nilaiRecords.filter((sn) => !existingNilaiIds.has(sn.id)),
      ]
    : nilaiRecords;

  const adminGuruEntries = (rawState.adminGuruEntries || fallbackSeed.adminGuruEntries).map((e) => {
    const matchedPeriod =
      periods.find((p) => p.tahunAjaran === e.tahunAjaran && p.semester === e.semester) ||
      periods.find((p) => p.id === (e.periodId || activePeriodId)) ||
      periods[0];
    const gObj = gurus.find((g) => g.id === e.guruId);
    return {
      ...e,
      periodId: e.periodId || matchedPeriod.id,
      userId: e.userId || gObj?.userId,
      fileName: e.fileName || `${e.judul.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`,
      fileType: e.fileType || 'application/pdf',
    };
  });

  const existingAccounts =
    Array.isArray(rawState.accounts) && rawState.accounts.length > 0
      ? rawState.accounts
      : fallbackSeed.accounts;

  const hasStafAccount = existingAccounts.some((a) => a.role === 'STAF');
  let mergedAccounts = hasStafAccount
    ? existingAccounts
    : [
        ...existingAccounts,
        ...fallbackSeed.accounts.filter(
          (sa) =>
            sa.role === 'STAF' &&
            !existingAccounts.some(
              (ea) => ea.username.toLowerCase() === sa.username.toLowerCase()
            )
        ),
      ];

  const shouldBackfillKeuangan = (rawState.version ?? 0) < 7;
  if (shouldBackfillKeuangan && !mergedAccounts.some((a) => a.aksesKeuangan)) {
    mergedAccounts = mergedAccounts.map((a) =>
      a.id === 'usr-staf-2' || a.username.toLowerCase() === 'staf2'
        ? {
            ...a,
            aksesKeuangan: true,
            tugasTambahan: a.tugasTambahan || 'Operator BOS, Keuangan & Inventaris Sarpras',
          }
        : a
    );
  }

  const financePeriods =
    Array.isArray(rawState.financePeriods) && rawState.financePeriods.length > 0
      ? rawState.financePeriods
      : fallbackSeed.financePeriods;

  const activeFinancePeriodId =
    rawState.activeFinancePeriodId &&
    financePeriods.some((fp) => fp.id === rawState.activeFinancePeriodId)
      ? rawState.activeFinancePeriodId
      : financePeriods.find((fp) => fp.aktif)?.id || financePeriods[0].id;

  const financeWorksheets =
    Array.isArray(rawState.financeWorksheets) && rawState.financeWorksheets.length > 0
      ? rawState.financeWorksheets
      : fallbackSeed.financeWorksheets;

  return {
    ...fallbackSeed,
    ...rawState,
    version: 7,
    periods,
    activePeriodId,
    accounts: mergedAccounts,
    gurus,
    siswas,
    nilaiRecords: mergedNilaiRecords,
    studentRaporExtras: Array.isArray(rawState.studentRaporExtras)
      ? rawState.studentRaporExtras
      : fallbackSeed.studentRaporExtras,
    adminGuruEntries,
    guruCertificates: Array.isArray(rawState.guruCertificates)
      ? rawState.guruCertificates
      : fallbackSeed.guruCertificates,
    financePeriods,
    activeFinancePeriodId,
    financeWorksheets,
    readNotificationsByUser:
      rawState.readNotificationsByUser && typeof rawState.readNotificationsByUser === 'object'
        ? rawState.readNotificationsByUser
        : {},
    subjects:
      Array.isArray(rawState.subjects) && rawState.subjects.length > 0
        ? Array.from(new Set(rawState.subjects.filter((s) => typeof s === 'string' && s.trim() !== '')))
        : fallbackSeed.subjects,
    loginConfig: {
      ...fallbackSeed.loginConfig,
      ...(rawState.loginConfig || {}),
      notes: Array.isArray(rawState.loginConfig?.notes)
        ? rawState.loginConfig.notes
        : fallbackSeed.loginConfig.notes,
    },
    schoolProfile: {
      ...fallbackSeed.schoolProfile,
      ...(rawState.schoolProfile || {}),
    },
    gradeSettings: {
      ...fallbackSeed.gradeSettings,
      ...(rawState.gradeSettings || {}),
      kkmPerMapel: {
        ...fallbackSeed.gradeSettings.kkmPerMapel,
        ...(rawState.gradeSettings?.kkmPerMapel || {}),
      },
    },
    kepalaSekolah: {
      ...fallbackSeed.kepalaSekolah,
      ...(rawState.kepalaSekolah || {}),
    },
  };
}

export const localStorageAdapter: StorageRepository = {
  loadState(fallbackSeed: SchoolDatabaseState): SchoolDatabaseState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackSeed));
        return fallbackSeed;
      }
      const parsed = JSON.parse(raw) as Partial<SchoolDatabaseState>;
      return migrateStateWithPeriods(parsed, fallbackSeed);
    } catch {
      return fallbackSeed;
    }
  },

  saveState(state: SchoolDatabaseState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Gagal menyimpan data ke localStorage:', err);
    }
  },

  clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  exportBackupJson(state: SchoolDatabaseState): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        app: 'Sistem Manajemen Sekolah SMPN Satu Atap Besakih',
        npsn: state.schoolProfile.npsn,
        data: state,
      },
      null,
      2
    );
  },

  parseBackupJson(raw: string): SchoolDatabaseState {
    const parsed = JSON.parse(raw);
    const candidate = parsed?.data ? parsed.data : parsed;
    if (
      !candidate ||
      !candidate.schoolProfile ||
      !Array.isArray(candidate.accounts) ||
      !Array.isArray(candidate.siswas)
    ) {
      throw new Error('Format file backup JSON tidak valid atau tidak lengkap.');
    }
    return candidate as SchoolDatabaseState;
  },
};

export function loadSavedSessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSessionUserId(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(SESSION_KEY, userId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Abaikan error penyimpanan sesi
  }
}

export function loadSavedTheme(): 'light' | 'dark' {
  try {
    const val = localStorage.getItem(THEME_KEY);
    return val === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Abaikan error penyimpanan tema
  }
}
