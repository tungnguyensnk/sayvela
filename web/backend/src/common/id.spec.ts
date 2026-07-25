import { version } from 'uuid';
import { createId } from './id';

describe('createId', () => {
  it('creates unique UUIDv7 identifiers', () => {
    const ids = Array.from({ length: 100 }, createId);
    expect(ids.every((id) => version(id) === 7)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
