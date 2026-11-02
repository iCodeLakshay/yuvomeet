import { bodyMentions, mentionQuery, splitMentions } from '../features/chat/mentions';

describe('chat mentions', () => {
  it('detects the @token being typed', () => {
    expect(mentionQuery('hey @an')).toBe('an');
    expect(mentionQuery('@')).toBe('');
    expect(mentionQuery('mail me at a@b')).toBeNull();
    expect(mentionQuery('hey @ann ')).toBeNull();
  });

  it('matches whole names only', () => {
    expect(bodyMentions('hi @Ann', 'Ann')).toBe(true);
    expect(bodyMentions('thanks @Ann!', 'Ann')).toBe(true);
    expect(bodyMentions('@Ann, are you coming?', 'Ann')).toBe(true);
    expect(bodyMentions('hi @Anna', 'Ann')).toBe(false);
    expect(bodyMentions('hi @Ann2', 'Ann')).toBe(false);
    expect(bodyMentions('नमस्ते @रिया!', 'रिया')).toBe(true);
  });

  it('splits a body into text and mention parts, preferring the longest name', () => {
    expect(splitMentions('yo @Anna and @Ann', ['Ann', 'Anna'])).toEqual([
      { text: 'yo ', mention: false },
      { text: '@Anna', mention: true },
      { text: ' and ', mention: false },
      { text: '@Ann', mention: true },
    ]);
    expect(splitMentions('ok @Ann.', ['Ann'])).toEqual([
      { text: 'ok ', mention: false },
      { text: '@Ann', mention: true },
      { text: '.', mention: false },
    ]);
    expect(splitMentions('plain', [])).toEqual([{ text: 'plain', mention: false }]);
  });
});
