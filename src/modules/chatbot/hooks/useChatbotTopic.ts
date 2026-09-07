'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getPathnameWithoutLocale } from '@/i18n/routing';
import { ROUTES } from '@/shared/constants/routes';
import { getFixedHeaderScrollOffset } from '@/shared/lib/scrollToSection';
import type { ChatbotTopic } from '@/modules/chatbot/types/chatbotTopic.types';

/** Standalone pages — the route alone tells us the topic. */
const ROUTE_TOPICS: Record<string, ChatbotTopic> = {
  [ROUTES.SERVICES]: 'services',
  [ROUTES.B2B]: 'b2b',
  [ROUTES.COURSES]: 'academy',
  [ROUTES.ABOUT]: 'about',
  [ROUTES.CONTACT]: 'contact',
};

/**
 * Home-page anchor ids (see `HomePage.tsx` section keys / `HomeHashScroll`)
 * mapped to a topic, in top-to-bottom document order — used to pick the
 * first one currently on screen.
 */
const HOME_SECTION_TOPICS: { id: string; topic: ChatbotTopic }[] = [
  { id: 'services', topic: 'services' },
  { id: 'booking', topic: 'booking' },
  { id: 'how', topic: 'howItWorks' },
  { id: 'app', topic: 'app' },
  { id: 'academy', topic: 'academy' },
  { id: 'b2b', topic: 'b2b' },
  { id: 'contact', topic: 'contact' },
];

/**
 * Tracks which part of the site the visitor is currently looking at, so the
 * chatbot teaser can surface a more relevant suggestion. Standalone pages
 * resolve instantly from the route; the home page scroll-spies its known
 * section anchors (falls back to 'home' — the hero — until one is in view).
 */
export function useChatbotTopic(): ChatbotTopic {
  const pathname = usePathname();
  const basePath = getPathnameWithoutLocale(pathname);
  const routeTopic = ROUTE_TOPICS[basePath];
  const isHome = basePath === ROUTES.HOME;

  const [homeTopic, setHomeTopic] = useState<ChatbotTopic>('home');

  useEffect(() => {
    if (!isHome) return;

    const elements = HOME_SECTION_TOPICS.map(({ id, topic }) => ({
      el: document.getElementById(id),
      topic,
    })).filter(
      (entry): entry is { el: HTMLElement; topic: ChatbotTopic } =>
        entry.el !== null
    );

    if (elements.length === 0) return;

    const visible = new Set<ChatbotTopic>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const match = elements.find((e) => e.el === entry.target);
          if (!match) continue;
          if (entry.isIntersecting) visible.add(match.topic);
          else visible.delete(match.topic);
        }

        // Pick the first (topmost) section currently on screen.
        const current = HOME_SECTION_TOPICS.find(({ topic }) =>
          visible.has(topic)
        );
        setHomeTopic(current?.topic ?? 'home');
      },
      {
        // Counts a section as "current" once it's past the fixed header and
        // still comfortably in the viewport.
        rootMargin: `-${getFixedHeaderScrollOffset(0)}px 0px -55% 0px`,
        threshold: 0,
      }
    );

    elements.forEach(({ el }) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHome]);

  if (routeTopic) return routeTopic;
  if (isHome) return homeTopic;
  return 'home';
}
