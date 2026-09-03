import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, AlertCircle, Info, X, ShieldAlert, Trash2
} from 'lucide-react';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // 'success' | 'error' | 'warning' | 'info' | 'danger'
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
    onCancel: null,
  });

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showAlert = useCallback(({
    title,
    message,
    type = 'info',
    confirmText = 'Got It',
    onConfirm,
  }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: title || (type === 'error' ? 'Action Failed' : type === 'success' ? 'Success' : 'Notice'),
        message,
        type,
        confirmText,
        cancelText: null,
        onConfirm: () => {
          closeModal();
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          closeModal();
          resolve(true);
        },
      });
    });
  }, [closeModal]);

  const showConfirm = useCallback(({
    title = 'Confirm Action',
    message,
    type = 'warning',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
  }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm: () => {
          closeModal();
          resolve(true);
        },
        onCancel: () => {
          closeModal();
          resolve(false);
        },
      });
    });
  }, [closeModal]);

  // Optionally bridge global window.alert & window.confirm
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showAlert({
        title: 'Super Admin Notice',
        message: String(msg),
        type: String(msg).includes('✅') || String(msg).toLowerCase().includes('success') ? 'success' : 'info',
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showAlert]);

  const getIcon = () => {
    switch (modalState.type) {
      case 'success':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-sm">
            <CheckCircle2 size={26} />
          </div>
        );
      case 'error':
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-600 shadow-sm">
            <ShieldAlert size={26} />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-sm">
            <AlertTriangle size={26} />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 shadow-sm">
            <Info size={26} />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    switch (modalState.type) {
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25';
      case 'error':
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/25';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25';
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, closeModal }}>
      {children}

      {/* Global Alert / Confirmation Popup Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 scale-in-95 duration-200">
            
            <div className="flex items-start justify-between mb-4">
              {getIcon()}
              <button
                onClick={modalState.onCancel || closeModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">
                {modalState.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                {modalState.message}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              {modalState.cancelText && (
                <button
                  type="button"
                  onClick={modalState.onCancel || closeModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  {modalState.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={modalState.onConfirm || closeModal}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition shadow-md ${getConfirmButtonClass()}`}
              >
                {modalState.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
