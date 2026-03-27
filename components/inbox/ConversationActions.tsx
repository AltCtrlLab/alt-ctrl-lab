'use client';

import { useState, useCallback } from 'react';
import { X, Archive, UserCheck } from 'lucide-react';

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

interface ConversationActionsProps {
  conversation: Conversation;
  onAction: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConversationActions({ conversation, onAction }: ConversationActionsProps) {
  const [assigning, setAssigning] = useState(false);
  const [assignInput, setAssignInput] = useState(conversation.assignedTo ?? '');
  const [loading, setLoading] = useState(false);

  const patchConversation = useCallback(async (payload: Record<string, string | null>) => {
    setLoading(true);
    try {
      await fetch('/api/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conversation.id, ...payload }),
      });
      onAction();
    } finally {
      setLoading(false);
    }
  }, [conversation.id, onAction]);

  const handleAssign = useCallback(async () => {
    const trimmed = assignInput.trim();
    if (!trimmed) return;
    setAssigning(false);
    await patchConversation({ assignedTo: trimmed });
  }, [assignInput, patchConversation]);

  const handleClose = useCallback(() => {
    patchConversation({ status: 'closed' });
  }, [patchConversation]);

  const handleArchive = useCallback(() => {
    patchConversation({ status: 'archived' });
  }, [patchConversation]);

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/[0.08] bg-white/[0.02]">
      {/* Assign */}
      {assigning ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={assignInput}
            onChange={(e) => setAssignInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAssign()}
            placeholder="Nom du responsable"
            autoFocus
            className="
              bg-white/[0.05] border border-white/[0.10] rounded-lg
              px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500
              focus:outline-none focus:border-fuchsia-500/40
            "
          />
          <button
            type="button"
            onClick={handleAssign}
            disabled={loading || !assignInput.trim()}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 rounded-xl text-xs px-3 py-1.5 disabled:opacity-40"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setAssigning(false)}
            className="text-zinc-500 hover:text-zinc-300 text-xs"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAssigning(true)}
          disabled={loading}
          className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 text-blue-300 rounded-xl text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
        >
          <UserCheck className="w-3.5 h-3.5" />
          {conversation.assignedTo ? `Assigné : ${conversation.assignedTo}` : 'Assigner'}
        </button>
      )}

      {/* Close */}
      {conversation.status === 'open' && (
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 rounded-xl text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
        >
          <X className="w-3.5 h-3.5" />
          Fermer
        </button>
      )}

      {/* Archive */}
      {conversation.status !== 'archived' && (
        <button
          type="button"
          onClick={handleArchive}
          disabled={loading}
          className="bg-zinc-500/10 hover:bg-zinc-500/20 border border-zinc-500/25 text-zinc-300 rounded-xl text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-40"
        >
          <Archive className="w-3.5 h-3.5" />
          Archiver
        </button>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="w-4 h-4 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin ml-2" />
      )}
    </div>
  );
}
