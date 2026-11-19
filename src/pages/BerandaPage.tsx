// Halaman 1: Beranda - Profil Sekolah, Informasi Admin, Profil Guru (Klik Foto -> Identitas), Statistik & Grafik

import React, {useEffect, useMemo, useState} from 'react';
import {
  Award,
  Building2,
  Calendar,
  Download,
  Edit3,
  Eye,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {SCHOOL_BANNER_IMAGE} from '../data/seedData';
import {getMediaFile} from '../services/mediaDb';
import {
  Announcement,
  Guru,
  GuruCertificate,
  KelasLevel,
  MenuKey,
} from '../types/school';
import {formatTanggalId, hitungRataRata} from '../utils/gradeUtils';
import {Avatar, Modal} from '../components/ui/AvatarAndModal';

export const BerandaPage: React.FC<{onNavigate?: (menu: MenuKey) => void}> = ({onNavigate}) => {
  const {
    state,
    currentUser,
    currentGuru,
    selectedPeriod,
    periodGurus,
    periodSiswas,
    saveAnnouncement,
    deleteAnnouncement,
    updateSchoolProfile,
    confirmDelete,
    showToast,
  } = useSchool();
  const {
    schoolProfile,
    subjects,
    buildings,
    assets,
    prestasis,
    announcements,
    nilaiRecords,
    gradeSettings,
    guruCertificates,
  } = state;
  const isAdmin = currentUser?.role === 'ADMIN';

  // Hitung jumlah siswa per kelas pada periode terpilih
  const siswaPerKelas = useMemo(() => {
    const counts: Record<KelasLevel, number> = {'7': 0, '8': 0, '9': 0};
    periodSiswas.forEach((s) => {
      counts[s.kelas] = (counts[s.kelas] || 0) + 1;
    });
    return counts;
  }, [periodSiswas]);

  // Hitung rata-rata nilai per mata pelajaran pada periode terpilih
  const rataMapelChart = useMemo(() => {
    return subjects.map((mapel) => {
      const relevant = nilaiRecords.filter(
        (n) => n.periodId === selectedPeriod.id && n.mapel === mapel
      );
      const averages = relevant
        .map((r) => hitungRataRata(r, gradeSettings))
        .filter((v): v is number => v !== null);
      const avg =
        averages.length > 0
          ? Math.round((averages.reduce((acc, cur) => acc + cur, 0) / averages.length) * 10) / 10
          : 0;
      return {mapel, avg, count: averages.length};
    });
  }, [subjects, nilaiRecords, selectedPeriod.id, gradeSettings]);

  // Pencarian cepat guru di Beranda
  const [guruSearch, setGuruSearch] = useState('');
  const filteredGurus = useMemo(() => {
    const q = guruSearch.trim().toLowerCase();
    if (!q) return periodGurus;
    return periodGurus.filter(
      (g) =>
        g.nama.toLowerCase().includes(q) ||
        g.jabatan.toLowerCase().includes(q) ||
        g.mapelDiampu.some((m) => m.toLowerCase().includes(q))
    );
  }, [periodGurus, guruSearch]);

  // Modal Identitas Guru saat foto/kartu diklik
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
  const selectedGuruCerts = useMemo(() => {
    if (!selectedGuru) return [];
    return guruCertificates.filter(
      (c) =>
        (selectedGuru.userId && c.userId === selectedGuru.userId) ||
        c.guruId === selectedGuru.id
    );
  }, [selectedGuru, guruCertificates]);

  // Modal Pratinjau Sertifikat dari Identitas Guru
  const [previewCert, setPreviewCert] = useState<GuruCertificate | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    const loadPreview = async () => {
      setPreviewBlobUrl(null);
      if (!previewCert) return;
      if (previewCert.fileId) {
        const stored = await getMediaFile(previewCert.fileId).catch(() => null);
        if (stored && active) {
          createdUrl = URL.createObjectURL(stored.blob);
          setPreviewBlobUrl(createdUrl);
          return;
        }
      }
      if (previewCert.previewDataUrl && active) {
        setPreviewBlobUrl(previewCert.previewDataUrl);
      }
    };
    loadPreview();

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [previewCert]);

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
    showToast('Berkas sertifikat tidak tersedia untuk diunduh.', 'warning');
  };

  // Modal Informasi / Pengumuman (dapat diupdate Admin)
  const [annModalOpen, setAnnModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [annForm, setAnnForm] = useState<Omit<Announcement, 'id'>>({
    judul: '',
    ringkasan: '',
    isi: '',
    kategori: 'Pengumuman',
    tanggal: new Date().toISOString().slice(0, 10),
    penulis: currentUser?.namaLengkap || 'Administrator',
    penting: false,
  });

  // Modal Edit Profil Sekolah & Visi Misi (Khusus Admin)
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [alamatDraft, setAlamatDraft] = useState(schoolProfile.alamat);
  const [teleponDraft, setTeleponDraft] = useState(schoolProfile.telepon);
  const [emailDraft, setEmailDraft] = useState(schoolProfile.email);
  const [profilSingkatDraft, setProfilSingkatDraft] = useState(schoolProfile.profilSingkat);
  const [visiDraft, setVisiDraft] = useState(schoolProfile.visi);
  const [misiDraftText, setMisiDraftText] = useState(schoolProfile.misi.join('\n'));

  // Modal Detail Informasi
  const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);

  const openAddAnn = () => {
    setEditingAnn(null);
    setAnnForm({
      judul: '',
      ringkasan: '',
      isi: '',
      kategori: 'Pengumuman',
      tanggal: new Date().toISOString().slice(0, 10),
      penulis: currentUser?.namaLengkap || 'Administrator',
      penting: false,
    });
    setAnnModalOpen(true);
  };

  const openEditAnn = (ann: Announcement) => {
    setEditingAnn(ann);
    setAnnForm({
      judul: ann.judul,
      ringkasan: ann.ringkasan,
      isi: ann.isi,
      kategori: ann.kategori,
      tanggal: ann.tanggal,
      penulis: ann.penulis,
      penting: ann.penting,
    });
    setAnnModalOpen(true);
  };

  const handleSaveAnn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.judul.trim() || !annForm.ringkasan.trim()) {
      showToast('Judul dan ringkasan informasi wajib diisi.', 'error');
      return;
    }
    saveAnnouncement({
      id: editingAnn?.id,
      ...annForm,
      isi: annForm.isi.trim() || annForm.ringkasan.trim(),
    });
    setAnnModalOpen(false);
  };

  const openProfileEdit = () => {
    setAlamatDraft(schoolProfile.alamat);
    setTeleponDraft(schoolProfile.telepon);
    setEmailDraft(schoolProfile.email);
    setProfilSingkatDraft(schoolProfile.profilSingkat);
    setVisiDraft(schoolProfile.visi);
    setMisiDraftText(schoolProfile.misi.join('\n'));
    setProfileModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const misiList = misiDraftText
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean);
    if (!visiDraft.trim() || misiList.length === 0) {
      showToast('Visi dan minimal satu poin Misi harus diisi.', 'error');
      return;
    }
    updateSchoolProfile({
      alamat: alamatDraft.trim() || schoolProfile.alamat,
      telepon: teleponDraft.trim() || schoolProfile.telepon,
      email: emailDraft.trim() || schoolProfile.email,
      profilSingkat: profilSingkatDraft.trim(),
      visi: visiDraft.trim(),
      misi: misiList,
    });
    setProfileModalOpen(false);
  };

  const maxSiswaKelas = Math.max(1, siswaPerKelas['7'], siswaPerKelas['8'], siswaPerKelas['9']);

  return (
    <div className="space-y-6">
      {/* 1. Banner Sambutan & Identitas Sekolah */}
      <section className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-[220px] sm:min-h-[250px] flex items-end">
        <img
          src={SCHOOL_BANNER_IMAGE}
          alt={schoolProfile.nama}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/20" />
        <div className="relative w-full p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-4 text-white">
          <div className="flex items-start gap-4 max-w-3xl">
            <img
              src={schoolProfile.logoDataUrl}
              alt="Logo Sekolah"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 object-contain shrink-0 shadow-md hidden sm:block"
            />
            <div>
              <p className="text-xs font-medium text-amber-300">
                Selamat Datang, {currentUser?.namaLengkap} · Periode {selectedPeriod.label}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-display font-bold leading-tight text-balance">
                {schoolProfile.nama}
              </h1>
              <p className="mt-1.5 text-sm text-slate-200 leading-relaxed">
                NPSN: <span className="font-mono-num font-medium">{schoolProfile.npsn}</span> · {schoolProfile.alamat}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <div className="text-left md:text-right">
              <p className="text-xs text-slate-300">Kontak Sekolah</p>
              <p className="text-sm font-medium text-white font-mono-num">{schoolProfile.telepon}</p>
              <p className="text-xs text-slate-300">{schoolProfile.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pintasan Tugas Tambahan Sarana & Prasarana untuk Staf/Guru yang ditugaskan */}
      {!isAdmin && currentUser?.aksesSarpras && onNavigate && (
        <section className="rounded-2xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/80 dark:bg-teal-950/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-700 text-white shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-display font-bold text-teal-950 dark:text-teal-100">
                Tugas Tambahan: {currentUser.tugasTambahan || 'Input Data Sarana & Prasarana Sekolah'}
              </p>
              <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5">
                Akun Anda memiliki akses langsung untuk mengelola dan menginput data gedung serta aset sarana prasarana sekolah.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('sarana-prasarana')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-semibold shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Building2 className="w-4 h-4" />
            Buka Sarana &amp; Prasarana
          </button>
        </section>
      )}

      {/* 2. Profil Sekolah & Informasi Terbaru (Admin dapat mengupdate langsung) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profil Singkat, Identitas, Visi & Misi Sekolah */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Profil & Identitas Sekolah
              </h2>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openProfileEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profil
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 mb-4">
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                {schoolProfile.nama}
              </p>
              <p className="text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                <span>{schoolProfile.alamat}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-mono-num flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                <span>{schoolProfile.telepon} · {schoolProfile.email}</span>
              </p>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {schoolProfile.profilSingkat}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                Visi Sekolah
              </h3>
              <p className="mt-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                “{schoolProfile.visi}”
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                Misi Sekolah
              </h3>
              <ol className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
                {schoolProfile.misi.map((m, i) => (
                  <li key={i} className="leading-relaxed">
                    {m}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Tampilan Informasi & Pengumuman Sekolah (Diupdate oleh Admin) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <Megaphone className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                  Informasi & Pengumuman Sekolah
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAdmin
                    ? 'Tambah atau perbarui informasi resmi sekolah untuk seluruh guru dan warga sekolah.'
                    : 'Informasi terbaru resmi dari Administrator sekolah. Klik judul untuk membaca selengkapnya.'}
                </p>
              </div>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={openAddAnn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Informasi
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {announcements.length === 0 ? (
              <p className="py-6 text-sm text-slate-500 dark:text-slate-400 text-center">
                Belum ada informasi atau pengumuman saat ini.
              </p>
            ) : (
              announcements.map((ann) => (
                <article key={ann.id} className="py-4 first:pt-1 last:pb-1">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAnn(ann)}
                      className="text-left group flex-1 min-w-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-teal-700 dark:text-teal-400">
                          {ann.kategori}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatTanggalId(ann.tanggal)}
                        </span>
                        {ann.penting && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              Prioritas
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="mt-1 text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                        {ann.judul}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {ann.ringkasan}
                      </p>
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditAnn(ann)}
                          className="p-2 rounded-xl text-slate-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          aria-label="Edit informasi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            confirmDelete(
                              'Hapus Informasi?',
                              `Informasi "${ann.judul}" akan dihapus permanen.`,
                              () => deleteAnnouncement(ann.id)
                            )
                          }
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                          aria-label="Hapus informasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 3. Profil Guru & Pendidik + Statistik + Grafik (Hanya Admin; Guru di Beranda hanya melihat Informasi Sekolah) */}
      {isAdmin && (
        <>
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-display font-semibold text-slate-900 dark:text-slate-100">
                  Profil Pendidik (Guru) — {selectedPeriod.label}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Klik foto atau kartu guru untuk melihat identitas lengkap dan sertifikat prestasi guru yang bersangkutan.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guruSearch}
                  onChange={(e) => setGuruSearch(e.target.value)}
                  placeholder="Cari nama guru atau mapel..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/30"
                />
              </div>
            </div>

            {filteredGurus.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Tidak ada profil guru yang cocok dengan pencarian Anda.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredGurus.map((g) => {
                  const certCount = guruCertificates.filter(
                    (c) => (g.userId && c.userId === g.userId) || c.guruId === g.id
                  ).length;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGuru(g)}
                      className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 hover:bg-white dark:hover:bg-slate-800/80 hover:border-teal-600/50 p-4 transition-all group cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar src={g.foto} name={g.nama} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 truncate">
                            {g.statusKepegawaian}
                          </p>
                          <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 leading-snug line-clamp-2 mt-0.5">
                            {g.nama}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {g.jabatan}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-medium text-slate-600 dark:text-slate-300 truncate">
                          {g.mapelDiampu.join(', ') || '-'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-semibold shrink-0">
                          <Eye className="w-3.5 h-3.5" />
                          {certCount > 0 ? `${certCount} Sertifikat` : 'Identitas'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Kartu Statistik Utama */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tenaga Pendidik</p>
                <Users className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              </div>
              <p className="mt-2 text-3xl font-display font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {periodGurus.length}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Guru pada periode {selectedPeriod.label}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Siswa Terdaftar</p>
                <GraduationCap className="w-5 h-5 text-teal-700 dark:text-teal-400" />
              </div>
              <p className="mt-2 text-3xl font-display font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {periodSiswas.length}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                Kls 7: {siswaPerKelas['7']} · Kls 8: {siswaPerKelas['8']} · Kls 9: {siswaPerKelas['9']}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Gedung & Aset Sarpras</p>
                <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-2 text-3xl font-display font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {buildings.length} <span className="text-base font-normal text-slate-500">Gedung</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono-num">
                {assets.length} jenis inventaris sarana tercatat
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Prestasi Tercatat</p>
                <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-2 text-3xl font-display font-bold font-mono-num text-slate-900 dark:text-slate-100">
                {prestasis.length}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Siswa, sekolah, dan guru berprestasi
              </p>
            </div>
          </section>

          {/* 5. Grafik Sederhana: Siswa per Kelas & Rata-rata Nilai per Mata Pelajaran */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
              <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Distribusi Siswa per Kelas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Perbandingan jumlah peserta didik Kelas 7, 8, dan 9
              </p>

              <div className="mt-6 space-y-4">
                {(['7', '8', '9'] as KelasLevel[]).map((k) => {
                  const total = siswaPerKelas[k];
                  const lCount = periodSiswas.filter((s) => s.kelas === k && s.jenisKelamin === 'L').length;
                  const pCount = periodSiswas.filter((s) => s.kelas === k && s.jenisKelamin === 'P').length;
                  const pct = Math.round((total / maxSiswaKelas) * 100);
                  return (
                    <div key={k}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Kelas {k}</span>
                        <span className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                          {total} siswa (L: {lCount} · P: {pCount})
                        </span>
                      </div>
                      <div className="h-3.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-600 dark:bg-teal-500 transition-all duration-300"
                          style={{width: `${pct}%`}}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                    Rata-rata Nilai per Mata Pelajaran
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Rekapitulasi nilai seluruh siswa pada periode {selectedPeriod.label}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {rataMapelChart.map((item) => {
                  const kkm = gradeSettings.kkmPerMapel[item.mapel] ?? 75;
                  const barColor =
                    item.avg === 0
                      ? 'bg-slate-300 dark:bg-slate-700'
                      : item.avg >= kkm
                        ? 'bg-teal-600 dark:bg-teal-500'
                        : 'bg-amber-500';
                  return (
                    <div key={item.mapel}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                          {item.mapel}
                        </span>
                        <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                          {item.avg > 0 ? item.avg.toFixed(1) : '-'}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{width: `${Math.min(100, item.avg)}%`}}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Modal Identitas Guru Lengkap (Muncul saat Foto/Kartu Guru diklik) */}
      <Modal
        open={Boolean(selectedGuru)}
        onClose={() => setSelectedGuru(null)}
        title={`Identitas Pendidik — ${selectedGuru?.nama || ''}`}
        subtitle={
          selectedGuru
            ? `${selectedGuru.jabatan} · ${selectedGuru.statusKepegawaian} · ${selectedPeriod.label}`
            : ''
        }
        maxWidthClass="max-w-3xl"
      >
        {selectedGuru && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start sm:items-center gap-4">
                <Avatar src={selectedGuru.foto} name={selectedGuru.nama} size="xl" />
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                    {selectedGuru.nama}
                  </h3>
                  <p className="text-xs font-mono-num text-slate-600 dark:text-slate-400">
                    NIP: {selectedGuru.nip || '-'} · NUPTK: {selectedGuru.nuptk || '-'}
                  </p>
                  <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold">
                    Mengampu: {selectedGuru.mapelDiampu.join(', ') || '-'} (Kelas{' '}
                    {selectedGuru.kelasDiampu.join(', ') || '-'}) · {selectedGuru.jamMengajar} JP/minggu
                  </p>
                </div>
              </div>

              {!isAdmin && currentGuru?.id === selectedGuru.id && onNavigate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGuru(null);
                    onNavigate('profil-saya');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Profil & Sertifikat
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Tempat, Tanggal Lahir</p>
                <p className="font-medium">
                  {selectedGuru.tempatLahir || '-'},{' '}
                  {selectedGuru.tanggalLahir ? formatTanggalId(selectedGuru.tanggalLahir) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Jenis Kelamin & Agama</p>
                <p className="font-medium">
                  {selectedGuru.jenisKelamin} · {selectedGuru.agama || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pendidikan Terakhir</p>
                <p className="font-medium">{selectedGuru.pendidikanTerakhir || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Golongan / Pangkat & Tahun Mulai</p>
                <p className="font-medium">
                  {selectedGuru.golonganPangkat || '-'} · Sejak {selectedGuru.tahunMulaiBertugas || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Kontak (HP & Email)</p>
                <p className="font-medium font-mono-num flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                  {selectedGuru.noHp || '-'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {selectedGuru.email || '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Alamat</p>
                <p className="font-medium">{selectedGuru.alamat || '-'}</p>
              </div>
            </div>

            {selectedGuru.customFields.length > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Informasi Tambahan Guru
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {selectedGuru.customFields.map((cf) => (
                    <div key={cf.id}>
                      <p className="text-xs text-slate-500">{cf.label}</p>
                      <p className="font-medium">{cf.value || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daftar Sertifikat Prestasi Guru */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  Sertifikat Prestasi ({selectedGuruCerts.length})
                </h4>
              </div>

              {selectedGuruCerts.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Belum ada sertifikat prestasi yang diunggah oleh guru ini.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedGuruCerts.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {cert.judul}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {cert.peringkat} · Tingkat {cert.tingkat} · {cert.penyelenggara || '-'} ({cert.tahun})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewCert(cert)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCert(cert)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Unduh
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Pratinjau Sertifikat */}
      <Modal
        open={Boolean(previewCert)}
        onClose={() => setPreviewCert(null)}
        title={previewCert?.judul || ''}
        subtitle={
          previewCert
            ? `${previewCert.peringkat} · Tingkat ${previewCert.tingkat} · Tahun ${previewCert.tahun}`
            : ''
        }
        maxWidthClass="max-w-3xl"
      >
        {previewCert && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center min-h-[260px]">
              {previewBlobUrl ? (
                previewCert.fileType?.includes('pdf') ? (
                  <iframe
                    src={previewBlobUrl}
                    title={previewCert.judul}
                    className="w-full h-[460px] border-0"
                  />
                ) : (
                  <img
                    src={previewBlobUrl}
                    alt={previewCert.judul}
                    className="max-h-[460px] w-auto object-contain"
                  />
                )
              ) : (
                <p className="text-xs text-slate-500 p-6">Memuat pratinjau sertifikat...</p>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleDownloadCert(previewCert)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Berkas Sertifikat
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Detail Informasi / Pengumuman */}
      <Modal
        open={Boolean(selectedAnn)}
        onClose={() => setSelectedAnn(null)}
        title={selectedAnn?.judul || ''}
        subtitle={
          selectedAnn
            ? `${selectedAnn.kategori} · ${formatTanggalId(selectedAnn.tanggal)} · Oleh ${selectedAnn.penulis}`
            : ''
        }
      >
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
          {selectedAnn?.isi}
        </p>
      </Modal>

      {/* Modal Tambah/Edit Informasi (Admin) */}
      <Modal
        open={annModalOpen}
        onClose={() => setAnnModalOpen(false)}
        title={editingAnn ? 'Edit Informasi Sekolah' : 'Tambah Informasi Baru'}
      >
        <form onSubmit={handleSaveAnn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Judul Informasi *
            </label>
            <input
              type="text"
              required
              value={annForm.judul}
              onChange={(e) => setAnnForm({...annForm, judul: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kategori
              </label>
              <select
                value={annForm.kategori}
                onChange={(e) =>
                  setAnnForm({...annForm, kategori: e.target.value as Announcement['kategori']})
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="Pengumuman">Pengumuman</option>
                <option value="Akademik">Akademik</option>
                <option value="Kegiatan">Kegiatan</option>
                <option value="Kedisiplinan">Kedisiplinan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal
              </label>
              <input
                type="date"
                value={annForm.tanggal}
                onChange={(e) => setAnnForm({...annForm, tanggal: e.target.value})}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ringkasan Singkat *
            </label>
            <textarea
              rows={2}
              required
              value={annForm.ringkasan}
              onChange={(e) => setAnnForm({...annForm, ringkasan: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Isi Lengkap
            </label>
            <textarea
              rows={4}
              value={annForm.isi}
              onChange={(e) => setAnnForm({...annForm, isi: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={annForm.penting}
              onChange={(e) => setAnnForm({...annForm, penting: e.target.checked})}
              className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
            />
            Tandai sebagai informasi prioritas
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAnnModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
            >
              Simpan Informasi
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Profil, Kontak, Visi & Misi Sekolah (Admin) */}
      <Modal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Edit Profil, Visi & Misi Sekolah"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telepon Sekolah
              </label>
              <input
                type="text"
                value={teleponDraft}
                onChange={(e) => setTeleponDraft(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Sekolah
              </label>
              <input
                type="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Alamat Sekolah
            </label>
            <input
              type="text"
              value={alamatDraft}
              onChange={(e) => setAlamatDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Profil Singkat Sekolah
            </label>
            <textarea
              rows={3}
              value={profilSingkatDraft}
              onChange={(e) => setProfilSingkatDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Visi Sekolah *
            </label>
            <textarea
              rows={2}
              required
              value={visiDraft}
              onChange={(e) => setVisiDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Misi Sekolah (pisahkan tiap poin dengan baris baru) *
            </label>
            <textarea
              rows={5}
              required
              value={misiDraftText}
              onChange={(e) => setMisiDraftText(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
