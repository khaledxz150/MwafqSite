'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { ChatAnswerContent } from '@/modules/chatbot/components/ChatAnswerContent';
import { ChatBrandMark } from '@/modules/chatbot/components/ChatBrandMark';
import { useWordDrip } from '@/modules/chatbot/hooks/useWordDrip';
import type { ChatMessage } from '@/modules/chatbot/types/chatbot.types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  /** Fires whenever the rendered content grows — lets the panel chase the scroll. */
  onGrow?: () => void;
}

export function ChatMessageBubble({ message, onGrow }: ChatMessageBubbleProps) {
  const reduceMotion = useReducedMotion();
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  // Whether this message had already finished streaming the moment this
  // bubble first mounted — e.g. it's history from before the panel was
  // closed and reopened. Computed once (lazy initializer) so a remount
  // never replays an already-complete answer as if it were streaming in.
  const [wasAlreadyDone] = useState(() => message.status === 'done');

  // Upstream delivers whole paragraphs at once; reveal them word-by-word so a
  // reply still reads like it's being typed instead of jumping in blocks. The
  // drip stays enabled through the pending-to-done transition (so the last
  // chunk finishes revealing smoothly instead of landing as one block), but
  // never for a message that was already done before this mount.
  const displayText = useWordDrip(
    message.text,
    !isUser && !isError && !reduceMotion && !wasAlreadyDone
  );

  // The word drip grows the bubble's height independently of the messages
  // array, so the panel's own scroll-to-bottom effect won't see it — nudge
  // the scroll on every visible-text change instead.
  useEffect(() => {
    onGrow?.();
  }, [displayText, onGrow]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex w-full items-end gap-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <ChatBrandMark className='mb-0.5 size-7 border border-[#e5e7f0]' />
      )}

      <div
        className={cn(
          'max-w-[82%] px-3.5 py-2.5 text-[13.5px] leading-relaxed',
          isUser
            ? 'rounded-[16px] rounded-ee-[4px] bg-[#1e2364] text-white'
            : 'rounded-[16px] rounded-es-[4px] border border-[#e5e7f0] bg-white text-[#1e2364] shadow-sm',
          isError && 'border-red-200 bg-red-50 text-red-700'
        )}
      >
        {isUser || isError ? (
          <p className='whitespace-pre-wrap'>{message.text}</p>
        ) : (
          // The model answers in light markdown; render it as real elements.
          <ChatAnswerContent text={displayText} />
        )}
      </div>
    </motion.div>
  );
}
