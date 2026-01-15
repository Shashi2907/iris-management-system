"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant: 'danger' | 'warning' | 'default';
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
  }) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-800',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-500',
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg
        ${config.bgColor} ${config.borderColor}
        animate-in slide-in-from-top-2 fade-in duration-300
        max-w-sm w-full
      `}
    >
      <Icon size={20} className={config.iconColor} />
      <p className={`flex-1 text-sm font-medium ${config.textColor}`}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`p-1 rounded-full hover:bg-black/5 transition-colors ${config.textColor}`}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {},
    variant: 'default',
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback((options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'default';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        onConfirm: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const variantStyles = {
    danger: {
      confirmBg: 'bg-gradient-to-r from-red-500 to-rose-600',
      confirmShadow: 'shadow-red-500/30 hover:shadow-red-500/40',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    warning: {
      confirmBg: 'bg-gradient-to-r from-amber-500 to-orange-600',
      confirmShadow: 'shadow-amber-500/30 hover:shadow-amber-500/40',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    default: {
      confirmBg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
      confirmShadow: 'shadow-blue-500/30 hover:shadow-blue-500/40',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={confirmDialog.onCancel}
          />
          
          {/* Dialog */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 fade-in duration-200 overflow-hidden">
            {/* Header with icon */}
            <div className="p-6 pb-4 flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl ${variantStyles[confirmDialog.variant].iconBg} flex items-center justify-center mb-4`}>
                <AlertTriangle size={28} className={variantStyles[confirmDialog.variant].iconColor} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{confirmDialog.message}</p>
            </div>
            
            {/* Actions */}
            <div className="p-4 pt-2 flex gap-3">
              <button
                onClick={confirmDialog.onConfirm}
                className={`flex-1 px-4 py-3 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer hover:shadow-xl ${variantStyles[confirmDialog.variant].confirmBg} ${variantStyles[confirmDialog.variant].confirmShadow}`}
              >
                {confirmDialog.confirmText}
              </button>
              <button
                onClick={confirmDialog.onCancel}
                className="flex-1 px-4 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-[0.98] cursor-pointer"
              >
                {confirmDialog.cancelText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
