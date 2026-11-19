// Halaman 11: Pengaturan (Ganti Logo, Tema, Profil Akun, Identitas Sekolah, dan Bobot Nilai Admin)

import React, {useState} from 'react';
import {ImagePlus, KeyRound, Moon, RotateCcw, Save, SlidersHorizontal, Sun} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {GradeSettings} from '../types/school';

export const PengaturanPage: React.FC = () => {
  const {
    state,
    currentUser,
    theme,
    toggleTheme,
    updateLogoFromFile,
    resetLogoToDefault,
    updateSchoolProfile,
    updateGradeSettings,
    saveAccount,
    showToast,
  } = useSchool();

  const isAdmin = currentUser?.role === 'ADMIN';
  const {schoolProfile, gradeSettings} = state;

  // Identitas sekolah
  const [schoolForm, setSchoolForm] = useState({
    nama: schoolProfile.nama,
    npsn: schoolProfile.npsn,
    alamat: schoolProfile.alamat,
    telepon: schoolProfile.telepon,
    email: schoolProfile.email,
    tahunAjaranAktif: schoolProfile.tahunAjaranAktif,
  });

  // Bobot nilai & KKM (khusus Admin)
  const [weights, setWeights] = useState<GradeSettings>({
    ...gradeSettings,
    kkmPerMapel: {...gradeSettings.kkmPerMapel},
  });

  // Ganti password akun sendiri
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await updateLogoFromFile(file);
    }
    e.target.value = '';
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolForm.nama.trim() || !schoolForm.npsn.trim()) {
      showToast('Nama sekolah dan NPSN wajib diisi.', 'error');
      return;
    }
    updateSchoolProfile(schoolForm);
  };

  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    const total =
      weights.bobotTugas + weights.bobotKeseharian + weights.bobotUts + weights.bobotUas;
    if (total !== 100) {
      showToast(`Total bobot harus 100% (saat ini ${total}%).`, 'error');
      return;
    }
    updateGradeSettings(weights);
  };

  const handleChangeOwnPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (oldPassword !== currentUser.password) {
      showToast('Kata sandi lama tidak sesuai.', 'error');
      return;
    }
    if (newPassword.trim().length < 4) {
      showToast('Kata sandi baru minimal 4 karakter.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi kata sandi baru tidak cocok.', 'error');
      return;
    }
    saveAccount({...currentUser, password: newPassword.trim()}, false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Kata sandi akun Anda berhasil diperbarui.', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
          Pengaturan Sistem & Akun
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Sesuaikan logo sekolah, tema tampilan, profil akun, dan konfigurasi penilaian.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Logo & Tema */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
          <div>
            <h2 className="text-base font-display font-semibold">Logo Resmi Website & Kop PDF</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Logo tersimpan otomatis di browser dan tampil di sidebar, halaman login, serta kop setiap file PDF.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <img
                src={schoolProfile.logoDataUrl}
                alt="Logo Sekolah Saat Ini"
                className="w-20 h-20 rounded-2xl object-contain bg-white border border-slate-200 dark:border-slate-700 p-1.5"
              />
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer">
                  <ImagePlus className="w-4 h-4" />
                  Ganti Logo (Upload Gambar)
                  <input type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={resetLogoToDefault}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Logo Bawaan
                </button>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-display font-semibold">Tema Tampilan</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih mode terang atau gelap sesuai kenyamanan mata Anda.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                  theme === 'light'
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                Mode Terang
              </button>
              <button
                type="button"
                onClick={() => theme === 'light' && toggleTheme()}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                  theme === 'dark'
                    ? 'border-teal-500 bg-teal-950/50 text-teal-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600'
                }`}
              >
                <Moon className="w-4 h-4" />
                Mode Gelap
              </button>
            </div>
          </div>
        </section>

        {/* Profil Akun & Ubah Kata Sandi */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-display font-semibold">Profil Akun & Kata Sandi</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Masuk sebagai <strong>{currentUser?.namaLengkap}</strong> ({currentUser?.role} · @{currentUser?.username})
              </p>
            </div>
          </div>

          <form onSubmit={handleChangeOwnPassword} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Kata Sandi Lama</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Kata Sandi Baru</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Konfirmasi Sandi Baru</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Perbarui Kata Sandi
            </button>
          </form>
        </section>

        {/* Pengaturan Admin: Identitas Sekolah & Bobot Nilai */}
        {isAdmin && (
          <>
            <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <h2 className="text-base font-display font-semibold mb-3">Identitas Sekolah (Admin)</h2>
              <form onSubmit={handleSaveSchool} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nama Sekolah</label>
                    <input
                      type="text"
                      value={schoolForm.nama}
                      onChange={(e) => setSchoolForm({...schoolForm, nama: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">NPSN</label>
                    <input
                      type="text"
                      value={schoolForm.npsn}
                      onChange={(e) => setSchoolForm({...schoolForm, npsn: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Alamat Lengkap</label>
                  <input
                    type="text"
                    value={schoolForm.alamat}
                    onChange={(e) => setSchoolForm({...schoolForm, alamat: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Telepon</label>
                    <input
                      type="text"
                      value={schoolForm.telepon}
                      onChange={(e) => setSchoolForm({...schoolForm, telepon: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      value={schoolForm.email}
                      onChange={(e) => setSchoolForm({...schoolForm, email: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tahun Ajaran Aktif</label>
                    <input
                      type="text"
                      value={schoolForm.tahunAjaranAktif}
                      onChange={(e) => setSchoolForm({...schoolForm, tahunAjaranAktif: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Identitas Sekolah
                </button>
              </form>
            </section>

            <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-display font-semibold">Bobot Penilaian & KKM Mapel (Admin)</h2>
              </div>
              <form onSubmit={handleSaveWeights} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tugas (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights.bobotTugas}
                      onChange={(e) =>
                        setWeights({...weights, bobotTugas: Number(e.target.value) || 0})
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Keseharian (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights.bobotKeseharian}
                      onChange={(e) =>
                        setWeights({...weights, bobotKeseharian: Number(e.target.value) || 0})
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">UTS (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights.bobotUts}
                      onChange={(e) =>
                        setWeights({...weights, bobotUts: Number(e.target.value) || 0})
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">UAS (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weights.bobotUas}
                      onChange={(e) =>
                        setWeights({...weights, bobotUas: Number(e.target.value) || 0})
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold mb-2">KKM per Mata Pelajaran</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {state.subjects.map((m) => (
                      <div key={m} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-700 dark:text-slate-300">{m}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={weights.kkmPerMapel[m] ?? 75}
                          onChange={(e) =>
                            setWeights({
                              ...weights,
                              kkmPerMapel: {
                                ...weights.kkmPerMapel,
                                [m]: Number(e.target.value) || 75,
                              },
                            })
                          }
                          className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center font-mono-num"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan Bobot & KKM
                </button>
              </form>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
