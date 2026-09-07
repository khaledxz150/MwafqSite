/**
 * Coarse "what part of the site is this" signal used to pick a more relevant
 * teaser suggestion. Route-derived for standalone pages; scroll-spied via
 * anchor id for the stacked-section home page.
 */
export type ChatbotTopic =
  | 'home'
  | 'services'
  | 'booking'
  | 'academy'
  | 'b2b'
  | 'about'
  | 'contact'
  | 'howItWorks'
  | 'app';
