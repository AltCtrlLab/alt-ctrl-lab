import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PARIS = { lat: 48.8566, lon: 2.3522 };

const WMO_MAP: Record<number, { emoji: string; label: string }> = {
  0:  { emoji: '☀️', label: 'Ciel dégagé' },
  1:  { emoji: '🌤️', label: 'Principalement dégagé' },
  2:  { emoji: '⛅', label: 'Partiellement nuageux' },
  3:  { emoji: '☁️', label: 'Couvert' },
  45: { emoji: '🌫️', label: 'Brouillard' },
  48: { emoji: '🌫️', label: 'Brouillard givrant' },
  51: { emoji: '🌦️', label: 'Bruine légère' },
  53: { emoji: '🌦️', label: 'Bruine modérée' },
  55: { emoji: '🌦️', label: 'Bruine dense' },
  61: { emoji: '🌧️', label: 'Pluie légère' },
  63: { emoji: '🌧️', label: 'Pluie modérée' },
  65: { emoji: '🌧️', label: 'Pluie forte' },
  71: { emoji: '❄️', label: 'Neige légère' },
  73: { emoji: '❄️', label: 'Neige modérée' },
  75: { emoji: '❄️', label: 'Neige dense' },
  80: { emoji: '🌦️', label: 'Averses légères' },
  81: { emoji: '🌧️', label: 'Averses modérées' },
  82: { emoji: '🌧️', label: 'Averses violentes' },
  95: { emoji: '⛈️', label: 'Orage' },
  99: { emoji: '⛈️', label: 'Orage avec grêle' },
};

export async function GET() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${PARIS.lat}&longitude=${PARIS.lon}&current_weather=true`;
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error('Open-Meteo unavailable');
    const data = await res.json();
    const cw = data.current_weather;
    const wmo = WMO_MAP[cw.weathercode as number] ?? { emoji: '🌡️', label: 'Inconnu' };
    return NextResponse.json({
      temperature: Math.round(cw.temperature),
      windspeed: Math.round(cw.windspeed),
      weathercode: cw.weathercode,
      emoji: wmo.emoji,
      label: wmo.label,
    });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
