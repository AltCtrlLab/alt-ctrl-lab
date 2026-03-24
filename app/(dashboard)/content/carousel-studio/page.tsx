'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Sparkles, Loader2, ChevronDown, ChevronUp,
  Trash2, Plus, RefreshCw, Download, CheckCircle2, AlertTriangle,
  Image as ImageIcon, Globe, Type,
} from 'lucide-react';
import type { CarouselBrief, SlideSpec, SlideType, CarouselPillar } from '@/lib/ai/carousel-types';
import { SLIDE_TYPE_META, SLIDE_TYPES, CAROUSEL_PILLARS, PILLAR_LABELS } from '@/lib/ai/carousel-types';

/* ── Step 1: Brief Builder ─────────────────────────────────────────── */

function BriefBuilderForm({ onBriefGenerated }: { onBriefGenerated: (brief: CarouselBrief, fromTemplate: boolean) => void }) {
  const [topic, setTopic] = useState('');
  const [pillar, setPillar] = useState<CarouselPillar>('branding_psychology');
  const [language, setLanguage] = useState<'en' | 'fr'>('fr');
  const [slideCount, setSlideCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Le sujet est requis'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-carousel-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, pillar, language, slideCount }),
      });
      const data = await res.json();
      if (data.success) {
        onBriefGenerated(data.data.brief, data.data.fromTemplate);
      } else {
        setError(data.error || 'Erreur de génération du brief');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-fuchsia-400" />
        </div>
        <h2 className="text-2xl font-bold font-headline text-zinc-100 mb-2">Créer un carrousel Instagram</h2>
        <p className="text-sm text-zinc-400">L'IA génère un brief structuré que vous pouvez éditer avant de générer les images.</p>
      </div>

      {/* Topic */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sujet du carrousel *</label>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="ex: L'effet Bouba-Kiki dans le branding, Pourquoi 90% des landing pages sous-performent..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500 transition-colors"
        />
      </div>

      {/* Pillar */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Pilier de contenu</label>
        <div className="relative">
          <select
            value={pillar}
            onChange={e => setPillar(e.target.value as CarouselPillar)}
            className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-fuchsia-500 cursor-pointer"
          >
            {CAROUSEL_PILLARS.map(p => (
              <option key={p} value={p}>{PILLAR_LABELS[p].fr}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Langue</label>
        <div className="flex gap-2">
          {(['fr', 'en'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                language === l
                  ? 'bg-fuchsia-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              {l === 'fr' ? 'Français' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* Slide count */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nombre de slides</label>
        <div className="flex gap-2 flex-wrap">
          {[8, 10, 12, 14].map(n => (
            <button
              key={n}
              onClick={() => setSlideCount(n)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                slideCount === n
                  ? 'bg-fuchsia-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {n} slides
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Génération du brief en cours...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Générer le brief
          </>
        )}
      </button>
    </div>
  );
}

/* ── Step 2: Brief Editor ──────────────────────────────────────────── */

function BriefEditor({
  brief,
  fromTemplate,
  onBriefChange,
  onGenerateImages,
}: {
  brief: CarouselBrief;
  fromTemplate: boolean;
  onBriefChange: (brief: CarouselBrief) => void;
  onGenerateImages: () => void;
}) {
  const [generating, setGenerating] = useState(false);

  const updateSlide = (index: number, update: Partial<SlideSpec>) => {
    const newSlides = [...brief.slides];
    newSlides[index] = { ...newSlides[index], ...update };
    onBriefChange({ ...brief, slides: newSlides });
  };

  const removeSlide = (index: number) => {
    const newSlides = brief.slides.filter((_, i) => i !== index);
    // Renumber
    newSlides.forEach((s, i) => { s.number = i + 1; });
    onBriefChange({ ...brief, slides: newSlides, slide_count: newSlides.length });
  };

  const addSlide = () => {
    const newSlide: SlideSpec = {
      number: brief.slides.length + 1,
      type: 'H',
      title: brief.language === 'fr' ? 'Nouveau point clé' : 'New key point',
      subtitle: null,
      visual_description: 'A clean icon or illustration centered on dark background representing the concept.',
      topic_label: null,
    };
    onBriefChange({ ...brief, slides: [...brief.slides, newSlide], slide_count: brief.slides.length + 1 });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-headline text-zinc-100 mb-1">Brief du carrousel</h2>
          <p className="text-sm text-zinc-400">
            {brief.slide_count} slides — {brief.language.toUpperCase()} — {PILLAR_LABELS[brief.pillar]?.fr ?? brief.pillar}
          </p>
          {fromTemplate && (
            <p className="text-xs text-amber-400 mt-1">Généré depuis template (API IA indisponible)</p>
          )}
        </div>
        <button
          onClick={() => { setGenerating(true); onGenerateImages(); }}
          disabled={generating}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-fuchsia-600/20"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" />
              Générer les images
            </>
          )}
        </button>
      </div>

      {/* Slide cards */}
      <div className="space-y-3">
        {brief.slides.map((slide, idx) => {
          const typeMeta = SLIDE_TYPE_META[slide.type];
          return (
            <div key={idx} className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-500 w-6">#{slide.number}</span>
                <select
                  value={slide.type}
                  onChange={e => updateSlide(idx, { type: e.target.value as SlideType })}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-fuchsia-500"
                >
                  {SLIDE_TYPES.map(t => (
                    <option key={t} value={t}>{t} — {SLIDE_TYPE_META[t].label}</option>
                  ))}
                </select>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeMeta.bg} ${typeMeta.color}`}>
                  {typeMeta.label}
                </span>
                <div className="ml-auto">
                  <button
                    onClick={() => removeSlide(idx)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <input
                value={slide.title}
                onChange={e => updateSlide(idx, { title: e.target.value })}
                placeholder="Titre de la slide..."
                className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500"
              />

              {/* Subtitle */}
              <input
                value={slide.subtitle ?? ''}
                onChange={e => updateSlide(idx, { subtitle: e.target.value || null })}
                placeholder="Sous-titre (optionnel)..."
                className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500"
              />

              {/* Visual description */}
              <textarea
                value={slide.visual_description}
                onChange={e => updateSlide(idx, { visual_description: e.target.value })}
                placeholder="Description visuelle détaillée pour la génération d'image..."
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-400 placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500 resize-none"
              />
            </div>
          );
        })}
      </div>

      {/* Add slide button */}
      <button
        onClick={addSlide}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-700 hover:border-fuchsia-500/50 rounded-xl text-zinc-500 hover:text-fuchsia-400 text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Ajouter une slide
      </button>
    </div>
  );
}

/* ── Step 3: Gallery Preview ───────────────────────────────────────── */

function GalleryPreview({
  contentId,
  brief,
  imagePaths,
  failedSlides,
  onRegenerateSlide,
}: {
  contentId: string;
  brief: CarouselBrief;
  imagePaths: string[];
  failedSlides: number[];
  onRegenerateSlide: (slideNum: number) => void;
}) {
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [fullscreen, setFullscreen] = useState<number | null>(null);

  const handleRegenerate = async (slideNum: number) => {
    setRegenerating(slideNum);
    onRegenerateSlide(slideNum);
    // Parent handles the actual regeneration
    setTimeout(() => setRegenerating(null), 500);
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let i = 0; i < brief.slides.length; i++) {
        const slideNum = i + 1;
        try {
          const res = await fetch(`/api/carousel-images/${contentId}/${slideNum}`);
          if (res.ok) {
            const blob = await res.blob();
            zip.file(`slide-${slideNum}.png`, blob);
          }
        } catch {
          // Skip failed slides
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carousel-${contentId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold font-headline text-zinc-100 mb-1">Carrousel généré</h2>
          <p className="text-sm text-zinc-400">
            {imagePaths.length} / {brief.slide_count} slides — {brief.topic}
          </p>
          {failedSlides.length > 0 && (
            <p className="text-xs text-rose-400 mt-1">
              {failedSlides.length} slide(s) en échec — cliquez "Regénérer" pour réessayer
            </p>
          )}
        </div>
        <button
          onClick={handleDownloadZip}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Télécharger ZIP
        </button>
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {brief.slides.map((slide, idx) => {
          const slideNum = slide.number;
          const hasImage = imagePaths.includes(`slide-${slideNum}.png`);
          const isFailed = failedSlides.includes(slideNum);
          const typeMeta = SLIDE_TYPE_META[slide.type];

          return (
            <div key={idx} className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl overflow-hidden">
              {/* Image area */}
              <div className="aspect-[4/5] relative bg-zinc-900 flex items-center justify-center">
                {hasImage ? (
                  <img
                    src={`/api/carousel-images/${contentId}/${slideNum}?t=${Date.now()}`}
                    alt={`Slide ${slideNum}: ${slide.title}`}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => setFullscreen(slideNum)}
                  />
                ) : isFailed ? (
                  <div className="text-center p-4">
                    <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                    <p className="text-xs text-rose-400">Échec de génération</p>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Loader2 className="w-6 h-6 text-zinc-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">En attente...</p>
                  </div>
                )}
              </div>

              {/* Info bar */}
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-zinc-500">#{slideNum}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeMeta.bg} ${typeMeta.color}`}>
                    {slide.type}
                  </span>
                  <span className="text-xs text-zinc-400 truncate">{slide.title}</span>
                </div>
                <button
                  onClick={() => handleRegenerate(slideNum)}
                  disabled={regenerating === slideNum}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-lg transition-colors"
                >
                  {regenerating === slideNum ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Regénérer
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setFullscreen(null)}
        >
          <img
            src={`/api/carousel-images/${contentId}/${fullscreen}?t=${Date.now()}`}
            alt={`Slide ${fullscreen}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  );
}

/* ── Progress Bar ──────────────────────────────────────────────────── */

function GenerationProgress({
  totalSlides,
  completedSlides,
}: {
  totalSlides: number;
  completedSlides: number;
}) {
  const pct = totalSlides > 0 ? Math.round((completedSlides / totalSlides) * 100) : 0;
  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <Loader2 className="w-12 h-12 text-fuchsia-400 animate-spin mx-auto mb-6" />
      <h2 className="text-xl font-bold font-headline text-zinc-100 mb-2">
        Génération en cours...
      </h2>
      <p className="text-sm text-zinc-400 mb-6">
        Slide {completedSlides} / {totalSlides} — {pct}%
      </p>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500 mt-3">
        Chaque slide prend 5-10 secondes. Ne fermez pas cette page.
      </p>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */

type Step = 'brief' | 'editor' | 'generating' | 'gallery';

export default function CarouselStudioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin" /></div>}>
      <CarouselStudioContent />
    </Suspense>
  );
}

function CarouselStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingId = searchParams.get('id');

  const [step, setStep] = useState<Step>('brief');
  const [brief, setBrief] = useState<CarouselBrief | null>(null);
  const [fromTemplate, setFromTemplate] = useState(false);
  const [contentId, setContentId] = useState<string | null>(existingId);
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [failedSlides, setFailedSlides] = useState<number[]>([]);
  const [generationProgress, setGenerationProgress] = useState({ total: 0, completed: 0 });

  const handleBriefGenerated = useCallback((b: CarouselBrief, template: boolean) => {
    setBrief(b);
    setFromTemplate(template);
    setStep('editor');
  }, []);

  const handleGenerateImages = useCallback(async () => {
    if (!brief) return;
    setStep('generating');
    setGenerationProgress({ total: brief.slides.length, completed: 0 });

    try {
      const res = await fetch('/api/ai/generate-carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, contentId: contentId ?? undefined }),
      });
      const data = await res.json();

      if (data.success) {
        setContentId(data.data.contentId);
        setImagePaths(data.data.imagePaths);
        setFailedSlides(data.data.failedSlides ?? []);
        setGenerationProgress({ total: data.data.totalSlides, completed: data.data.slideCount + (data.data.failedSlides?.length ?? 0) });
        setStep('gallery');
      } else {
        setStep('editor');
        alert(`Erreur : ${data.error}`);
      }
    } catch (err) {
      setStep('editor');
      alert(`Erreur réseau : ${err instanceof Error ? err.message : 'inconnue'}`);
    }
  }, [brief, contentId]);

  const handleRegenerateSlide = useCallback(async (slideNum: number) => {
    if (!contentId) return;
    try {
      const res = await fetch('/api/ai/regenerate-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, slideNumber: slideNum }),
      });
      const data = await res.json();
      if (data.success) {
        setImagePaths(prev => {
          const filename = `slide-${slideNum}.png`;
          return prev.includes(filename) ? [...prev] : [...prev, filename].sort();
        });
        setFailedSlides(prev => prev.filter(n => n !== slideNum));
      }
    } catch (err) {
      console.error('Regeneration failed:', err);
    }
  }, [contentId]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/content')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Contenu
          </button>
          <span className="text-zinc-600">/</span>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-fuchsia-400" />
            <h1 className="text-sm font-semibold text-zinc-100">Carousel Studio</h1>
          </div>

          {/* Step indicator */}
          <div className="ml-auto flex items-center gap-2">
            {(['brief', 'editor', 'gallery'] as const).map((s, i) => {
              const labels = ['Brief', 'Édition', 'Résultat'];
              const isActive = step === s || (step === 'generating' && s === 'editor');
              const isDone = (step === 'editor' && i === 0) || (step === 'gallery' && i < 2) || (step === 'generating' && i === 0);
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                    isActive ? 'bg-fuchsia-500/10 text-fuchsia-400' : isDone ? 'text-emerald-400' : 'text-zinc-600'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-4 text-center">{i + 1}</span>}
                    {labels[i]}
                  </div>
                  {i < 2 && <span className="text-zinc-700">→</span>}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {step === 'brief' && (
          <BriefBuilderForm onBriefGenerated={handleBriefGenerated} />
        )}

        {step === 'editor' && brief && (
          <BriefEditor
            brief={brief}
            fromTemplate={fromTemplate}
            onBriefChange={setBrief}
            onGenerateImages={handleGenerateImages}
          />
        )}

        {step === 'generating' && (
          <GenerationProgress
            totalSlides={generationProgress.total}
            completedSlides={generationProgress.completed}
          />
        )}

        {step === 'gallery' && brief && contentId && (
          <GalleryPreview
            contentId={contentId}
            brief={brief}
            imagePaths={imagePaths}
            failedSlides={failedSlides}
            onRegenerateSlide={handleRegenerateSlide}
          />
        )}
      </main>
    </div>
  );
}
