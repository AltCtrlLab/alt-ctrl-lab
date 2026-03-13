'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Activity, Sparkles, MoreHorizontal, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotifications } from '@/providers/NotificationProvider';

interface InputCapsuleProps {
  isDark: boolean;
  selectedService?: string;
  onSubmit?: (brief: string, serviceId: string) => void;
}

const getTheme = (isDark: boolean) => ({
  glass: isDark 
    ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50' 
    : 'bg-white/60 border-white/40 shadow-neutral-200/50',
  glassHover: isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-white/80',
  textMuted: isDark ? 'text-neutral-400' : 'text-neutral-500',
  textMain: isDark ? 'text-neutral-200' : 'text-neutral-800',
  textHeading: isDark ? 'text-neutral-100' : 'text-neutral-900',
  borderLight: isDark ? 'border-white/[0.05]' : 'border-neutral-200/60',
  ringFocus: isDark ? 'focus-within:ring-blue-500/30' : 'focus-within:ring-blue-500/20',
});

export const InputCapsule: React.FC<InputCapsuleProps> = ({ 
  isDark,
  selectedService = 'full',
  onSubmit 
}) => {
  const t = getTheme(isDark);
  const [brief, setBrief] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const { push } = useNotifications();
  const draftTimer = useRef<NodeJS.Timeout>();

  // Restaurer brouillon
  useEffect(() => {
    const draft = localStorage.getItem(`draft_${selectedService}`);
    if (draft) setBrief(draft);
  }, [selectedService]);

  // Autosave brouillon toutes les 2s
  useEffect(() => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    if (brief.trim()) {
      draftTimer.current = setTimeout(() => {
        localStorage.setItem(`draft_${selectedService}`, brief);
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }, 2000);
    }
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [brief, selectedService]);

  const handleSubmit = async () => {
    if (brief.trim() && !isSubmitting) {
      setIsSubmitting(true);
      try {
        const result = await onSubmit?.(brief, selectedService);
        setBrief('');
        localStorage.removeItem(`draft_${selectedService}`);
        push('success', 'Mission lancée', `La mission a été envoyée à l'agence (${selectedService})`);
      } catch {
        push('error', 'Échec de soumission', 'La mission n\'a pas pu être envoyée');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className={`
        flex-1 flex flex-col p-1 relative overflow-hidden group backdrop-blur-xl rounded-3xl shadow-2xl border transition-all duration-500 
        ${t.glass} ${t.ringFocus} ${isFocused ? (isDark ? 'bg-white/[0.04] ring-1 ring-blue-500/30' : 'bg-white/80') : ''}
      `}
    >
      {/* Ambient glow on focus */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none transition-opacity duration-700 ${isFocused ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b ${t.borderLight}`}>
        <h2 className={`${t.textHeading} font-medium tracking-tight`}>Directives Opérationnelles</h2>
        <button className={`${t.textMuted} hover:${t.textMain} transition-colors`}>
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Textarea */}
      <textarea 
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Décrivez la mission. L'orchestrateur assignera les tâches aux agents appropriés..."
        className={`
          flex-1 w-full bg-transparent resize-none outline-none p-5 text-sm leading-relaxed font-sans tracking-tight z-10 
          ${t.textMain} ${isDark ? 'placeholder:text-neutral-600' : 'placeholder:text-neutral-400'}
        `}
      />

      {/* Footer */}
      <div className={`p-4 flex justify-between items-center border-t ${t.borderLight} z-10`}>
        <div className={`flex items-center gap-3 text-xs font-mono ${t.textMuted}`}>
          <Activity size={14} className={isDark ? "text-blue-500" : "text-blue-600"} />
          <span>Tokens estim.: ~{Math.ceil(brief.length / 4) || 0}</span>
          {draftSaved && <span className="flex items-center gap-1 text-emerald-500"><Save size={10} /> Brouillon sauvé</span>}
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={!brief.trim() || isSubmitting}
          className={`
            ${isDark ? 'bg-white/5 hover:bg-white/10 text-white border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-white hover:bg-neutral-50 text-neutral-900 border-neutral-200 shadow-sm'} 
            border px-6 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium transition-all duration-300 
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="tracking-tight">Envoi...</span>
            </>
          ) : (
            <>
              <Sparkles size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
              <span className="tracking-tight">Engager l'Agence</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default InputCapsule;
