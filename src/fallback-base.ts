export type PathType = (string | symbol | number)[];

type OptionsTarget<T, F> = T | F;

export interface FallbackOptions<Target, Fallbacks> {
  fallbackImmediately?: boolean;
  shouldFallback?: (
    value: unknown,
    target: OptionsTarget<Target, Fallbacks>,
    path: PathType
  ) => boolean;
  noFallbackValue?: (
    path: PathType,
    target: OptionsTarget<Target, Fallbacks>,
    value: unknown
  ) => any;
  onNoFallback?: (path: PathType, target: OptionsTarget<Target, Fallbacks>, value: unknown) => void;
}

interface FallbackBaseConstructorProps<T, F> {
  currentTarget: T;
  fallbacks: F[];
  targetValue?: unknown;
  options?: FallbackOptions<T, F>;
  path?: PathType;
}

export const defaultShouldFallback = (v: unknown): boolean => v === undefined;
export const defaultNoFallbackValue = (): unknown => undefined;

export class FallbackBase<T = unknown, F = unknown> {
  readonly currentTarget: T;
  readonly fallbacks: F[];
  readonly targetValue: unknown;
  readonly options: Required<FallbackOptions<T, F>>;
  readonly path: PathType;

  constructor({
    currentTarget,
    fallbacks,
    targetValue,
    options = {},
    path = [],
  }: FallbackBaseConstructorProps<T, F>) {
    const {
      shouldFallback = defaultShouldFallback,
      noFallbackValue = defaultNoFallbackValue,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onNoFallback = (): void => {},
      fallbackImmediately = false,
    } = options;

    this.currentTarget = currentTarget;
    this.fallbacks = fallbacks;
    this.targetValue = targetValue;
    this.options = {
      shouldFallback,
      noFallbackValue,
      onNoFallback,
      fallbackImmediately,
    };
    this.path = path;
  }
}
