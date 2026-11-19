// Halaman Profil Saya (Khusus Guru) - Edit Foto, Identitas Diri Sendiri & Upload Sertifikat Prestasi

import React, {useEffect, useMemo, useState} from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileText,
  Lock,
  Plus,
  Save,
  Trash2,
  Upload,
  UserCircle2,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {
  compressImageToDataUrl,
  deleteMediaFile,
  getMediaFile,
  saveMediaFile,
} from '../services/mediaDb';
import {
  Guru,
  GuruCertificate,
  GuruCustomField,
  KelasLevel,
  TINGKAT_PRESTASI,
  TingkatPrestasi,
} from '../types/school';
import {formatFileSize, formatTanggalId} from '../utils/gradeUtils';
import {Avatar, EmptyState, Modal} from '../components/ui/AvatarAndModal';
import {FilePreviewModal, PreviewableFileItem} from '../components/ui/FilePreviewModal';

export const ProfilSayaPage: React.FC = () => {
  const {
    state,
    currentUser,
    currentGuru,
    selectedPeriod,
    saveGuru,
    saveGuruCertificate,
    deleteGuruCertificate,
    confirmDelete,
    showToast,
  } = useSchool();

  const [activeTab, setActiveTab] = useState<'identitas' | 'sertifikat'>('identitas');
  const [form, setForm] = useState<Guru | null>(null);

  // Sinkronkan form saat currentGuru atau periode berubah
  useEffect(() => {
    if (currentGuru) {
      setForm({
        ...currentGuru,
        mapelDiampu: [...currentGuru.mapelDiampu],
        kelasDiampu: [...currentGuru.kelasDiampu],
        customFields: currentGuru.customFields.map((cf) => ({...cf})),
      });
    } else {
      setForm(null);
    }
  }, [currentGuru]);

  // Daftar sertifikat milik guru yang login saja (isolasi ketat)
  const myCertificates = useMemo(() => {
    if (!currentUser || !currentGuru) return [];
    return state.guruCertificates.filter(
      (c) => c.userId === currentUser.id || c.guruId === currentGuru.id
    );
  }, [state.guruCertificates, currentUser, currentGuru]);

  // Modal Upload / Edit Sertifikat Prestasi
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<GuruCertificate | null>(null);
  const [certJudul, setCertJudul] = useState('');
  const [certTingkat, setCertTingkat] = useState<TingkatPrestasi>('Kabupaten');
  const [certPeringkat, setCertPeringkat] = useState('');
  const [certPenyelenggara, setCertPenyelenggara] = useState('');
  const [certTahun, setCertTahun] = useState(String(new Date().getFullYear()));
  const [certKeterangan, setCertKeterangan] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);

  // Modal Pratinjau Foto Profil saat foto diklik
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);

  // Modal Pratinjau Sertifikat Universal
  const [previewFileItem, setPreviewFileItem] = useState<PreviewableFileItem | null>(null);

  if (!currentGuru || !form || !currentUser) {
    return (
      <EmptyState
        icon={<UserCircle2 className="w-7 h-7" />}
        title="Profil Guru Belum Terhubung"
        description="Akun login Anda belum terhubung ke data pendidik pada periode ini. Silakan hubungi Administrator Sekolah."
      />
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 420, 0.86);
      const updated = {...form, foto: dataUrl};
      setForm(updated);
      saveGuru(updated, false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengunggah foto profil.', 'error');
    }
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    const updated = {...form, foto: ''};
    setForm(updated);
    saveGuru(updated, false);
  };

  const toggleMapel = (mapel: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const exists = prev.mapelDiampu.includes(mapel);
      return {
        ...prev,
        mapelDiampu: exists
          ? prev.mapelDiampu.filter((m) => m !== mapel)
          : [...prev.mapelDiampu, mapel],
      };
    });
  };

  const toggleKelas = (k: KelasLevel) => {
    setForm((prev) => {
      if (!prev) return prev;
      const exists = prev.kelasDiampu.includes(k);
      return {
        ...prev,
        kelasDiampu: exists
          ? prev.kelasDiampu.filter((x) => x !== k)
          : [...prev.kelasDiampu, k],
      };
    });
  };

  const addCustomField = () => {
    const newField: GuruCustomField = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      label: '',
      value: '',
    };
    setForm((prev) => (prev ? {...prev, customFields: [...prev.customFields, newField]} : prev));
  };

  const updateCustomField = (id: string, key: 'label' | 'value', val: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            customFields: prev.customFields.map((cf) => (cf.id === id ? {...cf, [key]: val} : cf)),
          }
        : prev
    );
  };

  const removeCustomField = (id: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            customFields: prev.customFields.filter((cf) => cf.id !== id),
          }
        : prev
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      showToast('Nama lengkap wajib diisi.', 'error');
      return;
    }
    const cleanForm: Guru = {
      ...form,
      nama: form.nama.trim(),
      customFields: form.customFields.filter((cf) => cf.label.trim() !== ''),
    };
    saveGuru(cleanForm, false);
  };

  const openAddCert = () => {
    setEditingCert(null);
    setCertJudul('');
    setCertTingkat('Kabupaten');
    setCertPeringkat('Juara 1');
    setCertPenyelenggara('');
    setCertTahun(String(new Date().getFullYear()));
    setCertKeterangan('');
    setCertFile(null);
    setCertModalOpen(true);
  };

  const openEditCert = (cert: GuruCertificate) => {
    setEditingCert(cert);
    setCertJudul(cert.judul);
    setCertTingkat(cert.tingkat);
    setCertPeringkat(cert.peringkat);
    setCertPenyelenggara(cert.penyelenggara);
    setCertTahun(cert.tahun);
    setCertKeterangan(cert.keterangan);
    setCertFile(null);
    setCertModalOpen(true);
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certJudul.trim()) {
      showToast('Judul sertifikat prestasi wajib diisi.', 'error');
      return;
    }
    if (!editingCert && !certFile) {
      showToast('Silakan pilih file sertifikat prestasi (PDF / Gambar) untuk diunggah.', 'error');
      return;
    }

    try {
      setUploadingCert(true);
      let fileId = editingCert?.fileId;
      let fileName = editingCert?.fileName;
      let fileType = editingCert?.fileType;
      let fileSize = editingCert?.fileSize;
      let previewDataUrl = editingCert?.previewDataUrl;

      if (certFile) {
        if (fileId) {
          await deleteMediaFile(fileId).catch(() => {});
        }
        const saved = await saveMediaFile(certFile, certFile.name);
        fileId = saved.id;
        fileName = saved.name;
        fileType = saved.mimeType;
        fileSize = saved.size;

        if (certFile.type.startsWith('image/')) {
          previewDataUrl = await compressImageToDataUrl(certFile, 900, 0.85).catch(() => undefined);
        } else {
          previewDataUrl = undefined;
        }
      }

      const payload: GuruCertificate = {
        id: editingCert?.id || `cert_${Date.now()}`,
        guruId: currentGuru.id,
        userId: currentUser.id,
        judul: certJudul.trim(),
        tingkat: certTingkat,
        peringkat: certPeringkat.trim() || 'Peserta / Penghargaan',
        penyelenggara: certPenyelenggara.trim(),
        tahun: certTahun.trim() || String(new Date().getFullYear()),
        keterangan: certKeterangan.trim(),
        fileId,
        fileName,
        fileType,
        fileSize,
        previewDataUrl,
        tanggalUpload: new Date().toISOString().slice(0, 10),
      };

      saveGuruCertificate(payload, !editingCert);
      setCertModalOpen(false);
    } catch {
      showToast('Gagal menyimpan berkas sertifikat prestasi.', 'error');
    } finally {
      setUploadingCert(false);
    }
  };

  const handleDownloadCert = async (cert: GuruCertificate) => {
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
      return;
    }
    showToast('File sertifikat tidak ditemukan di penyimpanan lokal.', 'warning');
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">
            Profil & Sertifikat Prestasi Saya
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
            Anda hanya dapat mengedit foto, identitas pribadi, dan sertifikat prestasi milik akun Anda sendiri ({selectedPeriod.label}).
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('identitas')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'identitas'
                ? 'bg-teal-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Identitas & Foto Diri
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sertifikat')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'sertifikat'
                ? 'bg-teal-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Sertifikat Prestasi ({myCertificates.length})
          </button>
        </div>
      </div>

      {/* Kartu Ringkasan Foto Profil */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPhotoPreviewOpen(true)}
              className="relative group rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-600/40 cursor-pointer shrink-0"
              title="Klik untuk melihat foto profil"
            >
              <Avatar src={form.foto} name={form.nama} size="xl" />
              <span className="absolute inset-0 rounded-2xl bg-slate-950/0 group-hover:bg-slate-950/45 transition-colors flex items-center justify-center">
                <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>
            <div>
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                {form.jabatan} · {form.statusKepegawaian}
              </p>
              <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-slate-100">
                {form.nama}
              </h2>
              <p className="text-xs font-mono-num text-slate-500 dark:text-slate-400 mt-0.5">
                NIP: {form.nip || '-'} · NUPTK: {form.nuptk || '-'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Mengampu: <span className="font-semibold">{form.mapelDiampu.join(', ') || '-'}</span> (Kelas{' '}
                {form.kelasDiampu.join(', ') || '-'})
              </p>
              <button
                type="button"
                onClick={() => setPhotoPreviewOpen(true)}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                Klik foto untuk lihat ukuran penuh
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Ganti Foto Profil
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
            {form.foto && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
              >
                Hapus Foto
              </button>
            )}
          </div>
        </div>
      </section>

      {activeTab === 'identitas' ? (
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Formulir Identitas Diri & Kepegawaian
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perubahan data akan otomatis tampil di Beranda dan kop identitas guru Anda.
              </p>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer self-start"
            >
              <Save className="w-4 h-4" />
              Simpan Perubahan Profil
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                onChange={(e) =>
                  setForm({...form, jenisKelamin: e.target.value as Guru['jenisKelamin']})
                }
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
                {state.subjects.map((m) => {
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
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Identitas Tambahan & Kolom Bebas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Belum ada kolom tambahan. Klik &ldquo;Tambah Kolom&rdquo; untuk menambahkan informasi tambahan.
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
                        className="col-span-1 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg justify-self-center cursor-pointer"
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

          <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simpan Identitas Saya
            </button>
          </div>
        </form>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div>
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Portofolio Sertifikat Prestasi & Penghargaan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Unggah bukti sertifikat prestasi, piagam penghargaan, atau sertifikat kompetensi (PDF / JPG / PNG).
              </p>
            </div>
            <button
              type="button"
              onClick={openAddCert}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Upload Sertifikat Prestasi
            </button>
          </div>

          {myCertificates.length === 0 ? (
            <EmptyState
              icon={<Award className="w-6 h-6" />}
              title="Belum Ada Sertifikat Prestasi"
              description="Unggah sertifikat prestasi atau penghargaan Anda agar tersimpan rapi dan dapat dilihat pada identitas guru."
              action={
                <button
                  type="button"
                  onClick={openAddCert}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Upload Sertifikat Pertama
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {myCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail Pratinjau */}
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewFileItem({
                          id: cert.id,
                          judul: cert.judul,
                          subJudul: `${cert.peringkat} · Tingkat ${cert.tingkat} · Tahun ${cert.tahun}`,
                          pemilik: currentGuru.nama,
                          tanggal: cert.tanggalUpload,
                          keterangan: cert.keterangan,
                          fileId: cert.fileId,
                          fileName: cert.fileName,
                          fileType: cert.fileType,
                          fileSize: cert.fileSize,
                          previewDataUrl: cert.previewDataUrl,
                        })
                      }
                      className="w-full h-44 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-b border-slate-200 dark:border-slate-800 cursor-pointer group relative"
                    >
                      {cert.previewDataUrl ? (
                        <img
                          src={cert.previewDataUrl}
                          alt={cert.judul}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400 px-4 text-center">
                          <FileText className="w-10 h-10 text-teal-700 dark:text-teal-400" />
                          <span className="text-xs font-medium truncate max-w-[220px]">
                            {cert.fileName || 'Dokumen Sertifikat PDF'}
                          </span>
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/75 text-white text-[11px] font-medium">
                        <Eye className="w-3 h-3" />
                        Lihat Sertifikat
                      </span>
                    </button>

                    <div className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-teal-700 dark:text-teal-400">
                          Tingkat {cert.tingkat} · {cert.tahun}
                        </span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {cert.peringkat}
                        </span>
                      </div>
                      <h4 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {cert.judul}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Penyelenggara: {cert.penyelenggara || '-'}
                      </p>
                      {cert.keterangan && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 pt-1">
                          {cert.keterangan}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 font-mono-num pt-1">
                        {cert.fileName || 'Sertifikat'}
                        {cert.fileSize ? ` (${formatFileSize(cert.fileSize)})` : ''} · Diunggah{' '}
                        {formatTanggalId(cert.tanggalUpload)}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadCert(cert)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditCert(cert)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit Detail Sertifikat"
                        aria-label="Edit sertifikat"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          confirmDelete(
                            'Hapus Sertifikat Prestasi?',
                            `Sertifikat "${cert.judul}" akan dihapus permanen dari profil Anda.`,
                            async () => {
                              if (cert.fileId) {
                                await deleteMediaFile(cert.fileId).catch(() => {});
                              }
                              deleteGuruCertificate(cert.id);
                            }
                          )
                        }
                        className="p-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        title="Hapus Sertifikat"
                        aria-label="Hapus sertifikat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal Upload / Edit Sertifikat Prestasi */}
      <Modal
        open={certModalOpen}
        onClose={() => setCertModalOpen(false)}
        title={editingCert ? 'Edit Detail Sertifikat Prestasi' : 'Upload Sertifikat Prestasi'}
        subtitle={`Pemilik: ${currentGuru.nama}`}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSaveCert} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Judul Prestasi / Sertifikat *</label>
            <input
              type="text"
              required
              value={certJudul}
              onChange={(e) => setCertJudul(e.target.value)}
              placeholder="Misal: Juara 1 Lomba Guru Berprestasi / Narasumber Kurikulum"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Tingkat</label>
              <select
                value={certTingkat}
                onChange={(e) => setCertTingkat(e.target.value as TingkatPrestasi)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {TINGKAT_PRESTASI.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Peringkat / Peran</label>
              <input
                type="text"
                value={certPeringkat}
                onChange={(e) => setCertPeringkat(e.target.value)}
                placeholder="Juara 1 / Pembina"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Tahun</label>
              <input
                type="text"
                value={certTahun}
                onChange={(e) => setCertTahun(e.target.value)}
                placeholder="2026"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Penyelenggara / Penerbit</label>
            <input
              type="text"
              value={certPenyelenggara}
              onChange={(e) => setCertPenyelenggara(e.target.value)}
              placeholder="Misal: Dinas Pendidikan Kab. Karangasem / Kemdikbud"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan Tambahan</label>
            <textarea
              rows={2}
              value={certKeterangan}
              onChange={(e) => setCertKeterangan(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Berkas Sertifikat (PDF / JPG / PNG / WEBP) {!editingCert && '*'}
            </label>
            <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-600 bg-slate-50 dark:bg-slate-950/50 cursor-pointer text-center">
              <Upload className="w-5 h-5 text-teal-700 dark:text-teal-400 mb-1" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {certFile
                  ? `${certFile.name} (${formatFileSize(certFile.size)})`
                  : editingCert?.fileName
                    ? `Berkas saat ini: ${editingCert.fileName} (klik untuk ganti)`
                    : 'Klik untuk memilih file sertifikat'}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCertModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploadingCert}
              className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
            >
              {uploadingCert ? 'Mengunggah...' : 'Simpan Sertifikat'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Lihat Foto Profil Ukuran Penuh */}
      <Modal
        open={photoPreviewOpen}
        onClose={() => setPhotoPreviewOpen(false)}
        title={`Foto Profil — ${form.nama}`}
        subtitle={`${form.jabatan} · NIP ${form.nip || '-'}`}
        maxWidthClass="max-w-lg"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-4 flex items-center justify-center min-h-[260px]">
            {form.foto ? (
              <img
                src={form.foto}
                alt={form.nama}
                className="max-h-[420px] w-auto rounded-xl object-contain shadow-sm"
              />
            ) : (
              <div className="text-center space-y-2 py-8">
                <Avatar src="" name={form.nama} size="xl" />
                <p className="text-xs text-slate-500">
                  Belum ada foto yang diunggah. Klik &ldquo;Ganti Foto Profil&rdquo; untuk mengunggah foto.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Unggah / Ganti Foto
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal Pratinjau Sertifikat Universal */}
      <FilePreviewModal item={previewFileItem} onClose={() => setPreviewFileItem(null)} />
    </div>
  );
};
