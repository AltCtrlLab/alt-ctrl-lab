'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ComposeBarProps {
  onSend: (text: string) => void;
  sending: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ComposeBar({ onSend, sending }: ComposeBarProps) {
  const [text, setText] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setText('');
  }, [text, sending, onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="border-t border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <div className="flex items-end gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message…"
          rows={1}
          disabled={sending}
          className="
            flex-1 resize-none bg-white/[0.05] border border-white/[0.10] rounded-xl
            px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-500
            focus:outline-none focus:border-fuchsia-500/40 focus:ring-1 focus:ring-fuchsia-500/20
            disabled:opacity-50 transition-colors
          "
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="
            flex items-center justify-center w-10 h-10 rounded-xl transition-colors
            bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/25
            text-fuchsia-300 disabled:opacity-30 disabled:cursor-not-allowed
          "
        >
          {sending ? (
            <div className="w-4 h-4 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
      <p className="text-[10px] text-zinc-600 mt-1.5 ml-1">
        Entrée pour envoyer · Shift+Entrée pour un saut de ligne
      </p>
    </div>
  );
}
