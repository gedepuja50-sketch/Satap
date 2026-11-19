// Halaman 9: Prestasi Siswa, Sekolah, dan Guru - Galeri Foto & Video (IndexedDB), Lightbox Detail, Filter Tahun & Tingkat

import React, {useEffect, useMemo, useState} from 'react';
import {Award, Calendar, Edit3, Film, Image as ImageIcon, Plus, Trash2, Upload} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {compressImageToDataUrl, deleteMediaFile, getMediaFile, saveMediaFile} from '../services/mediaDb';
import {Prestasi, TINGKAT_PRESTASI, TingkatPrestasi} from '../types/school';
import {formatTanggalId} from '../utils/gradeUtils';
import {EmptyState, Modal} from '../components/ui/AvatarAndModal';

export const PrestasiPage: React.FC = () => {
  const {state, currentUser, savePrestasi, deletePrestasi, confirmDelete, showToast} = useSchool();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'Siswa' | 'Sekolah' | 'Guru'>('Siswa');
  const [tingkatFilter, setTingkatFilter] = useState<string>('ALL');
  const [tahunFilter, setTahunFilter] = useState<string>('ALL');

  // Cache Object URL video & foto dari IndexedDB agar bisa diputar langsung di kartu dan modal
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [lightboxItem, setLightboxItem] = useState<Prestasi | null>(null);

  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];

    const loadVideos = async () => {
      const nextMap: Record<string, string> = {};
      for (const p of state.prestasis) {
        if (p.mediaVideoId) {
          const stored = await getMediaFile(p.mediaVideoId).catch(() => null);
          if (stored && active) {
            const url = URL.createObjectURL(stored.blob);
            createdUrls.push(url);
            nextMap[p.id] = url;
          }
        }
      }
      if (active) setVideoUrls(nextMap);
    };
    loadVideos();

    return () => {
      active = false;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [state.prestasis]);

  // Modal Form Tambah / Edit Prestasi
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Prestasi | null>(null);
  const [kategori, setKategori] = useState<'Siswa' | 'Sekolah' | 'Guru'>('Siswa');
  const [judul, setJudul] = useState('');
  const [namaPeraih, setNamaPeraih] = useState('');
  const [tingkat, setTingkat] = useState<TingkatPrestasi>('Kabupaten');
  const [peringkat, setPeringkat] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [penyelenggara, setPenyelenggara] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [fotoUrlDraft, setFotoUrlDraft] = useState('');
  const [videoFileDraft, setVideoFileDraft] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(state.prestasis.map((p) => p.tanggal.slice(0, 4)).filter(Boolean))
    );
    return years.sort((a, b) => b.localeCompare(a));
  }, [state.prestasis]);

  const filteredPrestasis = useMemo(() => {
    return state.prestasis
      .filter((p) => p.kategori === activeTab)
      .filter((p) => tingkatFilter === 'ALL' || p.tingkat === tingkatFilter)
      .filter((p) => tahunFilter === 'ALL' || p.tanggal.startsWith(tahunFilter));
  }, [state.prestasis, activeTab, tingkatFilter, tahunFilter]);

  const openAdd = () => {
    setEditing(null);
    setKategori(activeTab);
    setJudul('');
    setNamaPeraih('');
    setTingkat('Kabupaten');
    setPeringkat('Juara 1');
    setTanggal(new Date().toISOString().slice(0, 10));
    setPenyelenggara('');
    setDeskripsi('');
    setFotoUrlDraft('');
    setVideoFileDraft(null);
    setModalOpen(true);
  };

  const openEdit = (p: Prestasi) => {
    setEditing(p);
    setKategori(p.kategori);
    setJudul(p.judul);
    setNamaPeraih(p.namaPeraih);
    setTingkat(p.tingkat);
    setPeringkat(p.peringkat);
    setTanggal(p.tanggal);
    setPenyelenggara(p.penyelenggara);
    setDeskripsi(p.deskripsi);
    setFotoUrlDraft(p.mediaFotoUrl || '');
    setVideoFileDraft(null);
    setModalOpen(true);
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 900, 0.85);
      setFotoUrlDraft(dataUrl);
      showToast('Foto prestasi dimuat.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat foto.', 'error');
    }
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !namaPeraih.trim()) {
      showToast('Judul prestasi dan nama peraih wajib diisi.', 'error');
      return;
    }

    try {
      setSaving(true);
      let mediaVideoId = editing?.mediaVideoId;
      let mediaVideoName = editing?.mediaVideoName;

      if (videoFileDraft) {
        if (mediaVideoId) {
          await deleteMediaFile(mediaVideoId).catch(() => {});
        }
        const saved = await saveMediaFile(videoFileDraft, videoFileDraft.name);
        mediaVideoId = saved.id;
        mediaVideoName = saved.name;
      }

      const item: Prestasi = {
        id: editing?.id || `pres_${Date.now()}`,
        kategori,
        judul: judul.trim(),
        namaPeraih: namaPeraih.trim(),
        tingkat,
        peringkat: peringkat.trim() || 'Juara',
        tanggal,
        penyelenggara: penyelenggara.trim(),
        deskripsi: deskripsi.trim(),
        mediaFotoUrl: fotoUrlDraft,
        mediaVideoId,
        mediaVideoName,
        createdByUserId: editing?.createdByUserId || currentUser?.id || 'usr-admin',
        createdByName: editing?.createdByName || currentUser?.namaLengkap || 'Administrator',
      };

      savePrestasi(item, !editing);
      setActiveTab(kategori);
      setModalOpen(false);
    } catch {
      showToast('Gagal menyimpan media video prestasi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const canManage = (p: Prestasi) => isAdmin || p.createdByUserId === currentUser?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Galeri & Catatan Prestasi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Dokumentasi capaian prestasi siswa, sekolah, dan pendidik {state.schoolProfile.nama}.
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          Tambah Prestasi
        </button>
      </div>

      {/* Tab Kategori + Filter Tingkat & Tahun */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start">
          {(['Siswa', 'Sekolah', 'Guru'] as const).map((tab) => {
            const count = state.prestasis.filter((p) => p.kategori === tab).length;
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Prestasi {tab} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={tingkatFilter}
            onChange={(e) => setTingkatFilter(e.target.value)}
            aria-label="Filter tingkat prestasi"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm"
          >
            <option value="ALL">Semua Tingkat</option>
            {TINGKAT_PRESTASI.map((t) => (
              <option key={t} value={t}>
                Tingkat {t}
              </option>
            ))}
          </select>

          <select
            value={tahunFilter}
            onChange={(e) => setTahunFilter(e.target.value)}
            aria-label="Filter tahun prestasi"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs sm:text-sm font-mono-num"
          >
            <option value="ALL">Semua Tahun</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                Tahun {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Galeri Kartu Prestasi */}
      {filteredPrestasis.length === 0 ? (
        <EmptyState
          icon={<Award className="w-6 h-6" />}
          title={`Belum Ada Prestasi ${activeTab}`}
          description="Tambahkan catatan prestasi beserta foto atau video dokumentasi."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPrestasis.map((p) => {
            const videoSrc = videoUrls[p.id];
            const editable = canManage(p);
            return (
              <article
                key={p.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Media Foto / Video */}
                  <div
                    onClick={() => setLightboxItem(p)}
                    className="h-52 bg-slate-100 dark:bg-slate-800 relative overflow-hidden cursor-pointer"
                  >
                    {videoSrc ? (
                      <video
                        src={videoSrc}
                        controls
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-full object-cover bg-black"
                      />
                    ) : p.mediaFotoUrl ? (
                      <img
                        src={p.mediaFotoUrl}
                        alt={p.judul}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-teal-700/50 dark:text-teal-400/40 bg-gradient-to-br from-teal-50 to-amber-50 dark:from-slate-800 dark:to-slate-900">
                        <Award className="w-12 h-12 mb-1.5" />
                        <span className="text-xs font-medium">{p.peringkat}</span>
                      </div>
                    )}
                  </div>

                  {/* Konten Teks */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {p.peringkat}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-teal-700 dark:text-teal-400">
                        Tingkat {p.tingkat}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatTanggalId(p.tanggal)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLightboxItem(p)}
                      className="mt-1.5 text-left text-base font-display font-semibold text-slate-900 dark:text-slate-100 hover:text-teal-700 dark:hover:text-teal-400 leading-snug cursor-pointer"
                    >
                      {p.judul}
                    </button>

                    <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Peraih: {p.namaPeraih}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {p.deskripsi}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setLightboxItem(p)}
                    className="font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    Lihat Detail & Media
                  </button>

                  {editable && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Edit prestasi"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          confirmDelete(
                            'Hapus Data Prestasi?',
                            `Catatan prestasi "${p.judul}" akan dihapus permanen.`,
                            async () => {
                              if (p.mediaVideoId) {
                                await deleteMediaFile(p.mediaVideoId).catch(() => {});
                              }
                              deletePrestasi(p.id);
                            }
                          )
                        }
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        aria-label="Hapus prestasi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox / Detail Modal */}
      <Modal
        open={Boolean(lightboxItem)}
        onClose={() => setLightboxItem(null)}
        title={lightboxItem?.judul || ''}
        subtitle={
          lightboxItem
            ? `${lightboxItem.peringkat} · Tingkat ${lightboxItem.tingkat} · ${formatTanggalId(lightboxItem.tanggal)}`
            : ''
        }
        maxWidthClass="max-w-3xl"
      >
        {lightboxItem && (
          <div className="space-y-4">
            {lightboxItem.mediaFotoUrl && (
              <img
                src={lightboxItem.mediaFotoUrl}
                alt={lightboxItem.judul}
                referrerPolicy="no-referrer"
                className="w-full max-h-[420px] object-contain rounded-xl bg-slate-100 dark:bg-slate-950"
              />
            )}
            {videoUrls[lightboxItem.id] && (
              <video
                src={videoUrls[lightboxItem.id]}
                controls
                className="w-full max-h-[380px] rounded-xl bg-black"
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
              <div>
                <p className="text-xs text-slate-500">Peraih Prestasi</p>
                <p className="font-semibold">{lightboxItem.namaPeraih}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Penyelenggara</p>
                <p className="font-medium">{lightboxItem.penyelenggara || '-'}</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {lightboxItem.deskripsi}
            </p>
          </div>
        )}
      </Modal>

      {/* Modal Form Tambah / Edit Prestasi */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Catatan Prestasi' : 'Tambah Prestasi Baru'}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as 'Siswa' | 'Sekolah' | 'Guru')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="Siswa">Prestasi Siswa</option>
                <option value="Sekolah">Prestasi Sekolah</option>
                <option value="Guru">Prestasi Guru</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tingkat</label>
              <select
                value={tingkat}
                onChange={(e) => setTingkat(e.target.value as TingkatPrestasi)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {TINGKAT_PRESTASI.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Judul Lomba / Penghargaan *</label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold mb-1">Nama Peraih *</label>
              <input
                type="text"
                required
                value={namaPeraih}
                onChange={(e) => setNamaPeraih(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Peringkat / Juara</label>
              <input
                type="text"
                value={peringkat}
                onChange={(e) => setPeringkat(e.target.value)}
                placeholder="Juara 1"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Penyelenggara</label>
              <input
                type="text"
                value={penyelenggara}
                onChange={(e) => setPenyelenggara(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Upload Foto Dokumentasi</label>
              <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer hover:border-teal-600">
                <ImageIcon className="w-4 h-4 text-teal-700" />
                {fotoUrlDraft ? 'Foto Siap (Klik ganti)' : 'Pilih Foto (JPG/PNG)'}
                <input type="file" accept="image/*" onChange={handleFotoUpload} className="hidden" />
              </label>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Upload Video Dokumentasi</label>
              <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer hover:border-teal-600">
                <Film className="w-4 h-4 text-amber-500" />
                {videoFileDraft
                  ? videoFileDraft.name
                  : editing?.mediaVideoName
                    ? `Video: ${editing.mediaVideoName}`
                    : 'Pilih Video (MP4/WebM)'}
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFileDraft(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Deskripsi</label>
            <textarea
              rows={3}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
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
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Upload className="w-4 h-4 inline mr-1.5" />
              {saving ? 'Menyimpan...' : 'Simpan Prestasi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
