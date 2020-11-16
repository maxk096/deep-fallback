import { IsExact } from 'conditional-type-checks';
import createFallback from '../src';

describe('createFallback fn types', () => {
  it('Return type is correct', () => {
    const thing = { a: 1, c: { h: 'test' } };
    const defaultThing = { b: '1', c: { h: 123 } };
    const fallback = createFallback(thing, defaultThing);
    expect<IsExact<typeof thing & typeof defaultThing, typeof fallback>>(true);
  });
});

describe('createFallback.many fn types', () => {
  it('Return type is correct', () => {
    const thing = { a: 1, c: { h: 'test' } };
    const defaultThing = [{ b: '1', c: { h: 123 } }, { d: Symbol() }];
    const fallback = createFallback.many(thing, defaultThing);
    expect<IsExact<typeof thing & typeof defaultThing[number], typeof fallback>>(true);
  });
});
