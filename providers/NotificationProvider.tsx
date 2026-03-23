'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
}

interface Toast extends Notification {
  autoDismiss: boolean;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  push: (type: NotificationType, title: string, message?: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

const ICONS: Record<NotificationType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS: Record<NotificationType, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  info: 'border-cyan-500/30 bg-cyan-500/10',
};

const ICON_COLORS: Record<NotificationType, string> = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-cyan-400',
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: NotificationType, title: string, message?: string) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const notif: Notification = { id, type, title, message, timestamp: new Date(), read: false };
    setNotifications(prev => [notif, ...prev].slice(0, 100));

    const toast: Toast = { ...notif, autoDismiss: true };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, push, markAllRead, clear }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm" aria-live="polite" role="status">
        <AnimatePresence>
          {toasts.slice(-3).map(toast => {
            const Icon = ICONS[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl ${COLORS[toast.type]}`}
                {...(toast.type === 'error' ? { role: 'alert' } : {})}
              >
                <Icon size={18} className={`shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{toast.title}</p>
                  {toast.message && <p className="text-xs text-white/80 mt-0.5 truncate">{toast.message}</p>}
                </div>
                <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-white/40 hover:text-white/70" aria-label="Fermer la notification">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}
