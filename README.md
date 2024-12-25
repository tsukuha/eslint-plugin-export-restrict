# eslint-plugin-export-restrict

## Abstract

hogehoge

## Motivation

hogehoge

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
      "export-restrict/no-export-private-declares": ["error"],
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
    "export-restrict/no-export-private-declares": ["error"],
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
