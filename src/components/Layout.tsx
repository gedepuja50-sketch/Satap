// Kerangka navigasi utama (Sidebar + Header responsif dengan pemilih Periode Pendidikan & RBAC ketat)

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Award,
  Bell,
  Building2,
  CalendarRange,
  CheckCheck,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  Home,
  ImagePlus,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Settings,
  Shield,
  Sun,
  UserCheck,
  UserCircle2,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {MenuKey, UserRole} from '../types/school';
import {formatTanggalId} from '../utils/gradeUtils';
import {Modal} from './ui/AvatarAndModal';

interface HeaderNotification {
  notifKey: string;
  sourceType: 'PENGUMUMAN' | 'CATATAN';
  judul: string;
  ringkasan: string;
  isi: string;
  kategori: string;
  tanggal: string;
  penulis: string;
  penting?: boolean;
}

interface NavItem {
  key: MenuKey;
  label: string;
  icon: React.ComponentType<{className?: string}>;
  roles: UserRole[];
  requiresSarprasAccess?: boolean;
}

// Hak akses menu: Admin akses semua; Guru akses Beranda, Profil Saya, Nilai Siswa, Administrasi Guru (+ Sarpras jika ditugaskan);
// Staf akses Beranda, Data Staf, dan Sarana & Prasarana jika mendapat tugas input data Sarpras.
const NAV_ITEMS: NavItem[] = [
  {key: 'beranda', label: 'Beranda', icon: Home, roles: ['ADMIN', 'GURU', 'STAF']},
  {key: 'profil-saya', label: 'Profil Saya', icon: UserCircle2, roles: ['GURU']},
  {key: 'guru', label: 'Guru', icon: Users, roles: ['ADMIN']},
  {key: 'kepala-sekolah', label: 'Kepala Sekolah', icon: UserCheck, roles: ['ADMIN']},
  {key: 'staf', label: 'Staf', icon: UserCog, roles: ['ADMIN', 'STAF']},
  {key: 'siswa', label: 'Siswa', icon: GraduationCap, roles: ['ADMIN', 'GURU']},
  {key: 'nilai-siswa', label: 'Nilai Siswa', icon: ClipboardList, roles: ['ADMIN', 'GURU']},
  {key: 'administrasi-guru', label: 'Administrasi Guru', icon: FolderKanban, roles: ['ADMIN', 'GURU']},
  {
    key: 'sarana-prasarana',
    label: 'Sarana & Prasarana',
    icon: Building2,
    roles: ['ADMIN', 'STAF', 'GURU'],
    requiresSarprasAccess: true,
  },
  {key: 'keuangan', label: 'Keuangan Sekolah', icon: Wallet, roles: ['ADMIN', 'GURU', 'STAF']},
  {key: 'prestasi', label: 'Prestasi', icon: Award, roles: ['ADMIN']},
  {key: 'panel-admin', label: 'Panel Admin', icon: Shield, roles: ['ADMIN']},
  {key: 'pengaturan', label: 'Pengaturan', icon: Settings, roles: ['ADMIN']},
];

export const Layout: React.FC<{
  activeMenu: MenuKey;
  onSelectMenu: (menu: MenuKey) => void;
  children: React.ReactNode;
}> = ({activeMenu, onSelectMenu, children}) => {
  const {
    state,
    currentUser,
    selectedPeriodId,
    setSelectedPeriodId,
    selectedPeriod,
    setActivePeriod,
    logout,
    theme,
    toggleTheme,
    updateLogoFromFile,
    markNotificationRead,
    markAllNotificationsRead,
  } = useSchool();
  const {schoolProfile, periods, announcements, loginConfig, readNotificationsByUser} = state;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<HeaderNotification | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const notifContainerRef = useRef<HTMLDivElement | null>(null);

  const notifications = useMemo<HeaderNotification[]>(() => {
    const annList: HeaderNotification[] = announcements.map((a) => ({
      notifKey: `ann:${a.id}:${a.tanggal}:${a.judul}`,
      sourceType: 'PENGUMUMAN',
      judul: a.judul,
      ringkasan: a.ringkasan,
      isi: a.isi,
      kategori: a.kategori,
      tanggal: a.tanggal,
      penulis: a.penulis,
      penting: a.penting,
    }));
    const noteList: HeaderNotification[] = (loginConfig.notes || []).map((n) => ({
      notifKey: `note:${n.id}:${n.tanggal}:${n.judul}`,
      sourceType: 'CATATAN',
      judul: n.judul,
      ringkasan: n.isi,
      isi: n.isi,
      kategori: `Catatan Admin · ${n.kategori}`,
      tanggal: n.tanggal,
      penulis: 'Administrator Sekolah',
      penting: n.kategori === 'Penting',
    }));
    return [...annList, ...noteList].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  }, [announcements, loginConfig.notes]);

  const readSet = useMemo(() => {
    const list = (currentUser && readNotificationsByUser?.[currentUser.id]) || [];
    return new Set(list);
  }, [currentUser, readNotificationsByUser]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readSet.has(n.notifKey)).length,
    [notifications, readSet]
  );

  useEffect(() => {
    if (!notifOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [notifOpen]);

  const isAdmin = currentUser?.role === 'ADMIN';
  const visibleMenus = NAV_ITEMS.filter((item) => {
    if (!currentUser) return false;
    if (item.requiresSarprasAccess) {
      return isAdmin || Boolean(currentUser.aksesSarpras);
    }
    return item.roles.includes(currentUser.role);
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await updateLogoFromFile(file);
    }
    e.target.value = '';
  };

  const handleSelect = (key: MenuKey) => {
    onSelectMenu(key);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Identitas Sekolah di Sidebar */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={schoolProfile.logoDataUrl}
            alt={`Logo ${schoolProfile.nama}`}
            className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 dark:border-slate-700 p-0.5 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-display font-bold text-slate-900 dark:text-slate-100 truncate">
              {schoolProfile.nama}
            </p>
            <p className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400 truncate">
              NPSN {schoolProfile.npsn}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Tutup menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Daftar Menu Navigasi */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Menu Utama">
        {visibleMenus.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSelect(item.key)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="truncate">
                {currentUser?.role === 'STAF' && item.key === 'staf' ? 'Profil Staf Saya' : item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Ringkasan Pengguna & Keluar */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
        <div className="mb-3 px-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            {currentUser?.namaLengkap}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'Administrator Sekolah'
              : currentUser?.role === 'STAF'
                ? [
                    'Akun Staf',
                    currentUser.aksesKeuangan ? 'Keuangan' : '',
                    currentUser.aksesSarpras ? 'Sarpras' : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : currentUser?.aksesSarpras
                  ? 'Akun Guru · Input Sarpras'
                  : 'Akun Guru'}{' '}
            · @{currentUser?.username}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar dari Sistem
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Input file tersembunyi untuk tombol Ganti Logo di header */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
        className="hidden"
      />

      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">{sidebarContent}</aside>

      {/* Drawer Sidebar Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</aside>
        </div>
      )}

      {/* Area Konten Utama */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header Atas */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Buka menu navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-display font-bold text-slate-900 dark:text-slate-100 truncate">
                  {schoolProfile.nama}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  NPSN <span className="font-mono-num">{schoolProfile.npsn}</span> · {schoolProfile.alamat}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Pemilih Periode Pendidikan Global */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <CalendarRange className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 hidden sm:block" />
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  aria-label="Pilih periode pendidikan"
                  className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer max-w-[170px] sm:max-w-[230px]"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900">
                      {p.label} {p.aktif ? '(Aktif)' : '(Arsip)'}
                    </option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectMenu('panel-admin')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-teal-600/30 bg-teal-50 dark:bg-teal-950/40 text-xs font-semibold text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Ganti periode semester / tahun pelajaran di Panel Admin"
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    <span>Ganti Periode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-teal-600/50 hover:text-teal-700 dark:hover:text-teal-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Unggah gambar baru untuk mengganti logo sekolah"
                  >
                    <ImagePlus className="w-4 h-4 text-amber-500" />
                    <span className="hidden md:inline">Ganti Logo</span>
                  </button>
                </>
              )}

              {/* Lonceng Notifikasi Pengumuman & Catatan Admin */}
              <div ref={notifContainerRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className="relative inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                  aria-label="Notifikasi pengumuman dan catatan admin"
                  title="Notifikasi Pengumuman & Catatan Admin"
                >
                  <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-500' : ''}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono-num flex items-center justify-center shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-950/60">
                      <div>
                        <p className="text-xs font-display font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                          Pengumuman &amp; Catatan Admin
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {unreadCount > 0
                            ? `${unreadCount} informasi belum dibaca`
                            : 'Semua informasi telah dibaca'}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            markAllNotificationsRead(notifications.map((n) => n.notifKey))
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Tandai Dibaca
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Belum ada pengumuman atau catatan dari Admin.
                        </div>
                      ) : (
                        notifications.map((item) => {
                          const isUnread = !readSet.has(item.notifKey);
                          return (
                            <button
                              key={item.notifKey}
                              type="button"
                              onClick={() => {
                                markNotificationRead(item.notifKey);
                                setSelectedNotif(item);
                                setNotifOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                                isUnread ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400">
                                  {item.kategori}
                                  {item.penting && (
                                    <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                                      · Prioritas
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] font-mono-num text-slate-400 shrink-0">
                                  {formatTanggalId(item.tanggal)}
                                </span>
                              </div>
                              <div className="flex items-start gap-2 mt-1">
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                                    {item.judul}
                                  </p>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                                    {item.ringkasan}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
                title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
            </div>
          </div>

          {!selectedPeriod.aktif && (
            <div className="mt-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex flex-wrap items-center justify-between gap-2">
              <span>
                Anda sedang melihat data periode: <strong>{selectedPeriod.label}</strong>
              </span>
              <div className="flex items-center gap-3 shrink-0">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActivePeriod(selectedPeriod.id)}
                    className="px-2.5 py-0.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer"
                  >
                    Jadikan Periode Aktif
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPeriodId(state.activePeriodId)}
                  className="font-semibold underline hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer"
                >
                  Kembali ke Periode Aktif
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Isi Halaman Aktif */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>

      {/* Modal Detail Pengumuman / Catatan Admin saat item notifikasi ditekan */}
      <Modal
        open={Boolean(selectedNotif)}
        onClose={() => setSelectedNotif(null)}
        title={selectedNotif?.judul || ''}
        subtitle={
          selectedNotif
            ? `${selectedNotif.kategori} · ${formatTanggalId(selectedNotif.tanggal)} · Oleh ${selectedNotif.penulis}`
            : ''
        }
        maxWidthClass="max-w-lg"
      >
        {selectedNotif && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {selectedNotif.isi || selectedNotif.ringkasan}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedNotif(null);
                  onSelectMenu('beranda');
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Buka di Beranda
              </button>
              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
