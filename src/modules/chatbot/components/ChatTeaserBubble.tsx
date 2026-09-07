'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/cn';

const TYPING_MS = 1100;
const HOLD_MS = 3600;
const GAP_MS = 15000;
const REDUCED_HOLD_MS = 4200;

type Phase = 'hidden' | 'typing' | 'shown';

interface ChatTeaserBubbleProps {
  suggestions: readonly string[];
  /** Physical side the launcher is docked to — the bubble's tail points that way. */
  side: 'left' | 'right';
  /** Real reading direction of `suggestions`, independent of `side`. */
  dir: 'ltr' | 'rtl';
  onSelect: (suggestion: string) => void;
}

/**
 * A speech bubble that periodically appears above the launcher, "types" a
 * suggested question, then fades — a hint that this is a live assistant you
 * can actually ask things, not a decoration. Only meant to run while the
 * panel is closed; unmount it when the panel opens.
 *
 * Mount with `key={topic}` at the call site — a new `suggestions` array
 * (the visitor scrolled into a different section or navigated) should
 * restart the cycle fresh from index 0, and remounting is the correct way
 * to reset internal state on a prop change rather than syncing it via effect.
 */
export function ChatTeaserBubble({
  suggestions,
  side,
  dir,
  onSelect,
}: ChatTeaserBubbleProps) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('hidden');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (suggestions.length === 0) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      timers.push(id);
    };

    // Reduced motion: skip the typing flourish, just hold the text longer.
    function runCycle() {
      if (reduceMotion) {
        setPhase('shown');
        schedule(() => {
          setPhase('hidden');
          schedule(() => {
            setIndex((i) => (i + 1) % suggestions.length);
            runCycle();
          }, GAP_MS);
        }, REDUCED_HOLD_MS);
        return;
      }

      setPhase('typing');
      schedule(() => setPhase('shown'), TYPING_MS);
      schedule(() => {
        setPhase('hidden');
        schedule(() => {
          setIndex((i) => (i + 1) % suggestions.length);
          runCycle();
        }, GAP_MS);
      }, TYPING_MS + HOLD_MS);
    }

    // First appearance after a short delay so it doesn't fire the instant the page loads.
    schedule(runCycle, 1800);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [suggestions, reduceMotion]);

  const suggestion = suggestions[index];

  return (
    <AnimatePresence>
      {phase !== 'hidden' && suggestion && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'absolute bottom-full flex flex-col',
            side === 'left' ? 'start-0 items-start' : 'end-0 items-end'
          )}
        >
          {/* Cloud body — a fully rounded pill, like a thought bubble. */}
          <button
            type='button'
            dir={dir}
            onClick={() => onSelect(suggestion)}
            className='max-w-[15rem] cursor-pointer rounded-[28px] border-2 border-[#e5e7f0] bg-white px-4 py-3 text-start text-[12.5px] leading-snug font-semibold text-[#1e2364] shadow-md shadow-[#1e2364]/8'
          >
            {phase === 'typing' ? (
              <span className='flex items-center gap-1' aria-hidden>
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className='size-1.5 rounded-full bg-[#1e2364]/45'
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: dot * 0.15,
                    }}
                  />
                ))}
              </span>
            ) : (
              suggestion
            )}
          </button>

          {/* Thought-cloud trail — two shrinking puffs drifting toward the character. */}
          <span
            aria-hidden
            className={cn(
              'mt-1 size-3 rounded-full border-2 border-[#e5e7f0] bg-white shadow-sm shadow-[#1e2364]/8',
              side === 'left' ? 'ms-4' : 'me-4'
            )}
          />
          <span
            aria-hidden
            className={cn(
              'mt-1 size-1.5 rounded-full border-2 border-[#e5e7f0] bg-white',
              side === 'left' ? 'ms-2' : 'me-2'
            )}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
