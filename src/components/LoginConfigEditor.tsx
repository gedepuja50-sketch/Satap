// Editor Pengaturan Interface Login & Catatan Halaman Login (Akses Admin)

import React, {useEffect, useState} from 'react';
import {Edit3, Plus, Save, StickyNote, Trash2} from 'lucide-react';
import {useSchool} from '../context/SchoolContext';
import {LoginConfig, LoginNote, UserAccount} from '../types/school';
import {formatTanggalId} from '../utils/gradeUtils';

export const LoginConfigEditor: React.FC<{
  adminActor?: UserAccount;
  onSaved?: () => void;
}> = ({adminActor, onSaved}) => {
  const {state, updateLoginConfig, showToast} = useSchool();
  const [draft, setDraft] = useState<LoginConfig>(state.loginConfig);

  // State tambah/edit catatan login
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteJudul, setNoteJudul] = useState('');
  const [noteKategori, setNoteKategori] = useState<LoginNote['kategori']>('Info');
  const [noteTanggal, setNoteTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [noteIsi, setNoteIsi] = useState('');

  useEffect(() => {
    setDraft(state.loginConfig);
  }, [state.loginConfig]);

  const resetNoteForm = () => {
    setEditingNoteId(null);
    setNoteJudul('');
    setNoteKategori('Info');
    setNoteTanggal(new Date().toISOString().slice(0, 10));
    setNoteIsi('');
  };

  const handleSaveNote = () => {
    if (!noteJudul.trim() || !noteIsi.trim()) {
      showToast('Judul dan isi catatan halaman login wajib diisi.', 'error');
      return;
    }
    const newNote: LoginNote = {
      id: editingNoteId || `lnote_${Date.now()}`,
      judul: noteJudul.trim(),
      kategori: noteKategori,
      tanggal: noteTanggal || new Date().toISOString().slice(0, 10),
      isi: noteIsi.trim(),
    };
    const nextNotes = editingNoteId
      ? draft.notes.map((n) => (n.id === editingNoteId ? newNote : n))
      : [newNote, ...draft.notes];

    const updatedConfig = {...draft, notes: nextNotes};
    setDraft(updatedConfig);
    updateLoginConfig(updatedConfig, adminActor);
    resetNoteForm();
  };

  const handleEditNote = (note: LoginNote) => {
    setEditingNoteId(note.id);
    setNoteJudul(note.judul);
    setNoteKategori(note.kategori);
    setNoteTanggal(note.tanggal);
    setNoteIsi(note.isi);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedConfig = {
      ...draft,
      notes: draft.notes.filter((n) => n.id !== noteId),
    };
    setDraft(updatedConfig);
    updateLoginConfig(updatedConfig, adminActor);
  };

  const handleSubmitMain = (e: React.FormEvent) => {
    e.preventDefault();
    updateLoginConfig(draft, adminActor);
    onSaved?.();
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmitMain}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5"
      >
        <div>
          <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
            Edit Isian Teks &amp; Menu Interface Login
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ubah teks banner sekolah, bagian daftar guru, serta judul dan keterangan formulir masuk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Tagline Banner Login</label>
            <input
              type="text"
              value={draft.bannerTagline}
              onChange={(e) => setDraft({...draft, bannerTagline: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Judul Utama Banner Login</label>
            <input
              type="text"
              value={draft.bannerHeadline}
              onChange={(e) => setDraft({...draft, bannerHeadline: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Subjudul / Alamat Banner</label>
            <input
              type="text"
              value={draft.bannerSubtext}
              onChange={(e) => setDraft({...draft, bannerSubtext: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Judul Menu Daftar Guru</label>
            <input
              type="text"
              value={draft.guruSectionTitle}
              onChange={(e) => setDraft({...draft, guruSectionTitle: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Keterangan Menu Daftar Guru</label>
            <input
              type="text"
              value={draft.guruSectionSubtitle}
              onChange={(e) => setDraft({...draft, guruSectionSubtitle: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Judul Formulir Masuk</label>
            <input
              type="text"
              value={draft.formTitle}
              onChange={(e) => setDraft({...draft, formTitle: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Subjudul Formulir Masuk</label>
            <input
              type="text"
              value={draft.formSubtitle}
              onChange={(e) => setDraft({...draft, formSubtitle: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold mb-1">Catatan Kaki Formulir Login</label>
            <textarea
              rows={2}
              value={draft.footerNote}
              onChange={(e) => setDraft({...draft, footerNote: e.target.value})}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.showDemoCredentials}
            onChange={(e) => setDraft({...draft, showDemoCredentials: e.target.checked})}
            className="rounded border-slate-300 text-teal-700"
          />
          Tampilkan petunjuk akun demo di bagian bawah formulir masuk
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Teks Interface Login
          </button>
        </div>
      </form>

      {/* Manajemen Catatan pada Interface Login */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100">
              Catatan pada Interface Login ({draft.notes.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tambahkan pengumuman, jadwal penting, atau catatan yang tampil langsung di halaman Login.
            </p>
          </div>
        </div>

        {/* Form Tambah / Edit Catatan */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-xs font-semibold mb-1">
                {editingNoteId ? 'Edit Judul Catatan *' : 'Judul Catatan Baru *'}
              </label>
              <input
                type="text"
                value={noteJudul}
                onChange={(e) => setNoteJudul(e.target.value)}
                placeholder="Contoh: Batas Pengumpulan Raport Semester Ganjil"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold mb-1">Kategori</label>
              <select
                value={noteKategori}
                onChange={(e) => setNoteKategori(e.target.value as LoginNote['kategori'])}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="Info">Info</option>
                <option value="Penting">Penting</option>
                <option value="Jadwal">Jadwal</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold mb-1">Tanggal</label>
              <input
                type="date"
                value={noteTanggal}
                onChange={(e) => setNoteTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Isi Catatan *</label>
            <textarea
              rows={2}
              value={noteIsi}
              onChange={(e) => setNoteIsi(e.target.value)}
              placeholder="Tulis informasi atau catatan yang ingin ditampilkan kepada guru dan pengguna pada halaman login..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {editingNoteId && (
              <button
                type="button"
                onClick={resetNoteForm}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                Batal Edit
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveNote}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {editingNoteId ? 'Perbarui Catatan' : 'Tambahkan Catatan Login'}
            </button>
          </div>
        </div>

        {/* Daftar Catatan Tersimpan */}
        {draft.notes.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            Belum ada catatan tambahan di halaman login.
          </p>
        ) : (
          <div className="space-y-2.5">
            {draft.notes.map((n) => (
              <div
                key={n.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className={`font-semibold ${
                        n.kategori === 'Penting'
                          ? 'text-red-600 dark:text-red-400'
                          : n.kategori === 'Jadwal'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-teal-700 dark:text-teal-400'
                      }`}
                    >
                      {n.kategori}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num text-slate-500">{formatTanggalId(n.tanggal)}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {n.judul}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {n.isi}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditNote(n)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                    title="Edit catatan"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(n.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    title="Hapus catatan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
