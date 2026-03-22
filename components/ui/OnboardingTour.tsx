'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Lightbulb,
  LayoutDashboard, PlusCircle, TrendingUp, Bot, BarChart3,
} from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  tip?: string;
  getTarget: () => HTMLElement | null;
  position: 'bottom' | 'right' | 'left';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bienvenue dans le Cockpit',
    description:
      'Ce cockpit centralise toutes les opérations d\'AltCtrl.Lab : leads, projets, finances, contenu et agents IA. Tout est accessible depuis la barre latérale à gauche.',
    icon: LayoutDashboard,
    color: 'text-fuchsia-400',
    tip: 'Utilisez Ctrl+K pour rechercher n\'importe quoi rapidement.',
    getTarget: () => document.querySelector<HTMLElement>('.app-shell > nav'),
    position: 'right',
  },
  {
    title: 'Soumettre un Brief',
    description:
      'Pour lancer une tâche IA, allez sur la page "Nouveau Brief" ou directement sur une page agent (Branding, Web Dev, Marketing). Décrivez ce que vous voulez et l\'agent s\'en charge.',
    icon: PlusCircle,
    color: 'text-cyan-400',
    tip: 'Chaque agent a des exemples de briefs pour vous aider à démarrer.',
    getTarget: () => document.querySelector<HTMLElement>('nav a[href="/brief"]'),
    position: 'right',
  },
  {
    title: 'Suivre votre Pipeline',
    description:
      'La section Pipeline regroupe vos Leads, Projets, Finances, Prospection et Post-Vente. Quand un lead passe au statut "Signé", un projet et une facture sont créés automatiquement.',
    icon: TrendingUp,
    color: 'text-emerald-400',
    tip: 'Les compteurs en haut de chaque page résument les KPIs clés.',
    getTarget: () => {
      const labels = document.querySelectorAll('nav p');
      const match = Array.from(labels).find(p => p.textContent?.includes('Pipeline'));
      return (match?.parentElement as HTMLElement) ?? null;
    },
    position: 'right',
  },
  {
    title: 'Vos Agents IA',
    description:
      'L\'équipe IA compte 9 agents spécialisés : Musawwir (design), Matin (développement), Fatah (marketing), Hasib (data), et leurs exécutants. Chacun a sa page dédiée dans "Équipe IA".',
    icon: Bot,
    color: 'text-amber-400',
    tip: 'Le widget Monitoring IA sur le Dashboard montre l\'activité de vos agents.',
    getTarget: () => document.querySelector<HTMLElement>('nav a[href="/branding"]'),
    position: 'right',
  },
  {
    title: 'Exporter et Analyser',
    description:
      'Chaque page avec des données offre un export CSV. Le Dashboard compile les KPIs et les actions recommandées. N\'hésitez pas à ouvrir le Guide (?) dans la sidebar pour plus de détails.',
    icon: BarChart3,
    color: 'text-sky-400',
    tip: 'Le bouton "?" en bas de la sidebar ouvre le guide complet à tout moment.',
    getTarget: () => null,
    position: 'bottom',
  },
];

const STORAGE_KEY = 'acl-onboarding-done';
const SPOTLIGHT_PADDING = 8;
const TOOLTIP_ESTIMATED_HEIGHT = 400;

interface OnboardingTourProps {
  forceOpen?: boolean;
  onComplete?: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour({ forceOpen, onComplete }: OnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const animDuration = prefersReduced ? 0 : 0.2;
  const springConfig = prefersReduced
    ? { duration: 0 }
    : { type: 'spring' as const, damping: 25, stiffness: 300 };

  useEffect(() => {
    if (forceOpen) {
      setVisible(true);
      setStep(0);
      return;
    }
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setVisible(true);
    }
  }, [forceOpen]);

  // Save and restore focus
  useEffect(() => {
    if (visible) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(() => dialogRef.current?.focus(), 50);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [visible]);

  // Measure and track target element
  useEffect(() => {
    if (!visible) return;

    const current = TOUR_STEPS[step];
    const target = current.getTarget();

    // If target is null or hidden (e.g. sidebar collapsed on mobile), show centered card
    if (!target) {
      setTargetRect(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    const isHidden = rect.width === 0 || rect.height === 0;
    if (isHidden) {
      setTargetRect(null);
      return;
    }

    // Scroll into view if needed
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
    }

    const updateRect = () => {
      const r = target.getBoundingClientRect();
      setTargetRect({
        top: r.top - SPOTLIGHT_PADDING,
        left: r.left - SPOTLIGHT_PADDING,
        width: r.width + SPOTLIGHT_PADDING * 2,
        height: r.height + SPOTLIGHT_PADDING * 2,
      });
    };

    updateRect();

    const observer = new ResizeObserver(updateRect);
    observer.observe(target);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [visible, step, prefersReduced]);

  const trackTourEvent = useCallback((eventType: string, metadata: Record<string, unknown>) => {
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, metadata }),
    }).catch(() => {});
  }, []);

  const close = useCallback(() => {
    const isLastStep = step === TOUR_STEPS.length - 1;
    trackTourEvent(isLastStep ? 'tour_completed' : 'tour_skipped', {
      stoppedAtStep: step + 1,
      totalSteps: TOUR_STEPS.length,
    });
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
    onComplete?.();
  }, [onComplete, step, trackTourEvent]);

  const next = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      close();
    }
  }, [step, close]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'Tab':
          // Focus trap within the dialog
          if (dialogRef.current) {
            const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
              if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
              }
            } else {
              if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, next, prev, close]);

  const current = TOUR_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TOUR_STEPS.length - 1;
  const hasTarget = targetRect !== null;

  // Calculate tooltip position
  const tooltipStyle = getTooltipPosition(targetRect, current.position);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Overlay with spotlight cutout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animDuration }}
            className="fixed inset-0 z-[60]"
            onClick={close}
            aria-hidden="true"
          >
            {hasTarget ? (
              <div
                className={`absolute inset-0 ${prefersReduced ? '' : 'transition-all duration-300'}`}
                style={{
                  background: 'rgba(0, 0, 0, 0.75)',
                  clipPath: `polygon(
                    0% 0%, 0% 100%, ${targetRect.left}px 100%, ${targetRect.left}px ${targetRect.top}px,
                    ${targetRect.left + targetRect.width}px ${targetRect.top}px,
                    ${targetRect.left + targetRect.width}px ${targetRect.top + targetRect.height}px,
                    ${targetRect.left}px ${targetRect.top + targetRect.height}px,
                    ${targetRect.left}px 100%, 100% 100%, 100% 0%
                  )`,
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-black/75" />
            )}
          </motion.div>

          {/* Spotlight highlight border */}
          {hasTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: animDuration }}
              className="fixed z-[61] rounded-xl border-2 border-fuchsia-500/50 pointer-events-none"
              style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
                boxShadow: '0 0 20px rgba(217, 70, 239, 0.2)',
              }}
              aria-hidden="true"
            />
          )}

          {/* Tooltip card */}
          <motion.div
            key={step}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Tour d'onboarding — étape ${step + 1} sur ${TOUR_STEPS.length}`}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 5 }}
            transition={springConfig}
            className="fixed z-[62] w-full max-w-sm"
            style={tooltipStyle}
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-zinc-900 border border-white/[0.1] rounded-2xl shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-1">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg bg-white/[0.05] ${current.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    Étape {step + 1}/{TOUR_STEPS.length}
                  </span>
                </div>
                <button
                  onClick={close}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors"
                  aria-label="Fermer le tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 py-3" aria-live="polite">
                <h3 className="text-base font-semibold text-zinc-100 mb-1.5">
                  {current.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed mb-2.5">
                  {current.description}
                </p>
                {current.tip && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/10">
                    <Lightbulb className="w-3 h-3 text-fuchsia-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-fuchsia-300/80">{current.tip}</p>
                  </div>
                )}
              </div>

              {/* Progress + Navigation */}
              <div className="px-5 pb-4">
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  {TOUR_STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === step
                          ? 'bg-fuchsia-400 w-6'
                          : i < step
                          ? 'bg-fuchsia-400/40 w-2'
                          : 'bg-zinc-700 w-2'
                      }`}
                      aria-label={`Aller à l'étape ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={step === 0 ? close : prev}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {step === 0 ? (
                      'Passer le tour'
                    ) : (
                      <>
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Précédent
                      </>
                    )}
                  </button>
                  <button
                    onClick={next}
                    className="flex items-center gap-1.5 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {isLast ? 'Commencer' : 'Suivant'}
                    {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getTooltipPosition(
  rect: TargetRect | null,
  position: 'bottom' | 'right' | 'left'
): React.CSSProperties {
  // Fallback: centered
  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  const GAP = 16;

  switch (position) {
    case 'right':
      return {
        top: Math.max(16, Math.min(rect.top, window.innerHeight - TOOLTIP_ESTIMATED_HEIGHT)),
        left: rect.left + rect.width + GAP,
      };
    case 'left':
      return {
        top: Math.max(16, Math.min(rect.top, window.innerHeight - TOOLTIP_ESTIMATED_HEIGHT)),
        right: window.innerWidth - rect.left + GAP,
      };
    case 'bottom':
      return {
        top: rect.top + rect.height + GAP,
        left: Math.max(16, rect.left),
      };
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}

/** Reset onboarding so it shows again on next page load */
export function resetOnboarding(): void {
  localStorage.removeItem(STORAGE_KEY);
}
