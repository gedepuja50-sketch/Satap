// Modal Pratinjau Berkas Universal (PDF, Gambar, Excel/CSV, Word .docx, Teks, & Info Dokumen)
// Mendukung mode paksa PDF (forcePdfPreview) agar berkas Administrasi Guru selalu tampil dan dapat diunduh sebagai PDF.

import React, {useEffect, useState} from 'react';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import {Download, FileSpreadsheet, FileText} from 'lucide-react';
import {useSchool} from '../../context/SchoolContext';
import {getMediaFile} from '../../services/mediaDb';
import {SchoolProfile} from '../../types/school';
import {formatFileSize, formatTanggalId} from '../../utils/gradeUtils';
import {Modal} from './AvatarAndModal';

export interface PreviewableFileItem {
  id: string;
  judul: string;
  subJudul?: string;
  kategori?: string;
  pemilik?: string;
  tanggal?: string;
  status?: string;
  keterangan?: string;
  fileId?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  previewDataUrl?: string;
  forcePdfPreview?: boolean;
}

type ViewerState =
  | {kind: 'loading'}
  | {kind: 'image'; url: string}
  | {kind: 'pdf'; url: string; generated?: boolean}
  | {kind: 'table'; sheetNames: string[]; sheets: Record<string, string[][]>}
  | {kind: 'text'; title: string; content: string}
  | {kind: 'info'; reason: string};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca gambar'));
    reader.readAsDataURL(blob);
  });
}

export function generateAdminPdfBlob(
  item: PreviewableFileItem,
  school: SchoolProfile,
  extraContent?: string,
  embeddedImageDataUrl?: string
): Blob {
  const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Kop Sekolah
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PEMERINTAH KABUPATEN KARANGASEM', pageWidth / 2, 16, {align: 'center'});
  doc.text('DINAS PENDIDIKAN KEPEMUDAAN DAN OLAHRAGA', pageWidth / 2, 21, {align: 'center'});
  doc.setFontSize(13.5);
  doc.setTextColor(15, 118, 110);
  doc.text(school.nama.toUpperCase(), pageWidth / 2, 27, {align: 'center'});

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`NPSN: ${school.npsn}  |  ${school.alamat}`, pageWidth / 2, 32, {align: 'center'});

  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.9);
  doc.line(16, 36, pageWidth - 16, 36);
  doc.setLineWidth(0.3);
  doc.line(16, 37.4, pageWidth - 16, 37.4);

  // Judul Dokumen
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DOKUMEN ADMINISTRASI GURU', pageWidth / 2, 46, {align: 'center'});

  // Kotak Metadata
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(16, 52, pageWidth - 32, 42, 3, 3, 'FD');

  doc.setFontSize(9);
  const rows: Array<[string, string]> = [
    ['Judul Dokumen', item.judul],
    ['Kategori', item.kategori || '-'],
    ['Guru Pengampu', item.pemilik || '-'],
    ['Periode', item.subJudul || '-'],
    ['Tanggal Upload', item.tanggal ? formatTanggalId(item.tanggal) : '-'],
    ['Status Kelengkapan', item.status || 'Lengkap'],
  ];

  let y = 59;
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`${label}`, 21, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${val}`, 60, y);
    y += 6;
  });

  let contentY = 104;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 118, 110);
  doc.text('Keterangan & Ringkasan Dokumen', 16, contentY);
  contentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const bodyText =
    extraContent ||
    item.keterangan ||
    `Dokumen perangkat ajar "${item.judul}" telah tercatat pada sistem administrasi ${school.nama}.`;
  const wrappedLines = doc.splitTextToSize(bodyText, pageWidth - 32) as string[];
  for (const line of wrappedLines) {
    if (contentY > pageHeight - 25) {
      doc.addPage();
      contentY = 20;
    }
    doc.text(line, 16, contentY);
    contentY += 5.2;
  }

  if (embeddedImageDataUrl) {
    try {
      if (contentY > pageHeight - 95) {
        doc.addPage();
        contentY = 20;
      }
      doc.addImage(embeddedImageDataUrl, 'JPEG', 16, contentY + 4, pageWidth - 32, 90, undefined, 'FAST');
    } catch {
      // Abaikan jika gambar tidak dapat disematkan ke PDF
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Dicetak melalui Sistem Manajemen Sekolah ${school.nama} · ${formatTanggalId(new Date().toISOString())}`,
    pageWidth / 2,
    pageHeight - 12,
    {align: 'center'}
  );

  return doc.output('blob');
}

export const FilePreviewModal: React.FC<{
  item: PreviewableFileItem | null;
  onClose: () => void;
}> = ({item, onClose}) => {
  const {state} = useSchool();
  const [viewer, setViewer] = useState<ViewerState>({kind: 'loading'});
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [resolvedFileName, setResolvedFileName] = useState<string>('');

  useEffect(() => {
    let active = true;
    const createdUrls: string[] = [];

    const registerUrl = (url: string) => {
      createdUrls.push(url);
      return url;
    };

    const load = async () => {
      setDownloadUrl(null);
      setResolvedFileName('');
      if (!item) return;
      setViewer({kind: 'loading'});

      try {
        const defaultPdfName = item.fileName?.toLowerCase().endsWith('.pdf')
          ? item.fileName
          : `${item.judul.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`;

        if (item.fileId) {
          const stored = await getMediaFile(item.fileId);
          if (!stored) {
            if (item.forcePdfPreview) {
              const pdfBlob = generateAdminPdfBlob(item, state.schoolProfile);
              const pdfUrl = registerUrl(URL.createObjectURL(pdfBlob));
              if (active) {
                setDownloadUrl(pdfUrl);
                setResolvedFileName(defaultPdfName);
                setViewer({kind: 'pdf', url: pdfUrl, generated: true});
              }
              return;
            }
            if (active) {
              setViewer({
                kind: 'info',
                reason: 'Berkas fisik tidak ditemukan di penyimpanan lokal browser.',
              });
            }
            return;
          }

          const blob = stored.blob;
          const name = (item.fileName || stored.name || '').toLowerCase();
          const mime = (item.fileType || stored.mimeType || blob.type || '').toLowerCase();

          // Jika PDF asli: langsung tampilkan sebagai PDF
          if (mime.includes('pdf') || name.endsWith('.pdf')) {
            const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], {type: 'application/pdf'});
            const objectUrl = registerUrl(URL.createObjectURL(pdfBlob));
            if (active) {
              setDownloadUrl(objectUrl);
              setResolvedFileName(item.fileName || stored.name || defaultPdfName);
              setViewer({kind: 'pdf', url: objectUrl});
            }
            return;
          }

          // Jika dipaksa tampil sebagai PDF (untuk Administrasi Guru bila ada berkas lama non-PDF)
          if (item.forcePdfPreview) {
            let extraText: string | undefined;
            let imgData: string | undefined;

            if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(name)) {
              imgData = await blobToDataUrl(blob).catch(() => undefined);
            } else if (mime.startsWith('text/') || /\.(txt|md|json)$/.test(name)) {
              extraText = await blob.text().catch(() => undefined);
            } else if (name.endsWith('.docx')) {
              const buf = await blob.arrayBuffer();
              const zip = await JSZip.loadAsync(buf);
              const docXml = await zip.file('word/document.xml')?.async('text');
              if (docXml) {
                const xml = new DOMParser().parseFromString(docXml, 'application/xml');
                extraText = Array.from(xml.getElementsByTagName('w:p'))
                  .map((p) =>
                    Array.from(p.getElementsByTagName('w:t'))
                      .map((t) => t.textContent || '')
                      .join('')
                  )
                  .filter(Boolean)
                  .join('\n\n');
              }
            }

            const pdfBlob = generateAdminPdfBlob(item, state.schoolProfile, extraText, imgData);
            const pdfUrl = registerUrl(URL.createObjectURL(pdfBlob));
            if (active) {
              setDownloadUrl(pdfUrl);
              setResolvedFileName(defaultPdfName);
              setViewer({kind: 'pdf', url: pdfUrl, generated: true});
            }
            return;
          }

          const objectUrl = registerUrl(URL.createObjectURL(blob));
          if (active) {
            setDownloadUrl(objectUrl);
            setResolvedFileName(item.fileName || stored.name);
          }

          if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) {
            if (active) setViewer({kind: 'image', url: objectUrl});
            return;
          }

          if (
            name.endsWith('.xlsx') ||
            name.endsWith('.xls') ||
            name.endsWith('.csv') ||
            mime.includes('spreadsheet') ||
            mime.includes('excel') ||
            mime.includes('csv')
          ) {
            const buf = await blob.arrayBuffer();
            const wb = XLSX.read(buf, {type: 'array'});
            const sheets: Record<string, string[][]> = {};
            wb.SheetNames.forEach((sName) => {
              const ws = wb.Sheets[sName];
              const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {header: 1, defval: ''});
              sheets[sName] = rows.slice(0, 120).map((r) => r.map((c) => String(c ?? '')));
            });
            if (active) {
              setActiveSheet(wb.SheetNames[0] || '');
              setViewer({kind: 'table', sheetNames: wb.SheetNames, sheets});
            }
            return;
          }

          if (name.endsWith('.docx')) {
            const buf = await blob.arrayBuffer();
            const zip = await JSZip.loadAsync(buf);
            const docXml = await zip.file('word/document.xml')?.async('text');
            if (docXml) {
              const parser = new DOMParser();
              const xml = parser.parseFromString(docXml, 'application/xml');
              const paragraphs = Array.from(xml.getElementsByTagName('w:p'))
                .map((p) =>
                  Array.from(p.getElementsByTagName('w:t'))
                    .map((t) => t.textContent || '')
                    .join('')
                )
                .filter((line) => line.trim().length > 0);
              if (active) {
                setViewer({
                  kind: 'text',
                  title: 'Pratinjau Isi Dokumen Word (.docx)',
                  content:
                    paragraphs.length > 0
                      ? paragraphs.join('\n\n')
                      : '(Dokumen tidak memiliki teks paragraf terbaca.)',
                });
              }
              return;
            }
          }

          if (mime.startsWith('text/') || /\.(txt|md|json)$/.test(name)) {
            const text = await blob.text();
            if (active) setViewer({kind: 'text', title: 'Pratinjau Isi Berkas Teks', content: text});
            return;
          }

          if (active) {
            setViewer({
              kind: 'info',
              reason: `Format berkas (${item.fileName || mime}) tersimpan aman dan siap diunduh.`,
            });
          }
          return;
        }

        if (item.forcePdfPreview) {
          const pdfBlob = generateAdminPdfBlob(item, state.schoolProfile);
          const pdfUrl = registerUrl(URL.createObjectURL(pdfBlob));
          if (active) {
            setDownloadUrl(pdfUrl);
            setResolvedFileName(defaultPdfName);
            setViewer({kind: 'pdf', url: pdfUrl, generated: true});
          }
          return;
        }

        if (item.previewDataUrl) {
          if (active) {
            setDownloadUrl(item.previewDataUrl);
            setResolvedFileName(item.fileName || item.judul);
            setViewer({kind: 'image', url: item.previewDataUrl});
          }
          return;
        }

        if (active) {
          setViewer({
            kind: 'info',
            reason: 'Entri contoh bawaan (tanpa lampiran berkas fisik). Unggah berkas PDF untuk melihat pratinjau langsung.',
          });
        }
      } catch {
        if (active) {
          setViewer({
            kind: 'info',
            reason: 'Pratinjau langsung tidak tersedia untuk berkas ini, silakan gunakan tombol Unduh.',
          });
        }
      }
    };

    load();
    return () => {
      active = false;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [item, state.schoolProfile]);

  const handleDownload = () => {
    if (!downloadUrl || !item) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = resolvedFileName || item.fileName || `${item.judul}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={item?.judul || 'Lihat Dokumen PDF'}
      subtitle={
        item
          ? [item.subJudul, item.kategori, item.pemilik].filter(Boolean).join(' · ')
          : ''
      }
      maxWidthClass="max-w-4xl"
    >
      {item && (
        <div className="space-y-4">
          {/* Ringkasan Metadata Dokumen */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5 text-slate-600 dark:text-slate-300">
              <p>
                Berkas:{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {resolvedFileName || item.fileName || `${item.judul}.pdf`}
                </strong>
                {item.fileSize ? ` (${formatFileSize(item.fileSize)})` : ''}
              </p>
              <p>
                {item.tanggal ? `Tanggal: ${formatTanggalId(item.tanggal)}` : ''}
                {item.status ? ` · Status: ${item.status}` : ''}
              </p>
            </div>
            {downloadUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {viewer.kind === 'pdf' ? 'Unduh PDF' : 'Unduh Berkas'}
              </button>
            )}
          </div>

          {item.keterangan && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
              <strong className="text-slate-800 dark:text-slate-100">Keterangan:</strong> {item.keterangan}
            </p>
          )}

          {/* Area Tampilan Hasil Upload */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden min-h-[260px]">
            {viewer.kind === 'loading' && (
              <div className="p-10 text-center text-xs text-slate-500">Memuat pratinjau dokumen PDF...</div>
            )}

            {viewer.kind === 'image' && (
              <div className="p-3 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                <img
                  src={viewer.url}
                  alt={item.judul}
                  className="max-h-[520px] w-auto object-contain rounded-lg"
                />
              </div>
            )}

            {viewer.kind === 'pdf' && (
              <div className="bg-white">
                <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-400">
                    <FileText className="w-3.5 h-3.5" />
                    Pratinjau Dokumen PDF
                  </span>
                  <span>
                    {viewer.generated
                      ? 'Dokumen PDF Resmi Sekolah'
                      : 'Berkas PDF Asli Unggahan Guru'}
                  </span>
                </div>
                <iframe
                  src={viewer.url}
                  title={item.judul}
                  className="w-full h-[540px] border-0 bg-white"
                />
              </div>
            )}

            {viewer.kind === 'table' && (
              <div className="bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <FileSpreadsheet className="w-4 h-4" />
                    Pratinjau Tabel Spreadsheet
                  </span>
                  {viewer.sheetNames.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {viewer.sheetNames.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setActiveSheet(s)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            activeSheet === s
                              ? 'bg-teal-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="overflow-auto max-h-[420px] border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <tbody>
                      {(viewer.sheets[activeSheet] || []).map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={
                            rIdx === 0
                              ? 'bg-slate-100 dark:bg-slate-800 font-semibold'
                              : 'border-t border-slate-100 dark:border-slate-800'
                          }
                        >
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewer.kind === 'text' && (
              <div className="bg-white dark:bg-slate-900 p-5 space-y-2">
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">{viewer.title}</p>
                <pre className="text-xs sm:text-sm whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-200 max-h-[440px] overflow-y-auto leading-relaxed">
                  {viewer.content}
                </pre>
              </div>
            )}

            {viewer.kind === 'info' && (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <FileText className="w-10 h-10 text-teal-700 dark:text-teal-400" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.judul}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">{viewer.reason}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
