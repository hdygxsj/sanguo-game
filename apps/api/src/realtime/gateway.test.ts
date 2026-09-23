import { describe, expect, it } from 'vitest';
import { realtimeQueryFromUrl, sessionTokenFromCookieHeader } from './gateway.js';

describe('WebSocket cookie parsing', () => {
  it('extracts and decodes the arena session from an upgrade header', () => {
    expect(sessionTokenFromCookieHeader('theme=dark; arena_session=token%3A123; locale=zh-CN')).toBe('token:123');
    expect(sessionTokenFromCookieHeader(undefined)).toBeUndefined();
  });

  it('extracts battle replay coordinates from an upgrade URL', () => {
    expect(realtimeQueryFromUrl('/ws?battleId=battle-1&after=12')).toEqual({ battleId: 'battle-1', after: 12 });
  });
});
