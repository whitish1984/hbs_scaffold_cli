import requireFromStringOriginal from 'require-from-string';
import type {Data} from 'lib/util';
import type {FunctionLike} from 'jest-mock';

export function tn(result:string, condition:string, columnLength = 30) {
  if (result.length <= columnLength) {
    return result + ' '.repeat(columnLength - result.length) + ' | ' + condition;
  }
  else {
    return result.slice(0, columnLength-3) + '... | ' + condition;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotAny<T> = any extends T? never : T;
type Resolve<T> = T extends Promise<infer U> ? U : NotAny<T>
type ReturnTypeOf<T> = T extends FunctionLike ? ReturnType<T> : NotAny<T>;
export function mapperFactory<T>(map: Data): (key: string) => Promise<Resolve<ReturnTypeOf<T>>> {
  return async (key: string) => {
    if (typeof map[key] === 'undefined') {
      throw new Error();
    }
    return await Promise.resolve(map[key] as Resolve<ReturnTypeOf<T>>);
  };
}

export function expected(object: object): object {
  const convert = (value: unknown) => {
    if (typeof value === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      value = expect.any(Function);
    }
    else if (value && typeof value === 'object'){
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      value = expected(value);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  };
  if (Array.isArray(object)) {
    return object.map(value => convert(value));
  }
  else {
    return Object.fromEntries(Object.entries(object).map( value => {
      value[1] = convert(value[1]);
      return value;
    }));
  }
}

export const requireFromString = requireFromStringOriginal;