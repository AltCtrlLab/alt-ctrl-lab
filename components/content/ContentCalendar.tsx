'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ContentItem } from '@/lib/db/schema_content';
import { PLATFORM_COLORS } from '@/lib/db/schema_content';

interface Props {
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
}

export function ContentCalendar({ items, onSelect }: Props) {
  const [date, setDate] = useState(new Date());
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = (firstDay + 6) % 7; // Monday start

  const itemsByDay: Record<number, ContentItem[]> = {};
  items.forEach(item => {
    if (!item.scheduledAt) return;
    const d = new Date(item.scheduledAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!itemsByDay[day]) itemsByDay[day] = [];
      itemsByDay[day].push(item);
    }
  });

  const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-1.5 text-zinc-500 hover:text-zinc-300">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-zinc-200 capitalize">{monthName}</span>
        <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-1.5 text-zinc-500 hover:text-zinc-300">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-xl overflow-hidden">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
          <div key={d} className="bg-zinc-900 text-center text-[10px] text-zinc-500 py-2">{d}</div>
        ))}
        {Array.from({ length: blanks }).map((_, i) => (
          <div key={`b${i}`} className="bg-zinc-900/50 h-24" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayItems = itemsByDay[day] ?? [];
          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
          return (
            <div key={day} className="bg-zinc-900 h-24 p-1 overflow-hidden">
              <span className={`text-[10px] font-medium mb-1 inline-block w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-fuchsia-500 text-white' : 'text-zinc-500'}`}>
                {day}
              </span>
              {dayItems.slice(0, 3).map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={`text-[9px] truncate rounded px-1 py-0.5 mb-0.5 cursor-pointer ${PLATFORM_COLORS[item.platform as any] ?? 'text-zinc-400'} bg-zinc-800 hover:bg-zinc-700`}
                >
                  {item.title}
                </div>
              ))}
              {dayItems.length > 3 && <span className="text-[9px] text-zinc-600">+{dayItems.length - 3}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
