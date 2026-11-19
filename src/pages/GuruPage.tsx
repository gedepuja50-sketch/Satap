// Halaman 2: Data Guru - Daftar kartu, detail lengkap, edit data pribadi guru sendiri, serta CRUD & reset password Admin

import React, {useMemo, useState} from 'react';
import {
  Award,
  Download,
  Edit3,
  Eye,
  FileText,
  KeyRound,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {compressImageToDataUrl, getMediaFile} from '../services/mediaDb';
import {DAFTAR_MAPEL, Guru, GuruCustomField, KelasLevel} from '../types/school';
import {formatTanggalId} from '../utils/gradeUtils';
import {Avatar, EmptyState, Modal} from '../components/ui/AvatarAndModal';

const emptyGuru = (periodId: string): Guru => ({
  id: `guru_${Date.now()}`,
  periodId,
  userId: '',
  foto: '',
  nama: '',
  nip: '',
  nuptk: '',
  tempatLahir: 'Karangasem',
  tanggalLahir: '1990-01-01',
  jenisKelamin: 'Laki-laki',
  agama: 'Hindu',
  alamat: '',
  noHp: '',
  email: '',
  pendidikanTerakhir: 'S1 Pendidikan',
  statusKepegawaian: 'PNS',
  golonganPangkat: 'Penata Muda / III.a',
  jabatan: 'Guru Mata Pelajaran',
  mapelDiampu: ['Matematika'],
  kelasDiampu: ['7', '8', '9'],
  jamMengajar: 24,
  tahunMulaiBertugas: '2024',
  nik: '',
  npwp: '',
  noRekening: '',
  kontakDarurat: '',
  customFields: [],
});

export const GuruPage: React.FC = () => {
  const {
    state,
    currentUser,
    currentGuru,
    selectedPeriod,
    periodGurus,
    saveGuru,
    deleteGuru,
    saveAccount,
    confirmDelete,
    showToast,
  } = useSchool();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [detailGuru, setDetailGuru] = useState<Guru | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isNewGuru, setIsNewGuru] = useState(false);
  const [form, setForm] = useState<Guru>(emptyGuru(selectedPeriod.id));

  // Reset password modal (khusus Admin)
  const [resetTarget, setResetTarget] = useState<Guru | null>(null);
  const [newPassword, setNewPassword] = useState('guru123');

  const filteredGurus = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return periodGurus;
    return periodGurus.filter(
      (g) =>
        g.nama.toLowerCase().includes(q) ||
        g.nip.toLowerCase().includes(q) ||
        g.mapelDiampu.some((m) => m.toLowerCase().includes(q)) ||
        g.jabatan.toLowerCase().includes(q)
    );
  }, [periodGurus, search]);

  const canEditGuru = (g: Guru) => isAdmin || (currentGuru && currentGuru.id === g.id);

  const openAddGuru = () => {
    setIsNewGuru(true);
    setForm(emptyGuru(selectedPeriod.id));
    setEditModalOpen(true);
  };

  const openEditGuru = (g: Guru) => {
    setIsNewGuru(false);
    setForm({
      ...g,
      mapelDiampu: [...g.mapelDiampu],
      kelasDiampu: [...g.kelasDiampu],
      customFields: g.customFields.map((cf) => ({...cf})),
    });
    setEditModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 400, 0.85);
      setForm((prev) => ({...prev, foto: dataUrl}));
      showToast('Foto guru berhasil dimuat.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat foto.', 'error');
    }
    e.target.value = '';
  };

  const toggleMapel = (mapel: string) => {
    setForm((prev) => {
      const exists = prev.mapelDiampu.includes(mapel);
      const next = exists ? prev.mapelDiampu.filter((m) => m !== mapel) : [...prev.mapelDiampu, mapel];
      return {...prev, mapelDiampu: next};
    });
  };

  const toggleKelas = (k: KelasLevel) => {
    setForm((prev) => {
      const exists = prev.kelasDiampu.includes(k);
      const next = exists ? prev.kelasDiampu.filter((x) => x !== k) : [...prev.kelasDiampu, k];
      return {...prev, kelasDiampu: next};
    });
  };

  const addCustomField = () => {
    const newField: GuruCustomField = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      label: '',
      value: '',
    };
    setForm((prev) => ({...prev, customFields: [...prev.customFields, newField]}));
  };

  const updateCustomField = (id: string, key: 'label' | 'value', val: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((cf) => (cf.id === id ? {...cf, [key]: val} : cf)),
    }));
  };

  const removeCustomField = (id: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((cf) => cf.id !== id),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      showToast('Nama lengkap guru wajib diisi.', 'error');
      return;
    }
    const cleanForm: Guru = {
      ...form,
      customFields: form.customFields.filter((cf) => cf.label.trim() !== ''),
    };
    saveGuru(cleanForm, isNewGuru);
    setEditModalOpen(false);
    if (detailGuru?.id === cleanForm.id) {
      setDetailGuru(cleanForm);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    const acc = state.accounts.find(
      (a) => a.guruId === resetTarget.id || a.id === resetTarget.userId
    );
    if (!acc) {
      showToast('Akun login untuk guru ini belum dibuat. Buat akun di Panel Admin.', 'warning');
      setResetTarget(null);
      return;
    }
    if (newPassword.trim().length < 4) {
      showToast('Password baru minimal 4 karakter.', 'error');
      return;
    }
    saveAccount({...acc, password: newPassword.trim()}, false);
    setResetTarget(null);
    showToast(`Password akun ${acc.username} berhasil direset.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Data Pendidik (Guru)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'Kelola data seluruh pendidik, mata pelajaran yang diampu, serta reset kata sandi.'
              : 'Lihat direktori guru dan perbarui data pribadi serta identitas tambahan Anda sendiri.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIP, mapel..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30"
            />
          </div>
          {currentGuru && (
            <button
              type="button"
              onClick={() => openEditGuru(currentGuru)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-700/30 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profil Saya
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={openAddGuru}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Guru
            </button>
          )}
        </div>
      </div>

      {/* Grid Kartu Guru */}
      {filteredGurus.length === 0 ? (
        <EmptyState
          icon={<Search className="w-6 h-6" />}
          title="Guru Tidak Ditemukan"
          description="Tidak ada data guru yang sesuai dengan kata kunci pencarian Anda."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGurus.map((g) => {
            const isMine = currentGuru?.id === g.id;
            const editable = canEditGuru(g);
            return (
              <div
                key={g.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:border-teal-600/40 transition-colors"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <Avatar src={g.foto} name={g.nama} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-teal-700 dark:text-teal-400">
                          {g.statusKepegawaian}
                        </span>
                        {isMine && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              Profil Anda
                            </span>
                          </>
                        )}
                      </div>
                      <h2 className="mt-0.5 text-base font-display font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {g.nama}
                      </h2>
                      <p className="text-xs font-mono-num text-slate-500 dark:text-slate-400 mt-0.5">
                        NIP: {g.nip || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Jabatan:</span>{' '}
                      <span className="font-medium">{g.jabatan}</span>
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400">Mapel Diampu:</span>{' '}
                      <span className="font-semibold text-teal-700 dark:text-teal-400">
                        {g.mapelDiampu.join(', ') || '-'}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono-num">
                        <Phone className="w-3.5 h-3.5" />
                        {g.noHp || '-'}
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{g.email || '-'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDetailGuru(g)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Lihat Lengkap
                  </button>

                  <div className="flex items-center gap-1.5">
                    {editable && (
                      <button
                        type="button"
                        onClick={() => openEditGuru(g)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(g);
                            setNewPassword('guru123');
                          }}
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          title="Reset Password Akun Guru"
                          aria-label="Reset password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            confirmDelete(
                              'Hapus Data Guru?',
                              `Data pendidik "${g.nama}" akan dihapus permanen.`,
                              () => deleteGuru(g.id)
                            )
                          }
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Hapus Guru"
                          aria-label="Hapus guru"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail Guru */}
      <Modal
        open={Boolean(detailGuru)}
        onClose={() => setDetailGuru(null)}
        title={detailGuru?.nama || ''}
        subtitle={detailGuru ? `${detailGuru.jabatan} · ${detailGuru.statusKepegawaian}` : ''}
        maxWidthClass="max-w-3xl"
      >
        {detailGuru && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <Avatar src={detailGuru.foto} name={detailGuru.nama} size="xl" />
              <div className="space-y-1">
                <p className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                  {detailGuru.nama}
                </p>
                <p className="text-xs font-mono-num text-slate-600 dark:text-slate-400">
                  NIP: {detailGuru.nip || '-'} · NUPTK: {detailGuru.nuptk || '-'}
                </p>
                <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold">
                  Mengampu: {detailGuru.mapelDiampu.join(', ')} (Kelas {detailGuru.kelasDiampu.join(', ')}) ·{' '}
                  {detailGuru.jamMengajar} JP/minggu
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Tempat, Tanggal Lahir</p>
                <p className="font-medium">
                  {detailGuru.tempatLahir}, {formatTanggalId(detailGuru.tanggalLahir)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Jenis Kelamin & Agama</p>
                <p className="font-medium">
                  {detailGuru.jenisKelamin} · {detailGuru.agama}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pendidikan Terakhir</p>
                <p className="font-medium">{detailGuru.pendidikanTerakhir}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Golongan / Pangkat & Tahun Mulai</p>
                <p className="font-medium">
                  {detailGuru.golonganPangkat} · Sejak {detailGuru.tahunMulaiBertugas}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">No. HP & Email</p>
                <p className="font-medium font-mono-num">{detailGuru.noHp}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{detailGuru.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Alamat</p>
                <p className="font-medium">{detailGuru.alamat}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Identitas Tambahan & Kepegawaian
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">NIK</p>
                  <p className="font-mono-num font-medium">{detailGuru.nik || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">NPWP</p>
                  <p className="font-mono-num font-medium">{detailGuru.npwp || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Nomor Rekening</p>
                  <p className="font-mono-num font-medium">{detailGuru.noRekening || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kontak Darurat</p>
                  <p className="font-medium">{detailGuru.kontakDarurat || '-'}</p>
                </div>
                {detailGuru.customFields.map((cf) => (
                  <div key={cf.id}>
                    <p className="text-xs text-slate-500">{cf.label}</p>
                    <p className="font-medium">{cf.value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sertifikat Prestasi Guru */}
            {(() => {
              const certs = state.guruCertificates.filter(
                (c) =>
                  (detailGuru.userId && c.userId === detailGuru.userId) ||
                  c.guruId === detailGuru.id
              );
              return (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    Sertifikat Prestasi ({certs.length})
                  </h3>
                  {certs.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Belum ada sertifikat prestasi yang diunggah.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {certs.map((cert) => (
                        <div
                          key={cert.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {cert.judul}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {cert.peringkat} · Tingkat {cert.tingkat} · {cert.tahun}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (cert.fileId) {
                                const stored = await getMediaFile(cert.fileId).catch(() => null);
                                if (stored) {
                                  const url = URL.createObjectURL(stored.blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = cert.fileName || `${cert.judul}.pdf`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  return;
                                }
                              }
                              if (cert.previewDataUrl) {
                                const a = document.createElement('a');
                                a.href = cert.previewDataUrl;
                                a.download = cert.fileName || `${cert.judul}.svg`;
                                a.click();
                              } else {
                                showToast('Berkas sertifikat tidak tersedia.', 'warning');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Unduh
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* Modal Tambah / Edit Data Guru (Lengkap + Kolom Bebas Tambahan) */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={isNewGuru ? 'Tambah Data Guru Baru' : `Edit Data Guru — ${form.nama}`}
        subtitle="Lengkapi identitas pribadi, data kepegawaian, mata pelajaran, dan kolom tambahan."
        maxWidthClass="max-w-4xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          {/* Upload Foto */}
          <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Avatar src={form.foto} name={form.nama || 'Guru'} size="lg" />
            <div>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <Upload className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                Unggah Foto Profil
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              {form.foto && (
                <button
                  type="button"
                  onClick={() => setForm({...form, foto: ''})}
                  className="ml-2 text-xs text-red-600 hover:underline"
                >
                  Hapus Foto
                </button>
              )}
              <p className="text-[11px] text-slate-500 mt-1">Format JPG/PNG, otomatis dikompresi.</p>
            </div>
          </div>

          {/* Data Pribadi & Kepegawaian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2 lg:col-span-1">
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
              <label className="block text-xs font-semibold mb-1">NUPTK</label>
              <input
                type="text"
                value={form.nuptk}
                onChange={(e) => setForm({...form, nuptk: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
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
            <div>
              <label className="block text-xs font-semibold mb-1">Jenis Kelamin</label>
              <select
                value={form.jenisKelamin}
                onChange={(e) => setForm({...form, jenisKelamin: e.target.value as Guru['jenisKelamin']})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Agama</label>
              <input
                type="text"
                value={form.agama}
                onChange={(e) => setForm({...form, agama: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">No. HP / WhatsApp</label>
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
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold mb-1">Alamat Tempat Tinggal</label>
              <input
                type="text"
                value={form.alamat}
                onChange={(e) => setForm({...form, alamat: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Pendidikan Terakhir</label>
              <input
                type="text"
                value={form.pendidikanTerakhir}
                onChange={(e) => setForm({...form, pendidikanTerakhir: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Status Kepegawaian</label>
              <select
                value={form.statusKepegawaian}
                onChange={(e) =>
                  setForm({...form, statusKepegawaian: e.target.value as Guru['statusKepegawaian']})
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="GTT / Honorer">GTT / Honorer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Golongan / Pangkat</label>
              <input
                type="text"
                value={form.golonganPangkat}
                onChange={(e) => setForm({...form, golonganPangkat: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jabatan</label>
              <input
                type="text"
                value={form.jabatan}
                onChange={(e) => setForm({...form, jabatan: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Jam Mengajar (JP/Minggu)</label>
              <input
                type="number"
                min={0}
                max={48}
                value={form.jamMengajar}
                onChange={(e) => setForm({...form, jamMengajar: Number(e.target.value) || 0})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tahun Mulai Bertugas</label>
              <input
                type="text"
                value={form.tahunMulaiBertugas}
                onChange={(e) => setForm({...form, tahunMulaiBertugas: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
          </div>

          {/* Mata Pelajaran & Kelas yang Diampu */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-2">Mata Pelajaran yang Diampu</label>
              <div className="flex flex-wrap gap-2">
                {DAFTAR_MAPEL.map((m) => {
                  const checked = form.mapelDiampu.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMapel(m)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        checked
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2">Kelas yang Diampu</label>
              <div className="flex gap-2">
                {(['7', '8', '9'] as KelasLevel[]).map((k) => {
                  const checked = form.kelasDiampu.includes(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleKelas(k)}
                      className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        checked
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Kelas {k}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Identitas Tambahan */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Identitas Tambahan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">NIK</label>
                <input
                  type="text"
                  value={form.nik}
                  onChange={(e) => setForm({...form, nik: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">NPWP</label>
                <input
                  type="text"
                  value={form.npwp}
                  onChange={(e) => setForm({...form, npwp: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={form.noRekening}
                  onChange={(e) => setForm({...form, noRekening: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Kontak Darurat</label>
                <input
                  type="text"
                  value={form.kontakDarurat}
                  onChange={(e) => setForm({...form, kontakDarurat: e.target.value})}
                  placeholder="Nama (Hubungan) - No. HP"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
            </div>

            {/* Kolom Bebas Tambahan yang Bisa Ditambahkan Sendiri */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kolom Bebas Tambahan
                </label>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Kolom
                </button>
              </div>
              {form.customFields.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Belum ada kolom tambahan. Klik "Tambah Kolom" untuk menambahkan informasi bebas lainnya.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.customFields.map((cf) => (
                    <div key={cf.id} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Nama Kolom (mis. Nomor Karpeg)"
                        value={cf.label}
                        onChange={(e) => updateCustomField(cf.id, 'label', e.target.value)}
                        className="col-span-5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Isi / Nilai"
                        value={cf.value}
                        onChange={(e) => updateCustomField(cf.id, 'value', e.target.value)}
                        className="col-span-6 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomField(cf.id)}
                        className="col-span-1 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg justify-self-center"
                        aria-label="Hapus kolom tambahan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
            >
              Simpan Data Guru
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Reset Password Guru (Admin) */}
      <Modal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title="Reset Kata Sandi Guru"
        subtitle={resetTarget?.nama}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Kata Sandi Baru</label>
            <input
              type="text"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
            >
              Reset Kata Sandi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
