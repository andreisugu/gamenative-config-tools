'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'info' | 'error';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
            toast.type === 'error'
              ? 'bg-red-950/95 border-red-700/80 text-red-100 shadow-red-900/30'
              : toast.type === 'info'
              ? 'bg-cyan-950/95 border-cyan-700/80 text-cyan-100 shadow-cyan-900/30'
              : 'bg-emerald-950/95 border-emerald-500/80 text-emerald-100 shadow-emerald-900/40'
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="shrink-0 pt-0.5">
            {toast.type === 'error' ? (
              <AlertCircle className="h-5 w-5 text-red-400" />
            ) : toast.type === 'info' ? (
              <Info className="h-5 w-5 text-cyan-400" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}
          </div>

          <div className="flex-1 text-xs">
            {toast.title && (
              <h4 className="font-bold text-sm text-white mb-0.5">{toast.title}</h4>
            )}
            <p className="text-gray-200 leading-relaxed font-medium">{toast.message}</p>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="shrink-0 p-1 text-gray-400 hover:text-white rounded-lg transition"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
