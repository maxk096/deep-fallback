# Deep-fallback

Deep-fallback makes work with fallbacks enjoyable. Deep-fallback is a tiny library, that removes the handling of fallbacks and facilitates their usage on nested objects.

[![License][license-image]][license-url] [![Downloads][downloads-image]][downloads-url] ![Coverage 100][coverage-badge] ![Vulnerabilities][vulnerabilities-badge]

## Install

Install using [npm](https://www.npmjs.com/):

```sh
npm install --save deep-fallback
```

or using [yarn](https://yarnpkg.com/)

```sh
yarn add deep-fallback
```

## Introdution

How many times have you used nested default parameters in functions? Or maybe you often work with nested objects, checking for every possible property to be set? Or you might be a fan of `||` operator when it comes to default values? Then, this library is your choice. The idea behind the library is to simplify the usage of fallbacks on nested objects through proxying. This allows us to get rid of verbose ways of setting default values and make it more enjoyable. You also gain more control over the data flow with the options provided by you.

## Examples

### Simple Fallback

```js
import createFallback from 'deep-fallback';

const thing = { a: 1 };
const defaultThing = { b: 2 };
const fallback = createFallback(thing, defaultThing);

console.log(fallback.a); // <~ 1
console.log(fallback.b); // <~ 2
```

### Nested Fallback

```js
import createFallback from 'deep-fallback';

const thing = { a: { b: { c: 1 } } };
const defaultThing = { a: { b: { y: 2 } } };
const fallback = createFallback(thing, defaultThing);

console.log(fallback.a.b.c); // <~ 1
console.log(fallback.a.b.y); // <~ 2
```

### Multiple Fallbacks with `createFallback.many`

```js
import createFallback from 'deep-fallback'

const thing = { a: 1 };
const defaultThings = [{ b: 2 }, { c: 3 }];
const fallback = createFallback.many(thing, defaultThings);

console.log(fallback.a); // <~ 1
console.log(fallback.b); // <~ 2
console.log(fallback.c); // <~ 3
```

### Fallback used as a fallback

```js
import createFallback from 'deep-fallback';

const thing = { a: 1 };
const fallback = createFallback({ b: 2 }, { c: 3 });
const myFallback = createFallback(thing, fallback);

console.log(myFallback.a); // <~ 1
console.log(myFallback.b); // <~ 2
console.log(myFallback.c); // <~ 3
```

## API

### `createFallback(target, fallback, options?)`

Creates deep fallback for objects. `createFallback` wraps a target in a [`Proxy`][proxy-url] and returns it. The rule of thumb here: **target and fallback must be objects**, so we can wrap it in Proxy. This rule can be partially bypassed with `options.fallbackImmediately`.

#### The flow of `createFallback`

First, `createFallback` wraps a `target` in Proxy and listens to property access. When you access a property and it exists on the `target`, we return that property. If the property does not exist on the `target`, we will look for the same property path on the `fallback`. If it exists on the `fallback`, we return it. If it does not, `undefined` will be returned.

We will continue wrapping properties you access, until we encounter a primitive value which cannot be wrapped in Proxy. 

By default, if a property does not exist or is set to `undefined`, fallback will be triggered. This can be overridden using `options.shouldFallback`.

#### `target: any`

Is an object to perform fallback on. If a primitive is passed, it will be returned immediately and fallback **will not work**. This can be partially bypassed with `options.fallbackImmediately`.

#### `fallback: any`

A value, which will be used as a fallback. In case, if a `target` does not have a property you want to access, we will look for the same property path on a `fallback`. If the `fallback` has that property, it will be returned, otherwise `undefined` will be returned.

#### `options.fallbackImmediately?: boolean`

A boolean value, which defines whether fallback will be immediately applied or not. If set to `true`, in the moment of `createFallback` being called `options.shouldFallback` will be called with a `target` immediately. It may be useful when you are not sure if a `target` exists, and if it does not, we can use a `fallback` value instead. Default value is set to `false`.

```js 
import createFallback from 'deep-fallback'

const fallback = createFallback(undefined, { a: 1 });
console.log(fallback); // <~ undefined

const fallbackValue = { b: 2 };
const options = { fallbackImmediately: true };
const fallback = createFallback(undefined, fallbackValue, options);
console.log(fallback); // <~ proxied `fallbackValue`
```

#### `options.shouldFallback?: (value, target, path) => boolean`

A function, which decides whether fallback should be applied or not. It will be called whenever you get a property. By default, it will fallback if the `value` is set to `undefined` or does not exist.

**Note:** If a `value` is primitive, and you return `false`, which tells us to use the `value` as the next `target`. Then, the `target` will be returned without proxying, because it is not an object, and fallback **will not work**.

```js
import createFallback from 'deep-fallback';

const thing = { a: 1 };
const defaultThing = { a: 2 };
const options = {
  shouldFallback(value) {
    if (value === 1) {
      return true;
    }
    return value === undefined;
  }
};
const fallback = createFallback(thing, defaultThing, options);

// Returns 2, because we forbid any value which equals to 1 to be used
console.log(fallback.a); // <~ 2
```

**Arguments**

&nbsp;&nbsp;&nbsp; **value: unknown** - A value of the property you want to access.

&nbsp;&nbsp;&nbsp; **target: any** - A target, from which we try to access the property.

&nbsp;&nbsp;&nbsp; **path: (string | symbol | number)[]** - The full path which you access on the target.

**Returns: boolean**

If `true` is returned, then we will continue looking for the next valid fallback by calling `options.shouldFallback`. If `false` is returned, then the `target` which `options.shouldFallback` was called with, will be used as the next target to access properties from.

#### `options.noFallbackValue?: (path, target, value) => any`

A function, which returns a value, that will be returned when there are no more fallbacks left. By default, returns `undefined`.

**Note:** `noFallbackValue` **will not** be called if a value cannot be proxied because it is primitive.

```js
import createFallback from 'deep-fallback';

const thing = { a: 1 };
const defaultThing = { b: 2 };
const options = {
  noFallbackValue() {
    return 'Not found';
  }
};
const fallback = createFallback(thing, defaultThing, options);

// Returns 'Not found', because there is no 'c' property on the `target` and its `fallback`
console.log(fallback.c); // <~ 'Not found'

// Will NOT call `noFallbackValue`, because `fallback.b` is a primitive
// and cannot be tracked by Proxy
console.log(fallback.b.nope); // <~ undefined
```

**Arguments**

&nbsp;&nbsp;&nbsp; **path: (string | symbol | number)[]** - The full path which you access on the target.

&nbsp;&nbsp;&nbsp; **target: any** - The first target, from which fallback was initiated.

&nbsp;&nbsp;&nbsp; **value: unknown** - A value from the first target, from which fallback was initiated.

**Returns: any**

#### `options.onNoFallback?: (path, target, value) => void`

A function, which will be called when there are no more fallbacks left. This is useful for debugging purposes, to catch incorrect access to a property.

**Note:** `onNoFallback` **will not** be called if a value cannot be proxied because it is a primitive.

```js
import createFallback from 'deep-fallback'

const thing = { a: 1 };
const defaultThing = { b: 2 };
const options = {
  onNoFallback(path, target) {
    console.warn(`Path "${path.join('.')}" is not found on a target and its fallbacks`, target);
  }
};
const fallback = createFallback(thing, defaultThing, options);

// Will force `onNoFallback` to be called to notify a user that the path cannot be found
console.log(fallback.c);

// Will NOT call `onNoFallback`, because `fallback.b` is a primitive and cannot be tracked by Proxy
console.log(fallback.b.nope);
```

**Arguments**

&nbsp;&nbsp;&nbsp; **path: (string | symbol | number)[]** - The full path which you access on the target.

&nbsp;&nbsp;&nbsp; **target: any** - The first target, from which fallback was initiated.

&nbsp;&nbsp;&nbsp; **value: unknown** - A value from the first target, from which fallback was initiated.

**Returns: void**

### `createFallback.many(target, fallbacks, options?)`

Works the same way as `createFallback`, but `fallbacks` parameter takes an array of fallbacks, not a single fallback.

`fallbacks` array starts from high-priority fallbacks and ends with low-priority ones. In the example below, when we get `fallback.c` property, chain of fallbacks will look like:

`{ a: 1 } -> { b: 2 } -> { c: 3 }`

```js
import createFallback from 'deep-fallback';

const thing = { a: 1 };
const defaultThings = [{ b: 2 }, { c: 3 }];
const fallback = createFallback.many(thing, defaultThings);

console.log(fallback.a); // <~ 1
console.log(fallback.b); // <~ 2
console.log(fallback.c); // <~ 3
```

#### Comparison issue

To make the fallback mechanism working, we wrap a target in Proxy. And every time, you get a non-primitive value from a fallback, we also wrap it in Proxy to make deep fallback possible. But this strategy leads us to a comparison issue.

```js
import createFallback from 'deep-fallback'

const thing = { a: { b: 1 } };
const defaultThing = { c: { y: 2 } };
const fallback = createFallback(thing, defaultThing);

// `fallback` always equals to itself
console.log(fallback === fallback); // <~ true

// Because `a` property is an object, it will be dynamically wrapped in `Proxy` when you access it
// which means a reference to `fallback.a` will always be different
console.log(fallback.a === fallback.a); // <~ false, oops!

// `fallback.a` accessed only once and stored in a variable, so it equals to itself
const a = fallback.a;
console.log(a === a); // <~ true

// Value of `fallback.a.b` is primitive, and cannot be wrapper in Proxy.
// So the primitive value is returned and they are equal
console.log(fallback.a.b === fallback.a.b); // <~ true
```

#### TypeScript

Deep-fallback does provide Typescript support. However, there are too many dynamic options and it seems to be incredibly hard if not impossible to encode correctly with TypeScript. Often it may be necessary to force a certain type using `as unknown as <type>`.

#### Author

**Max Kanaradze**

[GitHub Profile](https://github.com/maxk096)

#### MIT Licensed

[license-image]: http://img.shields.io/npm/l/deep-fallback.svg
[license-url]: LICENSE
[downloads-url]: http://npm-stat.com/charts.html?package=deep-fallback
[proxy-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
[downloads-image]: https://img.shields.io/npm/dm/deep-fallback
[coverage-badge]: https://img.shields.io/badge/Coverage-100%25-green.png
[vulnerabilities-badge]: https://img.shields.io/snyk/vulnerabilities/npm/deep-fallback
