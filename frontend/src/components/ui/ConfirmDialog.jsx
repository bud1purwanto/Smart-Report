import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmDialog = ({ open, title, description, confirmLabel, onConfirm, onCancel, tone = 'danger' }) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    confirmRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;
  const confirmClass = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500'
    : 'bg-sky-600 hover:bg-sky-500 focus:ring-sky-500';

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"><AlertTriangle className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-base font-extrabold text-slate-900 dark:text-white">{title}</h2>
            <p id="confirm-description" className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Tutup dialog"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Batal</button>
          <button ref={confirmRef} type="button" onClick={onConfirm} className={`min-h-10 rounded-xl px-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-offset-2 ${confirmClass}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};
