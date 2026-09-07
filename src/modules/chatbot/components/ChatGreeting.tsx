'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/cn';

interface ChatGreetingProps {
  title: string;
  body: string;
  suggestionsLabel: string;
  suggestions: readonly string[];
  onSelect: (suggestion: string) => void;
}

export function ChatGreeting({
  title,
  body,
  suggestionsLabel,
  suggestions,
  onSelect,
}: ChatGreetingProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className='flex flex-col items-center px-1 pt-4 text-center'>
      <h3 className='mt-3 text-[15px] font-bold text-[#1e2364]'>{title}</h3>
      <p className='mt-1.5 max-w-[19rem] text-[12.5px] leading-relaxed text-[#6b7196]'>
        {body}
      </p>

      <p className='mt-5 self-start text-[11px] font-semibold tracking-wide text-[#6b7196] uppercase'>
        {suggestionsLabel}
      </p>

      <div className='mt-2 flex w-full flex-col gap-1.5'>
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion}
            type='button'
            onClick={() => onSelect(suggestion)}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: reduceMotion ? 0 : 0.05 * index,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              'w-full cursor-pointer rounded-[14px] border-2 border-[#e5e7f0] bg-white px-3.5 py-2.5',
              'text-start text-[12.5px] font-semibold text-[#1e2364] transition',
              'hover:border-[#00a8f1] hover:text-[#00a8f1]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00a8f1] focus-visible:ring-offset-2'
            )}
          >
            {suggestion}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
