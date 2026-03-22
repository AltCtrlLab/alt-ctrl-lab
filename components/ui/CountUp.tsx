'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** Target value to animate to */
  value: number;
  /** Text appended after the number (e.g. "%", " €", "h") */
  suffix?: string;
  /** Text prepended before the number (e.g. "$") */
  prefix?: string;
  /** Number of decimal places */
  decimals?: number;
  /** Animation duration in ms */
  duration?: number;
}

/**
 * Animated number counter using requestAnimationFrame.
 * Ease-out cubic for natural deceleration feel.
 */
export function CountUp({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  duration = 650,
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(+(eased * value).toFixed(decimals));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, decimals, duration]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : display;

  return (
    <>
      {prefix}
      {formatted}
      {suffix}
    </>
  );
}
