/**
 * S-20, VR-4, CH-3: Text screening for Indian phone numbers, social handles, URLs,
 * and abusive/sexual terms in English, Hindi, and Hinglish.
 *
 * Used by client forms for instant feedback, Edge Functions, and mirrored in SQL `screen_text`.
 */

export type ScreenOutcome =
  | { action: 'allow' }
  | { action: 'reject'; reason: 'phone_number' | 'external_link' | 'social_handle'; matched: string }
  | { action: 'hold'; reason: 'flagged_term'; matched: string };

const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  oh: '0',
  one: '1',
  ek: '1',
  two: '2',
  do: '2',
  three: '3',
  teen: '3',
  four: '4',
  chaar: '4',
  char: '4',
  five: '5',
  paanch: '5',
  panch: '5',
  six: '6',
  chhe: '6',
  che: '6',
  seven: '7',
  saat: '7',
  sat: '7',
  eight: '8',
  aath: '8',
  ath: '8',
  nine: '9',
  nau: '9',
};

function normalizeDigits(input: string): string {
  let normalized = input.replace(/[०-९]/g, (ch) => DEVANAGARI_DIGITS[ch] ?? ch);
  // Replace number words with digits when spaced
  const wordRegex = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join('|')})\\b`, 'gi');
  normalized = normalized.replace(wordRegex, (match) => NUMBER_WORDS[match.toLowerCase()] ?? match);
  return normalized;
}

// Indian mobile numbers: optional +91/91/0 followed by 6-9 and 9 more digits, even with spaces/dots/dashes
const INDIAN_PHONE_REGEX =
  /(?:\+?91[\s.\-]*)?[6-9](?:[\s.\-]*\d){9}\b/;

// Continuous 8+ digits (to prevent partial number sharing or landline/paytm numbers)
const LONG_DIGIT_RUN_REGEX = /(?:\d[\s.\-]*){8,}/;

// URLs and emails
const URL_OR_EMAIL_REGEX =
  /(?:https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b(?:bit\.ly|t\.me|wa\.me|instagr\.am)\b)/i;

// Social media handles or platform references (CH-3 / S-20)
const SOCIAL_HANDLE_REGEX =
  /(?:@[a-z0-9_.]{2,}|\b(?:instagram|insta|snapchat|snap\s*id|telegram|whatsapp|dm\s*me|text\s*me\s*on)\b)/i;

// Abusive / sexual / creepy terms held for moderation review (VR-4 / S-20)
const HOLD_TERMS = [
  'nude',
  'nudes',
  'sex',
  'hookup',
  'fwb',
  'ons',
  'escort',
  'sugar daddy',
  'sugar baby',
  'paid meet',
  'weed',
  'ganja',
  'charas',
  'babe',
  'sexy',
  'send pic',
  'room alone',
  'private flat',
  'chutiya',
  'madarchod',
  'bhenchod',
  'randi',
  'gaand',
  'harami',
  'अश्लील',
  'सेक्स',
];

export function screenTextContent(rawText: string): ScreenOutcome {
  if (!rawText || !rawText.trim()) {
    return { action: 'allow' };
  }

  const normalized = normalizeDigits(rawText);

  if (INDIAN_PHONE_REGEX.test(normalized) || LONG_DIGIT_RUN_REGEX.test(normalized)) {
    return {
      action: 'reject',
      reason: 'phone_number',
      matched: 'phone_number_pattern',
    };
  }

  if (URL_OR_EMAIL_REGEX.test(rawText)) {
    return {
      action: 'reject',
      reason: 'external_link',
      matched: 'url_or_email',
    };
  }

  if (SOCIAL_HANDLE_REGEX.test(rawText)) {
    return {
      action: 'reject',
      reason: 'social_handle',
      matched: 'social_handle',
    };
  }

  const lower = rawText.toLowerCase();
  for (const term of HOLD_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s|[^a-z0-9])${escaped}(?:$|\\s|[^a-z0-9])`, 'i');
    if (regex.test(lower)) {
      return {
        action: 'hold',
        reason: 'flagged_term',
        matched: term,
      };
    }
  }

  return { action: 'allow' };
}
