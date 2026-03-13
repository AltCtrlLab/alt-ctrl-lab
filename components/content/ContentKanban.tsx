'use client';
import { useState } from 'react';
import type { ContentItem, ContentStatus } from '@/lib/db/schema_content';
import { CONTENT_STATUS_META } from '@/lib/db/schema_content';
import { ContentCard } from './ContentCard';

const COLUMNS: ContentStatus[] = ['Idée', 'Brouillon', 'Planifié', 'Publié', 'Archivé'];

interface Props {
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
  onStatusChange: (id: string, status: ContentStatus) => void;
}

export function ContentKanban({ items, onSelect, onStatusChange }: Props) {
  const [dragOver, setDragOver] = useState<ContentStatus | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const handleDrop = (status: ContentStatus) => {
    if (dragId) onStatusChange(dragId, status);
    setDragId(null);
    setDragOver(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const colItems = items.filter(i => i.status === col);
        const meta = CONTENT_STATUS_META[col];
        return (
          <div
            key={col}
            onDragOver={e => { e.preventDefault(); setDragOver(col); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col)}
            className={`flex-shrink-0 w-64 bg-zinc-900/50 rounded-xl p-3 border transition-colors ${dragOver === col ? 'border-zinc-600' : 'border-zinc-800'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium ${meta.color}`}>{col}</span>
              <span className="text-xs text-zinc-600 bg-zinc-800 rounded px-1.5">{colItems.length}</span>
            </div>
            <div>
              {colItems.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragId(item.id)}
                >
                  <ContentCard item={item} onClick={() => onSelect(item)} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
