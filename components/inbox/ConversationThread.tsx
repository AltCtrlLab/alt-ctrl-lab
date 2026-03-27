'use client';

import { useEffect, useRef } from 'react';

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

interface ConversationThreadProps {
  conversation: Conversation;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

function isOurMessage(sender: string, clientName: string): boolean {
  return sender !== clientName;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConversationThread({ conversation }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages.length]);

  const { messages, clientName } = conversation;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
      {messages.map((msg, idx) => {
        const ours = isOurMessage(msg.sender, clientName);
        const showDate = idx === 0 || !isSameDay(messages[idx - 1].timestamp, msg.timestamp);

        return (
          <div key={msg.id}>
            {/* Date separator */}
            {showDate && (
              <div className="flex items-center justify-center my-4">
                <span className="text-[10px] text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full">
                  {formatDate(msg.timestamp)}
                </span>
              </div>
            )}

            {/* Message bubble */}
            <div className={`flex ${ours ? 'justify-end' : 'justify-start'} mb-2`}>
              <div
                className={`
                  max-w-[75%] rounded-2xl px-4 py-2.5
                  ${ours
                    ? 'bg-fuchsia-500/15 border border-fuchsia-500/25 rounded-br-md'
                    : 'bg-white/[0.06] border border-white/[0.08] rounded-bl-md'
                  }
                `}
              >
                <p className="text-[11px] font-medium mb-1 text-zinc-400">
                  {msg.sender}
                </p>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words">
                  {msg.text}
                </p>
                <p className={`text-[10px] mt-1 ${ours ? 'text-fuchsia-400/60' : 'text-zinc-500'} text-right`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
