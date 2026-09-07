'use client';

import { useEffect, useRef, useState } from 'react';

const WORD_INTERVAL_MS = 55;

/**
 * Reveals `target` word-by-word at a steady pace instead of jumping in the
 * large paragraph-sized chunks the upstream stream actually delivers.
 *
 * Safe to feed a growing string as more of `target` arrives — the drip
 * always resumes from wherever it left off, keeps dripping until it catches
 * up to the latest `target` (even after the network side has already
 * finished sending), and simply holds once caught up. If `target` is
 * replaced with a shorter or unrelated string (a new message), it restarts
 * from scratch.
 *
 * Pass `enabled: false` to skip the drip and return `target` as-is —
 * required both for reduced motion, and for a message that was ALREADY
 * fully received before this hook's first render (e.g. the chat panel was
 * closed and reopened): without that second case, every remount would
 * replay old, already-finished answers as if they were streaming in again.
 */
export function useWordDrip(target: string, enabled: boolean): string {
  const [shown, setShown] = useState('');
  const wordsRef = useRef<string[]>([]);
  const revealedRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const words = target.match(/\S+\s*/g) ?? [];

    // If the new target isn't an extension of what we already split, restart.
    const previousJoined = wordsRef.current.join('');
    if (!target.startsWith(previousJoined)) {
      wordsRef.current = words;
      revealedRef.current = 0;
      setShown('');
    } else {
      wordsRef.current = words;
    }
  }, [target, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    const id = setInterval(() => {
      const words = wordsRef.current;
      if (revealedRef.current >= words.length) return;

      revealedRef.current += 1;
      setShown(words.slice(0, revealedRef.current).join(''));
    }, WORD_INTERVAL_MS);

    return () => clearInterval(id);
  }, [enabled]);

  return enabled ? shown : target;
}
