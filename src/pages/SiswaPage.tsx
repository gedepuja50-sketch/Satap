// Halaman 5: Data Siswa Kelas 7, 8, 9 per Periode Pendidikan - Filter, Pencarian, Tambah/Edit/Hapus, dan Download PDF

import React, {useMemo, useState} from 'react';
import {Download, Edit3, GraduationCap, Plus, Search, Trash2} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {KelasLevel, Siswa} from '../types/school';
import {exportSiswaPdf} from '../utils/exportUtils';
import {formatTanggalId} from '../utils/gradeUtils';
import {EmptyState, Modal} from '../components/ui/AvatarAndModal';

const emptySiswa = (kelas: KelasLevel, periodId: string): Siswa => ({
  id: `sis_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
  periodId,
  nis: '',
  nisn: '',
  nama: '',
  kelas,
  jenisKelamin: 'L',
  tempatLahir: 'Karangasem',
  tanggalLahir: '2013-01-01',
  alamat: 'Br. Dinas Kedungdung, Desa Besakih, Kec. Rendang, Karangasem',
  namaOrtu: '',
  noHpOrtu: '',
});

export const SiswaPage: React.FC = () => {
  const {
    state,
    selectedPeriod,
    periodSiswas,
    saveSiswa,
    deleteSiswa,
    confirmDelete,
    showToast,
    addLog,
  } = useSchool();

  const [selectedKelas, setSelectedKelas] = useState<KelasLevel>('7');
  const [search, setSearch] = useState('');
  const [jkFilter, setJkFilter] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [downloading, setDownloading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Siswa>(emptySiswa('7', selectedPeriod.id));

  const kelasCounts = useMemo(() => {
    const map: Record<KelasLevel, number> = {'7': 0, '8': 0, '9': 0};
    periodSiswas.forEach((s) => {
      map[s.kelas] = (map[s.kelas] || 0) + 1;
    });
    return map;
  }, [periodSiswas]);

  const filteredSiswas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodSiswas
      .filter((s) => s.kelas === selectedKelas)
      .filter((s) => jkFilter === 'ALL' || s.jenisKelamin === jkFilter)
      .filter((s) => {
        if (!q) return true;
        return (
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q) ||
          s.namaOrtu.toLowerCase().includes(q)
        );
      });
  }, [periodSiswas, selectedKelas, jkFilter, search]);

  const openAdd = () => {
    setIsNew(true);
    setForm(emptySiswa(selectedKelas, selectedPeriod.id));
    setModalOpen(true);
  };

  const openEdit = (s: Siswa) => {
    setIsNew(false);
    setForm({...s});
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.nis.trim() || !form.nisn.trim()) {
      showToast('NIS, NISN, dan Nama Siswa wajib diisi.', 'error');
      return;
    }
    saveSiswa({...form, periodId: form.periodId || selectedPeriod.id}, isNew);
    setModalOpen(false);
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await exportSiswaPdf(selectedKelas, filteredSiswas, state.schoolProfile, selectedPeriod.label);
      addLog(
        'EXPORT',
        'Daftar Siswa PDF',
        `Mengunduh PDF Daftar Siswa Kelas ${selectedKelas} (${selectedPeriod.label}).`
      );
      showToast(`PDF Daftar Siswa Kelas ${selectedKelas} berhasil diunduh.`, 'success');
    } catch {
      showToast('Gagal membuat file PDF siswa.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Data Siswa
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar peserta didik pada periode <strong>{selectedPeriod.label}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={downloading || filteredSiswas.length === 0}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-600/50 hover:text-teal-700 dark:hover:text-teal-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-500" />
            {downloading ? 'Menyiapkan PDF...' : `Download PDF Kelas ${selectedKelas}`}
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Siswa Kelas {selectedKelas}
          </button>
        </div>
      </div>

      {/* Tab Kategori Kelas 7 / 8 / 9 & Filter */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          {(['7', '8', '9'] as KelasLevel[]).map((k) => {
            const active = selectedKelas === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedKelas(k)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Kelas {k} ({kelasCounts[k]})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, NISN..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30"
            />
          </div>

          <select
            value={jkFilter}
            onChange={(e) => setJkFilter(e.target.value as 'ALL' | 'L' | 'P')}
            aria-label="Filter jenis kelamin"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium"
          >
            <option value="ALL">Semua Jenis Kelamin</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Siswa */}
      {filteredSiswas.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-6 h-6" />}
          title={`Belum Ada Data Siswa di Kelas ${selectedKelas}`}
          description={`Belum ada siswa pada periode ${selectedPeriod.label}. Tambahkan siswa baru menggunakan tombol di atas.`}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-3.5 text-center w-12">No</th>
                  <th className="py-3 px-3.5">NIS</th>
                  <th className="py-3 px-3.5">NISN</th>
                  <th className="py-3 px-3.5">Nama Siswa</th>
                  <th className="py-3 px-3.5 text-center">JK</th>
                  <th className="py-3 px-3.5">Tempat, Tanggal Lahir</th>
                  <th className="py-3 px-3.5">Alamat</th>
                  <th className="py-3 px-3.5">Orang Tua / Wali</th>
                  <th className="py-3 px-3.5">No. HP</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSiswas.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3.5 text-center font-mono-num text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3.5 font-mono-num text-slate-700 dark:text-slate-300">{s.nis}</td>
                    <td className="py-3 px-3.5 font-mono-num text-slate-700 dark:text-slate-300">{s.nisn}</td>
                    <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {s.nama}
                    </td>
                    <td className="py-3 px-3.5 text-center font-medium">
                      {s.jenisKelamin === 'L' ? 'L' : 'P'}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {s.tempatLahir}, {formatTanggalId(s.tanggalLahir)}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 max-w-[220px] truncate" title={s.alamat}>
                      {s.alamat}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {s.namaOrtu}
                    </td>
                    <td className="py-3 px-3.5 font-mono-num text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {s.noHpOrtu}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 mr-1"
                        title="Edit siswa"
                        aria-label={`Edit ${s.nama}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          confirmDelete(
                            'Hapus Data Siswa?',
                            `Data siswa "${s.nama}" (NIS ${s.nis}) pada periode ${selectedPeriod.label} akan dihapus.`,
                            () => deleteSiswa(s.id)
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Hapus siswa"
                        aria-label={`Hapus ${s.nama}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Siswa */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isNew ? `Tambah Siswa Baru (Kelas ${form.kelas})` : `Edit Data Siswa — ${form.nama}`}
        subtitle={`Periode: ${selectedPeriod.label}`}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">NIS *</label>
              <input
                type="text"
                required
                value={form.nis}
                onChange={(e) => setForm({...form, nis: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">NISN *</label>
              <input
                type="text"
                required
                value={form.nisn}
                onChange={(e) => setForm({...form, nisn: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Kelas</label>
              <select
                value={form.kelas}
                onChange={(e) => setForm({...form, kelas: e.target.value as KelasLevel})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
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
              <label className="block text-xs font-semibold mb-1">Jenis Kelamin</label>
              <select
                value={form.jenisKelamin}
                onChange={(e) => setForm({...form, jenisKelamin: e.target.value as 'L' | 'P'})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Tempat Lahir</label>
              <input
                type="text"
                value={form.tempatLahir}
                onChange={(e) => setForm({...form, tempatLahir: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={form.tanggalLahir}
                onChange={(e) => setForm({...form, tanggalLahir: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Alamat Lengkap</label>
            <input
              type="text"
              value={form.alamat}
              onChange={(e) => setForm({...form, alamat: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold mb-1">Nama Orang Tua / Wali</label>
              <input
                type="text"
                value={form.namaOrtu}
                onChange={(e) => setForm({...form, namaOrtu: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">No. HP Orang Tua / Wali</label>
              <input
                type="text"
                value={form.noHpOrtu}
                onChange={(e) => setForm({...form, noHpOrtu: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
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
              Simpan Data Siswa
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
