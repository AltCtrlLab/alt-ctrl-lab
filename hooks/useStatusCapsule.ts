'use client';

import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  windspeed: number;
  emoji: string;
  label: string;
}

export function useStatusCapsule() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [now, setNow] = useState(new Date());
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  // Live clock — update every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Weather — fetch on mount + every 10 min
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather');
        if (res.ok) setWeather(await res.json());
      } catch { /* silent */ }
    };
    fetchWeather();
    const id = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Server health — ping every 30s
  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        setServerOk(res.ok);
      } catch {
        setServerOk(false);
      }
    };
    ping();
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, []);

  return { weather, now, serverOk };
}
