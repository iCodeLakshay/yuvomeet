/** Quick row on long-press, then the rest behind +. Kept in sync with set_message_reaction. */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
export const EXTRA_REACTIONS = ['🔥', '✨', '🎉', '👏', '💯', '😍', '🥰', '🤔', '😅', '😭', '😡', '🤣', '🤝', '🙌', '💪', '👀', '⭐', '💔', '🤗', '😎', '🥲', '👌'] as const;

/** The @token being typed at the end of the draft, or null when the composer is not mentioning. */
export function mentionQuery(draft: string): string | null {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(draft);
  return match ? match[1]! : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A mention ends at anything that is not part of a name, so "@Ann!" counts but "@Anna" is not "@Ann". */
const NAME_END = '(?![\\p{L}\\p{N}_])';

/** True when @name is a whole mention, so @Ann does not match @Anna. */
export function bodyMentions(body: string, name: string) {
  return new RegExp(`@${escapeRegExp(name)}${NAME_END}`, 'u').test(body);
}

export function splitMentions(body: string, names: string[]): { text: string; mention: boolean }[] {
  const unique = [...new Set(names.filter((name) => name.length > 0))].sort((a, b) => b.length - a.length);
  if (unique.length === 0) return [{ text: body, mention: false }];
  const pattern = new RegExp(`@(${unique.map(escapeRegExp).join('|')})${NAME_END}`, 'gu');
  const parts: { text: string; mention: boolean }[] = [];
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) parts.push({ text: body.slice(cursor, start), mention: false });
    parts.push({ text: match[0], mention: true });
    cursor = start + match[0].length;
  }
  if (cursor < body.length) parts.push({ text: body.slice(cursor), mention: false });
  return parts.length > 0 ? parts : [{ text: body, mention: false }];
}
