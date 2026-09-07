'use client';

import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/shared/lib/cn';
import { isRtl } from '@/i18n/config';
import { useLocale, useTranslations } from '@/i18n/DictionaryProvider';
import { ChatLauncher } from '@/modules/chatbot/components/ChatLauncher';
import { ChatPanel } from '@/modules/chatbot/components/ChatPanel';
import { ChatTeaserBubble } from '@/modules/chatbot/components/ChatTeaserBubble';
import { useChatbot } from '@/modules/chatbot/hooks/useChatbot';
import { useChatbotTopic } from '@/modules/chatbot/hooks/useChatbotTopic';

export function ChatbotWidget() {
  const copy = useTranslations('chatbot');
  const locale = useLocale();
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  const topic = useChatbotTopic();
  const teaserSuggestions = copy.sectionSuggestions[topic];

  const [open, setOpen] = useState(false);
  const { messages, isPending, send, stop, reset } = useChatbot({
    errorMessage: copy.error,
  });

  const close = useCallback(() => setOpen(false), []);

  // Clicking the floating teaser cloud opens the panel and immediately asks
  // that question, added to the existing conversation like any other
  // message — it should never wipe history the visitor already has.
  // `stop()` only cancels a request still in flight (a ref, no state
  // change), so a stale pending answer can't block or double up with the
  // new one.
  const selectTeaser = useCallback(
    (suggestion: string) => {
      stop();
      setOpen(true);
      send(suggestion);
    },
    [stop, send]
  );

  // Esc closes the panel from anywhere on the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const rtl = dir === 'rtl';

  return (
    <div
      // Forced to dir="ltr" so `items-end`/`items-start` (logical, inline-end/
      // start properties) always resolve to the same physical side regardless
      // of the page's own dir="rtl" — the side below is chosen explicitly per
      // language instead of following text direction.
      dir='ltr'
      className={cn(
        // z-[200]: above every other stacking layer in the app (modals and
        // the toast container both use lower tiers), so the widget never
        // ends up hidden behind a dialog or overlay on any page.
        'fixed bottom-0 z-[200] flex flex-col gap-3 print:hidden',
        // English sits bottom-left, Arabic sits bottom-right.
        rtl ? 'right-5 items-end' : 'left-5 items-start'
      )}
      style={
        {
          '--chat-origin': rtl ? 'bottom right' : 'bottom left',
        } as React.CSSProperties
      }
    >
      <AnimatePresence>
        {open && (
          <ChatPanel
            key='chat-panel'
            copy={copy}
            dir={dir}
            messages={messages}
            isPending={isPending}
            onSend={send}
            onStop={stop}
            onReset={reset}
            onClose={close}
          />
        )}
      </AnimatePresence>

      <div className='relative flex'>
        {!open && (
          <ChatTeaserBubble
            key={topic}
            suggestions={teaserSuggestions}
            side={rtl ? 'right' : 'left'}
            dir={dir}
            onSelect={selectTeaser}
          />
        )}

        <ChatLauncher
          open={open}
          onToggle={() => setOpen((value) => !value)}
          openLabel={copy.launcherOpen}
          closeLabel={copy.launcherClose}
          side={rtl ? 'right' : 'left'}
        />
      </div>
    </div>
  );
}
