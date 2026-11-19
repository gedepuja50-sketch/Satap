// Data awal (seed data) realistis untuk SMPN Satu Atap Besakih, Karangasem, Bali
// Mencakup periode pendidikan aktif (2026/2027 - Ganjil) dan arsip historis (2025/2026 - Genap)

import {
  AdminGuruEntry,
  Announcement,
  Building,
  DAFTAR_MAPEL,
  EducationPeriod,
  Guru,
  GuruCertificate,
  KelasLevel,
  NilaiRecord,
  Prestasi,
  SaranaAsset,
  SchoolDatabaseState,
  Siswa,
  Staf,
  StudentRaporExtras,
  UserAccount,
} from '../types/school';
import {DEFAULT_SCHOOL_LOGO} from './defaultLogo';

export const SCHOOL_BANNER_IMAGE = '/src/assets/images/school_banner_besakih_1795050454217.jpg';
export const PRINCIPAL_PORTRAIT_IMAGE = '/src/assets/images/principal_portrait_1795050454859.jpg';
export const BUILDING_CLASSROOM_IMAGE = '/src/assets/images/building_classroom_1795050455124.jpg';
export const ACHIEVEMENT_PHOTO_IMAGE = '/src/assets/images/achievement_science_1795050455518.jpg';

export const PERIOD_ACTIVE_ID = 'per-2026-2027-Ganjil';
export const PERIOD_HIST_ID = 'per-2025-2026-Genap';

const periods: EducationPeriod[] = [
  {
    id: PERIOD_ACTIVE_ID,
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    label: '2026/2027 · Semester Ganjil',
    aktif: true,
    createdAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: PERIOD_HIST_ID,
    tahunAjaran: '2025/2026',
    semester: 'Genap',
    label: '2025/2026 · Semester Genap',
    aktif: false,
    createdAt: '2026-01-05T08:00:00.000Z',
  },
];

const accounts: UserAccount[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'admin123',
    role: 'ADMIN',
    namaLengkap: 'Administrator Sekolah',
    active: true,
  },
  {id: 'usr-guru-1', username: 'guru1', password: 'guru123', role: 'GURU', namaLengkap: 'I Wayan Sudarma, S.Pd.', active: true, guruId: 'guru-1'},
  {id: 'usr-guru-2', username: 'guru2', password: 'guru123', role: 'GURU', namaLengkap: 'Ni Luh Putu Ayu Lestari, S.Pd.', active: true, guruId: 'guru-2'},
  {id: 'usr-guru-3', username: 'guru3', password: 'guru123', role: 'GURU', namaLengkap: 'I Made Wirawan, S.Pd., M.Pd.', active: true, guruId: 'guru-3'},
  {id: 'usr-guru-4', username: 'guru4', password: 'guru123', role: 'GURU', namaLengkap: 'Ni Ketut Sri Wahyuni, S.Pd.', active: true, guruId: 'guru-4'},
  {id: 'usr-guru-5', username: 'guru5', password: 'guru123', role: 'GURU', namaLengkap: 'I Komang Agus Pratama, S.Pd.', active: true, guruId: 'guru-5'},
  {id: 'usr-guru-6', username: 'guru6', password: 'guru123', role: 'GURU', namaLengkap: 'Ni Made Dwi Cahyani, S.Pd.H.', active: true, guruId: 'guru-6'},
  {id: 'usr-guru-7', username: 'guru7', password: 'guru123', role: 'GURU', namaLengkap: 'I Nyoman Putra Wijaya, S.Or.', active: true, guruId: 'guru-7'},
  {id: 'usr-guru-8', username: 'guru8', password: 'guru123', role: 'GURU', namaLengkap: 'Ni Wayan Eka Purnami, S.Kom.', active: true, guruId: 'guru-8'},
];

const baseGurusActive: Guru[] = [
  {
    id: 'guru-1',
    periodId: PERIOD_ACTIVE_ID,
    userId: 'usr-guru-1',
    foto: '',
    nama: 'I Wayan Sudarma, S.Pd.',
    nip: '19840512 201001 1 018',
    nuptk: '4844762663200012',
    tempatLahir: 'Karangasem',
    tanggalLahir: '1984-05-12',
    jenisKelamin: 'Laki-laki',
    agama: 'Hindu',
    alamat: 'Br. Dinas Besakih Kawan, Desa Besakih, Kec. Rendang, Karangasem',
    noHp: '081239441101',
    email: 'wayan.sudarma@smpnsatapbesakih.sch.id',
    pendidikanTerakhir: 'S1 Pendidikan Matematika - Undiksha',
    statusKepegawaian: 'PNS',
    golonganPangkat: 'Pembina / IV.a',
    jabatan: 'Guru Madya & Wakasek Kurikulum',
    mapelDiampu: ['Matematika'],
    kelasDiampu: ['7', '8', '9'],
    jamMengajar: 24,
    tahunMulaiBertugas: '2010',
    nik: '5107051205840001',
    npwp: '54.210.881.2-907.000',
    noRekening: '012-02-045182-1 (BPD Bali)',
    kontakDarurat: 'Ni Made Sari (Istri) - 081239441199',
    customFields: [
      {id: 'cf-1', label: 'Sertifikat Pendidik', value: '20141509812'},
      {id: 'cf-2', label: 'Tugas Tambahan', value: 'Koordinator Kurikulum Merdeka'},
    ],
  },
  {
    id: 'guru-2',
    periodId: PERIOD_ACTIVE_ID,
    userId: 'usr-guru-2',
    foto: '',
    nama: 'Ni Luh Putu Ayu Lestari, S.Pd.',
    nip: '19881103 201402 2 004',
    nuptk: '7435766667210023',
    tempatLahir: 'Klungkung',
    tanggalLahir: '1988-11-03',
    jenisKelamin: 'Perempuan',
    agama: 'Hindu',
    alamat: 'Br. Dinas Menanga, Desa Menanga, Kec. Rendang, Karangasem',
    noHp: '081338552202',
    email: 'ayu.lestari@smpnsatapbesakih.sch.id',
    pendidikanTerakhir: 'S1 Pendidikan Bahasa Indonesia - UNHI',
    statusKepegawaian: 'PNS',
    golonganPangkat: 'Penata / III.c',
    jabatan: 'Guru Muda & Wali Kelas 7',
    mapelDiampu: ['Bahasa Indonesia'],
    kelasDiampu: ['7', '8', '9'],
    jamMengajar: 24,
    tahunMulaiBertugas: '2014',
    nik: '5105034311880002',
    npwp: '67.441.209.4-907.000',
    noRekening: '012-02-077412-5 (BPD Bali)',
    kontakDarurat: 'I Putu Gede (Suami) - 081338552288',
    customFields: [{id: 'cf-3', label: 'Pembina Ekstrakurikuler', value: 'Jurnalistik & Literasi Sekolah'}],
  },
  {
    id: 'guru-3',
    periodId: PERIOD_ACTIVE_ID,
    userId: 'usr-guru-3',
    foto: '',
    nama: 'I Made Wirawan, S.Pd., M.Pd.',
    nip: '19810920 200902 1 006',
    nuptk: '3252759660200014',
    tempatLahir: 'Bangli',
    tanggalLahir: '1981-09-20',
    jenisKelamin: 'Laki-laki',
    agama: 'Hindu',
    alamat: 'Br. Dinas Kedungdung, Desa Besakih, Kec. Rendang, Karangasem',
    noHp: '081999663303',
    email: 'made.wirawan@smpnsatapbesakih.sch.id',
    pendidikanTerakhir: 'S2 Pendidikan IPA - Undiksha',
    statusKepegawaian: 'PNS',
    golonganPangkat: 'Pembina / IV.a',
    jabatan: 'Guru Madya & Kepala Laboratorium IPA',
    mapelDiampu: ['IPA'],
    kelasDiampu: ['7', '8', '9'],
    jamMengajar: 22,
    tahunMulaiBertugas: '2009',
    nik: '5106022009810003',
    npwp: '48.102.553.1-907.000',
    noRekening: '012-02-033910-8 (BPD Bali)',
    kontakDarurat: 'Ni Ketut Ari (Istri) - 081999663377',
    customFields: [{id: 'cf-4', label: 'Pembina OSN', value: 'Olimpiade Sains Nasional IPA'}],
  },
  {
    id: 'guru-4',
    periodId: PERIOD_ACTIVE_ID,
    userId: 'usr-guru-4',
    foto: '',
    nama: 'Ni Ketut Sri Wahyuni, S.Pd.',
    nip: '19910315 201903 2 011',
    nuptk: '1647769670220009',
    tempatLahir: 'Amlapura',
    tanggalLahir: '1991-03-15',
    jenisKelamin: 'Perempuan',
    agama: 'Hindu',
    alamat: 'Br. Dinas Rendang Tengah, Kec. Rendang, Karangasem',
    noHp: '085237774404',
    email: 'sri.wahyuni@smpnsatapbesakih.sch.id',
    pendidikanTerakhir: 'S1 Pendidikan Bahasa Inggris - Undiksha',
    statusKepegawaian: 'PNS',
    golonganPangkat: 'Penata Muda Tk.I / III.b',
    jabatan: 'Guru Pertama & Wali Kelas 8',
    mapelDiampu: ['Bahasa Inggris'],
    kelasDiampu: ['7', '8', '9'],
    jamMengajar: 20,
    tahunMulaiBertugas: '2019',
    nik: '5107045503910004',
    npwp: '81.334.712.9-907.000',
    noRekening: '012-02-089123-4 (BPD Bali)',
    kontakDarurat: 'I Wayan Dana (Ayah) - 085237774490',
    customFields: [],
  },
  {
    id: 'guru-5',
    periodId: PERIOD_ACTIVE_ID,
    userId: 'usr-guru-5',
    foto: '',
    nama: 'I Komang Agus Pratama, S.Pd.',
    nip: '19930728 202221 1 005',
    nuptk: '8060771672130018',
    tempatLahir: 'Denpasar',
    tanggalLahir: '1993-07-28',
    jenisKelamin: 'Laki-laki',
    agama: 'Hindu',
    alamat: 'Br. Dinas Pempatan, Kec. Rendang, Karangasem',
    noHp: '087861885505',
    email: 'agus.pratama@smpnsatapbesakih.sch.id',
    pendidikanTerakhir: 'S1 Pendidikan Sejarah & IPS - Undiksha',
    statusKepegawaian: 'PPPK',
    golonganPangkat: 'Ahli Pertama / IX',
    jabatan: 'Guru IPS & Pembina OSIS',
    mapelDiampu: ['IPS'],
    kelasDiampu: ['7', '8', '9'],
    jamMengajar: 20,
    tahunMulaiBertugas: '2022',
    nik: '5171022807930005',
    npwp: '90.112.448.6-907.000',
    noRekening: '012-02-094451-2 (BPD Bali)',
    kontakDarurat: 'Ni Luh Komang (Ibu) - 087861885566',
    customFields: [],
  },
  {
    id: 'guru-6',
    periodId: PERIOD_ACTIVE_ID,
    userId: 'usr-guru-6',
    foto: '',
    nama: 'Ni Made Dwi Cahyani, S.Pd.H.',
    nip: '19890614 202012 2 007',
    nuptk: '5946767668210015',
    tempatLahir: 'Karangasem',
    tanggalLahir: '1989-06-14',
    jenisKelamin: 'Perempuan',
    agama: 'Hindu',
    alamat: 'Br. Dinas Kunyit, Desa Besakih, Kec. Rendang, Karangasem',
    noHp: '081805996606',
    email: 'dwi.cahyani@smpnsatapbesakih.sch.id',
    pendidikanTerakhir: 'S1 Pendidikan Agama Hindu - IHDN Denpasar',
    statusKepegawaian: 'PNS',
    golonganPangkat: 'Penata Muda Tk.I / III.b',
    jabatan: 'Guru Pendidikan Agama & PPKn',
    mapelDiampu: ['Pendidikan Agama', 'PPKn'],
    kelasDiampu: ['7', '8', '9'],
    jamMengajar: 24,
    tahunMulaiBertugas: '2020',
    nik: '5107055406890006',
    npwp: '77.819.304.5-907.000',
    noRekening: '012-02-081239-0 (BPD Bali)',
    kontakDarurat: 'I Kadek Suardika (Suami) - 081805996677',
    customFields: [],
  },
  {
    id: 'guru-7',
    periodId: PERIOD_ACTIVE_ID,
    userId: 'usr-guru-7',
    foto: '',
    nama: 'I Nyoman Putra Wijaya, S.Or.',
    nip: '19920209 202321 1 008',
    nuptk: '2541770671130021',
    tempatLahir: 'Gianyar',
    tanggalLahir: '1992-02-09',
    jenisKelamin: 'Laki-laki',
    agama: 'Hindu',
    alamat: 'Br. Dinas Nongan, Kec. Rendang, Karangasem',
    noHp: '082144107707',
    email: 'putra.wijaya@smpnsatapbesakih.sch.id',
    pendidikanTerakhir: 'S1 Pendidikan Jasmani Kesehatan & Rekreasi - Undiksha',
    statusKepegawaian: 'PPPK',
    golonganPangkat: 'Ahli Pertama / IX',
    jabatan: 'Guru PJOK & Prakarya',
    mapelDiampu: ['PJOK', 'Prakarya'],
    kelasDiampu: ['7', '8', '9'],
    jamMengajar: 22,
    tahunMulaiBertugas: '2021',
    nik: '5104030902920007',
    npwp: '91.652.118.3-907.000',
    noRekening: '012-02-096712-9 (BPD Bali)',
    kontakDarurat: 'Ni Wayan Sumiati (Istri) - 082144107711',
    customFields: [{id: 'cf-5', label: 'Pembina Pramuka', value: 'Gugus Depan SMPN Satap Besakih'}],
  },
  {
    id: 'guru-8',
    periodId: PERIOD_ACTIVE_ID,
    userId: 'usr-guru-8',
    foto: '',
    nama: 'Ni Wayan Eka Purnami, S.Kom.',
    nip: '-',
    nuptk: '6839773674230004',
    tempatLahir: 'Karangasem',
    tanggalLahir: '1995-05-07',
    jenisKelamin: 'Perempuan',
    agama: 'Hindu',
    alamat: 'Br. Dinas Kedungdung, Desa Besakih, Kec. Rendang, Karangasem',
    noHp: '085739218808',
    email: 'eka.purnami@smpnsatapbesakih.sch.id',
    pendidikanTerakhir: 'S1 Pendidikan Teknik Informatika - Undiksha',
    statusKepegawaian: 'GTT / Honorer',
    golonganPangkat: 'Non-ASN / Honorer Daerah',
    jabatan: 'Guru Informatika, Seni Budaya & Bahasa Bali',
    mapelDiampu: ['Informatika', 'Seni Budaya', 'Bahasa Bali'],
    kelasDiampu: ['7', '8', '9'],
    jamMengajar: 24,
    tahunMulaiBertugas: '2021',
    nik: '5107054705950008',
    npwp: '93.204.519.7-907.000',
    noRekening: '012-02-098821-3 (BPD Bali)',
    kontakDarurat: 'I Wayan Sujana (Ayah) - 085739218899',
    customFields: [{id: 'cf-6', label: 'Operator Dapodik', value: 'Pendamping Sistem Informasi Sekolah'}],
  },
];

// Salinan historis data penugasan guru pada periode 2025/2026 Genap
const baseGurusHist: Guru[] = baseGurusActive.map((g) => ({
  ...g,
  id: `${g.id}-hist`,
  periodId: PERIOD_HIST_ID,
}));

const gurus: Guru[] = [...baseGurusActive, ...baseGurusHist];

const stafs: Staf[] = [
  {
    id: 'staf-1',
    foto: '',
    nama: 'I Ketut Sukarma',
    nipAtauId: '19790817 200801 1 012',
    jabatan: 'Kepala Tata Usaha (TU)',
    status: 'PNS',
    noHp: '081236110021',
    email: 'ketut.sukarma@smpnsatapbesakih.sch.id',
    alamat: 'Br. Dinas Besakih Kangin, Desa Besakih, Kec. Rendang',
  },
  {
    id: 'staf-2',
    foto: '',
    nama: 'Ni Putu Rismawati, A.Md.',
    nipAtauId: 'PTT-2019-004',
    jabatan: 'Staf Administrasi & Operator BOS',
    status: 'PTT / Honorer',
    noHp: '085337220045',
    email: 'putu.rismawati@smpnsatapbesakih.sch.id',
    alamat: 'Br. Dinas Menanga, Desa Menanga, Kec. Rendang',
  },
  {
    id: 'staf-3',
    foto: '',
    nama: 'I Made Subawa',
    nipAtauId: 'PTT-2016-002',
    jabatan: 'Petugas Perpustakaan',
    status: 'PTT / Honorer',
    noHp: '081936330088',
    email: 'made.subawa@smpnsatapbesakih.sch.id',
    alamat: 'Br. Dinas Kedungdung, Desa Besakih, Kec. Rendang',
  },
  {
    id: 'staf-4',
    foto: '',
    nama: 'I Wayan Gede Sutama',
    nipAtauId: 'PTT-2015-001',
    jabatan: 'Penjaga Sekolah & Kebersihan',
    status: 'PTT / Honorer',
    noHp: '087761440099',
    email: 'sutama.besakih@smpnsatapbesakih.sch.id',
    alamat: 'Br. Dinas Kedungdung, Desa Besakih, Kec. Rendang',
  },
];

// Generator 12 siswa realistis per kelas untuk Periode Aktif (total 36 siswa)
const rawSiswaNames: Record<KelasLevel, Array<{nama: string; jk: 'L' | 'P'; banjar: string; ortu: string}>> = {
  '7': [
    {nama: 'I Wayan Aditya Pratama', jk: 'L', banjar: 'Br. Dinas Kedungdung', ortu: 'I Wayan Sudiarta'},
    {nama: 'Ni Luh Putu Candra Dewi', jk: 'P', banjar: 'Br. Dinas Besakih Kawan', ortu: 'I Made Suastika'},
    {nama: 'I Made Bagus Mahendra', jk: 'L', banjar: 'Br. Dinas Kunyit', ortu: 'I Nyoman Merta'},
    {nama: 'Ni Ketut Sintya Maharani', jk: 'P', banjar: 'Br. Dinas Kedungdung', ortu: 'I Ketut Sudana'},
    {nama: 'I Komang Krisna Wijaya', jk: 'L', banjar: 'Br. Dinas Besakih Kangin', ortu: 'I Wayan Darma'},
    {nama: 'Ni Putu Amelia Sari', jk: 'P', banjar: 'Br. Dinas Menanga', ortu: 'I Putu Agus'},
    {nama: 'I Kadek Surya Darmawan', jk: 'L', banjar: 'Br. Dinas Kedungdung', ortu: 'I Made Raka'},
    {nama: 'Ni Made Ratna Pratiwi', jk: 'P', banjar: 'Br. Dinas Kunyit', ortu: 'I Komang Arta'},
    {nama: 'I Nyoman Restu Saputra', jk: 'L', banjar: 'Br. Dinas Besakih Kawan', ortu: 'I Nyoman Gede'},
    {nama: 'Ni Wayan Ayu Trisna', jk: 'P', banjar: 'Br. Dinas Pempatan', ortu: 'I Wayan Karyawan'},
    {nama: 'I Putu Yoga Permana', jk: 'L', banjar: 'Br. Dinas Kedungdung', ortu: 'I Putu Sutama'},
    {nama: 'Ni Kadek Nia Anggreni', jk: 'P', banjar: 'Br. Dinas Besakih Kangin', ortu: 'I Kadek Jaya'},
  ],
  '8': [
    {nama: 'I Wayan Rama Sanjaya', jk: 'L', banjar: 'Br. Dinas Kedungdung', ortu: 'I Wayan Budi'},
    {nama: 'Ni Made Desy Purnamasari', jk: 'P', banjar: 'Br. Dinas Besakih Kawan', ortu: 'I Made Karya'},
    {nama: 'I Kadek Dimas Arimbawa', jk: 'L', banjar: 'Br. Dinas Kunyit', ortu: 'I Kadek Suta'},
    {nama: 'Ni Luh Sari Wulandari', jk: 'P', banjar: 'Br. Dinas Menanga', ortu: 'I Nyoman Adnyana'},
    {nama: 'I Komang Wahyu Setiawan', jk: 'L', banjar: 'Br. Dinas Besakih Kangin', ortu: 'I Komang Darta'},
    {nama: 'Ni Putu Indah Permata', jk: 'P', banjar: 'Br. Dinas Kedungdung', ortu: 'I Putu Wira'},
    {nama: 'I Made Yogi Pranata', jk: 'L', banjar: 'Br. Dinas Pempatan', ortu: 'I Made Tirtha'},
    {nama: 'Ni Ketut Novi Arianti', jk: 'P', banjar: 'Br. Dinas Kedungdung', ortu: 'I Ketut Narta'},
    {nama: 'I Putu Arya Kusuma', jk: 'L', banjar: 'Br. Dinas Kunyit', ortu: 'I Putu Sumerta'},
    {nama: 'Ni Wayan Dewi Lestari', jk: 'P', banjar: 'Br. Dinas Besakih Kawan', ortu: 'I Wayan Guna'},
    {nama: 'I Nyoman Hendra Gunawan', jk: 'L', banjar: 'Br. Dinas Kedungdung', ortu: 'I Nyoman Sudi'},
    {nama: 'Ni Kadek Sinta Damayanti', jk: 'P', banjar: 'Br. Dinas Besakih Kangin', ortu: 'I Kadek Pastika'},
  ],
  '9': [
    {nama: 'I Putu Raditya Pratama', jk: 'L', banjar: 'Br. Dinas Kedungdung', ortu: 'I Putu Sudira'},
    {nama: 'Ni Luh Gede Putri Saraswati', jk: 'P', banjar: 'Br. Dinas Besakih Kawan', ortu: 'I Wayan Gede'},
    {nama: 'I Made Dwi Saputra', jk: 'L', banjar: 'Br. Dinas Kunyit', ortu: 'I Made Sutrisna'},
    {nama: 'Ni Ketut Yuni Astuti', jk: 'P', banjar: 'Br. Dinas Kedungdung', ortu: 'I Ketut Sujana'},
    {nama: 'I Komang Ariasa Putra', jk: 'L', banjar: 'Br. Dinas Menanga', ortu: 'I Komang Sari'},
    {nama: 'Ni Wayan Diah Kusuma', jk: 'P', banjar: 'Br. Dinas Besakih Kangin', ortu: 'I Wayan Rencana'},
    {nama: 'I Kadek Agus Mahendra', jk: 'L', banjar: 'Br. Dinas Kedungdung', ortu: 'I Kadek Sudarma'},
    {nama: 'Ni Made Wulan Cahyani', jk: 'P', banjar: 'Br. Dinas Pempatan', ortu: 'I Made Darsana'},
    {nama: 'I Nyoman Bayu Nugraha', jk: 'L', banjar: 'Br. Dinas Kunyit', ortu: 'I Nyoman Kerta'},
    {nama: 'Ni Putu Erika Meliani', jk: 'P', banjar: 'Br. Dinas Besakih Kawan', ortu: 'I Putu Arjana'},
    {nama: 'I Wayan Teguh Santoso', jk: 'L', banjar: 'Br. Dinas Kedungdung', ortu: 'I Wayan Putra'},
    {nama: 'Ni Kadek Gita Cahaya', jk: 'P', banjar: 'Br. Dinas Besakih Kangin', ortu: 'I Kadek Budiarta'},
  ],
};

const siswasActive: Siswa[] = (['7', '8', '9'] as KelasLevel[]).flatMap((kelas) => {
  const yearOffset = kelas === '7' ? '2013' : kelas === '8' ? '2012' : '2011';
  const nisPrefix = kelas === '7' ? '267' : kelas === '8' ? '258' : '249';
  return rawSiswaNames[kelas].map((item, idx) => {
    const num = String(idx + 1).padStart(2, '0');
    const month = String(((idx * 2) % 12) + 1).padStart(2, '0');
    const day = String(((idx * 3 + 5) % 27) + 1).padStart(2, '0');
    return {
      id: `sis-${kelas}-${num}`,
      periodId: PERIOD_ACTIVE_ID,
      nis: `${nisPrefix}${num}`,
      nisn: `01${kelas === '7' ? '3' : kelas === '8' ? '2' : '1'}${String(411000 + Number(kelas) * 100 + idx + 1)}`,
      nama: item.nama,
      kelas,
      jenisKelamin: item.jk,
      tempatLahir: 'Karangasem',
      tanggalLahir: `${yearOffset}-${month}-${day}`,
      alamat: `${item.banjar}, Desa Besakih, Kec. Rendang, Karangasem`,
      namaOrtu: item.ortu,
      noHpOrtu: `08523${kelas}${String(11000 + idx * 137)}`,
    };
  });
});

// Data siswa historis periode 2025/2026 Genap (siswa kelas 8 & 9 sebelumnya di kelas 7 & 8 + alumni kelas 9)
const siswasHist: Siswa[] = [
  ...siswasActive
    .filter((s) => s.kelas === '8' || s.kelas === '9')
    .map((s) => ({
      ...s,
      id: `${s.id}-hist`,
      periodId: PERIOD_HIST_ID,
      kelas: (s.kelas === '8' ? '7' : '8') as KelasLevel,
    })),
  ...[
    {nama: 'I Gede Putra Pratama', jk: 'L' as const, ortu: 'I Gede Wira'},
    {nama: 'Ni Luh Komang Tri Utami', jk: 'P' as const, ortu: 'I Komang Sudi'},
    {nama: 'I Wayan Eka Darma', jk: 'L' as const, ortu: 'I Wayan Kerta'},
    {nama: 'Ni Made Ayu Ningsih', jk: 'P' as const, ortu: 'I Made Suta'},
  ].map((al, idx) => ({
    id: `sis-hist-9-0${idx + 1}`,
    periodId: PERIOD_HIST_ID,
    nis: `2390${idx + 1}`,
    nisn: `01041190${idx + 1}`,
    nama: al.nama,
    kelas: '9' as KelasLevel,
    jenisKelamin: al.jk,
    tempatLahir: 'Karangasem',
    tanggalLahir: `2010-0${idx + 2}-12`,
    alamat: 'Br. Dinas Besakih, Kec. Rendang, Karangasem',
    namaOrtu: al.ortu,
    noHpOrtu: `0852391100${idx + 1}`,
  })),
];

const siswas: Siswa[] = [...siswasActive, ...siswasHist];

// Map guru pengampu per mapel untuk menandai guruPengampuId & guruPengampuNama pada catatan nilai
const mapelPengampuLookup = new Map<string, Guru>();
baseGurusActive.forEach((g) => {
  g.mapelDiampu.forEach((m) => {
    if (!mapelPengampuLookup.has(m)) mapelPengampuLookup.set(m, g);
  });
});

const nilaiRecords: NilaiRecord[] = [];
const seededMapels = [
  'Matematika',
  'Bahasa Indonesia',
  'IPA',
  'Bahasa Inggris',
  'IPS',
  'Informatika',
  'Pendidikan Agama',
  'PJOK',
  'Bahasa Bali',
];

// Nilai periode aktif 2026/2027 Ganjil
const sampleTeacherNotes = [
  'Aktif dalam diskusi kelas dan teliti mengerjakan latihan soal.',
  'Menunjukkan peningkatan pemahaman konsep yang sangat baik.',
  'Perlu lebih rutin mengulang materi di rumah serta melengkapi tugas tepat waktu.',
  'Sangat kooperatif saat praktik kelompok dan antusias bertanya.',
];

siswasActive.forEach((s, sIdx) => {
  seededMapels.forEach((mapel, mIdx) => {
    const pengampu = mapelPengampuLookup.get(mapel);
    const base = 74 + ((sIdx * 7 + mIdx * 5) % 21);
    const tugas = Math.min(98, base + 3);
    const keseharian = Math.min(97, base + 1);
    const uts = Math.min(96, base - 2 + (sIdx % 4));
    const uas = Math.min(99, base + ((mIdx + sIdx) % 5) - 2);
    const tugasList: Array<number | null> = [
      Math.min(100, tugas),
      Math.min(100, Math.max(60, tugas - 2)),
      Math.min(100, tugas + 1),
      Math.min(100, Math.max(60, tugas - 1)),
      Math.min(100, tugas + 2),
      null,
      null,
      null,
      null,
      null,
    ];
    const keseharianList: Array<number | null> = [
      Math.min(100, keseharian),
      Math.min(100, keseharian + 1),
      Math.min(100, Math.max(60, keseharian - 1)),
      Math.min(100, keseharian),
      Math.min(100, keseharian + 2),
      Math.min(100, Math.max(60, keseharian - 2)),
      null,
      null,
      null,
      null,
    ];
    nilaiRecords.push({
      id: `nil-${PERIOD_ACTIVE_ID}-${s.id}-${mapel}`,
      periodId: PERIOD_ACTIVE_ID,
      siswaId: s.id,
      kelas: s.kelas,
      mapel,
      semester: 'Ganjil',
      tahunAjaran: '2026/2027',
      guruPengampuId: pengampu?.id,
      guruPengampuNama: pengampu?.nama,
      tugasList,
      keseharianList,
      tugas,
      keseharian,
      uts,
      uas,
      catatanGuru: sampleTeacherNotes[(sIdx + mIdx) % sampleTeacherNotes.length],
      updatedBy: pengampu?.nama || 'Sistem Awal',
      updatedAt: '2026-11-10T09:00:00.000Z',
    });
  });
});

// Nilai historis periode 2025/2026 Genap
siswasHist.forEach((s, sIdx) => {
  ['Matematika', 'Bahasa Indonesia', 'IPA', 'Bahasa Inggris', 'Informatika'].forEach((mapel, mIdx) => {
    const pengampu = mapelPengampuLookup.get(mapel);
    const base = 76 + ((sIdx * 5 + mIdx * 4) % 19);
    const tVal = Math.min(96, base + 2);
    const kVal = Math.min(95, base + 1);
    nilaiRecords.push({
      id: `nil-${PERIOD_HIST_ID}-${s.id}-${mapel}`,
      periodId: PERIOD_HIST_ID,
      siswaId: s.id,
      kelas: s.kelas,
      mapel,
      semester: 'Genap',
      tahunAjaran: '2025/2026',
      guruPengampuId: pengampu ? `${pengampu.id}-hist` : undefined,
      guruPengampuNama: pengampu?.nama,
      tugasList: [tVal, tVal, null, null, null, null, null, null, null, null],
      keseharianList: [kVal, kVal, null, null, null, null, null, null, null, null],
      tugas: tVal,
      keseharian: kVal,
      uts: Math.min(95, base),
      uas: Math.min(98, base + 3),
      catatanGuru: sampleTeacherNotes[(sIdx + mIdx) % sampleTeacherNotes.length],
      updatedBy: pengampu?.nama || 'Sistem Awal',
      updatedAt: '2026-06-12T10:00:00.000Z',
    });
  });
});

const ekskulChoices = [
  'Pramuka',
  'Seni Tari & Tabuh Bali',
  'Pencak Silat',
  'PMR (Palang Merah Remaja)',
  'Klub Sains & Informatika',
];

const studentRaporExtras: StudentRaporExtras[] = siswas.map((s, idx) => ({
  id: `rapor-${s.periodId}-${s.id}`,
  periodId: s.periodId,
  siswaId: s.id,
  ekstrakurikuler: [
    {
      id: `eks-1-${s.id}`,
      namaEkskul: 'Pramuka',
      predikat: idx % 3 === 0 ? 'A (Sangat Baik)' : 'B (Baik)',
      nilaiAngka: idx % 3 === 0 ? 92 : 85,
      keterangan: 'Aktif mengikuti latihan kepramukaan rutin dan disiplin dalam kegiatan lapangan.',
    },
    {
      id: `eks-2-${s.id}`,
      namaEkskul: ekskulChoices[1 + (idx % 4)],
      predikat: idx % 2 === 0 ? 'A (Sangat Baik)' : 'B (Baik)',
      nilaiAngka: idx % 2 === 0 ? 90 : 84,
      keterangan: 'Menunjukkan minat, keterampilan, serta kerja sama tim yang sangat positif.',
    },
  ],
  catatanWaliKelas:
    'Pertahankan semangat belajar, kedisiplinan, serta sikap santun dalam pergaulan di lingkungan sekolah.',
  sakit: idx % 3,
  izin: idx % 2,
  alpa: 0,
  updatedBy: 'Wali Kelas',
  updatedAt: '2026-11-15T08:00:00.000Z',
}));

const kkmPerMapel: Record<string, number> = {};
DAFTAR_MAPEL.forEach((m) => {
  kkmPerMapel[m] = m === 'Matematika' || m === 'IPA' ? 75 : 76;
});

const buildings: Building[] = [
  {
    id: 'bld-1',
    nama: 'Gedung Kantor Utama',
    jenis: 'Gedung Kantor & Tata Usaha',
    jumlahRuang: 4,
    luasM2: 180,
    tahunDibangun: '2014',
    kondisi: 'Baik',
    foto: BUILDING_CLASSROOM_IMAGE,
    keterangan: 'Mencakup Ruang Kepala Sekolah, Ruang Guru, Ruang Tata Usaha, dan Ruang Tamu.',
  },
  {
    id: 'bld-2',
    nama: 'Gedung Belajar A (Sayap Timur)',
    jenis: 'Gedung Ruang Kelas',
    jumlahRuang: 3,
    luasM2: 216,
    tahunDibangun: '2015',
    kondisi: 'Baik',
    foto: BUILDING_CLASSROOM_IMAGE,
    keterangan: 'Digunakan untuk Ruang Kelas 7, Ruang Kelas 8, dan Perpustakaan Mini.',
  },
  {
    id: 'bld-3',
    nama: 'Gedung Belajar B (Sayap Barat)',
    jenis: 'Gedung Ruang Kelas & Lab',
    jumlahRuang: 3,
    luasM2: 216,
    tahunDibangun: '2018',
    kondisi: 'Rusak Ringan',
    foto: BUILDING_CLASSROOM_IMAGE,
    keterangan: 'Digunakan untuk Ruang Kelas 9, Ruang Lab IPA, dan Ruang Komputer/Informatika.',
  },
  {
    id: 'bld-4',
    nama: 'Gedung Sanitasi & Kamar Mandi',
    jenis: 'Gedung Kamar Mandi / WC',
    jumlahRuang: 6,
    luasM2: 48,
    tahunDibangun: '2019',
    kondisi: 'Baik',
    foto: '',
    keterangan: 'Terdiri atas 2 kamar mandi guru dan 4 kamar mandi siswa (terpisah putra/putri).',
  },
];

const assets: SaranaAsset[] = [
  {id: 'ast-1', buildingId: 'bld-2', namaAset: 'Meja Siswa Kayu Jati', jumlah: 40, kondisi: 'Baik', tahunPengadaan: '2022', sumberDana: 'Dana BOS', lokasi: 'Kelas 7 & 8', keterangan: 'Set meja tunggal standar SMP'},
  {id: 'ast-2', buildingId: 'bld-2', namaAset: 'Kursi Siswa Kayu', jumlah: 40, kondisi: 'Baik', tahunPengadaan: '2022', sumberDana: 'Dana BOS', lokasi: 'Kelas 7 & 8', keterangan: 'Kondisi kokoh dan terawat'},
  {id: 'ast-3', buildingId: 'bld-3', namaAset: 'Meja & Kursi Siswa Kelas 9', jumlah: 20, kondisi: 'Baik', tahunPengadaan: '2023', sumberDana: 'DAK Dinas Pendidikan', lokasi: 'Kelas 9', keterangan: 'Pengadaan baru tahun 2023'},
  {id: 'ast-4', buildingId: 'bld-2', namaAset: 'Papan Tulis Whiteboard Gantung', jumlah: 4, kondisi: 'Baik', tahunPengadaan: '2021', sumberDana: 'Dana BOS', lokasi: 'Kelas 7, 8, 9', keterangan: 'Ukuran 120x240 cm'},
  {id: 'ast-5', buildingId: 'bld-3', namaAset: 'Komputer Desktop Lab Informatika', jumlah: 15, kondisi: 'Baik', tahunPengadaan: '2024', sumberDana: 'Bantuan Kemdikbud', lokasi: 'Ruang Lab Komputer', keterangan: 'Digunakan untuk ANBK dan praktik Informatika'},
  {id: 'ast-6', buildingId: 'bld-1', namaAset: 'Laptop Administrasi & Guru', jumlah: 6, kondisi: 'Baik', tahunPengadaan: '2023', sumberDana: 'Dana BOS', lokasi: 'Ruang Guru & TU', keterangan: 'Untuk administrasi Dapodik & pembelajaran'},
  {id: 'ast-7', buildingId: 'bld-2', namaAset: 'Proyektor LCD Epson', jumlah: 3, kondisi: 'Baik', tahunPengadaan: '2023', sumberDana: 'Dana BOS', lokasi: 'Ruang Sarpras / Kelas', keterangan: 'Lengkap dengan kabel HDMI & layar portabel'},
  {id: 'ast-8', buildingId: 'bld-2', namaAset: 'Buku Paket Kurikulum Merdeka', jumlah: 420, kondisi: 'Baik', tahunPengadaan: '2024', sumberDana: 'Dana BOS', lokasi: 'Perpustakaan Mini', keterangan: 'Mencakup semua mapel kelas 7, 8, dan 9'},
  {id: 'ast-9', buildingId: 'bld-1', namaAset: 'Printer Multifungsi Epson L3210', jumlah: 2, kondisi: 'Baik', tahunPengadaan: '2023', sumberDana: 'Dana BOS', lokasi: 'Ruang TU', keterangan: 'Berfungsi normal untuk cetak rapor & surat'},
  {id: 'ast-10', buildingId: 'bld-3', namaAset: 'Kit Praktikum IPA Terpadu', jumlah: 6, kondisi: 'Rusak Ringan', tahunPengadaan: '2019', sumberDana: 'DAK', lokasi: 'Ruang Lab IPA', keterangan: 'Beberapa tabung reaksi perlu peremajaan'},
  {id: 'ast-11', buildingId: 'bld-1', namaAset: 'Lemari Arsip Besi 2 Pintu', jumlah: 4, kondisi: 'Baik', tahunPengadaan: '2020', sumberDana: 'Dana BOS', lokasi: 'Ruang TU & Kepala Sekolah', keterangan: 'Menyimpan ijazah, arsip kepegawaian & rapor'},
  {id: 'ast-12', buildingId: 'bld-4', namaAset: 'Tandon Air Bersih 2000 Liter', jumlah: 2, kondisi: 'Baik', tahunPengadaan: '2022', sumberDana: 'Dana BOS', lokasi: 'Area Kamar Mandi', keterangan: 'Suplai air bersih lancar dari sumber mata air'},
];

const announcements: Announcement[] = [
  {
    id: 'ann-1',
    judul: 'Persiapan Penilaian Akhir Semester (PAS) Ganjil 2026/2027',
    ringkasan: 'Pelaksanaan PAS Ganjil dijadwalkan mulai tanggal 1–8 Desember 2026. Seluruh guru diminta mengunggah kisi-kisi dan naskah soal pada menu Administrasi Guru.',
    isi: 'Kepada seluruh Bapak/Ibu Guru SMPN Satu Atap Besakih, pelaksanaan Penilaian Akhir Semester (PAS) Ganjil Tahun Ajaran 2026/2027 akan berlangsung pada 1–8 Desember 2026. Mohon agar soal, kisi-kisi, dan perangkat asesmen dilengkapi paling lambat 25 November 2026.',
    kategori: 'Akademik',
    tanggal: '2026-11-16',
    penulis: 'Wakasek Kurikulum',
    penting: true,
  },
  {
    id: 'ann-2',
    judul: 'Gotong Royong Kebersihan Lingkungan Sekolah & Taman Pura Sekolah',
    ringkasan: 'Kegiatan Jumat Bersih bersama seluruh warga sekolah dilaksanakan pukul 07.30 WITA dengan membawa alat kebersihan masing-masing.',
    isi: 'Dalam rangka menjaga keasrian lingkungan SMPN Satu Atap Besakih menjelang hari raya dan penilaian sekolah sehat tingkat kecamatan, seluruh guru, staf, dan siswa Kelas 7–9 mengikuti kerja bakti lingkungan sekolah.',
    kategori: 'Kegiatan',
    tanggal: '2026-11-14',
    penulis: 'Kepala Sekolah',
    penting: false,
  },
  {
    id: 'ann-3',
    judul: 'Pemutakhiran Data Kepegawaian & Dokumen Administrasi Guru',
    ringkasan: 'Guru dimohon melengkapi Prota, Promes, Modul Ajar, serta dokumen lainnya sesuai checklist kategori pada menu Administrasi Guru.',
    isi: 'Untuk tertib administrasi sekolah dan persiapan supervisi akademik semester ganjil, seluruh guru dapat melengkapi arsip administrasi guru berdasarkan periode pendidikan aktif dan memantau checklist kelengkapan kategori.',
    kategori: 'Pengumuman',
    tanggal: '2026-11-10',
    penulis: 'Tata Usaha',
    penting: false,
  },
];

const adminGuruEntries: AdminGuruEntry[] = [
  {
    id: 'adm-1',
    periodId: PERIOD_ACTIVE_ID,
    guruId: 'guru-1',
    userId: 'usr-guru-1',
    guruNama: 'I Wayan Sudarma, S.Pd.',
    judul: 'Program Tahunan Matematika Kelas 7, 8, 9',
    kategori: 'Program Tahunan (Prota)',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    keterangan: 'Dokumen Prota Kurikulum Merdeka Tahun Ajaran 2026/2027 telah disahkan Kepala Sekolah.',
    fileName: 'Prota_Matematika_2026_2027.pdf',
    fileType: 'application/pdf',
    tanggalUpload: '2026-07-18',
    status: 'Lengkap',
  },
  {
    id: 'adm-2',
    periodId: PERIOD_ACTIVE_ID,
    guruId: 'guru-1',
    userId: 'usr-guru-1',
    guruNama: 'I Wayan Sudarma, S.Pd.',
    judul: 'Program Semester Ganjil Matematika',
    kategori: 'Program Semester (Promes)',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    keterangan: 'Alokasi pekan efektif dan jadwal asesmen formatif/sumatif.',
    fileName: 'Promes_Ganjil_Matematika.pdf',
    fileType: 'application/pdf',
    tanggalUpload: '2026-07-22',
    status: 'Lengkap',
  },
  {
    id: 'adm-3',
    periodId: PERIOD_ACTIVE_ID,
    guruId: 'guru-1',
    userId: 'usr-guru-1',
    guruNama: 'I Wayan Sudarma, S.Pd.',
    judul: 'Modul Ajar Aljabar & SPLDV Kelas 8',
    kategori: 'Modul Ajar / RPP',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    keterangan: 'Dilengkapi LKPD diferensiasi dan rubrik penilaian formatif.',
    fileName: 'Modul_Ajar_Aljabar_SPLDV_Kls8.pdf',
    fileType: 'application/pdf',
    tanggalUpload: '2026-08-05',
    status: 'Sebagian',
  },
  {
    id: 'adm-4',
    periodId: PERIOD_ACTIVE_ID,
    guruId: 'guru-2',
    userId: 'usr-guru-2',
    guruNama: 'Ni Luh Putu Ayu Lestari, S.Pd.',
    judul: 'Capaian Pembelajaran & ATP Bahasa Indonesia Fase D',
    kategori: 'Capaian Pembelajaran (CP) & Alur Tujuan Pembelajaran (ATP)',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    keterangan: 'ATP disusun berurutan sesuai buku teks Kemdikbud.',
    fileName: 'CP_ATP_Bahasa_Indonesia_FaseD.pdf',
    fileType: 'application/pdf',
    tanggalUpload: '2026-07-20',
    status: 'Lengkap',
  },
  {
    id: 'adm-5',
    periodId: PERIOD_ACTIVE_ID,
    guruId: 'guru-3',
    userId: 'usr-guru-3',
    guruNama: 'I Made Wirawan, S.Pd., M.Pd.',
    judul: 'Jurnal Mengajar IPA Terpadu Semester Ganjil',
    kategori: 'Jurnal Mengajar',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    keterangan: 'Catatan harian pertemuan bulan Juli–November 2026.',
    fileName: 'Jurnal_Mengajar_IPA_Ganjil.pdf',
    fileType: 'application/pdf',
    tanggalUpload: '2026-11-12',
    status: 'Sebagian',
  },
  {
    id: 'adm-6',
    periodId: PERIOD_HIST_ID,
    guruId: 'guru-1-hist',
    userId: 'usr-guru-1',
    guruNama: 'I Wayan Sudarma, S.Pd.',
    judul: 'Arsip Rekap Nilai Matematika TA 2025/2026 Genap',
    kategori: 'Daftar Nilai / Rekap Nilai',
    tahunAjaran: '2025/2026',
    semester: 'Genap',
    keterangan: 'Arsip nilai akhir semester genap tahun ajaran 2025/2026.',
    fileName: 'Arsip_Rekap_Nilai_MTK_2025_2026_Genap.pdf',
    fileType: 'application/pdf',
    tanggalUpload: '2026-06-15',
    status: 'Lengkap',
  },
];

const prestasis: Prestasi[] = [
  {
    id: 'pres-1',
    kategori: 'Siswa',
    judul: 'Juara 1 Olimpiade Sains Nasional (OSN) Bidang IPA Tingkat Kabupaten',
    namaPeraih: 'Ni Luh Gede Putri Saraswati & I Made Bagus Mahendra',
    tingkat: 'Kabupaten',
    peringkat: 'Juara 1',
    tanggal: '2026-05-18',
    penyelenggara: 'Dinas Pendidikan Kepemudaan dan Olahraga Kab. Karangasem',
    deskripsi: 'Berhasil meraih peringkat pertama pada seleksi OSN SMP Bidang IPA se-Kabupaten Karangasem dan melaju ke tingkat Provinsi Bali.',
    mediaFotoUrl: ACHIEVEMENT_PHOTO_IMAGE,
    createdByUserId: 'usr-guru-3',
    createdByName: 'I Made Wirawan, S.Pd., M.Pd.',
  },
  {
    id: 'pres-2',
    kategori: 'Sekolah',
    judul: 'Penghargaan Sekolah Adiwiyata & Kebersihan Lingkungan Tingkat Kecamatan',
    namaPeraih: 'SMPN Satu Atap Besakih',
    tingkat: 'Kecamatan',
    peringkat: 'Terbaik I',
    tanggal: '2026-08-14',
    penyelenggara: 'Pemerintah Kecamatan Rendang',
    deskripsi: 'Apresiasi atas pengelolaan kebersihan halaman sekolah, taman hijau, dan pemilahan sampah berbasis komunitas sekolah.',
    mediaFotoUrl: SCHOOL_BANNER_IMAGE,
    createdByUserId: 'usr-admin',
    createdByName: 'Administrator Sekolah',
  },
  {
    id: 'pres-3',
    kategori: 'Guru',
    judul: 'Juara 2 Lomba Inovasi Media Pembelajaran Digital Guru SMP',
    namaPeraih: 'Ni Wayan Eka Purnami, S.Kom.',
    tingkat: 'Kabupaten',
    peringkat: 'Juara 2',
    tanggal: '2026-09-24',
    penyelenggara: 'PGRI Kabupaten Karangasem',
    deskripsi: 'Mengembangkan media pembelajaran interaktif berbasis web untuk literasi digital dan aksara Bali di kelas SMP.',
    mediaFotoUrl: BUILDING_CLASSROOM_IMAGE,
    createdByUserId: 'usr-guru-8',
    createdByName: 'Ni Wayan Eka Purnami, S.Kom.',
  },
  {
    id: 'pres-4',
    kategori: 'Siswa',
    judul: 'Juara 2 Lomba Mesatua Bali & Pidarta Bahasa Bali Remaja',
    namaPeraih: 'Ni Ketut Sintya Maharani',
    tingkat: 'Kabupaten',
    peringkat: 'Juara 2',
    tanggal: '2026-02-22',
    penyelenggara: 'Bulan Bahasa Bali VIII Provinsi Bali - Zona Karangasem',
    deskripsi: 'Menampilkan cerita rakyat Bali dengan penguasaan unggah-ungguhing basa Bali dan intonasi yang memukau dewan juri.',
    mediaFotoUrl: '',
    createdByUserId: 'usr-guru-8',
    createdByName: 'Ni Wayan Eka Purnami, S.Kom.',
  },
];

const makeSampleCertificateSvg = (title: string, recipient: string, issuer: string, year: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="594" viewBox="0 0 840 594">
    <rect width="840" height="594" fill="#f8fafc"/>
    <rect x="24" y="24" width="792" height="546" rx="16" fill="#ffffff" stroke="#0f766e" stroke-width="4"/>
    <rect x="38" y="38" width="764" height="518" rx="10" fill="none" stroke="#d97706" stroke-width="1.5"/>
    <text x="420" y="105" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#0f766e" letter-spacing="3">SERTIFIKAT PENGHARGAAN &amp; PRESTASI</text>
    <text x="420" y="160" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#64748b">Diberikan kepada:</text>
    <text x="420" y="210" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="700" fill="#0f172a">${recipient}</text>
    <line x1="210" y1="228" x2="630" y2="228" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="420" y="278" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="600" fill="#1e293b">${title}</text>
    <text x="420" y="330" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#475569">Penyelenggara: ${issuer}</text>
    <text x="420" y="365" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="600" fill="#d97706">Tahun ${year}</text>
    <text x="420" y="485" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#64748b">SMPN Satu Atap Besakih · NPSN 50104110</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const guruCertificates: GuruCertificate[] = [
  {
    id: 'cert-1',
    guruId: 'guru-1',
    userId: 'usr-guru-1',
    judul: 'Guru Penggerak Angkatan IX Kab. Karangasem',
    tingkat: 'Kabupaten',
    peringkat: 'Lulusan Terbaik',
    penyelenggara: 'Kemdikbudristek & BGP Provinsi Bali',
    tahun: '2025',
    keterangan: 'Sertifikat kelulusan Program Pendidikan Guru Penggerak bidang pembelajaran berdiferensiasi.',
    fileName: 'Sertifikat_Guru_Penggerak_I_Wayan_Sudarma.svg',
    fileType: 'image/svg+xml',
    previewDataUrl: makeSampleCertificateSvg(
      'Pendidikan Guru Penggerak Angkatan IX',
      'I Wayan Sudarma, S.Pd.',
      'BGP Provinsi Bali',
      '2025'
    ),
    tanggalUpload: '2026-07-25',
  },
  {
    id: 'cert-2',
    guruId: 'guru-3',
    userId: 'usr-guru-3',
    judul: 'Pembina Juara 1 OSN IPA Tingkat Kabupaten Karangasem',
    tingkat: 'Kabupaten',
    peringkat: 'Pembina Terbaik I',
    penyelenggara: 'Disdikpora Kabupaten Karangasem',
    tahun: '2026',
    keterangan: 'Piagam penghargaan pembina siswa peraih Juara 1 OSN IPA SMP tahun 2026.',
    fileName: 'Piagam_Pembina_OSN_IPA_2026.svg',
    fileType: 'image/svg+xml',
    previewDataUrl: makeSampleCertificateSvg(
      'Pembina Juara 1 OSN Bidang IPA',
      'I Made Wirawan, S.Pd., M.Pd.',
      'Disdikpora Kab. Karangasem',
      '2026'
    ),
    tanggalUpload: '2026-08-02',
  },
  {
    id: 'cert-3',
    guruId: 'guru-8',
    userId: 'usr-guru-8',
    judul: 'Juara 2 Lomba Inovasi Media Pembelajaran Digital Guru SMP',
    tingkat: 'Kabupaten',
    peringkat: 'Juara 2',
    penyelenggara: 'PGRI Kabupaten Karangasem',
    tahun: '2026',
    keterangan: 'Inovasi media pembelajaran aksara Bali & literasi digital interaktif berbasis web.',
    fileName: 'Sertifikat_Juara2_Inovasi_Pembelajaran.svg',
    fileType: 'image/svg+xml',
    previewDataUrl: makeSampleCertificateSvg(
      'Juara 2 Inovasi Media Pembelajaran Digital',
      'Ni Wayan Eka Purnami, S.Kom.',
      'PGRI Kabupaten Karangasem',
      '2026'
    ),
    tanggalUpload: '2026-09-28',
  },
];

export function createInitialSeedState(): SchoolDatabaseState {
  return {
    version: 2,
    periods,
    activePeriodId: PERIOD_ACTIVE_ID,
    schoolProfile: {
      nama: 'SMPN Satu Atap Besakih',
      npsn: '50104110',
      alamat: 'Br. Dinas Kedungdung, Desa Besakih, Kec. Rendang, Kab. Karangasem, Bali',
      kabupaten: 'Kabupaten Karangasem',
      provinsi: 'Bali',
      telepon: '(0363) 271450',
      email: 'info@smpnsatapbesakih.sch.id',
      tahunAjaranAktif: '2026/2027',
      logoDataUrl: DEFAULT_SCHOOL_LOGO,
      profilSingkat:
        'SMPN Satu Atap Besakih merupakan sekolah negeri yang melayani pendidikan jenjang SMP bagi putra-putri di kawasan lereng Gunung Agung, Desa Besakih, Kecamatan Rendang. Sekolah mengedepankan pembelajaran aktif, pelestarian budaya Bali, dan penguatan karakter Pancasila.',
      visi: 'Terwujudnya peserta didik yang berakhlak mulia, berprestasi, berbudaya Bali, peduli lingkungan, dan siap menghadapi perkembangan teknologi.',
      misi: [
        'Menyelenggarakan pembelajaran yang aktif, kreatif, kolaboratif, dan berpusat pada peserta didik sesuai Kurikulum Merdeka.',
        'Menumbuhkan penghayatan nilai Tri Hita Karana serta karakter Profil Pelajar Pancasila dalam kehidupan sekolah sehari-hari.',
        'Melestarikan seni, bahasa, dan budaya Bali melalui kegiatan intrakurikuler maupun ekstrakurikuler.',
        'Meningkatkan kompetensi pendidik serta pemanfaatan teknologi informasi dalam administrasi dan pembelajaran.',
      ],
    },
    accounts,
    announcements,
    gurus,
    kepalaSekolah: {
      foto: PRINCIPAL_PORTRAIT_IMAGE,
      nama: 'Drs. I Nengah Suardana, M.Pd.',
      nip: '19700418 199802 1 003',
      pangkatGolongan: 'Pembina Tingkat I / IV.b',
      periodeJabatan: '2023 – Sekarang',
      email: 'kepsek@smpnsatapbesakih.sch.id',
      noHp: '081236004411',
      sambutan:
        'Om Swastyastu. Selamat datang di Sistem Manajemen Sekolah SMPN Satu Atap Besakih. Kehadiran platform terpadu ini merupakan wujud komitmen kami dalam meningkatkan transparansi, efektivitas administrasi guru, pemantauan capaian belajar siswa, serta pengelolaan sarana prasarana sekolah secara modern dan akuntabel.',
      riwayatPendidikan: [
        'S1 Pendidikan Pancasila dan Kewarganegaraan – Universitas Udayana (1995)',
        'S2 Manajemen Pendidikan – Universitas Pendidikan Ganesha (2012)',
      ],
      riwayatJabatan: [
        'Guru PPKn di SMPN 2 Rendang (1998 – 2015)',
        'Wakil Kepala Sekolah Bidang Kurikulum SMPN 1 Rendang (2015 – 2022)',
        'Kepala Sekolah SMPN Satu Atap Besakih (2023 – Sekarang)',
      ],
    },
    stafs,
    siswas,
    nilaiRecords,
    studentRaporExtras,
    gradeSettings: {
      bobotTugas: 20,
      bobotKeseharian: 20,
      bobotUts: 30,
      bobotUas: 30,
      kkmPerMapel,
    },
    adminGuruEntries,
    customAdminCategories: [],
    buildings,
    assets,
    prestasis,
    guruCertificates,
    activityLogs: [
      {
        id: 'log-init-1',
        timestamp: '2026-11-18T08:00:00.000Z',
        userId: 'usr-admin',
        userName: 'Administrator Sekolah',
        role: 'ADMIN',
        action: 'TAMBAH',
        entity: 'Sistem',
        detail: 'Inisialisasi data awal SMPN Satu Atap Besakih (NPSN 50104110) dengan periode aktif & arsip historis.',
      },
    ],
  };
}
