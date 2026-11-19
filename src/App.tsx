/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Titik masuk utama aplikasi Sistem Manajemen Sekolah SMPN Satu Atap Besakih

import React, {useEffect, useRef, useState} from 'react';
import {SchoolProvider, useSchool} from './context/SchoolContext';
import {LoginPage} from './components/LoginPage';
import {Layout} from './components/Layout';
import {MenuKey, UserAccount} from './types/school';
import {BerandaPage} from './pages/BerandaPage';
import {ProfilSayaPage} from './pages/ProfilSayaPage';
import {GuruPage} from './pages/GuruPage';
import {KepalaSekolahPage} from './pages/KepalaSekolahPage';
import {StafPage} from './pages/StafPage';
import {SiswaPage} from './pages/SiswaPage';
import {NilaiSiswaPage} from './pages/NilaiSiswaPage';
import {AdministrasiGuruPage} from './pages/AdministrasiGuruPage';
import {SaranaPrasaranaPage} from './pages/SaranaPrasaranaPage';
import {PrestasiPage} from './pages/PrestasiPage';
import {PanelAdminPage} from './pages/PanelAdminPage';
import {PengaturanPage} from './pages/PengaturanPage';

function getAllowedMenus(user: UserAccount): MenuKey[] {
  if (user.role === 'ADMIN') {
    return [
      'beranda',
      'profil-saya',
      'guru',
      'kepala-sekolah',
      'staf',
      'siswa',
      'nilai-siswa',
      'administrasi-guru',
      'sarana-prasarana',
      'prestasi',
      'panel-admin',
      'pengaturan',
    ];
  }
  if (user.role === 'GURU') {
    const menus: MenuKey[] = ['beranda', 'profil-saya', 'nilai-siswa', 'administrasi-guru'];
    if (user.aksesSarpras) menus.push('sarana-prasarana');
    return menus;
  }
  // Peran STAF
  const stafMenus: MenuKey[] = ['beranda', 'staf'];
  if (user.aksesSarpras) stafMenus.push('sarana-prasarana');
  return stafMenus;
}

const AppRouter: React.FC = () => {
  const {currentUser} = useSchool();
  const [activeMenu, setActiveMenu] = useState<MenuKey>('beranda');
  const lastUserIdRef = useRef<string | null>(null);

  // Saat pengguna baru masuk: jika mendapat tugas input Sarana & Prasarana, langsung arahkan ke menu Sarana & Prasarana
  useEffect(() => {
    if (!currentUser) {
      lastUserIdRef.current = null;
      return;
    }
    const allowed = getAllowedMenus(currentUser);
    if (lastUserIdRef.current !== currentUser.id) {
      lastUserIdRef.current = currentUser.id;
      if (currentUser.role !== 'ADMIN' && currentUser.aksesSarpras) {
        setActiveMenu('sarana-prasarana');
        return;
      }
      setActiveMenu('beranda');
      return;
    }
    if (!allowed.includes(activeMenu)) {
      setActiveMenu(currentUser.role !== 'ADMIN' && currentUser.aksesSarpras ? 'sarana-prasarana' : 'beranda');
    }
  }, [currentUser, activeMenu]);

  if (!currentUser) {
    return <LoginPage />;
  }

  const allowedMenus = getAllowedMenus(currentUser);
  const resolvedMenu: MenuKey = allowedMenus.includes(activeMenu)
    ? activeMenu
    : currentUser.role !== 'ADMIN' && currentUser.aksesSarpras
      ? 'sarana-prasarana'
      : 'beranda';

  const renderPage = () => {
    switch (resolvedMenu) {
      case 'beranda':
        return <BerandaPage onNavigate={setActiveMenu} />;
      case 'profil-saya':
        return <ProfilSayaPage />;
      case 'guru':
        return <GuruPage />;
      case 'kepala-sekolah':
        return <KepalaSekolahPage />;
      case 'staf':
        return <StafPage />;
      case 'siswa':
        return <SiswaPage />;
      case 'nilai-siswa':
        return <NilaiSiswaPage />;
      case 'administrasi-guru':
        return <AdministrasiGuruPage />;
      case 'sarana-prasarana':
        return <SaranaPrasaranaPage />;
      case 'prestasi':
        return <PrestasiPage />;
      case 'panel-admin':
        return <PanelAdminPage />;
      case 'pengaturan':
        return <PengaturanPage />;
      default:
        return <BerandaPage onNavigate={setActiveMenu} />;
    }
  };

  return (
    <Layout activeMenu={resolvedMenu} onSelectMenu={setActiveMenu}>
      {renderPage()}
    </Layout>
  );
};

export default function App() {
  return (
    <SchoolProvider>
      <AppRouter />
    </SchoolProvider>
  );
}
