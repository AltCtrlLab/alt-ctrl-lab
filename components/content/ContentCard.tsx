'use client';
import type { ContentItem } from '@/lib/db/schema_content';
import { ContentStatusBadge } from './ContentStatusBadge';
import { PlatformIcon } from './PlatformIcon';

interface Props {
  item: ContentItem;
  onClick: () => void;
}

export function ContentCard({ item, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      draggable
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-700 transition-colors mb-2"
    >
      <p className="text-sm text-zinc-100 font-medium line-clamp-2 mb-2">{item.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PlatformIcon platform={item.platform as any} className="w-3.5 h-3.5" />
          <span className="text-[10px] text-zinc-500">{item.type}</span>
        </div>
        {item.agent !== 'manuel' && (
          <span className="text-[10px] text-fuchsia-400 bg-fuchsia-900/30 px-1.5 py-0.5 rounded">{item.agent}</span>
        )}
      </div>
      {item.scheduledAt && (
        <p className="text-[10px] text-zinc-600 mt-1.5">
          {new Date(item.scheduledAt).toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  );
}
