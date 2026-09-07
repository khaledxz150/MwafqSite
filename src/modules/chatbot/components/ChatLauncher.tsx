'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/shared/lib/cn';

interface ChatLauncherProps {
  open: boolean;
  onToggle: () => void;
  openLabel: string;
  closeLabel: string;
  /** Which physical screen edge the widget is docked to. */
  side: 'left' | 'right';
}

export function ChatLauncher({
  open,
  onToggle,
  openLabel,
  closeLabel,
  side,
}: ChatLauncherProps) {
  const reduceMotion = useReducedMotion();
  // Peeks off the edge it's docked to: negative x on the left, positive on the right.
  const peekX = side === 'left' ? -44 : 44;

  return (
    <motion.button
      type='button'
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? closeLabel : openLabel}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      className='group relative flex cursor-pointer items-center justify-center overflow-visible focus:outline-none'
    >
      <motion.span
        key={open ? 'close' : 'open'}
        initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className='relative flex items-center justify-center'
      >
        {open ? (
          // Same circular navy button used throughout the panel's own controls.
          <span
            className={cn(
              'flex size-14 items-center justify-center rounded-full bg-[#1e2364] text-white',
              'shadow-lg shadow-[#1e2364]/25 transition-colors group-hover:bg-[#233567]',
              'group-focus-visible:ring-2 group-focus-visible:ring-[#00a8f1] group-focus-visible:ring-offset-2'
            )}
          >
            <X className='size-6' strokeWidth={2.2} />
          </span>
        ) : (
          <motion.span
            className='relative flex items-center justify-center'
            // Docked permanently — half the character peeks past the screen
            // edge it's anchored to, hover or not. Hover only nudges the
            // scale up slightly, never the peek position.
            initial={false}
            animate={{ x: reduceMotion ? 0 : peekX, scale: 1 }}
            whileHover={reduceMotion ? undefined : { scale: 1.06 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* White backing disc — the artwork itself is transparent, so it
                needs an opaque surface behind it rather than floating raw
                over whatever the page background happens to be. */}
            <span
              aria-hidden
              className='absolute inset-[8%] rounded-full bg-white shadow-lg shadow-[#1e2364]/25'
            />

            {/* Abu Sahel — the illustration, layered above the backing disc. */}
            <Image
              src='/mwafq-helper.webp'
              alt=''
              aria-hidden
              width={263}
              height={296}
              priority
              className={cn(
                'relative h-24 w-auto drop-shadow-[0_6px_14px_rgba(30,35,100,0.28)]',
                // The artwork is drawn facing/leaning toward the right; mirror
                // it when docked on the left so his posture still faces
                // inward, toward the rest of the page.
                side === 'left' && '-scale-x-100'
              )}
            />
          </motion.span>
        )}
      </motion.span>
    </motion.button>
  );
}
