'use client';

import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';

interface HeatmapData {
  hour: number;
  day: number;
  count: number;
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function SendTimeHeatmap() {
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [bestHour, setBestHour] = useState<number | null>(null);
  const [bestDay, setBestDay] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/marketing/send-time?stats=true')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setData(json.data?.heatmap ?? []);
          setBestHour(json.data?.bestHour ?? null);
          setBestDay(json.data?.bestDay ?? null);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-fuchsia-400 animate-spin" /></div>;

  const maxCount = Math.max(1, ...data.map(d => d.count));

  // Build grid: 7 days x 24 hours
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const d of data) {
    if (d.day >= 0 && d.day < 7 && d.hour >= 0 && d.hour < 24) {
      grid[d.day][d.hour] = d.count;
    }
  }

  function cellColor(count: number): string {
    const intensity = count / maxCount;
    if (intensity === 0) return 'bg-zinc-800/30';
    if (intensity < 0.25) return 'bg-fuchsia-900/30';
    if (intensity < 0.5) return 'bg-fuchsia-700/40';
    if (intensity < 0.75) return 'bg-fuchsia-600/50';
    return 'bg-fuchsia-500/70';
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-fuchsia-400" /> Horaires optimaux
        </h3>
        {bestHour !== null && bestDay !== null && (
          <span className="text-xs text-fuchsia-400">
            Meilleur : {DAYS[bestDay]} {bestHour}h
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Hour labels */}
          <div className="flex items-center mb-1 ml-8">
            {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
              <span key={h} className="text-[8px] text-zinc-600" style={{ width: `${(3/24)*100}%`, minWidth: '24px' }}>{h}h</span>
            ))}
          </div>
          {/* Grid */}
          {grid.map((row, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-0.5 mb-0.5">
              <span className="text-[9px] text-zinc-500 w-7 text-right mr-1">{DAYS[dayIdx]}</span>
              {row.map((count, hourIdx) => (
                <div
                  key={hourIdx}
                  className={`w-3 h-3 rounded-sm ${cellColor(count)} transition-colors`}
                  title={`${DAYS[dayIdx]} ${hourIdx}h: ${count} ouvertures`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
