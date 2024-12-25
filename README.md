# eslint-plugin-export-restrict

## About
This package `eslint-plugin-export-restrict` is a custom plugin using ESLint for controlling export declarations from files.
It will be help to manage export declarations for private functions, classes, and variables in source code to manage developing.

## Motivation
In TypeScript and JavaScript, when declarers is defined in a file, it is not possible to manage strictly as a private functions, classes, and variables.  
Using `eslint-plugin-export-restrict`, you can protect by writing `@private` as a comment like JSDoc and TSDoc, and is able to solve those problems.  

## Installation
- npm
```sh
npm i -D eslint-plugin-export-restrict
```

- pnpm
```sh
pnpm i -D eslint-plugin-export-restrict
```

Depending on how you configure ESLint, use either Flat Config or eslintrc to configure eslint-plugin-export-restrict.

### Flat Config (eslint.config.js)

```js
import exportRestrictPlugin from "eslint-plugin-export-restrict";

export default [
  // other settings...
  {
    plugins: {
      "export-restrict": exportRestrictPlugin,
    },
  },
  {
    rules: {
      "export-restrict/no-export-private-declare": ["error"],
    },
  },
];
```

### eslintrc

```js
{
  "plugins": [
    "export-restrict",
  ],
  "rules": {
    "export-restrict/no-export-private-declare": ["error"],
  }
}
```

## Example

```ts
// --------- good ---------
/** @private */
function func1() {}

/** @private */
function func2() {}


// --------- bad ----------
/** @private */
function func1() {}

/** @private */
export function func2() {}

export {
  func1
}
```

## Contributing

Welcome

## License

MIT
