/** @private */
const { a, b } = { a: '', b: '' };

/** @private */
const [c, d] = ['', '' ];

export {
  a,
  b,
  e,
  f,
  aba,
  abx,
};

/** @private */
const [{ e, f }, [g, { j, k, l} ]] = [{  e() {}, f: ''  }, [() => {}, { j: '' ,k: '', l: '' }]];

const aba = () => {};

/** @private */
const abe = () => {};

/** @private */
const { abs } =  { abs: ''};

/** @private */
function abx() {};

export {
  g,
  abs,
  j,
  abe,
  k,
  l,
};
