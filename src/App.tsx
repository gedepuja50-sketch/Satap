/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Titik masuk utama aplikasi Sistem Manajemen Sekolah SMPN Satu Atap Besakih

import React, {useEffect, useState} from 'react';
import {SchoolProvider, useSchool} from './context/SchoolContext';
import {LoginPage} from './components/LoginPage';
import {Layout} from './components/Layout';
import {MenuKey} from './types/school';
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

const GURU_ALLOWED_MENUS: MenuKey[] = ['beranda', 'profil-saya', 'nilai-siswa', 'administrasi-guru'];

const AppRouter: React.FC = () => {
  const {currentUser} = useSchool();
  const [activeMenu, setActiveMenu] = useState<MenuKey>('beranda');

  // Pastikan peran GURU selalu berada pada menu yang diizinkan (Beranda, Profil Saya, Nilai Siswa, Administrasi Guru)
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'GURU' && !GURU_ALLOWED_MENUS.includes(activeMenu)) {
      setActiveMenu('beranda');
    } else if (currentUser.role === 'ADMIN' && !activeMenu) {
      setActiveMenu('beranda');
    }
  }, [currentUser, activeMenu]);

  if (!currentUser) {
    return <LoginPage />;
  }

  const resolvedMenu: MenuKey =
    currentUser.role === 'GURU' && !GURU_ALLOWED_MENUS.includes(activeMenu)
      ? 'beranda'
      : activeMenu;

  const renderPage = () => {
    if (currentUser.role === 'GURU') {
      switch (resolvedMenu) {
        case 'profil-saya':
          return <ProfilSayaPage />;
        case 'nilai-siswa':
          return <NilaiSiswaPage />;
        case 'administrasi-guru':
          return <AdministrasiGuruPage />;
        case 'beranda':
        default:
          return <BerandaPage onNavigate={setActiveMenu} />;
      }
    }

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
