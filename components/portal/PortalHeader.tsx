'use client';

interface Props {
  clientName: string;
  projectType: string;
}

export function PortalHeader({ clientName, projectType }: Props) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-white/[0.08]">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold bg-gradient-to-r from-fuchsia-400 to-fuchsia-600 bg-clip-text text-transparent">
            AltCtrl.Lab
          </span>
          <span className="text-zinc-400">|</span>
          <span className="text-zinc-400 text-sm">Portail Client</span>
        </div>
        <div className="text-right">
          <div className="text-zinc-200 font-medium text-sm">{clientName}</div>
          <div className="text-zinc-400 text-xs">{projectType}</div>
        </div>
      </div>
    </header>
  );
}
