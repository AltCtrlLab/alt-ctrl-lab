'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type SnapPoint = 'closed' | 'half' | 'full';

/** Viewport-height percentages for each snap point. */
const SNAP_VH: Record<SnapPoint, number> = {
  closed: 0,
  half: 50,
  full: 95,
};

const VELOCITY_CLOSE_THRESHOLD = 500; // px/s downward velocity to auto-close

export interface BottomSheetState {
  isOpen: boolean;
  snapPoint: SnapPoint;
  open: (initial?: 'half' | 'full') => void;
  close: () => void;
  snapTo: (point: SnapPoint) => void;
  /** Height as CSS value (e.g. "50vh") */
  heightVh: number;
  /** Called by BottomSheet on drag end to determine next snap. */
  handleDragEnd: (velocity: number, offsetY: number) => void;
}

export function useBottomSheet(onClose?: () => void): BottomSheetState {
  const [snapPoint, setSnapPoint] = useState<SnapPoint>('closed');
  const snapPointRef = useRef<SnapPoint>(snapPoint);
  const isOpen = snapPoint !== 'closed';

  useEffect(() => {
    snapPointRef.current = snapPoint;
  }, [snapPoint]);

  const open = useCallback((initial: 'half' | 'full' = 'half') => {
    setSnapPoint(initial);
  }, []);

  const close = useCallback(() => {
    setSnapPoint('closed');
    onClose?.();
  }, [onClose]);

  const snapTo = useCallback((point: SnapPoint) => {
    if (point === 'closed') {
      close();
    } else {
      setSnapPoint(point);
    }
  }, [close]);

  const handleDragEnd = useCallback(
    (velocity: number, offsetY: number) => {
      const current = snapPointRef.current;

      // velocity > 0 = dragging down
      if (velocity > VELOCITY_CLOSE_THRESHOLD) {
        if (current === 'half') {
          close();
        } else {
          setSnapPoint('half');
        }
        return;
      }

      if (velocity < -VELOCITY_CLOSE_THRESHOLD) {
        setSnapPoint('full');
        return;
      }

      // Slow drag: snap to nearest point based on current position
      const currentVh = SNAP_VH[current];
      const draggedVh = currentVh - (offsetY / (window.innerHeight || 1)) * 100;

      if (draggedVh < 20) {
        close();
      } else if (draggedVh < 72) {
        setSnapPoint('half');
      } else {
        setSnapPoint('full');
      }
    },
    [close],
  );

  return {
    isOpen,
    snapPoint,
    open,
    close,
    snapTo,
    heightVh: SNAP_VH[snapPoint],
    handleDragEnd,
  };
}
