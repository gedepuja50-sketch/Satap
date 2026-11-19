// Komponen UI pembantu: Avatar dengan fallback inisial, Modal responsif, dan EmptyState

import React, {useEffect} from 'react';
import {X} from 'lucide-react';

export const Avatar: React.FC<{
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({src, name, size = 'md', className = ''}) => {
  const initials = name
    .split(/\s+/)
    .filter((w) => w.length > 0 && !w.endsWith('.'))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'SB';

  const sizeClass = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  }[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-2xl object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} rounded-2xl bg-teal-700/10 dark:bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-700/15 dark:border-teal-400/20 font-display font-semibold flex items-center justify-center shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
};

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}> = ({open, onClose, title, subtitle, maxWidthClass = 'max-w-2xl', children}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${maxWidthClass} rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl my-auto max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-display font-semibold text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({icon, title, description, action}) => (
  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 p-10 text-center flex flex-col items-center justify-center">
    <div className="w-12 h-12 rounded-2xl bg-teal-700/10 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center mb-3">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
