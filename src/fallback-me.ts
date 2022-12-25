import lodashGet from 'lodash.get';
import isObject from 'is-object';
import isRegExp from 'is-regexp';
import { FallbackBase, FallbackOptions } from './fallback-base';

type ObjectTarget = Record<string, any>;

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

  const proxy = new Proxy(targetValue as Record<string, unknown>, {
    get(_target, prop): any {
      const nextPath = [...path, prop];
      const nextFallbacks = [...fallbacks];
      const propValue = lodashGet(targetValue, prop);

      if (!shouldFallback(propValue, currentTarget, nextPath)) {
        const nextFallback = new FallbackBase({
          ...fallback,
          targetValue: propValue,
          fallbacks: nextFallbacks,
          path: nextPath,
        });
        return fallbackMe(nextFallback);
      }

      const nextTargetIndex = fallbacks.findIndex((currFallback) => {
        const fallbackValue = lodashGet(currFallback, nextPath);
        return !shouldFallback(fallbackValue, currFallback, nextPath);
      });
      if (nextTargetIndex === -1) {
        onNoFallback(nextPath, currentTarget, propValue);
        return noFallbackValue(nextPath, currentTarget, propValue);
      }
      const nextTarget = fallbacks[nextTargetIndex];
      const nextTargetValue = lodashGet(nextTarget, nextPath);
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
    ownKeys() {
      const allFallbackKeys = fallbacks.reduce<Array<string | symbol>>(
        (result, currentFallback) => {
          if (!isObject(currentFallback)) {
            return result;
          }

          const currentFallbackPropValue = path.length
            ? lodashGet(currentFallback, path)
            : currentFallback;

          if (isObject(currentFallbackPropValue)) {
            // Reflect.ownKeys will return all possible object keys(see js docs).
            // The key filtering will occur in getOwnPropertyDescriptor trap.
            const currentKeys = Reflect.ownKeys(currentFallbackPropValue as ObjectTarget);

            for (const key of currentKeys) {
              if (!result.includes(key)) {
                result.push(key);
              }
            }
          }

          return result;
        },
        Reflect.ownKeys(targetValue as ObjectTarget)
      );
      return allFallbackKeys;
    },
    getOwnPropertyDescriptor(_target, prop) {
      // Find and return the first closest property descriptor.
      // This method is called either by consumers or by JS after `ownKeys` trap returns.
      const allTargets = [currentTarget, ...fallbacks];
      const foundTarget = allTargets.find((currTarget) => {
        const currentFallbackPropValue = path.length ? lodashGet(currTarget, path) : currTarget;
        return (
          isObject(currentFallbackPropValue) &&
          (currentFallbackPropValue as ObjectTarget).hasOwnProperty(prop)
        );
      });
      const foundTargetPathValue = path.length ? lodashGet(foundTarget, path) : foundTarget;
      // Reflect.getOwnPropertyDescriptor would throw if called with a non-object.
      if (!isObject(foundTargetPathValue)) {
        return undefined;
      }
      // This will throw when a property is not configurable and exists on a fallback, but not on the currentTarget.
      return Reflect.getOwnPropertyDescriptor(foundTargetPathValue as ObjectTarget, prop);
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
