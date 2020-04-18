import get from 'lodash.get';
import isObject from 'is-object';
import isRegExp from 'is-regexp';
import { FallbackBase, FallbackOptions } from './fallback-base';

const isPromise = (o: unknown): boolean => o instanceof Promise;

const isFallbackable = (fallback: FallbackBase): boolean => {
  const { targetValue } = fallback;
  // prettier-ignore
  return (
    isObject(targetValue) &&
    !isRegExp(targetValue) &&
    !isPromise(targetValue)
  )
};

const fallbackMe = (fallback: FallbackBase): any => {
  const { currentTarget, fallbacks, options, path, targetValue } = fallback;
  const { shouldFallback, noFallbackValue, onNoFallback } = options;

  if (!isFallbackable(fallback)) {
    return targetValue;
  }

  const proxy = new Proxy(targetValue as object, {
    get(getTarget, prop): any {
      const nextPath = [...path, prop];
      const nextFallbacks = [...fallbacks];
      const propValue = get(getTarget, prop);

      if (!shouldFallback(propValue, currentTarget, nextPath)) {
        const nextFallback = new FallbackBase({
          ...fallback,
          targetValue: propValue,
          fallbacks: nextFallbacks,
          path: nextPath,
        });
        return fallbackMe(nextFallback);
      }

      const nextTargetIndex = fallbacks.findIndex((fallback) => {
        const fallbackValue = get(fallback, nextPath);
        return !shouldFallback(fallbackValue, fallback, nextPath);
      });
      if (nextTargetIndex === -1) {
        onNoFallback(nextPath, currentTarget, propValue);
        return noFallbackValue(nextPath, currentTarget, propValue);
      }
      const nextTarget = fallbacks[nextTargetIndex];
      const nextTargetValue = get(nextTarget, nextPath);
      const amountOfFallbacksToDelete = nextTargetIndex + 1;
      nextFallbacks.splice(0, amountOfFallbacksToDelete);

      const nextFallback = new FallbackBase({
        currentTarget: nextTarget,
        targetValue: nextTargetValue,
        fallbacks: nextFallbacks,
        path: nextPath,
        options,
      });
      return fallbackMe(nextFallback);
    },
  });

  return proxy;
};

const applyImmediateFallback = <T, F>(fallback: FallbackBase<T, F>): FallbackBase => {
  let tempFallback = fallback;

  while (tempFallback.fallbacks.length) {
    const { currentTarget, path, options } = tempFallback;
    const { shouldFallback } = options;

    if (!shouldFallback(currentTarget, currentTarget, path)) {
      break;
    }

    const tempFallbacks = [...tempFallback.fallbacks];
    const tempTarget = tempFallbacks.shift() as any;
    tempFallback = new FallbackBase({
      ...tempFallback,
      currentTarget: tempTarget,
      targetValue: tempTarget,
      fallbacks: tempFallbacks,
    });
  }

  return tempFallback as FallbackBase<unknown, unknown>;
};

const fallbackMeCreator = <T, F>(
  currentTarget: T,
  fallbacks: F[],
  options: FallbackOptions<T, F>
): T & F => {
  const fallbackPlain = new FallbackBase({
    targetValue: currentTarget,
    currentTarget,
    fallbacks,
    options,
  });
  const { fallbackImmediately } = fallbackPlain.options;
  // prettier-ignore
  const fallback = (
    fallbackImmediately
      ? applyImmediateFallback(fallbackPlain)
      : fallbackPlain
    ) as FallbackBase;
  return fallbackMe(fallback);
};

const createFallback = <T, F>(
  target: T,
  fallback: F,
  options: FallbackOptions<T, F> = {}
): T & F => {
  return fallbackMeCreator<T, F>(target, [fallback], options);
};

createFallback.many = <T, F>(
  target: T,
  fallbacks: F[],
  options: FallbackOptions<T, F> = {}
): T & F => {
  return fallbackMeCreator<T, F>(target, fallbacks, options);
};

export { createFallback };
