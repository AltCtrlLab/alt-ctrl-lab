'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  /** Pull distance in px to trigger refresh (default: 80) */
  threshold?: number;
  /** Element to watch scroll on. Defaults to the main#main-content element. */
  scrollRef?: React.RefObject<HTMLElement>;
}

interface PullToRefreshState {
  pulling: boolean;
  refreshing: boolean;
  pullDistance: number;
}

/**
 * Pull-to-refresh hook for mobile lists.
 * Attaches to the scroll container and detects overscroll.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  scrollRef,
}: PullToRefreshOptions): PullToRefreshState {
  const [state, setState] = useState<PullToRefreshState>({
    pulling: false,
    refreshing: false,
    pullDistance: 0,
  });

  const startY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const getScrollEl = useCallback(() => {
    if (scrollRef?.current) return scrollRef.current;
    return document.getElementById('main-content');
  }, [scrollRef]);

  useEffect(() => {
    const el = getScrollEl();
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && el.scrollTop <= 0) {
        const distance = Math.min(dy * 0.5, threshold * 1.5);
        pullDistanceRef.current = distance;
        setState((s) => ({ ...s, pulling: true, pullDistance: distance }));
      } else {
        pulling.current = false;
        pullDistanceRef.current = 0;
        setState((s) => ({ ...s, pulling: false, pullDistance: 0 }));
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;

      const distance = pullDistanceRef.current;
      pullDistanceRef.current = 0;

      if (distance >= threshold) {
        setState({ pulling: false, refreshing: true, pullDistance: 0 });
        try {
          await onRefreshRef.current();
        } catch {
          // Refresh failed — silently reset
        }
        setState({ pulling: false, refreshing: false, pullDistance: 0 });
      } else {
        setState({ pulling: false, refreshing: false, pullDistance: 0 });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [getScrollEl, threshold]);

  return state;
}
