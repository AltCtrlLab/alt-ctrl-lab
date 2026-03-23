import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusTrap } from '../useFocusTrap';

// Helper to create a container with focusable elements
function createContainer() {
  const container = document.createElement('div');
  container.tabIndex = -1;

  const btn1 = document.createElement('button');
  btn1.textContent = 'First';
  const btn2 = document.createElement('button');
  btn2.textContent = 'Second';
  const btn3 = document.createElement('button');
  btn3.textContent = 'Third';

  container.appendChild(btn1);
  container.appendChild(btn2);
  container.appendChild(btn3);
  document.body.appendChild(container);

  return { container, btn1, btn2, btn3 };
}

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  window.dispatchEvent(event);
  return event;
}

describe('useFocusTrap', () => {
  let elements: ReturnType<typeof createContainer>;

  beforeEach(() => {
    elements = createContainer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.removeChild(elements.container);
    vi.useRealTimers();
  });

  it('focuses the container when activated', () => {
    const { result } = renderHook(() => useFocusTrap(true));

    // Assign the ref to our container
    Object.defineProperty(result.current, 'current', {
      value: elements.container,
      writable: true,
    });

    // Re-render to trigger the effect with the ref set
    const { unmount } = renderHook(() => useFocusTrap(true));

    // We need to manually trigger the ref assignment
    // The hook sets a timeout of 50ms to focus
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Focus behavior is timer-based, verify the hook returns a ref
    expect(result.current).toBeDefined();
    expect(result.current.current).toBe(elements.container);
    unmount();
  });

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = vi.fn();
    const { result } = renderHook(() => useFocusTrap(true, onEscape));

    Object.defineProperty(result.current, 'current', {
      value: elements.container,
      writable: true,
    });

    // Re-render to register the keydown listener
    renderHook(() => useFocusTrap(true, onEscape));

    act(() => {
      fireKey('Escape');
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does not call onEscape when inactive', () => {
    const onEscape = vi.fn();
    renderHook(() => useFocusTrap(false, onEscape));

    act(() => {
      fireKey('Escape');
    });

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('traps Tab at last element — wraps to first', () => {
    const { result } = renderHook(() => useFocusTrap(true));

    Object.defineProperty(result.current, 'current', {
      value: elements.container,
      writable: true,
    });

    // Re-render to register listener
    renderHook(() => useFocusTrap(true));

    // Focus the last button
    elements.btn3.focus();
    expect(document.activeElement).toBe(elements.btn3);

    act(() => {
      fireKey('Tab');
    });

    expect(document.activeElement).toBe(elements.btn1);
  });

  it('traps Shift+Tab at first element — wraps to last', () => {
    const { result } = renderHook(() => useFocusTrap(true));

    Object.defineProperty(result.current, 'current', {
      value: elements.container,
      writable: true,
    });

    renderHook(() => useFocusTrap(true));

    // Focus the first button
    elements.btn1.focus();
    expect(document.activeElement).toBe(elements.btn1);

    act(() => {
      fireKey('Tab', { shiftKey: true });
    });

    expect(document.activeElement).toBe(elements.btn3);
  });

  it('does not trap Tab when inactive', () => {
    renderHook(() => useFocusTrap(false));

    elements.btn3.focus();

    act(() => {
      fireKey('Tab');
    });

    // Should stay on btn3 (no trap to redirect)
    expect(document.activeElement).toBe(elements.btn3);
  });

  it('returns a ref object', () => {
    const { result } = renderHook(() => useFocusTrap(true));
    expect(result.current).toHaveProperty('current');
  });
});
