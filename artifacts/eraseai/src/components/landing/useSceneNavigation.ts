import { useCallback, useEffect, useRef, useState } from "react";

// Turns wheel, touch and keyboard input into steps through a fixed list of
// frames, so the page never scrolls: scrolling down shows the next frame in
// place, scrolling up the previous one.
//
// An element marked `data-scroll-inner` that can still scroll in the gesture's
// direction keeps the gesture (e.g. a long plan card on a small phone).

const WHEEL_THRESHOLD = 40;
const STEP_LOCK_MS = 750;
/** While locked, wheel events keep the lock alive until the gesture goes quiet (trackpad inertia). */
const QUIET_MS = 220;
const SWIPE_PX = 48;

function innerCanScroll(target: EventTarget | null, dir: 1 | -1): boolean {
  const el = target instanceof Element ? (target.closest("[data-scroll-inner]") as HTMLElement | null) : null;
  if (!el || el.scrollHeight <= el.clientHeight + 1) return false;
  return dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function useSceneNavigation(count: number, opts: { initial?: number; paused?: boolean } = {}) {
  const [index, setIndex] = useState(() => Math.min(Math.max(opts.initial ?? 0, 0), count - 1));
  const [direction, setDirection] = useState<1 | -1>(1);
  const pausedRef = useRef(!!opts.paused);
  pausedRef.current = !!opts.paused;
  const indexRef = useRef(index);
  indexRef.current = index;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), count - 1);
      if (clamped === indexRef.current) return;
      setDirection(clamped > indexRef.current ? 1 : -1);
      setIndex(clamped);
    },
    [count],
  );
  const step = useCallback((dir: 1 | -1) => goTo(indexRef.current + dir), [goTo]);

  useEffect(() => {
    let acc = 0;
    let lockUntil = 0;
    let touchStartY: number | null = null;
    let touchTarget: EventTarget | null = null;

    const onWheel = (e: WheelEvent) => {
      if (pausedRef.current || e.ctrlKey) return;
      const dir: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      if (innerCanScroll(e.target, dir)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < lockUntil) {
        lockUntil = Math.max(lockUntil, now + QUIET_MS);
        return;
      }
      acc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (Math.abs(acc) >= WHEEL_THRESHOLD) {
        step(acc > 0 ? 1 : -1);
        acc = 0;
        lockUntil = now + STEP_LOCK_MS;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (pausedRef.current || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const next = ["ArrowDown", "PageDown", " "].includes(e.key) ? 1 : ["ArrowUp", "PageUp"].includes(e.key) ? -1 : 0;
      if (next) {
        // Space on a focused button should still press it.
        if (e.key === " " && e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        step(next as 1 | -1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(count - 1);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null;
      touchTarget = e.target;
    };
    const onTouchMove = (e: TouchEvent) => {
      // Stop the browser's own overscroll/pull-to-refresh outside inner scrollers.
      if (!pausedRef.current && touchStartY != null) {
        const dy = touchStartY - (e.touches[0]?.clientY ?? touchStartY);
        if (!innerCanScroll(touchTarget, dy > 0 ? 1 : -1) && e.cancelable) e.preventDefault();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (pausedRef.current || touchStartY == null) return;
      const dy = touchStartY - (e.changedTouches[0]?.clientY ?? touchStartY);
      touchStartY = null;
      if (Math.abs(dy) < SWIPE_PX) return;
      const dir: 1 | -1 = dy > 0 ? 1 : -1;
      if (innerCanScroll(touchTarget, dir)) return;
      step(dir);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [step, goTo, count]);

  return { index, direction, goTo, step };
}
