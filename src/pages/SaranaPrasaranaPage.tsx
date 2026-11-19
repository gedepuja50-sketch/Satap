// Halaman 8: Sarana & Prasarana - Data Gedung, Inventaris Aset, Tambah/Edit, dan Ekspor PDF/Excel

import React, {useMemo, useState} from 'react';
import {
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Lock,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {compressImageToDataUrl} from '../services/mediaDb';
import {Building, KondisiSarpras, SaranaAsset} from '../types/school';
import {exportSarprasExcel, exportSarprasPdf} from '../utils/exportUtils';
import {EmptyState, Modal} from '../components/ui/AvatarAndModal';

const emptyBuilding = (): Building => ({
  id: `bld_${Date.now()}`,
  nama: '',
  jenis: 'Gedung Ruang Kelas',
  jumlahRuang: 1,
  luasM2: 72,
  tahunDibangun: '2024',
  kondisi: 'Baik',
  foto: '',
  keterangan: '',
});

const emptyAsset = (defaultBuildingId: string): SaranaAsset => ({
  id: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
  buildingId: defaultBuildingId,
  namaAset: '',
  jumlah: 1,
  kondisi: 'Baik',
  tahunPengadaan: '2025',
  sumberDana: 'Dana BOS',
  lokasi: '',
  keterangan: '',
});

export const SaranaPrasaranaPage: React.FC = () => {
  const {
    state,
    currentUser,
    saveBuilding,
    deleteBuilding,
    saveAsset,
    deleteAsset,
    confirmDelete,
    showToast,
    addLog,
  } = useSchool();
  const isAdmin = currentUser?.role === 'ADMIN';
  const canManageSarpras = isAdmin || Boolean(currentUser?.aksesSarpras);
  const {buildings, assets, schoolProfile} = state;

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');
  const [searchAsset, setSearchAsset] = useState('');

  // Modal Gedung
  const [buildingModalOpen, setBuildingModalOpen] = useState(false);
  const [isNewBuilding, setIsNewBuilding] = useState(false);
  const [buildingForm, setBuildingForm] = useState<Building>(emptyBuilding());

  // Modal Aset
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [isNewAsset, setIsNewAsset] = useState(false);
  const [assetForm, setAssetForm] = useState<SaranaAsset>(emptyAsset(buildings[0]?.id || ''));

  const filteredAssets = useMemo(() => {
    const q = searchAsset.trim().toLowerCase();
    return assets
      .filter((a) => selectedBuildingId === 'ALL' || a.buildingId === selectedBuildingId)
      .filter((a) => {
        if (!q) return true;
        return (
          a.namaAset.toLowerCase().includes(q) ||
          a.lokasi.toLowerCase().includes(q) ||
          a.sumberDana.toLowerCase().includes(q)
        );
      });
  }, [assets, selectedBuildingId, searchAsset]);

  const buildingNameMap = useMemo(
    () => new Map(buildings.map((b) => [b.id, b.nama])),
    [buildings]
  );

  const openAddBuilding = () => {
    setIsNewBuilding(true);
    setBuildingForm(emptyBuilding());
    setBuildingModalOpen(true);
  };

  const openEditBuilding = (b: Building) => {
    setIsNewBuilding(false);
    setBuildingForm({...b});
    setBuildingModalOpen(true);
  };

  const handleBuildingPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 640, 0.85);
      setBuildingForm((prev) => ({...prev, foto: dataUrl}));
      showToast('Foto gedung dimuat.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat foto gedung.', 'error');
    }
    e.target.value = '';
  };

  const handleSaveBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingForm.nama.trim()) {
      showToast('Nama gedung/fasilitas wajib diisi.', 'error');
      return;
    }
    saveBuilding(buildingForm, isNewBuilding);
    setBuildingModalOpen(false);
  };

  const openAddAsset = () => {
    const defId =
      selectedBuildingId !== 'ALL' ? selectedBuildingId : buildings[0]?.id || '';
    setIsNewAsset(true);
    setAssetForm(emptyAsset(defId));
    setAssetModalOpen(true);
  };

  const openEditAsset = (a: SaranaAsset) => {
    setIsNewAsset(false);
    setAssetForm({...a});
    setAssetModalOpen(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.namaAset.trim() || !assetForm.buildingId) {
      showToast('Nama aset dan gedung lokasi wajib diisi.', 'error');
      return;
    }
    saveAsset(assetForm, isNewAsset);
    setAssetModalOpen(false);
  };

  const kondisiTextClass = (k: KondisiSarpras) =>
    k === 'Baik'
      ? 'text-emerald-700 dark:text-emerald-400'
      : k === 'Rusak Ringan'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  if (!canManageSarpras) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-slate-900 p-8 text-center">
        <Lock className="w-10 h-10 text-amber-600 mx-auto mb-2" />
        <h1 className="text-lg font-display font-bold">Akses Sarana &amp; Prasarana Terbatas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Menu ini hanya dapat diakses oleh Admin atau Staf/Pengguna yang diberi tugas input data Sarana &amp; Prasarana.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isAdmin && currentUser?.aksesSarpras && (
        <div className="rounded-2xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/80 dark:bg-teal-950/30 px-4 py-3 flex items-start sm:items-center gap-3 text-xs sm:text-sm text-teal-900 dark:text-teal-200">
          <CheckCircle2 className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5 sm:mt-0" />
          <p>
            Akses Penugasan Aktif: <strong>{currentUser.tugasTambahan || 'Input Data Sarana & Prasarana Sekolah'}</strong>. Anda dapat menambahkan dan memperbarui data gedung maupun aset sekolah secara langsung.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Sarana & Prasarana Sekolah
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Inventaris gedung, ruang belajar, serta aset perlengkapan sekolah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await exportSarprasPdf(buildings, assets, schoolProfile);
              addLog('EXPORT', 'Sarpras PDF', 'Mengunduh rekap PDF Sarana & Prasarana.');
              showToast('Rekap PDF Sarana & Prasarana diunduh.', 'success');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:border-teal-600/50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-500" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => {
              exportSarprasExcel(buildings, assets);
              addLog('EXPORT', 'Sarpras Excel', 'Mengunduh rekap Excel Sarana & Prasarana.');
              showToast('Rekap Excel Sarana & Prasarana diunduh.', 'success');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold hover:border-teal-600/50 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Download Excel
          </button>
          <button
            type="button"
            onClick={openAddBuilding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-700/30 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Gedung/Ruang
          </button>
          <button
            type="button"
            onClick={openAddAsset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Aset
          </button>
        </div>
      </div>

      {/* Bagian A: Daftar Gedung */}
      <section className="space-y-3">
        <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
          Daftar Gedung & Bangunan ({buildings.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {buildings.map((b) => {
            const countAssets = assets.filter((a) => a.buildingId === b.id).length;
            const isSelected = selectedBuildingId === b.id;
            return (
              <div
                key={b.id}
                className={`rounded-2xl border bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between transition-colors ${
                  isSelected
                    ? 'border-teal-600 ring-2 ring-teal-600/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="h-36 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                    {b.foto ? (
                      <img
                        src={b.foto}
                        alt={b.nama}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <Building2 className="w-10 h-10 mb-1 opacity-60" />
                        <span className="text-xs">{b.jenis}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 truncate">{b.jenis}</span>
                      <span className={`font-semibold shrink-0 ${kondisiTextClass(b.kondisi)}`}>
                        {b.kondisi}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                      {b.nama}
                    </h3>
                    <p className="mt-1 text-xs font-mono-num text-slate-500 dark:text-slate-400">
                      {b.jumlahRuang} Ruang · {b.luasM2} m² · Tahun {b.tahunDibangun}
                    </p>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {b.keterangan}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedBuildingId((prev) => (prev === b.id ? 'ALL' : b.id))
                    }
                    className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    {isSelected ? 'Tampilkan Semua Aset' : `Lihat Aset (${countAssets})`}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditBuilding(b)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label={`Edit ${b.nama}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {canManageSarpras && (
                      <button
                        type="button"
                        onClick={() =>
                          confirmDelete(
                            'Hapus Gedung?',
                            `Gedung "${b.nama}" beserta ${countAssets} aset di dalamnya akan dihapus.`,
                            () => {
                              deleteBuilding(b.id);
                              if (selectedBuildingId === b.id) setSelectedBuildingId('ALL');
                            }
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        aria-label={`Hapus ${b.nama}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bagian B: Tabel Inventaris Sarana / Aset */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
            Inventaris Sarana & Aset{' '}
            {selectedBuildingId !== 'ALL'
              ? `— ${buildingNameMap.get(selectedBuildingId) || ''}`
              : `(${filteredAssets.length} Item)`}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              aria-label="Filter gedung"
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
            >
              <option value="ALL">Semua Gedung</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama}
                </option>
              ))}
            </select>
            <div className="relative w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchAsset}
                onChange={(e) => setSearchAsset(e.target.value)}
                placeholder="Cari aset, lokasi..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="Belum Ada Aset Terdaftar"
            description="Tambahkan aset sarana seperti meja, kursi, proyektor, komputer, atau perlengkapan lainnya."
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-3.5 text-center w-12">No</th>
                    <th className="py-3 px-3.5">Nama Aset / Sarana</th>
                    <th className="py-3 px-3.5">Gedung & Lokasi</th>
                    <th className="py-3 px-3.5 text-center">Jumlah</th>
                    <th className="py-3 px-3.5">Kondisi</th>
                    <th className="py-3 px-3.5 text-center">Tahun</th>
                    <th className="py-3 px-3.5">Sumber Dana</th>
                    <th className="py-3 px-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAssets.map((a, idx) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3.5 text-center font-mono-num text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3.5">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{a.namaAset}</p>
                        {a.keterangan && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{a.keterangan}</p>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {buildingNameMap.get(a.buildingId) || '-'}
                        </p>
                        <p className="text-xs text-slate-500">{a.lokasi}</p>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono-num font-semibold">{a.jumlah}</td>
                      <td className={`py-3 px-3.5 text-xs font-semibold ${kondisiTextClass(a.kondisi)}`}>
                        {a.kondisi}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono-num">{a.tahunPengadaan}</td>
                      <td className="py-3 px-3.5 text-xs text-slate-600 dark:text-slate-300">{a.sumberDana}</td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditAsset(a)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800 mr-1"
                          aria-label={`Edit ${a.namaAset}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {canManageSarpras && (
                          <button
                            type="button"
                            onClick={() =>
                              confirmDelete(
                                'Hapus Aset?',
                                `Aset "${a.namaAset}" akan dihapus dari inventaris.`,
                                () => deleteAsset(a.id)
                              )
                            }
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            aria-label={`Hapus ${a.namaAset}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Modal Tambah/Edit Gedung */}
      <Modal
        open={buildingModalOpen}
        onClose={() => setBuildingModalOpen(false)}
        title={isNewBuilding ? 'Tambah Gedung / Fasilitas Baru' : `Edit Gedung — ${buildingForm.nama}`}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSaveBuilding} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Nama Gedung / Fasilitas *</label>
            <input
              type="text"
              required
              value={buildingForm.nama}
              onChange={(e) => setBuildingForm({...buildingForm, nama: e.target.value})}
              placeholder="Contoh: Gedung Perpustakaan / Padmasana & Lapangan"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Jenis Bangunan</label>
              <input
                type="text"
                value={buildingForm.jenis}
                onChange={(e) => setBuildingForm({...buildingForm, jenis: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Kondisi</label>
              <select
                value={buildingForm.kondisi}
                onChange={(e) =>
                  setBuildingForm({...buildingForm, kondisi: e.target.value as KondisiSarpras})
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jumlah Ruang</label>
              <input
                type="number"
                min={1}
                value={buildingForm.jumlahRuang}
                onChange={(e) =>
                  setBuildingForm({...buildingForm, jumlahRuang: Number(e.target.value) || 1})
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Luas (m²)</label>
              <input
                type="number"
                min={1}
                value={buildingForm.luasM2}
                onChange={(e) =>
                  setBuildingForm({...buildingForm, luasM2: Number(e.target.value) || 1})
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tahun Dibangun</label>
              <input
                type="text"
                value={buildingForm.tahunDibangun}
                onChange={(e) => setBuildingForm({...buildingForm, tahunDibangun: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Foto Gedung</label>
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                <Upload className="w-3.5 h-3.5 text-teal-700" />
                Unggah Foto
                <input type="file" accept="image/*" onChange={handleBuildingPhoto} className="hidden" />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan</label>
            <textarea
              rows={2}
              value={buildingForm.keterangan}
              onChange={(e) => setBuildingForm({...buildingForm, keterangan: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBuildingModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan Gedung
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah/Edit Aset */}
      <Modal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        title={isNewAsset ? 'Tambah Sarana / Aset Baru' : `Edit Aset — ${assetForm.namaAset}`}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSaveAsset} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Nama Aset / Barang *</label>
              <input
                type="text"
                required
                value={assetForm.namaAset}
                onChange={(e) => setAssetForm({...assetForm, namaAset: e.target.value})}
                placeholder="Contoh: Proyektor LCD / Meja Siswa"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Gedung Penempatan *</label>
              <select
                value={assetForm.buildingId}
                onChange={(e) => setAssetForm({...assetForm, buildingId: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Lokasi Ruangan</label>
              <input
                type="text"
                value={assetForm.lokasi}
                onChange={(e) => setAssetForm({...assetForm, lokasi: e.target.value})}
                placeholder="Contoh: Ruang Kelas 8"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jumlah</label>
              <input
                type="number"
                min={1}
                value={assetForm.jumlah}
                onChange={(e) =>
                  setAssetForm({...assetForm, jumlah: Number(e.target.value) || 1})
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Kondisi</label>
              <select
                value={assetForm.kondisi}
                onChange={(e) =>
                  setAssetForm({...assetForm, kondisi: e.target.value as KondisiSarpras})
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tahun Pengadaan</label>
              <input
                type="text"
                value={assetForm.tahunPengadaan}
                onChange={(e) => setAssetForm({...assetForm, tahunPengadaan: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Sumber Dana</label>
              <input
                type="text"
                value={assetForm.sumberDana}
                onChange={(e) => setAssetForm({...assetForm, sumberDana: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan</label>
            <input
              type="text"
              value={assetForm.keterangan}
              onChange={(e) => setAssetForm({...assetForm, keterangan: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssetModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold"
            >
              Simpan Aset
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
