// Halaman 3: Profil Kepala Sekolah

import React, {useState} from 'react';
import {Award, BookOpen, Briefcase, Edit3, Mail, Phone, Upload} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {compressImageToDataUrl} from '../services/mediaDb';
import {KepalaSekolah} from '../types/school';
import {Avatar, Modal} from '../components/ui/AvatarAndModal';

export const KepalaSekolahPage: React.FC = () => {
  const {state, currentUser, updateKepalaSekolah, showToast} = useSchool();
  const isAdmin = currentUser?.role === 'ADMIN';
  const kepsek = state.kepalaSekolah;

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<KepalaSekolah>(kepsek);
  const [eduText, setEduText] = useState('');
  const [jobText, setJobText] = useState('');

  const openEdit = () => {
    setForm({...kepsek});
    setEduText(kepsek.riwayatPendidikan.join('\n'));
    setJobText(kepsek.riwayatJabatan.join('\n'));
    setEditOpen(true);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 480, 0.85);
      setForm((prev) => ({...prev, foto: dataUrl}));
      showToast('Foto Kepala Sekolah dimuat.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat foto.', 'error');
    }
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      showToast('Nama Kepala Sekolah wajib diisi.', 'error');
      return;
    }
    updateKepalaSekolah({
      ...form,
      riwayatPendidikan: eduText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      riwayatJabatan: jobText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setEditOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Profil Kepala Sekolah
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pimpinan {state.schoolProfile.nama} · Periode {kepsek.periodeJabatan}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors cursor-pointer self-start"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profil Kepala Sekolah
          </button>
        )}
      </div>

      {/* Kartu Utama Kepala Sekolah */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 flex flex-col items-center text-center lg:items-start lg:text-left">
            <img
              src={kepsek.foto}
              alt={kepsek.nama}
              referrerPolicy="no-referrer"
              className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
            />
            <h2 className="mt-4 text-xl font-display font-bold text-slate-900 dark:text-slate-100">
              {kepsek.nama}
            </h2>
            <p className="text-sm font-medium text-teal-700 dark:text-teal-400 mt-0.5">
              Kepala {state.schoolProfile.nama}
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 w-full">
              <p className="font-mono-num">NIP: {kepsek.nip}</p>
              <p>Pangkat: {kepsek.pangkatGolongan}</p>
              <p>Masa Jabatan: {kepsek.periodeJabatan}</p>
              <div className="pt-2 flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5 font-mono-num justify-center lg:justify-start">
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  {kepsek.noHp}
                </span>
                <span className="inline-flex items-center gap-1.5 justify-center lg:justify-start">
                  <Mail className="w-3.5 h-3.5 text-teal-600" />
                  {kepsek.email}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div>
              <h3 className="text-sm font-display font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Sambutan Kepala Sekolah
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {kepsek.sambutan}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-teal-600" />
                  Riwayat Pendidikan
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
                  {kepsek.riwayatPendidikan.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-amber-500" />
                  Riwayat Jabatan
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-disc list-inside">
                  {kepsek.riwayatJabatan.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edit Kepala Sekolah */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Profil Kepala Sekolah"
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={form.foto} name={form.nama} size="lg" />
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
              <Upload className="w-4 h-4 text-teal-700" />
              Ganti Foto
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Nama Lengkap & Gelar *</label>
              <input
                type="text"
                required
                value={form.nama}
                onChange={(e) => setForm({...form, nama: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">NIP</label>
              <input
                type="text"
                value={form.nip}
                onChange={(e) => setForm({...form, nip: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Pangkat / Golongan</label>
              <input
                type="text"
                value={form.pangkatGolongan}
                onChange={(e) => setForm({...form, pangkatGolongan: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Periode Jabatan</label>
              <input
                type="text"
                value={form.periodeJabatan}
                onChange={(e) => setForm({...form, periodeJabatan: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">No. HP</label>
              <input
                type="text"
                value={form.noHp}
                onChange={(e) => setForm({...form, noHp: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Sambutan Kepala Sekolah</label>
            <textarea
              rows={4}
              value={form.sambutan}
              onChange={(e) => setForm({...form, sambutan: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Riwayat Pendidikan (1 poin per baris)
              </label>
              <textarea
                rows={4}
                value={eduText}
                onChange={(e) => setEduText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Riwayat Jabatan (1 poin per baris)
              </label>
              <textarea
                rows={4}
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
