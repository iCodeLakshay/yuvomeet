import { AppError, errorMessage, toAppError, unwrap, unwrapMaybe } from '../lib/errors';

describe('toAppError', () => {
  it('passes database messages through with their hint code', () => {
    const e = toAppError({ code: 'P0001', message: 'Plan is full.', hint: 'FULL' });
    expect(e).toBeInstanceOf(AppError);
    expect([e.message, e.code]).toEqual(['Plan is full.', 'FULL']);
  });

  it('maps permission, network, timeout and expired-session errors', () => {
    expect(toAppError({ code: '42501', message: 'denied' }).code).toBe('FORBIDDEN');
    expect(toAppError(new TypeError('Network request failed')).code).toBe('NETWORK');
    expect(toAppError(Object.assign(new Error('Aborted'), { name: 'AbortError' })).code).toBe('NETWORK');
    expect(toAppError({ code: 'PGRST301', message: 'JWT expired' }).code).toBe('SESSION_EXPIRED');
  });

  it('never leaks raw server text for unknown errors', () => {
    expect(errorMessage({ message: 'relation "private.x" does not exist' })).toBe('Something went wrong. Try again.');
  });
});

describe('unwrap', () => {
  it('returns data or throws an AppError', () => {
    expect(unwrap({ data: [1], error: null })).toEqual([1]);
    expect(() => unwrap({ data: null, error: { code: '42501', message: 'x' } })).toThrow(AppError);
    expect(unwrapMaybe({ data: null, error: null })).toBeNull();
  });
});
