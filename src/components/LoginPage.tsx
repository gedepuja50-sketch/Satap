// Halaman Login Sistem Manajemen Sekolah SMPN Satu Atap Besakih
// Termasuk pratinjau read-only Profil & Administrasi Guru saat bar/kartu guru diklik

import React, {useMemo, useState} from 'react';
import {
  Award,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  UserCheck,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {SCHOOL_BANNER_IMAGE} from '../data/seedData';
import {Guru, KATEGORI_ADMIN_GURU_DEFAULT, UserAccount} from '../types/school';
import {formatTanggalId} from '../utils/gradeUtils';
import {Avatar, Modal} from './ui/AvatarAndModal';
import {FilePreviewModal, PreviewableFileItem} from './ui/FilePreviewModal';

export const LoginPage: React.FC = () => {
  const {state, activePeriod, login, theme, toggleTheme} = useSchool();
  const {schoolProfile, accounts, gurus, adminGuruEntries, guruCertificates} = state;

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Modal Read-Only Profil & Administrasi Guru saat salah satu bar guru diklik
  const [inspectTarget, setInspectTarget] = useState<{account: UserAccount; guru: Guru} | null>(null);
  const [inspectTab, setInspectTab] = useState<'profil' | 'administrasi'>('profil');
  const [photoEnlarge, setPhotoEnlarge] = useState<Guru | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewableFileItem | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Mohon isi username dan kata sandi.');
      return;
    }
    const res = login(username, password);
    if (!res.ok) {
      setError(res.message || 'Gagal masuk.');
    }
  };

  const quickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  // Temukan data guru pada periode aktif untuk setiap akun guru
  const resolveGuruForAccount = (acc: UserAccount): Guru | undefined => {
    return (
      gurus.find(
        (g) =>
          g.periodId === activePeriod.id &&
          (g.userId === acc.id || (acc.guruId && g.id === acc.guruId))
      ) ||
      gurus.find((g) => g.userId === acc.id || (acc.guruId && g.id === acc.guruId))
    );
  };

  const inspectCerts = useMemo(() => {
    if (!inspectTarget) return [];
    const {account, guru} = inspectTarget;
    return guruCertificates.filter(
      (c) => c.userId === account.id || c.guruId === guru.id
    );
  }, [inspectTarget, guruCertificates]);

  const inspectAdminEntries = useMemo(() => {
    if (!inspectTarget) return [];
    const {account, guru} = inspectTarget;
    return adminGuruEntries.filter(
      (e) =>
        e.periodId === activePeriod.id &&
        (e.userId === account.id || e.guruId === guru.id)
    );
  }, [inspectTarget, adminGuruEntries, activePeriod.id]);

  const inspectProgress = useMemo(() => {
    const totalCat = KATEGORI_ADMIN_GURU_DEFAULT.length;
    const uploadedCats = new Set(inspectAdminEntries.map((e) => e.kategori));
    const pct = Math.min(100, Math.round((uploadedCats.size / Math.max(1, totalCat - 1)) * 100));
    return {uploadedCount: uploadedCats.size, totalCat, pct};
  }, [inspectAdminEntries]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Bar Atas Sederhana */}
      <header className="w-full px-4 sm:px-8 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={schoolProfile.logoDataUrl}
            alt={`Logo ${schoolProfile.nama}`}
            className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-display font-bold text-slate-900 dark:text-slate-100 truncate">
              {schoolProfile.nama}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              NPSN {schoolProfile.npsn} · Kec. Rendang, Kab. Karangasem, Bali
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
          aria-label="Ubah mode tampilan"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          <span className="hidden sm:inline">{theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}</span>
        </button>
      </header>

      {/* Konten Utama Login 2 Kolom */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Kolom Kiri: Visual Sekolah & Daftar Bar Guru + Akun Demo */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-[220px] sm:min-h-[260px] flex items-end">
            <img
              src={SCHOOL_BANNER_IMAGE}
              alt="Lingkungan SMPN Satu Atap Besakih"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent" />
            <div className="relative p-6 sm:p-8 text-white max-w-2xl">
              <p className="text-xs font-medium text-amber-300 tracking-wide">
                Sistem Informasi & Manajemen Sekolah Terpadu · {activePeriod.label}
              </p>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-display font-bold leading-tight text-balance">
                {schoolProfile.nama}
              </h2>
              <p className="mt-2 text-sm text-slate-200 leading-relaxed">
                {schoolProfile.alamat} · NPSN <span className="font-mono-num">{schoolProfile.npsn}</span>
              </p>
            </div>
          </div>

          {/* Daftar Bar Guru & Akun Demo */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                  Profil Pendidik (Guru) & Akun Demo Uji Coba
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Klik bar guru untuk melihat Profil & Administrasi Guru (hanya tampil), atau tekan &ldquo;Isi Login&rdquo; untuk masuk.
                </p>
              </div>
              <span className="text-xs font-medium text-teal-700 dark:text-teal-400 shrink-0">
                {accounts.length} Akun Tersedia
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {accounts.map((acc) => {
                const guruData = acc.role === 'GURU' ? resolveGuruForAccount(acc) : undefined;
                const subtitle =
                  acc.role === 'ADMIN'
                    ? 'Akses Penuh · Panel Admin & Pusat Arsip'
                    : guruData
                      ? `Mapel: ${guruData.mapelDiampu.join(', ')}`
                      : 'Akun Guru';
                const isSelected = username.toLowerCase() === acc.username.toLowerCase();

                if (acc.role === 'ADMIN' || !guruData) {
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => quickFill(acc.username, acc.password)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/80 dark:bg-teal-950/40 dark:border-teal-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          {acc.role}
                        </span>
                        <span className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                          {acc.username} / {acc.password}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {acc.namaLengkap}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {subtitle}
                      </p>
                    </button>
                  );
                }

                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setInspectTarget({account: acc, guru: guruData});
                      setInspectTab('profil');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInspectTarget({account: acc, guru: guruData});
                        setInspectTab('profil');
                      }
                    }}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer group ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/80 dark:bg-teal-950/40 dark:border-teal-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                        GURU
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          quickFill(acc.username, acc.password);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-700 hover:text-white text-[11px] font-mono-num font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Isi form login dengan akun ini"
                      >
                        Isi Login ({acc.username})
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2.5">
                      <Avatar src={guruData.foto} name={guruData.nama} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 truncate">
                          {guruData.nama}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {subtitle}
                        </p>
                      </div>
                      <Eye className="w-4 h-4 text-slate-400 group-hover:text-teal-700 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Kolom Kanan: Formulir Masuk */}
        <section className="lg:col-span-5 flex flex-col justify-center">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3.5 mb-6">
              <img
                src={schoolProfile.logoDataUrl}
                alt="Logo Sekolah"
                className="w-14 h-14 rounded-2xl object-contain bg-white border border-slate-200 dark:border-slate-700 p-1 shrink-0"
              />
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-100">
                  Masuk ke Sistem
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Gunakan akun Admin atau Guru yang terdaftar
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin atau guru1"
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Masuk Sekarang
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Admin: <strong className="text-slate-700 dark:text-slate-300">admin / admin123</strong> · Guru:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">guru1–guru8 / guru123</strong>
                </span>
              </div>
              <p>
                Seluruh data tersimpan otomatis di browser Anda (localStorage & IndexedDB) agar tetap aman saat halaman dimuat ulang.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Modal Read-Only Profil & Administrasi Guru (Hanya Tampil, Tidak Bisa Diedit) */}
      <Modal
        open={Boolean(inspectTarget)}
        onClose={() => setInspectTarget(null)}
        title={inspectTarget ? inspectTarget.guru.nama : ''}
        subtitle={
          inspectTarget
            ? `${inspectTarget.guru.jabatan} · ${inspectTarget.guru.statusKepegawaian} · ${activePeriod.label}`
            : ''
        }
        maxWidthClass="max-w-3xl"
      >
        {inspectTarget && (
          <div className="space-y-5">
            {/* Banner Mode Read-Only */}
            <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                Tampilan Hanya Lihat (Read-Only) — Profil dan administrasi guru tidak dapat diubah di halaman ini.
              </span>
              <button
                type="button"
                onClick={() => {
                  quickFill(inspectTarget.account.username, inspectTarget.account.password);
                  setInspectTarget(null);
                }}
                className="px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
              >
                Gunakan Akun ({inspectTarget.account.username}) untuk Login
              </button>
            </div>

            {/* Tab Profil vs Administrasi Guru */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setInspectTab('profil')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  inspectTab === 'profil'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Profil Guru
              </button>
              <button
                type="button"
                onClick={() => setInspectTab('administrasi')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  inspectTab === 'administrasi'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Administrasi Guru ({inspectAdminEntries.length} Berkas)
              </button>
            </div>

            {inspectTab === 'profil' ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPhotoEnlarge(inspectTarget.guru)}
                    className="relative group rounded-2xl cursor-pointer shrink-0"
                    title="Klik untuk memperbesar foto"
                  >
                    <Avatar src={inspectTarget.guru.foto} name={inspectTarget.guru.nama} size="xl" />
                    <span className="absolute inset-0 rounded-2xl bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                    </span>
                  </button>
                  <div className="space-y-1">
                    <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                      {inspectTarget.guru.nama}
                    </h3>
                    <p className="text-xs font-mono-num text-slate-500">
                      NIP: {inspectTarget.guru.nip || '-'} · NUPTK: {inspectTarget.guru.nuptk || '-'}
                    </p>
                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                      Mengampu: {inspectTarget.guru.mapelDiampu.join(', ')} (Kelas{' '}
                      {inspectTarget.guru.kelasDiampu.join(', ')}) · {inspectTarget.guru.jamMengajar} JP/minggu
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Tempat, Tanggal Lahir</p>
                    <p className="font-medium">
                      {inspectTarget.guru.tempatLahir || '-'}, {formatTanggalId(inspectTarget.guru.tanggalLahir)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jenis Kelamin & Agama</p>
                    <p className="font-medium">
                      {inspectTarget.guru.jenisKelamin} · {inspectTarget.guru.agama}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pendidikan Terakhir</p>
                    <p className="font-medium">{inspectTarget.guru.pendidikanTerakhir}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Golongan / Pangkat & Tahun Mulai</p>
                    <p className="font-medium">
                      {inspectTarget.guru.golonganPangkat} · Sejak {inspectTarget.guru.tahunMulaiBertugas}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Kontak</p>
                    <p className="font-medium font-mono-num flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-teal-700" />
                      {inspectTarget.guru.noHp || '-'}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      {inspectTarget.guru.email || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Alamat</p>
                    <p className="font-medium">{inspectTarget.guru.alamat || '-'}</p>
                  </div>
                </div>

                {/* Sertifikat Prestasi (Read-Only) */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Sertifikat Prestasi ({inspectCerts.length})
                  </h4>
                  {inspectCerts.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada sertifikat prestasi yang diunggah.</p>
                  ) : (
                    <div className="space-y-2">
                      {inspectCerts.map((cert) => (
                        <div
                          key={cert.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {cert.judul}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {cert.peringkat} · Tingkat {cert.tingkat} · {cert.tahun}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewFile({
                                id: cert.id,
                                judul: cert.judul,
                                subJudul: `${cert.peringkat} · Tingkat ${cert.tingkat} · ${cert.tahun}`,
                                pemilik: inspectTarget.guru.nama,
                                tanggal: cert.tanggalUpload,
                                keterangan: cert.keterangan,
                                fileId: cert.fileId,
                                fileName: cert.fileName,
                                fileType: cert.fileType,
                                fileSize: cert.fileSize,
                                previewDataUrl: cert.previewDataUrl,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Progres Kelengkapan Administrasi ({activePeriod.label})
                    </span>
                    <span className="font-mono-num font-bold text-teal-700 dark:text-teal-400">
                      {inspectProgress.uploadedCount}/{inspectProgress.totalCat} Kategori ({inspectProgress.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-600"
                      style={{width: `${inspectProgress.pct}%`}}
                    />
                  </div>
                </div>

                {inspectAdminEntries.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500">
                    Belum ada dokumen administrasi guru yang diunggah pada periode ini.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {inspectAdminEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-semibold text-teal-700 dark:text-teal-400 truncate">
                              {entry.kategori}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              {entry.status}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                            {entry.judul}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Diunggah {formatTanggalId(entry.tanggalUpload)} · {entry.fileName || 'Catatan dokumen'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPreviewFile({
                              id: entry.id,
                              judul: entry.judul,
                              subJudul: `TA ${entry.tahunAjaran} (${entry.semester})`,
                              kategori: entry.kategori,
                              pemilik: entry.guruNama,
                              tanggal: entry.tanggalUpload,
                              status: entry.status,
                              keterangan: entry.keterangan,
                              fileId: entry.fileId,
                              fileName: entry.fileName || `${entry.judul.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`,
                              fileType: 'application/pdf',
                              fileSize: entry.fileSize,
                              forcePdfPreview: true,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shrink-0 self-start sm:self-auto cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Lihat PDF
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Perbesar Foto Guru */}
      <Modal
        open={Boolean(photoEnlarge)}
        onClose={() => setPhotoEnlarge(null)}
        title={`Foto Profil — ${photoEnlarge?.nama || ''}`}
        maxWidthClass="max-w-md"
      >
        {photoEnlarge && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[240px]">
            {photoEnlarge.foto ? (
              <img
                src={photoEnlarge.foto}
                alt={photoEnlarge.nama}
                className="max-h-[380px] w-auto rounded-xl object-contain"
              />
            ) : (
              <Avatar src="" name={photoEnlarge.nama} size="xl" />
            )}
          </div>
        )}
      </Modal>

      {/* Modal Pratinjau Berkas Read-Only */}
      <FilePreviewModal item={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
};
