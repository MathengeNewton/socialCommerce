'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        ...options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (pending) {
      pending.resolve(true);
      setPending(null);
    }
  }, [pending]);

  const handleCancel = useCallback(() => {
    if (pending) {
      pending.resolve(false);
      setPending(null);
    }
  }, [pending]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <h2 id="confirm-title" className="text-lg font-bold text-gray-900 mb-2">
              {pending.title ?? 'Confirm'}
            </h2>
            <p className="text-gray-600 mb-6">{pending.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
                  pending.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
