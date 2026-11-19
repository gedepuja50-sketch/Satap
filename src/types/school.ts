// Tipe data utama Sistem Manajemen Sekolah SMPN Satu Atap Besakih

export type UserRole = 'ADMIN' | 'GURU';

export type KelasLevel = '7' | '8' | '9';

export type SemesterType = 'Ganjil' | 'Genap';

export type MenuKey =
  | 'beranda'
  | 'profil-saya'
  | 'guru'
  | 'kepala-sekolah'
  | 'staf'
  | 'siswa'
  | 'nilai-siswa'
  | 'administrasi-guru'
  | 'sarana-prasarana'
  | 'prestasi'
  | 'panel-admin'
  | 'pengaturan';

export const DAFTAR_MAPEL: string[] = [
  'Pendidikan Agama',
  'PPKn',
  'Bahasa Indonesia',
  'Matematika',
  'IPA',
  'IPS',
  'Bahasa Inggris',
  'PJOK',
  'Seni Budaya',
  'Informatika',
  'Prakarya',
  'Bahasa Bali',
];

export const KATEGORI_ADMIN_GURU_DEFAULT: string[] = [
  'Program Tahunan (Prota)',
  'Program Semester (Promes)',
  'Capaian Pembelajaran (CP) & Alur Tujuan Pembelajaran (ATP)',
  'Modul Ajar / RPP',
  'Silabus',
  'Kalender Pendidikan & Jadwal Mengajar',
  'Daftar Hadir Siswa (Absensi)',
  'Daftar Nilai / Rekap Nilai',
  'Analisis Hasil Penilaian & Program Remedial/Pengayaan',
  'Jurnal Mengajar',
  'Bahan Ajar & Media Pembelajaran',
  'Soal & Kisi-kisi Ujian',
  'Sertifikat & Piagam Pelatihan',
  'Laporan Pengembangan Diri (PKB, Diklat, Workshop)',
  'SK Mengajar & Dokumen Kepegawaian',
  'Catatan Bimbingan/Supervisi Kepala Sekolah',
  'Lainnya',
];

export const TINGKAT_PRESTASI = [
  'Sekolah',
  'Kecamatan',
  'Kabupaten',
  'Provinsi',
  'Nasional',
  'Internasional',
] as const;

export type TingkatPrestasi = (typeof TINGKAT_PRESTASI)[number];

export interface EducationPeriod {
  id: string;
  tahunAjaran: string;
  semester: SemesterType;
  label: string;
  aktif: boolean;
  createdAt: string;
}

export interface SchoolProfile {
  nama: string;
  npsn: string;
  alamat: string;
  kabupaten: string;
  provinsi: string;
  telepon: string;
  email: string;
  tahunAjaranAktif: string;
  logoDataUrl: string;
  profilSingkat: string;
  visi: string;
  misi: string[];
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  namaLengkap: string;
  active: boolean;
  guruId?: string;
}

export interface Announcement {
  id: string;
  judul: string;
  ringkasan: string;
  isi: string;
  kategori: 'Akademik' | 'Kegiatan' | 'Kedisiplinan' | 'Pengumuman';
  tanggal: string;
  penulis: string;
  penting: boolean;
}

export interface GuruCustomField {
  id: string;
  label: string;
  value: string;
}

export interface Guru {
  id: string;
  periodId: string;
  userId: string;
  foto: string;
  nama: string;
  nip: string;
  nuptk: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  agama: string;
  alamat: string;
  noHp: string;
  email: string;
  pendidikanTerakhir: string;
  statusKepegawaian: 'PNS' | 'PPPK' | 'GTT / Honorer';
  golonganPangkat: string;
  jabatan: string;
  mapelDiampu: string[];
  kelasDiampu: KelasLevel[];
  jamMengajar: number;
  tahunMulaiBertugas: string;
  nik: string;
  npwp: string;
  noRekening: string;
  kontakDarurat: string;
  customFields: GuruCustomField[];
}

export interface GuruCertificate {
  id: string;
  guruId: string;
  userId: string;
  judul: string;
  tingkat: TingkatPrestasi;
  peringkat: string;
  penyelenggara: string;
  tahun: string;
  keterangan: string;
  fileId?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  previewDataUrl?: string;
  tanggalUpload: string;
}

export interface KepalaSekolah {
  foto: string;
  nama: string;
  nip: string;
  pangkatGolongan: string;
  periodeJabatan: string;
  email: string;
  noHp: string;
  sambutan: string;
  riwayatPendidikan: string[];
  riwayatJabatan: string[];
}

export interface Staf {
  id: string;
  foto: string;
  nama: string;
  nipAtauId: string;
  jabatan: string;
  status: 'PNS' | 'PPPK' | 'PTT / Honorer';
  noHp: string;
  email: string;
  alamat: string;
}

export interface Siswa {
  id: string;
  periodId: string;
  nis: string;
  nisn: string;
  nama: string;
  kelas: KelasLevel;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  namaOrtu: string;
  noHpOrtu: string;
}

export interface NilaiRecord {
  id: string;
  periodId: string;
  siswaId: string;
  kelas: KelasLevel;
  mapel: string;
  semester: SemesterType;
  tahunAjaran: string;
  guruPengampuId?: string;
  guruPengampuNama?: string;
  tugasList?: Array<number | null>; // Hingga 10 kolom nilai tugas (T1..T10)
  keseharianList?: Array<number | null>; // Penilaian harian setiap pertemuan (H1..Hn)
  tugas: number | null;
  keseharian: number | null;
  uts: number | null;
  uas: number | null;
  catatanGuru?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface EkskulItem {
  id: string;
  namaEkskul: string;
  predikat: 'A (Sangat Baik)' | 'B (Baik)' | 'C (Cukup)' | 'D (Perlu Bimbingan)';
  nilaiAngka?: number | null;
  keterangan: string;
}

export interface StudentRaporExtras {
  id: string;
  periodId: string;
  siswaId: string;
  ekstrakurikuler: EkskulItem[];
  catatanWaliKelas?: string;
  sakit?: number;
  izin?: number;
  alpa?: number;
  updatedBy?: string;
  updatedAt?: string;
}

export interface GradeSettings {
  bobotTugas: number;
  bobotKeseharian: number;
  bobotUts: number;
  bobotUas: number;
  kkmPerMapel: Record<string, number>;
}

export type StatusKelengkapan = 'Belum' | 'Sebagian' | 'Lengkap';

export interface AdminGuruEntry {
  id: string;
  periodId: string;
  guruId: string;
  userId?: string;
  guruNama: string;
  judul: string;
  kategori: string;
  tahunAjaran: string;
  semester: SemesterType;
  keterangan: string;
  fileId?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  tanggalUpload: string;
  status: StatusKelengkapan;
}

export type KondisiSarpras = 'Baik' | 'Rusak Ringan' | 'Rusak Berat';

export interface Building {
  id: string;
  nama: string;
  jenis: string;
  jumlahRuang: number;
  luasM2: number;
  tahunDibangun: string;
  kondisi: KondisiSarpras;
  foto: string;
  keterangan: string;
}

export interface SaranaAsset {
  id: string;
  buildingId: string;
  namaAset: string;
  jumlah: number;
  kondisi: KondisiSarpras;
  tahunPengadaan: string;
  sumberDana: string;
  lokasi: string;
  keterangan: string;
}

export interface Prestasi {
  id: string;
  kategori: 'Siswa' | 'Sekolah' | 'Guru';
  judul: string;
  namaPeraih: string;
  tingkat: TingkatPrestasi;
  peringkat: string;
  tanggal: string;
  penyelenggara: string;
  deskripsi: string;
  mediaFotoId?: string;
  mediaFotoUrl?: string;
  mediaVideoId?: string;
  mediaVideoName?: string;
  createdByUserId: string;
  createdByName: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: 'TAMBAH' | 'UBAH' | 'HAPUS' | 'LOGIN' | 'EXPORT' | 'BACKUP' | 'RESTORE';
  entity: string;
  detail: string;
}

export interface SchoolDatabaseState {
  version: number;
  periods: EducationPeriod[];
  activePeriodId: string;
  schoolProfile: SchoolProfile;
  accounts: UserAccount[];
  announcements: Announcement[];
  gurus: Guru[];
  kepalaSekolah: KepalaSekolah;
  stafs: Staf[];
  siswas: Siswa[];
  nilaiRecords: NilaiRecord[];
  studentRaporExtras: StudentRaporExtras[];
  gradeSettings: GradeSettings;
  adminGuruEntries: AdminGuruEntry[];
  customAdminCategories: string[];
  buildings: Building[];
  assets: SaranaAsset[];
  prestasis: Prestasi[];
  guruCertificates: GuruCertificate[];
  activityLogs: ActivityLog[];
}
