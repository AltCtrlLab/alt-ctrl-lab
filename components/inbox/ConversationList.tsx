'use client';

import { Mail, MessageCircle, Phone, Smartphone } from 'lucide-react';

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

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const channelIcons: Record<Conversation['channel'], React.ReactNode> = {
  email: <Mail className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  chat: <Smartphone className="w-4 h-4" />,
  sms: <Phone className="w-4 h-4" />,
};

const channelColors: Record<Conversation['channel'], string> = {
  email: 'text-blue-400',
  whatsapp: 'text-green-400',
  chat: 'text-fuchsia-400',
  sms: 'text-amber-400',
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedId;
        const lastMessage = conv.messages[conv.messages.length - 1];
        const preview = lastMessage ? truncate(lastMessage.text, 60) : 'Aucun message';

        return (
          <button
            key={conv.id}
            type="button"
            onClick={() => onSelect(conv)}
            className={`
              w-full text-left px-4 py-3 border-b border-white/[0.06] transition-colors
              hover:bg-white/[0.04]
              ${isSelected ? 'bg-fuchsia-500/10 border-l-2 border-l-fuchsia-500' : ''}
            `}
          >
            <div className="flex items-start gap-3">
              {/* Channel icon */}
              <div className={`mt-0.5 ${channelColors[conv.channel]}`}>
                {channelIcons[conv.channel]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-zinc-300'}`}>
                    {conv.clientName}
                  </span>
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    {relativeTime(conv.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {preview}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-fuchsia-500 rounded-full">
                      {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
