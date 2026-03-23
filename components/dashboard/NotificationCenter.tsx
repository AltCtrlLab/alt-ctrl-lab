'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, AlertCircle, Info, Check, X, ExternalLink } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: number;
}

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertCircle; color: string; bg: string; border: string }> = {
  critical: { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  warning:  { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  info:     { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
};

const ENTITY_ROUTES: Record<string, string> = {
  project: '/projets',
  invoice: '/finances',
  lead: '/leads',
};

/** Standalone notification list — used by MobileHeader's BottomSheet. */
export function NotificationList() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {
      // Silent fail — non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'readAll' }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  }, []);

  return (
    <div className="flex flex-col">
      {/* Mark all read */}
      {unreadCount > 0 && (
        <div className="flex justify-end px-4 py-2 border-b border-white/[0.08]">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
          >
            Tout marquer lu
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
          <Bell className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">Aucune notification</p>
        </div>
      ) : (
        notifications.map(notif => {
          const config = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
          const Icon = config.icon;
          const route = notif.entityType ? ENTITY_ROUTES[notif.entityType] : null;

          return (
            <div
              key={notif.id}
              className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                !notif.isRead ? 'bg-white/[0.02]' : ''
              }`}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg ${config.bg} ${config.border} border`}>
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] leading-tight ${!notif.isRead ? 'text-zinc-200 font-medium' : 'text-zinc-400'}`}>
                  {notif.title}
                </p>
                {notif.message && (
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{notif.message}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-zinc-400">{formatRelativeTime(notif.createdAt)}</span>
                  {route && (
                    <a
                      href={route}
                      className="text-[10px] text-fuchsia-400/70 hover:text-fuchsia-400 flex items-center gap-0.5 transition-colors"
                    >
                      Voir <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
              {!notif.isRead && (
                <button
                  onClick={() => handleMarkRead(notif.id)}
                  className="mt-1 p-1 rounded hover:bg-white/[0.06] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Marquer comme lu"
                >
                  <Check className="w-3.5 h-3.5 text-zinc-400 hover:text-emerald-400" />
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data.notifications);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {
      // Silent fail — non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'readAll' }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  }, []);

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="w-4.5 h-4.5 text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-fuchsia-600 text-[10px] font-bold text-white px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] overflow-hidden rounded-xl bg-zinc-900/95 border border-white/[0.08] shadow-2xl backdrop-blur-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
              <h3 className="text-sm font-semibold text-zinc-200">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
                  >
                    Tout marquer lu
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-white/[0.06] transition-colors"
                  aria-label="Fermer les notifications"
                >
                  <X className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <Bell className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">Aucune notification</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const config = SEVERITY_CONFIG[notif.severity] || SEVERITY_CONFIG.info;
                  const Icon = config.icon;
                  const route = notif.entityType ? ENTITY_ROUTES[notif.entityType] : null;

                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${
                        !notif.isRead ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg ${config.bg} ${config.border} border`}>
                        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-tight ${!notif.isRead ? 'text-zinc-200 font-medium' : 'text-zinc-400'}`}>
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{notif.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-400">{formatRelativeTime(notif.createdAt)}</span>
                          {route && (
                            <a
                              href={route}
                              className="text-[10px] text-fuchsia-400/70 hover:text-fuchsia-400 flex items-center gap-0.5 transition-colors"
                            >
                              Voir <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="mt-1 p-1 rounded hover:bg-white/[0.06] transition-colors"
                          aria-label="Marquer comme lu"
                        >
                          <Check className="w-3 h-3 text-zinc-400 hover:text-emerald-400" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
