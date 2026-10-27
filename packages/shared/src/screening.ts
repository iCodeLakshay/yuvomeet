/**
 * S-20, CH-3: instant client-side check for contact details in text.
 * Mirrors the reject rules of `private.screen_text` so users see the problem before sending.
 * The server is authoritative and also holds flagged terms for review.
 */

export type ScreenReason = 'phone_number' | 'external_link' | 'social_handle';

const DEVANAGARI = '०१२३४५६७८९';

const NUMBER_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', ek: '1', two: '2', do: '2', three: '3', teen: '3',
  four: '4', chaar: '4', char: '4', five: '5', paanch: '5', panch: '5', six: '6', chhe: '6', che: '6',
  seven: '7', saat: '7', sat: '7', eight: '8', aath: '8', ath: '8', nine: '9', nau: '9',
};
const NUMBER_WORD_RE = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')})\\b`, 'gi');

const PHONE_RE = /(\+?91[\s.-]*)?[6-9]([\s.-]*\d){9}/;
const DIGIT_RUN_RE = /(\d[\s.-]*){8,}/;
const LINK_RE = /(https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b(bit\.ly|t\.me|wa\.me|instagr\.am)\b)/i;
const HANDLE_RE = /(@[a-z0-9_.]{2,}|\b(instagram|insta|snapchat|snap\s*id|telegram|whatsapp|dm\s*me|text\s*me\s*on)\b)/i;

export const SCREEN_MESSAGES: Record<ScreenReason, string> = {
  phone_number: "Phone numbers can't be shared here.",
  external_link: "Links and email addresses can't be shared here.",
  social_handle: "Social handles can't be shared here.",
};

function normalizeDigits(text: string): string {
  return text
    .replace(/[०-९]/g, (ch) => String(DEVANAGARI.indexOf(ch)))
    .replace(NUMBER_WORD_RE, (word) => NUMBER_WORDS[word.toLowerCase()] ?? word);
}

/** Returns the rejection reason, or null when the text may be sent. */
export function screenText(text: string): ScreenReason | null {
  if (!text.trim()) return null;
  const digits = normalizeDigits(text);
  if (PHONE_RE.test(digits) || DIGIT_RUN_RE.test(digits)) return 'phone_number';
  if (LINK_RE.test(text)) return 'external_link';
  if (HANDLE_RE.test(text)) return 'social_handle';
  return null;
}
