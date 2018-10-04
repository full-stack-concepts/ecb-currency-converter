export const getPrecision = (n: any): number => {
  const l = n.toString().split('.')[1];
  return l ? l.length : 0;
};

export const makeDecimal = (n: number, precision: number): number => {
  let i: number = n * Math.pow(10, precision);
  if (i.toString().indexOf('.') > -1) i = Math.round(i);
  return toFloat(i, precision);
};

export const divide = (x: number, y: number) => {
  const p: number = Math.max(getPrecision(x), getPrecision(y));
  x = makeDecimal(x, p);
  y = makeDecimal(y, p);
  return makeDecimal(x / y, p);
};

export const multiply = (x: number, y: number) => {
  const p: number = Math.max(getPrecision(x), getPrecision(y));
  x = makeDecimal(x, p);
  y = makeDecimal(y, p);
  return makeDecimal(x * y, p);
};

export const toFloat = (n: number, precision: number) => {
  return parseFloat(
    // @ts-ignore
    parseFloat(n / Math.pow(10, precision)),
  );
};

export const toCurrencyString = (n: number): string => {
  return makeDecimal(n, 2).toFixed(2);
};

export const isFloat = (n: any) => {
  return Number(n) === n && n % 1 !== 0;
};

export const deepCloneObject = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj));
};

export const cloneArray = (arr: any): Array<any> => {
  if (!arr || (arr && !Array.isArray(arr))) return [];
  return arr.slice(0) || [];
};
