// Layanan IndexedDB untuk menyimpan file dokumen, foto, dan video ukuran besar secara lokal

const DB_NAME = 'smpn_besakih_media_v1';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

export interface StoredMediaFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  createdAt: string;
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia di browser ini.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {keyPath: 'id'});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Gagal membuka IndexedDB.'));
  });
}

export async function saveMediaFile(file: File | Blob, customName?: string, customId?: string): Promise<StoredMediaFile> {
  const db = await openMediaDb();
  const id = customId || `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const name = customName || (file instanceof File ? file.name : 'lampiran');
  const record: StoredMediaFile = {
    id,
    name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    blob: file,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error || new Error('Gagal menyimpan file ke IndexedDB.'));
  });
}

export async function getMediaFile(id: string): Promise<StoredMediaFile | null> {
  if (!id) return null;
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as StoredMediaFile) || null);
    req.onerror = () => reject(req.error || new Error('Gagal membaca file dari IndexedDB.'));
  });
}

export async function deleteMediaFile(id: string): Promise<void> {
  if (!id) return;
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Gagal menghapus file dari IndexedDB.'));
  });
}

export async function getAllMediaFiles(): Promise<StoredMediaFile[]> {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as StoredMediaFile[]) || []);
    req.onerror = () => reject(req.error || new Error('Gagal membaca daftar file media.'));
  });
}

export async function clearAllMediaFiles(): Promise<void> {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Gagal membersihkan IndexedDB.'));
  });
}

// Konversi File/Blob ke DataURL kecil (mis. foto profil atau logo)
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(file);
  });
}

// Kompres gambar sebelum disimpan ke localStorage agar kuota tetap aman
export function compressImageToDataUrl(file: File, maxDimension = 640, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(e.target?.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, quality));
      };
      img.onerror = () => reject(new Error('Berkas gambar tidak valid.'));
      img.src = String(e.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.readAsDataURL(file);
  });
}
