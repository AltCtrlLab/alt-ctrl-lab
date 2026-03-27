'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Inbox, Mail, MessageCircle, Phone, Smartphone,
  Send, X, Archive, UserCheck, ArrowLeft,
} from 'lucide-react';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ConversationThread } from '@/components/inbox/ConversationThread';
import { ComposeBar } from '@/components/inbox/ComposeBar';
import { ConversationActions } from '@/components/inbox/ConversationActions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  channel: 'email' | 'whatsapp' | 'chat' | 'sms';
}

interface Conversation {
  id: string;
  clientName: string;
  clientEmail: string;
  channel: 'email' | 'whatsapp' | 'chat' | 'sms';
  status: 'open' | 'closed' | 'archived';
  assignedTo: string | null;
  lastMessageAt: number;
  messages: Message[];
  unreadCount: number;
}

type StatusFilter = 'open' | 'closed' | 'all';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const filterLabels: Record<StatusFilter, string> = {
  open: 'Ouvertes',
  closed: 'Fermées',
  all: 'Toutes',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('open');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  // ─── Fetch conversations ──────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox');
      const json = await res.json() as { success: boolean; data: { conversations: Conversation[] } };
      if (json.success) {
        setConversations(json.data.conversations);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSelected = useCallback(async (convId: string) => {
    const res = await fetch(`/api/inbox?id=${encodeURIComponent(convId)}`);
    const json = await res.json() as { success: boolean; data: { conversation: Conversation } };
    if (json.success) {
      setSelected(json.data.conversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? json.data.conversation : c))
      );
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback((conv: Conversation) => {
    setSelected(conv);
    setMobileShowThread(true);
  }, []);

  const handleBack = useCallback(() => {
    setMobileShowThread(false);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!selected) return;
    setSending(true);
    try {
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selected.id, text }),
      });
      await refreshSelected(selected.id);
    } finally {
      setSending(false);
    }
  }, [selected, refreshSelected]);

  const handleAction = useCallback(async () => {
    await fetchConversations();
    if (selected) {
      await refreshSelected(selected.id);
    }
  }, [fetchConversations, refreshSelected, selected]);

  // ─── Filter ───────────────────────────────────────────────────────────────

  const filtered = conversations.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          {mobileShowThread && (
            <button
              type="button"
              onClick={handleBack}
              className="md:hidden text-zinc-400 hover:text-white transition-colors mr-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-2 bg-fuchsia-500/10 rounded-xl">
            <Inbox className="w-5 h-5 text-fuchsia-400" />
          </div>
          <h1 className="text-lg font-semibold text-white">Messagerie</h1>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
          {(Object.keys(filterLabels) as StatusFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${filter === key
                  ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25'
                  : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }
              `}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list — hidden on mobile when thread is open */}
        <div className={`
          w-full md:w-[350px] md:min-w-[350px] border-r border-white/[0.08]
          bg-white/[0.01] flex flex-col
          ${mobileShowThread ? 'hidden md:flex' : 'flex'}
        `}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
              <div className="p-3 bg-white/[0.03] rounded-2xl mb-3">
                <Inbox className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500">Aucune conversation</p>
              <p className="text-xs text-zinc-600 mt-1">
                {filter === 'open' ? 'Toutes les conversations sont fermées' : 'Rien à afficher'}
              </p>
            </div>
          ) : (
            <ConversationList
              conversations={filtered}
              selectedId={selected?.id ?? null}
              onSelect={handleSelect}
            />
          )}
        </div>

        {/* Thread panel — hidden on mobile when list is shown */}
        <div className={`
          flex-1 flex flex-col bg-white/[0.01]
          ${mobileShowThread ? 'flex' : 'hidden md:flex'}
        `}>
          {selected ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08]">
                <span className="text-sm font-medium text-white">{selected.clientName}</span>
                <span className="text-xs text-zinc-500">{selected.clientEmail}</span>
                <span className={`
                  ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full
                  ${selected.status === 'open'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                    : selected.status === 'closed'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                      : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/25'
                  }
                `}>
                  {selected.status === 'open' ? 'Ouverte' : selected.status === 'closed' ? 'Fermée' : 'Archivée'}
                </span>
              </div>

              {/* Messages */}
              <ConversationThread conversation={selected} />

              {/* Actions bar */}
              <ConversationActions conversation={selected} onAction={handleAction} />

              {/* Compose */}
              {selected.status === 'open' && (
                <ComposeBar onSend={handleSend} sending={sending} />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
              <div className="p-4 bg-white/[0.03] rounded-2xl mb-4">
                <MessageCircle className="w-10 h-10 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-400">Sélectionnez une conversation</p>
              <p className="text-xs text-zinc-600 mt-1">
                Choisissez une conversation dans la liste pour afficher les messages
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
