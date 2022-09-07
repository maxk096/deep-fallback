import createFallback, { FallbackOptions } from '../src';

describe('createFallback fn', () => {
  it('When a target is non-fallbackable, should return it immediately', () => {
    const someNonFallbackableValues = [
      /qwerty/,
      123,
      Symbol(),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      function (): void {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      function* (): Generator {},
      'qwerty',
      null,
      undefined,
      false,
    ];
    someNonFallbackableValues.forEach((target) => {
      const fallback = { a: 2 };
      const res = createFallback(target, fallback);
      expect(res).toBe(target);
    });
  });

  it('When prop exists, should return a value from the target', () => {
    const target = { a: 1 };
    const fallback = { a: 2 };
    const res = createFallback(target, fallback);
    expect(res.a).toBe(1);
  });

  it('When prop does not exist on target, should return a value from the fallback', () => {
    const target = { a: 1 };
    const fallback = { b: 2 };
    const res = createFallback(target, fallback);
    expect(res.b).toBe(2);
  });

  it('When prop does not exist on target and fallback, should return undefined', () => {
    const target = { a: 1 };
    const fallback = { b: 2 };
    const res = createFallback(target, fallback);
    expect((res as any).c).toBe(undefined);
  });

  it('When nested prop exists, should return a value from the target', () => {
    const target = { a: { b: 1 } };
    const fallback = { a: { b: 2 } };
    const res = createFallback(target, fallback);
    expect(res.a.b).toBe(1);
  });

  it('When nested prop does not exist on target, should return a value from the fallback', () => {
    const target = { a: { b: 1 } };
    const fallback = { a: { c: 2 } };
    const res = createFallback(target, fallback);
    expect(res.a.c).toBe(2);
  });

  it('When nested prop does not exist on target and fallback, should return undefined', () => {
    const target = { a: { b: 1 } };
    const fallback = { a: { c: 2 } };
    const res = createFallback(target, fallback);
    expect((res.a as any).e).toBe(undefined);
  });

  it('When new props added or changed on target or fallback, should work properly', () => {
    const target = { a: { b: 1 } };
    const fallback = {} as any;
    const res = createFallback(target, fallback);
    expect(res.a.b).toBe(1);

    res.a.b = 3;
    expect(res.a.b).toBe(3);

    fallback.a = { c: 5 };
    expect(res.a.c).toBe(5);

    res.a.c = 7;
    expect(res.a.c).toBe(7);
  });

  it('When target value detached, should work properly', () => {
    const target = { a: { b: 1 } };
    const fallback = { a: { k: 5 } } as any;
    const res = createFallback(target, fallback);
    const detached = res.a;

    expect(detached.b).toBe(1);
    expect(detached.k).toBe(5);

    detached.t = 3;
    expect(detached.t).toBe(3);

    fallback.a.p = 4;
    expect(detached.p).toBe(4);
  });

  it('Iteration over an array should not cause a bug with Symbol.species', () => {
    const target = { a: [1, 2, 3] };
    const fallback = [4, 5, 6];
    const res = createFallback(target, fallback);

    expect(() => {
      res.a.map((x: number) => x);
      res.forEach((x: number) => x);
    }).not.toThrow();
  });

  it('Object.keys should work properly', () => {
    const target = { a: [1, 2, 3], c: [100, 200, 300] };
    const fallback = { a: [1, 2, 3, 4], b: [4, 5, 6], d: { foo: 'bar' } };
    const res = createFallback(target, fallback);

    expect(() => {
      Object.keys(res);
      Object.keys({ ...res });
      Object.entries(res).map((key, num) => `${key},${num}`);
      Object.entries(res.b).map((key, num) => `${key},${num}`);
      Object.entries(res.c).map((key, num) => `${key},${num}`);
    }).not.toThrow();

    expect(Object.keys(res).sort()).toStrictEqual(['a', 'b', 'c', 'd']);
    expect(Object.keys(res.a)).toStrictEqual(['0', '1', '2', '3']);
    expect(Object.keys(res.b)).toStrictEqual(['0', '1', '2']);
    expect(Object.keys(res.c)).toStrictEqual(['0', '1', '2']);
    expect({ ...res }).toEqual({
      a: [1, 2, 3], // still, a[3] === 4, as fallback proxy works
      b: [4, 5, 6],
      c: [100, 200, 300],
      d: { foo: 'bar' },
    });
    expect([...res.c]).toStrictEqual([100, 200, 300]);
    expect({ ...res.c }).toEqual({ '0': 100, '1': 200, '2': 300 });
    expect({ ...res.d }).toEqual({ foo: 'bar' });
  });

  describe('Fallback options', () => {
    it('With fallbackImmediately option and undefined target, should call shouldFallback fn and fallback immediatly', () => {
      const target = undefined;
      const fallback = { b: 2 };
      const options: FallbackOptions<typeof target, typeof fallback> = {
        fallbackImmediately: true,
      };
      const res = createFallback(target, fallback, options);
      expect((res as any).b).toBe(fallback.b);
    });

    it('With shouldFallback option and use of "b" prop, should call custom shouldFallback fn and return fallback', () => {
      const prop = 'b';
      const target = { [prop]: 1 };
      const fallback = { [prop]: 2 };
      const shouldFallbackMock = jest.fn((targetValue) => targetValue === 1);
      const options: FallbackOptions<typeof target, typeof fallback> = {
        shouldFallback: shouldFallbackMock,
      };
      const res = createFallback(target, fallback, options);

      expect(res[prop]).toBe(fallback[prop]);
      expect(shouldFallbackMock).toHaveBeenCalledTimes(2);
      expect(shouldFallbackMock).toHaveBeenCalledWith(target[prop], target, [prop]);
      expect(shouldFallbackMock).toHaveBeenCalledWith(fallback[prop], fallback, [prop]);
    });

    it('With shouldFallback option and use of "b" prop, should call custom shouldFallback fn and return undefined', () => {
      const prop = 'b';
      const target = { [prop]: 1 };
      const fallback = { [prop]: 2 };
      const shouldFallbackMock = jest.fn(() => true);
      const options: FallbackOptions<typeof target, typeof fallback> = {
        shouldFallback: shouldFallbackMock,
      };
      const res = createFallback(target, fallback, options);

      expect(res[prop]).toBe(undefined);
      expect(shouldFallbackMock).toHaveBeenCalledTimes(2);
      expect(shouldFallbackMock).toHaveBeenCalledWith(1, target, [prop]);
      expect(shouldFallbackMock).toHaveBeenCalledWith(2, fallback, [prop]);
    });

    it('With fallbackImmediately option, should call custom shouldFallback fn', () => {
      const target = undefined;
      const fallback = { b: 2 };
      const shouldFallbackMock = jest.fn(() => true);
      const options: FallbackOptions<typeof target, typeof fallback> = {
        fallbackImmediately: true,
        shouldFallback: shouldFallbackMock,
      };
      createFallback(target, fallback, options);

      expect(shouldFallbackMock).toHaveBeenCalledTimes(1);
      expect(shouldFallbackMock).toHaveBeenCalledWith(target, target, []);
    });

    it('With fallbackImmediately option, should call custom shouldFallback fn and return undefined', () => {
      const target = undefined;
      const fallback = { b: 2 };
      const shouldFallbackMock = jest.fn(() => false);
      const options: FallbackOptions<typeof target, typeof fallback> = {
        fallbackImmediately: true,
        shouldFallback: shouldFallbackMock,
      };
      const res = createFallback(target, fallback, options);

      expect(res).toBe(undefined);
      expect(shouldFallbackMock).toHaveBeenCalledTimes(1);
      expect(shouldFallbackMock).toHaveBeenCalledWith(target, target, []);
    });

    it('When value does not exists anywhere, should call noFallbackValue and return its returned value', () => {
      const target = { a: 1 };
      const fallback = { b: 2 };
      const noFallback = 'should be returned';
      const prop = 'c';
      const noFallbackValueMock = jest.fn(() => noFallback);
      const options: FallbackOptions<typeof target, typeof fallback> = {
        noFallbackValue: noFallbackValueMock,
      };
      const res = createFallback(target, fallback, options);

      expect((res as any)[prop]).toBe(noFallback);
      expect(noFallbackValueMock).toHaveBeenCalledTimes(1);
      expect(noFallbackValueMock).toHaveBeenCalledWith([prop], target, undefined);
    });

    it('When current target is primitive, should not call noFallbackValue', () => {
      const target = { a: 1 };
      const fallback = { b: 2 };
      const noFallbackValueMock = jest.fn(() => 'no fallback');
      const options: FallbackOptions<typeof target, typeof fallback> = {
        noFallbackValue: noFallbackValueMock,
      };
      const res = createFallback(target, fallback, options);

      expect((res.b as any).a).toBe(undefined);
      expect(noFallbackValueMock).toHaveBeenCalledTimes(0);
    });

    it('When value does not exists anywhere, should call onNoFallback and return its returned value', () => {
      const target = { a: 1 };
      const fallback = { b: 2 };
      const prop = 'c';
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const onNoFallbackMock = jest.fn(() => {});
      const options: FallbackOptions<typeof target, typeof fallback> = {
        onNoFallback: onNoFallbackMock,
      };
      const res = createFallback(target, fallback, options);

      expect((res as any)[prop]).toBe(undefined);
      expect(onNoFallbackMock).toHaveBeenCalledTimes(1);
      expect(onNoFallbackMock).toHaveBeenCalledWith([prop], target, undefined);
    });

    it('When current target is primitive, should not call onNoFallbackMock', () => {
      const target = { a: 1 };
      const fallback = { b: 2 };
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const onNoFallbackMock = jest.fn(() => {});
      const options: FallbackOptions<typeof target, typeof fallback> = {
        onNoFallback: onNoFallbackMock,
      };
      const res = createFallback(target, fallback, options);

      expect((res.b as any).a).toBe(undefined);
      expect(onNoFallbackMock).toHaveBeenCalledTimes(0);
    });
  });
});

describe('createFallback.many fn', () => {
  it('When multiple values supplied as a fallback, should fallback properly', () => {
    const target = { a: { b: 1 } };
    const fallbacks = [
      { p: { c: 2 } },
      { a: { p: 3 } },
      { p: { y: 4 } },
      { a: { c: 5 } },
      { e: { h: 6 } },
      { f: { q: { g: 7 } } },
      { s: 8 },
    ];
    const res = createFallback.many(target, fallbacks);

    expect(res.a.b).toBe(1);
    expect((res as any).p?.c).toBe(2);
    expect(res.a.p).toBe(3);
    expect((res.p as any)?.y).toBe(4);
    expect(res.a.c).toBe(5);
    expect((res.e as any)?.h).toBe(6);
    expect((res.f as any)?.q?.g).toBe(7);
    expect(res.s).toBe(8);
    expect((res.a as any).m).toBe(undefined);
  });

  it('When multiple values supplied as a fallback, Object.keys should work properly', () => {
    const target = { a: { b: 1 } };
    const fallbacks = [
      { p: { c: 2 } },
      { a: { p: 3 } },
      { p: { y: 4 } },
      { a: { c: 5 } },
      { e: { h: 6 } },
      { f: { q: { g: 7 } } },
      { s: 8 },
    ];
    const res = createFallback.many(target, fallbacks);

    expect(() => {
      Object.keys(res);
      Object.keys({ ...res });
      Object.entries(res).map((key, num) => `${key},${num}`);
    }).not.toThrow();

    expect(Object.keys(res).sort()).toStrictEqual(['a', 'e', 'f', 'p', 's']);
    expect(Object.keys(res.a)).toStrictEqual(['b', 'p', 'c']);
    expect({ ...res }).toEqual({
      a: {
        b: 1,
        p: 3,
        c: 5,
      },
      p: {
        c: 2,
        y: 4,
      },
      e: {
        h: 6,
      },
      f: {
        q: {
          g: 7,
        },
      },
      s: 8,
    });
  });

  it('When target value detached, should work properly', () => {
    const target = { a: { b: 1 } };
    const fallbacks = [{ a: { k: 5 } }, { a: { c: 7 } }] as any;
    const res = createFallback.many(target, fallbacks);
    const detached = res.a as any;

    expect(detached.b).toBe(1);
    expect(detached.k).toBe(5);
    expect(detached.c).toBe(7);

    detached.t = 3;
    expect(detached.t).toBe(3);

    fallbacks[0].a.c = 4;
    expect(detached.c).toBe(4);
    expect((res.a as any).c).toBe(4);
  });

  it('Use of fallback as a fallback, should work properly', () => {
    const firstTarget = { a: { b: 1 }, r: 2 };
    const firstFallbacks = [{ a: { k: 3 } }, { a: { c: 4 }, d: 5 }];
    const fallback = createFallback.many(firstTarget, firstFallbacks);

    const target = { a: { s: 6 }, y: 7 };
    const res = createFallback(target, fallback);

    expect(res.a.b).toBe(1);
    expect(res.r).toBe(2);
    expect(res.a.k).toBe(3);
    expect(res.a.c).toBe(4);
    expect(res.d).toBe(5);
    expect(res.a.s).toBe(6);
    expect(res.y).toBe(7);
    expect((res as any).nope).toBe(undefined);
  });
});
