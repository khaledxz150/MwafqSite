'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { ChatbotWidget } from '@/modules/chatbot/components/ChatbotWidget';

/** Query param that unlocks the assistant, e.g. `?key=abusahel`. */
const UNLOCK_PARAM = 'key';
const UNLOCK_VALUE = 'abusahel';

function ChatbotWidgetGateInner() {
  const searchParams = useSearchParams();
  const unlocked = searchParams.get(UNLOCK_PARAM) === UNLOCK_VALUE;

  if (!unlocked) return null;
  return <ChatbotWidget />;
}

/**
 * Shows the assistant only while `?key=abusahel` is in the URL — re-checked
 * on every navigation (`useSearchParams()` re-renders on route changes,
 * including client-side ones), so it can appear or disappear as that param
 * is added or removed while browsing.
 *
 * `useSearchParams()` requires a Suspense boundary; kept narrow here so only
 * this gate opts out of static rendering, not the rest of the locale layout.
 */
export function ChatbotWidgetGate() {
  return (
    <Suspense fallback={null}>
      <ChatbotWidgetGateInner />
    </Suspense>
  );
}
