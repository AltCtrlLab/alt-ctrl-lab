'use client';
import { ShieldX, Clock } from 'lucide-react';

interface Props {
  reason: 'expired' | 'not_found';
}

export function PortalExpired({ reason }: Props) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 mb-6">
          {reason === 'expired' ? (
            <Clock className="w-8 h-8 text-rose-400" />
          ) : (
            <ShieldX className="w-8 h-8 text-rose-400" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">
          {reason === 'expired' ? 'Lien expiré' : 'Lien invalide'}
        </h1>
        <p className="text-zinc-400 leading-relaxed">
          {reason === 'expired'
            ? 'Ce lien d\u2019accès au portail client a expiré. Contactez votre chef de projet pour obtenir un nouveau lien.'
            : 'Ce lien n\u2019est pas valide. Vérifiez que vous avez bien copié l\u2019URL complète ou contactez votre chef de projet.'
          }
        </p>
        <a
          href="mailto:contact@altctrl.lab"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-fuchsia-600 text-white font-medium hover:bg-fuchsia-500 transition-colors"
        >
          Nous contacter
        </a>
      </div>
    </div>
  );
}
