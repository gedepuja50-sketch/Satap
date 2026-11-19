// Halaman 4: Daftar Staf / Tenaga Kependidikan

import React, {useState} from 'react';
import {Edit3, Mail, MapPin, Phone, Plus, Trash2, Upload, UserCog} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {compressImageToDataUrl} from '../services/mediaDb';
import {Staf} from '../types/school';
import {Avatar, EmptyState, Modal} from '../components/ui/AvatarAndModal';

const emptyStaf = (): Staf => ({
  id: `staf_${Date.now()}`,
  foto: '',
  nama: '',
  nipAtauId: '',
  jabatan: 'Staf Tata Usaha',
  status: 'PTT / Honorer',
  noHp: '',
  email: '',
  alamat: '',
});

export const StafPage: React.FC = () => {
  const {state, currentUser, saveStaf, deleteStaf, confirmDelete, showToast} = useSchool();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [modalOpen, setModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Staf>(emptyStaf());

  const openAdd = () => {
    setIsNew(true);
    setForm(emptyStaf());
    setModalOpen(true);
  };

  const openEdit = (s: Staf) => {
    setIsNew(false);
    setForm({...s});
    setModalOpen(true);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 400, 0.85);
      setForm((prev) => ({...prev, foto: dataUrl}));
      showToast('Foto staf dimuat.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat foto.', 'error');
    }
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.jabatan.trim()) {
      showToast('Nama dan jabatan staf wajib diisi.', 'error');
      return;
    }
    saveStaf(form, isNew);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Staf & Tenaga Kependidikan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tata Usaha, Operator Sekolah, Petugas Perpustakaan, dan Penjaga Sekolah.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            Tambah Staf
          </button>
        )}
      </div>

      {state.stafs.length === 0 ? (
        <EmptyState
          icon={<UserCog className="w-6 h-6" />}
          title="Belum Ada Data Staf"
          description="Tambahkan data tenaga kependidikan sekolah melalui tombol Tambah Staf."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.stafs.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <Avatar src={s.foto} name={s.nama} size="lg" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                    {s.status} · <span className="font-mono-num text-slate-500 dark:text-slate-400">{s.nipAtauId}</span>
                  </p>
                  <h2 className="mt-0.5 text-base font-display font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {s.nama}
                  </h2>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.jabatan}</p>

                  <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <p className="flex items-center gap-1.5 font-mono-num">
                      <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      {s.noHp || '-'}
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">{s.email || '-'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{s.alamat || '-'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(s)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Edit staf"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirmDelete(
                        'Hapus Data Staf?',
                        `Data tenaga kependidikan "${s.nama}" akan dihapus.`,
                        () => deleteStaf(s.id)
                      )
                    }
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    aria-label="Hapus staf"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isNew ? 'Tambah Staf Baru' : `Edit Data Staf — ${form.nama}`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar src={form.foto} name={form.nama || 'Staf'} size="lg" />
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
              <Upload className="w-4 h-4 text-teal-700" />
              Unggah Foto
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={form.nama}
                onChange={(e) => setForm({...form, nama: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">NIP / ID Pegawai</label>
              <input
                type="text"
                value={form.nipAtauId}
                onChange={(e) => setForm({...form, nipAtauId: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jabatan *</label>
              <input
                type="text"
                required
                value={form.jabatan}
                onChange={(e) => setForm({...form, jabatan: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Status Kepegawaian</label>
              <select
                value={form.status}
                onChange={(e) => setForm({...form, status: e.target.value as Staf['status']})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="PTT / Honorer">PTT / Honorer</option>
              </select>
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
            <label className="block text-xs font-semibold mb-1">Alamat</label>
            <input
              type="text"
              value={form.alamat}
              onChange={(e) => setForm({...form, alamat: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan Data Staf
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
