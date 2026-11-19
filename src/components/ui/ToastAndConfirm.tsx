// Komponen UI reusable untuk Toast Notifikasi dan Dialog Konfirmasi Hapus

import React from 'react';
import {AlertTriangle, CheckCircle2, Info, X, XCircle} from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({toasts, onDismiss}) => {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const styleMap = {
          success: 'border-emerald-200 dark:border-emerald-800/70 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
          error: 'border-red-200 dark:border-red-800/70 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
          warning: 'border-amber-200 dark:border-amber-800/70 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
          info: 'border-teal-200 dark:border-teal-800/70 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
        };
        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
              ? XCircle
              : t.type === 'warning'
                ? AlertTriangle
                : Info;
        const iconColor =
          t.type === 'success'
            ? 'text-emerald-600 dark:text-emerald-400'
            : t.type === 'error'
              ? 'text-red-600 dark:text-red-400'
              : t.type === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-teal-600 dark:text-teal-400';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-lg transition-all duration-200 ${styleMap[t.type]}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <p className="text-sm font-medium flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-lg"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export const ConfirmDialogModal: React.FC<{
  dialog: ConfirmDialogState;
  onClose: () => void;
}> = ({dialog, onClose}) => {
  if (!dialog.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{dialog.title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{dialog.description}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            {dialog.confirmLabel || 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
};
