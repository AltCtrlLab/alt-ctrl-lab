'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Dark mode detection (matches app-level dark mode logic)
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem('altctrl-dark-mode');
    setIsDark(stored !== 'false');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Identifiants incorrects');
        setAttempts(a => a + 1);
        setPassword('');
      }
    } catch {
      setError('Erreur de connexion. Vérifiez votre réseau.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase = `w-full px-4 py-3 rounded-xl border text-sm transition-all outline-none ${
    isDark
      ? 'bg-zinc-900/80 border-zinc-700/60 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:bg-zinc-900'
      : 'bg-white/80 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white'
  }`;

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 ${isDark ? 'bg-fuchsia-600' : 'bg-fuchsia-300'}`} />
        <div className={`absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full blur-3xl opacity-8 ${isDark ? 'bg-fuchsia-700' : 'bg-fuchsia-200'}`} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src={isDark ? '/email/LogoHeader1.png' : '/email/LogoHeader.png'}
            alt="Alt Ctrl Lab"
            width={180}
            height={48}
            className="object-contain"
            priority
          />
        </div>

        {/* Card */}
        <div className={`rounded-2xl border p-8 shadow-2xl backdrop-blur-xl ${
          isDark
            ? 'bg-zinc-900/70 border-zinc-800/60'
            : 'bg-white/80 border-zinc-200/60'
        }`}>
          <div className="mb-6 text-center">
            <h1 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              Cockpit — Accès privé
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Espace réservé aux membres AltCtrl.Lab
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="relative">
              <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-400'}`} />
              <input
                type="text"
                placeholder="Identifiant"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                disabled={loading}
                className={`${inputBase} pl-10`}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-400' : 'text-zinc-400'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                className={`${inputBase} pl-10 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-400 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'} transition-colors`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <p className="text-xs text-rose-400">{error}</p>
              </div>
            )}

            {/* Too many attempts warning */}
            {attempts >= 3 && !error && (
              <p className={`text-xs text-center ${isDark ? 'text-zinc-400' : 'text-zinc-400'}`}>
                Encore {5 - attempts} tentative{5 - attempts > 1 ? 's' : ''} avant blocage temporaire.
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white
                bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400
                disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-fuchsia-900/30"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</>
              ) : (
                'Accéder au Cockpit →'
              )}
            </button>
          </form>
        </div>

        <p className={`text-center text-xs mt-4 ${isDark ? 'text-zinc-700' : 'text-zinc-400'}`}>
          AltCtrl.Lab · Cockpit v2 · Accès restreint
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
