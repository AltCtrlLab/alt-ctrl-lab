'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Minus, Send, Paperclip, MessageSquarePlus } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { QuickSuggestions } from './QuickSuggestions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

export function ChatPanel({ isOpen, onClose, onMinimize }: ChatPanelProps) {
  const shouldReduce = useReducedMotion();
  const trapRef = useFocusTrap(isOpen, onClose);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [vpsOnline, setVpsOnline] = useState(true);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Restore last conversation on open
  useEffect(() => {
    if (!isOpen) return;
    if (conversationId) return; // Already loaded

    (async () => {
      try {
        const res = await fetch('/api/chat');
        const data = await res.json();
        if (data.success && data.data.conversations?.length > 0) {
          const lastConv = data.data.conversations[0];
          setConversationId(lastConv.id);
          // Load messages
          const msgRes = await fetch(`/api/chat?conversationId=${lastConv.id}`);
          const msgData = await msgRes.json();
          if (msgData.success) {
            setMessages(msgData.data.messages);
          }
        }
      } catch {
        // First time — no conversations
      }
    })();
  }, [isOpen, conversationId]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Check VPS health
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetch('/api/health');
        setVpsOnline(res.ok);
      } catch {
        setVpsOnline(false);
      }
    })();
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      createdAt: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          conversationId: conversationId ?? undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (!conversationId) {
          setConversationId(data.data.conversationId);
        }
        setMessages(prev => [...prev, data.data.message]);
      } else {
        setMessages(prev => [...prev, {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: data.error || 'Une erreur est survenue.',
          createdAt: Date.now(),
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
        createdAt: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Chat avec AbdulHakim"
          tabIndex={-1}
          initial={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 10 }}
          transition={shouldReduce ? { duration: 0.15 } : { type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 right-6 z-50 hidden md:flex flex-col w-[420px] max-h-[600px] bg-zinc-950/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-fuchsia-700 flex items-center justify-center text-sm">
                👔
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">AbdulHakim</h2>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${vpsOnline ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                  <span className="text-[10px] text-zinc-400">{vpsOnline ? 'En ligne' : 'Hors ligne'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewConversation}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </button>
              <button
                onClick={onMinimize}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                aria-label="Minimiser"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                aria-label="Fermer le chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4"
            aria-live="polite"
            aria-relevant="additions"
          >
            {/* Welcome message */}
            {isEmpty && (
              <div className="space-y-4 pt-4">
                <div className="text-center">
                  <p className="text-sm text-zinc-200 font-medium">
                    Bienvenue. Je suis AbdulHakim, votre CEO IA.
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Posez-moi vos questions stratégiques sur l&apos;agence.
                  </p>
                </div>
                <QuickSuggestions onSelect={sendMessage} />
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                createdAt={msg.createdAt}
              />
            ))}

            {/* Typing indicator */}
            {isLoading && <TypingIndicator />}

            {/* Contextual suggestions after AI response */}
            {!isEmpty && !isLoading && messages[messages.length - 1]?.role === 'assistant' && (
              <QuickSuggestions
                onSelect={sendMessage}
                contextual={['Détaille ce point', 'Que recommandes-tu ?']}
              />
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-white/[0.08] p-3 bg-white/[0.02]">
            <div className="flex items-end gap-2">
              <button
                className="p-2 rounded-lg text-zinc-500 cursor-not-allowed opacity-50"
                aria-label="Joindre un fichier (bientôt disponible)"
                title="Bientôt disponible"
                disabled
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question à AbdulHakim..."
                disabled={isLoading}
                rows={1}
                className="flex-1 resize-none bg-zinc-900/80 border border-zinc-700 rounded-xl px-3 py-2.5 text-base md:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/20 transition-all disabled:opacity-50"
                style={{ maxHeight: '120px' }}
              />

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Envoyer le message"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
